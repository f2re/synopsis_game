/** Lifecycle/cadence checks with scene doubles; browser/GPU evidence is a separate gate. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require(path.join(process.cwd(), 'apps/web/node_modules/typescript'));
const root = 'packages/world-engine/src/';
function moduleFrom(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(root + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require(id) { if (!(id in imports)) throw new Error(`Unexpected import: ${id}`); return imports[id]; } });
  return exports;
}
class Events {
  constructor() { this.events = new Map(); }
  on(name, fn, context) { const list = this.events.get(name) ?? []; list.push({ fn, context, once: false }); this.events.set(name, list); return this; }
  once(name, fn, context) { this.on(name, fn, context); this.events.get(name).at(-1).once = true; return this; }
  off(name, fn) { this.events.set(name, (this.events.get(name) ?? []).filter((listener) => listener.fn !== fn)); return this; }
  emit(name, ...values) { for (const listener of [...this.events.get(name) ?? []]) { if (listener.once) this.off(name, listener.fn); listener.fn.apply(listener.context, values); } }
  listenerCount() { return [...this.events.values()].reduce((n, list) => n + list.length, 0); }
}
const assets = moduleFrom('runtime/characterAssets.ts');
const preferences = moduleFrom('runtime/uiPreferences.ts');
const bridgeModule = moduleFrom('bridge/WorldBridge.ts');
const { worldBridge } = bridgeModule;
const faunaMotion = moduleFrom('scenes/hub/stationFaunaMotion.ts');
const { HubCharacterLayer, preloadHubCharacters } = moduleFrom('scenes/hub/HubCharacterLayer.ts', {
  phaser: { Textures: { FilterMode: { NEAREST: 0 } }, Scale: { Events: { RESIZE: 'resize' } }, Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } }, Loader: { Events: { FILE_LOAD_ERROR: 'loaderror', COMPLETE: 'complete' } } },
  '../../assets/hub/station-fauna.json': require('../packages/world-engine/src/assets/hub/station-fauna.json'),
  '../../bridge/WorldBridge': bridgeModule,
  '../../runtime/characterAssets': assets,
  '../../runtime/uiPreferences': preferences,
  './r01Layout': { getR01Layout(w, h) { return { width: w, height: h, portrait: w < h, shore: 150, zoom: 1 }; } },
  './stationFaunaMotion': faunaMotion,
});
const pack = assets.parseCharacterManifest({ version: 1, artAcceptance: 'PASS', actors: [
  ['character.observer', 'npc'], ['character.vera', 'npc'], ['companion.pascal', 'npc'], ['npc.extra', 'npc'], ['legacy.player', 'player'], ['companion.tit', 'companion'],
].map(([id, role]) => ({ id, role, label: id, displayHeight: 64, pivot: [.5, .95], positions: { landscape: [300, 460], portrait: [200, 550] }, clips: {
  idle: { assetId: `${id}.idle`, url: `/hub/characters/${id.replaceAll('.', '-')}.png`, frameWidth: 64, frameHeight: 96, frameCount: 4, durationsMs: [100, 100, 100, 100] },
  ...(id === 'character.observer' ? { walk: { assetId: `${id}.walk`, facing: 'right', url: '/hub/characters/observer-walk.png', frameWidth: 64, frameHeight: 96, frameCount: 4, durationsMs: [100, 100, 100, 100] } } : {}),
} })), equipment: [ { id: 'held.tablet', assetId: 'item.tablet', url: '/hub/characters/tablet.png', displayHeight: 16, anchor: [.2, -.4] } ] });
function makeScene(withPack = true) {
  const images = [];
  const store = new Map(withPack ? [['world.characters.manifest', pack]] : []);
  const texture = { source: [{ width: 256, height: 96 }], has: () => true, setFilter() {} };
  const scene = {
    images, events: new Events(), scale: Object.assign(new Events(), { width: 960, height: 540 }),
    registry: { get(key) { return store.get(key); }, set(key, value) { store.set(key, value); }, remove(key) { store.delete(key); } },
    textures: { exists() { return true; }, get() { return texture; } },
    add: { image(x, y, key, frame) {
      const image = { x, y, key, frame, width: 64, height: 96, visible: true, frameWrites: 0, texture, depth: 0,
        setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
        setScale(scale) { this.scale = scale; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setDepth(depth) { this.depth = depth; return this; },
        setVisible(value) { this.visible = value; return this; },
        setTexture(key, frame) { this.key = key; this.frame = frame; return this; },
        setFrame(frame) { this.frame = frame; this.frameWrites++; return this; },
        destroy() { this.destroyed = true; },
      };
      images.push(image); return image;
    } },
  };
  return scene;
}
worldBridge.clear();
const scene = makeScene(), layer = new HubCharacterLayer(scene);
const [observer, mentor, cat, extra] = scene.images;
assert.equal(scene.images.length, 4, 'Legacy player, selected companion and account equipment are not created');
assert.equal(observer.originY, .95, 'Authored NPC foot pivot survives scene construction');
layer.update(100); assert.equal(observer.frame, 1); assert.equal(cat.frame, 1); assert.equal(extra.frame, 0);
layer.update(100); assert.equal(observer.frame, 2);
worldBridge.emit('ui:avatar_presentation', { heldItem: 'held.tablet', companion: 'companion.tit' });
assert.equal(scene.images.length, 4, 'An obsolete profile event cannot spawn a player or equipment');
scene.events.emit('ui:preferences', { reducedMotion: true });
assert.equal(observer.frame, 0); assert.equal(cat.frame, 0);
const frozenWrites = observer.frameWrites;
for (let i = 0; i < 12; i++) layer.update(100);
assert.equal(observer.frameWrites, frozenWrites);
assert.equal(scene.registry.get('world.characters.diagnostics').animatedActors, 0);
scene.events.emit('ui:preferences', { reducedMotion: false, lowPower: true });
layer.update(100); layer.update(100); assert.equal(observer.frame, 0);
layer.update(100); assert.equal(observer.frame, 3);
assert.equal(scene.registry.get('world.characters.diagnostics').animatedActors, 3);
assert.equal(scene.registry.get('world.characters.diagnostics').playerPresent, false);
scene.scale.width = 480; scene.scale.height = 780; scene.scale.emit('resize');
assert.equal(observer.x, 200); assert.equal(observer.y, 550);
layer.destroy();
assert.ok(scene.images.every((image) => image.destroyed));
assert.equal(scene.events.listenerCount(), 0); assert.equal(scene.scale.listenerCount(), 0);
const missing = makeScene(false), missingLayer = new HubCharacterLayer(missing);
assert.equal(missing.images.length, 0, 'Missing character art does not create a procedural personal substitute');
assert.equal(missing.registry.get('world.characters.diagnostics').artAccepted, false);
missingLayer.destroy();

// Employees still walk in their authored facing; wraps happen beyond both edges.
const ambientPack = structuredClone(pack);
ambientPack.actors = [{ ...ambientPack.actors[0], motion: { type: 'walk-across', direction: 'right', speed: 22 } }];
const ambientScene = makeScene();
ambientScene.registry.set('world.characters.manifest', assets.parseCharacterManifest(ambientPack));
const ambientLayer = new HubCharacterLayer(ambientScene), walker = ambientScene.images[0];
assert.equal(ambientScene.images.length, 1, 'Account equipment never attaches to a fixed employee NPC');
assert.equal(ambientScene.registry.get('world.characters.diagnostics').personalizationScope, 'saved-portrait');
let wrapped = false;
for (let i = 0; i < 600; i++) {
  const priorX = walker.x;
  ambientLayer.update(100);
  if (walker.x < priorX) { wrapped = true; assert.ok(priorX > 960); assert.ok(walker.x < -40); }
}
assert.ok(wrapped);
walker.setPosition(1100, walker.y);
ambientScene.events.emit('ui:preferences', { reducedMotion: true });
assert.equal(walker.x, 300);
const stillX = walker.x;
ambientLayer.update(100); assert.equal(walker.x, stillX); assert.equal(walker.frame, 0);
ambientLayer.destroy();

// The async loader must retire callbacks on shutdown and avoid adding stale sheets.
const loaderScene = makeScene(false);
loaderScene.cache = { json: { exists() { return false; } } };
let enqueued = 0;
loaderScene.load = Object.assign(new Events(), { json() {}, spritesheet() { enqueued++; }, image() { enqueued++; } });
preloadHubCharacters(loaderScene);
assert.ok(loaderScene.load.listenerCount() > 0);
loaderScene.events.emit('shutdown');
assert.equal(loaderScene.load.listenerCount(), 0);
loaderScene.load.emit('filecomplete-json-hub.characters.manifest.v1', '', '', pack);
assert.equal(enqueued, 0, 'Late JSON completion after shutdown must not enqueue assets');
for (const portrait of [false, true]) {
  const moves = new Map([['animal_squirrel', new Set()], ['bird_tit', new Set()]]);
  for (let clock = 0; clock <= faunaMotion.STATION_FAUNA_CYCLE_MS; clock += 10) {
    let active = 0;
    for (const [id, actions] of moves) {
      const pose = faunaMotion.stationFaunaPose(id, clock, portrait);
      actions.add(pose.action);
      if (pose.action !== 'idle') active++;
      else assert.equal(pose.y, 0);
      assert.ok(Math.abs(pose.x) <= 33 && pose.y >= -17 && pose.y <= 0);
    }
    assert.ok(active <= 1, 'At most one authored fauna clip may animate');
  }
  assert.deepEqual([...moves.get('animal_squirrel')], ['idle', 'run']);
  assert.deepEqual([...moves.get('bird_tit')], ['idle', 'hop', 'flutter']);
}
console.log('PASS: no personal player or account items; NPC cadence/pivot, reduced motion, three-actor budget, low-power sampling, portrait placement, offscreen-only employee wrap, missing-art diagnostic and loader/layer cleanup.');
