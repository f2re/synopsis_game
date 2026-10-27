import Phaser from 'phaser';
import { WORLD_PALETTE, UI_COLORS } from '../../theme/tokens';
import {
  bindLogicalViewport,
  WORLD_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
} from '../../runtime/fitLogicalViewport';
import { HubTimeOfDay, type DayPhase } from './HubTimeOfDay';
import { HubBuildingLayer } from './HubBuildingLayer';
import { worldBridge } from '../../bridge/WorldBridge';

export class HubScene extends Phaser.Scene {
  private timeOfDay: HubTimeOfDay;
  private buildingLayer?: HubBuildingLayer;
  private skyGraphics!: Phaser.GameObjects.Graphics;
  private groundGraphics!: Phaser.GameObjects.Graphics;
  private starsContainer!: Phaser.GameObjects.Container;
  private bridgeUnsubscribers: (() => void)[] = [];

  constructor() {
    super('hub');
    this.timeOfDay = new HubTimeOfDay();
  }

  preload(): void {
    // В будущем здесь подгружается текстурный атлас уровня 1
    // assets/generated/atlases/level1-atlas.json
  }

  create(): void {
    // 1. Привязка целочисленного масштабирования с паспарту (включая 800x600)
    bindLogicalViewport(this, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);

    // 2. Слой L0: Процедурный градиент неба и звёзды
    this.skyGraphics = this.add.graphics();
    this.starsContainer = this.add.container(0, 0);
    this.createStars();

    // 3. Слой L2-L6: Рельеф и берег Финского залива
    this.groundGraphics = this.add.graphics();
    this.renderEnvironment();

    // 4. Слой L5: Интерактивные здания кампуса 26063
    this.buildingLayer = new HubBuildingLayer(this);

    // 5. Первичная отрисовка фазы суток
    this.applyDayPhase(this.timeOfDay.getCurrentPhase());

    // 6. Подключение моста событий React <-> Phaser
    this.setupBridge();

    // Уведомление о готовности сцены
    worldBridge.notifySceneReady('hub');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup();
    });
  }

  private createStars(): void {
    // Процедурные звёзды для ночной фазы (1x1 пиксели)
    const starCount = 35;
    for (let i = 0; i < starCount; i++) {
      const sx = (i * 37 + 13) % WORLD_LOGICAL_WIDTH;
      const sy = (i * 19 + 7) % 90; // Только верхняя треть неба
      const star = this.add.rectangle(sx, sy, 1, 1, WORLD_PALETTE.birchAndSnow3);
      this.starsContainer.add(star);
    }
  }

  private renderEnvironment(): void {
    this.groundGraphics.clear();

    // L2: Горизонт Финского залива (плоский берег, сосновая кромка)
    this.groundGraphics.fillStyle(WORLD_PALETTE.foliagePine1, 1);
    this.groundGraphics.fillRect(0, 100, WORLD_LOGICAL_WIDTH, 14);

    // L3: Водная гладь залива
    this.groundGraphics.fillStyle(WORLD_PALETTE.waterGulf1, 1);
    this.groundGraphics.fillRect(0, 114, WORLD_LOGICAL_WIDTH, 36);

    // L6: Гранитный рельеф двора и метеоплощадка
    this.groundGraphics.fillStyle(WORLD_PALETTE.stoneConcrete0, 1);
    this.groundGraphics.fillRect(0, 150, WORLD_LOGICAL_WIDTH, 120);

    // Дорожки из гранитного щебня
    this.groundGraphics.fillStyle(WORLD_PALETTE.stoneConcrete1, 1);
    this.groundGraphics.fillRect(40, 165, WORLD_LOGICAL_WIDTH - 80, 8);
  }

  private applyDayPhase(phase: DayPhase): void {
    const colors = this.timeOfDay.getPhaseColors();

    // Перерисовка градиента неба L0
    this.skyGraphics.clear();
    this.skyGraphics.fillGradientStyle(
      colors.skyTop,
      colors.skyTop,
      colors.skyHorizon,
      colors.skyHorizon,
      1,
    );
    this.skyGraphics.fillRect(0, 0, WORLD_LOGICAL_WIDTH, 114);

    // Видимость звёзд
    this.starsContainer.setVisible(colors.starsVisible);

    // Уведомление через мост
    worldBridge.notifyPhaseChanged(phase);
  }

  private setupBridge(): void {
    // Слушаем обновления состояний зданий от сервера
    const unsubBuildings = worldBridge.on(
      'server:building_states',
      (states: any) => {
        this.buildingLayer?.setStates(states);
      },
    );

    // Слушаем ручную смену фазы суток
    const unsubPhase = worldBridge.on('server:time_phase', (phase: DayPhase) => {
      this.timeOfDay.setPhase(phase);
      this.applyDayPhase(phase);
    });

    // Слушаем включение ускоренной демонстрации
    const unsubDemo = worldBridge.on(
      'server:demo_acceleration',
      (enabled: boolean) => {
        this.timeOfDay.setAcceleratedDemo(enabled);
      },
    );

    this.bridgeUnsubscribers.push(unsubBuildings, unsubPhase, unsubDemo);
  }

  override update(_time: number, delta: number): void {
    // Обновление ускоренной демонстрации фаз суток
    this.timeOfDay.update(delta, (newPhase) => {
      this.applyDayPhase(newPhase);
    });

    // Пульсация маркеров зданий
    this.buildingLayer?.update(delta);
  }

  private cleanup(): void {
    this.bridgeUnsubscribers.forEach((unsub) => unsub());
    this.bridgeUnsubscribers = [];
    this.buildingLayer?.destroy();
  }
}
