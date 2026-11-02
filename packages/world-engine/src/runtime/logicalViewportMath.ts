/** Legacy logical canvas kept for retained 2D scenes during migration. */
export const WORLD_LOGICAL_WIDTH = 480;
export const WORLD_LOGICAL_HEIGHT = 270;

/** Canonical logical canvas for the new 2.5D Hub renderer. */
export const HUB_LOGICAL_WIDTH = 640;
export const HUB_LOGICAL_HEIGHT = 360;

export interface LogicalSize {
  width: number;
  height: number;
}

export const LEGACY_WORLD_LOGICAL_SIZE: LogicalSize = {
  width: WORLD_LOGICAL_WIDTH,
  height: WORLD_LOGICAL_HEIGHT,
};

export const HUB_LOGICAL_SIZE: LogicalSize = {
  width: HUB_LOGICAL_WIDTH,
  height: HUB_LOGICAL_HEIGHT,
};

export interface ViewportFitResult {
  integerScale: number;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Renderer-independent integer scaling and centered passepartout. */
export function calculateIntegerPassepartout(
  windowWidth: number,
  windowHeight: number,
  logicalWidth = WORLD_LOGICAL_WIDTH,
  logicalHeight = WORLD_LOGICAL_HEIGHT,
): ViewportFitResult {
  if (logicalWidth <= 0 || logicalHeight <= 0) {
    throw new RangeError('Logical viewport dimensions must be positive.');
  }

  const safeWindowWidth = Math.max(windowWidth, 1);
  const safeWindowHeight = Math.max(windowHeight, 1);
  const scaleX = safeWindowWidth / logicalWidth;
  const scaleY = safeWindowHeight / logicalHeight;
  const integerScale = Math.max(1, Math.floor(Math.min(scaleX, scaleY)));

  const viewportWidth = logicalWidth * integerScale;
  const viewportHeight = logicalHeight * integerScale;
  const viewportX = Math.floor((safeWindowWidth - viewportWidth) / 2);
  const viewportY = Math.floor((safeWindowHeight - viewportHeight) / 2);

  return {
    integerScale,
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
  };
}
