/** Pure, testable URL-to-pixel-shader configuration (no Phaser/Three imports). */
export interface PixelPostSettings {
  palette: boolean;
  dither: boolean;
  ditherSky: boolean;
  edges: boolean;
  /** Mix amount for depth/normal edges, normalized to [0, 0.75]. */
  outlineStrength: number;
  /** Bayer perturbation before palette lookup, normalized to [0, 0.05]. */
  ditherStrength: number;
}

export const DEFAULT_PIXEL_POST_SETTINGS: Readonly<PixelPostSettings> = Object.freeze({
  palette: true,
  dither: false,
  ditherSky: false,
  edges: true,
  outlineStrength: 0.52,
  ditherStrength: 0.028,
});

function readBounded(query: URLSearchParams, key: string, fallback: number, max: number): number {
  const raw = query.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(0, value));
}

/**
 * Diagnostic flags are opt-in and never modify Geometry Lock, gameplay,
 * authoritative weather observations or the production legacy2d default.
 */
export function resolvePixelPostSettings(query: URLSearchParams): PixelPostSettings {
  return {
    palette: query.get('pixelPalette') !== '0',
    dither: query.get('pixelDither') === '1',
    ditherSky: query.get('pixelDitherSky') === '1',
    edges: query.get('pixelEdges') !== '0',
    outlineStrength: readBounded(query, 'pixelOutlineStrength', DEFAULT_PIXEL_POST_SETTINGS.outlineStrength, 0.75),
    ditherStrength: readBounded(query, 'pixelDitherStrength', DEFAULT_PIXEL_POST_SETTINGS.ditherStrength, 0.05),
  };
}
