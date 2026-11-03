import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import { HUB_BUILDINGS } from './HubBuildingLayer';
import { HUB_STAGES, type StageStatus, type StageStatusMap } from './hubStages';

const COLORS: Record<StageStatus, number> = {
  completed: WORLD_PALETTE.actionAccent1,
  current: WORLD_PALETTE.actionAccent2,
  available: WORLD_PALETTE.birchAndSnow2,
  locked: WORLD_PALETTE.birchAndSnow1,
};

export interface HubStageBuildingGeometry {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  entrance: { x: number; y: number };
}

/**
 * Маршрут прохождения поверх любого renderer-а Hub.
 *
 * Геометрия зданий приходит через constructor: legacy Phaser использует
 * `HUB_BUILDINGS`, а 2.5D renderer передаёт принятую 640×360 Geometry Lock.
 * В 2.5D overlay рисует только semantic pins: наземный маршрут должен
 * принадлежать world-renderer-у, иначе экранный пунктир проходит сквозь 3D
 * фасады. Благодаря этому progression остаётся отдельным gameplay/UI-слоем и
 * не перекрашивает материалы мира.
 */
export class HubStageLayer {
  private readonly scene: Phaser.Scene;
  private readonly buildings: readonly HubStageBuildingGeometry[];
  private readonly routeEnabled: boolean;
  private readonly routeGraphic: Phaser.GameObjects.Graphics;
  private readonly pinGraphic: Phaser.GameObjects.Graphics;
  private readonly labels = new Map<string, Phaser.GameObjects.Text>();
  private statuses: StageStatusMap = {};
  private timer = 0;

  constructor(
    scene: Phaser.Scene,
    buildings: readonly HubStageBuildingGeometry[] = HUB_BUILDINGS,
  ) {
    this.scene = scene;
    this.buildings = buildings;
    this.routeEnabled = buildings === HUB_BUILDINGS;
    this.routeGraphic = scene.add.graphics();
    this.pinGraphic = scene.add.graphics();

    for (const stage of HUB_STAGES) {
      const label = scene.add
        .text(0, 0, String(stage.order), {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#1a1a1a',
        })
        .setOrigin(0.5, 0.5)
        .setResolution(4);
      this.labels.set(stage.id, label);
    }
  }

  private buildingOf(buildingId: string): HubStageBuildingGeometry | undefined {
    return this.buildings.find((building) => building.id === buildingId);
  }

  private entranceOf(buildingId: string): { x: number; y: number } | undefined {
    return this.buildingOf(buildingId)?.entrance;
  }

  private pinPosition(buildingId: string): { x: number; y: number } | undefined {
    const building = this.buildingOf(buildingId);
    return building
      ? {
          x: building.bounds.x + Math.floor(building.bounds.width / 2),
          y: building.bounds.y - 8,
        }
      : undefined;
  }

  setStatuses(statuses: StageStatusMap): void {
    this.statuses = statuses;
    this.renderRoute();
    this.renderPins(0);
  }

  private renderRoute(): void {
    this.routeGraphic.clear();
    if (!this.routeEnabled) return;

    const ordered = [...HUB_STAGES].sort((a, b) => a.order - b.order);
    for (let index = 1; index < ordered.length; index += 1) {
      const from = this.entranceOf(ordered[index - 1].buildingId);
      const to = this.entranceOf(ordered[index].buildingId);
      if (!from || !to) continue;

      const done =
        this.statuses[ordered[index].id] === 'completed' ||
        this.statuses[ordered[index - 1].id] === 'completed';
      const color = done ? WORLD_PALETTE.actionAccent1 : WORLD_PALETTE.birchAndSnow1;
      this.routeGraphic.fillStyle(color, done ? 0.9 : 0.5);
      const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      const steps = Math.max(1, Math.floor(distance / 6));
      for (let step = 0; step < steps; step += 1) {
        if (!done && step % 2 === 1) continue;
        const t = step / steps;
        this.routeGraphic.fillRect(
          Math.round(from.x + (to.x - from.x) * t),
          Math.round(from.y + (to.y - from.y) * t),
          2,
          2,
        );
      }
    }
  }

  private renderPins(pulse: number): void {
    this.pinGraphic.clear();
    for (const stage of HUB_STAGES) {
      const pos = this.pinPosition(stage.buildingId);
      const label = this.labels.get(stage.id);
      if (!pos || !label) continue;
      const status = this.statuses[stage.id] ?? 'locked';
      const lift = status === 'current' ? Math.round(pulse) : 0;
      const y = pos.y - lift;

      this.pinGraphic.fillStyle(0x1a1a1a, 0.85);
      this.pinGraphic.fillCircle(pos.x, y, 6);
      this.pinGraphic.fillStyle(COLORS[status], status === 'locked' ? 0.7 : 1);
      this.pinGraphic.fillCircle(pos.x, y, 5);

      if (status === 'completed') {
        label.setVisible(false);
        this.pinGraphic.lineStyle(1, 0x1a1a1a, 1);
        this.pinGraphic.beginPath();
        this.pinGraphic.moveTo(pos.x - 2, y);
        this.pinGraphic.lineTo(pos.x - 1, y + 2);
        this.pinGraphic.lineTo(pos.x + 3, y - 2);
        this.pinGraphic.strokePath();
      } else {
        label.setVisible(true).setPosition(pos.x, y).setAlpha(status === 'locked' ? 0.55 : 1);
      }
    }
  }

  update(deltaMs: number): void {
    this.timer += deltaMs;
    this.renderPins(Math.max(0, Math.sin(this.timer / 300)) * 2);
  }

  destroy(): void {
    this.routeGraphic.destroy();
    this.pinGraphic.destroy();
    this.labels.forEach((label) => label.destroy());
    this.labels.clear();
  }
}
