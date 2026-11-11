import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AVATAR_OPTIONS, DEFAULT_AVATAR } from '../../../../apps/server/src/modules/identity/model.ts';
import {
  AVATAR_ACTIONS, AVATAR_DIRECTIONS, AVATAR_PART_SLOTS, DEFAULT_MODULAR_AVATAR, MODULAR_AVATAR_OPTIONS, MODULAR_AVATAR_RIG,
  avatarForContext, avatarFrameAtTime, avatarPoseCels, avatarProfileKey, parseModularAvatarManifest, parseModularAvatarProfile, resolveAvatarAction,
  type AvatarCel, type AvatarPartFrames, type AvatarPaletteRamp, type ModularAvatarManifest,
} from './modularAvatarManifest.ts';
import { AvatarResourceCache, avatarPreviewBounds, drawAvatarComposite, remapAvatarPalette, type AvatarComposite } from './modularAvatarCompositor.ts';
import { normalizeAvatarPresentation } from './characterAssets.ts';
import { resolveAvatarPresentation } from './modularAvatarPresentation.ts';

const ramp: AvatarPaletteRamp = [[240, 200, 180], [200, 150, 110], [150, 90, 60], [70, 40, 20]];
const cel = (z: number, paletteRole?: AvatarCel['paletteRole']): AvatarCel => ({ rect: [0, 0, 1, 1], at: [48, 100], z, ...(paletteRole ? { paletteRole } : {}) });
function frames(cels: AvatarCel[]): AvatarPartFrames {
  return Object.fromEntries(AVATAR_DIRECTIONS.map((direction) => [direction, Object.fromEntries(AVATAR_ACTIONS.map((action) => [action,
    Array.from({ length: action === 'idle' ? 4 : 6 }, () => ({ cels: structuredClone(cels) })),
  ]))])) as AvatarPartFrames;
}
function fixture(): ModularAvatarManifest {
  return {
    version: 1, rigId: MODULAR_AVATAR_RIG, revision: 'test-fixture', complete: true, artAcceptance: 'PASS',
    frame: { width: 96, height: 144, pivot: [48, 136] },
    atlas: { assetId: 'player.modular.r01.fixture', url: '/assets/avatar/modular-r01/atlas.png', width: 16, height: 16 },
    clips: { idle: { durationsMs: Array(4).fill(320), loop: true }, walk: { durationsMs: Array(6).fill(140), loop: true }, inspect: { durationsMs: Array(6).fill(240), loop: false } },
    palettes: { skin: { source: ramp, variants: Object.fromEntries(MODULAR_AVATAR_OPTIONS.skinTone.map((id) => [id, ramp])) }, hair: { source: ramp, variants: Object.fromEntries(MODULAR_AVATAR_OPTIONS.hairColor.map((id) => [id, ramp])) } },
    body: frames([cel(10, 'skin')]),
    parts: Object.fromEntries(AVATAR_PART_SLOTS.flatMap((slot, index) => MODULAR_AVATAR_OPTIONS[slot].map((id) => [id, frames(id.endsWith('.none') ? [] : [cel(20 + index, slot === 'hair' ? 'hair' : undefined)])]))),
    companions: { 'companion.none': null, ...Object.fromEntries(['companion.tit', 'companion.squirrel'].map((id) => [id, {
      frame: { width: 64, height: 64, pivot: [32, 60] }, anchor: [-34, 0], frames: frames([{ rect: [0, 0, 1, 1], at: [32, 40], z: 0 }]),
    }])) },
  };
}

test('all 42 server options and default saved profile match the reusable render contract', () => {
  assert.deepEqual(MODULAR_AVATAR_OPTIONS, AVATAR_OPTIONS);
  assert.deepEqual(DEFAULT_MODULAR_AVATAR, DEFAULT_AVATAR);
  assert.equal(Object.values(MODULAR_AVATAR_OPTIONS).flat().length, 42);
  const pack = parseModularAvatarManifest(fixture());
  assert.equal(Object.keys(pack.parts).length, 31);
  for (const [slot, ids] of Object.entries(MODULAR_AVATAR_OPTIONS)) for (const id of ids) {
    assert.equal(parseModularAvatarProfile({ ...DEFAULT_AVATAR, [slot]: id })?.[slot as keyof typeof DEFAULT_AVATAR], id);
  }
  assert.equal(parseModularAvatarProfile({ ...DEFAULT_AVATAR, top: 'top.unknown' }), null);
  assert.equal(parseModularAvatarProfile(null), null);
});

