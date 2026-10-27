import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import type { DayPhase, PhaseColors } from './HubTimeOfDay';

export class HubGroundDecorLayer {
  private scene: Phaser.Scene;
  private groundSprite?: Phaser.GameObjects.Image;
  private decorSprite?: Phaser.GameObjects.Image;
  private vegetationSprite?: Phaser.GameObjects.Image;
  private lanternGlowGraphics: Phaser.GameObjects.Graphics;
  private anemometerGraphics: Phaser.GameObjects.Graphics;

  private anemometerAngle = 0;
  private vegetationTimer = 0;
  private lanternPositions = [
    { x: 50, y: 168 },
    { x: 154, y: 168 },
    { x: 270, y: 168 },
    { x: 368, y: 168 },
    { x: 440, y: 168 },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // L6: Земля, гранитные дорожки и метеоплощадка
    if (this.scene.textures.exists('hub_l3_ground')) {
      this.groundSprite = this.scene.add.image(0, 0, 'hub_l3_ground').setOrigin(0, 0);
    }

    // Вращающийся анемометр М-63М на метеоплощадке (L6)
    this.anemometerGraphics = this.scene.add.graphics();

    // L7: Уличные фонари, скамейки и мачты
    if (this.scene.textures.exists('hub_l7_decor')) {
      this.decorSprite = this.scene.add.image(0, 0, 'hub_l7_decor').setOrigin(0, 0);
    }

    // Тёплый свет фонарей в тёмное время суток
    this.lanternGlowGraphics = this.scene.add.graphics();

    // L9: Ветви переднего плана (сосна и берёза по углам)
    if (this.scene.textures.exists('hub_l9_veg')) {
      this.vegetationSprite = this.scene.add.image(0, 0, 'hub_l9_veg').setOrigin(0, 0);
    }
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

    // 2. Тинтование земли и декора по фазе суток
    if (this.groundSprite) {
      if (phase === 'night') {
        this.groundSprite.setTint(WORLD_PALETTE.skyNight2);
      } else if (phase === 'twilight') {
        this.groundSprite.setTint(WORLD_PALETTE.twilight1);
      } else if (phase === 'golden_hour') {
        this.groundSprite.setTint(WORLD_PALETTE.twilight4);
      } else {
        this.groundSprite.clearTint();
      }
    }

    if (this.decorSprite) {
      if (phase === 'night') {
        this.decorSprite.setTint(WORLD_PALETTE.skyNight2);
      } else if (phase === 'twilight') {
        this.decorSprite.setTint(WORLD_PALETTE.twilight1);
      } else {
        this.decorSprite.clearTint();
      }
    }
  }

  /** Сезонный тинт растительности переднего плана L9. */
  applySeason(foliageTint: number): void {
    if (!this.vegetationSprite) return;
    if (foliageTint === 0xffffff) this.vegetationSprite.clearTint();
    else this.vegetationSprite.setTint(foliageTint);
  }

  update(deltaMs: number, _phase: DayPhase): void {
    const deltaSec = deltaMs / 1000;

    // 1. Вращение чашечного анемометра М-63М (координаты метеомачты: x=242, y=98)
    this.anemometerAngle += 360 * deltaSec * 1.5;
    this.anemometerGraphics.clear();
    const mastX = 242;
    const mastY = 98;
    const rad = Phaser.Math.DegToRad(this.anemometerAngle);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    this.anemometerGraphics.lineStyle(1, WORLD_PALETTE.birchAndSnow3, 0.9);
    this.anemometerGraphics.lineBetween(mastX - cos * 4, mastY - sin * 2, mastX + cos * 4, mastY + sin * 2);
    this.anemometerGraphics.fillStyle(WORLD_PALETTE.actionAccent1, 0.95);
    this.anemometerGraphics.fillCircle(mastX + cos * 4, mastY + sin * 2, 1);
    this.anemometerGraphics.fillCircle(mastX - cos * 4, mastY - sin * 2, 1);

    // 2. Лёгкое синусоидальное покачивание ветвей переднего плана L9 (цикл 2 кадра / 2 Гц)
    this.vegetationTimer += deltaMs;
    if (this.vegetationSprite) {
      const swayY = Math.sin(this.vegetationTimer / 1200) * 1.5;
      const swayX = Math.cos(this.vegetationTimer / 1600) * 0.8;
      this.vegetationSprite.setPosition(swayX, swayY);
    }
  }

  destroy(): void {
    this.groundSprite?.destroy();
    this.decorSprite?.destroy();
    this.vegetationSprite?.destroy();
    this.lanternGlowGraphics.destroy();
    this.anemometerGraphics.destroy();
  }
}
