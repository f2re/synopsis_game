import assert from 'node:assert/strict';
import test from 'node:test';
import { createHubObstacleGuard, hubGroundRectObstacle } from './HubCollision.ts';
import {
  HUB_COLLISION_REVIEW_APPROACHES,
  HUB_COLLISION_REVIEW_CLEARANCE,
  HUB_COLLISION_REVIEW_SPAWN,
  HUB_COLLISION_REVIEW_WORLD,
  reviewApproachForEntrance,
} from './HubCollisionReviewLayout.ts';
import { HUB_WORLD_DEFINITION_V1 } from './HubWorldDefinition.ts';
import { planHubRoute } from './HubNavigation.ts';
import { auditHubProceduralPathCrossings, previewHubProceduralFootprints } from './HubSpatialAudit.ts';

const accepted = HUB_WORLD_DEFINITION_V1;
const proposal = HUB_COLLISION_REVIEW_WORLD;
const barriers = [
  hubGroundRectObstacle('hub-water', proposal.waterBand),
  ...previewHubProceduralFootprints(proposal),
];
const blocked = createHubObstacleGuard(barriers, HUB_COLLISION_REVIEW_CLEARANCE);
const targetIds = accepted.buildings.map(building => building.id);

function routed(start: { x: number; y: number }, goal: { x: number; y: number }) {
  return planHubRoute(proposal.paths, start, goal, {
    obstacles: barriers,
    clearance: HUB_COLLISION_REVIEW_CLEARANCE,
  });
}

test('review layout is distinct from the accepted immutable Geometry Lock', () => {
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.geometryLockId, 'hub.geometry.lock_v1');
  assert.equal(proposal.status, 'migration-baseline');
  assert.notEqual(proposal.geometryLockId, accepted.geometryLockId);
  assert.notEqual(proposal.paths, accepted.paths);
  assert.deepEqual(proposal.buildings, accepted.buildings);
  assert.deepEqual(proposal.landmarks, accepted.landmarks);
  assert.deepEqual(proposal.waterBand, accepted.waterBand);
  assert.deepEqual(proposal.logicalSize, { width: 640, height: 360 });
  assert.equal(accepted.paths.length, 4);
  assert.equal(proposal.paths.length, 7);
});

test('candidate has no pedestrian centreline crossing actual box footprints', () => {
  const conflicts = auditHubProceduralPathCrossings(proposal);
  assert.deepEqual(conflicts, [], JSON.stringify(conflicts));
});

test('every complete path segment has at least 5px clearance from buildings and water', () => {
  for (const path of proposal.paths) {
    for (let i = 1; i < path.points.length; i++) {
      assert.equal(
        blocked(path.points[i - 1], path.points[i]), false,
        'path blocked: ' + path.id + ' segment ' + (i - 1),
      );
    }
  }
});

test('each of eight entrances is mapped to a collision-free external approach', () => {
  assert.equal(Object.keys(HUB_COLLISION_REVIEW_APPROACHES).length, 8);
  for (const building of accepted.buildings) {
    const approach = HUB_COLLISION_REVIEW_APPROACHES[building.id];
    assert.ok(approach, building.id);
    assert.equal(blocked(approach, approach), false, 'approach occupied: ' + building.id);
    assert.deepEqual(reviewApproachForEntrance(building.entrance), approach);
    assert.notDeepEqual(approach, building.entrance);
  }
  const arbitrary = { x: 620, y: 330 };
  assert.deepEqual(reviewApproachForEntrance(arbitrary), arbitrary);
});

test('canonical start can reach all eight buildings without intersecting occupied ground', () => {
  for (const id of targetIds) {
    const target = HUB_COLLISION_REVIEW_APPROACHES[id];
    const route = routed(HUB_COLLISION_REVIEW_SPAWN, target);
    assert.ok(route, 'unreachable: ' + id);
    assert.deepEqual(route[0], HUB_COLLISION_REVIEW_SPAWN);
    assert.deepEqual(route.at(-1), target);
    for (let i = 1; i < route.length; i++) {
      assert.equal(blocked(route[i - 1], route[i]), false, 'unsafe ' + id + ' segment ' + i);
    }
  }
});

test('all eight facility destinations are mutually navigable', () => {
  for (const fromId of targetIds) {
    for (const toId of targetIds) {
      const from = HUB_COLLISION_REVIEW_APPROACHES[fromId];
      const to = HUB_COLLISION_REVIEW_APPROACHES[toId];
      const route = routed(from, to);
      assert.ok(route, fromId + ' -> ' + toId + ' disconnected');
      assert.deepEqual(route[0], from);
      assert.deepEqual(route.at(-1), to);
      for (let i = 1; i < route.length; i++) {
        assert.equal(blocked(route[i - 1], route[i]), false, fromId + ' -> ' + toId);
      }
    }
  }
});

test('water and building wall destinations still fail closed in review mode', () => {
  assert.equal(routed(HUB_COLLISION_REVIEW_SPAWN, { x: 320, y: 120 }), null);
  assert.equal(routed(HUB_COLLISION_REVIEW_SPAWN, { x: 320, y: 250 }), null);
  assert.equal(routed(HUB_COLLISION_REVIEW_SPAWN, { x: 330, y: 295 }), null);
});
