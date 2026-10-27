import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import { worldBridge, type BuildingStateId } from '../../bridge/WorldBridge';

export interface BuildingConfig {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  entrance: { x: number; y: number };
  defaultState: BuildingStateId;
}

export const HUB_BUILDINGS: BuildingConfig[] = [
  {
    id: 'codepost',
    name: 'Кодовый пост (КН-01)',
    bounds: { x: 180, y: 110, width: 84, height: 68 },
    entrance: { x: 218, y: 162 },
    defaultState: 'active',
  },
  {
    id: 'archive',
    name: 'Архив гидрометеорологических наблюдений',
    bounds: { x: 56, y: 120, width: 78, height: 62 },
    entrance: { x: 92, y: 166 },
    defaultState: 'available',
  },
  {
    id: 'lab',
    name: 'Аэрологическая лаборатория',
    bounds: { x: 284, y: 96, width: 72, height: 82 },
    entrance: { x: 316, y: 162 },
    defaultState: 'locked',
  },
  {
    id: 'radar',
    name: 'Радиолокационная вышка ДМРЛ',
    bounds: { x: 380, y: 64, width: 54, height: 114 },
    entrance: { x: 402, y: 162 },
    defaultState: 'locked',
  },
  {
    id: 'cartography',
    name: 'Картографический класс',
    bounds: { x: 12, y: 130, width: 42, height: 52 },
    entrance: { x: 30, y: 166 },
    defaultState: 'locked',
  },
  {
    id: 'hall',
    name: 'Зал синоптических дуэлей',
    bounds: { x: 436, y: 120, width: 44, height: 62 },
    entrance: { x: 454, y: 166 },
    defaultState: 'locked',
  },
];

export class HubBuildingLayer {
  private scene: Phaser.Scene;
  private buildingStates: Map<string, BuildingStateId> = new Map();
  private containers: Map<string, Phaser.GameObjects.Container> = new Map();
  private outlines: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private pulseTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    HUB_BUILDINGS.forEach((b) => this.buildingStates.set(b.id, b.defaultState));
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

      // 1-пиксельный контур активного здания
      const outline = this.scene.add.graphics();
      container.add([hitArea, outline]);

      this.containers.set(building.id, container);
      this.outlines.set(building.id, outline);
      this.renderBuildingState(building.id);
    });
  }

  setStates(states: Record<string, BuildingStateId>): void {
    Object.entries(states).forEach(([id, st]) => {
      this.buildingStates.set(id, st);
      this.renderBuildingState(id);
    });
  }

  private renderBuildingState(id: string): void {
    const state = this.buildingStates.get(id);
    const outline = this.outlines.get(id);
    const building = HUB_BUILDINGS.find((b) => b.id === id);
    if (!outline || !building) return;

    outline.clear();

    if (state === 'active') {
      // 1-пиксельный контур активного здания
      outline.lineStyle(1, WORLD_PALETTE.actionAccent1, 1);
      outline.strokeRect(0, 0, building.bounds.width, building.bounds.height);
      // Указатель-шеврона
      const cx = Math.floor(building.bounds.width / 2);
      outline.fillStyle(WORLD_PALETTE.actionAccent1, 1);
      outline.fillTriangle(cx - 4, -8, cx + 4, -8, cx, -2);
    } else if (state === 'locked') {
      // Латунный замок 6x8 px
      const cx = Math.floor(building.bounds.width / 2);
      const cy = Math.floor(building.bounds.height / 2);
      outline.fillStyle(WORLD_PALETTE.actionAccent0, 1);
      outline.fillRect(cx - 3, cy - 2, 6, 6);
      outline.lineStyle(1, WORLD_PALETTE.actionAccent0, 1);
      outline.strokeRect(cx - 2, cy - 5, 4, 3);
    }
  }

  update(deltaMs: number): void {
    this.pulseTimer += deltaMs;
    const alpha = 0.6 + 0.4 * Math.sin(this.pulseTimer / 200);

    this.buildingStates.forEach((state, id) => {
      if (state === 'active') {
        const outline = this.outlines.get(id);
        outline?.setAlpha(alpha);
      }
    });
  }

  destroy(): void {
    this.containers.forEach((c) => c.destroy());
    this.containers.clear();
    this.outlines.clear();
  }
}
