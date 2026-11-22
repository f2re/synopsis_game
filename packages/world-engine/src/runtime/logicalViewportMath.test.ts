import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateIntegerPassepartout,
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
} from './logicalViewportMath.ts';

test('canonical 2.5D Hub uses 640×360, legacy scenes retain 480×270', () => {
  assert.deepEqual([HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT], [640, 360]);
  assert.deepEqual([WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT], [480, 270]);
});

for (const [name, width, height, logicalWidth, logicalHeight, expected] of [
  ['full HD Hub', 1920, 1080, 640, 360, [3, 0, 0, 1920, 1080]],
  ['800×600 Hub passepartout', 800, 600, 640, 360, [1, 80, 120, 640, 360]],
  ['mobile landscape Hub', 844, 390, 640, 360, [1, 102, 15, 640, 360]],
  ['1024×768 projector Hub', 1024, 768, 640, 360, [1, 192, 204, 640, 360]],
  ['legacy viewport', 800, 600, 480, 270, [1, 160, 165, 480, 270]],
  ['small display crops symmetrically', 320, 180, 640, 360, [1, -160, -90, 640, 360]],
] as const) {
  test(name, () => {
    const fitted = calculateIntegerPassepartout(width, height, logicalWidth, logicalHeight);
    assert.deepEqual([
      fitted.integerScale,
      fitted.viewportX,
      fitted.viewportY,
      fitted.viewportWidth,
      fitted.viewportHeight,
    ], expected);
  });
}

test('invalid logical dimensions and nonfinite screen sizes are rejected', () => {
  assert.throws(() => calculateIntegerPassepartout(800, 600, 0, 360), RangeError);
  assert.throws(() => calculateIntegerPassepartout(800, 600, 640, -1), RangeError);
  assert.throws(() => calculateIntegerPassepartout(NaN, 600, 640, 360), RangeError);
  assert.throws(() => calculateIntegerPassepartout(800, Infinity, 640, 360), RangeError);
});