test('the actual compiled source pack matches the consumer schema, PNG and acceptance gate', () => {
  const publicRoot = new URL('../../../../apps/web/public/assets/avatar/modular-r01/', import.meta.url);
  const source = JSON.parse(readFileSync(new URL('../../../../assets/manifests/player-modular-r01.json', import.meta.url), 'utf8'));
  const raw = JSON.parse(readFileSync(new URL('manifest.json', publicRoot), 'utf8'));
  const expectedAcceptance = source.art_status === 'pass' && source.technical_status === 'pass' ? 'PASS' : 'PENDING';
  assert.equal(raw.artAcceptance, expectedAcceptance);
  if (expectedAcceptance === 'PENDING') assert.throws(() => parseModularAvatarManifest(raw), /unaccepted/);
  // Schema-only copy in this test; it does not change the source/public gate.
  const pack = parseModularAvatarManifest({ ...raw, artAcceptance: 'PASS' });
  const png = readFileSync(new URL('atlas.png', publicRoot));
  assert.equal(png.readUInt32BE(16), pack.atlas.width);
  assert.equal(png.readUInt32BE(20), pack.atlas.height);
  assert.equal(createHash('sha256').update(png).digest('hex'), source.outputs.atlasSha256);
  assert.equal(png.length, source.budget.compressedAtlasBytes);
  assert.equal(pack.atlas.width * pack.atlas.height * 4, source.budget.decodedAtlasBytes);
  assert.deepEqual(Object.keys(pack.clips), source.budget.publishedClips);
  for (const slot of AVATAR_PART_SLOTS) for (const id of MODULAR_AVATAR_OPTIONS[slot]) {
    for (const direction of AVATAR_DIRECTIONS) for (let frame = 0; frame < 4; frame++) {
      const pose = avatarPoseCels(pack, { ...DEFAULT_AVATAR, [slot]: id }, direction, 'idle', frame);
      assert.ok(pose.length > 0, `${id}/${direction}/${frame} loses the body`);
    }
  }
});

test('only complete accepted catalogs load, with bounds, none semantics and every declared pose', () => {
  const rejected = [
    (m: ModularAvatarManifest) => { Object.assign(m, { complete: false }); },
    (m: ModularAvatarManifest) => { Object.assign(m, { artAcceptance: 'PENDING' }); },
    (m: ModularAvatarManifest) => { delete m.parts['hair.long']; },
    (m: ModularAvatarManifest) => { m.parts['held.none'].up.idle[0].cels.push(cel(0)); },
    (m: ModularAvatarManifest) => { m.body.left.walk!.pop(); },
    (m: ModularAvatarManifest) => { m.body.up.idle[0].cels[0].rect = [15, 15, 2, 2]; },
    (m: ModularAvatarManifest) => { m.body.up.idle[0].cels[0].at = [96, 144]; },
    (m: ModularAvatarManifest) => { m.atlas.url = 'https://example.com/atlas.png'; },
    (m: ModularAvatarManifest) => { m.atlas.width = m.atlas.height = 4096; },
    (m: ModularAvatarManifest) => { m.parts['hair.short'] = frames([]); },
    (m: ModularAvatarManifest) => { m.parts['top.shirt'].left.idle[1] = { cels: [] }; },
    (m: ModularAvatarManifest) => { m.parts['badge.meteo'].up.idle[0] = { cels: [] }; },
    (m: ModularAvatarManifest) => { m.palettes.skin.source = [[1, 1, 1], [1, 1, 1], [2, 2, 2], [3, 3, 3]]; },
  ];
  for (const mutate of rejected) { const pack = fixture(); mutate(pack); assert.throws(() => parseModularAvatarManifest(pack), /Modular avatar/); }
});

test('optional accessories may be explicitly hidden by a direction; required body/clothes cannot', () => {
  const pack = fixture();
  for (const frame of pack.parts['badge.meteo'].up.idle) { frame.cels = []; frame.hidden = 'direction'; }
  const accepted = parseModularAvatarManifest(pack);
  assert.equal(accepted.parts['badge.meteo'].up.idle[0].hidden, 'direction');
  pack.parts['top.shirt'].left.idle[1] = { cels: [], hidden: 'occlusion' };
  assert.throws(() => parseModularAvatarManifest(pack), /unexplained empty/);
});

test('an accepted idle-only catalog does not claim walk or inspect readiness', () => {
  const input = fixture();
  delete input.clips.walk; delete input.clips.inspect;
  for (const part of [input.body, ...Object.values(input.parts), ...Object.values(input.companions).flatMap((c) => c ? [c.frames] : [])]) {
    for (const direction of AVATAR_DIRECTIONS) { delete part[direction].walk; delete part[direction].inspect; }
  }
  const pack = parseModularAvatarManifest(input);
  assert.deepEqual(Object.keys(pack.clips), ['idle']);
  assert.equal(resolveAvatarAction(pack, 'walk'), 'idle');
  assert.equal(resolveAvatarAction(pack, 'inspect'), 'idle');
  assert.equal(pack.parts['top.hoodie'].right.walk, undefined);
});

