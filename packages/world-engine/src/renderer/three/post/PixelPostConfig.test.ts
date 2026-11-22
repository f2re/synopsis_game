import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PIXEL_POST_SETTINGS,
  resolvePixelPostSettings,
} from './PixelPostConfig.ts';

test('pixel shader production default is stable and Bayer dithering is opt-in', () => {
  assert.deepEqual(resolvePixelPostSettings(new URLSearchParams()), DEFAULT_PIXEL_POST_SETTINGS);
  assert.equal(resolvePixelPostSettings(new URLSearchParams('pixelDither=0')).dither, false);
  assert.equal(resolvePixelPostSettings(new URLSearchParams('pixelDither=1')).dither, true);
  assert.equal(resolvePixelPostSettings(new URLSearchParams('pixelDither=1')).ditherSky, false);
  assert.equal(resolvePixelPostSettings(new URLSearchParams('pixelDither=1&pixelDitherSky=1')).ditherSky, true);
});

test('independent palette, edge and dither states have unambiguous switches', () => {
  const value = resolvePixelPostSettings(new URLSearchParams('pixelPalette=0&pixelEdges=0&pixelDither=1'));
  assert.deepEqual({ palette: value.palette, edges: value.edges, dither: value.dither },
    { palette: false, edges: false, dither: true });
});

test('pixel shader strength inputs clamp to safe review bounds', () => {
  const low = resolvePixelPostSettings(new URLSearchParams('pixelOutlineStrength=-10&pixelDitherStrength=-0.2'));
  assert.equal(low.outlineStrength, 0);
  assert.equal(low.ditherStrength, 0);
  const high = resolvePixelPostSettings(new URLSearchParams('pixelOutlineStrength=999&pixelDitherStrength=9'));
  assert.equal(high.outlineStrength, 0.75);
  assert.equal(high.ditherStrength, 0.05);
  const custom = resolvePixelPostSettings(new URLSearchParams('pixelOutlineStrength=0.25&pixelDitherStrength=0.015'));
  assert.equal(custom.outlineStrength, 0.25);
  assert.equal(custom.ditherStrength, 0.015);
});

test('NaN, infinity and empty shader strength inputs fall back safely', () => {
  for (const raw of ['NaN', 'Infinity', '-Infinity', 'not-a-number', '']) {
    const got = resolvePixelPostSettings(
      new URLSearchParams({ pixelOutlineStrength: raw, pixelDitherStrength: raw }),
    );
    assert.equal(got.outlineStrength, DEFAULT_PIXEL_POST_SETTINGS.outlineStrength, raw);
    assert.equal(got.ditherStrength, DEFAULT_PIXEL_POST_SETTINGS.ditherStrength, raw);
  }
});

test('query parsing is deterministic and does not mutate the URLSearchParams input', () => {
  const q = new URLSearchParams('pixelDither=1&pixelOutlineStrength=0.4');
  const baseline = q.toString();
  assert.deepEqual(resolvePixelPostSettings(q), resolvePixelPostSettings(q));
  assert.equal(q.toString(), baseline);
});
