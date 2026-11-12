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
let sleeps = 0, wakes = 0, destroyed = false;
const host = { dataset: {}, getBoundingClientRect: () => ({ left: 100, top: 50 }) };
const bridge = new Events();
bridge.notifyBuildingClicked = (id) => commands.push({ buildingId: id });
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
    useRef: () => ({ current: host }),
    useState: () => [[{ id: 'codepost', label: 'Кодовый пост', state: 'available', x: 20, y: 30, width: 100, height: 80 }], (value) => updates.push(value)],
    useEffect(fn) { effects.push(fn); },
  },
  'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  '@synopsis/world-engine': { createWorldGame: ({ parent }) => { assert.equal(parent, host); return game; }, normalizeWorldPreferences: (value) => ({ soundEnabled: value.soundEnabled === true, reducedMotion: value.reducedMotion === true, lowPower: value.lowPower === true }), worldAudio, worldBridge: bridge },
  '../features/hub/hubPreferences': { readHubPreferences: () => ({ soundEnabled: false, reducedMotion: false, lowPower: false }), HUB_PREFERENCES_EVENT: 'preferences' },
};
const code = ts.transpileModule(fs.readFileSync('apps/web/src/game/WorldCanvas.tsx', 'utf8').replaceAll('import.meta.env.DEV', 'false'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject, require: (id) => { assert(id in dependencies, id); return dependencies[id]; }, document, window,
  performance: { now: () => 0 }, HTMLCanvasElement: Canvas, URLSearchParams, CustomEvent: class {} });

const output = exportsObject.WorldCanvas();
const cleanups = effects.map((effect) => effect()).filter(Boolean);
const panel = output.props.children.find((child) => child && child.type === 'aside');
assert.equal(panel, undefined, 'The campus must not expose a personal-player control panel');
assert.equal(output.props.onPointerDown, undefined, 'Canvas clicks do not move a personal avatar');
assert.equal(output.props.onKeyDown, undefined, 'Native keyboard interaction stays with the building buttons');
assert.equal(window.listeners.get('keydown')?.length ?? 0, 0, 'No global movement key handler');
assert(![...bridge.listeners.keys()].some((key) => /avatar/.test(key)), 'The world never subscribes to a player profile or navigation');
const building = output.props.children[1][0];
assert.equal(building.props['data-building-id'], 'codepost');
building.props.onClick();
assert.equal(commands.length, 1); assert.equal(commands[0].buildingId, 'codepost');
commands.length = 0;
bridge.emit('ui:avatar_command', { kind: 'point', x: 50, y: 60 });
assert.equal(updates.length, 0, 'Stale avatar commands do not update the world UI');

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
console.log(JSON.stringify({ status: 'PASS', boundary: 'real WorldCanvas code with deterministic event doubles', checks: ['no personal player controls or profile channel', 'native building actions retained', 'context-loss and hidden restore', 'modal input pause', 'reduced-motion and 30fps preference', 'all listeners and game disposed'], limits: 'Not a browser layout, measured GPU or art acceptance result.' }));
