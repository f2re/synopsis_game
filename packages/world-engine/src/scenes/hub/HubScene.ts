import Phaser from 'phaser';
import {
  bindHubCoverViewport,
  bindLogicalViewport,
  WORLD_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
} from '../../runtime/fitLogicalViewport';
import { HubTimeOfDay, PHASE_COLOR_MAP, type DayPhase } from './HubTimeOfDay';
import approvedAssets from '../../assets/hub/runtime-approval.json';
import r01Assets from '../../assets/hub/r01-approval.json';
import { HubR01Layer } from './HubR01Layer';
import { HubCharacterLayer, preloadHubCharacters } from './HubCharacterLayer';
import { normalizeWorldPreferences } from '../../runtime/uiPreferences';
import { HUB_BUILDINGS } from './HubBuildingLayer';
import { HubEnvironmentLayer } from './HubEnvironmentLayer';
import { HubBuildingLayer } from './HubBuildingLayer';
import { HubGroundDecorLayer } from './HubGroundDecorLayer';
import { HubFaunaLayer } from './HubFaunaLayer';
import { HubNpcLayer } from './HubNpcLayer';
import { HubSeasonLayer } from './HubSeasonLayer';
import { HubStageLayer } from './HubStageLayer';
import { calculateSeason, isSeason, nextSeason, SEASON_PROFILES, type Season } from './HubSeason';
import { buildingStatesFromStages, computeStageStatuses } from './hubStages';
import { STATION_26063_LOCATION } from './HubTimeOfDay';
import { HubWeatherOverlay, type WeatherMode } from './HubWeatherOverlay';
import { HubScheduleManager } from '../../world/hubSchedule';
import { worldBridge } from '../../bridge/WorldBridge';
import { getR01PhaseStyle, normalizeR01Weather } from './r01Environment';

export class HubScene extends Phaser.Scene {
  private timeOfDay: HubTimeOfDay;
  private scheduleManager: HubScheduleManager;

  // Слои сцены L0 - L10
  private environmentLayer?: HubEnvironmentLayer;
  private buildingLayer?: HubBuildingLayer;
  private groundDecorLayer?: HubGroundDecorLayer;
  private faunaLayer?: HubFaunaLayer;
  private npcLayer?: HubNpcLayer;
  private weatherOverlay?: HubWeatherOverlay;
  private seasonLayer?: HubSeasonLayer;
  private stageLayer?: HubStageLayer;
  private season: Season = calculateSeason(new Date(), STATION_26063_LOCATION);
  private weatherForced = false;
  private r01Layer?: HubR01Layer;
  private characterLayer?: HubCharacterLayer;
  private useR01 = false;

  private bridgeUnsubscribers: (() => void)[] = [];

  constructor() {
    super('hub');
    this.timeOfDay = new HubTimeOfDay();
    this.scheduleManager = new HubScheduleManager(26063);
  }

  preload(): void {
    const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const preview = query?.get('hubArtPreview') === '1';
    const development = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;
    const legacyComparator = development && query?.get('hubArtLegacy') === '1';
    this.useR01 = false;
    if (!legacyComparator && (r01Assets.artAcceptance === 'PASS' || preview)) {
      this.useR01 = true;
      preloadHubCharacters(this);
      for (const asset of r01Assets.assets) this.load.image(asset.key, asset.url);
      for (const asset of r01Assets.optionalAssets) {
        if (asset.enabled && (preview || asset.status === 'approved')) this.load.image(asset.key, asset.url);
      }
      return;
    }
    // Не делать 404-запросы на непринятые графические слои. Отладочная
    // процедурная сцена не является готовым художественным результатом.
    if (approvedAssets.artAcceptance !== 'PASS') return;
    for (const asset of approvedAssets.assets) {
      if (asset.status === 'approved') this.load.image(asset.key, asset.url);
    }
  }

