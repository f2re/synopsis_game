import assert from 'node:assert/strict';
import test from 'node:test';
import { HUB_GEOMETRY_LOCK_V1, validateGeometryLock } from './geometryLock.ts';

test('Geometry Lock v1 satisfies canonical Hub invariants', () => {
  assert.deepEqual(validateGeometryLock(HUB_GEOMETRY_LOCK_V1), []);
});

test('Geometry Lock v1 has stable unique building IDs', () => {
  const ids = HUB_GEOMETRY_LOCK_V1.buildings.map((building) => building.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('codepost'));
  assert.ok(ids.includes('archive'));
  assert.ok(ids.includes('radar'));
});
