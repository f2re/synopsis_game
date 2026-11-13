import type { DayPhase } from '../../bridge/WorldBridge.ts';

export interface R01WeatherPresentation {
  mode: 'clear' | 'rain';
  animate: boolean;
}

export function normalizeR01Weather(value: unknown): R01WeatherPresentation {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const mode = input.mode === 'rain' ? 'rain' : 'clear';
  return { mode, animate: mode === 'rain' && input.animate === true };
}

interface PhaseStyle {
  skyTint: number;
  sceneryTint: number;
  lightAlpha: number;
  sunset: boolean;
}

// Multipliers are applied to the accepted source pixels. They do not add a
// fullscreen colour filter or alter the scientific/DOM interface palette.
const PHASE_STYLES: Record<DayPhase, PhaseStyle> = {
  day: { skyTint: 0xffffff, sceneryTint: 0xffffff, lightAlpha: 0, sunset: false },
  dawn: { skyTint: 0xe3c7d2, sceneryTint: 0xead9dc, lightAlpha: .5, sunset: false },
  golden_hour: { skyTint: 0xffffff, sceneryTint: 0xffffff, lightAlpha: .35, sunset: true },
  twilight: { skyTint: 0x9095b8, sceneryTint: 0xa0a9c5, lightAlpha: .85, sunset: false },
  night: { skyTint: 0x40567f, sceneryTint: 0x7084aa, lightAlpha: 1, sunset: false },
  white_nights: { skyTint: 0xa7bacb, sceneryTint: 0xb4c5d8, lightAlpha: .65, sunset: false },
};

function multiplyTint(left: number, right: number): number {
  const r = Math.round(((left >> 16) & 255) * ((right >> 16) & 255) / 255);
  const g = Math.round(((left >> 8) & 255) * ((right >> 8) & 255) / 255);
  const b = Math.round((left & 255) * (right & 255) / 255);
  return (r << 16) | (g << 8) | b;
}

export function getR01PhaseStyle(phase: DayPhase, weather: R01WeatherPresentation['mode']): PhaseStyle {
  const style = PHASE_STYLES[phase];
  if (weather === 'clear') return style;
  return {
    skyTint: multiplyTint(style.skyTint, 0xafbfd1),
    sceneryTint: multiplyTint(style.sceneryTint, 0xc8d6e2),
    lightAlpha: Math.max(.45, style.lightAlpha),
    sunset: false,
  };
}

export const R01_RAIN_DROP_LIMIT = 72;
export const R01_RAIN_FRAME_MS = 1000 / 12;

/** A bounded deterministic field in visible world coordinates; no allocations
 * or random number generator state accumulate between scenes or resizes. */
export function r01RainDrop(index: number, timeMs: number, width: number, height: number) {
  const positiveMod = (value: number, size: number) => ((value % size) + size) % size;
  const travel = timeMs * (.12 + (index % 5) * .008);
  return {
    x: Math.round(positiveMod(index * 137.31 - travel * .18, Math.max(1, width))),
    y: Math.round(positiveMod(index * 89.73 + travel, Math.max(1, height))),
    length: 4 + index % 5,
  };
}