  create(): void {
    // The home screen must not silently replace a failed station download with
    // the legacy scene. React keeps navigation available and offers a retry.
    if (this.useR01) {
      const required = [...r01Assets.assets, ...r01Assets.optionalAssets.filter((asset) => 'required' in asset && asset.required)];
      const missing = required.filter((asset) => !this.textures.exists(asset.key)).map((asset) => asset.key);
      if (missing.length > 0) {
        this.registry.set('world.load_error', { scene: 'hub', assets: missing });
        worldBridge.emit('world:load_error', { scene: 'hub', assets: missing });
        return;
      }
    }
    // Candidate preview is explicit; the default switches only after independent art acceptance.
    if (this.useR01 && r01Assets.assets.every((asset) => this.textures.exists(asset.key))) {
      this.timeOfDay = new HubTimeOfDay(r01Assets.scene.world_location);
      const authoredPhase = this.getAuthoredPhase();
      if (authoredPhase) this.timeOfDay.setPhase(authoredPhase);
      this.r01Layer = new HubR01Layer(this);
      this.characterLayer = new HubCharacterLayer(this);
      this.r01Layer.setWeather(this.registry.get('ui.weather'));
      this.setupBridge();
      this.applyDayPhase(this.timeOfDay.getCurrentPhase());
      worldBridge.notifySeasonChanged(this.season);
      worldBridge.notifySceneReady('hub');
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
      return;
    }
    // 1. Экспериментальная полноэкранная камера Hub; до UX-приёмки только ?hubCover=1
    // Opt-in camera until art/UX acceptance; legacy scene behaviour stays default.
    const coverPreview = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('hubCover') === '1';
    if (coverPreview) bindHubCoverViewport(this, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);
    else bindLogicalViewport(this, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);

    // 2. Слой L0-L4: Небо, светила, облака, горизонт залива, водные блики
    this.environmentLayer = new HubEnvironmentLayer(this);

    // 3. Слой L6: Рельеф метеоплощадки, гранитные дорожки и приборы
    this.groundDecorLayer = new HubGroundDecorLayer(this);

    // 4. Слой L5: Интерактивные здания кампуса 26063
    this.buildingLayer = new HubBuildingLayer(this);

    // Accessible dossiers are owned by React; the canvas publishes discrete selection events.

    // 5. Слой L8: Фауна (синица, воробьи, чайка, утка, белка, кот Барограф)
    this.faunaLayer = new HubFaunaLayer(this, this.scheduleManager);

    // 6. Слой L8: Сотрудники кампуса (Вера Павловна, техник Семён, лаборантка)
    this.npcLayer = new HubNpcLayer(this);

    // 7. Слой L10: Атмосферный тинт, частицы погоды и виньетка
    this.weatherOverlay = new HubWeatherOverlay(this);

    // 7a. Слой сезонов: вуаль, снег, листопад
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    this.seasonLayer = new HubSeasonLayer(this, reducedMotion);

    // 7b. Слой этапов прохождения (маршрут и маркеры), над сезоном
    this.stageLayer = new HubStageLayer(this);
    this.applyStageProgress([]);

    // 8. Первичная отрисовка фазы суток
    this.applyDayPhase(this.timeOfDay.getCurrentPhase());
    this.applySeason(this.season);

    // 9. Подключение моста событий React <-> Phaser
    this.setupBridge();
    this.publishLegacyTargets();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.publishLegacyTargets, this);

