import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateIntegerPassepartout,
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
} from './logicalViewportMath.ts';

test('Hub 640x360 fills a 1920x1080 surface at integer scale 3', () => {
  assert.deepEqual(
    calculateIntegerPassepartout(1920, 1080, HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT),
    {
      integerScale: 3,
      viewportX: 0,
      viewportY: 0,
      viewportWidth: 1920,
      viewportHeight: 1080,
    },
  );
});

test('Hub keeps a centered passepartout on 800x600', () => {
  assert.deepEqual(
    calculateIntegerPassepartout(800, 600, HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT),
    {
      integerScale: 1,
      viewportX: 80,
      viewportY: 120,
      viewportWidth: 640,
      viewportHeight: 360,
    },
  );
});


test('Hub stays centered on a 844x390 mobile-landscape surface', () => {
  assert.deepEqual(
    calculateIntegerPassepartout(844, 390, HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT),
    {
      integerScale: 1,
      viewportX: 102,
      viewportY: 15,
      viewportWidth: 640,
      viewportHeight: 360,
    },
  );
});

test('Hub stays centered on a 1024x768 projector surface', () => {
  assert.deepEqual(
    calculateIntegerPassepartout(1024, 768, HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT),
    {
      integerScale: 1,
      viewportX: 192,
      viewportY: 204,
      viewportWidth: 640,
      viewportHeight: 360,
    },
  );
});


test('legacy 480x270 scenes retain their own logical size', () => {
  assert.deepEqual(
    calculateIntegerPassepartout(800, 600, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT),
    {
      integerScale: 1,
      viewportX: 160,
      viewportY: 165,
      viewportWidth: 480,
      viewportHeight: 270,
    },
  );
});

test('invalid logical dimensions are rejected', () => {
  assert.throws(() => calculateIntegerPassepartout(800, 600, 0, 360), RangeError);
});
