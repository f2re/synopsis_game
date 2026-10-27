import Phaser from 'phaser';
import {
  bindLogicalViewport,
  WORLD_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
} from '../../runtime/fitLogicalViewport';
import { HubTimeOfDay, type DayPhase } from './HubTimeOfDay';
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

  private bridgeUnsubscribers: (() => void)[] = [];

  constructor() {
    super('hub');
    this.timeOfDay = new HubTimeOfDay();
    this.scheduleManager = new HubScheduleManager(26063);
  }

  preload(): void {
    // Предварительная загрузка растровых слоёв хаба 480x270 (v3 конвейер)
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
    // 1. Привязка целочисленного масштабирования с паспарту
    bindLogicalViewport(this, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);

    // 2. Слой L0-L4: Небо, светила, облака, горизонт залива, водные блики
    this.environmentLayer = new HubEnvironmentLayer(this);

    // 3. Слой L6: Рельеф метеоплощадки, гранитные дорожки и приборы
    this.groundDecorLayer = new HubGroundDecorLayer(this);

    // 4. Слой L5: Интерактивные здания кампуса 26063
    this.buildingLayer = new HubBuildingLayer(this);

    // 5. Слой L8: Фауна (синица, воробьи, чайка, утка, белка, кот Барограф)
    this.faunaLayer = new HubFaunaLayer(this, this.scheduleManager);

    // 6. Слой L8: Персонажи (Вера Павловна, техник Семён, лаборантка, аватар)
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

    // Уведомление о готовности сцены
    worldBridge.notifySceneReady('hub');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup();
    });
  }

  private applyDayPhase(phase: DayPhase): void {
    const colors = this.timeOfDay.getPhaseColors();

    this.environmentLayer?.applyDayPhase(phase, colors);
    this.groundDecorLayer?.applyDayPhase(phase, colors);
    this.buildingLayer?.applyDayPhase(phase, colors);
    this.weatherOverlay?.applyDayPhase(phase);

    worldBridge.notifyPhaseChanged(phase);
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

    // 6. Перемещение аватара к выбранному зданию
    const unsubBuildingClick = worldBridge.on(
      'hub:walk_to_building',
      ({ x, y }: { x: number; y: number }) => {
        this.npcLayer?.walkAvatarTo(x, y);
      },
    );

    this.bridgeUnsubscribers.push(
      unsubBuildings,
      unsubPhase,
      unsubDemo,
      unsubWeather,
      unsubCalm,
      unsubBuildingClick,
      unsubSeason,
      unsubCycleSeason,
      unsubStages,
    );
  }

  override update(_time: number, deltaMs: number): void {
    const currentPhase = this.timeOfDay.getCurrentPhase();

    // 1. Демонстрация фаз суток
    this.timeOfDay.update(deltaMs, (newPhase) => {
      this.applyDayPhase(newPhase);
    });

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

    this.environmentLayer?.destroy();
    this.groundDecorLayer?.destroy();
    this.buildingLayer?.destroy();
    this.faunaLayer?.destroy();
    this.npcLayer?.destroy();
    this.seasonLayer?.destroy();
    this.stageLayer?.destroy();
    this.weatherOverlay?.destroy();
  }
}
