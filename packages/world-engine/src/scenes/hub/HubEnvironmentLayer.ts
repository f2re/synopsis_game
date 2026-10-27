import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import { WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT } from '../../runtime/fitLogicalViewport';
import type { DayPhase, PhaseColors } from './HubTimeOfDay';

export class HubEnvironmentLayer {
  private scene: Phaser.Scene;
  private skyGraphics: Phaser.GameObjects.Graphics;
  private starsContainer: Phaser.GameObjects.Container;
  private backgroundSprite?: Phaser.GameObjects.Image;
  private cloudsContainer: Phaser.GameObjects.Container;
  private waterGlimmerGraphics: Phaser.GameObjects.Graphics;
  private mistGraphics: Phaser.GameObjects.Graphics;
  private celestialGraphic: Phaser.GameObjects.Graphics;

  private clouds: Phaser.GameObjects.Image[] = [];
  private cloudSpeed = 2.0; // Логических пикселей в секунду
  private lighthouseTimer = 0;
  private lighthouseFlashGraphic: Phaser.GameObjects.Graphics;
  private waterTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // L0: Небо и светила
    this.skyGraphics = this.scene.add.graphics();
    this.starsContainer = this.scene.add.container(0, 0);
    this.celestialGraphic = this.scene.add.graphics();

    // L1: Дальние облака
    this.cloudsContainer = this.scene.add.container(0, 0);

    // L2: Горизонт Финского залива (растр)
    if (this.scene.textures.exists('hub_l0_bg')) {
      this.backgroundSprite = this.scene.add.image(0, 0, 'hub_l0_bg').setOrigin(0, 0);
    }

    // Маяк на дальнем молу (оградительный огонь, L2)
    this.lighthouseFlashGraphic = this.scene.add.graphics();

    // L3: Блики на воде Финского залива
    this.waterGlimmerGraphics = this.scene.add.graphics();

    // L4: Приземный туман/дымка
    this.mistGraphics = this.scene.add.graphics();

