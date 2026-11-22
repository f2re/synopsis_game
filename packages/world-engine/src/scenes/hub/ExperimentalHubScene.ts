import Phaser from 'phaser';
import {
  bindLogicalViewport,
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
} from '../../runtime/fitLogicalViewport';
import { HubPerfProbe } from '../../renderer/three/HubPerfProbe';
import { ThreeHubRenderer } from '../../renderer/three/ThreeHubRenderer';
import { HubTimeOfDay, type DayPhase } from './HubTimeOfDay';
import type { WeatherMode } from './HubWeatherOverlay';
import { HUB_BUILDINGS } from './HubBuildingLayer';
import { HubStageLayer } from './HubStageLayer';
import { calculateSeason, isSeason, nextSeason, SEASON_PROFILES, type Season } from './HubSeason';
import { buildingStatesFromStages, computeStageStatuses } from './hubStages';
import { STATION_26063_LOCATION } from './HubTimeOfDay';
import { HubScheduleManager } from '../../world/hubSchedule';
import { HUB_BUILDING_BY_ID, HUB_WORLD_DEFINITION_V1 } from '../../world/hub/HubWorldDefinition';
import { normalizeWorldPreferences, type WorldUiPreferences } from '../../runtime/uiPreferences';
import { HubVisitQueue } from '../../world/hub/HubVisitQueue';
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

export class ExperimentalHubScene extends Phaser.Scene {
  private timeOfDay: HubTimeOfDay;
  private scheduleManager: HubScheduleManager;

  private stageLayer?: HubStageLayer;
  private disposed = false;

  // New world-definition-first renderer spike.
  private threeRenderer?: ThreeHubRenderer;
  private perfProbe?: HubPerfProbe;
  private readonly visitQueue = new HubVisitQueue();
  private readonly smokePointerHits: string[] = [];
  private readonly smokeWorldEvents: string[] = [];
  private smokeSnapshot?: () => object;

  private season: Season = calculateSeason(new Date(), STATION_26063_LOCATION);
  private weatherForced = false;
  private bridgeUnsubscribers: (() => void)[] = [];
  private readonly buildingStates = new Map<string, BuildingStateId>(
    HUB_BUILDINGS.map((building) => [building.id, building.defaultState]),
  );

  constructor() {
    super('hub');
    this.timeOfDay = new HubTimeOfDay();
    this.scheduleManager = new HubScheduleManager(26063);
  }

