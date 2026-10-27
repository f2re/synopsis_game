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

/** Маршрут прохождения: пунктир между входами зданий и нумерованные маркеры этапов. */
export class HubStageLayer {
  private readonly scene: Phaser.Scene;
  private readonly routeGraphic: Phaser.GameObjects.Graphics;
  private readonly pinGraphic: Phaser.GameObjects.Graphics;
  private readonly labels = new Map<string, Phaser.GameObjects.Text>();
  private statuses: StageStatusMap = {};
  private timer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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

  private entranceOf(buildingId: string): { x: number; y: number } | undefined {
    return HUB_BUILDINGS.find((b) => b.id === buildingId)?.entrance;
  }

  private pinPosition(buildingId: string): { x: number; y: number } | undefined {
    const b = HUB_BUILDINGS.find((x) => x.id === buildingId);
    return b ? { x: b.bounds.x + Math.floor(b.bounds.width / 2), y: b.bounds.y - 8 } : undefined;
  }

  setStatuses(statuses: StageStatusMap): void {
    this.statuses = statuses;
    this.renderRoute();
    this.renderPins(0);
  }

  private renderRoute(): void {
    this.routeGraphic.clear();
    const ordered = [...HUB_STAGES].sort((a, b) => a.order - b.order);
    for (let i = 1; i < ordered.length; i++) {
      const from = this.entranceOf(ordered[i - 1].buildingId);
      const to = this.entranceOf(ordered[i].buildingId);
      if (!from || !to) continue;
      const done = this.statuses[ordered[i].id] === 'completed' || this.statuses[ordered[i - 1].id] === 'completed';
      const color = done ? WORLD_PALETTE.actionAccent1 : WORLD_PALETTE.birchAndSnow1;
      this.routeGraphic.fillStyle(color, done ? 0.9 : 0.5);
      const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      const steps = Math.floor(dist / 6);
      for (let s = 0; s < steps; s += 1) {
        if (!done && s % 2 === 1) continue;
        const t = s / steps;
        this.routeGraphic.fillRect(Math.round(from.x + (to.x - from.x) * t), Math.round(from.y + (to.y - from.y) * t), 2, 2);
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
    this.labels.forEach((l) => l.destroy());
    this.labels.clear();
  }
}
