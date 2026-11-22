import test from 'node:test';
import assert from 'node:assert/strict';
import { stepHubAvatarMotion } from './HubAvatarMotion.ts';

test('motion advances exactly one finite-budget segment', () => {
  const result = stepHubAvatarMotion({ x: 0, z: 0 }, [{ x: 100, z: 0 }], 25);
  assert.deepEqual(result.position, { x: 25, z: 0 });
  assert.equal(result.completedWaypoints, 0);
  assert.equal(result.arrived, false);
  assert.equal(result.traveled, 25);
  assert.ok(Math.abs(result.headingRadians! - Math.PI / 2) < 1e-9);
});

test('a single slow frame consumes multiple short waypoints without overshooting', () => {
  const result = stepHubAvatarMotion(
    { x: 0, z: 0 },
    [{ x: 10, z: 0 }, { x: 10, z: 10 }, { x: 30, z: 10 }],
    35,
  );
  assert.deepEqual(result.position, { x: 25, z: 10 });
  assert.equal(result.completedWaypoints, 2);
  assert.equal(result.traveled, 35);
  assert.equal(result.arrived, false);
});

test('arriving at the final waypoint clamps the position and clears the movement state', () => {
  const result = stepHubAvatarMotion({ x: 0, z: 0 }, [
    { x: 10, z: 0 }, { x: 10, z: 10 },
  ], 100);
  assert.deepEqual(result.position, { x: 10, z: 10 });
  assert.equal(result.completedWaypoints, 2);
  assert.equal(result.traveled, 20);
  assert.equal(result.arrived, true);
});

test('zero-budget frames can consume duplicate waypoints but never move', () => {
  const result = stepHubAvatarMotion({ x: 5, z: 5 }, [
    { x: 5, z: 5 }, { x: 15, z: 5 },
  ], 0);
  assert.deepEqual(result.position, { x: 5, z: 5 });
  assert.equal(result.completedWaypoints, 1);
  assert.equal(result.headingRadians, null);
  assert.equal(result.traveled, 0);
});

test('empty routes and no-op travel terminate immediately', () => {
  const empty = stepHubAvatarMotion({ x: 2, z: 4 }, [], 20);
  assert.equal(empty.arrived, true);
  assert.deepEqual(empty.position, { x: 2, z: 4 });
  assert.equal(empty.traveled, 0);
});

test('motion is frame-invariant under equivalent distance budgets', () => {
  const route = [{ x: 10, z: 0 }, { x: 10, z: 10 }, { x: 30, z: 10 }];
  const single = stepHubAvatarMotion({ x: 0, z: 0 }, route, 22);
  const first = stepHubAvatarMotion({ x: 0, z: 0 }, route, 12);
  const second = stepHubAvatarMotion(first.position, route.slice(first.completedWaypoints), 10);
  assert.ok(Math.abs(second.position.x - single.position.x) < 1e-9);
  assert.ok(Math.abs(second.position.z - single.position.z) < 1e-9);
});

test('invalid movement is rejected deterministically', () => {
  assert.throws(() => stepHubAvatarMotion({ x: NaN, z: 0 }, [], 0), RangeError);
  assert.throws(() => stepHubAvatarMotion({ x: 0, z: 0 }, [{ x: 1, z: Infinity }], 1), RangeError);
  assert.throws(() => stepHubAvatarMotion({ x: 0, z: 0 }, [], -1), RangeError);
  assert.throws(() => stepHubAvatarMotion({ x: 0, z: 0 }, [], Infinity), RangeError);
});

test('re-targeting begins from current ground position, not the old route origin', () => {
  const first = stepHubAvatarMotion({ x: 0, z: 0 }, [{ x: 100, z: 0 }], 40);
  const second = stepHubAvatarMotion(first.position, [{ x: 40, z: 40 }], 10);
  assert.deepEqual(second.position, { x: 40, z: 10 });
});
