/** Bounded, explicitly provisional art-preview contract. Never used by the home scene. */
export const R08_WORLD_SIZE = [960, 540] as const;
export const R08_SOURCE_SIZE = [512, 288] as const;
export const R08_SOURCE_SCALE = R08_WORLD_SIZE[0] / R08_SOURCE_SIZE[0];
export const R08_MANIFEST_URL = '/hub/r08-preview/manifest.json';
export const R08_OBSERVER_ID = 'character.r01.observer';

const ROLES = [
  'master', 'archive-local-ground', 'archive-facade', 'archive-porch-steps', 'archive-entry-lamp',
  'foreground-occluder', 'window-light-mask', 'lamp-light-mask', 'ground-light-mask',
] as const;
export type R08AssetRole = typeof ROLES[number];
export interface R08PreviewAsset {
  id: string;
  role: R08AssetRole;
  url: string;
  width: number;
  height: number;
  originalSceneXY: [number, number];
  pivotLocalPx?: [number, number];
  anchorScenePx?: [number, number];
  depthSourceY?: number;
  sha256: string;
}
export interface R08PreviewManifest {
  version: 1;
  status: 'candidate';
  sourceCanvas: [512, 288];
  worldCanvas: [960, 540];
  assets: R08PreviewAsset[];
  lightRegions: R08LightRegion[];
  review: { geometry: string; art: string; productionReady: false };
  archive: { sourceBounds: [number, number, number, number]; entranceSource: [number, number] };
}
export interface R08LightRegion {
  id: string;
  maskRole: R08AssetRole;
  sourceBounds: [number, number, number, number];
  tint: string;
  suggestedAlpha: number;
}
export interface R08PreviewPreferences {
  phase: 'day' | 'twilight';
  reducedMotion: boolean;
  lowPower: boolean;
  pose: 'walk' | 'archive' | 'foreground';
  framing: 'station' | 'archive';
}
export interface R08PreviewTarget { left: number; top: number; width: number; height: number }
export interface R08PreviewStatus {
  state: 'loading' | 'ready' | 'error';
  message?: string;
  assets?: number;
  foregroundAvailable?: boolean;
  twilightAvailable?: boolean;
  review?: R08PreviewManifest['review'];
}

const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const pair = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every((part) => finite(part, 0, 4096));

export function parseR08PreviewManifest(value: unknown): R08PreviewManifest {
  const raw = object(value);
  const review = object(raw?.review);
  const archive = object(raw?.archive);
  if (!raw || raw.version !== 1 || raw.status !== 'candidate' ||
      JSON.stringify(raw.sourceCanvas) !== JSON.stringify(R08_SOURCE_SIZE) ||
      JSON.stringify(raw.worldCanvas) !== JSON.stringify(R08_WORLD_SIZE) ||
      !Array.isArray(raw.assets) || raw.assets.length > 16 || !review ||
      typeof review.geometry !== 'string' || typeof review.art !== 'string' || review.productionReady !== false ||
      !archive || !Array.isArray(archive.sourceBounds) || archive.sourceBounds.length !== 4 ||
      !archive.sourceBounds.every((part) => finite(part, 0, 512)) || !pair(archive.entranceSource)) {
    throw new Error('Манифест пилота отсутствует или не соответствует принятой геометрии.');
  }
  const assets = raw.assets.map((value): R08PreviewAsset => {
    const item = object(value);
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9._-]{1,160}$/.test(item.id) ||
        !ROLES.includes(item.role as R08AssetRole) || typeof item.url !== 'string' ||
        !/^\/hub\/r08-preview\/[a-zA-Z0-9_-]+\.png(?:\?v=[a-f0-9]{12})?$/.test(item.url) ||
        !finite(item.width, 1, 512) || !Number.isInteger(item.width) ||
        !finite(item.height, 1, 288) || !Number.isInteger(item.height) || !pair(item.originalSceneXY) ||
        item.originalSceneXY[0] + item.width > 512 || item.originalSceneXY[1] + item.height > 288 ||
        typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256) ||
        (item.pivotLocalPx !== undefined && !pair(item.pivotLocalPx)) ||
        (item.anchorScenePx !== undefined && !pair(item.anchorScenePx)) ||
        (item.depthSourceY !== undefined && !finite(item.depthSourceY, 0, 288))) {
      throw new Error('Неверные координаты или путь слоя пилота.');
    }
    return {
      id: item.id, role: item.role as R08AssetRole, url: item.url, width: item.width, height: item.height,
      originalSceneXY: [...item.originalSceneXY], sha256: item.sha256,
      ...(pair(item.pivotLocalPx) ? { pivotLocalPx: [...item.pivotLocalPx] as [number, number] } : {}),
      ...(pair(item.anchorScenePx) ? { anchorScenePx: [...item.anchorScenePx] as [number, number] } : {}),
      ...(typeof item.depthSourceY === 'number' ? { depthSourceY: item.depthSourceY } : {}),
    };
  });
  if (new Set(assets.map((asset) => asset.id)).size !== assets.length ||
      new Set(assets.map((asset) => asset.role)).size !== assets.length ||
      ['master', 'archive-local-ground', 'archive-facade', 'archive-porch-steps', 'archive-entry-lamp']
        .some((role) => !assets.some((asset) => asset.role === role)) ||
      assets.reduce((pixels, asset) => pixels + asset.width * asset.height, 0) > 2_097_152) {
    throw new Error('Неполный комплект слоёв или превышен бюджет текстур пилота.');
  }
  for (const asset of assets.filter((entry) => entry.role === 'master' || entry.role === 'archive-local-ground')) {
    if (asset.width !== 512 || asset.height !== 288 || asset.originalSceneXY.some((part) => part !== 0)) {
      throw new Error('Основа пилота должна сохранять целую исходную композицию.');
    }
  }
  if (raw.lightRegions !== undefined && (!Array.isArray(raw.lightRegions) || raw.lightRegions.length > 32)) {
    throw new Error('Превышен бюджет локальных световых областей.');
  }
  const lightRegions = ((raw.lightRegions ?? []) as unknown[]).map((value): R08LightRegion => {
    const item = object(value);
    const bounds = item?.sourceBounds;
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9._-]{1,160}$/.test(item.id) ||
        !['window-light-mask', 'lamp-light-mask', 'ground-light-mask'].includes(String(item.maskRole)) ||
        !assets.some((asset) => asset.role === item.maskRole && asset.width === 512 && asset.height === 288) ||
        !Array.isArray(bounds) || bounds.length !== 4 || !bounds.every((part) => finite(part, 0, 512) && Number.isInteger(part)) ||
        bounds[2] <= 0 || bounds[3] <= 0 || bounds[0] + bounds[2] > 512 || bounds[1] + bounds[3] > 288 ||
        typeof item.tint !== 'string' || !/^#[a-f0-9]{6}$/i.test(item.tint) || !finite(item.suggestedAlpha, 0, 0.6)) {
      throw new Error('Неверная локальная световая область.');
    }
    return { id: item.id, maskRole: item.maskRole as R08AssetRole,
      sourceBounds: [...bounds] as [number, number, number, number], tint: item.tint, suggestedAlpha: item.suggestedAlpha };
  });
  for (const [index, region] of lightRegions.entries()) {
    const [x, y, w, h] = region.sourceBounds;
    if (lightRegions.slice(0, index).some((other) => {
      const [ox, oy, ow, oh] = other.sourceBounds;
      return other.id === region.id || (other.maskRole === region.maskRole && x < ox + ow && x + w > ox && y < oy + oh && y + h > oy);
    })) throw new Error('Световые области одного слоя не должны суммироваться повторно.');
  }
  const bounds = archive.sourceBounds as [number, number, number, number];
  if (bounds[2] <= 0 || bounds[3] <= 0 || bounds[0] + bounds[2] > 512 || bounds[1] + bounds[3] > 288 ||
      archive.entranceSource[0] > 512 || archive.entranceSource[1] > 288) {
    throw new Error('Вход Архива выходит за исходную композицию.');
  }
  return {
    version: 1, status: 'candidate', sourceCanvas: [512, 288], worldCanvas: [960, 540], assets, lightRegions,
    review: { geometry: review.geometry, art: review.art, productionReady: false },
    archive: { sourceBounds: [...bounds], entranceSource: [...archive.entranceSource] },
  };
}

