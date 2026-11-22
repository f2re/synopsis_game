/** Renderer-independent viewport geometry shared by Phaser 2D and Three.js Hub. */
export const LEGACY_LOGICAL_WIDTH = 480;
export const LEGACY_LOGICAL_HEIGHT = 270;
export const HUB_LOGICAL_WIDTH = 640;
export const HUB_LOGICAL_HEIGHT = 360;

/** Retained aliases: changing them to 640×360 would silently break old scenes. */
export const WORLD_LOGICAL_WIDTH = LEGACY_LOGICAL_WIDTH;
export const WORLD_LOGICAL_HEIGHT = LEGACY_LOGICAL_HEIGHT;

export interface LogicalViewportSize {
  width: number;
  height: number;
}

export interface ViewportFitResult {
  integerScale: number;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Integer-scale 2D/2.5D viewport: allow symmetric crop on sub-logical displays. */
export function calculateIntegerPassepartout(
  windowWidth: number,
  windowHeight: number,
  logicalWidth = WORLD_LOGICAL_WIDTH,
  logicalHeight = WORLD_LOGICAL_HEIGHT,
): ViewportFitResult {
  if (![windowWidth, windowHeight, logicalWidth, logicalHeight].every(Number.isFinite) ||
      logicalWidth <= 0 || logicalHeight <= 0) {
    throw new RangeError('Viewport dimensions must be finite and logical dimensions positive.');
  }
  const safeWindowWidth = Math.max(windowWidth, 1);
  const safeWindowHeight = Math.max(windowHeight, 1);
  const integerScale = Math.max(1, Math.floor(Math.min(
    safeWindowWidth / logicalWidth,
    safeWindowHeight / logicalHeight,
  )));
  const viewportWidth = logicalWidth * integerScale;
  const viewportHeight = logicalHeight * integerScale;
  return {
    integerScale,
    viewportX: Math.floor((safeWindowWidth - viewportWidth) / 2),
    viewportY: Math.floor((safeWindowHeight - viewportHeight) / 2),
    viewportWidth,
    viewportHeight,
  };
}
