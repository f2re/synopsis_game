import assert from 'node:assert/strict';
import test from 'node:test';
import { hubGroundRectObstacle } from './HubCollision.ts';
import {
  HUB_COLLISION_REVIEW_APPROACHES,
  HUB_COLLISION_REVIEW_CLEARANCE,
  HUB_COLLISION_REVIEW_SPAWN,
  HUB_COLLISION_REVIEW_WORLD,
} from './HubCollisionReviewLayout.ts';
import { previewHubProceduralFootprints } from './HubSpatialAudit.ts';
import { planHubRoute } from './HubNavigation.ts';
import { stepHubAvatarMotion } from './HubAvatarMotion.ts';
import { HubVisitQueue } from './HubVisitQueue.ts';

const world = HUB_COLLISION_REVIEW_WORLD;
const obstacles = [
  hubGroundRectObstacle('water', world.waterBand),
  ...previewHubProceduralFootprints(world),
];
const options = { obstacles, clearance: HUB_COLLISION_REVIEW_CLEARANCE };
const toGround = (points: readonly { x: number; y: number }[]) => points.map(p => ({ x: p.x, z: p.y }));

test('full visit: safe routing, incremental walking, then exactly one interaction', () => {
  const goal = HUB_COLLISION_REVIEW_APPROACHES.lab;
  const route = planHubRoute(world.paths, HUB_COLLISION_REVIEW_SPAWN, goal, options);
  assert.ok(route, 'lab should be reachable in accepted test geometry');

  const queue = new HubVisitQueue();
  assert.equal(queue.request('lab', 'moving', true), undefined);
  let current = { x: HUB_COLLISION_REVIEW_SPAWN.x, z: HUB_COLLISION_REVIEW_SPAWN.y };
  let remaining = toGround(route.slice(1));
  let arrivedEvents: string[] = [];

  for (let frame = 0; frame < 2500 && remaining.length; frame++) {
    const step = stepHubAvatarMotion(current, remaining, 105 / 60);
    current = step.position;
    remaining = remaining.slice(step.completedWaypoints);
    const arrived = queue.onMovementUpdate(remaining.length > 0);
    if (arrived) arrivedEvents.push(arrived);
  }
  assert.deepEqual(current, { x: goal.x, z: goal.y });
  assert.deepEqual(arrivedEvents, ['lab']);
  assert.equal(queue.onMovementUpdate(false), undefined);
});

test('mid-journey retarget opens only the newest building after a valid reroute', () => {
  const queue = new HubVisitQueue();
  const firstRoute = planHubRoute(
    world.paths, HUB_COLLISION_REVIEW_SPAWN, HUB_COLLISION_REVIEW_APPROACHES.lab, options,
  );
  assert.ok(firstRoute);
  assert.equal(queue.request('lab', 'moving', true), undefined);

  const partial = stepHubAvatarMotion(
    { x: HUB_COLLISION_REVIEW_SPAWN.x, z: HUB_COLLISION_REVIEW_SPAWN.y },
    toGround(firstRoute.slice(1)),
    40,
  );
  const mid = { x: partial.position.x, y: partial.position.z };
  const next = planHubRoute(world.paths, mid, HUB_COLLISION_REVIEW_APPROACHES.archive, options);
  assert.ok(next, 'retarget from mid-route must keep a safe path');

  assert.equal(queue.request('archive', 'moving', true), undefined);
  const complete = stepHubAvatarMotion(partial.position, toGround(next.slice(1)), 10000);
  assert.equal(complete.arrived, true);
  assert.equal(queue.onMovementUpdate(false), 'archive');
  assert.equal(queue.onMovementUpdate(false), undefined);
});

test('a blocked retarget cancels pending building interactions', () => {
  const queue = new HubVisitQueue();
  queue.request('archive', 'moving', true);
  const denied = planHubRoute(
    world.paths, HUB_COLLISION_REVIEW_SPAWN, { x: 320, y: 250 }, options,
  );
  assert.equal(denied, null);
  assert.equal(queue.request('lab', 'unreachable', true), undefined);
  assert.equal(queue.onMovementUpdate(false), undefined);
});
