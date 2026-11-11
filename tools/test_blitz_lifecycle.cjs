/* Actual BlitzWorkspace hooks with deferred API/event doubles. No browser/server timing claims. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../apps/web/node_modules/typescript');
const fixture = JSON.parse(fs.readFileSync('apps/web/tools/review/blitz-practice-fixture.json', 'utf8'));

class Events {
  listeners = new Map();
  addEventListener(key, fn) { const list = this.listeners.get(key) ?? []; list.push(fn); this.listeners.set(key, list); }
  removeEventListener(key, fn) { this.listeners.set(key, (this.listeners.get(key) ?? []).filter((item) => item !== fn)); }
  emit(key) { for (const fn of [...this.listeners.get(key) ?? []]) fn(); }
  count() { return [...this.listeners.values()].reduce((sum, list) => sum + list.length, 0); }
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, no) => { resolve = ok; reject = no; });
  return { promise, resolve, reject };
}
const calls = { blitzLobby: [], startBlitz: [], blitzSession: [], submitBlitzAnswer: [] };
const api = Object.fromEntries(Object.keys(calls).map((method) => [method, (...args) => {
  const request = { ...deferred(), args }; calls[method].push(request); return request.promise;
}]));
const timers = new Map();
let now = 0, timerId = 0, requestId = 0;
const window = Object.assign(new Events(), { setInterval(fn) { const id = ++timerId; timers.set(id, fn); return id; }, clearInterval(id) { timers.delete(id); } });
const document = Object.assign(new Events(), { hidden: false });
let owner;
const react = {
  useRef(value) { const i = owner.cursor++; const hook = owner.hooks[i] ??= { kind: 'ref', value: { current: value } }; return hook.value; },
  useState(value) {
    const runner = owner, i = runner.cursor++;
    const hook = runner.hooks[i] ??= { kind: 'state', value: typeof value === 'function' ? value() : value };
    return [hook.value, (next) => {
      if (!runner.live) runner.lateWrites++;
      const result = typeof next === 'function' ? next(hook.value) : next;
      if (!Object.is(result, hook.value)) { hook.value = result; runner.dirty = true; }
    }];
  },
  useEffect(fn, deps) {
    const i = owner.cursor++, hook = owner.hooks[i] ??= { kind: 'effect' };
    if (!hook.deps || deps.some((value, index) => !Object.is(value, hook.deps[index]))) owner.effects.push({ hook, fn, deps });
  },
};
const deps = {
  react, 'react/jsx-runtime': { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }) },
  '../../api': { api, ApiError: class ApiError extends Error {} }, '../../brand': { GAME_MARK: '26063' },
  '../avatar/AvatarPreview': { AvatarPreview: 'AvatarPreview' }, '../ui': { PixelIcon: 'PixelIcon', PixelProgressBar: 'PixelProgressBar' },
  './StationPlotTask': { StationPlotTask: 'StationPlotTask' }, './ShiftWorkspace.css': {}, './BlitzWorkspace.css': {},
};
const code = ts.transpileModule(fs.readFileSync('apps/web/src/features/shift/BlitzWorkspace.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exported = {};
vm.runInNewContext(code, { exports: exported, require: (id) => { assert(id in deps, id); return deps[id]; },
  window, document, performance: { now: () => now }, crypto: { randomUUID: () => `fixture-start-${++requestId}` } });

class Runner {
  hooks = []; effects = []; cursor = 0; dirty = true; live = true; lateWrites = 0;
  constructor(user) { this.props = { user, onExit() {}, onStartPractice() {} }; this.render(); }
  render(user) {
    if (user) this.props.user = user;
    let turns = 0;
    do {
      assert(++turns < 20, 'Unexpected render loop');
      this.dirty = false; this.cursor = 0; this.effects = []; owner = this;
      this.output = exported.BlitzWorkspace(this.props);
      for (const { hook, fn, deps: dependencies } of this.effects) {
        hook.cleanup?.(); hook.deps = [...dependencies]; hook.cleanup = fn();
      }
    } while (this.dirty);
  }
  strictRemount() {
    for (const hook of this.hooks) if (hook?.kind === 'effect') { hook.cleanup?.(); hook.cleanup = undefined; hook.deps = undefined; }
    this.render();
  }
  unmount() { for (const hook of this.hooks) if (hook?.kind === 'effect') hook.cleanup?.(); this.live = false; }
}
function nodes(value) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  return [value, ...nodes(value.props?.children)];
}
function text(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).join(' ');
  return value?.props ? text(value.props.children) : '';
}
const question = (runner) => nodes(runner.output).find((node) => node.type?.name === 'BlitzQuestion');
const timer = (runner) => nodes(runner.output).find((node) => typeof node.props?.className === 'string' && /^blitz-timer(?: |$)/.test(node.props.className));
const user = (id) => ({ id, displayName: `Fixture ${id}`, groupId: 'Review', roles: ['student'], status: 'active', createdAt: '2026-11-11T00:00:00.000Z', avatar: { ...fixture.avatar } });
const baseline = Date.parse(fixture.active[0].serverNow);
function session(id, elapsed = 0, index = 0) {
  const value = structuredClone(fixture.active[index]);
  value.id = id; value.task.instanceId = `${id}:${index + 1}`;
  value.serverNow = new Date(baseline + elapsed).toISOString();
  return value;
}
const lobby = (value = null) => ({ ...structuredClone(fixture.ready), session: value });
async function flush(runner) { for (let i = 0; i < 6; i++) await Promise.resolve(); if (runner.live && runner.dirty) runner.render(); }
async function settle(runner, request, value) { request.resolve(value); await flush(runner); }
function tick(runner, value) { now = value; for (const callback of [...timers.values()]) callback(); if (runner.dirty) runner.render(); }

(async () => {
  const runner = new Runner(user('A'));
  assert.equal(calls.blitzLobby.length, 1);
  runner.strictRemount();
  assert.equal(calls.blitzLobby.length, 2);
  await settle(runner, calls.blitzLobby[0], lobby(session('obsolete-strict')));
  assert.equal(question(runner), undefined, 'A response from the cleaned-up StrictMode effect must stay ignored');
  assert.equal(timers.size, 0);
  await settle(runner, calls.blitzLobby[1], lobby(session('round-A')));
  assert.equal(question(runner).props.task.instanceId, 'round-A:1');
  assert.equal(timers.size, 1);
  assert.equal(timer(runner).props['aria-label'], 'Осталось 90 секунд');

  tick(runner, 10_000);
  assert.equal(timer(runner).props['aria-label'], 'Осталось 80 секунд');
  assert.equal(calls.blitzSession.length, 1);
  now = 12_000;
  await settle(runner, calls.blitzSession[0], session('round-A', -5_000));
  tick(runner, 12_000);
  assert.equal(timer(runner).props['aria-label'], 'Осталось 78 секунд', 'An older serverNow with identical progress cannot extend the displayed clock');
  window.emit('online');
  await settle(runner, calls.blitzSession[1], session('round-A', 12_000));
  tick(runner, 15_000);
  window.emit('online');
  await settle(runner, calls.blitzSession[2], session('round-A', 12_000));
  assert.equal(timer(runner).props['aria-label'], 'Осталось 75 секунд', 'An equal timestamp replay cannot restart the local anchor either');

  now = 16_000;
  window.emit('online');
  const pendingPoll = calls.blitzSession.at(-1);
  question(runner).props.onSubmit({ value: 0 });
  runner.render();
  const pendingAnswer = calls.submitBlitzAnswer.at(-1);
  assert.equal(pendingAnswer.args[0], 'round-A');
  runner.render(user('B'));
  assert.equal(question(runner), undefined, 'Changing identity clears the previous task immediately in the identity effect');
  assert.equal(timers.size, 0, 'The old round interval is removed');
  await settle(runner, pendingPoll, session('round-A', 16_000));
  await settle(runner, pendingAnswer, { accepted: true, feedback: { correct: false }, session: session('round-A', 16_000, 1) });
  assert.equal(question(runner), undefined, 'Late poll/answer must not restore another account after identity reset');
  assert.equal(text(runner.output).includes('Ответ принят'), false);
  await settle(runner, calls.blitzLobby.at(-1), lobby());
  assert.equal(text(runner.output).includes('Шесть заданий'), true);
  const start = nodes(runner.output).find((node) => node.type === 'button' && text(node) === 'Начать блиц · 90 с');
  assert(start);
  start.props.onClick(); runner.render();
  assert.equal(calls.startBlitz.length, 1, 'An old finally block did not corrupt the new account request guard');
  runner.unmount();
  await settle(runner, calls.startBlitz[0], session('round-B', 16_000));
  assert.equal(runner.lateWrites, 0, 'A late start after unmount must not schedule React state updates');
  assert.equal(timers.size, 0); assert.equal(window.count(), 0); assert.equal(document.count(), 0);

  const lateLoad = new Runner(user('C'));
  const request = calls.blitzLobby.at(-1);
  lateLoad.unmount();
  await settle(lateLoad, request, lobby(session('round-C')));
  assert.equal(lateLoad.lateWrites, 0);
  assert.equal(timers.size, 0);
  console.log(JSON.stringify({ status: 'PASS', test: 'actual BlitzWorkspace hooks with deferred API and event doubles', cases: ['StrictMode stale initial response', 'old and equal serverNow do not extend display timer', 'identity clears session and clock', 'old account poll and answer ignored', 'late start/load after unmount ignored', 'interval and reconnect listener cleanup'], limits: 'No real browser layout, authentication or authoritative 90-second server verification.' }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