  create(): void {
    this.disposed = false;
    this.createThreeHub();

    this.applyDebugQueryOverrides();
    this.setupBridge();
    worldBridge.notifySceneReady('hub');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
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

    this.input.on('pointerdown', this.handleThreePointerDown, this);
    this.installBrowserSmokeObserver();
    this.applyDayPhase(this.timeOfDay.getCurrentPhase());
    this.applySeason(this.season);
    this.applyStageProgress([]);
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
      this.threeRenderer?.setWeather(weather);
    }
  }

  /**
   * Browser QA-only observer. It is read-only and installed only for the
   * explicit hubE2E=1 query. Chrome drives real mouse/keyboard input through
   * Phaser; this hook does not select buildings or advance animations.
   */
  private installBrowserSmokeObserver(): void {
    if (typeof window === 'undefined' ||
        new URLSearchParams(window.location.search).get('hubE2E') !== '1') return;

    const global = window as Window & { __synopsisHubSmoke?: { snapshot: () => object } };
    this.smokeSnapshot = () => ({
      ready: Boolean(this.threeRenderer),
      targets: this.threeRenderer?.getBrowserSmokeTargets() ?? [],
      pointerHits: [...this.smokePointerHits],
      worldEvents: [...this.smokeWorldEvents],
      moving: this.threeRenderer?.isAvatarMoving ?? false,
      dossierOpen: this.registry.get('ui.modal_open') === true,
      arrivalGated: this.threeRenderer?.isArrivalGated ?? false,
    });
    global.__synopsisHubSmoke = { snapshot: this.smokeSnapshot };
    this.bridgeUnsubscribers.push(worldBridge.on('world:building_click', (id: string) => {
      this.smokeWorldEvents.push(id);
    }));
  }

  private handleThreePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.registry.get('ui.modal_open') === true) return;
    const buildingId = this.threeRenderer?.pickBuilding(pointer.worldX, pointer.worldY);
    if (!buildingId) return;
    if (this.smokeSnapshot) this.smokePointerHits.push(buildingId);
    this.visitBuildingById(buildingId);
  }

  /**
   * One semantic interaction path for mouse picking and native keyboard
   * controls. The event contains only a canonical building ID, never a
   * mesh UUID, CSS pixel or a separate set of UI route coordinates.
   */
  private visitBuildingById(buildingId: string): void {
    if (this.registry.get('ui.modal_open') === true) return;
    const building = HUB_BUILDING_BY_ID.get(buildingId);
    if (!building) return;
    const outcome = this.threeRenderer?.walkAvatarTo(building.entrance.x, building.entrance.y);
    const immediateId = this.visitQueue.request(
      building.id, outcome, this.threeRenderer?.isArrivalGated ?? false,
    );
    if (immediateId) worldBridge.notifyBuildingClicked(immediateId);
  }

  private applyDayPhase(phase: DayPhase): void {

    this.threeRenderer?.setDayPhase(phase);

    worldBridge.notifyPhaseChanged(phase);
  }

  private applySeason(season: Season): void {
    this.season = season;
    const profile = SEASON_PROFILES[season];

    this.threeRenderer?.setSeason(season);

    if (!this.weatherForced) {
      this.threeRenderer?.setWeather(profile.defaultWeather);
    }
    worldBridge.notifySeasonChanged(season);
  }

  private setBuildingStates(states: Record<string, BuildingStateId>): void {
    for (const [id, state] of Object.entries(states)) this.buildingStates.set(id, state);
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
        this.visitQueue.cancel();
        this.threeRenderer?.walkAvatarTo(x, y);
      },
    );

    // Accessible HTML buttons use the exact same navigation/dossier flow
    // as a Three.js raycast hit or the legacy Phaser building interaction.
    const unsubKeyboardVisit = worldBridge.on('hub:visit_building', (buildingId: string) => {
      this.visitBuildingById(buildingId);
    });

    const applyPreferences = (value: unknown) => {
      const preferences = normalizeWorldPreferences(value);
      this.threeRenderer?.setPreferences(preferences.reducedMotion, preferences.lowPower);
    };
    const unsubPreferences = worldBridge.on<WorldUiPreferences>('ui:preferences', applyPreferences);
    applyPreferences(this.registry.get('ui.preferences'));
    const applyWeather = (presentation: { mode: string }) => {
      if (this.weatherForced) return;
      this.threeRenderer?.setWeather(presentation.mode === 'rain' ? 'rain' : 'clear');
    };
    const unsubPresentationWeather = worldBridge.on('ui:weather', applyWeather);
    const unsubModal = worldBridge.on<boolean>('ui:modal_open', (open) => {
      if (open) this.visitQueue.cancel();
    });
    const savedWeather = this.registry.get('ui.weather');
    if (savedWeather) applyWeather(savedWeather);

    this.bridgeUnsubscribers.push(
      unsubBuildings,
      unsubPhase,
      unsubDemo,
      unsubWeather,
      unsubCalm,
      unsubBuildingClick,
      unsubKeyboardVisit,
      unsubPreferences,
      unsubPresentationWeather,
      unsubModal,
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

    const preferences = normalizeWorldPreferences(this.registry.get('ui.preferences'));
    if (!preferences.reducedMotion && !preferences.lowPower) this.stageLayer?.update(deltaMs);

    if (this.threeRenderer) {
      this.perfProbe?.beginFrame(deltaMs);
      this.threeRenderer.update(deltaMs);
      this.perfProbe?.endFrame();
      // Exactly one discrete game event on arrival. Never send per-frame
      // position updates into React/WorldBridge; stage state is unchanged.
      const arrivedId = this.visitQueue.onMovementUpdate(this.threeRenderer.isAvatarMoving);
      if (arrivedId) worldBridge.notifyBuildingClicked(arrivedId);
    }
  }

  private cleanup(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.visitQueue.cancel();
    if (this.smokeSnapshot && typeof window !== 'undefined') {
      const global = window as Window & { __synopsisHubSmoke?: { snapshot: () => object } };
      if (global.__synopsisHubSmoke?.snapshot === this.smokeSnapshot) {
        delete global.__synopsisHubSmoke;
      }
      this.smokeSnapshot = undefined;
    }
    this.bridgeUnsubscribers.forEach((unsub) => unsub());
    this.bridgeUnsubscribers = [];

    this.input.off('pointerdown', this.handleThreePointerDown, this);
    this.stageLayer?.destroy();
    this.threeRenderer?.destroy();
    this.perfProbe?.destroy();
    this.threeRenderer = undefined;
    this.perfProbe = undefined;
    this.stageLayer = undefined;
  }
}
