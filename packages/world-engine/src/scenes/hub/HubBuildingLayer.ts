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
    name: 'Кодовый пост (КН-01)',
    bounds: { x: 172, y: 70, width: 138, height: 110 },
    entrance: { x: 241, y: 180 },
    defaultState: 'active',
    facade: 'raster',
    windows: [
      { x: 201, y: 126, w: 14, h: 22 },
      { x: 261, y: 126, w: 14, h: 22 },
      { x: 180, y: 144, w: 8, h: 14 },
      { x: 292, y: 144, w: 8, h: 14 },
    ],
  },
  {
    id: 'archive',
    name: 'Архив гидрометеорологических наблюдений',
    bounds: { x: 60, y: 88, width: 80, height: 52 },
    entrance: { x: 98, y: 140 },
    defaultState: 'available',
    facade: 'raster',
    windows: [],
  },
  {
    id: 'radar',
    name: 'Радиолокационная вышка ДМРЛ',
    bounds: { x: 345, y: 66, width: 95, height: 129 },
    entrance: { x: 391, y: 195 },
    defaultState: 'locked',
    facade: 'raster',
    windows: [
      { x: 359, y: 156, w: 14, h: 14 },
      { x: 407, y: 156, w: 14, h: 14 },
    ],
  },
  {
    id: 'cartography',
    name: 'Картографический класс',
    bounds: { x: 12, y: 142, width: 58, height: 44 },
    entrance: { x: 41, y: 186 },
    defaultState: 'locked',
    facade: { variant: 'school', wall: 0xd9cdb0, roof: 0x7a4c40, trim: 0x4a4740 },
    windows: [
      { x: 17, y: 162, w: 7, h: 8 },
      { x: 58, y: 162, w: 7, h: 8 },
    ],
  },
  {
    id: 'lab',
    name: 'Аэрологическая лаборатория',
    bounds: { x: 46, y: 196, width: 72, height: 54 },
    entrance: { x: 82, y: 250 },
    defaultState: 'locked',
    facade: { variant: 'dome', wall: 0xe9e4d6, roof: 0x8db7de, trim: 0x4a4740 },
    windows: [
      { x: 52, y: 220, w: 8, h: 10 },
      { x: 104, y: 220, w: 8, h: 10 },
    ],
  },
  {
    id: 'hall',
    name: 'Зал синоптических дуэлей',
    bounds: { x: 340, y: 208, width: 82, height: 52 },
    entrance: { x: 381, y: 260 },
    defaultState: 'locked',
    facade: { variant: 'hall', wall: 0xe9e4d6, roof: 0x5a4a6e, trim: 0xb88626 },
    windows: [
      { x: 352, y: 232, w: 8, h: 10 },
      { x: 402, y: 232, w: 8, h: 10 },
    ],
  },
  {
    id: 'meteo-site',
    name: 'Метеоплощадка · будка Стивенсона',
    bounds: { x: 132, y: 204, width: 40, height: 52 },
    entrance: { x: 152, y: 256 },
    defaultState: 'available',
    facade: { variant: 'stevenson', wall: 0xf4f7fa, roof: 0x6b5a48, trim: 0xc9462c },
    service: true,
  },
  {
    id: 'canteen',
    name: 'Дежурная столовая',
    bounds: { x: 430, y: 206, width: 46, height: 48 },
    entrance: { x: 453, y: 254 },
    defaultState: 'available',
    facade: { variant: 'canteen', wall: 0xe0c9a0, roof: 0x8a4a3a, trim: 0x4a4740 },
    service: true,
    windows: [
      { x: 434, y: 224, w: 7, h: 7 },
      { x: 465, y: 224, w: 7, h: 7 },
    ],
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
  private archSprite?: Phaser.GameObjects.Image;
  private buildingStates: Map<string, BuildingStateId> = new Map();
  private containers: Map<string, Phaser.GameObjects.Container> = new Map();
  private outlines: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private facadeGraphic: Phaser.GameObjects.Graphics;
  private roofSnow = false;
  private windowLightsGraphic: Phaser.GameObjects.Graphics;
  private radarBeaconGraphic: Phaser.GameObjects.Graphics;
  private pulseTimer = 0;
  private currentPhase: DayPhase = 'day';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    HUB_BUILDINGS.forEach((b) => this.buildingStates.set(b.id, b.defaultState));

    // L5: Растровые фасады зданий кампуса 26063
    if (this.scene.textures.exists('hub_l5_arch')) {
      this.archSprite = this.scene.add.image(0, 0, 'hub_l5_arch').setOrigin(0, 0);
    }

    // Процедурные фасады зданий без растра (под светом окон)
    this.facadeGraphic = this.scene.add.graphics();
    this.redrawFacades();

    // Тёплый свет в окнах при наступлении темноты
    this.windowLightsGraphic = this.scene.add.graphics();

    // Сигнальный маяк купола радара ДМРЛ
    this.radarBeaconGraphic = this.scene.add.graphics();

    this.create();
  }

  create(): void {
    HUB_BUILDINGS.forEach((building) => {
      const container = this.scene.add.container(building.bounds.x, building.bounds.y);

      // Интерактивная зона клика. Закрытые здания тоже принимают клик:
      // досье должно объяснить условие открытия вместо немого запрета.
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
        .setInteractive({ useHandCursor: true });

      hitArea.on('pointerdown', () => {
        worldBridge.notifyBuildingClicked(building.id);
      });

      // 1-пиксельный контур и маркер состояния
      const outline = this.scene.add.graphics();
      container.add([hitArea, outline]);

      this.containers.set(building.id, container);
      this.outlines.set(building.id, outline);
      this.renderBuildingState(building.id);
    });
  }

  /** Сезонные детали фасадов: снег на крышах процедурных зданий. */
  applySeason(_season: Season, roofSnow: boolean): void {
    this.roofSnow = roofSnow;
    this.redrawFacades();
  }

  private redrawFacades(): void {
    this.facadeGraphic.clear();
    HUB_BUILDINGS.forEach((b) => {
      if (b.facade !== 'raster') {
        drawProceduralFacade(this.facadeGraphic, b.bounds, b.facade, this.roofSnow);
        const dim = FACADE_DIM[this.currentPhase];
        if (dim > 0) {
          this.facadeGraphic.fillStyle(WORLD_PALETTE.skyNight0, dim);
          this.facadeGraphic.fillRect(b.bounds.x - 3, b.bounds.y - 4, b.bounds.width + 6, b.bounds.height + 4);
        }
      }
    });
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

  applyDayPhase(phase: DayPhase, colors: PhaseColors): void {
    this.currentPhase = phase;
    this.redrawFacades();

    // Тинтование фасадов зданий
    if (this.archSprite) {
      if (phase === 'night') {
        this.archSprite.setTint(WORLD_PALETTE.skyNight2);
      } else if (phase === 'twilight') {
        this.archSprite.setTint(WORLD_PALETTE.twilight1);
      } else if (phase === 'golden_hour') {
        this.archSprite.setTint(WORLD_PALETTE.twilight4);
      } else {
        this.archSprite.clearTint();
      }
    }

    // Отрисовка света в окнах активных и доступных зданий
    this.windowLightsGraphic.clear();
    const isDark = phase === 'night' || phase === 'twilight' || phase === 'dawn' || phase === 'white_nights';

    if (isDark) {
      const alpha = colors.windowLightAlpha;
      this.windowLightsGraphic.fillStyle(WORLD_PALETTE.windowLight2, alpha);

      HUB_BUILDINGS.forEach((b) => {
        const state = this.buildingStates.get(b.id);
        if (state === 'active' || state === 'available') {
          b.windows?.forEach((win) => {
            this.windowLightsGraphic.fillRect(win.x, win.y, win.w, win.h);
          });
        }
      });
    }
  }

  private renderBuildingState(id: string): void {
    const state = this.buildingStates.get(id);
    const outline = this.outlines.get(id);
    const building = HUB_BUILDINGS.find((b) => b.id === id);
    if (!outline || !building) return;

    outline.clear();

    if (state === 'active') {
      // 1-пиксельный контур активного здания
      outline.lineStyle(1, WORLD_PALETTE.actionAccent1, 0.9);
      outline.strokeRect(0, 0, building.bounds.width, building.bounds.height);
      // Указатель-шеврона над входом
      const cx = Math.floor(building.bounds.width / 2);
      outline.fillStyle(WORLD_PALETTE.actionAccent1, 1);
      outline.fillTriangle(cx - 5, -9, cx + 5, -9, cx, -3);
    } else if (state === 'locked') {
      // Латунный замок 6x8 px в центре здания
      const cx = Math.floor(building.bounds.width / 2);
      const cy = Math.floor(building.bounds.height / 2);
      outline.fillStyle(WORLD_PALETTE.actionAccent0, 0.85);
      outline.fillRect(cx - 3, cy - 2, 6, 6);
      outline.lineStyle(1, WORLD_PALETTE.actionAccent0, 0.9);
      outline.strokeRect(cx - 2, cy - 5, 4, 3);
    }
  }

  update(deltaMs: number): void {
    this.pulseTimer += deltaMs;

    // Пульсация контура и шеврона активного здания
    const alpha = 0.65 + 0.35 * Math.sin(this.pulseTimer / 220);
    this.buildingStates.forEach((state, id) => {
      if (state === 'active') {
        const outline = this.outlines.get(id);
        outline?.setAlpha(alpha);
      }
    });

    // Мигание маяка радара ДМРЛ (x=407, y=66)
    this.radarBeaconGraphic.clear();
    const radarCycle = this.pulseTimer % 1200;
    if (radarCycle < 250) {
      this.radarBeaconGraphic.fillStyle(WORLD_PALETTE.checkingPencil0, 0.9);
      this.radarBeaconGraphic.fillRect(409, 79, 2, 2);
      if (this.currentPhase === 'night' || this.currentPhase === 'twilight') {
        this.radarBeaconGraphic.fillStyle(WORLD_PALETTE.checkingPencil0, 0.3);
        this.radarBeaconGraphic.fillCircle(410, 80, 4);
      }
    }
  }

  destroy(): void {
    this.archSprite?.destroy();
    this.facadeGraphic.destroy();
    this.windowLightsGraphic.destroy();
    this.radarBeaconGraphic.destroy();
    this.containers.forEach((c) => c.destroy());
    this.containers.clear();
    this.outlines.clear();
  }
}
