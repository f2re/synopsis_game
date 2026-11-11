/* Exercise the real Canvas effects with deterministic DOM/event doubles.
 * This checks scheduling and cleanup, not browser layout or artwork acceptance. */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../apps/web/node_modules/typescript');
function compile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}
const contract = { exports: {} };
vm.runInNewContext(compile('packages/world-engine/src/runtime/modularAvatarManifest.ts'), { exports: contract.exports });
class Events {
  listeners = new Map();
  addEventListener(key, fn) { const list = this.listeners.get(key) ?? []; list.push(fn); this.listeners.set(key, list); }
  removeEventListener(key, fn) { this.listeners.set(key, (this.listeners.get(key) ?? []).filter((item) => item !== fn)); }
  emit(key) { for (const fn of this.listeners.get(key) ?? []) fn(); }
  count() { return [...this.listeners.values()].reduce((sum, list) => sum + list.length, 0); }
}
function run({ animate, legacy = false, withObserver = true }) {
  let now = 0, sequence = 0, cleanup, complete = 0;
  const draws = [], timers = new Map();
  const doc = Object.assign(new Events(), { hidden: false });
  const media = Object.assign(new Events(), { matches: false });
  const schedule = (fn, delay) => { const id = ++sequence; timers.set(id, { fn, delay }); return id; };
  const win = Object.assign(new Events(), {
    matchMedia: () => media, setTimeout: schedule, setInterval: schedule,
    clearTimeout: (id) => timers.delete(id), clearInterval: (id) => timers.delete(id),
  });
  const canvas = { dataset: {}, getContext: () => ({ clearRect() { draws.push(0); }, fillRect() {} }) };
  const prefs = { reducedMotion: false, lowPower: false };
  let observer;
  class Observer {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    visible(value) { this.callback([{ target: this.target, isIntersecting: value, intersectionRatio: value ? 1 : 0 }]); }
  }
  const api = { ...contract.exports, avatarPreviewBounds: () => ({ width: 120, height: 144 }),
    drawAvatarComposite: (_ctx, _composite, frame) => draws.push(frame) };
  const exports = {};
  const dependencies = {
    react: { useRef: (value) => ({ current: value === null ? canvas : value }), useEffect: (fn) => { cleanup = fn(); },
      useState: () => { throw new Error('Unexpected state use in frame effect'); } },
    'react/jsx-runtime': { jsx: (_type, props) => props },
    '@synopsis/world-engine/avatar': api,
    '../hub/hubPreferences': { HUB_PREFERENCES_EVENT: 'prefs', readHubPreferences: () => prefs },
    './LegacyAvatarPreview': {},
  };
  const file = legacy ? 'LegacyAvatarPreview' : 'AvatarPreview';
  vm.runInNewContext(compile(`apps/web/src/features/avatar/${file}.tsx`) + (legacy ? '' : '\nexports.testCanvas = ModularAvatarCanvas;'), {
    exports, require(id) { assert(id in dependencies, `Unexpected dependency ${id}`); return dependencies[id]; },
    window: win, document: doc, performance: { now: () => now }, IntersectionObserver: withObserver ? Observer : undefined,
  });
  if (legacy) {
    exports.LegacyAvatarPreview({ avatar: contract.exports.DEFAULT_MODULAR_AVATAR, animate: false });
    assert.equal(draws.length, 1); assert.equal(timers.size, 0); assert.equal(canvas.dataset.animationPaused, 'true');
    win.emit('prefs'); doc.emit('visibilitychange'); media.emit('change');
    assert.equal(timers.size, 0, 'Fallback stays still when user preferences change');
  } else {
    const composite = { manifest: { rigId: 'fixture', revision: 'fixture' },
      clip: { durationsMs: [320, 320, 320, 320], loop: true }, direction: 'down', action: 'idle', key: 'fixture' };
    exports.testCanvas({ composite, presentation: { context: animate ? 'wardrobe' : 'shift', profile: contract.exports.DEFAULT_MODULAR_AVATAR,
      requestedAction: 'idle', motion: animate ? 'ambient' : 'quiet', animate }, size: 192, showBackdrop: false, onAnimationComplete: () => complete++ });
    assert.equal(draws.length, 1);
    assert.equal(timers.size, withObserver || !animate ? 0 : 1, 'Only visible ambient previews may schedule');
    observer?.visible(true);
    const tick = (time) => { now = time; const timer = [...timers.values()][0]; assert(timer); timer.fn(); };
    if (animate) {
      assert.equal(timers.size, 1); tick(320); assert.equal(canvas.dataset.frame, '1');
      if (withObserver) {
        now = 400; observer.visible(false); assert.equal(timers.size, 0); assert.equal(canvas.dataset.animationPaused, 'true');
        now = 10400; observer.visible(true); assert.equal(canvas.dataset.frame, '1', 'Offscreen time cannot advance the animation');
        tick(10640); assert.equal(canvas.dataset.frame, '2');
      }
      now += 60; doc.hidden = true; doc.emit('visibilitychange'); assert.equal(timers.size, 0);
      const pausedFrame = canvas.dataset.frame;
      now += 40000; doc.hidden = false; doc.emit('visibilitychange'); assert.equal(canvas.dataset.frame, pausedFrame);
      prefs.reducedMotion = true; win.emit('prefs'); assert.equal(canvas.dataset.frame, '0'); assert.equal(timers.size, 0);
      prefs.reducedMotion = false; prefs.lowPower = true; win.emit('prefs'); assert.equal(timers.size, 1);
      assert.ok([...timers.values()][0].delay >= 250);
    } else { assert.equal(timers.size, 0); assert.equal(canvas.dataset.animationPaused, 'true'); assert.equal(canvas.dataset.frame, '0'); }
  }
  const drawCount = draws.length;
  cleanup(); assert.equal(timers.size, 0); assert.equal(doc.count() + win.count() + media.count(), 0);
  if (observer) { assert(observer.disconnected); observer.visible(true); assert.equal(draws.length, drawCount, 'Late observer callbacks after disposal do nothing'); }
  assert.equal(complete, 0);
  return { mode: legacy ? 'legacy-fallback' : animate ? 'ambient' : 'quiet', withObserver, draws: drawCount, cleanup: 'PASS' };
}
console.log(JSON.stringify({ status: 'PASS', test: 'actual Canvas effects with deterministic DOM/event doubles', cases: [
  run({ animate: true }), run({ animate: false }), run({ animate: true, withObserver: false }), run({ animate: false, legacy: true }),
] }));
