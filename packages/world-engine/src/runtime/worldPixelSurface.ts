export function getWorldPixelSurface(width: number, height: number, deviceRatio: number) {
  // Keep HiDPI where the backing store fits the pixel budget. At integer
  // device ratios a 1× backing still scales to an even physical pixel grid.
  const deviceScale = Math.min(2, Math.max(1, deviceRatio || 1));
  const ratio = width * height * deviceScale ** 2 <= 2_000_000 ? deviceScale : 1;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)), ratio };
}

export function snapWorldPixelZoom(available: number): number {
  return available >= 1 ? Math.floor(available) : 1 / Math.ceil(1 / available);
}
