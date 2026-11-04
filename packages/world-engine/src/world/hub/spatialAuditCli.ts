import { HUB_WORLD_DEFINITION_V1 } from './HubWorldDefinition.ts';
import { auditHubProceduralPathCrossings, previewHubProceduralFootprints } from './HubSpatialAudit.ts';

// Read-only diagnostic artifact for #91. No automatic geometry mutation.
const world = HUB_WORLD_DEFINITION_V1;
const footprints = previewHubProceduralFootprints(world);
const conflicts = auditHubProceduralPathCrossings(world);
process.stdout.write(JSON.stringify({
  contract: world.geometryLockId,
  status: 'unapproved-procedural-ground-footprint-preview',
  logicalSize: world.logicalSize,
  warning: 'These polygons are derived from renderer box dimensions, not approved player collision shapes. Never enable them automatically.',
  structureCount: footprints.length,
  conflictCount: conflicts.length,
  footprints,
  conflicts,
}, null, 2) + '\n');
