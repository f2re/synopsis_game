export type HubRendererMode = 'legacy2d' | 'three2d';

const THREE_VALUES = new Set(['three2d', 'three', '3d']);
const LEGACY_VALUES = new Set(['legacy2d', 'legacy', '2d']);

/**
 * Runtime migration flag for the Hub renderer.
 *
 * Default remains legacy2d until the 2.5D visual/performance gates are accepted.
 * Development overrides:
 *   ?hubRenderer=three2d
 *   ?hubRenderer=legacy2d
 *   ?renderer=three2d (compatibility shorthand)
 */
export function resolveHubRendererMode(search?: string): HubRendererMode {
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  if (!query) return 'legacy2d';

  const params = new URLSearchParams(query);
  const raw = (params.get('hubRenderer') ?? params.get('renderer') ?? '').trim().toLowerCase();

  if (THREE_VALUES.has(raw)) return 'three2d';
  if (LEGACY_VALUES.has(raw)) return 'legacy2d';
  return 'legacy2d';
}

export function isThreeHubRenderer(mode: HubRendererMode): boolean {
  return mode === 'three2d';
}


/**
 * Three.js/WebGL2 availability gate for the opt-in Hub renderer.
 *
 * Do not switch the Phaser scene or preload path to the 3D variant until the
 * required WebGL2 context has been confirmed. The small probe context is
 * explicitly released so classroom systems with a low context limit are not
 * left with an extra active WebGL context.
 */
export function supportsWebGL2(): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Keep the legacy experience usable when WebGL2 is unavailable. */
export function selectSupportedHubRendererMode(
  requested: HubRendererMode,
  webGL2Available: boolean,
): HubRendererMode {
  return requested === 'three2d' && !webGL2Available ? 'legacy2d' : requested;
}
