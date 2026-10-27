import Phaser from 'phaser';
import { WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT } from '../../runtime/fitLogicalViewport';
import { SEASON_PROFILES, type Season, type SeasonProfile } from './HubSeason';

const GROUND_TOP = 132;

interface FallingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  color: number;
  size: number;
}

/** Сезонная вуаль земли, снежный покров и сезонные частицы (лепестки, листья, снег). */
export class HubSeasonLayer {
  private readonly scene: Phaser.Scene;
  private readonly washGraphic: Phaser.GameObjects.Graphics;
  private readonly snowGraphic: Phaser.GameObjects.Graphics;
  private readonly particleGraphic: Phaser.GameObjects.Graphics;
  private profile: SeasonProfile = SEASON_PROFILES.summer;
  private particles: FallingParticle[] = [];
  private timer = 0;
  private readonly reducedMotion: boolean;

  constructor(scene: Phaser.Scene, reducedMotion = false) {
    this.scene = scene;
    this.reducedMotion = reducedMotion;
    this.washGraphic = scene.add.graphics();
    this.snowGraphic = scene.add.graphics();
    this.particleGraphic = scene.add.graphics();
  }

  getProfile(): SeasonProfile {
    return this.profile;
  }

  setSeason(season: Season): void {
    this.profile = SEASON_PROFILES[season];
    this.renderWash();
    this.renderSnow();
    this.spawnParticles();
  }

  private renderWash(): void {
    const p = this.profile;
    this.washGraphic.clear();
    // Мягкий верхний край: 4 ступени, чтобы вуаль не резала фасады по линии горизонта
    const fade = 4;
    const band = 5;
    for (let i = 0; i < fade; i++) {
      this.washGraphic.fillStyle(p.washColor, (p.washAlpha * (i + 1)) / (fade + 1));
      this.washGraphic.fillRect(0, GROUND_TOP + i * band, WORLD_LOGICAL_WIDTH, band);
    }
    const bodyTop = GROUND_TOP + fade * band;
    this.washGraphic.fillStyle(p.washColor, p.washAlpha);
    this.washGraphic.fillRect(0, bodyTop, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT - bodyTop);
  }

  /** Детерминированные сугробы: без случайности, чтобы кадр был воспроизводим. */
  private renderSnow(): void {
    const cover = this.profile.snowCover;
    this.snowGraphic.clear();
    if (cover <= 0) return;

    this.snowGraphic.fillStyle(0xf4f7fa, 0.55 * cover);
    this.snowGraphic.fillRect(0, GROUND_TOP, WORLD_LOGICAL_WIDTH, 3);

    const drifts = Math.round(26 * cover);
    for (let i = 0; i < drifts; i++) {
      const x = (i * 53 + 11) % WORLD_LOGICAL_WIDTH;
      const y = GROUND_TOP + 6 + ((i * 37) % (WORLD_LOGICAL_HEIGHT - GROUND_TOP - 8));
      const w = 10 + ((i * 7) % 18);
      this.snowGraphic.fillStyle(0xf4f7fa, 0.7);
      this.snowGraphic.fillRect(x, y, w, 2);
      this.snowGraphic.fillStyle(0xdfeaf7, 0.6);
      this.snowGraphic.fillRect(x + 1, y + 2, w - 2, 1);
    }
  }

  private spawnParticles(): void {
    const p = this.profile;
    const count = this.reducedMotion ? Math.floor(p.particleCount / 3) : p.particleCount;
    this.particles = [];
    if (p.particle === 'none' || p.particleColors.length === 0) return;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: (i * 71 + 5) % WORLD_LOGICAL_WIDTH,
        y: (i * 43) % WORLD_LOGICAL_HEIGHT,
        vx: p.particle === 'snow' ? -6 - (i % 5) : 6 + (i % 7) * 2,
        vy: p.particle === 'snow' ? 18 + (i % 6) * 4 : 10 + (i % 5) * 4,
        phase: i * 0.9,
        color: p.particleColors[i % p.particleColors.length],
        size: p.particle === 'leaves' && i % 3 === 0 ? 2 : 1,
      });
    }
  }

  update(deltaMs: number): void {
    this.timer += deltaMs;
    this.particleGraphic.clear();
    if (this.particles.length === 0) return;

    const dt = deltaMs / 1000;
    const flutter = this.profile.particle === 'snow' ? 0 : 1;
    for (const q of this.particles) {
      if (!this.reducedMotion) {
        q.x += (q.vx + Math.sin(this.timer / 400 + q.phase) * 8 * flutter) * dt;
        q.y += q.vy * dt;
      }
      if (q.y > WORLD_LOGICAL_HEIGHT) {
        q.y = -2;
        q.x = (q.x + 97) % WORLD_LOGICAL_WIDTH;
      }
      if (q.x > WORLD_LOGICAL_WIDTH) q.x = 0;
      if (q.x < 0) q.x = WORLD_LOGICAL_WIDTH;
      this.particleGraphic.fillStyle(q.color, 0.9);
      this.particleGraphic.fillRect(Math.round(q.x), Math.round(q.y), q.size + (flutter ? 1 : 0), q.size);
    }
  }

  destroy(): void {
    this.washGraphic.destroy();
    this.snowGraphic.destroy();
    this.particleGraphic.destroy();
    this.particles = [];
  }
}
