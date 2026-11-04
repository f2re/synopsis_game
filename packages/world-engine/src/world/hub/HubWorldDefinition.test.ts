import assert from 'node:assert/strict';
import test from 'node:test';
import { HUB_WORLD_DEFINITION_V1 } from './HubWorldDefinition.ts';
import { hubGroundRectObstacle } from './HubCollision.ts';
import { planHubRoute } from './HubNavigation.ts';

const hub = HUB_WORLD_DEFINITION_V1;
const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;

test('accepted BATCH-12 Geometry Lock supersedes PR #86 migration snapshot', () => {
  assert.equal(hub.status, 'accepted');
  assert.equal(hub.geometryLockId, 'hub.geometry.lock_v1');
  assert.deepEqual(hub.logicalSize, { width: 640, height: 360 });
  assert.equal(hub.horizonY, 92);
  assert.equal(hub.waterlineY, 92);
  assert.deepEqual(hub.waterBand, { x: 0, y: 92, width: 640, height: 55 });
  assert.deepEqual(hub.safeZone, { x: 48, y: 42, width: 544, height: 273 });
});

test('semantic building and path IDs are nonempty and unique', () => {
  assert.ok(unique(hub.buildings.map(x => x.id)));
  assert.ok(unique(hub.buildings.map(x => x.interactionId)));
  assert.ok(unique(hub.paths.map(x => x.id)));
  assert.equal(hub.buildings.length, 8);
  for (const id of ['radar', 'cartography', 'codepost', 'archive', 'lab', 'hall', 'meteo-site', 'canteen']) {
    assert.ok(hub.buildings.some(x => x.id === id), id);
  }
});

test('every accepted building has finite on-canvas entrance and valid screen silhouette', () => {
  const { width, height } = hub.logicalSize;
  for (const b of hub.buildings) {
    assert.ok(Number.isFinite(b.entrance.x) && Number.isFinite(b.entrance.y), b.id);
    assert.ok(b.entrance.x >= 0 && b.entrance.x <= width, b.id);
    assert.ok(b.entrance.y >= 0 && b.entrance.y <= height, b.id);
    assert.ok(b.bounds.width > 0 && b.bounds.height > 0, b.id);
    assert.ok(b.bounds.x >= 0 && b.bounds.x + b.bounds.width <= width, b.id);
    assert.ok(b.bounds.y >= 0 && b.bounds.y + b.bounds.height <= height, b.id);
  }
});

test('all eight entrances are graph-reachable from canonical spawn without entering water', () => {
  const water = hubGroundRectObstacle('accepted-water', hub.waterBand);
  for (const building of hub.buildings) {
    const route = planHubRoute(hub.paths, { x: 320, y: 316 }, building.entrance, {
      obstacles: [water],
      clearance: 2,
    });
    assert.ok(route, 'unreachable entrance: ' + building.id);
    assert.deepEqual(route.at(-1), building.entrance);
  }
});

test('all path centers are finite and avoid accepted water band with clearance', () => {
  for (const path of hub.paths) {
    assert.ok(path.points.length >= 2 && path.width > 0, path.id);
    for (const point of path.points) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), path.id);
      assert.ok(point.x >= 0 && point.x <= 640 && point.y >= 0 && point.y <= 360, path.id);
      assert.ok(point.y > hub.waterBand.y + hub.waterBand.height, 'path inside water: ' + path.id);
    }
  }
});
