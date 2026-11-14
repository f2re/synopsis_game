import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import test from 'node:test';
import { avatarAppearanceKey, composeAvatarPortrait, portraitToPngBytes, validateAvatarPortrait } from './avatarPortrait.js';
import { DEFAULT_AVATAR } from './model.js';
import { decodeRgbaPng, encodeRgbaPng } from './portraitPng.js';

const assetsRoot = resolve(process.cwd(), '../web/public/assets/avatar/modular-r01');

test('saved portrait is deterministic dressed RGBA8, 160 square, with exact nearest-neighbour pixels', async () => {
  const saved = await composeAvatarPortrait(DEFAULT_AVATAR);
  assert.deepEqual(await composeAvatarPortrait({ ...DEFAULT_AVATAR }), saved);
  assert.equal(saved.appearanceKey, avatarAppearanceKey(DEFAULT_AVATAR));
  const manifest = JSON.parse(await readFile(join(assetsRoot, 'manifest.json'), 'utf8')) as { revision: string };
  assert.equal(saved.sourceRevision.split(':')[1], manifest.revision);
  const image = decodeRgbaPng(portraitToPngBytes(saved));
  assert.equal(image.width, 160);
  assert.equal(image.height, 160);
  for (let y = 0; y < 160; y += 2) for (let x = 0; x < 160; x += 2) {
    const at = (y * 160 + x) * 4;
    const pixel = image.pixels.subarray(at, at + 4);
    assert.deepEqual(image.pixels.subarray(at + 4, at + 8), pixel);
    assert.deepEqual(image.pixels.subarray(at + 640, at + 644), pixel);
    assert.deepEqual(image.pixels.subarray(at + 644, at + 648), pixel);
    assert.ok(pixel[3] === 0 || pixel[3] === 255);
  }
  const changed = await composeAvatarPortrait({ ...DEFAULT_AVATAR, top: 'top.sweater', hairColor: 'haircolor.auburn' });
  assert.notEqual(changed.sha256, saved.sha256);
  const companion = await composeAvatarPortrait({ ...DEFAULT_AVATAR, companion: 'companion.tit' });
  assert.equal(companion.sha256, saved.sha256, 'the companion is saved in the profile but is not inserted in a face portrait');
  assert.notEqual(companion.appearanceKey, saved.appearanceKey, 'all 11 slots belong to the snapshot identity');
});

test('PNG codec rejects broken CRC, truncation and unsupported dimensions and round-trips RGBA pixels', async () => {
  const pixels = Buffer.from([255, 0, 0, 255, 0, 0, 0, 0, 0, 128, 255, 255, 40, 60, 80, 255]);
  const encoded = encodeRgbaPng({ width: 2, height: 2, pixels });
  assert.deepEqual(decodeRgbaPng(encoded), { width: 2, height: 2, pixels });
  const badCrc = Buffer.from(encoded); badCrc[29] ^= 1;
  assert.throws(() => decodeRgbaPng(badCrc), /checksum/);
  assert.throws(() => decodeRgbaPng(encoded.subarray(0, encoded.length - 1)), /Truncated|chunk size/);
  assert.throws(() => decodeRgbaPng(Buffer.concat([encoded, Buffer.from([0])])), /end/);
  assert.throws(() => decodeRgbaPng(encoded, 1), /dimensions/);
  assert.throws(() => encodeRgbaPng({ width: 100_000, height: 1, pixels }), /pixels/);
});

test('a stored portrait cannot supply SVG, a remote URL, another outfit, corrupt bytes or oversized data', async () => {
  const saved = await composeAvatarPortrait(DEFAULT_AVATAR);
  assert.deepEqual(validateAvatarPortrait(saved, DEFAULT_AVATAR), saved);
  assert.throws(() => validateAvatarPortrait(saved, { ...DEFAULT_AVATAR, headwear: 'headwear.cap' }), /profile/);
  for (const pngDataUrl of ['https://example.invalid/avatar.png', 'data:image/svg+xml,<svg/>', saved.pngDataUrl + 'x', 'data:image/png;base64,' + 'A'.repeat(200_000)]) {
    assert.throws(() => validateAvatarPortrait({ ...saved, pngDataUrl }, DEFAULT_AVATAR));
  }
  assert.throws(() => validateAvatarPortrait({ ...saved, sha256: '0'.repeat(64) }, DEFAULT_AVATAR), /checksum/);
  assert.throws(() => validateAvatarPortrait({ ...saved, width: 128 }, DEFAULT_AVATAR), /profile/);
});

test('renderer refuses unaccepted, missing or out-of-bounds parts and never follows atlas URLs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-portrait-assets-'));
  try {
    const manifest = JSON.parse(await readFile(join(assetsRoot, 'manifest.json'), 'utf8'));
    const mutations = [
      (value: typeof manifest) => { value.artAcceptance = 'DRAFT'; },
      (value: typeof manifest) => { delete value.parts['top.center-jacket']; },
      (value: typeof manifest) => { value.body.down.idle[0].cels[0].rect[0] = 50_000; },
      (value: typeof manifest) => { value.atlas.url = 'https://example.invalid/atlas.png'; },
    ];
    for (const [index, mutate] of mutations.entries()) {
      const root = join(directory, String(index));
      await cp(assetsRoot, root, { recursive: true });
      const invalid = structuredClone(manifest); mutate(invalid);
      await writeFile(join(root, 'manifest.json'), JSON.stringify(invalid));
      await assert.rejects(composeAvatarPortrait(DEFAULT_AVATAR, { assetsRoot: root }));
    }
    const root = join(directory, '4');
    await cp(assetsRoot, root, { recursive: true });
    const atlas = decodeRgbaPng(await readFile(join(root, 'atlas.png')));
    atlas.pixels[3] = 128;
    await writeFile(join(root, 'atlas.png'), encodeRgbaPng(atlas));
    await assert.rejects(composeAvatarPortrait(DEFAULT_AVATAR, { assetsRoot: root }), /binary alpha/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
