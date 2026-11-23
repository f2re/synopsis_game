/** Decorative wind only: these values are never meteorological observations. */
export type VegetationWindKind = 'tree' | 'shrub' | 'grass' | 'reed' | 'flag';

export interface VegetationWindEnvironment {
  weather: 'clear' | 'rain';
  reducedMotion: boolean;
  lowPower: boolean;
  paused: boolean;
}

export interface WindBand {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0 is the planted root or the attached edge of cloth. */
  freedom: number;
}

export const R09_WIND_LIMITS = Object.freeze({
  placements: 48,
  bandsPerPlacement: 8,
  normalFrameMs: 100,
  lowPowerFrameMs: 200,
  maxDeltaMs: 100,
  // Scene-locked foliage is small. Preserve visible integer motion, then cap
  // its displacement; shrinking gain below a pixel would freeze every crown.
  maxSourceDisplacement: 1,
});

export function normalizeWindEnvironment(value: Partial<VegetationWindEnvironment> = {}): VegetationWindEnvironment {
  return {
    weather: value.weather === 'rain' ? 'rain' : 'clear',
    reducedMotion: value.reducedMotion === true,
    lowPower: value.lowPower === true,
    paused: value.paused === true,
  };
}

/** FNV-1a gives each semantic object a stable phase without shared RNG state. */
export function windSeed(id: string, stationSeed = 26063): number {
  let hash = (2166136261 ^ stationSeed) >>> 0;
  for (let index = 0; index < id.length; index++) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619) >>> 0;
  return hash / 4294967296 * Math.PI * 2;
}

/** The shared, slowly travelling gust makes nearby crowns respond together. */
export function sampleWindField(timeMs: number, sourceX: number, sourceY: number, stationSeed = 26063) {
  const seconds = Math.max(0, Number.isFinite(timeMs) ? timeMs : 0) / 1000;
  const phase = windSeed('station-gust', stationSeed);
  const travelling = seconds * .29 - sourceX * .009 - sourceY * .003 + phase;
  const gust = ((Math.sin(travelling) + 1) / 2) ** 3;
  const breeze = Math.sin(seconds * .77 + phase) * .36 + Math.sin(seconds * .31 + phase * 1.7) * .16;
  return { gust, bend: breeze + gust * .62, seconds };
}

/** Exact, disjoint source crops. The lower vegetation band never moves. A
 * flag's left attachment is fixed instead; only a separately isolated cloth
 * asset should be supplied as kind=flag, never its pole or a whole facade. */
export function makeWindBands(width: number, height: number, kind: VegetationWindKind, rootFraction?: number): WindBand[] {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Растительный слой должен иметь целые положительные размеры.');
  }
  const horizontal = kind === 'flag';
  const extent = horizontal ? width : height;
  if (extent < 3) return [{ x: 0, y: 0, width, height, freedom: 0 }];
  const fallbackRoot = horizontal ? .16 : kind === 'tree' ? .24 : .18;
  const fraction = rootFraction === undefined ? fallbackRoot : rootFraction;
  if (!Number.isFinite(fraction) || fraction < .08 || fraction > .6) {
    throw new Error('Неподвижное основание растительного слоя должно занимать от 8 до 60 процентов.');
  }
  const fixed = Math.max(1, Math.min(extent - 1, Math.round(extent * fraction)));
  const moving = extent - fixed;
  const movingCount = Math.min(R09_WIND_LIMITS.bandsPerPlacement - 1, Math.max(1, Math.ceil(moving / 7)));
  const bands: WindBand[] = [];
  if (horizontal) bands.push({ x: 0, y: 0, width: fixed, height, freedom: 0 });
  for (let index = 0; index < movingCount; index++) {
    const start = Math.floor(index * moving / movingCount);
    const end = Math.floor((index + 1) * moving / movingCount);
    const freedom = horizontal ? ((start + end) / (2 * moving)) ** 1.35 : (1 - (start + end) / (2 * moving)) ** 1.65;
    bands.push(horizontal
      ? { x: fixed + start, y: 0, width: end - start, height, freedom }
      : { x: 0, y: start, width, height: end - start, freedom });
  }
  if (!horizontal) bands.push({ x: 0, y: moving, width, height: fixed, freedom: 0 });
  return bands;
}

export interface WindSample {
  id: string;
  kind: VegetationWindKind;
  /** Coordinates and size in the common authored pixel grid. */
  sourceX: number;
  sourceY: number;
  sourceHeight: number;
  freedom: number;
  gain?: number;
}

export function sampleWindDisplacement(timeMs: number, actor: WindSample, environment: VegetationWindEnvironment, stationSeed = 26063) {
  if (environment.reducedMotion || actor.freedom <= 0) return { x: 0, y: 0 };
  const field = sampleWindField(timeMs, actor.sourceX, actor.sourceY, stationSeed);
  const phase = windSeed(actor.id, stationSeed);
  const ripple = Math.sin(field.seconds * (actor.kind === 'flag' ? 2.6 : 1.45) + phase + actor.freedom * 1.7) * .17;
  const flexibility = actor.kind === 'tree' ? 1 : actor.kind === 'shrub' ? .8 : 1.15;
  const gain = Number.isFinite(actor.gain) ? Math.max(0, Math.min(1.5, actor.gain!)) : 1;
  const amplitude = Math.max(1.25, Math.min(3, actor.sourceHeight * .045)) * flexibility * gain;
  const weatherGain = environment.weather === 'rain' ? 1 : .76;
  const raw = (field.bend + ripple) * amplitude * weatherGain * Math.max(0, Math.min(1, actor.freedom));
  const displacement = Math.max(-R09_WIND_LIMITS.maxSourceDisplacement, Math.min(R09_WIND_LIMITS.maxSourceDisplacement, Math.round(raw)));
  return actor.kind === 'flag' ? { x: 0, y: displacement } : { x: displacement, y: 0 };
}

/** Pauses hold authored time. Long resume deltas never fast-forward a gust. */
export class StationWindClock {
  private elapsedMs = 0;
  private sincePaintMs = 0;
  private frames = 0;

  advance(deltaMs: number, environment: VegetationWindEnvironment): boolean {
    if (environment.paused || environment.reducedMotion || !Number.isFinite(deltaMs) || deltaMs <= 0) return false;
    const delta = Math.min(deltaMs, R09_WIND_LIMITS.maxDeltaMs);
    this.elapsedMs += delta;
    this.sincePaintMs += delta;
    const cadence = environment.lowPower ? R09_WIND_LIMITS.lowPowerFrameMs : R09_WIND_LIMITS.normalFrameMs;
    if (this.sincePaintMs + 1e-7 < cadence) return false;
    this.sincePaintMs = Math.max(0, this.sincePaintMs - cadence);
    this.frames++;
    return true;
  }

  resetCadence(): void { this.sincePaintMs = 0; }
  get timeMs(): number { return this.elapsedMs; }
  get paintFrames(): number { return this.frames; }
}
