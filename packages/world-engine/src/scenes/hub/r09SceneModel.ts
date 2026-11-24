import type { DayPhase } from '../../bridge/WorldBridge.ts';
import type { WorldInteractionTarget } from '../../runtime/uiPreferences.ts';

export const R09_SOURCE_WIDTH = 512;
export const R09_SOURCE_HEIGHT = 288;
export type R09ViewMode = 'overview' | 'detail';

/** Entrances belong to one authored scene, regardless of screen orientation. */
export const R09_ENTRANCES = [
  { id: 'codepost', label: 'Кодовый пост', x: 228, y: 175, state: 'active' },
  { id: 'archive', label: 'Архив', x: 317, y: 211, state: 'available' },
  { id: 'cartography', label: 'Карты и анализ', x: 86, y: 192, state: 'locked' },
  { id: 'radar', label: 'Радар', x: 75, y: 115, state: 'locked' },
  { id: 'lab', label: 'Аэрология', x: 363, y: 151, state: 'locked' },
  { id: 'hall', label: 'Турнирный зал', x: 449, y: 213, state: 'locked' },
] as const;

export interface R09Viewport {
  bufferWidth: number; bufferHeight: number; cssWidth: number; cssHeight: number;
  mode: R09ViewMode;
  pixelRatio: number; zoom: number; offsetX: number; offsetY: number;
  centerX: number; centerY: number; portrait: boolean;
  safeTop: number; safeBottom: number;
  visibleSourceBounds: [number, number, number, number];
  canPanLeft: boolean; canPanRight: boolean;
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const positive = (value: number, fallback: number) => Number.isFinite(value) && value > 0 ? value : fallback;

/** Both views share one camera and the original terrace coordinates. */
export function r09Viewport(bufferWidth: number, bufferHeight: number, pixelRatio = 1, requestedMode?: R09ViewMode, requestedCenterX?: number): R09Viewport {
  const width = Math.max(1, Math.round(positive(bufferWidth, 512)));
  const height = Math.max(1, Math.round(positive(bufferHeight, 288)));
  const ratio = positive(pixelRatio, 1);
  const cssWidth = width / ratio, cssHeight = height / ratio;
  const portrait = cssWidth / cssHeight < 1.1;
  const mode = requestedMode ?? (portrait ? 'detail' : 'overview');
  if (mode === 'overview') {
    const safeTop = cssHeight <= 440 ? 76 : 82;
    const twoRowDock = cssWidth <= 760 && (cssWidth < cssHeight || cssHeight > 540);
    const safeBottom = twoRowDock ? 160 : cssHeight <= 440 ? 76 : cssHeight <= 760 ? 88 : 98;
    const availableHeight = Math.max(1, height - (safeTop + safeBottom) * ratio);
    const fit = Math.min(width / R09_SOURCE_WIDTH, availableHeight / R09_SOURCE_HEIGHT);
    // Keep the 2× architecture texture on the backing-pixel grid where
    // the frame permits it. A narrow screen still shows the whole picture.
    const zoom = fit >= ratio ? Math.floor(fit * 2) / 2 : fit;
    // Fractional zoom can align independent texture edges with the center of
    // the same output pixel. Bias all planes together away from that tie.
    const bias = Number.isInteger(zoom) ? 0 : .125;
    const offsetX = Math.round((width - R09_SOURCE_WIDTH * zoom) / 2) + bias;
    const offsetY = Math.round(safeTop * ratio + (availableHeight - R09_SOURCE_HEIGHT * zoom) / 2) + bias;
    return { bufferWidth: width, bufferHeight: height, cssWidth, cssHeight, pixelRatio: ratio, mode,
      zoom, offsetX, offsetY, centerX: (width / 2 - offsetX) / zoom, centerY: (height / 2 - offsetY) / zoom,
      portrait, safeTop, safeBottom, visibleSourceBounds: [0, 0, R09_SOURCE_WIDTH, R09_SOURCE_HEIGHT],
      canPanLeft: false, canPanRight: false };
  }
  const zoom = Math.max(1, Math.ceil(Math.max(width / R09_SOURCE_WIDTH, height / R09_SOURCE_HEIGHT)));
  const visibleWidth = width / zoom, visibleHeight = height / zoom;
  const desiredX = requestedCenterX !== undefined && Number.isFinite(requestedCenterX) ? requestedCenterX : portrait ? 228 : 256;
  const safeTop = cssHeight <= 440 ? 72 : 88;
  const safeBottom = cssWidth <= 760 ? 160 : cssHeight <= 440 ? 76 : cssHeight <= 760 ? 88 : 108;
  // A short landscape view opens on the courtyard; its west panorama also
  // reveals the upper radar entrance. Portrait framing raises the terrace
  // above the two-row dock, instead of moving any authored objects.
  const westEdge = visibleWidth / 2;
  const desiredY = portrait ? 170 : cssHeight <= 560 ? (desiredX <= westEdge + 1 ? 165 : 190) : 144;
  const x = clamp(desiredX, visibleWidth / 2, R09_SOURCE_WIDTH - visibleWidth / 2);
  const minY = visibleHeight / 2 - safeTop * ratio / zoom;
  const maxY = R09_SOURCE_HEIGHT - visibleHeight / 2 + safeBottom * ratio / zoom;
  const y = clamp(desiredY, minY, maxY);
  const offsetX = Math.round(width / 2 - x * zoom);
  const offsetY = Math.round(height / 2 - y * zoom);
  const centerX = (width / 2 - offsetX) / zoom, centerY = (height / 2 - offsetY) / zoom;
  const left = -offsetX / zoom, top = -offsetY / zoom;
  return { bufferWidth: width, bufferHeight: height, cssWidth, cssHeight, pixelRatio: ratio, mode,
    zoom, offsetX, offsetY, centerX, centerY, portrait, safeTop, safeBottom,
    visibleSourceBounds: [left, top, visibleWidth, visibleHeight],
    canPanLeft: left > 1 / zoom, canPanRight: left + visibleWidth < R09_SOURCE_WIDTH - 1 / zoom };
}

export function r09Pan(viewport: R09Viewport, direction: 'left' | 'right'): R09Viewport {
  if (viewport.mode !== 'detail') return viewport;
  return r09Viewport(viewport.bufferWidth, viewport.bufferHeight, viewport.pixelRatio, 'detail',
    viewport.centerX + (direction === 'left' ? -1 : 1) * viewport.visibleSourceBounds[2] * .68);
}

/** Off-camera doors are absent from the hit map, not clamped onto a different
 * building. The panorama controls and route dock keep them reachable. */
export function r09EntranceTargets(viewport: R09Viewport): WorldInteractionTarget[] {
  const { cssWidth, cssHeight, pixelRatio, zoom, offsetX, offsetY } = viewport;
  const size = cssWidth > 1000 ? 48 : 44;
  const top = viewport.safeTop;
  const bottom = viewport.safeBottom;
  const targets: WorldInteractionTarget[] = [];
  for (const entry of R09_ENTRANCES) {
    const x = Math.round((offsetX + entry.x * zoom) / pixelRatio - size / 2);
    const y = Math.round((offsetY + entry.y * zoom) / pixelRatio - size / 2);
    if (x < 6 || x + size > cssWidth - 6 || y < top || y + size > cssHeight - bottom) continue;
    if (targets.some((target) => Math.abs(target.x - x) < size && Math.abs(target.y - y) < size)) continue;
    targets.push({ id: entry.id, label: entry.label, state: entry.state, x, y, width: size, height: size });
  }
  return targets;
}

export interface R09PhaseStyle { sky: number; scenery: number; water: number; lights: number; stars: number; }
const PHASES: Record<DayPhase, R09PhaseStyle> = {
  day: { sky: 0xffffff, scenery: 0xffffff, water: 0xffffff, lights: .06, stars: 0 },
  dawn: { sky: 0xe4bdd1, scenery: 0xd8d0da, water: 0xc5bbdb, lights: .7, stars: 0 },
  golden_hour: { sky: 0xffd7b2, scenery: 0xffe7c9, water: 0xf0d9c6, lights: .78, stars: 0 },
  twilight: { sky: 0x7886ba, scenery: 0x9ca5c1, water: 0x7f99ba, lights: 1.05, stars: .2 },
  night: { sky: 0x364974, scenery: 0x697da3, water: 0x526f96, lights: 1.25, stars: .65 },
  white_nights: { sky: 0x9db6cc, scenery: 0xabbcd2, water: 0x93b1c6, lights: .85, stars: .08 },
};
function multiplyTint(left: number, right: number): number {
  return (Math.round(((left >> 16) & 255) * ((right >> 16) & 255) / 255) << 16)
    | (Math.round(((left >> 8) & 255) * ((right >> 8) & 255) / 255) << 8)
    | Math.round((left & 255) * (right & 255) / 255);
}
export function r09PhaseStyle(phase: DayPhase, rain: boolean): R09PhaseStyle {
  const base = PHASES[phase] ?? PHASES.day;
  if (!rain) return { ...base };
  // Separate the cool wet air and water from stone and foliage, which retain
  // their warmer source colors under a more neutral reduction in daylight.
  return { sky: multiplyTint(base.sky, 0x97b2c9), scenery: multiplyTint(base.scenery, 0xc3c6cc),
    water: multiplyTint(base.water, 0x86a7be), lights: Math.max(.58, base.lights), stars: 0 };
}

export function r09CloudOffset(timeMs: number, startX: number, width: number, still: boolean, index = 0): number {
  if (still) return 0;
  const seconds = Math.max(0, Number.isFinite(timeMs) ? timeMs : 0) / 1000;
  const travel = Math.floor(seconds * (.55 + index * .2));
  // Wrap only after the whole cloud has left the scene; it returns fully
  // outside the opposite edge. No visible jump at the authored starting point.
  return (startX + travel + width) % (R09_SOURCE_WIDTH + width) - width - startX;
}
