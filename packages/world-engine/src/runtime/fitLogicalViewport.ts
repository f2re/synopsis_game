import Phaser from 'phaser';
import { WORLD_PALETTE } from '../theme/tokens';
import {
  calculateIntegerPassepartout,
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_SIZE,
  HUB_LOGICAL_WIDTH,
  LEGACY_WORLD_LOGICAL_SIZE,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
  type LogicalSize,
  type ViewportFitResult,
} from './logicalViewportMath';

export {
  calculateIntegerPassepartout,
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_SIZE,
  HUB_LOGICAL_WIDTH,
  LEGACY_WORLD_LOGICAL_SIZE,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
};
export type { LogicalSize, ViewportFitResult };

export interface LogicalViewportOptions {
  /** null leaves the camera background untouched (useful for a transparent Phaser overlay). */
  backgroundColor?: number | string | null;
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

  if (options.backgroundColor !== null) {
    camera.setBackgroundColor(options.backgroundColor ?? WORLD_PALETTE.skyNight0);
  }
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
