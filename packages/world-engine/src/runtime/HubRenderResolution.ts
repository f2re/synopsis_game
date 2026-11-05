/**
 * Diagnostic-only Hub 2.5D render targets for G1/G3 reference fidelity review.
 *
 * Geometry Lock, orthographic camera and Phaser input coordinates remain
 * 640×360 regardless of these internal framebuffer dimensions. No arbitrary
 * query-provided sizes: unbounded allocations would allow a URL to exhaust
 * GPU memory. Production remains at 320×180 pending independent art/GPU gates.
 */
export type HubRenderWidth = 320 | 480 | 640;
export type HubRenderHeight = 180 | 270 | 360;

export interface HubRenderResolution {
  readonly width: HubRenderWidth;
  readonly height: HubRenderHeight;
}

const PRESETS: Readonly<Record<HubRenderWidth, HubRenderResolution>> = Object.freeze({
  320: Object.freeze({ width: 320, height: 180 }),
  480: Object.freeze({ width: 480, height: 270 }),
  640: Object.freeze({ width: 640, height: 360 }),
});

export const DEFAULT_HUB_RENDER_RESOLUTION: HubRenderResolution = PRESETS[320];

/**
 * A/B resolution is strictly opt-in on the Three renderer.
 * Invalid, duplicated, missing or out-of-range query values safely resolve
 * to the current production-like default, never trigger dynamic sizing.
 */
export function resolveHubRenderResolution(query: string | URLSearchParams): HubRenderResolution {
  const params = typeof query === 'string'
    ? new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
    : query;
  const values = params.getAll('hubRenderWidth');
  if (values.length !== 1) return DEFAULT_HUB_RENDER_RESOLUTION;
  switch (values[0]) {
    case '320': return PRESETS[320];
    case '480': return PRESETS[480];
    case '640': return PRESETS[640];
    default: return DEFAULT_HUB_RENDER_RESOLUTION;
  }
}
