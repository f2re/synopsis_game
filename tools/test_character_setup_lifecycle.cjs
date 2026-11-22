/* First-level character setup: real editor handlers with deferred service responses.
 * No browser, DOM layout, network server or artwork acceptance is performed. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load, Runner, Events, deferred, flush, nodes, text } = require('./ui_test_harness.cjs');
const { examples } = JSON.parse(fs.readFileSync('apps/web/tools/review/saved-portrait-fixtures.json', 'utf8'));
const [original, , field] = examples;
const options = load('apps/web/src/features/avatar/avatarOptions.ts');
const portraitModule = load('apps/web/src/features/avatar/SavedAvatarPortrait.tsx', { './saved-avatar-portrait.css': {} });
const stored = new Map(), timers = new Map(), saves = [];
let timerId = 0;
const window = Object.assign(new Events(), {
  setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
  clearTimeout: (id) => timers.delete(id),
  sessionStorage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) },
});
const drafts = load('apps/web/src/features/avatar/avatarDraft.ts', { './avatarOptions': options }, { window });
const equipment = {
  catalog: [], tools: [], loadout: { badgeId: null },
  stats: { completedShifts: 0, unassistedCorrect: 0, practiceDays: 0 },
  nextShift: { avatarSnapshot: original.avatar, avatarPortrait: original.avatarPortrait },
};
const api = {
  equipment: async () => structuredClone(equipment),
  updateAvatar: (avatar, signal) => {
    const request = { ...deferred(), avatar, signal };
    signal.addEventListener('abort', () => request.reject(new Error('aborted')), { once: true });
    saves.push(request); return request.promise;
  },
};
const { AvatarEditor } = load('apps/web/src/features/avatar/AvatarEditor.tsx', {
  '../../api': { api }, '@synopsis/world-engine': { worldAudio: { play() {} } },
  './AvatarPreview': { AvatarPreview: 'StaticFitting' }, './SavedAvatarPortrait': portraitModule,
  './AvatarOptionGrid': { AvatarAppearance: 'AvatarAppearance', AvatarOptionGrid: 'AvatarOptionGrid' },
  './avatarOptions': options, './avatarDraft': drafts, './inventory.css': {},
  '../hub/hubPreferences': { readHubPreferences: () => ({ soundEnabled: false }) },
  '../ui/modalFocus': { keepTabInDialog() {} }, '../ui/PixelScrollArea': { PixelScrollArea: 'PixelScrollArea' },
  './EquipmentBadges': { EquipmentBadges: 'EquipmentBadges', EquipmentSummary: 'EquipmentSummary' },
}, { window, AbortController });
const user = (id, example = original) => ({ id, displayName: id, groupId: 'Review', roles: ['student'], status: 'active',
  createdAt: '2026-11-21T00:00:00Z', avatar: { ...example.avatar }, avatarPortrait: { ...example.avatarPortrait } });
const label = (node) => text(node).replace(/\s+/g, ' ').trim();
const button = (runner, name) => nodes(runner.output).find((node) => node.type === 'button' && label(node) === name);
const fitting = (runner) => nodes(runner.output).find((node) => node.type === 'StaticFitting').props.avatar;
const confirmed = (runner) => nodes(runner.output).find((node) => node.type === portraitModule.SavedAvatarPortrait).props.portrait;
function chooseField(runner) { button(runner, 'На площадке').props.onClick(); runner.render(); }
function clickContinue(runner) {
  const control = button(runner, 'Сохранить и продолжить');
  assert(control && !control.props.disabled);
  control.props.onClick(); runner.render();
  return saves.at(-1);
}
function editor(id, extra = {}) {
  const events = [];
  const runner = new Runner(AvatarEditor, { user: user(id), onSaved: (saved) => events.push(['saved', saved]),
    onBack: () => events.push(['back']), onContinueToLevel: () => events.push(['level']), ...extra });
  return { runner, events };
}

(async () => {
  const clean = editor('clean', { continueLabel: 'Продолжить уровень', backLabel: 'К уровню' });
  await flush(clean.runner);
  assert(button(clean.runner, '← К уровню'));
  const initialCount = saves.length;
  button(clean.runner, 'Продолжить уровень').props.onClick();
  assert.equal(saves.length, initialCount, 'A confirmed unchanged portrait needs no redundant write');
  assert.deepEqual(clean.events, [['level']]);
  clean.runner.unmount();

  const saved = editor('saved', { initialSection: 'appearance' });
  await flush(saved.runner);
  chooseField(saved.runner);
  assert.deepEqual(JSON.parse(JSON.stringify(fitting(saved.runner))), field.avatar);
  // Changing a route-selected tab must preserve the fitting rather than reinitialize it.
  saved.runner.render({ initialSection: 'inventory' });
  assert.deepEqual(JSON.parse(JSON.stringify(fitting(saved.runner))), field.avatar);
  const control = button(saved.runner, 'Сохранить и продолжить');
  control.props.onClick(); control.props.onClick(); saved.runner.render();
  const request = saves.at(-1);
  assert.equal(saves.length, initialCount + 1, 'Double activation cannot submit two saves');
  assert.equal(saved.events.length, 0, 'Navigation waits for the server');
  assert.equal(confirmed(saved.runner).sha256, original.avatarPortrait.sha256, 'The old confirmed portrait remains during saving');
  request.resolve(user('saved', field)); await flush(saved.runner);
  assert.deepEqual(saved.events.map((entry) => entry[0]), ['saved', 'level'], 'The parent gets the confirmed profile before navigation');
  assert.equal(confirmed(saved.runner).sha256, field.avatarPortrait.sha256);
  assert.equal(drafts.readAvatarDraft(window.sessionStorage, 'saved'), null);
  saved.runner.unmount();

  const failure = editor('failure'); await flush(failure.runner); chooseField(failure.runner);
  clickContinue(failure.runner).reject(new Error('Failed to fetch')); await flush(failure.runner);
  assert.equal(failure.events.length, 0);
  assert.match(text(failure.runner.output), /Нет связи с сервером/);
  assert.deepEqual(JSON.parse(JSON.stringify(fitting(failure.runner))), field.avatar);
  assert.equal(confirmed(failure.runner).sha256, original.avatarPortrait.sha256);
  assert.deepEqual(JSON.parse(JSON.stringify(drafts.readAvatarDraft(window.sessionStorage, 'failure').avatar)), field.avatar);
  clickContinue(failure.runner).resolve(user('failure', field)); await flush(failure.runner);
  assert.deepEqual(failure.events.map((entry) => entry[0]), ['saved', 'level']);
  failure.runner.unmount();

  for (const [name, makeInvalid] of [
    ['other-account', () => user('another-user', field)],
    ['wrong-outfit', () => user('wrong-outfit', original)],
    ['old-portrait', () => ({ ...user('old-portrait', field), avatarPortrait: original.avatarPortrait })],
    ['malformed-revision', () => ({ ...user('malformed-revision', field), avatarPortrait: { ...field.avatarPortrait, sourceRevision: undefined } })],
  ]) {
    const invalid = editor(name); await flush(invalid.runner); chooseField(invalid.runner);
    clickContinue(invalid.runner).resolve(makeInvalid()); await flush(invalid.runner);
    assert.equal(invalid.events.length, 0, name);
    assert.match(text(invalid.runner.output), /Сервер не подтвердил сохранение портрета/, name);
    assert.equal(confirmed(invalid.runner).sha256, original.avatarPortrait.sha256, name);
    assert(drafts.readAvatarDraft(window.sessionStorage, name), name);
    invalid.runner.unmount();
  }

  const timeout = editor('timeout'); await flush(timeout.runner); chooseField(timeout.runner);
  const timed = clickContinue(timeout.runner);
  for (const callback of [...timers.values()]) callback();
  await flush(timeout.runner);
  assert(timed.signal.aborted); assert.equal(timeout.events.length, 0);
  assert.match(text(timeout.runner.output), /не подтвердил сохранение вовремя/);
  assert(drafts.readAvatarDraft(window.sessionStorage, 'timeout'));
  timeout.runner.unmount();

  const late = editor('old-account'); await flush(late.runner); chooseField(late.runner);
  const lateRequest = clickContinue(late.runner);
  late.runner.render({ user: user('new-account') }); await flush(late.runner);
  lateRequest.resolve(user('old-account', field)); await flush(late.runner);
  assert.equal(late.events.length, 0, 'A response for a departed account cannot start a level');
  assert.deepEqual(JSON.parse(JSON.stringify(fitting(late.runner))), original.avatar);
  late.runner.unmount();

  const normal = editor('without-continuation', { onContinueToLevel: undefined }); await flush(normal.runner);
  assert(!button(normal.runner, 'К первому уровню'));
  chooseField(normal.runner);
  button(normal.runner, 'Сохранить персонажа').props.onClick(); normal.runner.render();
  saves.at(-1).resolve(user('without-continuation', field)); await flush(normal.runner);
  assert.deepEqual(normal.events.map((entry) => entry[0]), ['saved'], 'Ordinary saving never navigates');
  normal.runner.unmount();
  assert.equal(timers.size, 0, 'All finite request timers were cleared');

  console.log(JSON.stringify({ status: 'PASS', checks: [
    'clean continuation without redundant write', 'save acknowledged before navigation', 'double-submit guarded',
    'route tab change preserves fitting', 'network failure preserves draft and supports retry',
    'wrong account/outfit/old portrait/malformed revision rejected', 'timeout preserves fitting',
    'account change ignores late response', 'optional continuation preserves normal save behavior',
  ], limits: 'Real component handlers with deterministic hook/service doubles. No browser layout, keyboard or visual acceptance.' }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
