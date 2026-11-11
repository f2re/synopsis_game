import assert from 'node:assert/strict';
import test from 'node:test';
import { avatarWalkwayStep, findAvatarRoute, getAvatarWalkway } from './avatarWalkway.ts';
import { getR01Decor, getR01Layout } from './r01Layout.ts';

test('the fountain route goes around its footprint and rejects unmarked ground', () => {
  const walkway = getAvatarWalkway(false);
  assert.deepEqual(findAvatarRoute(walkway, walkway.spawn, { x: 400, y: 490 }), [
    { x: 544, y: 520 }, { x: 400, y: 520 }, { x: 400, y: 490 },
  ]);
  assert.deepEqual(findAvatarRoute(walkway, walkway.spawn, { x: 478, y: 490 }), []);
  assert.deepEqual(findAvatarRoute(walkway, walkway.spawn, { x: 660, y: 360 }), []);
  assert.deepEqual(findAvatarRoute(walkway, walkway.spawn, { x: Infinity, y: 490 }), []);
  assert.deepEqual(findAvatarRoute(walkway, { x: 478, y: 490 }, { x: 400, y: 490 }), []);
  assert.deepEqual(findAvatarRoute(walkway, walkway.spawn, walkway.spawn), []);
});

test('keyboard steps follow their direction on the path and stop at a corner', () => {
  const walkway = getAvatarWalkway(false);
  assert.deepEqual(avatarWalkwayStep(walkway, walkway.spawn, 'up'), { x: 544, y: 454 });
  assert.deepEqual(avatarWalkwayStep(walkway, walkway.spawn, 'down'), { x: 544, y: 520 });
  assert.equal(avatarWalkwayStep(walkway, walkway.spawn, 'left'), null);
  assert.equal(avatarWalkwayStep(walkway, walkway.spawn, 'right'), null);
  assert.deepEqual(avatarWalkwayStep(walkway, { x: 544, y: 520 }, 'left'), { x: 508, y: 520 });
});

for (const portrait of [false, true]) test(`${portrait ? 'portrait' : 'landscape'} path has clearance from every authored building and ground prop`, () => {
  const walkway = getAvatarWalkway(portrait);
  const layout = getR01Layout(portrait ? 390 : 1440, portrait ? 844 : 900);
  const obstacles = [
    ...layout.buildings,
    ...getR01Decor(portrait).map((prop) => ({ x: prop.x - prop.width / 2, y: prop.y - (prop.id === 'prop-fountain' ? 28 : prop.id === 'prop-bench' ? 12 : 4),
      width: prop.width, height: prop.id === 'prop-fountain' ? 28 : prop.id === 'prop-bench' ? 12 : 4 })),
  ];
  const clearance = 6;
  for (const [a, b] of walkway.edges) {
    const from = walkway.nodes[a], to = walkway.nodes[b], distance = Math.hypot(to.x - from.x, to.y - from.y);
    for (let step = 0; step <= distance; step++) {
      const x = from.x + (to.x - from.x) * step / distance, y = from.y + (to.y - from.y) * step / distance;
      for (const obstacle of obstacles) assert.ok(!(x > obstacle.x - clearance && x < obstacle.x + obstacle.width + clearance &&
        y > obstacle.y - clearance && y < obstacle.y + obstacle.height + clearance), `Foot ${x},${y} intersects ${JSON.stringify(obstacle)}`);
    }
  }
  for (const target of walkway.nodes) assert.ok(findAvatarRoute(walkway, walkway.spawn, target).length, 'Every authored waypoint is reachable');
});
