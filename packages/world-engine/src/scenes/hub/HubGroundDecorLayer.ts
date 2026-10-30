import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import type { DayPhase, PhaseColors } from './HubTimeOfDay';

export class HubGroundDecorLayer {
  private scene: Phaser.Scene;
  private lanternGlowGraphics: Phaser.GameObjects.Graphics;
  private anemometerGraphics: Phaser.GameObjects.Graphics;

  private anemometerAngle = 0;
  private lanternPositions = [
    { x: 195, y: 198 },
    { x: 350, y: 220 },
    { x: 375, y: 200 },
    { x: 435, y: 220 },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Вращающийся анемометр М-63М на метеоплощадке (L6)
    this.anemometerGraphics = this.scene.add.graphics();

    // Тёплый свет фонарей в тёмное время суток
    this.lanternGlowGraphics = this.scene.add.graphics();
  }

  applyDayPhase(phase: DayPhase, colors: PhaseColors): void {
    // 1. Отрисовка света фонарей
    this.lanternGlowGraphics.clear();
    const isLanternActive = phase === 'night' || phase === 'twilight' || phase === 'dawn' || phase === 'white_nights';

    if (isLanternActive) {
      const alphaBase = colors.windowLightAlpha;
      for (const pos of this.lanternPositions) {
        // Внутреннее тёплое ядро фонаря
        this.lanternGlowGraphics.fillStyle(WORLD_PALETTE.windowLight2, alphaBase);
        this.lanternGlowGraphics.fillCircle(pos.x, pos.y, 3);
        // Внешний мягкий ореол
        this.lanternGlowGraphics.fillStyle(WORLD_PALETTE.windowLight0, alphaBase * 0.35);
        this.lanternGlowGraphics.fillCircle(pos.x, pos.y, 8);
      }
    }
  }

  /** Сезонный тинт (при необходимости). */
  applySeason(_foliageTint: number): void {
    // Тинт мастер-арта управляется общим слоем окружения
  }

  update(deltaMs: number, _phase: DayPhase): void {
    const deltaSec = deltaMs / 1000;

    // 1. Вращение чашечного анемометра М-63М на мачте метеоплощадки (координаты: x=154, y=172)
    this.anemometerAngle += 360 * deltaSec * 1.5;
    this.anemometerGraphics.clear();
    const mastX = 154;
    const mastY = 172;
    const rad = Phaser.Math.DegToRad(this.anemometerAngle);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    this.anemometerGraphics.lineStyle(1, WORLD_PALETTE.birchAndSnow3, 0.9);
    this.anemometerGraphics.lineBetween(mastX - cos * 4, mastY - sin * 2, mastX + cos * 4, mastY + sin * 2);
    this.anemometerGraphics.fillStyle(WORLD_PALETTE.actionAccent1, 0.95);
    this.anemometerGraphics.fillCircle(mastX + cos * 4, mastY + sin * 2, 1);
    this.anemometerGraphics.fillCircle(mastX - cos * 4, mastY - sin * 2, 1);
  }

  destroy(): void {
    this.lanternGlowGraphics.destroy();
    this.anemometerGraphics.destroy();
  }
}
