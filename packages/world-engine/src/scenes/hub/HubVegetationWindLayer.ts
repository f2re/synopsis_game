import Phaser from 'phaser';
import {
  makeWindBands, normalizeWindEnvironment, R09_WIND_LIMITS, sampleWindDisplacement, StationWindClock,
  type VegetationWindEnvironment, type VegetationWindKind, type WindBand,
} from './r09WindModel';

export interface VegetationWindPlacement {
  /** Semantic instance ID, stable across resize and reload. */
  id: string;
  textureKey: string;
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  depth: number;
  kind: VegetationWindKind;
  sourceRect?: { x: number; y: number; width: number; height: number };
  rootFraction?: number;
  gain?: number;
}

interface WindActor {
  placement: VegetationWindPlacement;
  source: NonNullable<VegetationWindPlacement['sourceRect']>;
  scaleX: number;
  scaleY: number;
  bands: Array<{ band: WindBand; image: Phaser.GameObjects.Image; dx: number; dy: number }>;
}

/** Small masked cutouts on the Hub's existing camera. No shader, canvas redraw,
 * generated texture, input target, animation timer, or per-frame React state.
 * The base plate MUST already have these moving crowns removed, otherwise it
 * would leave a second stationary silhouette beneath the moving cutouts. */
export class HubVegetationWindLayer {
  private readonly clock = new StationWindClock();
  private actors: WindActor[] = [];
  private environment = normalizeWindEnvironment();
  private tint = 0xffffff;
  private disposed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly stationSeed = 26063) {}

  /** Geometry is supplied by the source manifest, never discovered in an atlas.
   * anchorX/anchorY are the bottom-center of the complete sourceRect in world
   * coordinates. Source pixels and the Hub camera retain their existing grid. */
  setPlacements(placements: readonly VegetationWindPlacement[]): void {
    if (this.disposed) return;
    if (placements.length > R09_WIND_LIMITS.placements) throw new Error('Превышен бюджет растительных слоёв станции.');
    const ids = new Set<string>();
    const plans = placements.map((placement) => {
      if (!placement.id || ids.has(placement.id)) throw new Error('Идентификаторы растительных слоёв должны быть уникальны.');
      ids.add(placement.id);
      if (![placement.anchorX, placement.anchorY, placement.width, placement.height, placement.depth].every(Number.isFinite)
        || placement.width < 1 || placement.height < 1 || placement.width > 8192 || placement.height > 8192) throw new Error('Неверная геометрия растительного слоя.');
      if (!['tree', 'shrub', 'grass', 'reed', 'flag'].includes(placement.kind)) throw new Error('Неизвестный тип растительного движения.');
      if (!this.scene.textures.exists(placement.textureKey)) throw new Error(`Не загружен растительный слой ${placement.id}.`);
      const texture = this.scene.textures.get(placement.textureKey);
      const source = texture.getSourceImage() as { width: number; height: number };
      const rect = placement.sourceRect ?? { x: 0, y: 0, width: source.width, height: source.height };
      if (![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger) || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1
        || rect.x + rect.width > source.width || rect.y + rect.height > source.height) throw new Error(`Границы растительного слоя ${placement.id} выходят за исходник.`);
      return { placement: { ...placement, sourceRect: { ...rect } }, source: { ...rect },
        scaleX: placement.width / rect.width, scaleY: placement.height / rect.height,
        bands: makeWindBands(rect.width, rect.height, placement.kind, placement.rootFraction) };
    });
    const next: WindActor[] = [];
    try {
      for (const plan of plans) {
        this.scene.textures.get(plan.placement.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
        const actor: WindActor = { ...plan, bands: [] };
        next.push(actor);
        for (const band of plan.bands) {
          const image = this.scene.add.image(plan.placement.anchorX, plan.placement.anchorY, plan.placement.textureKey);
          actor.bands.push({ band, image, dx: 0, dy: 0 });
          image.setScale(plan.scaleX, plan.scaleY)
            .setDisplayOrigin(plan.source.x + plan.source.width / 2, plan.source.y + plan.source.height)
            .setCrop(plan.source.x + band.x, plan.source.y + band.y, band.width, band.height)
            .setDepth(plan.placement.depth).setTint(this.tint);
        }
      }
    } catch (error) {
      next.forEach((actor) => actor.bands.forEach(({ image }) => image.destroy()));
      throw error;
    }
    this.actors.forEach((actor) => actor.bands.forEach(({ image }) => image.destroy()));
    this.actors = next;
    this.paint();
  }

  setEnvironment(value: Partial<VegetationWindEnvironment>): void {
    if (this.disposed) return;
    const next = normalizeWindEnvironment(value);
    const previous = this.environment;
    if (Object.keys(next).every((key) => next[key as keyof VegetationWindEnvironment] === previous[key as keyof VegetationWindEnvironment])) return;
    this.environment = next;
    this.clock.resetCadence();
    // Reduction restores the exact authored pose immediately, even when the
    // parent scene stops calling update(). Hiding keeps the current pose held.
    if (next.reducedMotion || (!next.paused && (previous.reducedMotion || next.weather !== previous.weather))) this.paint();
  }

  setTint(tint: number): void {
    if (this.disposed || tint === this.tint) return;
    this.tint = tint;
    this.actors.forEach((actor) => actor.bands.forEach(({ image }) => image.setTint(tint)));
  }

  update(deltaMs: number): void {
    if (!this.disposed && this.actors.length && this.clock.advance(deltaMs, this.environment)) this.paint();
  }

  private paint(): void {
    for (const actor of this.actors) {
      const placement = actor.placement;
      for (const rendered of actor.bands) {
        const displacement = sampleWindDisplacement(this.clock.timeMs, {
          id: placement.id, kind: placement.kind,
          sourceX: placement.anchorX / actor.scaleX, sourceY: placement.anchorY / actor.scaleY,
          sourceHeight: actor.source.height, freedom: rendered.band.freedom, gain: placement.gain,
        }, this.environment, this.stationSeed);
        rendered.dx = displacement.x;
        rendered.dy = displacement.y;
        rendered.image.setPosition(placement.anchorX + displacement.x * actor.scaleX, placement.anchorY + displacement.y * actor.scaleY);
      }
    }
  }

  getDiagnostics() {
    return {
      weather: this.environment.weather,
      reducedMotion: this.environment.reducedMotion,
      lowPower: this.environment.lowPower,
      paused: this.environment.paused,
      animated: !this.disposed && this.actors.length > 0 && !this.environment.reducedMotion && !this.environment.paused,
      elapsedMs: this.clock.timeMs,
      paintedFrames: this.clock.paintFrames,
      cadenceMs: this.environment.lowPower ? R09_WIND_LIMITS.lowPowerFrameMs : R09_WIND_LIMITS.normalFrameMs,
      placements: this.actors.length,
      bands: this.actors.reduce((sum, actor) => sum + actor.bands.length, 0),
      generatedTextureBytes: 0,
      rootDisplacement: this.actors.reduce((max, actor) => Math.max(max, ...actor.bands.filter(({ band }) => band.freedom === 0).map(({ dx, dy }) => Math.abs(dx) + Math.abs(dy))), 0),
      poses: this.actors.map((actor) => ({ id: actor.placement.id, offsets: actor.bands.map(({ dx, dy }) => [dx, dy]) })),
      disposed: this.disposed,
    };
  }

  destroy(): void {
    if (this.disposed) return;
    this.actors.forEach((actor) => actor.bands.forEach(({ image }) => image.destroy()));
    this.actors = [];
    this.disposed = true;
  }
}
