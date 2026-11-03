import Phaser from 'phaser';
import { WORLD_PALETTE } from '../theme/tokens';

export const LEGACY_LOGICAL_WIDTH = 480;
export const LEGACY_LOGICAL_HEIGHT = 270;
export const HUB_LOGICAL_WIDTH = 640;
export const HUB_LOGICAL_HEIGHT = 360;

/**
 * Backward-compatible aliases for legacy 480x270 scenes.
 * New scene code should prefer explicit scene-specific constants.
 */
export const WORLD_LOGICAL_WIDTH = LEGACY_LOGICAL_WIDTH;
export const WORLD_LOGICAL_HEIGHT = LEGACY_LOGICAL_HEIGHT;

export interface LogicalViewportSize {
  width: number;
  height: number;
}

export const SCENE_LOGICAL_VIEWPORTS = {
  hubThree2d: { width: HUB_LOGICAL_WIDTH, height: HUB_LOGICAL_HEIGHT },
  legacy: { width: LEGACY_LOGICAL_WIDTH, height: LEGACY_LOGICAL_HEIGHT },
} as const satisfies Record<string, LogicalViewportSize>;

export interface ViewportFitResult {
  integerScale: number;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface LogicalViewportOptions {
  backgroundColor?: string | number;
}

/**
 * Вычисляет целочисленное масштабирование (Integer Scaling) и рамку-паспарту.
 * При окне меньше logical canvas сохраняет scale=1 и допускает симметричный crop,
 * вместо размытого fractional downscale.
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
  options: LogicalViewportOptions = {},
): ViewportFitResult {
  const camera = scene.cameras.main;
  const screenWidth = Math.max(scene.scale.width, 1);
  const screenHeight = Math.max(scene.scale.height, 1);

  const fit = calculateIntegerPassepartout(screenWidth, screenHeight, logicalWidth, logicalHeight);

  camera.setBackgroundColor(options.backgroundColor ?? WORLD_PALETTE.skyNight0);
  camera.setViewport(fit.viewportX, fit.viewportY, fit.viewportWidth, fit.viewportHeight);
  camera.setZoom(fit.integerScale);
  camera.centerOn(logicalWidth / 2, logicalHeight / 2);

  return fit;
}

export function bindLogicalViewport(
  scene: Phaser.Scene,
  logicalWidth = WORLD_LOGICAL_WIDTH,
  logicalHeight = WORLD_LOGICAL_HEIGHT,
  options: LogicalViewportOptions = {},
): void {
  const resize = () => fitLogicalViewport(scene, logicalWidth, logicalHeight, options);

  fitLogicalViewport(scene, logicalWidth, logicalHeight, options);
  scene.scale.on(Phaser.Scale.Events.RESIZE, resize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, resize);
  });
}
