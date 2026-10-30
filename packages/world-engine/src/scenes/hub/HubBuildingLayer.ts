import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import { worldBridge, type BuildingStateId } from '../../bridge/WorldBridge';
import type { DayPhase, PhaseColors } from './HubTimeOfDay';
import { drawProceduralFacade, type FacadeSpec } from './HubProceduralFacades';
import type { Season } from './HubSeason';

export interface BuildingConfig {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  entrance: { x: number; y: number };
  defaultState: BuildingStateId;
  windows?: { x: number; y: number; w: number; h: number }[];
  /** Фасад в растре L5; иначе рисуется процедурная заглушка до приёмки арта. */
  facade: 'raster' | FacadeSpec;
  /** Служебные здания не входят в маршрут этапов. */
  service?: boolean;
}

export const HUB_BUILDINGS: BuildingConfig[] = [
  {
    id: 'codepost',
    name: 'Главный синоптический корпус (КН-01)',
    bounds: { x: 175, y: 130, width: 175, height: 85 },
    entrance: { x: 325, y: 200 },
    defaultState: 'active',
    facade: 'raster',
  },
  {
    id: 'cartography',
    name: 'Картографический класс и анализ',
    bounds: { x: 55, y: 95, width: 145, height: 80 },
    entrance: { x: 155, y: 165 },
    defaultState: 'locked',
    facade: 'raster',
  },
  {
    id: 'archive',
    name: 'Архив гидрометеорологических наблюдений',
    bounds: { x: 200, y: 65, width: 65, height: 75 },
    entrance: { x: 235, y: 138 },
    defaultState: 'available',
    facade: 'raster',
  },
  {
    id: 'radar',
    name: 'Радиолокационная вышка ДМРЛ-С',
    bounds: { x: 110, y: 35, width: 38, height: 65 },
    entrance: { x: 128, y: 100 },
    defaultState: 'locked',
    facade: 'raster',
  },
  {
    id: 'lab',
    name: 'Аэрологический павильон зондирования',
    bounds: { x: 285, y: 55, width: 110, height: 55 },
    entrance: { x: 340, y: 110 },
    defaultState: 'locked',
    facade: 'raster',
  },
  {
    id: 'hall',
    name: 'Зал синоптических турниров и дуэлей',
    bounds: { x: 335, y: 120, width: 125, height: 80 },
    entrance: { x: 425, y: 185 },
    defaultState: 'locked',
    facade: 'raster',
  },
  {
    id: 'meteo-site',
    name: 'Метеоплощадка · будка Стивенсона',
    bounds: { x: 30, y: 160, width: 200, height: 100 },
    entrance: { x: 180, y: 220 },
    defaultState: 'available',
    facade: 'raster',
    service: true,
  },
  {
    id: 'canteen',
    name: 'Дежурная столовая',
    bounds: { x: 430, y: 206, width: 46, height: 48 },
    entrance: { x: 453, y: 254 },
    defaultState: 'available',
    facade: 'raster',
    service: true,
  },
];

/** Затемнение процедурных фасадов (растровые тинтуются спрайтом). */
const FACADE_DIM: Record<DayPhase, number> = {
  night: 0.5,
  twilight: 0.32,
  dawn: 0.2,
  white_nights: 0.15,
  golden_hour: 0.08,
  day: 0,
};

export class HubBuildingLayer {
  private scene: Phaser.Scene;
  private buildingStates: Map<string, BuildingStateId> = new Map();
  private containers: Map<string, Phaser.GameObjects.Container> = new Map();
  private outlines: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private radarBeaconGraphic: Phaser.GameObjects.Graphics;
  private pulseTimer = 0;
  private currentPhase: DayPhase = 'day';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    HUB_BUILDINGS.forEach((b) => this.buildingStates.set(b.id, b.defaultState));

    // Сигнальные маяки радаров ДМРЛ
    this.radarBeaconGraphic = this.scene.add.graphics();

    this.create();
  }

  create(): void {
    HUB_BUILDINGS.forEach((building) => {
      const container = this.scene.add.container(building.bounds.x, building.bounds.y);
      const state = this.buildingStates.get(building.id) || 'locked';

      // Интерактивная зона клика
      const hitArea = this.scene.add
        .rectangle(
          0,
          0,
          building.bounds.width,
          building.bounds.height,
          0x000000,
          0,
        )
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: state !== 'locked' });

      hitArea.on('pointerdown', () => {
        if (this.buildingStates.get(building.id) !== 'locked') {
          worldBridge.notifyBuildingClicked(building.id);
        }
      });

      // Деликатный маркер фокуса
      const outline = this.scene.add.graphics();
      container.add([hitArea, outline]);

      this.containers.set(building.id, container);
      this.outlines.set(building.id, outline);
      this.renderBuildingState(building.id);
    });
  }

  applySeason(_season: Season, _roofSnow: boolean): void {
    // Сезонные изменения накладываются через общий сезонный слой
  }

  getBuildingState(id: string): BuildingStateId | undefined {
    return this.buildingStates.get(id);
  }

  setStates(states: Record<string, BuildingStateId>): void {
    Object.entries(states).forEach(([id, st]) => {
      this.buildingStates.set(id, st);
      this.renderBuildingState(id);
    });
  }

  applyDayPhase(phase: DayPhase, _colors: PhaseColors): void {
    this.currentPhase = phase;
  }

  private renderBuildingState(_id: string): void {
    // Состояние каждого здания отображается диегетическими табличками в HubStageLayer
  }

  update(deltaMs: number): void {
    this.pulseTimer += deltaMs;

    // Мигание красных сигнальных огней на вышках радаров (купол x=128, y=40 и тарелка x=407, y=45)
    this.radarBeaconGraphic.clear();
    const radarCycle = this.pulseTimer % 1200;
    if (radarCycle < 250) {
      this.radarBeaconGraphic.fillStyle(WORLD_PALETTE.checkingPencil0, 0.95);
      // Главный купол ДМРЛ
      this.radarBeaconGraphic.fillRect(127, 39, 2, 2);
      // Вспомогательная вышка аэрологии
      this.radarBeaconGraphic.fillRect(406, 44, 2, 2);

      if (this.currentPhase === 'night' || this.currentPhase === 'twilight') {
        this.radarBeaconGraphic.fillStyle(WORLD_PALETTE.checkingPencil0, 0.35);
        this.radarBeaconGraphic.fillCircle(128, 40, 4);
        this.radarBeaconGraphic.fillCircle(407, 45, 4);
      }
    }
  }

  destroy(): void {
    this.radarBeaconGraphic.destroy();
    this.containers.forEach((c) => c.destroy());
    this.containers.clear();
    this.outlines.clear();
  }
}
