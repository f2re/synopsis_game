/* Independent review of the real React/Phaser boundary; no browser or GPU claims. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../apps/web/node_modules/typescript');

class Events {
  listeners = new Map();
  on(key, fn) { const entries = this.listeners.get(key) ?? []; entries.push(fn); this.listeners.set(key, entries); return () => this.off(key, fn); }
  once(key, fn) { const once = (...args) => { this.off(key, once); fn(...args); }; once.original = fn; this.on(key, once); }
  off(key, fn) { this.listeners.set(key, (this.listeners.get(key) ?? []).filter((item) => item !== fn && item.original !== fn)); }
  emit(key, value) { for (const fn of [...this.listeners.get(key) ?? []]) fn(value); }
  addEventListener(key, fn) { this.on(key, fn); }
  removeEventListener(key, fn) { this.off(key, fn); }
  count() { return [...this.listeners.values()].reduce((sum, entries) => sum + entries.length, 0); }
}

const effects = [], updates = [], commands = [];
let reference = 0, state = 0, sleeps = 0, wakes = 0, destroyed = false, focused = 0;
const host = { dataset: {}, getBoundingClientRect: () => ({ left: 100, top: 50 }) };
const bridge = new Events();
bridge.setAvatarPresentation = () => undefined;
const originalEmit = bridge.emit.bind(bridge);
bridge.emit = (key, value) => { if (key === 'ui:avatar_command') commands.push(value); originalEmit(key, value); };
const document = Object.assign(new Events(), { hidden: false, visibilityState: 'visible' });
const window = Object.assign(new Events(), { location: { search: '' }, clearInterval() {}, dispatchEvent() {} });
const registry = new Map();
const scene = { input: { enabled: true, keyboard: { enabled: true } }, tweens: {}, events: new Events() };
const game = {
  registry: { get: (key) => registry.get(key), set: (key, value) => registry.set(key, value) },
  input: { enabled: true }, scene: { getScenes: () => [scene], isActive: () => true },
  loop: { fpsLimit: 60, setFPSLimit(value) { this.fpsLimit = value; }, sleep() { sleeps++; }, wake() { wakes++; } },
  renderer: new Events(), events: new Events(), destroy(value) { destroyed = value; },
};
let muted = true;
const worldAudio = { setMuted(value) { muted = value; }, isMuted: () => muted, setReducedSensory() {}, setLowPower() {}, stopHubAtmosphereSchedule() {}, stopAmbient() {}, playArchiveAmbient() {}, playHubOutdoorAmbient() {}, startHubAtmosphereSchedule() {} };
class Canvas {}
const dependencies = {
  react: {
    useRef: () => ({ current: ++reference === 1 ? host : { focus() { focused++; } } }),
    useState(initial) {
      const index = state++;
      return [index === 1 ? { ready: true, acceptedActions: ['idle', 'walk', 'inspect'], requestedAction: 'idle', paused: false, moving: false } : index === 2 ? true : initial,
        (value) => updates.push({ index, value })];
    },
    useEffect(fn) { effects.push(fn); },
  },
  'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  '@synopsis/world-engine': { createWorldGame: ({ parent }) => { assert.equal(parent, host); return game; }, normalizeWorldPreferences: (value) => ({ soundEnabled: value.soundEnabled === true, reducedMotion: value.reducedMotion === true, lowPower: value.lowPower === true }), worldAudio, worldBridge: bridge },
  '../features/hub/hubPreferences': { readHubPreferences: () => ({ soundEnabled: false, reducedMotion: false, lowPower: false }), HUB_PREFERENCES_EVENT: 'preferences' },
  './world-avatar.css': {},
};
const code = ts.transpileModule(fs.readFileSync('apps/web/src/game/WorldCanvas.tsx', 'utf8').replaceAll('import.meta.env.DEV', 'false'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject, require: (id) => { assert(id in dependencies, id); return dependencies[id]; }, document, window,
  performance: { now: () => 0 }, HTMLCanvasElement: Canvas, URLSearchParams, CustomEvent: class {} });

const output = exportsObject.WorldCanvas({ avatar: undefined });
const cleanups = effects.map((effect) => effect()).filter(Boolean);
const panel = output.props.children.find((child) => child && child.type === 'aside');
assert(panel, 'Accepted fixtures expose the explicit control panel');
const key = (value, extras = {}) => {
  let prevented = 0;
  panel.props.onKeyDown({ key: value, repeat: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() { prevented++; }, ...extras });
  return prevented;
};
commands.length = 0;
assert.equal(key('ArrowUp'), 1);
assert.equal(commands.at(-1).direction, 'up');
assert.equal(key('ц'), 1);
assert.equal(commands.at(-1).direction, 'up');
const beforeRepeat = commands.length;
assert.equal(key('ArrowRight', { repeat: true }), 1);
assert.equal(key('ArrowLeft', { ctrlKey: true }), 0);
assert.equal(key('Tab'), 0);
assert.equal(key('Enter'), 0);
assert.equal(key(' '), 0);
assert.equal(commands.length, beforeRepeat, 'Repeat and native button keys do not create movement');
assert.equal(key('E'), 1); assert.equal(commands.at(-1).kind, 'inspect');
assert.equal(key('Escape'), 1); assert.equal(focused, 1);

commands.length = 0;
output.props.onPointerDown({ target: {}, button: 0, clientX: 175, clientY: 225 });
output.props.onPointerDown({ target: new Canvas(), button: 1, clientX: 175, clientY: 225 });
assert.equal(commands.length, 0, 'Building buttons and non-primary clicks stay outside navigation');
output.props.onPointerDown({ target: new Canvas(), button: 0, clientX: 175, clientY: 225 });
assert.equal(commands.length, 1);
assert.equal(commands[0].kind, 'point'); assert.equal(commands[0].x, 75); assert.equal(commands[0].y, 175);
assert.equal(window.listeners.get('keydown')?.length ?? 0, 0, 'No global movement key handler');

game.renderer.emit('losewebgl');
assert.equal(host.dataset.context, 'lost'); assert.equal(registry.get('ui.world_visible'), false);
assert.equal(game.input.enabled, false); assert.equal(scene.input.keyboard.enabled, false); assert.equal(sleeps, 1);
document.hidden = true; game.renderer.emit('restorewebgl');
assert.equal(wakes, 0, 'Restoring a hidden renderer must not wake it');
assert.equal(registry.get('ui.world_visible'), false);
document.hidden = false; document.emit('visibilitychange');
assert.equal(wakes, 1); assert.equal(game.input.enabled, true); assert.equal(scene.input.keyboard.enabled, true);
bridge.emit('ui:modal_open', true);
assert.equal(game.input.enabled, false); assert.equal(scene.input.keyboard.enabled, false);
bridge.emit('ui:modal_open', false);
assert.equal(game.input.enabled, true);
bridge.emit('ui:preferences', { reducedMotion: true, lowPower: true });
assert.equal(game.loop.fpsLimit, 30); assert.equal(scene.tweens.timeScale, 0);

for (const cleanup of cleanups) cleanup();
assert.equal(destroyed, true);
assert.equal(document.count(), 0); assert.equal(window.count(), 0); assert.equal(bridge.count(), 0);
assert.equal(game.renderer.count(), 0); assert.equal(game.events.count(), 0);
console.log(JSON.stringify({ status: 'PASS', reviewer: 'blitz_flow', boundary: 'real WorldCanvas code with deterministic event doubles', checks: ['focused keyboard and Cyrillic layout', 'no global key interception', 'native Tab/Enter/Space intact', 'Canvas-only coordinate mapping', 'context-loss and hidden restore', 'modal input pause', 'reduced-motion and 30fps preference', 'all listeners and game disposed'], limits: 'Not a browser layout, measured GPU or art acceptance result.' }));