test('back and front fragments use one global z order; companion is excluded from body', () => {
  const pack = fixture();
  pack.parts['backpack.field'].up.idle[0].cels = [cel(5), cel(60)];
  pack.parts['held.tablet'].up.idle[0].cels = [cel(40)];
  const profile = { ...DEFAULT_AVATAR, backpack: 'backpack.field', heldItem: 'held.tablet', companion: 'companion.squirrel' };
  const ordered = avatarPoseCels(pack, profile, 'up', 'idle', 0);
  assert.deepEqual(ordered.map((c) => c.z), [5, 10, 20, 22, 23, 24, 40, 60]);
  assert.equal(ordered.length, avatarPoseCels(pack, { ...profile, companion: 'companion.none' }, 'up', 'idle', 0).length);
});

test('RGB remapping preserves alpha, transparent pixels and authored non-palette colors', () => {
  const target: AvatarPaletteRamp = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
  const pixels = new Uint8ClampedArray([240, 200, 180, 255, 200, 150, 110, 128, 240, 200, 180, 0, 240, 200, 179, 255]);
  remapAvatarPalette(pixels, ramp, target);
  assert.deepEqual([...pixels], [1, 2, 3, 255, 4, 5, 6, 128, 240, 200, 180, 0, 240, 200, 179, 255]);
});

test('inspect ends only after all six frames; authored cadence and reduced-motion are deterministic', () => {
  const pack = fixture();
  for (const [ms, expected] of [[0, 0], [239, 0], [240, 1], [1199, 4], [1200, 5], [1439, 5]]) {
    assert.deepEqual(avatarFrameAtTime(pack.clips.inspect!, ms), { frame: expected, complete: false });
  }
  assert.deepEqual(avatarFrameAtTime(pack.clips.inspect!, 1440), { frame: 5, complete: true });
  assert.deepEqual(avatarFrameAtTime(pack.clips.inspect!, 500, true), { frame: 0, complete: true });
  assert.deepEqual(avatarFrameAtTime(pack.clips.walk!, 840), { frame: 0, complete: false });
  assert.deepEqual(avatarFrameAtTime(pack.clips.idle, 0, true), { frame: 0, complete: false });
});

test('cache bounds include active leases; scene disposal does not evict a second consumer', () => {
  const disposed: string[] = [];
  const cache = new AvatarResourceCache<string>(10, (value) => disposed.push(value));
  const a = cache.acquire('a', () => ({ value: 'a', bytes: 6 }));
  const duplicate = cache.acquire('a', () => { throw new Error('same composition rebuilt'); });
  a.release(); a.release();
  assert.throws(() => cache.acquire('b', () => ({ value: 'b', bytes: 5 })), /active composition budget/);
  assert.deepEqual(disposed, ['b']);
  duplicate.release();
  const b = cache.acquire('b', () => ({ value: 'b', bytes: 5 }));
  assert.deepEqual(disposed, ['b', 'a']);
  assert.deepEqual(cache.stats(), { bytes: 5, entries: 1, leased: 1, budget: 10 });
  b.release();
  assert.throws(() => cache.acquire('huge', () => ({ value: 'huge', bytes: 11 })), /exceeds cache budget/);
  assert.equal(cache.stats().bytes, 5);
});

test('saved identity survives bridge normalization; shift uses the server snapshot without mutating profile', () => {
  const profile = { ...DEFAULT_AVATAR, top: 'top.hoodie', heldItem: 'held.pencil', hair: 'hair.long' };
  const bridge = normalizeAvatarPresentation(profile);
  assert.deepEqual(bridge.profile, profile);
  assert.equal(normalizeAvatarPresentation(null).profile, undefined);
  const shift = avatarForContext(profile, 'shift', { heldItem: 'held.map-folder' });
  assert.equal(shift.heldItem, 'held.map-folder');
  assert.equal(profile.heldItem, 'held.pencil');
  assert.deepEqual({ ...shift, heldItem: profile.heldItem }, profile);
  for (const context of ['wardrobe', 'campus', 'blitz-preview'] as const) {
    assert.equal(avatarProfileKey(avatarForContext(profile, context)), avatarProfileKey(profile));
  }
});

