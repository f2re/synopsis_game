/** Independent R09 integration handlers. Real project modules/manifest; scene
 * doubles only at the Phaser boundary. No browser, network or GPU claim. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require(path.join(process.cwd(), 'apps/web/node_modules/typescript'));
const root = 'packages/world-engine/src/';
const sources = [];
function load(file, imports = {}) {
  const input = fs.readFileSync(root + file, 'utf8'), exports = {};
  sources.push({ path: root + file, sha256: crypto.createHash('sha256').update(input).digest('hex') });
  const code = ts.transpileModule(input, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  vm.runInThisContext(`(function(exports,require){${code}\n})`, { filename: file })(exports, id => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected boundary import: ${id}`); return imports[id];
  });
  return exports;
}
function emitter() {
  const handlers = new Map();
  return {
    on(event, fn, context) { const list = handlers.get(event) || []; list.push({ fn, context }); handlers.set(event, list); return this; },
    off(event, fn, context) { handlers.set(event, (handlers.get(event) || []).filter(value => value.fn !== fn || value.context !== context)); return this; },
    emit(event, value) { for (const item of [...(handlers.get(event) || [])]) item.fn.call(item.context, value); return this; },
    count() { return [...handlers.values()].reduce((sum, values) => sum + values.length, 0); },
  };
}
const bridgeEvents = emitter(), diagnostics = [];
const bridge = {
  on(event, fn) { bridgeEvents.on(event, fn); return () => bridgeEvents.off(event, fn); },
  emit(event, value) { if (event === 'world:station_diagnostics') diagnostics.push(value); bridgeEvents.emit(event, value); },
};
const phaser = { CANVAS: 1, WEBGL: 2, Textures: { FilterMode: { NEAREST: 1 } }, BlendModes: { ADD: 1 }, Scale: { Events: { RESIZE: 'resize' } } };
const wind = load('scenes/hub/r09WindModel.ts');
const windLayer = load('scenes/hub/HubVegetationWindLayer.ts', { phaser, './r09WindModel': wind });
const sceneModel = load('scenes/hub/r09SceneModel.ts');
const actorLayout = load('scenes/hub/r09ActorLayout.ts');
const preferences = load('runtime/uiPreferences.ts');
const weather = load('scenes/hub/r01Environment.ts');
const manifestFile = root + 'assets/hub/r09-manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const nightKeys = new Map(manifest.assets.filter(asset => asset.role === 'night-light').map(asset => [asset.dayKey, asset.key]));
const { HubR09Layer } = load('scenes/hub/HubR09Layer.ts', {
  phaser, '../../assets/hub/r09-manifest.json': manifest, '../../bridge/WorldBridge': { worldBridge: bridge },
  '../../runtime/uiPreferences': preferences, './HubVegetationWindLayer': windLayer,
  './r01Environment': weather, './r09ActorLayout': actorLayout, './r09SceneModel': sceneModel,
});

function makeScene() {
  const objects = [], masks = [], filters = [], registry = new Map([['world.pixelRatio', 1], ['ui.world_visible', true]]);
  const canvasTextures = new Map();
  const ownerDocument = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return { getContext(kind, options) {
        assert.equal(kind, '2d');
        assert.equal(options.alpha, true, 'Tint canvas alpha is selected before Phaser initializes its context');
        this.alpha = options.alpha;
        return {};
      } };
    },
  };
  const image = (x = 0, y = 0, key) => {
    const value = { x, y, key, destroyed: 0, width: 0, rectangles: [],
      get texture() { return { key: this.key }; },
      setOrigin(x, y) { this.origin = [x, y]; return this; },
      setDepth(v) { this.depth = v; return this; }, setTint(...values) { this.tint = values[0]; this.tintArguments = values; return this; },
      setTexture(key) { this.key = key; return this; },
      setAlpha(...values) { this.alpha = values[0]; this.alphaArguments = values; return this; }, setBlendMode(v) { this.blend = v; return this; },
      setScale(x, y) { this.scale = [x, y]; return this; },
      setDisplayOrigin(x, y) { this.displayOrigin = [x, y]; return this; },
      setCrop(x, y, width, height) { this.crop = [x, y, width, height]; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; }, setX(x) { this.x = x; return this; },
      setMask(mask) { this.mask = mask; return this; }, clearMask() { this.mask = null; return this; },
      setVisible(value) { this.visible = value; return this; },
      clear() { this.rectangles = []; return this; }, fillStyle(color, alpha) { this.fill = [color, alpha]; return this; },
      fillRect(...rect) { this.rectangles.push(rect); return this; },
      beginPath() { return this; }, moveTo() { return this; }, lineTo() { return this; }, closePath() { return this; }, fillPath() { return this; },
      createGeometryMask() { const mask = { source: this, destroyed: 0, destroy() { this.destroyed++; } }; masks.push(mask); return mask; },
      destroy() { this.destroyed++; },
    };
    objects.push(value); return value;
  };
  const scene = { objects, masks, filters, registry, canvasTextures, events: emitter(), game: { renderer: { type: phaser.WEBGL } },
    scale: Object.assign(emitter(), { width: 1366, height: 768 }),
    textures: {
      exists(key) { return canvasTextures.has(key) || manifest.assets.some(asset => asset.key === key); },
      get(key) { const actorSheet = key === 'character:test-actor';
        const asset = actorSheet ? { width: 64, height: 48 } : manifest.assets.find(asset => asset.key === key);
        assert.ok(asset, `A real manifest asset is required: ${key}`);
        return { setFilter(value) { filters.push(value); },
          getFrameNames() { return actorSheet ? ['0', '1'] : []; },
          get(name) { return { cutX: Number(name) * 32, cutY: 0, cutWidth: 32, cutHeight: 48 }; },
          getSourceImage() {
          return { width: asset.width, height: asset.height, naturalWidth: asset.width, ownerDocument };
        } }; },
      createCanvas() { assert.fail('A pooled Canvas can already have an opaque backing context'); },
      addCanvas(key, canvas) {
        assert.equal(canvas.alpha, true);
        assert.ok(!canvasTextures.has(key), 'One canvas texture per plane or fixed light color');
        const texture = { frames: [], writes: 0, add(...frame) { this.frames.push(frame); },
          setFilter(value) { filters.push(value); }, getContext() {
          return { clearRect() {}, drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]) }; },
            putImageData(pixels) { texture.pixels = [...pixels.data]; texture.writes++; } };
        } };
        canvasTextures.set(key, texture);
        return texture;
      },
      remove(key) { assert.ok(canvasTextures.delete(key), 'Every tinted texture is released once'); },
    },
    add: { image, graphics: () => image() },
    cameras: { main: {
      setViewport(...value) { this.viewport = value; return this; }, setZoom(value) { this.zoom = value; return this; },
      centerOn(x, y) { this.center = [x, y]; return this; }, setRoundPixels(value) { this.round = value; return this; },
      setBackgroundColor(value) { this.background = value; return this; },
    } },
  };
  return scene;
}
function inspectStepReceiver(scene, layer) {
  const regions = manifest.lightRegions.filter(region => region.verticalFalloff);
  assert.equal(regions.length, 1, 'The reviewed source has one bounded receiver with a vertical falloff');
  const region = regions[0], [x, y, width, height] = region.sourceBounds;
  assert.deepEqual(region.verticalFalloff, [1, .25]); assert.equal(height, 9);
  const asset = manifest.assets.find(asset => asset.role === region.maskRole);
  const strips = scene.objects.filter(value => value.key === asset.key && value.depth === 32 && value.crop
    && value.crop[0] === x && value.crop[1] >= y && value.crop[1] < y + height && value.crop[2] === width).sort((a, b) => a.crop[1] - b.crop[1]);
  assert.equal(strips.length, 9, 'The fade uses nine authored one-pixel source strips');
  for (const [index, strip] of strips.entries()) {
    assert.deepEqual(strip.crop, [x, y + index, width, 1], 'Each consecutive receiver strip occupies exactly one native row');
    assert.ok(strip.crop.every(Number.isInteger)); assert.deepEqual([strip.x, strip.y], [0, 0]);
    assert.deepEqual(strip.origin, [0, 0]); assert.ok(!strip.scale || strip.scale.every(value => value === 1));
  }
  const phaseAlphas = [];
  for (const phase of ['day', 'dawn', 'golden_hour', 'twilight', 'night', 'white_nights']) {
    layer.applyDayPhase(phase);
    const alphas = strips.map(strip => strip.alpha);
    assert.ok(alphas.every(value => Number.isFinite(value) && value > 0 && value <= .65));
    assert.ok(alphas.slice(1).every((value, index) => value < alphas[index]), 'Reflected light decreases toward the lower edge');
    assert.ok(Math.abs(alphas.at(-1) / alphas[0] - .25) < 1e-12, 'The lower edge has one quarter of the upper-row receiver strength');
    assert.ok(strips.every(strip => strip.alphaArguments.length === 1 && strip.tintArguments.length === 1),
      'Every native strip has uniform alpha/tint, without per-vertex interpolation');
    if (phase === 'night') assert.equal(alphas[0], Math.min(.65, region.suggestedAlpha * 1.13));
    phaseAlphas.push({ phase, alphas });
  }
  return { id: region.id, weather: layer.getEnvironment().weather, rows: strips.length, sourceBounds: region.sourceBounds, phaseAlphas };
}
const rows = [];
for (let cycle = 0; cycle < 3; cycle++) {
  const scene = makeScene(), layer = new HubR09Layer(scene);
  const snapshot = () => scene.registry.get('world.station');
  const first = snapshot(), created = scene.objects.length;
  const fixed = scene.objects.filter(value => manifest.assets.some(asset => ['sky', 'water', 'architecture-ground', 'foreground-occluder'].includes(asset.role) && asset.key === value.key));
  const lit = scene.objects.filter(value => nightKeys.has(value.key));
  const dayKeys = lit.map(value => value.key);
  const geometry = () => lit.map(({ x, y, origin, scale, depth, crop, displayOrigin }) => [x, y, origin, scale, depth, crop, displayOrigin]);
  const coordinates = fixed.map(value => [value.key, value.x, value.y]);
  const architecture = manifest.assets.find(asset => asset.role === 'architecture-ground');
  const architectureImages = fixed.filter(image => image.key === architecture.key);
  assert.equal(architectureImages.length, 1, 'Draw the architecture with one quad');
  assert.deepEqual([architectureImages[0].x, architectureImages[0].y], architecture.originalSceneXY);
  assert.equal(architectureImages[0].scale[0], 1 / architecture.density);
  assert.equal(architectureImages[0].depth, 3);
  assert.equal(first.stationArt, 'r09'); assert.deepEqual(first.sourceCanvas, [512, 288]);
  assert.equal(first.assets.count, manifest.assets.length);
  assert.equal(first.motion.foliage.placements, manifest.assets.filter(asset => asset.role === 'vegetation').length);
  const windDepth = (id) => {
    const asset = manifest.assets.find(asset => asset.id === `hub.r09.foliage.${id}`);
    const bands = scene.objects.filter(image => image.key === asset.key);
    assert.ok(bands.length > 1, `${id} uses real moving source bands`);
    assert.ok(bands.every(image => image.depth === bands[0].depth));
    return bands[0].depth;
  };
  assert.ok(windDepth('west-stair-fir') < actorLayout.r09ActorDepth(217), 'Observer crosses in front of the west stair tree');
  assert.ok(windDepth('east-walk-fir') > actorLayout.r09ActorDepth(222), 'A path behind the eastern fir remains occluded');
  assert.ok(windDepth('east-walk-fir') < actorLayout.r09ActorDepth(236), 'A path in front of the eastern fir stays visible');
  assert.ok(windDepth('foreground-right') > 31, 'The near shrubs paint over the stationary balustrade');
  assert.equal(first.motion.foliage.rootDisplacement, 0); assert.ok(scene.filters.every(value => value === phaser.Textures.FilterMode.NEAREST));
  assert.equal(first.camera.mode, 'overview');
  assert.ok(first.camera.visibleSourceBounds[2] > 511.9);
  assert.ok(first.camera.offsetY <= .5 && first.camera.offsetY + first.camera.zoom * 288 >= 767.5);
  assert.equal(scene.cameras.main.round, false);
  assert.equal(scene.masks.length, 3, 'Cloud, stars and water have distinct reviewed masks');
  const clouds = manifest.assets.filter(asset => asset.role === 'clouds').map(asset => ({ asset, image: scene.objects.find(value => value.key === asset.key) }));
  assert.equal(clouds.length, 1, 'Only the reviewed small cloud island is movable');
  for (const { asset, image } of clouds) {
    assert.equal(image.y, asset.originalSceneXY[1]); assert.ok(!image.scale || image.scale.every(value => value === 1));
    assert.deepEqual(image.mask.source.rectangles, manifest.domains.cloudClip.rowSpans.map(([y, left, right]) => [left, y, right - left, 1]),
      'Cloud motion uses the exact end-exclusive traced corridor, not the coarse sky outline');
    assert.notEqual(image.mask, scene.objects.find(value => value.depth === .25).mask, 'Clouds do not borrow the stars/sky mask');
    assert.notEqual(image.mask, scene.objects.find(value => value.depth === 1.5).mask, 'Clouds do not borrow the water mask');
  }

  const initialCamera = first.camera;
  bridge.emit('ui:station_pan', 'right');
  assert.deepEqual(snapshot().camera, initialCamera, 'A panorama showing the full source width does not pan');
  bridge.emit('ui:station_view', 'detail');
  const detailCamera = snapshot().camera;
  assert.ok(scene.cameras.main.round && Number.isInteger(scene.cameras.main.zoom));
  bridge.emit('ui:station_pan', 'right');
  assert.ok(snapshot().camera.centerX > detailCamera.centerX, 'The production panorama handler must actually move the camera');
  for (const [width, height, ratio] of [[780, 1688, 2], [1688, 780, 2], [1366, 768, 1]]) {
    scene.scale.width = width; scene.scale.height = height; scene.registry.set('world.pixelRatio', ratio);
    scene.scale.emit('resize');
    assert.equal(scene.objects.length, created, 'Resizing reuses the same scene objects');
  }
  assert.deepEqual(snapshot().camera, detailCamera, 'Returning to desktop restores the detail camera after a real pan');
  bridge.emit('ui:station_view', 'overview');
  assert.deepEqual(snapshot().camera, initialCamera, 'The overview always restores its fullscreen composition');
  assert.deepEqual(fixed.map(value => [value.key, value.x, value.y]), coordinates, 'Pan and resize leave every static source object planted');

  const diagnosticCount = diagnostics.length;
  for (let frame = 0; frame < 300; frame++) layer.update(100);
  assert.equal(diagnostics.length - diagnosticCount, 30, 'Animation publishes read-only diagnostics once per second');
  assert.ok(snapshot().motion.foliage.paintedFrames >= 300);
  assert.equal(snapshot().motion.foliage.rootDisplacement, 0);
  assert.deepEqual(fixed.map(value => [value.key, value.x, value.y]), coordinates, 'Environmental motion never translates the buildings or ground');
  const movingClouds = manifest.assets.filter(asset => asset.role === 'clouds' && asset.motionReady === true).length;
  if (movingClouds) assert.ok(snapshot().motion.cloudOffsets.some(value => value !== 0), 'Accepted movable cloud islands travel');
  for (const { asset, image } of clouds) assert.equal(image.y, asset.originalSceneXY[1], 'Cloud motion stays in its authored native rows');
  assert.ok(snapshot().motion.waterFrame > 0);

  layer.setWeather({ mode: 'rain', animate: true }); assert.equal(layer.getEnvironment().rainDrops, 72);
  bridge.emit('ui:world_visible', false);
  const hidden = JSON.stringify(snapshot());
  for (let tick = 0; tick < 10; tick++) layer.update(5_000);
  assert.equal(JSON.stringify(snapshot()), hidden, 'Hidden intervals hold the last published motion');
  assert.equal(layer.getEnvironment().rainDrops, 0);
  bridge.emit('ui:world_visible', true);
  const beforeResume = snapshot().motion.clockMs;
  for (let tick = 0; tick < 10; tick++) layer.update(5_000);
  assert.equal(snapshot().motion.clockMs - beforeResume, 1000, 'Resume clamps each oversized delta to 100ms');

  scene.events.emit('ui:preferences', { reducedMotion: true });
  assert.ok(snapshot().motion.foliage.poses.every(pose => pose.offsets.every(offset => offset[0] === 0 && offset[1] === 0)));
  assert.ok(snapshot().motion.cloudOffsets.every(value => value === 0)); assert.equal(snapshot().motion.waterFrame, 0);
  const still = JSON.stringify(snapshot()); layer.update(5_000); assert.equal(JSON.stringify(snapshot()), still);
  scene.events.emit('ui:preferences', { reducedMotion: false, lowPower: true });
  const lowBefore = snapshot().motion.foliage.paintedFrames;
  for (let tick = 0; tick < 10; tick++) layer.update(100);
  assert.equal(snapshot().motion.foliage.paintedFrames - lowBefore, 5);
  assert.equal(layer.getEnvironment().rainDrops, 0);
  assert.equal(snapshot().motion.foliage.cadenceMs, 200);
  layer.applyDayPhase('night'); assert.equal(snapshot().phase, 'night');
  const stepReceiver = inspectStepReceiver(scene, layer);
  const beforeNightGeometry = geometry();
  layer.applyDayPhase('night');
  assert.deepEqual(lit.map(value => value.key), dayKeys.map(key => nightKeys.get(key)), 'WebGL switches to the approved registered plates');
  assert.deepEqual(geometry(), beforeNightGeometry, 'The relight keeps positions, scale, occlusion and source crops');
  const scenery = scene.objects.find(value => value.key === nightKeys.get(architecture.key));
  assert.equal(scenery.tint, sceneModel.R09_RAIN_TINTS.scenery, 'Rain only modulates the approved night plate');
  assert.equal(clouds[0].image.visible, false, 'The original wisp is already inside the approved night sky');
  assert.equal(scene.objects.find(value => value.depth === .25).rectangles.length, 0, 'The approved night sky has no extra procedural stars');
  for (let frame = 0; frame < 100; frame++) layer.update(100);
  assert.ok(snapshot().motion.cloudOffsets.every(value => value === 0), 'The previous moving cloud stays detached from the night render at late times');
  layer.setWeather({ mode: 'clear' });
  assert.ok(lit.every(image => image.tint === 0xffffff), 'Clear night plates are never tinted twice');
  layer.applyDayPhase('day');
  assert.deepEqual(lit.map(value => value.key), dayKeys, 'Day returns to the original textures');
  assert.equal(clouds[0].image.visible, true);
  assert.ok(snapshot().motion.cloudOffsets.some(value => value !== 0), 'The daytime cloud resumes its route');
  assert.equal(scene.objects.length, created, 'Lighting never adds render objects');

  layer.destroy(); layer.destroy();
  assert.ok(scene.objects.every(value => value.destroyed === 1), 'Every image and graphics object is released exactly once');
  assert.ok(scene.masks.every(value => value.destroyed === 1), 'Every geometry mask is released exactly once');
  assert.equal(scene.events.count(), 0); assert.equal(scene.scale.count(), 0); assert.equal(bridgeEvents.count(), 0);
  rows.push({ cycle: cycle + 1, objects: created, masks: scene.masks.length, remainingListeners: bridgeEvents.count(), movingClouds, stepReceiver });
}

// The shipping Scene supplies native frame timestamps. Deliberately inflated
// Phaser deltas must not make scenery or the returned actor interval run fast.
const clockScene = makeScene(), clockLayer = new HubR09Layer(clockScene);
const clockSnapshot = () => { clockLayer.applyDayPhase('day'); return clockScene.registry.get('world.station'); };
let frameTime = 1000, returnedElapsed = 0;
assert.equal(clockLayer.update(80, frameTime), 0, 'The first native frame seeds time without inventing elapsed time');
for (let frame = 1; frame <= 60; frame++) {
  frameTime = 1000 + frame * 1000 / 60;
  const elapsed = clockLayer.update(frame % 2 ? 31 : 42, frameTime);
  assert.ok(Math.abs(elapsed - 1000 / 60) < 1e-9, 'Actors receive the actual frame interval despite the inflated Phaser delta');
  returnedElapsed += elapsed;
}
const oneSecond = clockSnapshot().motion;
assert.ok(Math.abs(returnedElapsed - 1000) < 1e-9);
assert.ok(Math.abs(oneSecond.clockMs - 1000) < 1e-9);
assert.ok(Math.abs(oneSecond.foliage.elapsedMs - 1000) < 1e-9);
assert.equal(oneSecond.foliage.paintedFrames, 10, 'Ten normal vegetation paints occupy one actual second');

for (const stamp of [frameTime, frameTime - 1000, NaN, Infinity, -Infinity]) {
  assert.equal(clockLayer.update(80, stamp), 0, 'Repeated, backwards and invalid timestamps do not advance motion');
}
frameTime += 20;
assert.equal(clockLayer.update(80, frameTime), 20, 'Invalid timestamps cannot replace the last valid timestamp');
frameTime += 5000;
assert.equal(clockLayer.update(5000, frameTime), 100, 'An actual oversized frame remains capped at 100ms');

bridge.emit('ui:world_visible', false);
const hiddenClock = JSON.stringify(clockScene.registry.get('world.station').motion);
frameTime += 15000;
assert.equal(clockLayer.update(5000, frameTime), 0);
assert.equal(JSON.stringify(clockScene.registry.get('world.station').motion), hiddenClock, 'A hidden native interval preserves clock, water, clouds and vegetation pose');
bridge.emit('ui:world_visible', true);
frameTime += 15000;
assert.equal(clockLayer.update(5000, frameTime), 0, 'The first resumed frame excludes the entire hidden interval');
frameTime += 20; assert.equal(clockLayer.update(80, frameTime), 20);
bridge.emit('ui:world_visible', true);
frameTime += 20;
assert.equal(clockLayer.update(80, frameTime), 20, 'An unchanged visibility notification does not discard a live interval');

clockScene.events.emit('ui:preferences', { reducedMotion: true });
const reducedClock = JSON.stringify(clockScene.registry.get('world.station').motion);
frameTime += 20000; assert.equal(clockLayer.update(5000, frameTime), 0);
assert.equal(JSON.stringify(clockScene.registry.get('world.station').motion), reducedClock, 'Reduced motion holds its native clock and still pose');
clockScene.events.emit('ui:preferences', { reducedMotion: false });
frameTime += 20000;
assert.equal(clockLayer.update(5000, frameTime), 0, 'Leaving reduced motion resets the native time origin');
frameTime += 20; assert.equal(clockLayer.update(80, frameTime), 20);

clockScene.events.emit('ui:preferences', { lowPower: true });
const lowBefore = clockSnapshot().motion;
for (let frame = 0; frame < 20; frame++) { frameTime += 50; assert.equal(clockLayer.update(100, frameTime), 50); }
const lowAfter = clockSnapshot().motion;
assert.equal(lowAfter.clockMs - lowBefore.clockMs, 1000);
assert.equal(lowAfter.foliage.paintedFrames - lowBefore.foliage.paintedFrames, 5, 'Low power keeps five vegetation paints per actual second');
assert.equal(clockLayer.update(35), 35, 'Existing manual-delta handler callers keep their explicit contract');
frameTime += 40; assert.equal(clockLayer.update(80, frameTime), 0, 'Switching from the manual contract reseeds native timestamps');
frameTime += 10; assert.equal(clockLayer.update(80, frameTime), 10);
clockLayer.destroy();
assert.equal(clockLayer.update(5000, frameTime + 5000), 0);
assert.ok(clockScene.objects.every(value => value.destroyed === 1));
assert.ok(clockScene.masks.every(value => value.destroyed === 1));
assert.equal(bridgeEvents.count(), 0); assert.equal(clockScene.events.count(), 0); assert.equal(clockScene.scale.count(), 0);
const nativeFrameClock = { status: 'PASS', nativeElapsedMs: 1000, returnedActorElapsedMs: returnedElapsed,
  sceneryElapsedMs: oneSecond.clockMs, foliageElapsedMs: oneSecond.foliage.elapsedMs, normalPaintedFrames: oneSecond.foliage.paintedFrames,
  lowPowerElapsedMs: lowAfter.clockMs - lowBefore.clockMs, lowPowerPaintedFrames: lowAfter.foliage.paintedFrames - lowBefore.foliage.paintedFrames,
  covered: ['inflated Phaser delta', 'duplicate/backwards/invalid timestamps', '100ms frame cap', 'native hidden/resume origin',
    'unchanged visibility notification', 'reduced-motion origin', 'low-power cadence', 'manual fallback reseeding', 'disposed layer'] };
const canvasScene = makeScene();
canvasScene.game.renderer.type = phaser.CANVAS;
const canvasLayer = new HubR09Layer(canvasScene);
assert.equal(canvasScene.cameras.main.round, false, 'Canvas must skip Phaser half-pixel sprite enlargement');
const receiver = manifest.lightRegions[0];
const receiverAsset = manifest.assets.find(asset => asset.role === receiver.maskRole);
const receiverTexture = canvasScene.canvasTextures.get(`${receiverAsset.key}_r09_canvas_${receiver.tint}`);
const colorChannels = tint => [tint >> 16 & 255, tint >> 8 & 255, tint & 255, 255, 0, 0, 0, 0];
assert.deepEqual(receiverTexture.pixels, colorChannels(Number.parseInt(receiver.tint.slice(1), 16)), 'Tinted light samples preserve alpha and warm receiver color');
const waterKey = manifest.assets.find(asset => asset.role === 'water').key;
const waterPlane = canvasScene.objects.find(object => object.key === waterKey);
canvasLayer.setWeather({ mode: 'rain' });
const phaseKey = `${waterKey}_r09_canvas_phase`;
assert.equal(waterPlane.key, phaseKey);
const waterTexture = canvasScene.canvasTextures.get(phaseKey);
assert.deepEqual(waterTexture.pixels, colorChannels(sceneModel.r09PhaseStyle('day', true).water));
canvasLayer.applyDayPhase('day'); assert.equal(waterTexture.writes, 1, 'Repeated phase reuses the tinted source pixels');
canvasLayer.applyDayPhase('night');
const nightWaterKey = nightKeys.get(waterKey);
const nightWaterTint = canvasScene.canvasTextures.get(`${nightWaterKey}_r09_canvas_phase`);
assert.equal(waterPlane.key, `${nightWaterKey}_r09_canvas_phase`);
assert.deepEqual(nightWaterTint.pixels, colorChannels(sceneModel.R09_RAIN_TINTS.water));
canvasLayer.applyDayPhase('night');
assert.equal(nightWaterTint.writes, 1, 'A repeated night phase reuses the tinted night texture');
assert.equal(waterTexture.writes, 1, 'Night leaves the daytime palette cache intact');
canvasLayer.setWeather({ mode: 'clear' });
assert.equal(waterPlane.key, nightWaterKey, 'Clear Canvas night uses the approved source plate directly');
const actorLighting = canvasLayer.getActorLighting();
assert.ok(actorLighting.lamp > actorLighting.ambient, 'The archive lamp warms and lifts the nighttime actor palette');
const ambientActorKey = actorLighting.resolveTexture('character:test-actor', actorLighting.ambient, 'actor-ambient');
const warmActorKey = actorLighting.resolveTexture('character:test-actor', actorLighting.lamp, 'actor-lamp');
const actorTexture = canvasScene.canvasTextures.get(ambientActorKey);
assert.deepEqual(actorTexture.frames, [['0', 0, 0, 0, 32, 48], ['1', 0, 32, 0, 32, 48]]);
assert.deepEqual(actorTexture.pixels, colorChannels(actorLighting.ambient));
assert.deepEqual(canvasScene.canvasTextures.get(warmActorKey).pixels, colorChannels(actorLighting.lamp));
assert.equal(actorLighting.resolveTexture('character:test-actor', actorLighting.ambient, 'actor-ambient'), ambientActorKey);
assert.equal(actorTexture.writes, 1, 'Actor motion and clip reuse do not rewrite the tint sheet');
canvasLayer.destroy();
assert.equal(canvasScene.canvasTextures.size, 0);
assert.equal(bridgeEvents.count(), 0);
console.log(JSON.stringify({ status: 'PASS', scope: 'Real R09 integration handlers with Phaser scene doubles; no browser or rendered-pixel acceptance',
  manifestSha256: crypto.createHash('sha256').update(fs.readFileSync(manifestFile)).digest('hex'), sources, cycles: rows, nativeFrameClock }, null, 2));
