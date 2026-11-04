import type { HubPoint, HubRect } from './HubWorldDefinition.ts';
import type { HubGroundObstacle } from './HubCollision.ts';

/**
 * Geometry parameters for the currently rendered procedural buildings.
 * These are intentionally distinct from approved Geometry Lock screen
 * silhouettes. The derived ground footprints are AUDIT CANDIDATES only:
 * they must not become live collision obstacles until Art/World acceptance.
 */
export interface HubStructureGeometry {
  readonly widthRatio: number;
  readonly depthPx: number;
  readonly roofPx: number;
  readonly roofMode: 'flat' | 'pyramid' | 'dome';
  readonly windowCount: number;
}

export const HUB_STRUCTURE_GEOMETRY = {
  'operations': { widthRatio: 0.76, depthPx: 27, roofPx: 19, roofMode: 'pyramid', windowCount: 4 },
  'radar': { widthRatio: 0.34, depthPx: 12, roofPx: 26, roofMode: 'dome', windowCount: 1 },
  'cartography': { widthRatio: 0.67, depthPx: 22, roofPx: 17, roofMode: 'pyramid', windowCount: 4 },
  'lab': { widthRatio: 0.62, depthPx: 21, roofPx: 18, roofMode: 'dome', windowCount: 3 },
  'archive': { widthRatio: 0.66, depthPx: 20, roofPx: 17, roofMode: 'pyramid', windowCount: 3 },
  'hall': { widthRatio: 0.72, depthPx: 22, roofPx: 7, roofMode: 'flat', windowCount: 4 },
  'codepost': { widthRatio: 0.72, depthPx: 18, roofPx: 6, roofMode: 'flat', windowCount: 4 },
  'meteo-site': { widthRatio: 0.54, depthPx: 13, roofPx: 8, roofMode: 'pyramid', windowCount: 1 },
  'canteen': { widthRatio: 0.61, depthPx: 14, roofPx: 9, roofMode: 'pyramid', windowCount: 2 },
} as const satisfies Record<string, HubStructureGeometry>;

/** Renderer and spatial auditor consume the SAME dimensions. */
export function geometryForStructure(id: string): HubStructureGeometry {
  return HUB_STRUCTURE_GEOMETRY[id as keyof typeof HUB_STRUCTURE_GEOMETRY] ?? HUB_STRUCTURE_GEOMETRY.canteen;
}

/** Reconstruct the 2D footprint of a procedural box standing on the y=0 plane.
 * This is an unaccepted review artifact, not authoritative building collision.
 * Width/depth rules must remain equal to ThreeHubRenderer.createStructure.
 */
export function previewHubStructureFootprint(
  id: string,
  bounds: HubRect,
  entrance: HubPoint,
): HubGroundObstacle {
  const style = geometryForStructure(id);
  const depthPx = Math.min(style.depthPx, Math.max(8, bounds.height * 0.28));
  const width = Math.max(18, bounds.width * style.widthRatio);
  const centerX = bounds.x + bounds.width / 2;
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const front = entrance.y;
  const back = front - depthPx;
  return {
    id: 'structure.' + id,
    vertices: [
      { x: left, y: back },
      { x: right, y: back },
      { x: right, y: front },
      { x: left, y: front },
    ],
  };
}
