import Phaser from 'phaser';
import { WORLD_PALETTE } from '../theme/tokens';

export const WORLD_LOGICAL_WIDTH = 480;
export const WORLD_LOGICAL_HEIGHT = 270;

export interface ViewportFitResult {
  integerScale: number;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Вычисляет целочисленное масштабирование (Integer Scaling) и рамку-паспарту.
 * Гарантирует отсутствие субпиксельного смазывания на любых разрешениях (включая 800x600).
 */
export function calculateIntegerPassepartout(
  windowWidth: number,
  windowHeight: number,
  logicalWidth = WORLD_LOGICAL_WIDTH,
  logicalHeight = WORLD_LOGICAL_HEIGHT,
): ViewportFitResult {
  const scaleX = windowWidth / logicalWidth;
  const scaleY = windowHeight / logicalHeight;
  const integerScale = Math.max(1, Math.floor(Math.min(scaleX, scaleY)));

  const viewportWidth = logicalWidth * integerScale;
  const viewportHeight = logicalHeight * integerScale;
  const viewportX = Math.floor((windowWidth - viewportWidth) / 2);
  const viewportY = Math.floor((windowHeight - viewportHeight) / 2);

  return {
    integerScale,
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
  };
}

export function fitLogicalViewport(
  scene: Phaser.Scene,
  logicalWidth = WORLD_LOGICAL_WIDTH,
  logicalHeight = WORLD_LOGICAL_HEIGHT,
): ViewportFitResult {
  const camera = scene.cameras.main;
  const screenWidth = Math.max(scene.scale.width, 1);
  const screenHeight = Math.max(scene.scale.height, 1);

  const fit = calculateIntegerPassepartout(screenWidth, screenHeight, logicalWidth, logicalHeight);

  // Паспарту (фон за пределами логического холста)
  camera.setBackgroundColor(WORLD_PALETTE.skyNight0);
  camera.setViewport(fit.viewportX, fit.viewportY, fit.viewportWidth, fit.viewportHeight);
  camera.setZoom(fit.integerScale);
  camera.centerOn(logicalWidth / 2, logicalHeight / 2);

  return fit;
}

export function bindLogicalViewport(
  scene: Phaser.Scene,
  logicalWidth = WORLD_LOGICAL_WIDTH,
  logicalHeight = WORLD_LOGICAL_HEIGHT,
): void {
  const resize = () => fitLogicalViewport(scene, logicalWidth, logicalHeight);

  fitLogicalViewport(scene, logicalWidth, logicalHeight);
  scene.scale.on(Phaser.Scale.Events.RESIZE, resize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, resize);
  });
}
