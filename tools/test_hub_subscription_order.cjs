/* Real HubScreen and WorldBridge: subscribe before mounting a warm renderer.
 * Hook/lifecycle doubles do not substitute for the real browser readiness gate. */
'use strict';
const assert = require('node:assert/strict');
const { load, Runner, Events, flush, nodes } = require('./ui_test_harness.cjs');
const { WorldBridge } = load('packages/world-engine/src/bridge/WorldBridge.ts');
const visibleWorld = runner => nodes(runner.output).find(node => node.type === 'LazyComponent');
const worldState = runner => nodes(runner.output).find(node => node.props?.['data-world-state'])?.props['data-world-state'];

async function checkRenderer(mode) {
  const worldBridge = new WorldBridge();
  const on = worldBridge.on.bind(worldBridge);
  let activeSubscriptions = 0;
  worldBridge.on = (event, callback) => {
    activeSubscriptions++;
    const off = on(event, callback);
    return () => { activeSubscriptions--; off(); };
  };
  const timers = new Set();
  let timer = 0;
  const addTimer = () => { timers.add(++timer); return timer; };
  const window = Object.assign(new Events(), {
    setTimeout: addTimer, setInterval: addTimer,
    clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
  });
  const { HubScreen } = load('apps/web/src/features/hub/HubScreen.tsx', {
    '@synopsis/world-engine': { worldBridge },
    // Only the selected mode is doubled; scene events use the actual bridge.
    '@synopsis/world-engine/renderer-mode': { resolveHubRendererMode: () => mode, supportsWebGL2: () => true },
    '../../api': { api: {} },
    '../../brand': { GAME_MARK: '26063', GAME_CALLSIGN: 'Синоптик', GAME_TITLE: '26063' },
    '../avatar/SavedAvatarPortrait': { SavedAvatarPortrait: 'SavedAvatarPortrait', isSavedAvatarPortrait: () => false },
    '../ui/PixelIcon': { PixelIcon: 'PixelIcon' },
    '../ui/StationNavDock': { StationNavDock: 'StationNavDock' },
    './StudyJournal': { StudyJournal: 'StudyJournal' },
    './WorldLoadBoundary': { WorldLoadBoundary: 'WorldLoadBoundary' },
    './HubDialog': { HubDialog: 'HubDialog' }, './HubIcon': { HubIcon: 'HubIcon' },
    '../settings/settingsStore': { usePresentationPreferences: () => ({ soundEnabled: false, reducedMotion: false, lowPower: false }) },
  }, { window, document: { documentElement: { dataset: {} } } });
  const make = () => new Runner(HubScreen, { user: null, stationPresence: 0, onStartShift() {} });

  const runner = make();
  assert.equal(activeSubscriptions, 0, 'The bridge import is asynchronous');
  assert.equal(visibleWorld(runner), undefined, 'A renderer must not mount before parent subscriptions');
  assert.equal(worldState(runner), 'loading');
  worldBridge.notifySceneReady('hub');
  await flush(runner);
  assert.equal(activeSubscriptions, 3);
  assert.equal(visibleWorld(runner)?.key, mode, 'Only now may the selected renderer mount');
  assert.equal(worldState(runner), 'loading', 'An earlier unrelated event cannot masquerade as readiness');
  // Simulate a warm renderer's immediate create event after the permitted mount.
  worldBridge.notifySceneReady('hub');
  runner.render();
  assert.equal(worldState(runner), 'ready', 'The first create event is observed without a timeout or replay');
  runner.unmount();
  assert.equal(activeSubscriptions, 0);
  worldBridge.notifySceneReady('hub');
  assert.equal(runner.lateWrites, 0);

  const retired = make();
  retired.unmount();
  await flush(retired);
  assert.equal(activeSubscriptions, 0, 'A retired async import cannot install subscriptions');
  assert.equal(retired.lateWrites, 0);

  const strict = make();
  strict.strictRemount();
  await flush(strict);
  assert.equal(activeSubscriptions, 3, 'Effect setup/cleanup/setup retains only the live subscription set');
  assert.equal(visibleWorld(strict)?.key, mode);
  worldBridge.notifySceneReady('hub');
  strict.render();
  assert.equal(worldState(strict), 'ready');
  strict.unmount();
  assert.equal(activeSubscriptions, 0);
  assert.equal(window.count(), 0);
  assert.equal(timers.size, 0);
}

(async () => {
  await checkRenderer('legacy2d');
  await checkRenderer('three2d');
  console.log(JSON.stringify({ status: 'PASS', checks: ['both renderers wait for bridge subscriptions', 'immediate scene create is observed', 'no stale readiness replay', 'unmount before async import', 'strict effect remount', 'subscriptions and timers cleaned up'], limits: 'Actual HubScreen/WorldBridge with hook doubles; CI checks real browser readiness.' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
