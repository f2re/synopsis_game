import assert from 'node:assert/strict';
import test from 'node:test';
import { createHubObstacleGuard } from './HubCollision.ts';
import { HUB_WORLD_DEFINITION_V1 } from './HubWorldDefinition.ts';
import { HUB_STRUCTURE_GEOMETRY, previewHubStructureFootprint } from './HubStructureGeometry.ts';
import { auditHubProceduralPathCrossings, previewHubProceduralFootprints } from './HubSpatialAudit.ts';

const hub = HUB_WORLD_DEFINITION_V1;

test('all eight facilities plus operations use the shared rendering geometry profiles', () => {
  const ids = [...hub.buildings.map(x => x.id), 'operations'];
  assert.equal(ids.length, 9);
  assert.deepEqual(Object.keys(HUB_STRUCTURE_GEOMETRY).sort(), ids.sort());
});

test('preview footprint uses box geometry dimensions, NOT screen silhouette', () => {
  const building = hub.buildings.find(x => x.id === 'codepost');
  assert.ok(building);
  const footprint = previewHubStructureFootprint(building.id, building.bounds, building.entrance);
  const expectedLeft = building.bounds.x + building.bounds.width * (1 - 0.72) / 2;
  const expectedRight = building.bounds.x + building.bounds.width * (1 + 0.72) / 2;
  assert.ok(Math.abs(footprint.vertices[0].x - expectedLeft) < 1e-6);
  assert.ok(Math.abs(footprint.vertices[1].x - expectedRight) < 1e-6);
  assert.equal(footprint.vertices[0].y, building.entrance.y - 18);
  assert.equal(footprint.vertices[2].y, building.entrance.y);
});

test('art review preview is not silently added to runtime world collision authority', () => {
  assert.equal('collision' in hub, false);
  const polygons = previewHubProceduralFootprints(hub);
  assert.equal(polygons.length, 9);
  for (const polygon of polygons) {
    const isBlocked = createHubObstacleGuard([polygon]);
    const corner = polygon.vertices[0];
    assert.equal(isBlocked(corner, corner), true);
  }
});

test('spatial audit detects known path/building conflicts in the current procedural Hub', () => {
  const conflicts = auditHubProceduralPathCrossings(hub);
  assert.ok(conflicts.length > 0, 'H3D-037 should not be considered accepted');
  const has = (structureId: string, pathId: string) =>
    conflicts.some(x => x.structureId === structureId && x.pathId === pathId);
  assert.ok(has('operations', 'plaza-spine'), 'operations occupies central walkway');
  assert.ok(has('codepost', 'plaza-spine'), 'codepost occupies central walkway');
  assert.ok(has('cartography', 'plaza-west'), 'cartography occupies west walkway');
  assert.ok(has('archive', 'plaza-east'), 'archive occupies east walkway');
  assert.ok(has('hall', 'plaza-east'), 'hall occupies east walkway');
});

test('same deterministic collision report is produced on repeated audits', () => {
  assert.deepEqual(auditHubProceduralPathCrossings(hub), auditHubProceduralPathCrossings(hub));
});
