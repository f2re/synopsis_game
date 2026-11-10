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
const modularManifest = moduleFrom('runtime/modularAvatarManifest.ts');
const assets = moduleFrom('runtime/characterAssets.ts', { './modularAvatarManifest.ts': modularManifest });
const preferences = moduleFrom('runtime/uiPreferences.ts');
const bridgeModule = moduleFrom('bridge/WorldBridge.ts', { '../runtime/characterAssets': assets });
const { worldBridge } = bridgeModule;
const { HubCharacterLayer, preloadHubCharacters } = moduleFrom('scenes/hub/HubCharacterLayer.ts', {
  phaser: { Textures: { FilterMode: { NEAREST: 0 } }, Scale: { Events: { RESIZE: 'resize' } }, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Loader: { Events: { FILE_LOAD_ERROR: 'loaderror', COMPLETE: 'complete' } } },
  '../../bridge/WorldBridge': bridgeModule,
  '../../runtime/characterAssets': assets,
  '../../runtime/uiPreferences': preferences,
  './r01Layout': { getR01Layout(w, h) { return { width: w, height: h, portrait: w < h, shore: 150, zoom: 1 }; } },
});
const pack = assets.parseCharacterManifest({ version: 1, artAcceptance: 'PASS', actors: [
  ['character.observer', 'player'], ['character.vera', 'npc'], ['companion.pascal', 'npc'], ['companion.tit', 'companion'],
].map(([id, role]) => ({ id, role, label: id, displayHeight: 64, pivot: [.5, .95], positions: { landscape: [300, 460], portrait: [200, 550] }, clips: {
  idle: { assetId: `${id}.idle`, url: `/hub/characters/${id.replaceAll('.', '-')}.png`, frameWidth: 64, frameHeight: 96, frameCount: 4, durationsMs: [100, 100, 100, 100] },
  ...(role === 'player' ? { walk: { assetId: `${id}.walk`, facing: 'right', url: '/hub/characters/observer-walk.png', frameWidth: 64, frameHeight: 96, frameCount: 4, durationsMs: [100, 100, 100, 100] } } : {}),
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
worldBridge.setAvatarPresentation({ heldItem: 'held.tablet', companion: 'companion.none' });
const scene = makeScene(), layer = new HubCharacterLayer(scene);
const [player, mentor, cat, tit, tablet] = scene.images;
assert.equal(tit.visible, false, 'Unselected account companion stays hidden');
assert.equal(cat.visible, true, 'Pascal remains ambient fauna independent from account equipment');
assert.equal(tablet.visible, true);
assert.equal(player.originY, .95, 'Authored foot pivot must survive scene construction');
layer.update(100); assert.equal(player.frame, 1);
layer.update(100); assert.equal(player.frame, 2);
scene.events.emit('ui:preferences', { reducedMotion: true });
assert.equal(player.frame, 0); assert.equal(cat.frame, 0);
const frozenWrites = player.frameWrites;
for (let i = 0; i < 12; i++) layer.update(100);
assert.equal(player.frameWrites, frozenWrites, 'Reduced motion has no animation writes');
assert.equal(scene.registry.get('world.characters.diagnostics').animatedActors, 0);
scene.events.emit('ui:preferences', { reducedMotion: false, lowPower: true });
layer.update(100); layer.update(100); assert.equal(player.frame, 0, 'Low power waits for its bounded sample');
layer.update(100); assert.equal(player.frame, 3);
assert.equal(scene.registry.get('world.characters.diagnostics').animatedActors, 3);
worldBridge.setAvatarPresentation({ heldItem: 'held.none', companion: 'companion.tit' });
assert.equal(tablet.visible, false); assert.equal(tit.visible, true);
for (let i = 0; i < 6; i++) layer.update(100);
assert.equal(cat.frame, 0, 'Extra ambient actor is static when the account companion takes an animation slot');
assert.notEqual(tit.frame, 0, 'The selected account companion is prioritized ahead of ambient NPCs');
scene.events.emit('ui:preferences', { reducedMotion: false });
layer.walkAvatarTo(350, 470);
assert.equal(player.key, 'character:character.observer.walk');
for (let i = 0; i < 20; i++) layer.update(100);
assert.equal(player.x, 350); assert.equal(player.y, 470);
assert.equal(player.key, 'character:character.observer.idle', 'An explicit completed walk returns to authored idle');
assert.equal(player.originY, .95, 'Foot pivot is stable across clip transitions');
layer.walkAvatarTo(250, 470);
layer.update(100);
assert.equal(player.x, 350, 'Asymmetric right-facing art must not moonwalk or mirror toward the left');
scene.scale.width = 480; scene.scale.height = 780; scene.scale.emit('resize');
assert.equal(player.x, 200); assert.equal(player.y, 550, 'Portrait uses its authored placement');
layer.destroy();
assert.ok(scene.images.every((image) => image.destroyed));
assert.equal(scene.events.listenerCount(), 0); assert.equal(scene.scale.listenerCount(), 0);
worldBridge.setAvatarPresentation(null);
assert.equal(worldBridge.getAvatarPresentation().heldItem, 'held.none');
const nextScene = makeScene(), nextLayer = new HubCharacterLayer(nextScene);
assert.equal(nextScene.images[4].visible, false, 'Scene restart after sign-out does not reuse the former account item');
nextLayer.destroy();
const missing = makeScene(false), missingLayer = new HubCharacterLayer(missing);
assert.equal(missing.images.length, 0, 'Missing artwork does not become a procedural substitute');
assert.equal(missing.registry.get('world.characters.diagnostics').artAccepted, false);
missingLayer.destroy();

// An employee strolls in the authored direction; resets happen beyond both edges.
const ambientPack = structuredClone(pack);
ambientPack.actors = [{ ...ambientPack.actors[0], role: 'npc', motion: { type: 'walk-across', direction: 'right', speed: 22 } }];
worldBridge.setAvatarPresentation({ heldItem: 'held.tablet', companion: 'companion.tit' });
const ambientScene = makeScene();
ambientScene.registry.set('world.characters.manifest', assets.parseCharacterManifest(ambientPack));
const ambientLayer = new HubCharacterLayer(ambientScene), walker = ambientScene.images[0];
assert.equal(ambientScene.images[1].visible, false, 'Account equipment must never attach to a fixed employee NPC');
assert.equal(ambientScene.registry.get('world.characters.diagnostics').personalizationScope, 'inventory-preview');
assert.equal(ambientScene.registry.get('world.characters.diagnostics').selectedItemReady, false);
let wrapped = false;
for (let i = 0; i < 600; i++) {
  const priorX = walker.x;
  ambientLayer.update(100);
  if (walker.x < priorX) { wrapped = true; assert.ok(priorX > 960); assert.ok(walker.x < -40); }
}
assert.ok(wrapped, 'Long-running ambient walk must return only outside the viewport');
walker.setPosition(1100, walker.y);
ambientScene.events.emit('ui:preferences', { reducedMotion: true });
assert.equal(walker.x, 300, 'Reduced motion brings a temporarily offscreen walker to its authored resting position');
const stillX = walker.x;
ambientLayer.update(100);
assert.equal(walker.x, stillX);
assert.equal(walker.frame, 0);
ambientLayer.destroy();
worldBridge.setAvatarPresentation(null);

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
console.log('PASS: authored cadence/pivot, immediate reduced-motion fallback, 3-actor animation budget, low-power sampling, explicit walk→idle, account item/companion selection, portrait placement, fixed-facing offscreen-only NPC wrap, sign-out/restart, missing-art diagnostic and loader/layer cleanup.');
