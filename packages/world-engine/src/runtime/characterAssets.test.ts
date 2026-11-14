import test from 'node:test';
import assert from 'node:assert/strict';
import { characterFrameAtTime, parseCharacterManifest } from './characterAssets.ts';

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
  Object.assign(pack.actors[0], { motion: { type: 'walk-across', direction: 'left', speed: 22 } });
  assert.throws(() => parseCharacterManifest(pack), /Ambient walk/);
});
