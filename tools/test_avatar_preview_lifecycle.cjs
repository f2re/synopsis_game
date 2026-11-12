/* Static fitting renderer: deferred load disposal, stale draft rejection and one draw only. */
'use strict';
const assert = require('node:assert/strict');
const { load, Runner, deferred, flush, nodes, text } = require('./ui_test_harness.cjs');
const contract = load('packages/world-engine/src/runtime/modularAvatarManifest.ts');
const pending = [], draws = [];
const canvas = { getContext: () => ({}) };
const api = { ...contract, avatarPreviewBounds: () => ({ width: 114, height: 144 }),
  drawAvatarComposite(_ctx, composite, frame) { draws.push({ composite, frame }); },
  modularAvatarCompositor: { acquireStatic(profile, direction) { const request = { ...deferred(), profile, direction }; pending.push(request); return request.promise; } },
};
const preview = load('apps/web/src/features/avatar/AvatarPreview.tsx', { '@synopsis/world-engine/avatar': api }, {}, '\nexports.StaticAvatarCanvas = StaticAvatarCanvas;');
function resolve(request) {
  const lease = { value: { key: `${contract.avatarProfileKey(request.profile)}:${request.direction}`, direction: request.direction }, releases: 0, release() { this.releases++; } };
  request.resolve(lease); return lease;
}
(async () => {
  const profile = { ...contract.DEFAULT_MODULAR_AVATAR };
  const runner = new Runner(preview.AvatarPreview, { avatar: profile });
  runner.strictRemount();
  assert.equal(pending.length, 2);
  const obsolete = resolve(pending[0]); await flush(runner);
  assert.equal(obsolete.releases, 1);
  assert.match(text(runner.output), /Открываем примерку/);
  const first = resolve(pending[1]); await flush(runner);
  assert.equal(runner.output.type, preview.StaticAvatarCanvas);
  const changed = { ...profile, top: 'top.hoodie' };
  runner.render({ avatar: changed, direction: 'left' });
  assert.equal(first.releases, 1);
  assert.match(text(runner.output), /Открываем примерку/, 'A changed draft must not display an old composite under new controls');
  const stale = pending[2];
  runner.render({ avatar: profile, direction: 'up' });
  const newer = pending[3];
  const staleLease = resolve(stale); await flush(runner);
  assert.equal(staleLease.releases, 1);
  newer.reject(new Error('Atlas unavailable')); await flush(runner);
  assert.match(text(runner.output), /Примерка недоступна/);
  assert(!nodes(runner.output).some((node) => node.type === 'canvas' || node.type === 'img'), 'Load failure cannot invent a second persona');
  runner.render({ avatar: profile, direction: 'right' });
  const afterUnmount = pending[4];
  runner.unmount();
  const late = resolve(afterUnmount); await flush(runner);
  assert.equal(late.releases, 1); assert.equal(runner.lateWrites, 0);

  const staticCanvas = new Runner(preview.StaticAvatarCanvas, { composite: { key: 'first', direction: 'down' } }, { effects: false });
  staticCanvas.hooks[0].value.current = canvas;
  staticCanvas.runEffects = true; staticCanvas.render();
  assert.equal(draws.length, 1); assert.equal(draws[0].frame, 0);
  assert.equal(staticCanvas.output.props.style.width, 228); assert.equal(staticCanvas.output.props.style.height, 288);
  staticCanvas.render(); assert.equal(draws.length, 1, 'Unchanged fitting rerenders do not redraw or schedule');
  staticCanvas.render({ composite: { key: 'second', direction: 'up' } });
  assert.equal(draws.length, 2); assert.equal(draws[1].frame, 0);
  staticCanvas.unmount();
  // No window, timers, animation frame or observer was provided to either component.
  console.log(JSON.stringify({ status: 'PASS', test: 'real static fitting components with deferred leases and hook doubles', checks: ['StrictMode stale load released', 'draft switch hides obsolete composite', 'late response disposal', 'neutral load failure', 'first frame drawn once at integer scale', 'no animation or observer APIs'], limits: 'Not a browser layout or artwork acceptance result.' }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
