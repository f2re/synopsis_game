import { createHubObstacleGuard, type HubGroundObstacle } from './HubCollision.ts';
import { previewHubStructureFootprint } from './HubStructureGeometry.ts';
import type { HubPoint, HubWorldDefinition } from './HubWorldDefinition.ts';

export interface HubSpatialConflict {
  structureId: string;
  pathId: string;
  segmentIndex: number;
  start: HubPoint;
  end: HubPoint;
}

/** Derive the actual procedural box footprints, NOT approved collision shapes.
 * Used for migration diagnostics and Art Director review only.
 */
export function previewHubProceduralFootprints(world: HubWorldDefinition): HubGroundObstacle[] {
  const structures = world.buildings.map(b => previewHubStructureFootprint(b.id, b.bounds, b.entrance));
  const operations = world.landmarks.find(x => x.kind === 'operations');
  if (operations) structures.push(previewHubStructureFootprint('operations', operations.bounds, operations.anchor));
  return structures;
}

/**
 * Detect path centrelines that touch procedural building meshes.
 * Deliberately never modifies Geometry Lock, moves doors, or enables
 * unaccepted footprints in runtime collision.
 */
export function auditHubProceduralPathCrossings(world: HubWorldDefinition): HubSpatialConflict[] {
  const conflicts: HubSpatialConflict[] = [];
  for (const footprint of previewHubProceduralFootprints(world)) {
    const blocked = createHubObstacleGuard([footprint]);
    for (const path of world.paths) {
      for (let i = 1; i < path.points.length; i += 1) {
        const start = path.points[i - 1];
        const end = path.points[i];
        if (blocked(start, end)) conflicts.push({
          structureId: footprint.id.slice('structure.'.length),
          pathId: path.id,
          segmentIndex: i - 1,
          start: { ...start },
          end: { ...end },
        });
      }
    }
  }
  return conflicts;
}
