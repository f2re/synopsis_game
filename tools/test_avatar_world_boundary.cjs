/* Behavioral checks of the real React/Phaser boundary; no browser or GPU claims. */
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

const effects = [], hooks = [], updates = [], commands = [], weatherEvents = [];
let sleeps = 0, wakes = 0, destroyed = false, creations = 0;
const host = { dataset: {}, getBoundingClientRect: () => ({ left: 100, top: 50 }) };
const bridge = new Events();
bridge.notifyBuildingClicked = (id) => commands.push({ buildingId: id });
const originalEmit = bridge.emit.bind(bridge);
bridge.emit = (key, value) => {
  if (key === 'ui:avatar_command') commands.push(value);
  if (key === 'ui:weather') weatherEvents.push(value);
  originalEmit(key, value);
};
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
let muted = true, unlocked = false, hookIndex = 0, weather = 'rain';
const settings = { masterVolume: 1, ambientVolume: 1 };
const worldAudio = { setMuted(value) { muted = value; }, isMuted: () => muted, setReducedSensory() {}, setLowPower() {}, stopHubAtmosphereSchedule() {}, stopAmbient() {}, playArchiveAmbient() {}, playHubOutdoorAmbient() {}, startHubAtmosphereSchedule() {}, addAmbientLayer() {} };
class Canvas {}
const dependencies = {
  react: {
    useRef(value) { const index = hookIndex++; return hooks[index] ??= { current: index === 0 ? host : value }; },
    useState() { hookIndex++; return [[{ id: 'codepost', label: 'Кодовый пост', state: 'available', x: 20, y: 30, width: 100, height: 80 }], (value) => updates.push(value)]; },
    useEffect(fn, deps) {
      const hook = hooks[hookIndex++] ??= {};
      if (!hook.deps || deps.some((value, index) => !Object.is(value, hook.deps[index]))) {
        effects.push(() => { hook.cleanup?.(); hook.deps = [...deps]; hook.cleanup = fn(); });
      }
    },
  },
  'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  '@synopsis/world-engine': { createWorldGame: ({ parent }) => { creations++; assert.equal(parent, host); return game; }, normalizeWorldPreferences: (value) => ({ soundEnabled: value.soundEnabled === true, reducedMotion: value.reducedMotion === true, lowPower: value.lowPower === true }), worldAudio, worldBridge: bridge },
  '../features/hub/hubPreferences': { readHubPreferences: () => ({ soundEnabled: false, reducedMotion: false, lowPower: false }), HUB_PREFERENCES_EVENT: 'preferences' },
  '../features/settings/settingsStore': { getSettings: () => settings },
  '../features/atmosphere/AtmosphereProvider': { useAmbientWeather: () => weather },
  '../features/atmosphere/audioGate': { AUDIO_UNLOCK_EVENT: 'audio-unlock', isAudioUnlocked: () => unlocked },
};
const code = ts.transpileModule(fs.readFileSync('apps/web/src/game/WorldCanvas.tsx', 'utf8').replaceAll('import.meta.env.DEV', 'false'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject, require: (id) => { assert(id in dependencies, id); return dependencies[id]; }, document, window,
  performance: { now: () => 0 }, HTMLCanvasElement: Canvas, URLSearchParams, CustomEvent: class {} });

function render() {
  hookIndex = 0; effects.length = 0;
  const output = exportsObject.WorldCanvas();
  for (const effect of effects) effect();
  return output;
}
function assertWeather(mode, animate, message) {
  const stored = registry.get('ui.weather');
  assert.equal(stored?.mode, mode, message);
  assert.equal(stored?.animate, animate, message);
  assert.equal(weatherEvents.at(-1), stored, 'Late scenes and live subscribers receive the same snapshot');
  assert.equal(host.dataset.weather, mode);
  assert.equal(host.dataset.weatherAnimated, String(animate));
}
const output = render();
assertWeather('rain', true, 'A saved weather preference is published before the scene is ready');
weather = 'clear'; render();
assertWeather('clear', false, 'Changing the existing weather selector immediately clears rain');
weather = 'rain'; render();
assertWeather('rain', true, 'The automatic cycle can restore rain without replacing the scene');
assert.equal(creations, 1, 'Weather changes never create a second game');
const unchangedCount = weatherEvents.length;
render(); assert.equal(weatherEvents.length, unchangedCount, 'Unchanged React renders do not republish weather');
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

