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
