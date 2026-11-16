import test from 'node:test';
import assert from 'node:assert/strict';
import { characterFrameAtTime, characterPatrolPose, parseCharacterManifest } from './characterAssets.ts';

function fixture() {
  return {
    version: 1, artAcceptance: 'PASS',
    actors: [{
      id: 'character.observer', label: 'Наблюдатель', role: 'player', displayHeight: 64,
      pivot: [.5, .96875], positions: { landscape: [380, 460], portrait: [240, 550] },
      clips: { idle: {
        assetId: 'sprite.observer.idle', url: '/hub/characters/observer-idle.png',
        frameWidth: 64, frameHeight: 96, frameCount: 3, durationsMs: [100, 200, 300],
      } },
    }],
    equipment: [{ id: 'held.tablet', assetId: 'item.tablet', url: '/hub/characters/tablet.png', displayHeight: 14, anchor: [.2, -.4] }],
  };
}

test('accepted local manifest retains authored pivot, duration and semantic IDs', () => {
  const raw = fixture();
  raw.actors[0].clips.idle.url += '?v=fe219c128faa';
  const pack = parseCharacterManifest(raw);
  assert.equal(pack.actors[0].clips.idle.url, raw.actors[0].clips.idle.url);
  assert.deepEqual(pack.actors[0].pivot, [.5, .96875]);
  assert.deepEqual(pack.actors[0].clips.idle.durationsMs, [100, 200, 300]);
  assert.equal(pack.equipment[0].id, 'held.tablet');
});

test('frame boundaries and full-loop wrap follow source durations independently of frame rate', () => {
  const clip = parseCharacterManifest(fixture()).actors[0].clips.idle;
  for (const [time, frame] of [[0, 0], [99, 0], [100, 1], [299, 1], [300, 2], [599, 2], [600, 0], [700, 1], [-1, 0], [NaN, 0]]) {
    assert.equal(characterFrameAtTime(clip, time), frame, `${time}ms`);
  }
});

test('missing approval, unsafe external paths and malformed frame counts cannot enter loader', () => {
  const pending = fixture(); pending.artAcceptance = 'PENDING';
  assert.throws(() => parseCharacterManifest(pending), /unaccepted/);
  for (const url of ['https://example.com/observer.png', '//example.com/observer.png', '/hub/characters/../../secret.png', '/hub/characters/x.svg', 'data:image/png;base64,AA', '/hub/characters/x.png?v=fe219c128faa&redirect=1']) {
    const pack = fixture(); pack.actors[0].clips.idle.url = url;
    assert.throws(() => parseCharacterManifest(pack), /local asset path/);
  }
  const mismatch = fixture(); mismatch.actors[0].clips.idle.frameCount = 2;
  assert.throws(() => parseCharacterManifest(mismatch), /duration/);
});

test('duplicate identities, incompatible idle/walk frame boxes and unbounded texture packs are rejected', () => {
  const duplicate = fixture(); duplicate.actors.push(structuredClone(duplicate.actors[0]));
  assert.throws(() => parseCharacterManifest(duplicate), /Duplicate/);
  const wrongWalk = fixture();
  Object.assign(wrongWalk.actors[0].clips, { walk: { ...wrongWalk.actors[0].clips.idle, assetId: 'sprite.observer.walk', frameHeight: 128 } });
  assert.throws(() => parseCharacterManifest(wrongWalk), /one frame box/);
  const huge = fixture();
  Object.assign(huge.actors[0].clips.idle, { frameWidth: 512, frameHeight: 512, frameCount: 64, durationsMs: Array(64).fill(100) });
  assert.throws(() => parseCharacterManifest(huge), /texture budget/);
});

test('ambient walking requires NPC role, matching authored direction and a bounded speed', () => {
  const pack = fixture();
  Object.assign(pack.actors[0].clips, { walk: { ...pack.actors[0].clips.idle, assetId: 'sprite.observer.walk', facing: 'right' } });
  Object.assign(pack.actors[0], { motion: { type: 'walk-across', direction: 'right', speed: 22 } });
  assert.throws(() => parseCharacterManifest(pack), /Ambient walk/);
  pack.actors[0].role = 'npc';
  assert.equal(parseCharacterManifest(pack).actors[0].motion?.speed, 22);
  assert.equal(characterPatrolPose(parseCharacterManifest(pack).actors[0], 2500, false), undefined, 'Existing viewport walks do not acquire a patrol implicitly');
  Object.assign(pack.actors[0], { motion: { type: 'walk-across', direction: 'left', speed: 22 } });
  assert.throws(() => parseCharacterManifest(pack), /Ambient walk/);
});

function patrolFixture() {
  const pack = fixture(), actor = pack.actors[0];
  return { ...pack, actors: [{ ...actor, role: 'npc',
    positions: { landscape: [150, 460], portrait: [240, 550] },
    motion: { type: 'walk-across', direction: 'right', speed: 20,
      patrol: { landscape: [100, 200], portrait: [180, 300], depth: 34 } },
    clips: { ...actor.clips, walk: { ...actor.clips.idle, assetId: 'sprite.observer.walk', facing: 'right' } },
  }] };
}

test('patrol bounds contain both authored starts and reject unsafe or incomplete routes', () => {
  const pack = patrolFixture();
  assert.deepEqual(parseCharacterManifest(pack).actors[0].motion?.patrol, pack.actors[0].motion.patrol);
  for (const patrol of [
    {}, { ...pack.actors[0].motion.patrol, landscape: [100, 100] },
    { ...pack.actors[0].motion.patrol, landscape: [200, 100] },
    { ...pack.actors[0].motion.patrol, landscape: [-1, 200] },
    { ...pack.actors[0].motion.patrol, portrait: [180, 481] },
    { ...pack.actors[0].motion.patrol, portrait: [250, 300] },
    { ...pack.actors[0].motion.patrol, depth: NaN },
    { ...pack.actors[0].motion.patrol, depth: 65 },
  ]) {
    const invalid = patrolFixture(); Object.assign(invalid.actors[0].motion, { patrol });
    assert.throws(() => parseCharacterManifest(invalid), /Ambient patrol/);
  }
});

test('patrol turns without teleporting or moving feet in either layout and authored facing', () => {
  for (const direction of ['right', 'left']) {
    const pack = patrolFixture();
    pack.actors[0].motion.direction = direction; pack.actors[0].clips.walk.facing = direction;
    const actor = parseCharacterManifest(pack).actors[0];
    const outward = direction === 'right';
    for (const [portrait, legMs, min, max, start, y] of [
      [false, 2500, 100, 200, 150, 460], [true, 3000, 180, 300, 240, 550],
    ] as const) {
      assert.deepEqual(characterPatrolPose(actor, 0, portrait), { x: start, y, flipX: false });
      assert.deepEqual(characterPatrolPose(actor, legMs, portrait), { x: outward ? max : min, y, flipX: true });
      assert.deepEqual(characterPatrolPose(actor, legMs * 2, portrait), { x: start, y, flipX: true });
      assert.deepEqual(characterPatrolPose(actor, legMs * 3, portrait), { x: outward ? min : max, y, flipX: false });
      assert.deepEqual(characterPatrolPose(actor, legMs * 4, portrait), { x: start, y, flipX: false });
      const before = characterPatrolPose(actor, legMs - 50, portrait)!;
      const after = characterPatrolPose(actor, legMs + 50, portrait)!;
      assert.equal(before.x, after.x, 'The return step reverses at the endpoint without a visible jump');
      assert.notEqual(before.flipX, after.flipX);
    }
  }
});
