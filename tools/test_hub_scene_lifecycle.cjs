/** Real HubScene lifecycle and bridge; render objects are deterministic doubles. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../apps/web/node_modules/typescript');
const phaserRoot = path.resolve('apps/web/node_modules/.pnpm/phaser@4.2.1/node_modules/phaser');
const Events = require(require.resolve('eventemitter3', { paths: [phaserRoot] }));
const root = path.resolve('packages/world-engine/src');
const modules = new Map();
let bridge;

class Scene {
  constructor() {
    this.events = new Events(); this.registry = new Map();
    this.scale = Object.assign(new Events(), { width: 1366, height: 768 });
    this.textures = { exists: () => true }; this.layers = [];
    // Phaser destroys display-list resources on DESTROY without emitting
    // SHUTDOWN. These objects must never receive another shared weather event.
    this.events.once('destroy', () => this.layers.forEach(layer => { layer.resourcesDestroyed = true; }));
  }
}
class Scenery {
  constructor(scene) {
    this.scene = scene; this.weatherCalls = 0; this.destroyCalls = 0; this.resourcesDestroyed = false;
    scene.layers.push(this);
    this.unsubscribe = bridge.on('ui:focus_building', () => assert.equal(this.resourcesDestroyed, false));
  }
  setWeather(value) {
    assert.equal(this.resourcesDestroyed, false, 'Weather reached destroyed rendering resources');
    this.weatherCalls++; this.weather = value ?? { mode: 'clear', animate: false };
  }
  applyDayPhase() { assert.equal(this.resourcesDestroyed, false); }
  getEnvironment() { return { weather: this.weather.mode, rainAnimated: this.weather.animate, rainDrops: this.weather.animate ? 72 : 0 }; }
  destroy() { this.destroyCalls++; this.resourcesDestroyed = true; this.unsubscribe(); }
}
class Characters {
  constructor(scene) { this.scene = scene; this.destroyCalls = 0; }
  applyLighting() {}
  destroy() { this.destroyCalls++; }
}
class UnusedLayer { constructor() { throw new Error('The R01 lifecycle test must not construct legacy layers'); } }
const stubs = {
  'runtime/fitLogicalViewport.ts': { WORLD_LOGICAL_WIDTH: 960, WORLD_LOGICAL_HEIGHT: 540 },
  'scenes/hub/HubR01Layer.ts': { HubR01Layer: Scenery },
  'scenes/hub/HubCharacterLayer.ts': { HubCharacterLayer: Characters, preloadHubCharacters() {} },
};
for (const name of ['HubBuildingLayer', 'HubEnvironmentLayer', 'HubGroundDecorLayer', 'HubFaunaLayer', 'HubNpcLayer', 'HubSeasonLayer', 'HubStageLayer', 'HubWeatherOverlay']) {
  stubs[`scenes/hub/${name}.ts`] = { [name]: UnusedLayer, HUB_BUILDINGS: [] };
}
function load(file) {
  if (!path.extname(file)) file += '.ts';
  const relative = path.relative(root, file);
  if (stubs[relative]) return stubs[relative];
  if (modules.has(file)) return modules.get(file);
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const exports = {}; modules.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8').replaceAll('import.meta', '({ env: { DEV: false } })'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require(id) {
    if (id === 'phaser') return { Scene, Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } }, Scale: { Events: { RESIZE: 'resize' } } };
    assert.ok(id.startsWith('.'), `Unexpected external dependency: ${id}`);
    return load(path.resolve(path.dirname(file), id));
  }, console, Date, URLSearchParams }, { filename: file });
  return exports;
}
bridge = load(path.join(root, 'bridge/WorldBridge.ts')).worldBridge;
const { HubScene } = load(path.join(root, 'scenes/hub/HubScene.ts'));
let readyEvents = 0;
const stopReadyObserver = bridge.on('world:scene_ready', () => readyEvents++);
function mount() {
  const scene = new HubScene(); scene.useR01 = true;
  scene.registry.set('ui.weather', { mode: 'clear', animate: false }); scene.create();
  return { scene, scenery: scene.r01Layer, characters: scene.characterLayer };
}
const first = mount();
bridge.emit('ui:weather', { mode: 'rain', animate: true });
let shutdowns = 0; first.scene.events.on('shutdown', () => shutdowns++);
first.scene.events.emit('destroy');
assert.equal(shutdowns, 0, 'Game destruction does not rely on a scene shutdown');
assert.equal(first.scenery.destroyCalls, 1, 'DESTROY disposes the first scenery');
assert.equal(first.characters.destroyCalls, 1, 'DESTROY disposes the first characters');
const retiredWeatherCalls = first.scenery.weatherCalls;
assert.doesNotThrow(() => bridge.emit('ui:weather', { mode: 'clear', animate: false }));
assert.doesNotThrow(() => bridge.emit('ui:focus_building', { buildingId: 'archive' }));
assert.equal(first.scenery.weatherCalls, retiredWeatherCalls, 'Retired scene no longer receives weather');

const second = mount();
const activeWeatherCalls = second.scenery.weatherCalls;
bridge.emit('ui:weather', { mode: 'rain', animate: true });
assert.equal(second.scenery.weatherCalls, activeWeatherCalls + 1, 'Return to the station reaches only its new scene');
assert.equal(first.scenery.weatherCalls, retiredWeatherCalls);
second.scene.events.emit('shutdown'); second.scene.events.emit('destroy');
assert.equal(second.scenery.destroyCalls, 1, 'Shutdown followed by destroy disposes scenery once');
assert.equal(second.characters.destroyCalls, 1);
const third = mount(); third.scene.events.emit('destroy');
assert.doesNotThrow(() => bridge.emit('ui:weather', { mode: 'rain', animate: true }));
assert.equal(readyEvents, 3, 'Scene cleanup preserves unrelated bridge observers');
stopReadyObserver();
console.log(JSON.stringify({ status: 'PASS', checks: ['DESTROY without SHUTDOWN', 'retired weather/focus listeners removed', 'repeated mount and weather update', 'idempotent shutdown/destroy', 'unrelated bridge listeners retained'], limits: 'Real HubScene and bridge with render doubles; not browser or GPU acceptance.' }));
