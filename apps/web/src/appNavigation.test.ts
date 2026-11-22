import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveReturnPath, characterReturnPath, safeReturnPath, screenSurface } from './appNavigation.ts';

test('R08 is an explicit silent preview and normal station routes retain their atmosphere', () => {
  assert.equal(screenSurface('/art/r08'), 'silent');
  assert.equal(screenSurface('/'), 'campus');
  assert.equal(screenSurface('/campus'), 'campus');
  assert.equal(screenSurface('/archive'), 'library');
  assert.equal(safeReturnPath('/art/r08'), '/art/r08');
});

test('the first level is a study surface and character return is limited to its exact route', () => {
  assert.equal(screenSurface('/level-one'), 'study');
  assert.equal(characterReturnPath('section=appearance&returnTo=/level-one'), '/level-one');
  assert.equal(characterReturnPath('returnTo=%2Flevel-one'), '/level-one');
  for (const search of ['', 'returnTo=/admin', 'returnTo=https://example.com', 'returnTo=//example.com', 'returnTo=/level-one/../admin', 'returnTo=/shift']) assert.equal(characterReturnPath(search), '/');
  assert.equal(safeReturnPath('/level-one'), '/', 'The generic reading return does not begin accepting active game routes.');
});

test('only the exact preview return is accepted by the existing reading room', () => {
  assert.equal(archiveReturnPath('returnTo=/art/r08'), '/art/r08');
  assert.equal(archiveReturnPath('returnTo=%2Fart%2Fr08'), '/art/r08');
  for (const search of ['', 'returnTo=/admin', 'returnTo=https://example.com', 'returnTo=//example.com', 'returnTo=/art/r08/../admin']) {
    assert.equal(archiveReturnPath(search), '/');
  }
  assert.equal(safeReturnPath('https://example.com/art/r08'), '/');
});
