/** Independent contract against the actual exported R09 plant cutouts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { makeWindBands, sampleWindDisplacement, StationWindClock } from '../packages/world-engine/src/scenes/hub/r09WindModel.ts';

const manifestPath = 'packages/world-engine/src/assets/hub/r09-manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const plants = manifest.assets.filter(asset => asset.role === 'vegetation');
assert.equal(plants.length, 9, 'Review the nine authored plant selections');
const terraceCrowns = plants.filter(plant => plant.sourceBounds[1] < 220);
assert.equal(terraceCrowns.length, 4, 'Visible wind includes the upper and middle terraces');
assert.ok(Math.max(...terraceCrowns.map(plant => plant.anchorScenePx[0])) -
  Math.min(...terraceCrowns.map(plant => plant.anchorScenePx[0])) >= 200,
  'Terrace crowns span the station panorama');
const results = [];
for (const weather of ['clear', 'rain']) {
  const environment = { weather, reducedMotion: false, lowPower: false, paused: false };
  const signatures = new Set();
  for (const plant of plants) {
    const bands = makeWindBands(plant.width, plant.height, plant.kind, plant.rootFraction);
    let movingSamples = 0, maximumDisplacement = 0, firstMovementMs = null;
    let previousPose, firstPoseChangeMs = null, lastPoseChangeMs = 0, longestHeldPoseMs = 0;
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
      const pose = offsets.map(offset => `${offset.x},${offset.y}`).join(';');
      if (pose !== previousPose) {
        if (previousPose !== undefined) firstPoseChangeMs ??= timeMs;
        lastPoseChangeMs = timeMs;
        previousPose = pose;
      }
      longestHeldPoseMs = Math.max(longestHeldPoseMs, timeMs - lastPoseChangeMs);
      frames.push(pose);
    }
    assert.ok(movingSamples > 0, `${plant.id}/${weather}: actual small cutout must move; low gain must not round every pose to zero`);
    assert.ok(firstPoseChangeMs !== null && firstPoseChangeMs <= 3_000, `${plant.id}/${weather}: visible pose changes in the first three seconds`);
    assert.ok(longestHeldPoseMs <= 4_000, `${plant.id}/${weather}: a crown holds one pose for ${longestHeldPoseMs} ms`);
    const signature = crypto.createHash('sha256').update(frames.join('\n')).digest('hex');
    signatures.add(signature);
    results.push({ id: plant.id, weather, sourceSize: [plant.width, plant.height], gain: plant.gain,
      bands: bands.length, samples: frames.length, movingSamples, firstMovementMs, firstPoseChangeMs, longestHeldPoseMs, maximumDisplacement, signature });
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
console.log(JSON.stringify({ status: 'PASS', contract: 'actual-r09-station-foliage', manifestPath,
  manifestSha256: crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'),
  sampledDurationMs: 60_000, intervalMs: 100, results }, null, 2));
