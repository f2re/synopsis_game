/** Integration boundary: the opt-in scene shares UI authority and cleans up on Phaser DESTROY. */
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
class Scene {
  constructor() {
    this.events = new Events(); this.registry = new Map();
    this.input = new Events(); this.scale = new Events();
  }
}
const renderers = [];
class Renderer {
  constructor() { this.destroyCalls = 0; this.preferenceCalls = 0; this.weatherCalls = 0; this.visits = 0; this.moving = false; this.nextOutcome = 'arrived'; renderers.push(this); }
  setDayPhase() {} setSeason() {} setBuildingStates() {} update() {}
  setPreferences(reducedMotion, lowPower) { assert.equal(this.destroyCalls, 0); this.preferenceCalls++; this.preferences = { reducedMotion, lowPower }; }
  setWeather(mode) { assert.equal(this.destroyCalls, 0); this.weatherCalls++; this.weather = mode; }
  walkAvatarTo() { assert.equal(this.destroyCalls, 0); this.visits++; return this.nextOutcome; }
  getBrowserSmokeTargets() { return []; }
  get isAvatarMoving() { return this.moving; }
  get isArrivalGated() { return true; }
  destroy() { this.destroyCalls++; }
}
class Stage { setStatuses() {} update() {} destroy() {} }
class Clock { getCurrentPhase() { return 'day'; } setPhase() {} update() {} setAcceleratedDemo() {} }
class Schedule { update() {} setStudyCalm() {} }
const stubs = {
  'runtime/fitLogicalViewport.ts': { bindLogicalViewport() {}, HUB_LOGICAL_WIDTH: 640, HUB_LOGICAL_HEIGHT: 360 },
  'renderer/three/HubPerfProbe.ts': { HubPerfProbe: class { destroy() {} } },
  'renderer/three/ThreeHubRenderer.ts': { ThreeHubRenderer: Renderer },
  'scenes/hub/HubStageLayer.ts': { HubStageLayer: Stage },
  'scenes/hub/HubTimeOfDay.ts': { HubTimeOfDay: Clock, STATION_26063_LOCATION: {} },
  'scenes/hub/HubBuildingLayer.ts': { HUB_BUILDINGS: [{ id: 'codepost', defaultState: 'available' }] },
  'scenes/hub/HubSeason.ts': { calculateSeason: () => 'summer', isSeason: x => x === 'summer', nextSeason: () => 'summer', SEASON_PROFILES: { summer: { defaultWeather: 'clear' } } },
  'scenes/hub/hubStages.ts': { computeStageStatuses: () => ({}), buildingStatesFromStages: () => ({}) },
  'world/hubSchedule.ts': { HubScheduleManager: Schedule },
  'world/hub/HubWorldDefinition.ts': { HUB_BUILDING_BY_ID: new Map([['codepost', { id: 'codepost', entrance: { x: 1, y: 1 } }]]), HUB_WORLD_DEFINITION_V1: { buildings: [] } },
};
function load(file) {
  if (!path.extname(file)) file += '.ts';
  const relative = path.relative(root, file);
  if (stubs[relative]) return stubs[relative];
  if (modules.has(file)) return modules.get(file);
  const exports = {}; modules.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require(id) {
    if (id === 'phaser') return { Scene, Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } } };
    assert.ok(id.startsWith('.'), `Unexpected dependency: ${id}`);
    return load(path.resolve(path.dirname(file), id));
  }, console, Date, URLSearchParams }, { filename: file });
  return exports;
}
const bridge = load(path.join(root, 'bridge/WorldBridge.ts')).worldBridge;
const { ExperimentalHubScene } = load(path.join(root, 'scenes/hub/ExperimentalHubScene.ts'));
let visits = 0;
const off = bridge.on('world:building_click', () => visits++);
const scene = new ExperimentalHubScene();
scene.registry.set('ui.preferences', { reducedMotion: true, lowPower: true });
scene.registry.set('ui.weather', { mode: 'rain', animate: false });
scene.create();
const renderer = renderers.at(-1);
assert.equal(renderer.preferences.reducedMotion, true);
assert.equal(renderer.preferences.lowPower, true);
assert.equal(renderer.weather, 'rain');
scene.registry.set('ui.modal_open', true);
bridge.emit('hub:visit_building', 'codepost');
assert.equal(visits, 0, 'The shared React modal blocks background navigation');
scene.registry.set('ui.modal_open', false);
bridge.emit('hub:visit_building', 'codepost');
assert.equal(visits, 1, 'One semantic arrival, consumed by the current React dialog');
renderer.nextOutcome = 'moving'; renderer.moving = true;
bridge.emit('hub:visit_building', 'codepost');
scene.registry.set('ui.modal_open', true);
bridge.emit('ui:modal_open', true);
renderer.moving = false; scene.update(0, 16);
assert.equal(visits, 1, 'A deferred arrival must not replace a profile/settings dialog');
scene.registry.set('ui.modal_open', false);
bridge.emit('ui:modal_open', false);
bridge.emit('ui:preferences', { reducedMotion: false, lowPower: false });
assert.equal(renderer.preferences.reducedMotion, false);
scene.events.emit('destroy');
assert.equal(renderer.destroyCalls, 1, 'Game destroy must dispose Three resources without requiring shutdown');
const retired = renderer.preferenceCalls;
bridge.emit('ui:preferences', { reducedMotion: true, lowPower: true });
bridge.emit('ui:weather', { mode: 'clear' });
bridge.emit('hub:visit_building', 'codepost');
assert.equal(renderer.preferenceCalls, retired);
assert.equal(visits, 1, 'Retired scene cannot dispatch new arrivals');
scene.events.emit('shutdown');
assert.equal(renderer.destroyCalls, 1, 'Shutdown after destroy remains idempotent');
const second = new ExperimentalHubScene(); second.create();
second.events.emit('shutdown'); second.events.emit('destroy');
assert.equal(renderers.at(-1).destroyCalls, 1);
off();
console.log(JSON.stringify({ status: 'PASS', checks: ['saved presentation at creation', 'shared modal blocks world input', 'one semantic arrival', 'modal cancels pending arrival', 'runtime preference update', 'DESTROY without SHUTDOWN', 'retired bridge listeners removed', 'idempotent teardown'], limits: 'Actual scene and bridge with renderer doubles; browser/GPU acceptance is separate.' }));
