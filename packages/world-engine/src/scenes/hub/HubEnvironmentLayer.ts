import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import { WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT } from '../../runtime/fitLogicalViewport';
import type { DayPhase, PhaseColors } from './HubTimeOfDay';

export class HubEnvironmentLayer {
  private scene: Phaser.Scene;
  private backgroundSprite?: Phaser.GameObjects.Image;
  private starsContainer: Phaser.GameObjects.Container;
  private cloudsContainer: Phaser.GameObjects.Container;
  private clouds: Phaser.GameObjects.Image[] = [];
  private cloudSpeed = 1.8; // Логических пикселей в секунду
  private lighthouseTimer = 0;
  private lighthouseFlashGraphic: Phaser.GameObjects.Graphics;
  private waterTimer = 0;
  private waterGlimmerGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // L0: Базовый растровый мастер-кадр кампуса 26063
    const initialKey = this.scene.textures.exists('hub_master_night')
      ? 'hub_master_night'
      : (this.scene.textures.exists('hub_master_day') ? 'hub_master_day' : 'hub_l0_bg');
    if (this.scene.textures.exists(initialKey)) {
      this.backgroundSprite = this.scene.add.image(0, 0, initialKey).setOrigin(0, 0);
    }

    // Звёзды (ночь и сумерки)
    this.starsContainer = this.scene.add.container(0, 0);

    // L1: Дрейфующие облака
    this.cloudsContainer = this.scene.add.container(0, 0);

    // Маяк на дальнем молу
    this.lighthouseFlashGraphic = this.scene.add.graphics();

    // Блики на воде Финского залива
    this.waterGlimmerGraphics = this.scene.add.graphics();

    this.createStars();
    this.createClouds();
  }

  private createStars(): void {
    // 35 звёзд на ночном небе Финского залива (1x1 пиксели)
    const starCount = 35;
    for (let i = 0; i < starCount; i++) {
      const sx = (i * 37 + 13) % WORLD_LOGICAL_WIDTH;
      const sy = (i * 19 + 7) % 75;
      const star = this.scene.add.rectangle(sx, sy, 1, 1, WORLD_PALETTE.birchAndSnow3);
      this.starsContainer.add(star);
    }
  }

  private createClouds(): void {
    if (!this.scene.textures.exists('hub_l1_clouds')) {
      return;
    }

    // 3 дрейфующих массива облаков на разной высоте
    const cloudYPositions = [14, 28, 42];
    const cloudXPositions = [40, 220, 380];

    for (let i = 0; i < 3; i++) {
      const cloud = this.scene.add.image(cloudXPositions[i], cloudYPositions[i], 'hub_l1_clouds');
      cloud.setOrigin(0, 0);
      cloud.setAlpha(0.4);
      this.clouds.push(cloud);
      this.cloudsContainer.add(cloud);
    }
  }

  applyDayPhase(phase: DayPhase, colors: PhaseColors): void {
    // 1. Переключение текстуры мастер-арта по фазе суток
    if (this.backgroundSprite) {
      const isNightLike = phase === 'night' || phase === 'twilight' || phase === 'white_nights';
      const targetTex = isNightLike ? 'hub_master_night' : 'hub_master_day';
      if (this.scene.textures.exists(targetTex)) {
        this.backgroundSprite.setTexture(targetTex);
      }

      // Тонкий атмосферный тинт по фазе суток
      if (phase === 'night') {
        this.backgroundSprite.clearTint();
      } else if (phase === 'twilight') {
        this.backgroundSprite.setTint(WORLD_PALETTE.twilight1);
      } else if (phase === 'white_nights') {
        this.backgroundSprite.setTint(WORLD_PALETTE.twilight1);
      } else if (phase === 'golden_hour') {
        this.backgroundSprite.setTint(WORLD_PALETTE.twilight4);
      } else if (phase === 'dawn') {
        this.backgroundSprite.setTint(WORLD_PALETTE.twilight1);
      } else {
        this.backgroundSprite.clearTint();
      }
    }

    // 2. Звёзды видны ночью и в сумерках
    this.starsContainer.setVisible(colors.starsVisible);
  }

  update(deltaMs: number, phase: DayPhase): void {
    const deltaSec = deltaMs / 1000;

    // 1. Дрейф облаков L1
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

    // 3. Мигание маяка на горизонте залива (вспышка раз в 1.5 секунды)
    this.lighthouseTimer += deltaMs;
    this.lighthouseFlashGraphic.clear();
    if (phase === 'night' || phase === 'twilight' || phase === 'white_nights') {
      const cycle = this.lighthouseTimer % 1500;
      if (cycle < 180) {
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
      this.waterGlimmerGraphics.fillStyle(WORLD_PALETTE.waterGulf4, 0.45);
      for (let g = 0; g < 6; g++) {
        const gx = ((g * 73 + frame * 19) % 360) + 40;
        const gy = 118 + ((g * 13 + frame * 7) % 18);
        this.waterGlimmerGraphics.fillRect(gx, gy, 3, 1);
      }
    }
  }

  destroy(): void {
    this.starsContainer.destroy();
    this.cloudsContainer.destroy();
    this.backgroundSprite?.destroy();
    this.lighthouseFlashGraphic.destroy();
    this.waterGlimmerGraphics.destroy();
  }
}