test('situations preserve the full outfit and intersect their actions with accepted clips', () => {
  const profile = Object.freeze({ ...DEFAULT_AVATAR, top: 'top.field-jacket', companion: 'companion.squirrel', heldItem: 'held.tablet' });
  const idleOnly = parseModularAvatarManifest({ ...fixture(), clips: { idle: fixture().clips.idle } });
  const accepted = AVATAR_ACTIONS.filter((action) => Boolean(idleOnly.clips[action]));
  for (const context of ['wardrobe', 'campus', 'shift', 'blitz-preview'] as const) {
    const result = resolveAvatarPresentation(profile, { context, action: 'walk' }, accepted);
    assert.deepEqual(result.profile, profile, `${context} must not rewrite an equipped companion or clothing`);
    assert.notEqual(result.profile, profile);
    assert.deepEqual(result.availableActions, ['idle']);
    assert.equal(result.action, 'idle');
    assert.equal(result.equipmentSource, 'profile');
  }
  const campus = resolveAvatarPresentation(profile, { context: 'campus', action: 'walk' }, AVATAR_ACTIONS);
  assert.equal(campus.direction, 'down');
  assert.equal(campus.action, 'walk');
  assert.equal(campus.companionVisible, true);
  assert.equal(campus.animate, true);
  const shift = resolveAvatarPresentation(profile, { context: 'shift', action: 'walk' }, AVATAR_ACTIONS);
  assert.deepEqual(shift.availableActions, ['idle', 'inspect']);
  assert.equal(shift.direction, 'right');
  assert.equal(shift.action, 'idle');
  assert.equal(shift.companionVisible, false);
  assert.equal(shift.animate, false, 'quiet task panels do not animate a decorative idle');
  const inspecting = resolveAvatarPresentation(profile, { context: 'shift', action: 'inspect', direction: 'left' }, AVATAR_ACTIONS);
  assert.equal(inspecting.action, 'inspect'); assert.equal(inspecting.direction, 'left'); assert.equal(inspecting.animate, true);
  const blitz = resolveAvatarPresentation(profile, { context: 'blitz-preview', action: 'inspect' }, AVATAR_ACTIONS);
  assert.deepEqual(blitz.availableActions, ['idle']);
  assert.equal(blitz.action, 'idle'); assert.equal(blitz.animate, false); assert.equal(blitz.companionVisible, false);
  assert.throws(() => resolveAvatarPresentation(profile, {}, ['walk']), /accepted idle/);
});

test('only a supplied shift snapshot selects its instrument; fitting and blitz stay cosmetic', () => {
  const profile = Object.freeze({ ...DEFAULT_AVATAR, heldItem: 'held.tablet', companion: 'companion.tit' });
  const equipment = Object.freeze({ heldItem: 'held.pencil' });
  const shift = resolveAvatarPresentation(profile, { context: 'shift', equipment });
  assert.equal(shift.profile.heldItem, 'held.pencil');
  assert.equal(shift.profile.companion, 'companion.tit', 'hiding the child is presentation, not an unequip mutation');
  assert.equal(shift.equipmentSource, 'shift-snapshot');
  assert.deepEqual({ ...shift.profile, heldItem: profile.heldItem }, profile);
  assert.equal(resolveAvatarPresentation(profile, { context: 'shift' }).profile.heldItem, 'held.tablet');
  for (const context of ['wardrobe', 'campus', 'blitz-preview'] as const) {
    const result = resolveAvatarPresentation(profile, { context, equipment });
    assert.equal(result.profile.heldItem, 'held.tablet');
    assert.equal(result.equipmentSource, 'profile');
  }
  assert.equal(resolveAvatarPresentation(profile, { context: 'shift', equipment: { heldItem: 'untrusted.value' } }).profile.heldItem, 'held.none');
  assert.equal(profile.heldItem, 'held.tablet');
  assert.equal(equipment.heldItem, 'held.pencil');
});

test('preview and Phaser share exact frame rectangles and foot-relative companion placement', () => {
  const pack = fixture();
  const bodyCanvas = { name: 'body' } as unknown as HTMLCanvasElement;
  const childCanvas = { name: 'child' } as unknown as HTMLCanvasElement;
  const child = pack.companions['companion.tit']!;
  const composite: AvatarComposite = { key: 'test', manifest: pack, action: 'idle', direction: 'down', clip: pack.clips.idle,
    body: { canvas: bodyCanvas, frame: pack.frame }, companion: { canvas: childCanvas, frame: child.frame, anchor: child.anchor } };
  const bounds = avatarPreviewBounds(composite);
  assert.deepEqual(bounds, { width: 114, height: 144, bodyAt: [18, 0], childAt: [0, 76] });
  const withoutChild = avatarPreviewBounds({ ...composite, companion: null });
  assert.equal(withoutChild.width, bounds.width);
  assert.equal(withoutChild.height, bounds.height);
  assert.deepEqual(withoutChild.bodyAt, bounds.bodyAt, 'The person stays at the same native scale and anchor when a child is equipped');
  const calls: unknown[][] = [];
  drawAvatarComposite({ clearRect: (...args: unknown[]) => calls.push(['clear', ...args]), drawImage: (...args: unknown[]) => calls.push(args) } as unknown as CanvasRenderingContext2D, composite, 3);
  assert.deepEqual(calls[1], [bodyCanvas, 288, 0, 96, 144, 18, 0, 96, 144]);
  assert.deepEqual(calls[2], [childCanvas, 192, 0, 64, 64, 0, 76, 64, 64]);
});
