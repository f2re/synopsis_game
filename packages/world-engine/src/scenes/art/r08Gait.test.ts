import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCharacterManifest } from '../../runtime/characterAssets.ts';
import { r08ActorClip, r08WalkFrame } from './r08Gait.ts';

const manifest = parseCharacterManifest(JSON.parse(readFileSync(
  new URL('../../../../../apps/web/public/hub/characters/manifest.json', import.meta.url), 'utf8',
)));

test('R08 walk uses alternating eight-frame cels and keeps the accepted clip unchanged', () => {
  const walking = manifest.actors.filter(actor => actor.clips.walk);
  assert.equal(walking.length, 4);
  for (const actor of walking) {
    const original = actor.clips.walk!;
    const revised = r08ActorClip(original);
    assert.notEqual(revised.assetId, original.assetId);
    assert.equal(original.frameCount, 4);
    assert.equal(revised.frameCount, 8);
    assert.equal(revised.frameWidth, original.frameWidth);
    assert.equal(revised.frameHeight, original.frameHeight);
    assert.ok(readFileSync(new URL('../../../../../apps/web/public' + revised.url.split('?')[0], import.meta.url)).length > 100);
  }
});

test('human idle and talk retain the original cycle lengths, facing and frame box', () => {
  for (const actor of manifest.actors) {
    if (actor.id === 'companion.r01.pascal') {
      assert.equal(r08ActorClip(actor.clips.idle), actor.clips.idle);
      continue;
    }
    for (const action of ['idle', 'talk'] as const) {
      const original = actor.clips[action];
      if (!original) continue;
      const revised = r08ActorClip(original);
      assert.notEqual(original.assetId, revised.assetId);
      assert.equal(revised.frameCount, original.frameCount);
      assert.equal(revised.frameWidth, original.frameWidth);
      assert.equal(revised.frameHeight, original.frameHeight);
      assert.equal(revised.facing, original.facing);
      assert.deepEqual(revised.durationsMs, original.durationsMs);
      assert.ok(readFileSync(new URL('../../../../../apps/web/public' + revised.url.split('?')[0], import.meta.url)).length > 100);
    }
  }
});

test('foot contacts alternate every 8 px and phase wraps after a full 16 px stride', () => {
  for (let i = 0; i < 8; i++) {
    assert.equal(r08WalkFrame(i * 2), i);
    assert.equal(r08WalkFrame(i * 2 + 1.99), i);
  }
  assert.equal(r08WalkFrame(16), 0);
  assert.equal(r08WalkFrame(24), 4);
  assert.equal(r08WalkFrame(-1), 0);
  assert.equal(r08WalkFrame(NaN), 0);
});
