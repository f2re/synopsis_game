import assert from 'node:assert/strict';
import test from 'node:test';
import { logicalGroundToWorld, worldGroundToLogical } from './orthographicMapping.ts';

const points = [
  { x: 0, y: 0 },
  { x: 320, y: 180 },
  { x: 640, y: 360 },
  { x: 241 * (4 / 3), y: 180 * (4 / 3) },
];

test('canonical logical ground mapping round-trips', () => {
  for (const point of points) {
    const roundTrip = worldGroundToLogical(logicalGroundToWorld(point));
    assert.ok(Math.abs(roundTrip.x - point.x) < 1e-9);
    assert.ok(Math.abs(roundTrip.y - point.y) < 1e-9);
  }
});

test('logical center maps to world origin on ground', () => {
  assert.deepEqual(logicalGroundToWorld({ x: 320, y: 180 }), { x: 0, y: 0, z: 0 });
});
