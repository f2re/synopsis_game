/* Diagnostic reproduction using the installed Phaser scheduler, without a browser.
 * This does not approve native tab visibility, rendering, or the R09 implementation.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
// Match the pinned package path used by apps/web/vite.config.ts.
const phaserRoot = path.join(root, 'apps/web/node_modules/.pnpm/phaser@4.2.1/node_modules/phaser');
const packagePath = path.join(phaserRoot, 'package.json');
assert.equal(JSON.parse(fs.readFileSync(packagePath, 'utf8')).version, '4.2.1');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const distribution = fs.readFileSync(path.join(phaserRoot, 'dist/phaser.esm.js'), 'utf8');
const classBody = (source, name) => {
  const start = source.indexOf(`var ${name} = new Class({`);
  const marker = `module.exports = ${name};`;
  assert.ok(start >= 0 && source.indexOf(marker, start) >= 0);
  return source.slice(start, source.indexOf(marker, start) + marker.length).replaceAll('\r\n', '\n');
};
const sourceEquivalence = [
  ['TimeStep', 'src/core/TimeStep.js'],
  ['RequestAnimationFrame', 'src/dom/RequestAnimationFrame.js'],
].map(([name, file]) => {
  const source = fs.readFileSync(path.join(phaserRoot, file), 'utf8');
  const body = classBody(source, name);
  assert.equal(body, classBody(distribution, name), `${name} must match the shipped ESM distribution`);
  return { name, source: file, sourceSha256: sha(source), classBodySha256: sha(body), equalsEsmDistribution: true };
});

let now = 1000;
let nextId = 0;
const queue = new Map();
const previousWindow = global.window;
global.window = {
  performance: { now: () => now },
  requestAnimationFrame: callback => { queue.set(++nextId, callback); return nextId; },
  cancelAnimationFrame: id => queue.delete(id),
};
const TimeStep = require(path.join(phaserRoot, 'src/core/TimeStep.js'));
function frame() {
  now += 1000 / 60;
  const callbacks = [...queue.values()];
  queue.clear();
  for (const callback of callbacks) callback(now);
}

const results = [];
try {
  for (const fpsLimit of [60, 30]) for (const listenerOrder of ['react-first', 'phaser-first']) {
    queue.clear();
    let callbacks = 0, accumulatedPhaserDeltaMs = 0, monotonicElapsedMs = 0, lastFrameTime = null;
    const loop = new TimeStep({}, { target: 60, limit: fpsLimit });
    const snapshot = () => ({ callbacks, accumulatedPhaserDeltaMs, monotonicElapsedMs,
      running: loop.running, rafRunning: loop.raf.isRunning, queuedFrames: queue.size,
      frame: loop.frame, now, limit: loop.fpsLimit });
    loop.start((timestamp, delta) => {
      callbacks++;
      accumulatedPhaserDeltaMs += Math.min(100, Math.max(0, delta));
      // A reference measurement over actual callback timestamps, independent
      // of the product class. The first sample anchors each visible interval.
      if (lastFrameTime !== null) monotonicElapsedMs += Math.min(100, Math.max(0, timestamp - lastFrameTime));
      lastFrameTime = timestamp;
    });
    for (let i = 0; i < 10; i++) frame();
    const before = snapshot();
    lastFrameTime = null;
    if (listenerOrder === 'react-first') { loop.sleep(); loop.pause(); }
    else { loop.pause(); loop.sleep(); }
    for (let i = 0; i < 90; i++) frame();
    const hidden = snapshot();
    if (listenerOrder === 'react-first') { loop.wake(); loop.resume(); }
    else { loop.resume(); loop.wake(); }
    loop.focus();
    const resumed = snapshot();
    for (let i = 0; i < 180; i++) frame();
    const after = snapshot();
    const visibleWallMs = after.now - resumed.now;
    const monotonicAdvanceMs = after.monotonicElapsedMs - hidden.monotonicElapsedMs;
    assert.equal(hidden.callbacks, before.callbacks, 'Sleep suppresses game callbacks');
    assert.equal(hidden.monotonicElapsedMs, before.monotonicElapsedMs, 'Suspension does not enter the reference clock');
    assert.ok(after.callbacks > resumed.callbacks + 50, 'Actual Phaser continues scheduling after wake');
    assert.ok(after.running && after.rafRunning && after.queuedFrames === 1);
    assert.ok(monotonicAdvanceMs <= visibleWallMs + .001, 'Reference clock does not run faster than visible time');
    assert.ok(visibleWallMs - monotonicAdvanceMs < 100, 'Only a first-frame anchoring interval is omitted');
    results.push({ fpsLimit, listenerOrder, before, hidden, resumed, after,
      visibleWallMs, monotonicAdvanceMs, accumulatedPhaserAdvanceMs: after.accumulatedPhaserDeltaMs - hidden.accumulatedPhaserDeltaMs });
    loop.destroy();
  }
} finally {
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;
}
console.log(JSON.stringify({
  status: 'PASS_SOURCE_DIAGNOSIS',
  phaserVersion: '4.2.1',
  scriptSha256: sha(fs.readFileSync(__filename)),
  sourceEquivalence,
  phaserGameDebugPointerInDistribution: distribution.includes('PHASER_GAME'),
  scope: 'Real installed TimeStep and RequestAnimationFrame under a deterministic scheduler; no browser, server, rendering or native focus manipulation.',
  limits: ['Does not reproduce or approve native Chromium visibility recovery.',
    'The timestamp clock is an independent reference calculation, not a test of the R09 implementation.',
    'Constant scheduler intervals are not device performance measurements.'],
  results,
}, null, 2));