bridge.emit('ui:preferences', { soundEnabled: true });
assert.equal(muted, true, 'Enabling sound cannot bypass the shared gesture gate');
unlocked = true; window.emit('audio-unlock');
assert.equal(muted, false, 'The campus uses the station audio unlock');
settings.masterVolume = 0; window.emit('preferences', { detail: { soundEnabled: true } });
assert.equal(muted, true, 'Zero master volume keeps the campus muted');
settings.masterVolume = 1; window.emit('preferences', { detail: { soundEnabled: true } });
assert.equal(muted, false);
game.renderer.emit('losewebgl');
assertWeather('rain', false, 'Context loss stops motion without forgetting the weather choice');
assert.equal(host.dataset.context, 'lost'); assert.equal(registry.get('ui.world_visible'), false);
assert.equal(muted, true, 'A lost renderer silences campus audio');
assert.equal(game.input.enabled, false); assert.equal(scene.input.keyboard.enabled, false); assert.equal(sleeps, 1);
document.hidden = true; game.renderer.emit('restorewebgl');
assert.equal(wakes, 0, 'Restoring a hidden renderer must not wake it');
assert.equal(registry.get('ui.world_visible'), false);
assert.equal(muted, true, 'A hidden restored renderer remains silent');
assertWeather('rain', false, 'Context restoration while hidden must not start rain');
bridge.emit('world:scene_ready', 'hub');
assertWeather('rain', false, 'A delayed scene-ready event must not revive hidden animation');
document.hidden = false; document.emit('visibilitychange');
assertWeather('rain', true, 'A visible restored scene resumes the selected weather');
assert.equal(wakes, 1); assert.equal(game.input.enabled, true); assert.equal(scene.input.keyboard.enabled, true);
assert.equal(muted, false, 'Visible restored campus can resume unlocked audio');
bridge.emit('ui:modal_open', true);
assert.equal(game.input.enabled, false); assert.equal(scene.input.keyboard.enabled, false);
bridge.emit('ui:modal_open', false);
assert.equal(game.input.enabled, true);
bridge.emit('ui:preferences', { reducedMotion: true, lowPower: true });
assert.equal(game.loop.fpsLimit, 30); assert.equal(scene.tweens.timeScale, 0);
assertWeather('rain', false, 'Presentation limits stop drops without rewriting the rain preference');
bridge.emit('ui:preferences', { lowPower: true });
assertWeather('rain', false, 'Low power independently disables rain motion');
bridge.emit('ui:preferences', { reducedMotion: true });
assertWeather('rain', false, 'Effective system reduced motion independently disables rain motion');
bridge.emit('ui:preferences', {});
assertWeather('rain', true, 'Turning off the motion limits restores the current weather');
document.hidden = true; document.emit('visibilitychange');
weather = 'clear'; render(); weather = 'rain'; render();
assertWeather('rain', false, 'Weather changes while hidden cannot wake decorative motion');

for (const hook of hooks) hook?.cleanup?.();
assert.equal(destroyed, true);
assert.equal(document.count(), 0); assert.equal(window.count(), 0); assert.equal(bridge.count(), 0);
assert.equal(game.renderer.count(), 0); assert.equal(game.events.count(), 0);
console.log(JSON.stringify({ status: 'PASS', boundary: 'real WorldCanvas code with deterministic event doubles', checks: ['no personal player controls or profile channel', 'native building actions retained', 'shared audio gesture and master volume gates', 'weather selection without game recreation', 'weather snapshot for delayed scene creation', 'context-loss and hidden restore silence', 'late hidden scene-ready and weather changes keep rain stopped', 'modal input pause', 'independent reduced-motion and low-power weather limits', 'all listeners and game disposed'], limits: 'Not a browser layout, measured GPU or art acceptance result.' }));
