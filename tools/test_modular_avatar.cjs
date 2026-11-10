/* Adapter regression with scene doubles. Real artwork and GPU acceptance remain separate gates. */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../apps/web/node_modules/typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(`packages/world-engine/src/${file}`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, Error, require(id) { assert(id in dependencies, `Unexpected dependency ${id}`); return dependencies[id]; } });
  return exports;
}
class Events {
  listeners = new Map();
  on(key, fn, context) { const entries = this.listeners.get(key) ?? []; entries.push({ fn, context }); this.listeners.set(key, entries); }
  off(key, fn) { this.listeners.set(key, (this.listeners.get(key) ?? []).filter((entry) => entry.fn !== fn)); }
  emit(key, value) { for (const { fn, context } of this.listeners.get(key) ?? []) fn.call(context, value); }
  count() { return [...this.listeners.values()].reduce((total, entries) => total + entries.length, 0); }
}
const contract = load('runtime/modularAvatarManifest.ts');
const assets = load('runtime/characterAssets.ts', { './modularAvatarManifest.ts': contract });
const bridge = load('bridge/WorldBridge.ts', { '../runtime/characterAssets': assets });
const preferences = load('runtime/uiPreferences.ts');
const pending = [];
const releases = [];
const compositor = { acquire(profile, direction, action) { return new Promise((resolve, reject) => pending.push({ profile, direction, action, resolve, reject })); }, diagnostics() { return { test: true }; } };
const { HubModularAvatarLayer } = load('scenes/hub/HubModularAvatarLayer.ts', {
  phaser: { Textures: { FilterMode: { NEAREST: 0 } }, Scale: { Events: { RESIZE: 'resize' } } },
  '../../bridge/WorldBridge': bridge,
  '../../runtime/modularAvatarManifest': contract,
  '../../runtime/modularAvatarCompositor': { modularAvatarCompositor: compositor },
  '../../runtime/uiPreferences': preferences,
  './r01Layout': { getR01Layout(w, h) { return { width: w < h ? 480 : 960, height: w < h ? 780 : 540, portrait: w < h, shore: 190 }; } },
});
function scene() {
  const store = new Map(), textures = new Map(), images = [];
  return {
    store, texturesMap: textures, images, events: new Events(), scale: Object.assign(new Events(), { width: 960, height: 540 }),
    registry: { get(key) { return store.get(key); }, set(key, value) { store.set(key, value); } },
    textures: {
      createCanvas(key, width, height) {
        assert(!textures.has(key));
        const texture = { width, height, frames: [], context: { drawImage(source) { texture.source = source; } },
          add(...args) { this.frames.push(args); }, refresh() {}, setFilter(value) { this.filter = value; } };
        textures.set(key, texture); return texture;
      },
      remove(key) { const value = textures.get(key); value.width = value.height = 0; textures.delete(key); },
    },
    add: { image(x, y, key, frame) {
      const image = { x, y, key, frame, writes: 0, destroyed: false,
        setOrigin(x, y) { this.origin = [x, y]; return this; }, setScale(value) { this.scale = value; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; }, setDepth(value) { this.depth = value; return this; },
        setFrame(value) { this.frame = value; this.writes++; return this; }, destroy() { this.destroyed = true; },
      }; images.push(image); return image;
    } },
  };
}
function resolve(request, action = request.action) {
  const count = action === 'idle' ? 4 : 6;
  const body = { canvas: { width: 96 * count, height: 144 }, frame: { width: 96, height: 144, pivot: [48, 136] } };
  const value = { key: `${contract.avatarProfileKey(request.profile)}:${request.direction}:${action}`,
    manifest: { rigId: contract.MODULAR_AVATAR_RIG, revision: 'fixture' }, action, direction: request.direction,
    clip: { durationsMs: Array(count).fill(action === 'idle' ? 320 : 140), loop: true }, body,
    companion: request.profile.companion === 'companion.none' ? null : { canvas: { width: 64 * count, height: 64 }, frame: { width: 64, height: 64, pivot: [32, 60] }, anchor: [-34, 0] },
  };
  const release = { count: 0, value };
  releases.push(release);
  request.resolve({ value, release() { release.count++; } });
  return release;
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

(async () => {
  bridge.worldBridge.clear();
  const first = { ...contract.DEFAULT_MODULAR_AVATAR };
  const second = { ...first, hair: 'hair.long', heldItem: 'held.tablet', companion: 'companion.tit' };
  bridge.worldBridge.setAvatarPresentation(first);
  const world = scene(), budgets = [], layer = new HubModularAvatarLayer(world, (count) => budgets.push(count));
  const old = pending.shift();
  bridge.worldBridge.setAvatarPresentation(second);
  const newest = pending.shift();
  const staleLease = resolve(old); await flush();
  assert.equal(staleLease.count, 1);
  assert.equal(world.images.length, 0, 'Stale first-account response must not create a player');
  const activeLease = resolve(newest); await flush();
  const [body, child] = world.images;
  assert.deepEqual(body.origin, [.5, 136 / 144]);
  assert.equal(body.scale, .5);
  assert.equal(child.x, body.x - 17);
  assert.equal(child.y, body.y);
  assert.equal(budgets.at(-1), 2, 'Child actor reserves its own animation slot');
  assert.equal(world.store.get('world.avatar.diagnostics').profileKey, contract.avatarProfileKey(second));
  const upload = world.texturesMap.get(body.key);
  assert.notEqual(upload, activeLease.value.body.canvas, 'Phaser owns a copy, never the cache canvas');
  assert.deepEqual(upload.frames[3], ['3', 0, 288, 0, 96, 144]);

  for (let i = 0; i < 4; i++) layer.update(100);
  assert.equal(body.frame, 1);
  world.events.emit('ui:preferences', { reducedMotion: true });
  const frozen = body.writes;
  for (let i = 0; i < 10; i++) layer.update(100);
  assert.equal(body.frame, 0); assert.equal(body.writes, frozen);
  assert.equal(world.store.get('world.avatar.diagnostics').animatedActors, 0);
  world.events.emit('ui:preferences', { reducedMotion: false, lowPower: true });
  layer.update(100); layer.update(100);
  assert.equal(body.writes, frozen, 'Low power does not sample every display frame');
  layer.update(100); layer.update(100); layer.update(100); layer.update(100);
  assert.equal(body.frame, 1);
  world.events.emit('ui:preferences', { reducedMotion: false });
  layer.walkAvatarTo(600, 490);
  const walk = pending.shift();
  assert.equal(walk.direction, 'right'); assert.equal(walk.action, 'walk');
  resolve(walk); await flush();
  assert.equal(activeLease.count, 1);
  assert.equal(activeLease.value.body.canvas.width, 384, 'Texture removal must preserve another consumer’s cached canvas');
  const walker = world.images.at(-2);
  for (let i = 0; i < 10; i++) layer.update(100);
  assert.equal(walker.x, 600);
  const idle = pending.shift(); assert.equal(idle.action, 'idle'); resolve(idle); await flush();

  layer.walkAvatarTo(550, 490);
  const unavailableWalk = pending.shift(); resolve(unavailableWalk, 'idle'); await flush();
  const resting = world.images.at(-2);
  for (let i = 0; i < 4; i++) layer.update(100);
  assert.equal(resting.x, 600, 'Missing authored walk cannot become sliding idle');
  assert.match(world.store.get('world.avatar.diagnostics').error, /not accepted/);

  bridge.worldBridge.setAvatarPresentation({ ...first, top: 'top.sweater' });
  const afterSave = pending.shift();
  bridge.worldBridge.setAvatarPresentation(null);
  assert.equal(world.texturesMap.size, 0);
  assert.equal(budgets.at(-1), 0);
  const afterLogoutLease = resolve(afterSave); await flush();
  assert.equal(afterLogoutLease.count, 1);
  assert.equal(world.images.filter((image) => !image.destroyed).length, 0);
  assert.equal(world.store.get('world.avatar.diagnostics').profilePresent, false);

  bridge.worldBridge.setAvatarPresentation(first);
  pending.shift().reject(new Error('Incomplete catalog')); await flush();
  assert.equal(world.store.get('world.avatar.diagnostics').ready, false);
  assert.match(world.store.get('world.avatar.diagnostics').error, /Incomplete/);
  bridge.worldBridge.setAvatarPresentation(second);
  const onDestroy = pending.shift();
  layer.destroy();
  const destroyedLease = resolve(onDestroy); await flush();
  assert.equal(destroyedLease.count, 1);
  assert.equal(world.events.count(), 0); assert.equal(world.scale.count(), 0);
  assert.equal(world.texturesMap.size, 0);
  assert.ok(releases.every((lease) => lease.count === 1), 'Each pending/current composition lease is released exactly once');
  console.log('PASS: modular actor stale account/load disposal, full saved identity, exact foot pivots/cels, independent companion, shared animation reservation, reduced motion/low power, authored walk-to-idle, unavailable-action diagnostic, missing-art fallback, Phaser-owned upload cleanup.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
