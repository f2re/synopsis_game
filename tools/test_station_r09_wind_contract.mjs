/** Independent contract against the five actual exported R09 plant cutouts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { makeWindBands, sampleWindDisplacement, StationWindClock } from '../packages/world-engine/src/scenes/hub/r09WindModel.ts';

const manifestPath = 'packages/world-engine/src/assets/hub/r09-manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const plants = manifest.assets.filter(asset => asset.role === 'vegetation');
assert.equal(plants.length, 5, 'Review the five real source selections, not invented large trees');
const results = [];
for (const weather of ['clear', 'rain']) {
  const environment = { weather, reducedMotion: false, lowPower: false, paused: false };
  const signatures = new Set();
  for (const plant of plants) {
    const bands = makeWindBands(plant.width, plant.height, plant.kind, plant.rootFraction);
    let movingSamples = 0, maximumDisplacement = 0, firstMovementMs = null;
    const frames = [];
    for (let timeMs = 0; timeMs <= 60_000; timeMs += 100) {
      const offsets = bands.map(band => sampleWindDisplacement(timeMs, {
        id: plant.id, kind: plant.kind, sourceX: plant.anchorScenePx[0], sourceY: plant.anchorScenePx[1],
        sourceHeight: plant.height, freedom: band.freedom, gain: plant.gain,
      }, environment));
      offsets.forEach((offset, index) => {
        assert.ok(Number.isInteger(offset.x) && Number.isInteger(offset.y), `${plant.id}: native integer pixels`);
        const distance = Math.abs(offset.x) + Math.abs(offset.y);
        maximumDisplacement = Math.max(maximumDisplacement, distance);
        assert.ok(distance <= 1, `${plant.id}: a real crown may move by at most one native pixel`);
        if (bands[index].freedom === 0) assert.equal(distance, 0, `${plant.id}: the authored base stays planted`);
      });
      const moving = offsets.some(offset => offset.x || offset.y);
      if (moving) { movingSamples++; firstMovementMs ??= timeMs; }
      frames.push(offsets.map(offset => `${offset.x},${offset.y}`).join(';'));
    }
    assert.ok(movingSamples > 0, `${plant.id}/${weather}: actual small cutout must move; low gain must not round every pose to zero`);
    const signature = crypto.createHash('sha256').update(frames.join('\n')).digest('hex');
    signatures.add(signature);
    results.push({ id: plant.id, weather, sourceSize: [plant.width, plant.height], gain: plant.gain,
      bands: bands.length, samples: frames.length, movingSamples, firstMovementMs, maximumDisplacement, signature });
    const reduced = { ...environment, reducedMotion: true };
    for (const band of bands) assert.deepEqual(sampleWindDisplacement(14_000, {
      id: plant.id, kind: plant.kind, sourceX: plant.anchorScenePx[0], sourceY: plant.anchorScenePx[1],
      sourceHeight: plant.height, freedom: band.freedom, gain: plant.gain,
    }, reduced), { x: 0, y: 0 }, `${plant.id}: reduced motion has a true static pose`);
  }
  assert.ok(signatures.size >= 3, `${weather}: nearby plants must not all repeat the same pose timeline`);
}
const clock = new StationWindClock();
const calm = { weather: 'clear', reducedMotion: false, lowPower: false, paused: false };
clock.advance(100, calm);
const held = clock.timeMs;
for (let step = 0; step < 50; step++) clock.advance(100, { ...calm, paused: true });
assert.equal(clock.timeMs, held, 'A real paused interval does not advance the wind model');
clock.advance(5_000, calm);
assert.equal(clock.timeMs, held + 100, 'Resume cannot jump the foliage ahead by hidden wall-clock time');
console.log(JSON.stringify({ status: 'PASS', contract: 'actual-r09-small-foliage', manifestPath,
  manifestSha256: crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'),
  sampledDurationMs: 60_000, intervalMs: 100, results }, null, 2));
