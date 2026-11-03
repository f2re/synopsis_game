import test from 'node:test';
import assert from 'node:assert/strict';
import { planHubRoute } from './HubNavigation.ts';
import type { HubPathDefinition } from './HubWorldDefinition.ts';

const cross: HubPathDefinition[] = [
  { id: 'horizontal', width: 8, points: [{ x: 0, y: 50 }, { x: 100, y: 50 }] },
  { id: 'vertical', width: 8, points: [{ x: 50, y: 0 }, { x: 50, y: 100 }] },
];

test('connects paths at a crossing inside segments, not only at authored vertices', () => {
  const route = planHubRoute(cross, { x: 2, y: 50 }, { x: 50, y: 98 });
  assert.ok(route);
  assert.deepEqual(route[0], { x: 2, y: 50 });
  assert.deepEqual(route.at(-1), { x: 50, y: 98 });
  assert.ok(route.some((point) => Math.abs(point.x - 50) < 1e-6 && Math.abs(point.y - 50) < 1e-6));
});

test('walks through path corners and allows short connectors to door anchors', () => {
  const paths: HubPathDefinition[] = [{ id: 'turn', width: 8, points: [
    { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 },
  ] }];
  const route = planHubRoute(paths, { x: 0, y: -5 }, { x: 55, y: 50 });
  assert.ok(route);
  assert.ok(route.some(p => p.x === 50 && p.y === 0));
  assert.deepEqual(route[0], { x: 0, y: -5 });
  assert.deepEqual(route.at(-1), { x: 55, y: 50 });
});

test('does not invent a road between nearby disconnected paths', () => {
  const paths: HubPathDefinition[] = [
    { id: 'a', width: 8, points: [{ x: 0, y: 0 }, { x: 0, y: 50 }] },
    { id: 'b', width: 8, points: [{ x: 20, y: 0 }, { x: 20, y: 50 }] },
  ];
  assert.equal(planHubRoute(paths, { x: 0, y: 0 }, { x: 20, y: 50 }), null);
});

test('rejects off-path destinations instead of moving through arbitrary scenery', () => {
  assert.equal(planHubRoute(cross, { x: 500, y: 500 }, { x: 50, y: 25 }), null);
});

test('connects collinear overlapping segments', () => {
  const paths: HubPathDefinition[] = [
    { id: 'a', width: 4, points: [{ x: 0, y: 0 }, { x: 80, y: 0 }] },
    { id: 'b', width: 4, points: [{ x: 60, y: 0 }, { x: 140, y: 0 }] },
  ];
  assert.ok(planHubRoute(paths, { x: 0, y: 0 }, { x: 140, y: 0 }));
});

test('produces deterministic routes across repeated calls', () => {
  const a = planHubRoute(cross, { x: 10, y: 50 }, { x: 50, y: 89 });
  const b = planHubRoute(cross, { x: 10, y: 50 }, { x: 50, y: 89 });
  assert.deepEqual(a, b);
});

test('rejects degenerate path geometry', () => {
  const bad: HubPathDefinition[] = [{ id: 'bad', width: 5, points: [{ x: 1, y: 1 }, { x: 1, y: 1 }] }];
  assert.throws(() => planHubRoute(bad, { x: 0, y: 0 }, { x: 2, y: 2 }), /degenerate/);
});

test('identical start/goal is a stationary route', () => {
  assert.deepEqual(planHubRoute(cross, { x: 22, y: 50 }, { x: 22, y: 50 }), [{ x: 22, y: 50 }]);
});

test('canonical Hub path junctions route between plaza and lab without direct shortcut', () => {
  const paths: HubPathDefinition[] = [
    { id: 'river-terrace', width: 7, points: [
      { x: 52, y: 159 }, { x: 205, y: 161 }, { x: 320, y: 160 },
      { x: 440, y: 162 }, { x: 588, y: 160 },
    ] },
    { id: 'plaza-spine', width: 11, points: [
      { x: 320, y: 151 }, { x: 320, y: 214 }, { x: 320, y: 276 }, { x: 320, y: 326 },
    ] },
    { id: 'plaza-west', width: 10, points: [
      { x: 94, y: 286 }, { x: 192, y: 278 }, { x: 320, y: 276 },
    ] },
    { id: 'plaza-east', width: 10, points: [
      { x: 320, y: 276 }, { x: 447, y: 280 }, { x: 574, y: 292 },
    ] },
  ];
  const route = planHubRoute(paths, { x: 320, y: 316 }, { x: 519, y: 221 });
  assert.ok(route);
  assert.deepEqual(route[0], { x: 320, y: 316 });
  assert.deepEqual(route.at(-1), { x: 519, y: 221 });
  assert.ok(route.some(point => Math.abs(point.x - 320) < 1e-5 && Math.abs(point.y - 160) < 1e-5));
});
