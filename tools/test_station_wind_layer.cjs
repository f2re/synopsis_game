/** Real wind-layer handlers with Phaser scene doubles. No browser/HTTP/GPU. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require(path.join(process.cwd(), 'apps/web/node_modules/typescript'));
const prefix = 'packages/world-engine/src/scenes/hub/';
function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(prefix + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require(id) { if (!(id in imports)) throw new Error(`Unexpected import ${id}`); return imports[id]; } });
  return exports;
}
const model = load('r09WindModel.ts');
const { HubVegetationWindLayer } = load('HubVegetationWindLayer.ts', {
  './r09WindModel': model, phaser: { Textures: { FilterMode: { NEAREST: 0 } } },
});
function makeScene() {
  const images = [], filters = [];
  const source = { width: 512, height: 288 };
  return { images, filters, textures: {
    exists: (key) => key === 'masked-crowns',
    get: () => ({ getSourceImage: () => source, setFilter: (filter) => filters.push(filter) }),
  }, add: { image(x, y, key) {
    const image = { x, y, key, destroyed: false,
      setTexture(value) { this.key = value; this.originX = 0; this.originY = 0; this.crop = null; return this; },
      setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
      setDisplayOrigin(x, y) { this.originX = x; this.originY = y; return this; },
      setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; },
      setDepth(value) { this.depth = value; return this; },
      setTint(value) { this.tint = value; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      destroy() { this.destroyed = true; },
    };
    images.push(image); return image;
  } } };
}
const scene = makeScene(), layer = new HubVegetationWindLayer(scene);
const tree = { id: 'station.birch.left', textureKey: 'masked-crowns', anchorX: 124, anchorY: 480,
  width: 70, height: 120, depth: 90, kind: 'tree', sourceRect: { x: 44, y: 180, width: 35, height: 60 } };
layer.setPlacements([tree]);
assert.ok(scene.images.length > 1 && scene.images.length <= 8);
assert.ok(scene.filters.every((filter) => filter === 0));
for (const image of scene.images) {
  assert.equal(image.originX, 61.5); assert.equal(image.originY, 240);
  assert.equal(image.scaleX, 2); assert.equal(image.scaleY, 2);
  assert.equal(image.crop.x, 44); assert.equal(image.crop.width, 35);
  assert.equal(image.depth, 90);
}
const root = scene.images.at(-1);
let moved = false;
for (let index = 0; index < 600; index++) {
  layer.update(100);
  assert.equal(root.x, tree.anchorX); assert.equal(root.y, tree.anchorY);
  assert.equal(layer.getDiagnostics().rootDisplacement, 0);
  moved ||= scene.images.some((image) => image.x !== tree.anchorX);
}
assert.ok(moved, 'The crown must actually move during the deterministic minute');
assert.equal(layer.getDiagnostics().generatedTextureBytes, 0);
layer.setEnvironment({ reducedMotion: true });
assert.ok(scene.images.every((image) => image.x === tree.anchorX && image.y === tree.anchorY));
const beforeReduced = JSON.stringify(layer.getDiagnostics());
layer.update(10000); assert.equal(JSON.stringify(layer.getDiagnostics()), beforeReduced);
layer.setEnvironment({ reducedMotion: false, weather: 'rain' });
layer.update(100);
layer.setEnvironment({ paused: true, weather: 'rain' });
const paused = JSON.stringify(layer.getDiagnostics());
for (let index = 0; index < 10; index++) layer.update(10000);
assert.equal(JSON.stringify(layer.getDiagnostics()), paused);
layer.setEnvironment({ weather: 'rain', lowPower: true });
const priorPaints = layer.getDiagnostics().paintedFrames;
layer.update(100); assert.equal(layer.getDiagnostics().paintedFrames, priorPaints);
layer.update(100); assert.equal(layer.getDiagnostics().paintedFrames, priorPaints + 1);
layer.setTint(0x8296ab); assert.ok(scene.images.every((image) => image.tint === 0x8296ab));
const priorImages = [...scene.images];
for (const bad of [
  [{ ...tree, textureKey: 'absent' }],
  [tree, tree],
  [{ ...tree, sourceRect: { x: 500, y: 180, width: 35, height: 60 } }],
  [{ ...tree, width: 0 }],
  [{ ...tree, rootFraction: .01 }],
  Array.from({ length: 49 }, (_, index) => ({ ...tree, id: `plant.${index}` })),
]) assert.throws(() => layer.setPlacements(bad));
assert.ok(priorImages.every((image) => !image.destroyed), 'Invalid replacement preserves the old layer');
layer.setPlacements([{ ...tree, anchorX: 200 }]);
assert.ok(priorImages.every((image) => image.destroyed));
assert.ok(scene.images.filter((image) => !image.destroyed).every((image) => image.tint === 0x8296ab));
const resolveTint = (key, tint) => `${key}-${tint.toString(16)}`;
layer.setTint(0x8296ab, resolveTint);
for (const image of scene.images.filter((entry) => !entry.destroyed)) {
  assert.equal(image.tint, 0xffffff);
  assert.equal(image.key, 'masked-crowns-8296ab');
  assert.equal(image.originX, 61.5); assert.equal(image.originY, 240);
  assert.equal(image.crop.x, 44); assert.equal(image.crop.width, 35);
}
layer.setTint(0x8296ab);
assert.ok(scene.images.filter((image) => !image.destroyed).every((image) => image.key === 'masked-crowns' && image.tint === 0x8296ab));
layer.destroy(); layer.destroy(); layer.update(100); layer.setPlacements([tree]);
assert.ok(scene.images.every((image) => image.destroyed));
assert.equal(layer.getDiagnostics().placements, 0);
assert.equal(layer.getDiagnostics().animated, false);
assert.equal(layer.getDiagnostics().disposed, true);
console.log('PASS: exact source crops, grounded roots, real motion, reduced motion, hidden pause, low-power cadence, tint, atomic invalid geometry, resize disposal, idempotent destruction. Browser/GPU acceptance remains separate.');
