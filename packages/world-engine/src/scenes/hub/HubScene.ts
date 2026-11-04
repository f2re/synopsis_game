import Phaser from 'phaser';
import {
  bindLogicalViewport,
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
} from '../../runtime/fitLogicalViewport';
import { isThreeHubRenderer, resolveHubRendererMode, type HubRendererMode } from '../../runtime/hubRendererMode';
import { HubPerfProbe } from '../../renderer/three/HubPerfProbe';
import { ThreeHubRenderer } from '../../renderer/three/ThreeHubRenderer';
import { HubTimeOfDay, type DayPhase } from './HubTimeOfDay';
import { HubEnvironmentLayer } from './HubEnvironmentLayer';
import { HubBuildingLayer, HUB_BUILDINGS } from './HubBuildingLayer';
import { HubGroundDecorLayer } from './HubGroundDecorLayer';
import { HubFaunaLayer } from './HubFaunaLayer';
import { HubNpcLayer } from './HubNpcLayer';
import { HubSeasonLayer } from './HubSeasonLayer';
import { HubStageLayer } from './HubStageLayer';
import { HubDossierLayer } from './HubDossierLayer';
import { FACILITY_DOSSIER_BY_BUILDING } from './facilityDossiers';
import { calculateSeason, isSeason, nextSeason, SEASON_PROFILES, type Season } from './HubSeason';
import { buildingStatesFromStages, computeStageStatuses } from './hubStages';
import { STATION_26063_LOCATION } from './HubTimeOfDay';
import { HubWeatherOverlay, type WeatherMode } from './HubWeatherOverlay';
import { HubScheduleManager } from '../../world/hubSchedule';
import { HUB_BUILDING_BY_ID, HUB_WORLD_DEFINITION_V1 } from '../../world/hub/HubWorldDefinition';
import { worldBridge, type BuildingStateId } from '../../bridge/WorldBridge';

const DEBUG_DAY_PHASES: readonly DayPhase[] = [
  'dawn',
  'day',
  'golden_hour',
  'twilight',
  'night',
  'white_nights',
];
const DEBUG_WEATHER_MODES: readonly WeatherMode[] = ['clear', 'rain', 'snow', 'fog'];

function isDayPhase(value: string | null): value is DayPhase {
  return value !== null && DEBUG_DAY_PHASES.includes(value as DayPhase);
}

function isWeatherMode(value: string | null): value is WeatherMode {
  return value !== null && DEBUG_WEATHER_MODES.includes(value as WeatherMode);
}

export class HubScene extends Phaser.Scene {
  private timeOfDay: HubTimeOfDay;
  private scheduleManager: HubScheduleManager;
  private readonly rendererMode: HubRendererMode;

  // Legacy 2D layers (kept intact behind the migration feature flag).
  private environmentLayer?: HubEnvironmentLayer;
  private buildingLayer?: HubBuildingLayer;
  private groundDecorLayer?: HubGroundDecorLayer;
  private faunaLayer?: HubFaunaLayer;
  private npcLayer?: HubNpcLayer;
  private weatherOverlay?: HubWeatherOverlay;
  private seasonLayer?: HubSeasonLayer;
  private stageLayer?: HubStageLayer;
  private dossierLayer?: HubDossierLayer;

  // New world-definition-first renderer spike.
  private threeRenderer?: ThreeHubRenderer;
  private perfProbe?: HubPerfProbe;
  private pendingArrivalBuildingId?: string;

  private season: Season = calculateSeason(new Date(), STATION_26063_LOCATION);
  private weatherForced = false;
  private bridgeUnsubscribers: (() => void)[] = [];
  private readonly buildingStates = new Map<string, BuildingStateId>(
    HUB_BUILDINGS.map((building) => [building.id, building.defaultState]),
  );

  constructor(rendererMode?: HubRendererMode) {
    super('hub');
    this.timeOfDay = new HubTimeOfDay();
    this.scheduleManager = new HubScheduleManager(26063);
    this.rendererMode = rendererMode ?? resolveHubRendererMode();
  }

  preload(): void {
    if (isThreeHubRenderer(this.rendererMode)) {
      // The spike is deliberately asset-free: geometry/material/weather states
      // must prove the architecture before production 3D assets are authored.
      return;
    }

    // Legacy raster layers remain available as the fallback renderer.
    this.load.image('hub_l0_bg', '/hub/layers/l0_background.png');
    this.load.image('hub_l1_clouds', '/hub/layers/l1_clouds.png');
    this.load.image('hub_l3_ground', '/hub/layers/l3_ground.png');
    this.load.image('hub_l5_arch', '/hub/layers/l5_architecture.png');
    this.load.image('hub_l7_decor', '/hub/layers/l7_decor.png');
    this.load.image('hub_l8_birds', '/hub/layers/l8_birds.png');
    this.load.image('hub_l9_veg', '/hub/layers/l9_vegetation.png');
    this.load.image('hub_avatar', '/hub/layers/avatar_base.png');
    this.load.image('hub_building_states', '/hub/layers/building_states.png');
  }

