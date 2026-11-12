/* Saved portrait flow: real component handlers, authoritative PNG fixtures and module boundaries.
 * Deterministic event doubles do not replace browser or art review. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { load, Runner, Events, deferred, flush, nodes, text } = require('./ui_test_harness.cjs');
const { examples } = JSON.parse(fs.readFileSync('apps/web/tools/review/saved-portrait-fixtures.json', 'utf8'));
const [first, , , , second] = examples;
const contract = load('packages/world-engine/src/runtime/modularAvatarManifest.ts');
const options = load('apps/web/src/features/avatar/avatarOptions.ts');
const portraitModule = load('apps/web/src/features/avatar/SavedAvatarPortrait.tsx', { './saved-avatar-portrait.css': {} });
const { SavedAvatarPortrait, isSavedAvatarPortrait } = portraitModule;
const portraitNode = (runner) => nodes(runner.output).find((node) => node.type === SavedAvatarPortrait);
const image = (portrait, size = 80) => nodes(SavedAvatarPortrait({ portrait, size })).find((node) => node.type === 'img');
const user = (id, example = first) => ({ id, displayName: `Fixture ${id}`, groupId: 'Review', roles: ['student'], status: 'active', createdAt: '2026-11-12T00:00:00Z', avatar: { ...example.avatar }, avatarPortrait: { ...example.avatarPortrait } });

for (const example of examples) {
  const value = example.avatarPortrait;
  assert(isSavedAvatarPortrait(value));
  const png = Buffer.from(value.pngDataUrl.split(',')[1], 'base64');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 160); assert.equal(png.readUInt32BE(20), 160);
  assert.equal(createHash('sha256').update(png).digest('hex'), value.sha256);
  for (const size of [40, 80, 160]) assert.equal(image(value, size).props.src, value.pngDataUrl, 'Every display size must use identical PNG bytes');
}
for (const bad of [undefined, { ...first.avatarPortrait, version: 2 }, { ...first.avatarPortrait, width: 128 }, { ...first.avatarPortrait, pngDataUrl: 'https://example.com/avatar.png' }, { ...first.avatarPortrait, pngDataUrl: 'data:image/svg+xml;base64,AAAA' }, { ...first.avatarPortrait, pngDataUrl: 'data:image/png;base64,' + 'A'.repeat(175000) }]) {
  assert(!image(bad)); assert.match(text(SavedAvatarPortrait({ portrait: bad }).props['aria-label']), /Сохраните/);
}
const attrs = new Map(), brokenImage = { hidden: false, parentElement: { setAttribute: (key, value) => attrs.set(key, value) } };
image(first.avatarPortrait).props.onError({ currentTarget: brokenImage });
assert(brokenImage.hidden); assert.equal(attrs.get('data-portrait-state'), 'unavailable');
assert.equal(attrs.get('aria-label'), 'Сохранённый портрет недоступен.');
assert(!attrs.get('aria-label').includes('гардероб'), 'A historical failure must not promise to rewrite the old round');

const values = new Map();
const window = Object.assign(new Events(), { setTimeout, clearTimeout, sessionStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } });
const drafts = load('apps/web/src/features/avatar/avatarDraft.ts', { './avatarOptions': options }, { window });
const equipment = { loadout: { badgeId: null }, catalog: [], stats: { completedShifts: 0, unassistedCorrect: 0, practiceDays: 0 }, nextShift: { badgeId: null, badgeName: null, heldItem: first.avatar.heldItem, enabled: true, charges: { reference: 0, retry: 0 }, remaining: { reference: 0, retry: 0 }, assistedTasks: 0, avatarSnapshot: first.avatar, avatarPortrait: first.avatarPortrait }, rules: { chargeCap: 2, description: '' }, tools: [] };
const saves = [], savedUsers = [];
const api = { equipment: async () => structuredClone(equipment), updateAvatar: (avatar) => { const request = { ...deferred(), avatar }; saves.push(request); return request.promise; } };
const editor = load('apps/web/src/features/avatar/AvatarEditor.tsx', {
  '../../api': { api }, '@synopsis/world-engine': { worldAudio: { play() {} } },
  './AvatarPreview': { AvatarPreview: 'StaticFitting' }, './SavedAvatarPortrait': portraitModule,
  './AvatarOptionGrid': { AvatarAppearance: 'AvatarAppearance', AvatarOptionGrid: 'AvatarOptionGrid' }, './avatarOptions': options,
  '../hub/hubPreferences': { readHubPreferences: () => ({ soundEnabled: false }) },
  './EquipmentBadges': { EquipmentBadges: 'EquipmentBadges', EquipmentSummary: 'EquipmentSummary' },
  './avatarDraft': drafts, './inventory.css': {},
  '../ui/modalFocus': { keepTabInDialog() {} }, '../ui/PixelScrollArea': { PixelScrollArea: 'PixelScrollArea' },
}, { window, AbortController });
const button = (runner, label) => nodes(runner.output).find((node) => node.type === 'button' && text(node) === label);
const draft = (runner) => nodes(runner.output).find((node) => node.type === 'StaticFitting').props.avatar;
function equip(runner, slot, value) { nodes(runner.output).find((node) => node.type === 'AvatarOptionGrid').props.onEquip(slot, value); runner.render(); }
function save(runner) { const control = button(runner, 'Сохранить персонажа'); assert(control && !control.props.disabled); control.props.onClick(); runner.render(); return saves.at(-1); }
const makeEditor = (id, example = first) => new Runner(editor.AvatarEditor, { user: user(id, example), onSaved: (value) => savedUsers.push(value), onBack() {} });

async function staticCompositorCheck() {
  const manifest = JSON.parse(fs.readFileSync('apps/web/public/assets/avatar/modular-r01/manifest.json', 'utf8'));
  const canvases = [], timers = new Set(); let timerId = 0;
  const document = { createElement(tag) {
    assert.equal(tag, 'canvas');
    const c = { width: 0, height: 0, draws: [], getContext() { return { imageSmoothingEnabled: false, drawImage: (...args) => c.draws.push(args), getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }; } };
    canvases.push(c); return c;
  } };
  class Image { naturalWidth = manifest.atlas.width; naturalHeight = manifest.atlas.height; set src(value) { assert.equal(value, manifest.atlas.url); this.onload(); } }
  const compositor = load('packages/world-engine/src/runtime/modularAvatarCompositor.ts', { './modularAvatarManifest.ts': contract }, {
    document, Image, AbortController, fetch: async (url) => { assert.equal(url, contract.MODULAR_AVATAR_URL); return { ok: true, json: async () => manifest }; },
    window: { setTimeout: () => { timers.add(++timerId); return timerId; }, clearTimeout: (id) => timers.delete(id) },
  }).modularAvatarCompositor;
  for (const direction of contract.AVATAR_DIRECTIONS) {
    const lease = await compositor.acquireStatic(second.avatar, direction);
    assert.equal(lease.value.body.canvas.width, manifest.frame.width, 'The fitting cache must contain one frame, not an animation strip');
    assert.equal(lease.value.clip.durationsMs.length, 1); assert.equal(lease.value.clip.loop, false);
    const duplicate = await compositor.acquireStatic(second.avatar, direction);
    assert.equal(lease.value, duplicate.value, 'An unchanged appearance reuses its bounded static frame');
    lease.release(); duplicate.release();
  }
  assert.equal(timers.size, 0, 'Only finite loading timeouts exist; none remain once the atlas is loaded');
  assert.equal(compositor.diagnostics().composites.leased, 0);
}

async function screenChecks() {
  const title = load('apps/web/src/features/title/TitleScreen.tsx', {
    '../../brand': { GAME_MARK: '26063', GAME_CALLSIGN: 'Синоптик' }, '../avatar/SavedAvatarPortrait': portraitModule,
    '../hub/HubIcon': { HubIcon: 'HubIcon' }, '../ui/PixelIcon': { PixelIcon: 'PixelIcon' },
    '../atmosphere/StationRoomArt': { StationRoomArt: 'StationRoomArt' }, '../atmosphere/AtmosphereProvider': { useAmbientWeather: () => 'calm' },
    '../settings/settingsStore': { useSettings: () => ({ soundEnabled: false }), usePresentationPreferences: () => ({}), updateSettings() {} },
    './station-screens.css': {},
  });
  const titleRunner = new Runner(title.TitleScreen, { user: user('title') }, { effects: false });
  assert.equal(portraitNode(titleRunner).props.size, 40);
  assert.equal(image(portraitNode(titleRunner).props.portrait).props.src, first.avatarPortrait.pngDataUrl, 'The main menu uses the saved personal portrait');
  titleRunner.render({ user: user('title', second) });
  assert.equal(portraitNode(titleRunner).props.portrait.sha256, second.avatarPortrait.sha256);
  titleRunner.render({ user: { ...user('title'), avatarPortrait: undefined } });
  assert.equal(portraitNode(titleRunner).props.portrait, undefined, 'An older authenticated profile gets the neutral portrait placeholder');
  titleRunner.render({ user: null });
  assert.equal(portraitNode(titleRunner), undefined);
  assert(nodes(titleRunner.output).some((node) => node.type === 'HubIcon' && node.props.name === 'observer'), 'Guests keep the generic station icon');
  titleRunner.unmount();

  // The hub's real markup consumes the same confirmed PNG without loading its effects or Phaser.
  const hub = load('apps/web/src/features/hub/HubScreen.tsx', {
    '../../brand': { GAME_MARK: '26063', GAME_CALLSIGN: 'Синоптик', GAME_TITLE: '26063' }, '../avatar/SavedAvatarPortrait': portraitModule,
    '../ui/PixelIcon': { PixelIcon: 'PixelIcon' }, '../ui/PixelSwitch': { PixelSwitch: 'PixelSwitch' }, '../ui/StationNavDock': { StationNavDock: 'StationNavDock' },
    './StudyJournal': { StudyJournal: 'StudyJournal' }, './WorldLoadBoundary': { WorldLoadBoundary: 'WorldLoadBoundary' },
    './HubDialog': { HubDialog: 'HubDialog' }, './HubIcon': { HubIcon: 'HubIcon' },
    '../settings/settingsStore': { usePresentationPreferences: () => ({}) },
  }, { window: { matchMedia: () => ({ matches: false }) } });
  const hubRunner = new Runner(hub.HubScreen, { user: user('hub') }, { effects: false });
  assert.equal(image(portraitNode(hubRunner).props.portrait).props.src, first.avatarPortrait.pngDataUrl);
  hubRunner.render({ user: user('hub', second) });
  assert.equal(portraitNode(hubRunner).props.portrait.sha256, second.avatarPortrait.sha256);
  hubRunner.unmount();

  const starts = [];
  const shift = load('apps/web/src/features/shift/ShiftWorkspace.tsx', {
    '../../api': { api: { startShift() { const request = deferred(); starts.push(request); return request.promise; } } }, '../../brand': { GAME_MARK: '26063' },
    '../ui': { PixelIcon: 'PixelIcon', PixelProgressBar: 'PixelProgressBar' }, './FindErrorTask': { FindErrorTask: 'FindErrorTask' }, './StationBoardTask': { StationBoardTask: 'StationBoardTask' }, './StationPlotTask': { StationPlotTask: 'StationPlotTask' },
    '../ui/radioGroupKeys': load('apps/web/src/features/ui/radioGroupKeys.ts'),
    './feedback/DigitAnatomy': { DigitAnatomy: 'DigitAnatomy' }, '../../game/worldBridge': { createCodePostBridge: () => ({}) }, '@synopsis/world-engine': { worldAudio: {} },
    '../avatar/avatarOptions': options, '../avatar/SavedAvatarPortrait': portraitModule, './ShiftWorkspace.css': {},
  }, { window: { setTimeout, clearTimeout }, AbortController });
  const task = JSON.parse(fs.readFileSync('apps/web/tools/review/blitz-practice-fixture.json', 'utf8')).active[0].task;
  for (const legacy of [false, true]) {
    const shiftRunner = new Runner(shift.ShiftWorkspace, { onExit() {} });
    const snapshot = structuredClone(equipment.nextShift);
    if (legacy) { delete snapshot.avatarPortrait; delete snapshot.avatarSnapshot; }
    starts.at(-1).resolve({ shiftId: 'round-A', task, progress: { answered: 0, correct: 0, current: 1, total: 6 }, contentStatus: 'draft', equipment: snapshot, retryAvailable: false });
    await flush(shiftRunner);
    const portrait = portraitNode(shiftRunner).props.portrait;
    if (legacy) {
      assert.equal(portrait, undefined);
      assert.match(text(shiftRunner.output), /Портрет не сохранён для этой смены/);
    } else {
      assert.equal(image(portrait).props.src, first.avatarPortrait.pngDataUrl);
      shiftRunner.render();
      assert.equal(portraitNode(shiftRunner).props.portrait.sha256, first.avatarPortrait.sha256, 'A started shift owns its historical PNG');
    }
    shiftRunner.unmount();
  }
}

(async () => {
  const runner = makeEditor('save-A'); await flush(runner);
  equip(runner, 'top', 'top.hoodie');
  assert.equal(draft(runner).top, 'top.hoodie');
  assert.equal(portraitNode(runner).props.portrait.sha256, first.avatarPortrait.sha256, 'An unsaved draft cannot replace the confirmed image');
  const failure = save(runner);
  assert.equal(failure.avatar.top, 'top.hoodie');
  failure.reject(new Error('Failed to fetch')); await flush(runner);
  assert.match(text(runner.output), /Изменения остались в примерке/);
  assert.equal(draft(runner).top, 'top.hoodie');
  assert.equal(portraitNode(runner).props.portrait.sha256, first.avatarPortrait.sha256);
  assert.equal(savedUsers.length, 0);
  const success = save(runner), accepted = user('save-A', second);
  success.resolve(accepted); await flush(runner);
  assert.equal(savedUsers.length, 1); assert.equal(savedUsers[0], accepted);
  assert.deepEqual({ ...draft(runner) }, second.avatar);
  assert.equal(portraitNode(runner).props.portrait.pngDataUrl, second.avatarPortrait.pngDataUrl, 'Use the authoritative returned PNG, never a client crop');
  runner.unmount();

  const race = makeEditor('race-A'); await flush(race);
  equip(race, 'top', 'top.hoodie'); const old = save(race);
  race.runEffects = false; race.render({ user: user('race-B', second) });
  assert.equal(portraitNode(race), undefined, 'Hide a previous account before its reset effect runs');
  old.resolve(user('race-A')); await flush(race);
  assert.equal(savedUsers.length, 1, 'An old account response cannot call onSaved after an identity change');
  race.runEffects = true; race.render(); await flush(race);
  assert.equal(portraitNode(race).props.portrait.sha256, second.avatarPortrait.sha256);
  assert.deepEqual({ ...draft(race) }, second.avatar);
  equip(race, 'top', 'top.shirt'); const late = save(race);
  race.unmount(); late.resolve(user('race-B')); await flush(race);
  assert.equal(race.lateWrites, 0); assert.equal(savedUsers.length, 1);

  const missing = new Runner(editor.AvatarEditor, { user: { ...user('missing'), avatarPortrait: undefined }, onSaved: (value) => savedUsers.push(value), onBack() {} });
  await flush(missing);
  assert.equal(portraitNode(missing).props.portrait, undefined);
  const missingSave = save(missing);
  missingSave.resolve(user('wrong-owner')); await flush(missing);
  assert.equal(portraitNode(missing).props.portrait, undefined);
  assert.equal(savedUsers.length, 1, 'A malformed or wrong-owner confirmation is rejected');
  const missingRetry = save(missing); missingRetry.resolve(user('missing')); await flush(missing);
  assert.equal(savedUsers.length, 2); missing.unmount();
  assert.equal(window.count(), 0);

  await staticCompositorCheck(); await screenChecks();
  for (const file of ['apps/web/src/features/title/TitleScreen.tsx', 'apps/web/src/features/hub/HubScreen.tsx', 'apps/web/src/features/shift/ShiftWorkspace.tsx', 'apps/web/src/features/shift/BlitzWorkspace.tsx', 'apps/web/src/game/WorldCanvas.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert(!/\bAvatarPreview\b|modularAvatarCompositor|LegacyAvatarPreview|world-engine\/avatar/.test(source), `Fitting compositor leaked into ${file}`);
  }
  for (const file of ['packages/world-engine/src/scenes/hub/HubCharacterLayer.ts', 'packages/world-engine/src/scenes/hub/HubNpcLayer.ts', 'packages/world-engine/src/scenes/hub/HubScene.ts', 'packages/world-engine/src/bridge/WorldBridge.ts']) {
    assert(!/createPlayerAvatar|avatarContainer|setAvatarPresentation|ui:avatar_|modularAvatar/.test(fs.readFileSync(file, 'utf8')), `Personal player leaked into ${file}`);
  }
  const app = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
  assert.match(app, /const AvatarEditor = lazy/); assert.match(app, /<AvatarEditor key=\{user.id\}/);
  assert.match(app, /activeSessionToken && getSessionToken\(\) === activeSessionToken/);
  assert.match(app, /current\?\.id === profile.id \? profile : current/);
  assert.match(app, /<BlitzWorkspace key=\{user.id\}/); assert.match(app, /<SeamlessShiftFlow key=\{user.id\}/);
  console.log(JSON.stringify({ status: 'PASS', test: 'saved PNG contract and actual editor/title/hub/shift handlers', checks: ['same PNG at 40/80/160', 'bounded PNG-only neutral fallback', 'failed save keeps draft and confirmed portrait', 'authoritative returned portrait', 'account change before effects', 'late save after unmount', 'missing portrait can save without appearance edits', 'same confirmed portrait in title and hub', 'historical shift snapshot and honest legacy placeholder', 'one static cached fitting frame', 'no personal Phaser player including legacy fallback'], limits: 'No real browser, GPU, server-authentication or artwork acceptance claims.' }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
