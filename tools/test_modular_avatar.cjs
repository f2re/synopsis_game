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
const walkway = load('scenes/hub/avatarWalkway.ts');
const pending = [];
const releases = [];
const compositor = { acquire(profile, direction, action) { return new Promise((resolve, reject) => pending.push({ profile, direction, action, resolve, reject })); }, diagnostics() { return { test: true }; } };
const { HubModularAvatarLayer } = load('scenes/hub/HubModularAvatarLayer.ts', {
  phaser: { Textures: { FilterMode: { NEAREST: 0 } }, Scale: { Events: { RESIZE: 'resize' } } },
  '../../bridge/WorldBridge': bridge,
  '../../runtime/modularAvatarManifest': contract,
  '../../runtime/modularAvatarCompositor': { modularAvatarCompositor: compositor },
  '../../runtime/uiPreferences': preferences,
  '../../theme/tokens': { WORLD_PALETTE: { windowLight2: 0xffeeaa } },
  './avatarWalkway': walkway,
  './r01Layout': { getR01Layout(w, h) { return { width: w < h ? 480 : 960, height: w < h ? 780 : 540, portrait: w < h, shore: 190, zoom: 1 }; } },
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
    add: { graphics() { return { setDepth() { return this; }, clear() {}, lineStyle() {}, lineBetween() {}, strokeRect() {}, destroy() { this.destroyed = true; } }; }, image(x, y, key, frame) {
      const image = { x, y, key, frame, writes: 0, destroyed: false,
        setOrigin(x, y) { this.origin = [x, y]; return this; }, setScale(value) { this.scale = value; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; }, setDepth(value) { this.depth = value; return this; },
        setFrame(value) { this.frame = value; this.writes++; return this; }, destroy() { this.destroyed = true; },
      }; images.push(image); return image;
    } },
  };
}
function resolve(request, action = request.action, accepted = ['idle', 'walk', 'inspect']) {
  const count = action === 'idle' ? 4 : 6;
  const body = { canvas: { width: 96 * count, height: 144 }, frame: { width: 96, height: 144, pivot: [48, 136] } };
  const value = { key: `${contract.avatarProfileKey(request.profile)}:${request.direction}:${action}`,
    manifest: { rigId: contract.MODULAR_AVATAR_RIG, revision: 'fixture', clips: Object.fromEntries(accepted.map((clip) => [clip, {}])) }, action, direction: request.direction,
    clip: { durationsMs: Array(count).fill(action === 'idle' ? 320 : action === 'walk' ? 140 : 240), loop: action !== 'inspect' }, body,
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
  layer.walkAvatarTo(544, 454);
  const walk = pending.shift();
  assert.equal(walk.direction, 'up'); assert.equal(walk.action, 'walk');
  resolve(walk); await flush();
  assert.equal(activeLease.count, 1);
  assert.equal(activeLease.value.body.canvas.width, 384, 'Texture removal must preserve another consumer’s cached canvas');
  const walker = world.images.at(-2);
  for (let i = 0; i < 10; i++) layer.update(100);
  assert.equal(walker.x, 544); assert.equal(walker.y, 454);
  const idle = pending.shift(); assert.equal(idle.action, 'idle'); resolve(idle); await flush();

  layer.walkAvatarTo(544, 490);
  const unavailableWalk = pending.shift(); resolve(unavailableWalk, 'idle'); await flush();
  const resting = world.images.at(-2);
  for (let i = 0; i < 4; i++) layer.update(100);
  assert.equal(resting.y, 454, 'Missing authored walk cannot become sliding idle');
  assert.match(world.store.get('world.avatar.diagnostics').error, /not accepted/);

  layer.walkAvatarTo(700, 400);
  assert.equal(pending.length, 0, 'A building and unmarked ground cannot become a route');
  layer.walkAvatarTo(544, 490);
  const cancelledWalk = pending.shift();
  world.events.emit('ui:preferences', { reducedMotion: true });
  assert.equal(resting.y, 454, 'Changing preferences never completes an unrendered walk');
  assert.equal(resolve(cancelledWalk).count, 0); await flush();
  assert.equal(releases.at(-1).count, 1, 'A walk cancelled before async load cannot activate afterwards');
  assert.equal(world.store.get('world.avatar.diagnostics').action, 'idle');
  world.events.emit('ui:preferences', { reducedMotion: false });

  layer.inspectAvatar();
  const inspectRequest = pending.shift(); assert.equal(inspectRequest.action, 'inspect');
  resolve(inspectRequest); await flush();
  const inspecting = world.images.at(-2);
  layer.update(100); layer.update(100); layer.update(100);
  const inspectFrame = inspecting.frame;
  bridge.worldBridge.emit('ui:world_visible', false);
  for (let i = 0; i < 40; i++) layer.update(100);
  assert.equal(inspecting.frame, inspectFrame, 'A hidden world does not spend the one-shot clock');
  assert.equal(pending.length, 0);
  bridge.worldBridge.emit('ui:world_visible', true);
  for (let i = 0; i < 12; i++) layer.update(100);
  assert.equal(pending.length, 1, 'One completed inspect returns to idle once');
  assert.equal(pending[0].action, 'idle'); resolve(pending.shift()); await flush();

  bridge.worldBridge.emit('ui:avatar_command', { kind: 'step', direction: 'down' });
  assert.equal(pending.length, 0, 'Unfocused controls cannot move a character');
  bridge.worldBridge.emit('ui:avatar_command', { kind: 'controls', open: true });
  bridge.worldBridge.emit('ui:avatar_command', { kind: 'step', direction: 'down' });
  const focusedWalk = pending.shift(); assert.equal(focusedWalk.action, 'walk'); resolve(focusedWalk); await flush();
  layer.update(100);
  const beforeModal = world.images.at(-2).y;
  bridge.worldBridge.emit('ui:modal_open', true);
  const modalIdle = pending.shift(); resolve(modalIdle); await flush();
  for (let i = 0; i < 30; i++) layer.update(100);
  assert.equal(world.images.at(-2).y, beforeModal, 'Opening learning UI cancels movement at its present point');
  bridge.worldBridge.emit('ui:avatar_command', { kind: 'controls', open: true });
  bridge.worldBridge.emit('ui:avatar_command', { kind: 'step', direction: 'down' });
  assert.equal(pending.length, 0, 'Modal blocks even a directly emitted command');
  bridge.worldBridge.emit('ui:modal_open', false);

  layer.walkAvatarTo(400, 490);
  resolve(pending.shift()); await flush();
  layer.update(100); layer.update(100); layer.update(100);
  const retainedFrame = world.images.at(-2).frame;
  layer.walkAvatarTo(400, 490);
  assert.equal(pending.length, 0, 'Retargeting the same walk direction reuses the current upload and stride');
  assert.equal(world.images.at(-2).frame, retainedFrame);
  let previous = { x: world.images.at(-2).x, y: world.images.at(-2).y };
  for (let i = 0; i < 90; i++) {
    layer.update(100);
    if (pending.length) { resolve(pending.shift()); await flush(); }
    const player = world.images.at(-2);
    assert.ok(Math.hypot(player.x - previous.x, player.y - previous.y) <= 6, 'Corners cannot teleport or cut through the fountain');
    previous = { x: player.x, y: player.y };
  }
  assert.equal(previous.x, 400); assert.equal(previous.y, 490);
  assert.equal(world.store.get('world.avatar.diagnostics').action, 'idle');

  bridge.worldBridge.setAvatarPresentation({ ...first, top: 'top.hoodie' });
  assert.equal(world.store.get('world.avatar.diagnostics').ready, false, 'A changed profile immediately removes the previous navigation capabilities');
  assert.deepEqual(Array.from(world.store.get('world.avatar.diagnostics').acceptedActions), []);
  resolve(pending.shift(), 'idle', ['idle']); await flush();
  const idleOnly = world.images.at(-1);
  layer.walkAvatarTo(544, 460); layer.inspectAvatar();
  world.events.emit('ui:preferences', { reducedMotion: true });
  layer.walkAvatarTo(544, 460);
  assert.equal(pending.length, 0, 'An idle-only accepted manifest cannot unlock walk or inspect, including reduced motion');
  assert.equal(idleOnly.y, 490, 'Reduced motion cannot bypass the accepted walk gate');
  assert.deepEqual(Array.from(world.store.get('world.avatar.diagnostics').acceptedActions), ['idle']);
  world.scale.width = 390; world.scale.height = 844; world.scale.emit('resize');
  assert.equal(idleOnly.x, 241); assert.equal(idleOnly.y, 595, 'Orientation changes use the portrait path spawn');

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
  console.log('PASS: modular actor identity/lease disposal, accepted-only path navigation, focused input, modal cancellation, visibility pause, reduced-motion pending-load cancellation, inspect one-shot return, unavailable-art gate, low-power sampling, Phaser-owned uploads.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