  create(): void {
    if (isThreeHubRenderer(this.rendererMode)) {
      this.createThreeHub();
    } else {
      this.createLegacyHub();
    }

    this.applyDebugQueryOverrides();
    this.setupBridge();
    worldBridge.notifySceneReady('hub');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup();
    });
  }

  private createThreeHub(): void {
    bindLogicalViewport(this, HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT, {
      backgroundColor: 'rgba(0,0,0,0)',
    });

    const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    if (query.get('hubPerf') === '1') {
      // Instrument WebGL prototypes before Three.js creates its context.
      this.perfProbe = new HubPerfProbe();
    }

    this.threeRenderer = new ThreeHubRenderer(this);
    this.stageLayer = new HubStageLayer(this, HUB_WORLD_DEFINITION_V1.buildings);
    this.dossierLayer = new HubDossierLayer(
      this,
      {
        onStartShift: () => worldBridge.emit('world:start_shift', {}),
        onOpenScene: (sceneKey) => this.scene.start(sceneKey),
      },
      { width: HUB_LOGICAL_WIDTH, height: HUB_LOGICAL_HEIGHT },
    );

    this.input.on('pointerdown', this.handleThreePointerDown, this);
    this.applyDayPhase(this.timeOfDay.getCurrentPhase());
    this.applySeason(this.season);
    this.applyStageProgress([]);
  }

  private createLegacyHub(): void {
    bindLogicalViewport(this, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);

    this.environmentLayer = new HubEnvironmentLayer(this);
    this.groundDecorLayer = new HubGroundDecorLayer(this);
    this.buildingLayer = new HubBuildingLayer(this);
    this.dossierLayer = new HubDossierLayer(this, {
      onStartShift: () => worldBridge.emit('world:start_shift', {}),
      onOpenScene: (sceneKey) => this.scene.start(sceneKey),
    });
    this.faunaLayer = new HubFaunaLayer(this, this.scheduleManager);
    this.npcLayer = new HubNpcLayer(this);
    this.weatherOverlay = new HubWeatherOverlay(this);

    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    this.seasonLayer = new HubSeasonLayer(this, reducedMotion);
    this.stageLayer = new HubStageLayer(this);

    this.applyStageProgress([]);
    this.applyDayPhase(this.timeOfDay.getCurrentPhase());
    this.applySeason(this.season);
  }

  /**
   * Deterministic visual-state controls for screenshot/performance review.
   * These are intentionally query-only diagnostics; gameplay/server state
   * remains authoritative during normal operation.
   *
   * ?hubPhase=day|night|...
   * ?hubSeason=spring|summer|autumn|winter
   * ?hubWeather=clear|rain|snow|fog
   */
  private applyDebugQueryOverrides(): void {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const phase = params.get('hubPhase');
    const season = params.get('hubSeason');
    const weather = params.get('hubWeather');

    if (isDayPhase(phase)) {
      this.timeOfDay.setPhase(phase);
      this.applyDayPhase(phase);
    }

    if (isSeason(season)) {
      this.applySeason(season);
    }

    if (isWeatherMode(weather)) {
      this.weatherForced = true;
      this.weatherOverlay?.setWeather(weather);
      this.threeRenderer?.setWeather(weather);
    }
  }

  private handleThreePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.dossierLayer?.isOpen) return;

    const buildingId = this.threeRenderer?.pickBuilding(pointer.worldX, pointer.worldY);
    if (!buildingId) return;

    const building = HUB_BUILDING_BY_ID.get(buildingId);
    // A newer click always supersedes any unfinished visit. If no safe
    // route exists, never open the dossier under the arrival-gated variant.
    this.pendingArrivalBuildingId = undefined;
    const outcome = building
      ? this.threeRenderer?.walkAvatarTo(building.entrance.x, building.entrance.y)
      : undefined;
    if (outcome === 'unreachable') return;
    if (building && outcome === 'moving' && this.threeRenderer?.isArrivalGated) {
      this.pendingArrivalBuildingId = buildingId;
      return;
    }
    // The accepted legacy and canonical Three Hub retain immediate
    // interaction. Only opt-in collisionReview delays until arrival.
    worldBridge.notifyBuildingClicked(buildingId);
  }

  private applyDayPhase(phase: DayPhase): void {
    const colors = this.timeOfDay.getPhaseColors();

    this.environmentLayer?.applyDayPhase(phase, colors);
    this.groundDecorLayer?.applyDayPhase(phase, colors);
    this.buildingLayer?.applyDayPhase(phase, colors);
    this.weatherOverlay?.applyDayPhase(phase);
    this.threeRenderer?.setDayPhase(phase);

    worldBridge.notifyPhaseChanged(phase);
  }

  private applySeason(season: Season): void {
    this.season = season;
    const profile = SEASON_PROFILES[season];

    this.seasonLayer?.setSeason(season);
    this.groundDecorLayer?.applySeason(profile.foliageTint);
    this.buildingLayer?.applySeason(season, profile.roofSnow);
    this.threeRenderer?.setSeason(season);

    if (!this.weatherForced) {
      this.weatherOverlay?.setWeather(profile.defaultWeather);
      this.threeRenderer?.setWeather(profile.defaultWeather);
    }
    worldBridge.notifySeasonChanged(season);
  }

  private setBuildingStates(states: Record<string, BuildingStateId>): void {
    for (const [id, state] of Object.entries(states)) this.buildingStates.set(id, state);
    this.buildingLayer?.setStates(states);
    this.threeRenderer?.setBuildingStates(states);
  }

  private applyStageProgress(completed: readonly string[]): void {
    const statuses = computeStageStatuses(completed);
    this.stageLayer?.setStatuses(statuses);
    this.setBuildingStates(buildingStatesFromStages(statuses));
  }

  private setupBridge(): void {
    const unsubBuildings = worldBridge.on(
      'server:building_states',
      (states: Record<string, BuildingStateId>) => {
        this.setBuildingStates(states);
      },
    );

    const unsubPhase = worldBridge.on('server:time_phase', (phase: DayPhase) => {
      this.timeOfDay.setPhase(phase);
      this.applyDayPhase(phase);
    });

    const unsubDemo = worldBridge.on('server:demo_acceleration', (enabled: boolean) => {
      this.timeOfDay.setAcceleratedDemo(enabled);
    });

    const unsubWeather = worldBridge.on('server:weather', (mode: WeatherMode) => {
      this.weatherForced = true;
      this.weatherOverlay?.setWeather(mode);
      this.threeRenderer?.setWeather(mode);
    });

    const unsubCalm = worldBridge.on('server:study_calm', (enabled: boolean) => {
      this.scheduleManager.setStudyCalm(enabled);
    });

    const unsubSeason = worldBridge.on('server:season', (value: unknown) => {
      this.applySeason(isSeason(value) ? value : calculateSeason(new Date(), STATION_26063_LOCATION));
    });
    const unsubCycleSeason = worldBridge.on('hub:cycle_season', () => {
      this.applySeason(nextSeason(this.season));
    });

    const unsubStages = worldBridge.on('server:stage_progress', (ids: unknown) => {
      this.applyStageProgress(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
    });

    const unsubBuildingClick = worldBridge.on(
      'hub:walk_to_building',
      ({ x, y }: { x: number; y: number }) => {
        this.pendingArrivalBuildingId = undefined;
        this.npcLayer?.walkAvatarTo(x, y);
        this.threeRenderer?.walkAvatarTo(x, y);
      },
    );

    const unsubFacilityDossier = worldBridge.on('world:building_click', (buildingId: string) => {
      const dossierId = FACILITY_DOSSIER_BY_BUILDING[buildingId];
      const buildingState = this.buildingStates.get(buildingId);
      if (!dossierId || !buildingState) return;
      this.dossierLayer?.open(dossierId, buildingState);
    });

    this.bridgeUnsubscribers.push(
      unsubBuildings,
      unsubPhase,
      unsubDemo,
      unsubWeather,
      unsubCalm,
      unsubBuildingClick,
      unsubFacilityDossier,
      unsubSeason,
      unsubCycleSeason,
      unsubStages,
    );
  }

  override update(_time: number, deltaMs: number): void {
    const currentPhase = this.timeOfDay.getCurrentPhase();

    this.timeOfDay.update(deltaMs, (newPhase) => {
      this.applyDayPhase(newPhase);
    });

    const currentUtcHour = new Date().getUTCHours();
    this.scheduleManager.update(deltaMs / 1000, currentUtcHour);

    this.environmentLayer?.update(deltaMs, currentPhase);
    this.groundDecorLayer?.update(deltaMs, currentPhase);
    this.buildingLayer?.update(deltaMs);
    this.faunaLayer?.update(deltaMs, currentPhase);
    this.npcLayer?.update(deltaMs, currentPhase);
    this.seasonLayer?.update(deltaMs);
    this.stageLayer?.update(deltaMs);
    this.weatherOverlay?.update(deltaMs);

    if (this.threeRenderer) {
      this.perfProbe?.beginFrame(deltaMs);
      this.threeRenderer.update(deltaMs);
      this.perfProbe?.endFrame();
      // Exactly one discrete game event on arrival. Never send per-frame
      // position updates into React/WorldBridge; stage state is unchanged.
      if (this.pendingArrivalBuildingId && !this.threeRenderer.isAvatarMoving) {
        const arrivedId = this.pendingArrivalBuildingId;
        this.pendingArrivalBuildingId = undefined;
        worldBridge.notifyBuildingClicked(arrivedId);
      }
    }
  }

  private cleanup(): void {
    this.pendingArrivalBuildingId = undefined;
    this.bridgeUnsubscribers.forEach((unsub) => unsub());
    this.bridgeUnsubscribers = [];

    this.input.off('pointerdown', this.handleThreePointerDown, this);
    this.dossierLayer?.destroy();
    this.environmentLayer?.destroy();
    this.groundDecorLayer?.destroy();
    this.buildingLayer?.destroy();
    this.faunaLayer?.destroy();
    this.npcLayer?.destroy();
    this.seasonLayer?.destroy();
    this.stageLayer?.destroy();
    this.weatherOverlay?.destroy();
    this.threeRenderer?.destroy();
    this.perfProbe?.destroy();
  }
}
