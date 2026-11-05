import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_HUB_RENDER_RESOLUTION,
  resolveHubRenderResolution,
} from './HubRenderResolution.ts';

test('default remains 320×180 without a user opt-in', () => {
  assert.deepEqual(resolveHubRenderResolution(''), { width: 320, height: 180 });
  assert.equal(resolveHubRenderResolution('?hubRenderer=three2d'), DEFAULT_HUB_RENDER_RESOLUTION);
});

test('explicit bounded 16:9 resolutions do not change 640×360 world coordinates', () => {
  for (const [input, width, height] of [
    ['?hubRenderWidth=320', 320, 180],
    ['?hubRenderWidth=480', 480, 270],
    ['?hubRenderWidth=640', 640, 360],
  ] as const) {
    const result = resolveHubRenderResolution(input);
    assert.equal(result.width, width);
    assert.equal(result.height, height);
    assert.equal(result.width / result.height, 16 / 9);
    assert.ok(Object.isFrozen(result));
  }
});

test('invalid, repeated or adversarial values always fall back to bounded default', () => {
  for (const input of [
    '?hubRenderWidth=',
    '?hubRenderWidth=0',
    '?hubRenderWidth=640.0',
    '?hubRenderWidth=-320',
    '?hubRenderWidth=641',
    '?hubRenderWidth=10240',
    '?hubRenderWidth=NaN',
    '?hubRenderWidth=1e9',
    '?hubRenderWidth=640&hubRenderWidth=320',
    '?hubRenderWidth=%20',
  ]) {
    assert.equal(resolveHubRenderResolution(input), DEFAULT_HUB_RENDER_RESOLUTION, input);
  }
});

test('other query flags and URLSearchParams do not affect resolution', () => {
  assert.deepEqual(
    resolveHubRenderResolution(new URLSearchParams('hubRenderWidth=480&hubPhase=night&hubLayout=collisionReview')),
    { width: 480, height: 270 },
  );
  assert.deepEqual(resolveHubRenderResolution('hubRenderWidth=640'), { width: 640, height: 360 });
});