/** One camera transform for every scene layer. The source grid remains under art review. */
export function r08Viewport(width: number, height: number, framing: R08PreviewPreferences['framing']) {
  const frame = framing === 'archive' ? { width: 360, height: 292, x: 602, y: 385 } : { width: 960, height: 540, x: 480, y: 270 };
  const zoom = Math.max(0.01, Math.min(width / frame.width, height / frame.height));
  return { zoom, centerX: frame.x, centerY: frame.y, visibleLeft: frame.x - width / zoom / 2, visibleTop: frame.y - height / zoom / 2 };
}

export function r08ArchiveTarget(
  bounds: [number, number, number, number], viewport: ReturnType<typeof r08Viewport>,
  pixelRatio: number, cssWidth: number, cssHeight: number,
): R08PreviewTarget {
  const [x, y, width, height] = bounds.map((part) => part * R08_SOURCE_SCALE);
  const screenWidth = width * viewport.zoom / pixelRatio;
  const screenHeight = height * viewport.zoom / pixelRatio;
  const targetWidth = Math.min(cssWidth, Math.max(44, screenWidth));
  const targetHeight = Math.min(cssHeight, Math.max(44, screenHeight));
  return {
    left: Math.max(0, Math.min(cssWidth - targetWidth, (x - viewport.visibleLeft) * viewport.zoom / pixelRatio - (targetWidth - screenWidth) / 2)),
    top: Math.max(0, Math.min(cssHeight - targetHeight, (y - viewport.visibleTop) * viewport.zoom / pixelRatio - (targetHeight - screenHeight) / 2)),
    width: targetWidth, height: targetHeight,
  };
}

/** A shared ambient falloff, sampled in source space so cutout edges keep the same light.
 * Local light masks provide the hierarchy; separate authored shadow planes remain pending.
 */
export function r08AmbientTint(sourceY: number): number {
  const amount = Math.max(0, Math.min(1, sourceY / R08_SOURCE_SIZE[1]));
  const top = [157, 176, 195], bottom = [80, 104, 105];
  const [red, green, blue] = top.map((channel, index) => Math.round(channel + (bottom[index] - channel) * amount));
  return red * 65536 + green * 256 + blue;
}

/** Deterministic inspection positions and a bounded walking route, in source coordinates. */
export function r08ObserverPose(mode: R08PreviewPreferences['pose'], elapsedMs: number, sourceScale = R08_SOURCE_SCALE) {
  if (mode === 'archive') return { x: 305 * sourceScale, y: 224 * sourceScale, facing: 'right' as const };
  if (mode === 'foreground') return { x: 331 * sourceScale, y: 231 * sourceScale, facing: 'right' as const };
  const left = 277 * sourceScale;
  const right = 355 * sourceScale;
  const travel = Math.max(0, elapsedMs) / 1000 * 22;
  const distance = right - left;
  const cycle = travel % (2 * distance);
  const offset = cycle <= distance ? cycle : 2 * distance - cycle;
  return { x: left + offset, y: 231 * sourceScale, facing: cycle <= distance ? 'right' as const : 'left' as const };
}
