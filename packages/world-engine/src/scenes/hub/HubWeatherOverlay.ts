import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import { WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT } from '../../runtime/fitLogicalViewport';
import type { DayPhase } from './HubTimeOfDay';

export type WeatherMode = 'clear' | 'snow' | 'rain' | 'fog';

interface WeatherParticle {
  x: number;
  y: number;
  speedY: number;
  speedX: number;
  size: number;
}

export class HubWeatherOverlay {
  private scene: Phaser.Scene;
  private tintGraphic: Phaser.GameObjects.Graphics;
  private particleGraphic: Phaser.GameObjects.Graphics;
  private vignetteGraphic: Phaser.GameObjects.Graphics;

  private weatherMode: WeatherMode = 'clear';
  private particles: WeatherParticle[] = [];
  private readonly maxParticles = 40;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // L10: Атмосферный тинт суток
    this.tintGraphic = this.scene.add.graphics();

    // Частицы погоды (снег / дождь)
    this.particleGraphic = this.scene.add.graphics();

    // Виньетка по углам кадра (глубина)
    this.vignetteGraphic = this.scene.add.graphics();
    this.renderVignette();

    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * WORLD_LOGICAL_WIDTH,
        y: Math.random() * WORLD_LOGICAL_HEIGHT,
        speedY: 25 + Math.random() * 35,
        speedX: -8 - Math.random() * 12, // Снос балтийским ветром
        size: Math.random() > 0.7 ? 2 : 1,
      });
    }
  }

  setWeather(mode: WeatherMode): void {
    this.weatherMode = mode;
  }

  private renderVignette(): void {
    this.vignetteGraphic.clear();
    // 2-пиксельная ступенчатая угловая виньетка
    this.vignetteGraphic.fillStyle(WORLD_PALETTE.skyNight0, 0.45);
    // Верхняя и нижняя кромка
    this.vignetteGraphic.fillRect(0, 0, WORLD_LOGICAL_WIDTH, 1);
    this.vignetteGraphic.fillRect(0, WORLD_LOGICAL_HEIGHT - 1, WORLD_LOGICAL_WIDTH, 1);
    // Левая и правая кромка
    this.vignetteGraphic.fillRect(0, 0, 1, WORLD_LOGICAL_HEIGHT);
    this.vignetteGraphic.fillRect(WORLD_LOGICAL_WIDTH - 1, 0, 1, WORLD_LOGICAL_HEIGHT);

    // Углы (2x2)
    this.vignetteGraphic.fillStyle(WORLD_PALETTE.skyNight0, 0.65);
    this.vignetteGraphic.fillRect(0, 0, 3, 3);
    this.vignetteGraphic.fillRect(WORLD_LOGICAL_WIDTH - 3, 0, 3, 3);
    this.vignetteGraphic.fillRect(0, WORLD_LOGICAL_HEIGHT - 3, 3, 3);
    this.vignetteGraphic.fillRect(WORLD_LOGICAL_WIDTH - 3, WORLD_LOGICAL_HEIGHT - 3, 3, 3);
  }

  applyDayPhase(phase: DayPhase): void {
    this.tintGraphic.clear();

    if (phase === 'night') {
      this.tintGraphic.fillStyle(WORLD_PALETTE.skyNight0, 0.32);
      this.tintGraphic.fillRect(0, 0, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);
    } else if (phase === 'twilight') {
      this.tintGraphic.fillStyle(WORLD_PALETTE.twilight0, 0.22);
      this.tintGraphic.fillRect(0, 0, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);
    } else if (phase === 'golden_hour') {
      this.tintGraphic.fillStyle(WORLD_PALETTE.twilight4, 0.14);
      this.tintGraphic.fillRect(0, 0, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);
    } else if (phase === 'dawn') {
      this.tintGraphic.fillStyle(WORLD_PALETTE.twilight3, 0.12);
      this.tintGraphic.fillRect(0, 0, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);
    } else if (phase === 'white_nights') {
      this.tintGraphic.fillStyle(WORLD_PALETTE.skyNight4, 0.15);
      this.tintGraphic.fillRect(0, 0, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);
    }
  }

  update(deltaMs: number): void {
    this.particleGraphic.clear();
    if (this.weatherMode === 'clear') return;

    const deltaSec = deltaMs / 1000;

    if (this.weatherMode === 'snow') {
      this.particleGraphic.fillStyle(WORLD_PALETTE.birchAndSnow3, 0.85);
      for (const p of this.particles) {
        p.y += p.speedY * deltaSec * 0.6;
        p.x += p.speedX * deltaSec * 0.4;

        if (p.y > WORLD_LOGICAL_HEIGHT) {
          p.y = -5;
          p.x = Math.random() * (WORLD_LOGICAL_WIDTH + 60);
        }
        if (p.x < -10) {
          p.x = WORLD_LOGICAL_WIDTH + 5;
        }

        this.particleGraphic.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      }
    } else if (this.weatherMode === 'rain') {
      this.particleGraphic.fillStyle(WORLD_PALETTE.waterGulf4, 0.7);
      for (const p of this.particles) {
        p.y += p.speedY * deltaSec * 2.2;
        p.x += p.speedX * deltaSec * 1.5;

        if (p.y > WORLD_LOGICAL_HEIGHT) {
          p.y = -5;
          p.x = Math.random() * (WORLD_LOGICAL_WIDTH + 60);
        }
        if (p.x < -10) {
          p.x = WORLD_LOGICAL_WIDTH + 5;
        }

        // Штрих дождя 1x3
        this.particleGraphic.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 3);
      }
    }
  }

  destroy(): void {
    this.tintGraphic.destroy();
    this.particleGraphic.destroy();
    this.vignetteGraphic.destroy();
  }
}
