import type { WorldInteractionTarget } from '../../runtime/uiPreferences';
import { R08_SOURCE_SIZE } from './r08PreviewModel.ts';

export const R08_STATION_SCALE = 2;

// Doorway anchors on the original 512 × 288 composition, in station tab order.
export const R08_STATION_ENTRANCES = [
  { id: 'radar', label: 'Радар', state: 'locked', x: 111, y: 96 },
  { id: 'lab', label: 'Аэрология', state: 'locked', x: 406, y: 136 },
  { id: 'codepost', label: 'Кодовый пост', state: 'active', x: 232, y: 172 },
  { id: 'cartography', label: 'Карты и анализ', state: 'locked', x: 84, y: 202 },
  { id: 'archive', label: 'Архив', state: 'available', x: 326, y: 205 },
  { id: 'hall', label: 'Турнирный зал', state: 'locked', x: 438, y: 207 },
] as const satisfies ReadonlyArray<Pick<WorldInteractionTarget, 'id' | 'label' | 'state'> & { x: number; y: number }>;

export function getR08StationLayout(width: number, height: number, pixelRatio: number) {
  const cssWidth = width / pixelRatio;
  const cssHeight = height / pixelRatio;
  const shortLandscape = cssHeight <= 540 && cssWidth > cssHeight;
  const top = (shortLandscape ? 68 : cssHeight <= 760 || cssWidth <= 760 ? 72 : 84) * pixelRatio;
  const bottom = (shortLandscape ? 68 : cssWidth <= 760 ? 152 : cssHeight <= 760 ? 80 : 92) * pixelRatio;
  const [sceneWidth, sceneHeight] = R08_SOURCE_SIZE.map(size => size * R08_STATION_SCALE);
  const zoom = Math.max(.01, Math.min(width / sceneWidth, (height - top - bottom) / (180 * R08_STATION_SCALE), height / sceneHeight));
  const originX = Math.round((width - sceneWidth * zoom) / 2);
  // Give the horizon and foreground maximum space without covering the entrances with the HUD.
  const originY = Math.round(Math.min((height - sceneHeight * zoom) / 2, height - bottom - 22 * pixelRatio - 207 * R08_STATION_SCALE * zoom));
  const targets: WorldInteractionTarget[] = R08_STATION_ENTRANCES.map(({ id, label, state, x, y }) => ({
    id, label, state,
    x: (originX + x * R08_STATION_SCALE * zoom) / pixelRatio - 22,
    y: (originY + y * R08_STATION_SCALE * zoom) / pixelRatio - 22,
    width: 44, height: 44,
  }));
  return { zoom, centerX: (width / 2 - originX) / zoom, centerY: (height / 2 - originY) / zoom, targets };
}
