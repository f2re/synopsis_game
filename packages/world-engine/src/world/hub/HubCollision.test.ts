import test from 'node:test';
import assert from 'node:assert/strict';
import { createHubObstacleGuard, hubGroundRectObstacle, type HubGroundObstacle } from './HubCollision.ts';
import { planHubRoute } from './HubNavigation.ts';
import type { HubPathDefinition } from './HubWorldDefinition.ts';

const rectangle = hubGroundRectObstacle('office', { x: 40, y: -5, width: 20, height: 10 });

test('accepted ground rectangle maps to an exact collision polygon', () => {
  assert.deepEqual(rectangle.vertices, [
    { x: 40, y: -5 }, { x: 60, y: -5 },
    { x: 60, y: 5 }, { x: 40, y: 5 },
  ]);
});

test('blocks a straight road crossing a footprint', () => {
  const blocked = createHubObstacleGuard([rectangle]);
  assert.equal(blocked({ x: 0, y: 0 }, { x: 100, y: 0 }), true);
  assert.equal(blocked({ x: 0, y: 20 }, { x: 100, y: 20 }), false);
});

test('blocks travel starting or ending inside a footprint', () => {
  const blocked = createHubObstacleGuard([rectangle]);
  assert.equal(blocked({ x: 50, y: 0 }, { x: 100, y: 40 }), true);
  assert.equal(blocked({ x: 0, y: 40 }, { x: 50, y: 0 }), true);
});

test('treats contact with obstacle boundary as collision', () => {
  const blocked = createHubObstacleGuard([rectangle]);
  assert.equal(blocked({ x: 0, y: 5 }, { x: 100, y: 5 }), true);
  assert.equal(blocked({ x: 0, y: 6 }, { x: 100, y: 6 }), false);
});

test('clearance rejects near misses without touching geometry', () => {
  const blocked = createHubObstacleGuard([rectangle], 2);
  assert.equal(blocked({ x: 0, y: 6 }, { x: 100, y: 6 }), true);
  assert.equal(blocked({ x: 0, y: 10 }, { x: 100, y: 10 }), false);
});

test('rejects malformed and self-crossing obstacle polygons', () => {
  assert.throws(() => createHubObstacleGuard([{ id: 'bad', vertices: [
    { x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 },
  ] }]), /self-intersects|zero area/);
  assert.throws(() => createHubObstacleGuard([{ id: 'tiny', vertices: [
    { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 },
  ] }]), /degenerate/);
  assert.throws(() => hubGroundRectObstacle('negative-width', { x: 0, y: 0, width: -1, height: 2 }), /invalid/);
  assert.throws(() => createHubObstacleGuard([rectangle, rectangle]), /duplicate/);
});

test('rejects nonsensical agent clearance', () => {
  assert.throws(() => createHubObstacleGuard([], -1), /clearance/);
  assert.throws(() => createHubObstacleGuard([], NaN), /clearance/);
});

const singleRoad: HubPathDefinition[] = [
  { id: 'straight', width: 10, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
];

test('route cannot cross a blocking footprint when no detour is present', () => {
  assert.equal(planHubRoute(singleRoad, { x: 0, y: 0 }, { x: 100, y: 0 }, {
    obstacles: [rectangle],
  }), null);
});

test('route finds the authored detour without cutting through a footprint', () => {
  const paths: HubPathDefinition[] = [
    ...singleRoad,
    { id: 'north-detour', width: 10, points: [
      { x: 0, y: 0 }, { x: 0, y: 20 },
      { x: 100, y: 20 }, { x: 100, y: 0 },
    ] },
  ];
  const route = planHubRoute(paths, { x: 0, y: 0 }, { x: 100, y: 0 }, { obstacles: [rectangle] });
  assert.ok(route);
  assert.ok(route.some(point => point.y === 20));
  for (let i = 1; i < route.length; i += 1) {
    assert.equal(createHubObstacleGuard([rectangle])(route[i - 1], route[i]), false);
  }
});

test('blocks final connector through a footprint even when the road is clear', () => {
  const barrier = hubGroundRectObstacle('barrier', { x: 8, y: 4, width: 4, height: 4 });
  assert.equal(planHubRoute(singleRoad, { x: 10, y: 10 }, { x: 30, y: 0 }, {
    obstacles: [barrier], maxConnectorDistance: 20,
  }), null);
});

test('rejects a destination inside a footprint even when on a navigable road', () => {
  assert.equal(planHubRoute(singleRoad, { x: 0, y: 0 }, { x: 50, y: 0 }, {
    obstacles: [rectangle],
  }), null);
});

test('accepted Hub water band is not a walkable shortcut', () => {
  const water: HubGroundObstacle = hubGroundRectObstacle('hub-water', {
    x: 0, y: 92, width: 640, height: 55,
  });
  const paths: HubPathDefinition[] = [{
    id: 'terrace', width: 7, points: [{ x: 52, y: 159 }, { x: 588, y: 160 }],
  }];
  assert.equal(planHubRoute(paths, { x: 320, y: 120 }, { x: 320, y: 159 }, {
    obstacles: [water], clearance: 2,
  }), null);
  assert.ok(planHubRoute(paths, { x: 320, y: 158 }, { x: 500, y: 160 }, {
    obstacles: [water], clearance: 2,
  }));
});