    this.createStars();
    this.createClouds();
  }

  private createStars(): void {
    // 35 процедурных звёзд в верхней трети неба (1x1 пиксели)
    const starCount = 35;
    for (let i = 0; i < starCount; i++) {
      const sx = (i * 37 + 13) % WORLD_LOGICAL_WIDTH;
      const sy = (i * 19 + 7) % 85;
      const star = this.scene.add.rectangle(sx, sy, 1, 1, WORLD_PALETTE.birchAndSnow3);
      this.starsContainer.add(star);
    }
  }

  private createClouds(): void {
    if (!this.scene.textures.exists('hub_l1_clouds')) {
      return;
    }

    // Создаём 3 дрейфующих облачных массива с разной глубиной и скоростью
    const cloudYPositions = [18, 38, 58];
    const cloudXPositions = [30, 210, 390];

    for (let i = 0; i < 3; i++) {
      const cloud = this.scene.add.image(cloudXPositions[i], cloudYPositions[i], 'hub_l1_clouds');
      cloud.setOrigin(0, 0);
      cloud.setAlpha(0.85);
      this.clouds.push(cloud);
      this.cloudsContainer.add(cloud);
    }
  }

  applyDayPhase(phase: DayPhase, colors: PhaseColors): void {
    // 1. Отрисовка небесной рампы L0
    this.skyGraphics.clear();
    this.skyGraphics.fillGradientStyle(
      colors.skyTop,
      colors.skyTop,
      colors.skyHorizon,
      colors.skyHorizon,
      1,
    );
    this.skyGraphics.fillRect(0, 0, WORLD_LOGICAL_WIDTH, 132);

    // 2. Звёзды видны ночью и в сумерках
    this.starsContainer.setVisible(colors.starsVisible);

    // 3. Светило (Солнце днём, Луна ночью)
    this.celestialGraphic.clear();
    if (phase === 'day' || phase === 'golden_hour' || phase === 'dawn') {
      // Солнце над заливом
      this.celestialGraphic.fillStyle(WORLD_PALETTE.windowLight3, 0.9);
      this.celestialGraphic.fillCircle(380, 42, 7);
      this.celestialGraphic.fillStyle(WORLD_PALETTE.windowLight2, 0.35);
      this.celestialGraphic.fillCircle(380, 42, 11);
    } else if (phase === 'night' || phase === 'twilight') {
      // Серп Луны
      this.celestialGraphic.fillStyle(WORLD_PALETTE.birchAndSnow3, 0.95);
      this.celestialGraphic.fillCircle(410, 36, 6);
      this.celestialGraphic.fillStyle(colors.skyTop, 1);
      this.celestialGraphic.fillCircle(408, 35, 5);
    }

    // 4. Тинт дальнего горизонта
    if (this.backgroundSprite) {
      if (phase === 'night') {
        this.backgroundSprite.setTint(WORLD_PALETTE.skyNight2);
      } else if (phase === 'twilight') {
        this.backgroundSprite.setTint(WORLD_PALETTE.twilight1);
      } else if (phase === 'golden_hour') {
        this.backgroundSprite.setTint(WORLD_PALETTE.twilight4);
      } else {
        this.backgroundSprite.clearTint();
      }
    }
  }

  update(deltaMs: number, phase: DayPhase): void {
    const deltaSec = deltaMs / 1000;

    // 1. Дрейф облаков L1 (циклическое оборачивание)
    for (const cloud of this.clouds) {
      cloud.x += this.cloudSpeed * deltaSec;
      if (cloud.x > WORLD_LOGICAL_WIDTH + 50) {
        cloud.x = -260;
      }
    }

    // 2. Мерцание звёзд
    if (phase === 'night' || phase === 'twilight') {
      this.starsContainer.setAlpha(0.75 + 0.25 * Math.sin(Date.now() / 600));
    }

    // 3. Мигание маяка на горизонте L2 (вспышка раз в 1.5 секунды)
    this.lighthouseTimer += deltaMs;
    this.lighthouseFlashGraphic.clear();
    if (phase === 'night' || phase === 'twilight' || phase === 'white_nights') {
      const cycle = this.lighthouseTimer % 1500;
      if (cycle < 180) {
        // Координаты маяка на молу залива (L2)
        this.lighthouseFlashGraphic.fillStyle(WORLD_PALETTE.windowLight3, 1);
        this.lighthouseFlashGraphic.fillRect(452, 94, 2, 2);
        this.lighthouseFlashGraphic.fillStyle(WORLD_PALETTE.windowLight1, 0.4);
        this.lighthouseFlashGraphic.fillCircle(453, 95, 4);
      }
    }

    // 4. Анимация бликов залива L3
    this.waterTimer += deltaMs;
    this.waterGlimmerGraphics.clear();
    const isGlimmerActive = phase !== 'night';
    if (isGlimmerActive) {
      const frame = Math.floor(this.waterTimer / 350) % 4;
      this.waterGlimmerGraphics.fillStyle(WORLD_PALETTE.waterGulf4, 0.6);
      for (let g = 0; g < 6; g++) {
        const gx = ((g * 73 + frame * 19) % 360) + 40;
        const gy = 118 + ((g * 13 + frame * 7) % 18);
        this.waterGlimmerGraphics.fillRect(gx, gy, 3, 1);
      }
    }

    // 5. Дымка/приземный туман на рассвете L4
    this.mistGraphics.clear();
    if (phase === 'dawn' || phase === 'white_nights') {
      this.mistGraphics.fillStyle(WORLD_PALETTE.skyDay2, 0.18);
      const mistOffset = Math.sin(this.waterTimer / 2000) * 12;
      this.mistGraphics.fillRect(0, 112, WORLD_LOGICAL_WIDTH, 14 + mistOffset);
    }
  }

  destroy(): void {
    this.skyGraphics.destroy();
    this.starsContainer.destroy();
    this.celestialGraphic.destroy();
    this.cloudsContainer.destroy();
    this.backgroundSprite?.destroy();
    this.lighthouseFlashGraphic.destroy();
    this.waterGlimmerGraphics.destroy();
    this.mistGraphics.destroy();
  }
}
