import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isThreeHubRenderer,
  resolveHubRendererMode,
  selectSupportedHubRendererMode,
  supportsWebGL2,
} from './hubRendererMode.ts';

test('legacy renderer remains the safe opt-out default', () => {
  assert.equal(resolveHubRendererMode(''), 'legacy2d');
  assert.equal(resolveHubRendererMode('?hubRenderer=unexpected'), 'legacy2d');
  assert.equal(resolveHubRendererMode('?hubRenderer=legacy2d'), 'legacy2d');
  assert.equal(isThreeHubRenderer('legacy2d'), false);
});

test('explicit three2d flag and renderer alias select the experimental renderer', () => {
  assert.equal(resolveHubRendererMode('?hubRenderer=three2d'), 'three2d');
  assert.equal(resolveHubRendererMode('?renderer=3d'), 'three2d');
  assert.equal(resolveHubRendererMode('?hubRenderer=legacy2d&renderer=three2d'), 'legacy2d');
  assert.equal(isThreeHubRenderer('three2d'), true);
});

test('capability gate falls back before 3D scene selection', () => {
  assert.equal(selectSupportedHubRendererMode('three2d', false), 'legacy2d');
  assert.equal(selectSupportedHubRendererMode('three2d', true), 'three2d');
  assert.equal(selectSupportedHubRendererMode('legacy2d', false), 'legacy2d');
});

test('headless runtime without DOM never probes WebGL2', () => {
  assert.equal(supportsWebGL2(), false);
});