    // Уведомление о готовности сцены
    worldBridge.notifySceneReady('hub');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup();
    });
  }

  private applyDayPhase(phase: DayPhase): void {
    const effectivePhase = this.r01Layer ? this.getAuthoredPhase() ?? phase : phase;
    const colors = PHASE_COLOR_MAP[effectivePhase];
    this.r01Layer?.applyDayPhase(effectivePhase, colors);
    const weather = normalizeR01Weather(this.registry.get('ui.weather'));
    this.characterLayer?.applyLighting(getR01PhaseStyle(effectivePhase, weather.mode).sceneryTint);

    this.environmentLayer?.applyDayPhase(phase, colors);
    this.groundDecorLayer?.applyDayPhase(phase, colors);
    this.buildingLayer?.applyDayPhase(phase, colors);
    this.weatherOverlay?.applyDayPhase(phase);

    worldBridge.notifyPhaseChanged(effectivePhase);
    this.publishEnvironment(effectivePhase);
  }

  private publishEnvironment(phase = this.timeOfDay.getCurrentPhase()): void {
    if (!this.r01Layer) return;
    const environment = {
      lightingMode: this.getAuthoredPhase() ? 'authored-demo' : 'solar',
      phase,
      worldLocation: r01Assets.scene.world_location,
      ...this.r01Layer.getEnvironment(),
    };
    this.registry.set('world.environment', environment);
    worldBridge.emit('world:environment_mode', environment);
  }

  private getAuthoredPhase(): DayPhase | null {
    const override = r01Assets.scene.demo_override;
    return override.enabled && override.phase in PHASE_COLOR_MAP ? override.phase as DayPhase : null;
  }

  private applySeason(season: Season): void {
    this.season = season;
    const profile = SEASON_PROFILES[season];
    this.seasonLayer?.setSeason(season);
    this.groundDecorLayer?.applySeason(profile.foliageTint);
    this.buildingLayer?.applySeason(season, profile.roofSnow);
    if (!this.weatherForced) this.weatherOverlay?.setWeather(profile.defaultWeather);
    worldBridge.notifySeasonChanged(season);
  }

  private applyStageProgress(completed: readonly string[]): void {
    const statuses = computeStageStatuses(completed);
    this.stageLayer?.setStatuses(statuses);
    this.buildingLayer?.setStates(buildingStatesFromStages(statuses));
  }

  private setupBridge(): void {
    // 1. Обновления состояний зданий от сервера
    const unsubBuildings = worldBridge.on(
      'server:building_states',
      (states: any) => {
        this.buildingLayer?.setStates(states);
      },
    );

    // 2. Смена фазы суток
    const unsubPhase = worldBridge.on('server:time_phase', (phase: DayPhase) => {
      this.timeOfDay.setPhase(phase);
      this.applyDayPhase(phase);
    });

    // 3. Ускоренная демонстрация
    const unsubDemo = worldBridge.on(
      'server:demo_acceleration',
      (enabled: boolean) => {
        this.timeOfDay.setAcceleratedDemo(enabled);
      },
    );

    // 4. Погодный режим (снег / дождь / ясно)
    const unsubWeather = worldBridge.on(
      'server:weather',
      (mode: WeatherMode) => {
        this.weatherForced = true;
        this.weatherOverlay?.setWeather(mode);
      },
    );

    // Presentation weather uses the same choice as the archive and soundscape.
    // It is independent from observations and does not change task data.
    const unsubPresentationWeather = worldBridge.on('ui:weather', (value: unknown) => {
      const weather = normalizeR01Weather(value);
      this.r01Layer?.setWeather(weather);
      const phase = this.getAuthoredPhase() ?? this.timeOfDay.getCurrentPhase();
      this.characterLayer?.applyLighting(getR01PhaseStyle(phase, weather.mode).sceneryTint);
      this.publishEnvironment(phase);
    });
    const unsubVisibility = worldBridge.on<boolean>('ui:world_visible', (visible) => {
      if (visible && !this.getAuthoredPhase()) {
        this.timeOfDay.refresh(new Date(), (phase) => this.applyDayPhase(phase));
      }
    });

    // 5. Режим study-calm (блокировка спорадических всплесков)
    const unsubCalm = worldBridge.on(
      'server:study_calm',
      (enabled: boolean) => {
        this.scheduleManager.setStudyCalm(enabled);
      },
    );

    // 5a. Сезон (null — календарь станции)
    const unsubSeason = worldBridge.on('server:season', (value: unknown) => {
      this.applySeason(isSeason(value) ? value : calculateSeason(new Date(), STATION_26063_LOCATION));
    });
    const unsubCycleSeason = worldBridge.on('hub:cycle_season', () => {
      this.applySeason(nextSeason(this.season));
    });

    // 5b. Пройденные этапы маршрута
    const unsubStages = worldBridge.on('server:stage_progress', (ids: unknown) => {
      this.applyStageProgress(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
    });

    // 7. Фактический клик по зданию открывает досье из текущего 480×270 слоя.
    const unsubFocusBuilding = worldBridge.on<{buildingId: string | null}>('ui:focus_building', ({buildingId}) => {
      this.buildingLayer?.setFocused(buildingId);
    });

    this.bridgeUnsubscribers.push(
      unsubBuildings,
      unsubPhase,
      unsubDemo,
      unsubWeather,
      unsubPresentationWeather,
      unsubVisibility,
      unsubCalm,
      unsubFocusBuilding,
      unsubSeason,
      unsubCycleSeason,
      unsubStages,
    );
  }

  override update(_time: number, deltaMs: number): void {
    const currentPhase = this.timeOfDay.getCurrentPhase();

    // 1. Демонстрация фаз суток
    if (!this.r01Layer || !this.getAuthoredPhase()) {
      this.timeOfDay.update(deltaMs, (newPhase) => {
        this.applyDayPhase(newPhase);
      });
    }
    const preferences = normalizeWorldPreferences(this.registry.get('ui.preferences'));
    if (preferences.reducedMotion) return;
    if (this.r01Layer) {
      this.r01Layer.update(deltaMs);
      this.characterLayer?.update(deltaMs);
      return;
    }

    // 2. Планировщик живого мира
    const currentUtcHour = new Date().getUTCHours();
    this.scheduleManager.update(deltaMs / 1000, currentUtcHour);

    // 3. Обновление слоёв
    this.environmentLayer?.update(deltaMs, currentPhase);
    this.groundDecorLayer?.update(deltaMs, currentPhase);
    this.buildingLayer?.update(deltaMs);
    this.faunaLayer?.update(deltaMs, currentPhase);
    this.npcLayer?.update(deltaMs, currentPhase);
    this.seasonLayer?.update(deltaMs);
    this.stageLayer?.update(deltaMs);
    this.weatherOverlay?.update(deltaMs);
  }

  private cleanup(): void {
    this.bridgeUnsubscribers.forEach((unsub) => unsub());
    this.bridgeUnsubscribers = [];
    this.scale.off(Phaser.Scale.Events.RESIZE, this.publishLegacyTargets, this);
    this.characterLayer?.destroy();
    this.characterLayer = undefined;
    this.r01Layer?.destroy();
    this.r01Layer = undefined;

    this.environmentLayer?.destroy();
    this.groundDecorLayer?.destroy();
    this.buildingLayer?.destroy();
    this.faunaLayer?.destroy();
    this.npcLayer?.destroy();
    this.seasonLayer?.destroy();
    this.stageLayer?.destroy();
    this.weatherOverlay?.destroy();
    this.environmentLayer = undefined;
    this.groundDecorLayer = undefined;
    this.buildingLayer = undefined;
    this.faunaLayer = undefined;
    this.npcLayer = undefined;
    this.seasonLayer = undefined;
    this.stageLayer = undefined;
    this.weatherOverlay = undefined;
  }

  private publishLegacyTargets(): void {
    if (this.r01Layer) return;
    const camera = this.cameras.main;
    const zoom = camera.zoom;
    const offsetX = camera.x + camera.width / 2 - WORLD_LOGICAL_WIDTH * zoom / 2;
    const offsetY = camera.y + camera.height / 2 - WORLD_LOGICAL_HEIGHT * zoom / 2;
    const visible = HUB_BUILDINGS.filter((building) => !building.service);
    worldBridge.emit('world:interaction_layout', visible.map((building) => ({
      id: building.id, label: building.name, state: this.buildingLayer?.getBuildingState(building.id) ?? building.defaultState,
      x: offsetX + building.bounds.x * zoom,
      y: offsetY + building.bounds.y * zoom,
      width: Math.max(44, building.bounds.width * zoom),
      height: Math.max(44, building.bounds.height * zoom),
    })));
  }
}
