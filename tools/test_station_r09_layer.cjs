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
const phaser = { Textures: { FilterMode: { NEAREST: 0 } }, BlendModes: { ADD: 1 }, Scale: { Events: { RESIZE: 'resize' } } };
const wind = load('scenes/hub/r09WindModel.ts');
const windLayer = load('scenes/hub/HubVegetationWindLayer.ts', { phaser, './r09WindModel': wind });
const sceneModel = load('scenes/hub/r09SceneModel.ts');
const preferences = load('runtime/uiPreferences.ts');
const weather = load('scenes/hub/r01Environment.ts');
const manifestFile = root + 'assets/hub/r09-manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const { HubR09Layer } = load('scenes/hub/HubR09Layer.ts', {
  phaser, '../../assets/hub/r09-manifest.json': manifest, '../../bridge/WorldBridge': { worldBridge: bridge },
  '../../runtime/uiPreferences': preferences, './HubVegetationWindLayer': windLayer,
  './r01Environment': weather, './r09SceneModel': sceneModel,
});

function makeScene() {
  const objects = [], masks = [], filters = [], registry = new Map([['world.pixelRatio', 1], ['ui.world_visible', true]]);
  const image = (x = 0, y = 0, key) => {
    const value = { x, y, key, destroyed: 0, width: 0, rectangles: [],
      setOrigin(x, y) { this.origin = [x, y]; return this; },
      setDepth(v) { this.depth = v; return this; }, setTint(...values) { this.tint = values[0]; this.tintArguments = values; return this; },
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
  const scene = { objects, masks, filters, registry, events: emitter(),
    scale: Object.assign(emitter(), { width: 1366, height: 768 }),
    textures: {
      exists(key) { return manifest.assets.some(asset => asset.key === key); },
      get(key) { const asset = manifest.assets.find(asset => asset.key === key); assert.ok(asset, `A real manifest asset is required: ${key}`);
        return { setFilter(value) { filters.push(value); }, getSourceImage() { return { width: asset.width, height: asset.height }; } }; },
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
  const coordinates = fixed.map(value => [value.key, value.x, value.y]);
  assert.equal(first.stationArt, 'r09'); assert.deepEqual(first.sourceCanvas, [512, 288]);
  assert.equal(first.assets.count, manifest.assets.length); assert.equal(first.motion.foliage.placements, 5);
  assert.equal(first.motion.foliage.rootDisplacement, 0); assert.ok(scene.filters.every(value => value === 0));
  assert.ok(scene.cameras.main.round && Number.isInteger(scene.cameras.main.zoom));
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
  assert.ok(snapshot().camera.centerX > initialCamera.centerX, 'The production panorama handler must actually move the camera');
  for (const [width, height, ratio] of [[780, 1688, 2], [1688, 780, 2], [1366, 768, 1]]) {
    scene.scale.width = width; scene.scale.height = height; scene.registry.set('world.pixelRatio', ratio);
    scene.scale.emit('resize');
    assert.equal(scene.objects.length, created, 'Resizing reuses the same scene objects');
  }
  assert.deepEqual(snapshot().camera, initialCamera, 'Returning to desktop restores the initial camera after a real pan');
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

  layer.destroy(); layer.destroy();
  assert.ok(scene.objects.every(value => value.destroyed === 1), 'Every image and graphics object is released exactly once');
  assert.ok(scene.masks.every(value => value.destroyed === 1), 'Every geometry mask is released exactly once');
  assert.equal(scene.events.count(), 0); assert.equal(scene.scale.count(), 0); assert.equal(bridgeEvents.count(), 0);
  rows.push({ cycle: cycle + 1, objects: created, masks: scene.masks.length, remainingListeners: bridgeEvents.count(), movingClouds, stepReceiver });
}
console.log(JSON.stringify({ status: 'PASS', scope: 'Real R09 integration handlers with Phaser scene doubles; no browser or rendered-pixel acceptance',
  manifestSha256: crypto.createHash('sha256').update(fs.readFileSync(manifestFile)).digest('hex'), sources, cycles: rows }, null, 2));
