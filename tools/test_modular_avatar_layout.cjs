/* Static fitting geometry probe, using a synthetic manifest only inside intercepted test requests.
 * Start the Vite dev server first; no candidate/production artwork is accepted by this test.
 * MODULAR_AVATAR_TEST_URL=http://127.0.0.1:5192 node tools/test_modular_avatar_layout.cjs
 * For the accepted static fitting and saved portrait flow, open the separate dev-only
 * /tools/review/modular-player.html stand. This probe is not in the CI workflow.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd()] }));
const ts = require('../apps/web/node_modules/typescript');
const source = fs.readFileSync('packages/world-engine/src/runtime/modularAvatarManifest.ts', 'utf8');
const contract = { exports: {} };
new Function('module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(contract, contract.exports);
const { MODULAR_AVATAR_OPTIONS, AVATAR_PART_SLOTS, AVATAR_DIRECTIONS, DEFAULT_MODULAR_AVATAR } = contract.exports;
const emptyOrPixel = (empty) => Object.fromEntries(AVATAR_DIRECTIONS.map((direction) => [direction, { idle: Array.from({ length: 4 }, () => ({ cels: empty ? [] : [{ rect: [0, 0, 1, 1], at: [0, 0], z: 0 }] })) }]));
const ramp = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
const existingPng = fs.readFileSync('apps/web/public/assets/items/held_tablet.png');
const manifest = {
  version: 1, rigId: 'player.modular.r01.v1', revision: 'synthetic-layout-test', complete: true, artAcceptance: 'PASS',
  frame: { width: 96, height: 144, pivot: [48, 136] },
  atlas: { assetId: 'test.layout.pixel', url: '/assets/avatar/modular-r01/layout-test.png', width: existingPng.readUInt32BE(16), height: existingPng.readUInt32BE(20) },
  clips: { idle: { durationsMs: [320, 320, 320, 320], loop: true } },
  palettes: { skin: { source: ramp, variants: Object.fromEntries(MODULAR_AVATAR_OPTIONS.skinTone.map((id) => [id, ramp])) }, hair: { source: ramp, variants: Object.fromEntries(MODULAR_AVATAR_OPTIONS.hairColor.map((id) => [id, ramp])) } },
  body: emptyOrPixel(false),
  parts: Object.fromEntries(AVATAR_PART_SLOTS.flatMap((slot) => MODULAR_AVATAR_OPTIONS[slot].map((id) => [id, emptyOrPixel(id.endsWith('.none'))]))),
  companions: { 'companion.none': null, ...Object.fromEntries(['companion.tit', 'companion.squirrel'].map((id) => [id, { frame: { width: 64, height: 64, pivot: [32, 60] }, anchor: [-34, 0], frames: emptyOrPixel(false) }])) },
};
contract.exports.parseModularAvatarManifest(manifest);
const output = 'docs/testing/evidence/saved-avatar-portrait/layout-probe';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 950 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Unauthenticated test"}' }));
    await page.route('**/assets/avatar/modular-r01/manifest.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifest) }));
    await page.route('**/assets/avatar/modular-r01/layout-test.png', (route) => route.fulfill({ contentType: 'image/png', body: existingPng }));
    await page.goto(process.env.MODULAR_AVATAR_TEST_URL || 'http://127.0.0.1:5192', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '#root { display:none !important } body { margin:0; background:#080808 }' });
    await page.evaluate(async (avatar) => {
      const React = await import('/node_modules/.vite/deps/react.js');
      const { createRoot } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { AvatarPreview } = await import('/src/features/avatar/AvatarPreview.tsx');
      await import('/src/features/avatar/inventory.css');
      const host = document.createElement('main'); host.className = 'inventory-screen'; document.body.append(host);
      host.innerHTML = '<section class="inventory-workspace"><aside class="inventory-observer"><div class="inventory-observer__heading">Layout fixture</div><div id="layout-target" class="inventory-fitting__stage"></div></aside></section>';
      const root = createRoot(document.querySelector('#layout-target'));
      window.renderTestAvatar = (companion) => root.render(React.createElement(AvatarPreview, { avatar: { ...avatar, companion }, direction: 'down' }));
    }, DEFAULT_MODULAR_AVATAR);
    const results = [];
    for (const width of [375, 680, 1000, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      for (const companion of ['companion.none', 'companion.tit']) {
        await page.evaluate((value) => window.renderTestAvatar(value), companion);
        await page.waitForFunction((value) => document.querySelector('#layout-target canvas')?.dataset.avatarKey?.includes(value), companion);
        const metric = await page.evaluate(() => {
          const canvas = document.querySelector('#layout-target canvas');
          const style = getComputedStyle(canvas), rect = canvas.getBoundingClientRect();
          // Exact geometry diagnostic, not authored art: blue = body, green = child.
          const context = canvas.getContext('2d'); context.clearRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#1155dd'; context.fillRect(18, 0, 96, 144);
          const hasChild = canvas.dataset.avatarKey.includes('companion.tit');
          if (hasChild) { context.fillStyle = '#22cc55'; context.fillRect(0, 104, 16, 32); }
          return { intrinsic: [canvas.width, canvas.height], box: [rect.width, rect.height], objectFit: style.objectFit,
            position: [rect.x, rect.y], composite: canvas.dataset.avatarKey, frame: canvas.dataset.avatarFrame, imageRendering: style.imageRendering };
        });
        assert.deepEqual(metric.intrinsic, [114, 144]);
        assert.equal(metric.frame, '0');
        assert.equal(metric.imageRendering, 'pixelated');
        assert.deepEqual(metric.box, [228, 288], 'Static fitting stays at an exact integer scale');
        const filename = `layout-${width}-${companion.split('.')[1]}.png`;
        await page.locator('#layout-target').screenshot({ path: path.join(output, filename) });
        results.push({ width, companion, ...metric, screenshot: filename });
      }
      const [none, child] = results.slice(-2);
      assert.deepEqual(none.box, child.box, 'Companion changes must not resize the CSS viewport');
      assert.deepEqual(none.intrinsic, child.intrinsic, 'Companion changes must not resize the native viewport');
    }
    assert.deepEqual(errors, []);
    const result = { status: 'PASS', test: 'actual static AvatarPreview + inventory CSS, synthetic intercepted manifest', artAcceptance: 'NOT_TESTED', actualArtStand: '/tools/review/modular-player.html', cases: results, pageErrors: errors };
    fs.writeFileSync(path.join(output, 'browser-layout.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ status: result.status, cases: results.length, output: `${output}/browser-layout.json`, pageErrors: errors.length }));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
