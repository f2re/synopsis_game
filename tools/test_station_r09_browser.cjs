/** R09 acceptance in the existing real-browser CI. This module starts no server
 * or browser; the parent station runner owns both. No pose/time acceleration. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inflateSync } = require('node:zlib');

const HOST = '.world-canvas-host > div[data-station]';
const BUDGET = Object.freeze({ pngBytes: 2 * 1024 * 1024, rgbaBytes: 8 * 1024 * 1024,
  plants: 9, foliageBands: 40, normalCadenceMs: 100, lowCadenceMs: 200, softwareClearP95Ms: 100 });
const IDS = ['codepost', 'archive', 'cartography', 'radar', 'lab', 'hall'];
const ENTRANCES = Object.freeze({ codepost: [228, 175], archive: [317, 211], cartography: [86, 192],
  radar: [75, 115], lab: [363, 151], hall: [449, 213] });

function candidateUrl(base) { const url = new URL(base); url.pathname = '/'; url.searchParams.set('stationArt', 'r09'); return url.href; }
async function stationState(page) { return page.locator(HOST).evaluate(node => JSON.parse(node.dataset.station)); }
async function stationReady(page) {
  await page.locator('.hub-screen[data-world-state="ready"]').waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const raw = document.querySelector('.world-canvas-host > div[data-station]')?.dataset.station;
    if (!raw) return false;
    const value = JSON.parse(raw);
    return value.stationArt === 'r09' && value.camera && value.motion && document.querySelectorAll('canvas').length === 1;
  });
}
async function visibleEntranceGeometry(page) {
  return page.locator('[data-building-id]').evaluateAll(nodes => nodes.flatMap(node => {
    const b = node.getBoundingClientRect();
    return b.width && b.height && getComputedStyle(node).visibility !== 'hidden'
      ? [{ id: node.dataset.buildingId, x: b.x, y: b.y, width: b.width, height: b.height }] : [];
  }));
}
async function setStationView(page, mode) {
  const before = await stationState(page);
  if (!before.camera.mode || before.camera.mode === mode) return;
  const control = page.locator('[data-station-view-mode]');
  const box = await control.boundingBox();
  assert.ok(box && box.width >= 44 && box.height >= 44, 'The station view control has a 44px target');
  await control.click();
  await page.waitForFunction((expected) => {
    const raw = document.querySelector('.world-canvas-host > div[data-station]')?.dataset.station;
    return raw && JSON.parse(raw).camera.mode === expected;
  }, mode);
  assert.equal((await stationState(page)).staticGeometrySignature, before.staticGeometrySignature);
}
async function panOnce(page, direction) {
  const control = page.locator(`[data-station-pan="${direction}"]`);
  const before = await stationState(page);
  const available = before.camera[direction === 'left' ? 'canPanLeft' : 'canPanRight'];
  if (!await control.count() || !await control.isVisible() || !await control.isEnabled()) {
    assert.equal(available, false, 'Every available camera movement has a reachable real control');
    return false;
  }
  assert.equal(available, true, 'An enabled panorama control must move the camera');
  assert.equal(await control.getAttribute('aria-label'), direction === 'left' ? 'Посмотреть влево' : 'Посмотреть вправо');
  const box = await control.boundingBox();
  assert.ok(box && box.width >= 44 && box.height >= 44, 'The real panorama control has a 44px target');
  await control.click();
  await page.waitForFunction(previous => {
    const raw = document.querySelector('.world-canvas-host > div[data-station]')?.dataset.station;
    return raw && JSON.parse(raw).camera.centerX !== previous;
  }, before.camera.centerX);
  const next = await stationState(page);
  assert.equal(next.staticGeometrySignature, before.staticGeometrySignature, 'Pan preserves source-locked architecture');
  assert.equal(next.camera.zoom, before.camera.zoom, 'Pan changes camera position without changing source scale');
  assert.ok(direction === 'left' ? next.camera.centerX < before.camera.centerX : next.camera.centerX > before.camera.centerX, 'The camera moves in the requested direction');
  return true;
}
async function showStationEntrance(page, id) {
  assert.ok(ENTRANCES[id], 'A known station entrance is required');
  const target = page.locator(`[data-building-id="${id}"]`), trace = [];
  if (await target.isVisible()) return trace;
  await setStationView(page, 'detail');
  const initial = await stationState(page);
  const preferred = ENTRANCES[id][0] < initial.camera.centerX ? 'left' : 'right';
  for (const direction of [preferred, preferred === 'left' ? 'right' : 'left']) {
    for (let step = 0; step < 16; step++) {
      if (await target.isVisible()) return trace;
      if (!await panOnce(page, direction)) break;
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      trace.push((await stationState(page)).camera);
    }
  }
  assert.equal(await target.isVisible(), true, `${id}: the actual entrance must be reachable through panorama controls`);
  return trace;
}
async function forEachStationView(page, visit) {
  const initialMode = (await stationState(page)).camera.mode;
  await setStationView(page, 'detail');
  for (let step = 0; step < 12; step++) {
    if (!await panOnce(page, 'left')) break;
    assert.ok(step < 11, 'The left station edge must be reachable in a bounded number of pans');
  }
  const views = [];
  for (let step = 0; step < 16; step++) {
    await page.waitForFunction(() => {
      const raw = document.querySelector('.world-canvas-host > div[data-station]')?.dataset.station;
      if (!raw) return false;
      const visible = [...document.querySelectorAll('[data-building-id]')].map(node => node.dataset.buildingId).sort();
      return JSON.stringify(visible) === JSON.stringify([...JSON.parse(raw).visiblePoiIds].sort());
    });
    const state = await stationState(page), boxes = await visibleEntranceGeometry(page);
    assert.deepEqual([...boxes.map(box => box.id)].sort(), [...state.visiblePoiIds].sort(), 'DOM entrances agree with visible scene locations');
    for (const box of boxes) {
      const source = ENTRANCES[box.id]; assert.ok(source, 'Known source-anchored entrance');
      const x = (state.camera.offsetX + source[0] * state.camera.zoom) / state.camera.pixelRatio;
      const y = (state.camera.offsetY + source[1] * state.camera.zoom) / state.camera.pixelRatio;
      assert.ok(Math.abs(box.x + box.width / 2 - x) <= .75 && Math.abs(box.y + box.height / 2 - y) <= .75,
        `${box.id}: the DOM target remains over its real source entrance, without edge clamping`);
      assert.ok(box.width >= 44 && box.height >= 44, `${box.id}: touch target is at least 44 CSS pixels`);
      const semantics = await page.locator(`[data-building-id="${box.id}"]`).evaluate(node => ({ tag: node.tagName, name: node.getAttribute('aria-label') }));
      assert.ok(semantics.tag === 'BUTTON' && semantics.name?.trim(), `${box.id}: a named native button represents the actual entrance`);
    }
    views.push({ camera: state.camera, boxes });
    await visit(boxes, state, step);
    if (!await panOnce(page, 'right')) break;
    assert.ok(step < 15, 'The right station edge must be reachable in a bounded number of pans');
  }
  const ids = new Set(views.flatMap(view => view.boxes.map(box => box.id)));
  assert.deepEqual([...ids].sort(), [...IDS].sort(), 'All six real entrances remain reachable by panorama controls');
  await setStationView(page, initialMode);
  return views;
}

/** Bounded decoder for trusted browser PNG captures (Chromium RGB8, Firefox
 * RGBA8). The pixel comparison is independent of production diagnostics. */
function decodePng(bytes) {
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  const chunks = []; let width, height, channels;
  for (let at = 8; at + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(at), type = bytes.toString('ascii', at + 4, at + 8);
    assert.ok(at + 12 + length <= bytes.length);
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      assert.ok(width > 0 && height > 0 && width * height <= 16_000_000);
      assert.equal(data[8], 8); assert.ok(data[9] === 2 || data[9] === 6); channels = data[9] === 2 ? 3 : 4;
      assert.equal(data[10], 0); assert.equal(data[11], 0); assert.equal(data[12], 0);
    }
    if (type === 'IDAT') chunks.push(data);
    at += length + 12;
  }
  const stride = width * channels, raw = inflateSync(Buffer.concat(chunks), { maxOutputLength: (stride + 1) * height });
  assert.equal(raw.length, (stride + 1) * height);
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; assert.ok(filter <= 4);
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, left = x >= channels ? pixels[i - channels] : 0;
      const above = y ? pixels[i - stride] : 0, upperLeft = y && x >= channels ? pixels[i - stride - channels] : 0;
      const p = left + above - upperLeft, a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
      const paeth = a <= b && a <= c ? left : b <= c ? above : upperLeft;
      const predict = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : paeth;
      pixels[i] = (raw[y * (stride + 1) + x + 1] + predict) & 255;
    }
  }
  return { width, height, channels, pixels };
}
function pixelDifference(first, second, region) {
  assert.equal(first.width, second.width); assert.equal(first.height, second.height);
  const left = Math.max(0, Math.ceil(region.x)), top = Math.max(0, Math.ceil(region.y));
  const right = Math.min(first.width, Math.floor(region.x + region.width)), bottom = Math.min(first.height, Math.floor(region.y + region.height));
  let changed = 0, compared = 0;
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const a = (y * first.width + x) * first.channels, b = (y * second.width + x) * second.channels;
    changed += first.pixels[a] !== second.pixels[b] || first.pixels[a + 1] !== second.pixels[b + 1] || first.pixels[a + 2] !== second.pixels[b + 2] ? 1 : 0;
    compared++;
  }
  return { changed, compared };
}
function projectRegion(bounds, state, viewport, decoded, blockers) {
  const { camera } = state, scale = camera.zoom / camera.pixelRatio;
  let left = (camera.offsetX + bounds[0] * camera.zoom) / camera.pixelRatio;
  let top = (camera.offsetY + bounds[1] * camera.zoom) / camera.pixelRatio;
  let right = left + bounds[2] * scale, bottom = top + bounds[3] * scale;
  left = Math.max(0, left); right = Math.min(viewport.width, right); top = Math.max(0, top); bottom = Math.min(viewport.height, bottom);
  // Remove the actual HUD rectangles, including a partial middle overlap.
  // Retain the largest fully unobscured fragment, never pixels of the HUD.
  let pieces = [{ left, top, right, bottom }];
  for (const box of blockers) pieces = pieces.flatMap(rect => {
    const l = Math.max(rect.left, box.x), r = Math.min(rect.right, box.x + box.width);
    const t = Math.max(rect.top, box.y), b = Math.min(rect.bottom, box.y + box.height);
    if (l >= r || t >= b) return [rect];
    return [
      { ...rect, bottom: t }, { ...rect, top: b },
      { left: rect.left, right: l, top: t, bottom: b }, { left: r, right: rect.right, top: t, bottom: b },
    ].filter(part => part.right - part.left >= 2 && part.bottom - part.top >= 2);
  });
  const visible = pieces.filter(part => part.right - part.left >= 2 && part.bottom - part.top >= 2)
    .sort((a, b) => (b.right - b.left) * (b.bottom - b.top) - (a.right - a.left) * (a.bottom - a.top))[0];
  if (!visible) return null;
  const sx = decoded.width / viewport.width, sy = decoded.height / viewport.height;
  return { x: visible.left * sx, y: visible.top * sy, width: (visible.right - visible.left) * sx, height: (visible.bottom - visible.top) * sy };
}
function installMetrics() {
  const states = new WeakMap(), observed = [];
  const state = gl => {
    // The probe keeps no strong GL/texture references, so it cannot itself
    // prevent production garbage collection after a real route unmount.
    if (!states.has(gl)) { const item = { ref: new WeakRef(gl), textureIds: new WeakMap(), nextTextureId: 0,
      textures: new Set(), activeUnit: gl.TEXTURE0, bound: new Map(), sizes: new Map(), framebuffer: false, clearTimes: [], draws: 0, peakTextures: 0 };
      // A genuine context loss invalidates every native handle. This observer
      // does not prevent the event or alter Phaser's restoration policy.
      gl.canvas.addEventListener('webglcontextlost', () => {
        item.textures.clear(); item.sizes.clear(); item.bound.clear(); item.framebuffer = false;
      });
      states.set(gl, item); observed.push(item); }
    return states.get(gl);
  };
  for (const Klass of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) {
    if (!Klass) continue;
    const proto = Klass.prototype;
    const wrap = (name, after) => {
      const original = proto[name]; if (typeof original !== 'function' || original.__r09Observed) return;
      const fn = function (...args) { const result = Reflect.apply(original, this, args); after(state(this), args, result); return result; };
      Object.defineProperty(fn, '__r09Observed', { value: true }); proto[name] = fn;
    };
    wrap('createTexture', (s, _a, value) => { if (value) { const id = ++s.nextTextureId; s.textureIds.set(value, id); s.textures.add(id); } s.peakTextures = Math.max(s.peakTextures, s.textures.size); });
    wrap('deleteTexture', (s, a) => { const id = s.textureIds.get(a[0]); s.textures.delete(id); s.sizes.delete(id); });
    wrap('activeTexture', (s, a) => { s.activeUnit = a[0]; });
    wrap('bindTexture', (s, a) => s.bound.set(`${s.activeUnit}/${a[0]}`, a[1] ? s.textureIds.get(a[1]) : null));
    wrap('bindFramebuffer', (s, a) => { const gl = s.ref.deref(); if (a[0] === gl.FRAMEBUFFER || a[0] === gl.DRAW_FRAMEBUFFER) s.framebuffer = Boolean(a[1]); });
    const size = (s, a, dimensions) => {
      const texture = s.bound.get(`${s.activeUnit}/${a[0]}`); if (!texture) return;
      const [width, height] = dimensions;
      if (Number.isFinite(width) && Number.isFinite(height)) s.sizes.set(texture, Math.max(s.sizes.get(texture) || 0, width * height * 4));
    };
    wrap('texImage2D', (s, a) => size(s, a, a.length >= 9 ? [a[3], a[4]] : [a[5]?.naturalWidth || a[5]?.width, a[5]?.naturalHeight || a[5]?.height]));
    wrap('texStorage2D', (s, a) => size(s, a, [a[3], a[4]]));
    wrap('clear', (s, a) => { if (!s.framebuffer && (a[0] & s.ref.deref().COLOR_BUFFER_BIT)) { s.clearTimes.push(performance.now()); if (s.clearTimes.length > 8192) s.clearTimes.shift(); } });
    wrap('drawArrays', s => s.draws++); wrap('drawElements', s => s.draws++);
  }
  Object.defineProperty(globalThis, '__stationR09Observed', { value: () => observed.map(s => {
    const gl = s.ref.deref(), contextLost = gl ? gl.isContextLost() : null;
    return { connected: Boolean(gl?.canvas.isConnected), collected: !gl, contextLost,
      canvas: gl ? [gl.canvas.width, gl.canvas.height] : null,
      activeTextures: !gl || contextLost ? 0 : s.textures.size, peakTextures: s.peakTextures,
      liveTextureRgbaSizes: !gl || contextLost ? [] : [...s.textures].map(id => ({ id, rgbaEstimate: s.sizes.get(id) ?? null })),
      textureUploadRgbaEstimate: !gl || contextLost ? 0 : [...s.sizes.values()].reduce((sum, value) => sum + value, 0),
      defaultFramebufferClears: s.clearTimes.length, clearTimes: [...s.clearTimes], draws: s.draws };
  }) });
}
function installDayFixture(iso = '2026-06-21T09:00:00Z') {
  const NativeDate = Date, fixed = NativeDate.parse(iso);
  function FixedDate(...args) { if (!new.target) return new NativeDate(fixed).toString(); return Reflect.construct(NativeDate, args.length ? args : [fixed], new.target); }
  Object.setPrototypeOf(FixedDate, NativeDate); FixedDate.prototype = NativeDate.prototype;
  Object.defineProperty(FixedDate, 'now', { value: () => fixed }); globalThis.Date = FixedDate;
}
async function saveCanvas(page, output, name, report) {
  const bytes = await page.locator('canvas').screenshot();
  fs.writeFileSync(path.join(output, name + '.png'), bytes);
  report.screenshots.push({ name: name + '.png', sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  return { bytes, image: decodePng(bytes) };
}

async function checkWidePlaneSeams({ base, browser, report, output }) {
  const page = await browser.newPage({ viewport: { width: 1914, height: 934 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try {
    await page.addInitScript(installDayFixture, '2026-11-24T11:00:00Z');
    await page.addInitScript(() => {
      localStorage.setItem('synopsis_26063_settings', JSON.stringify({ weather: 'clear', soundEnabled: false, reducedMotion: true }));
    });
    await page.goto(candidateUrl(base)); await stationReady(page);
    await page.waitForFunction(() => {
      const value = JSON.parse(document.querySelector('.world-canvas-host > div[data-station]')?.dataset.station || '{}');
      return value.phase === 'day' && value.weather === 'clear';
    });
    const { image } = await saveCanvas(page, output, 'station-r09-wide-plane-seams', report);
    let edgePixels = 0, longestRun = 0;
    for (let y = 0; y < image.height; y++) {
      let run = 0;
      for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * image.channels;
        if (image.pixels[i] === 16 && image.pixels[i + 1] === 30 && image.pixels[i + 2] === 37) {
          run++;
          longestRun = Math.max(longestRun, run);
          if (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1) edgePixels++;
        } else run = 0;
      }
    }
    assert.equal(edgePixels, 0, 'The wide scene covers all four canvas edges');
    assert.ok(longestRun <= 2, `Wide sky and terrain layers expose a ${longestRun}px horizontal seam`);
    report.cases.push({ name: 'station-r09-wide-plane-seams', edgePixels, longestRun, width: image.width, height: image.height });
  } finally {
    await page.close();
  }
}

async function checkCanvasFallback({ base, browser, report, output }) {
  const context = await browser.newContext({ viewport: { width: 1910, height: 931 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const manifest = JSON.parse(fs.readFileSync('packages/world-engine/src/assets/hub/r09-manifest.json', 'utf8'));
  const cloud = manifest.assets.find(asset => asset.role === 'clouds');
  const cloudSource = decodePng(fs.readFileSync(path.join('apps/web/public', cloud.url)));
  try {
    await context.addInitScript(({ width, height }) => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        // Exercise the same configuration a reused opaque Phaser canvas
        // reports. A later call cannot change the first context's alpha.
        const opaquePool = type === '2d' && options?.willReadFrequently && options.alpha === undefined;
        const context = original.call(this, type, opaquePool ? { ...options, alpha: false } : options);
        if (type === '2d' && context && this.width === width && this.height === height) {
          globalThis.__stationR09CloudContext = context;
        }
        return context;
      };
      localStorage.setItem('synopsis_26063_settings', JSON.stringify({ weather: 'rain', soundEnabled: false, reducedMotion: true }));
    }, { width: cloud.width, height: cloud.height });
    await context.addInitScript(installDayFixture, '2026-10-27T22:00:00+03:00');
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ scenario: 'station-r09-canvas-rain-palette', message: error.message }));
    await page.goto(candidateUrl(base)); await stationReady(page);
    await page.waitForFunction(() => {
      const value = JSON.parse(document.querySelector('.world-canvas-host > div[data-station]')?.dataset.station || '{}');
      return value.phase === 'night' && value.weather === 'rain';
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const { camera } = await stationState(page);
    const measured = await page.locator('canvas').evaluate((canvas, camera) => {
      const context = canvas.getContext('2d');
      if (!context) return null;
      const px = (x) => Math.floor(camera.offsetX + x * camera.zoom);
      const py = (y) => Math.floor(camera.offsetY + y * camera.zoom);
      const pixels = context.getImageData(px(306), py(75), px(332) - px(306), py(87) - py(75)).data;
      let exposedBackgroundPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 16 && pixels[i + 1] === 30 && pixels[i + 2] === 37) exposedBackgroundPixels++;
      }
      return { exposedBackgroundPixels, windowRgb: [...context.getImageData(px(229.75), py(161.5), 1, 1).data].slice(0, 3),
        waterRgb: [...context.getImageData(px(314.75), py(79), 1, 1).data].slice(0, 3) };
    }, camera);
    assert.ok(measured, 'The Canvas fallback must be active');
    assert.equal(measured.exposedBackgroundPixels, 0, 'Independent texture planes must meet with no camera background showing through the lake');
    assert.ok(measured.windowRgb[0] > measured.windowRgb[2] + 35, 'Night entrance glass receives warm light in Canvas');
    assert.ok(measured.waterRgb[2] > measured.waterRgb[0] + 25 && measured.waterRgb[2] < 130, 'Night rain visibly cools and dims the lake in Canvas');
    assert.equal(cloudSource.channels, 4);
    const tintedCloudAlpha = await page.evaluate(({ width, height }) => {
      const cloud = globalThis.__stationR09CloudContext;
      if (!cloud) return null;
      return Array.from(cloud.getImageData(0, 0, width, height).data).filter((_, i) => i % 4 === 3);
    }, { width: cloud.width, height: cloud.height });
    const authoredCloudAlpha = Array.from(cloudSource.pixels).filter((_, i) => i % 4 === 3);
    assert.deepEqual(tintedCloudAlpha, authoredCloudAlpha, 'Every tinted cloud texel keeps its authored transparency even with opaque pooled canvases');
    await saveCanvas(page, output, 'station-r09-canvas-night-rain', report);
    report.cases.push({ name: 'station-r09-canvas-rain-palette', ...measured,
      cloudAlphaVerified: tintedCloudAlpha.length, transparentCloudTexels: tintedCloudAlpha.filter(alpha => alpha === 0).length });
  } finally {
    await context.close();
  }
}

async function nativeContextRestore(page, output, report, beforeImage) {
  const available = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    globalThis.__stationR09RestoreContext = () => extension.restoreContext();
    extension.loseContext();
    return true;
  });
  if (!available) {
    report.cases.push({ name: 'station-r09-native-context-restore', status: 'SKIP', reason: 'Native WEBGL_lose_context is unavailable; no restoration PASS claimed' });
    return;
  }
  try {
    await page.waitForFunction(() => {
      const host = document.querySelector('.world-canvas-host > div[data-station]');
      return host?.dataset.context === 'lost' && JSON.parse(host.dataset.station).motion.paused;
    }, undefined, { timeout: 10_000 });
    const lost = await stationState(page);
    await page.waitForTimeout(350);
    assert.equal((await stationState(page)).motion.clockMs, lost.motion.clockMs, 'A genuinely lost graphics context holds the world clock');
    await page.evaluate(() => { globalThis.__stationR09RestoreContext(); delete globalThis.__stationR09RestoreContext; });
    await page.waitForFunction(() => {
      const host = document.querySelector('.world-canvas-host > div[data-station]');
      return host?.dataset.context === 'ready' && !JSON.parse(host.dataset.station).motion.paused;
    }, undefined, { timeout: 15_000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const restored = await saveCanvas(page, output, 'station-r09-context-restored-1366', report);
    const difference = pixelDifference(beforeImage, restored.image, { x: 0, y: 0, width: beforeImage.width, height: beforeImage.height });
    assert.equal(difference.changed, 0, 'Context restoration preserves the actual still canvas, including masks, lighting and foliage');
    const entrance = page.locator('[data-building-id="codepost"]');
    await entrance.focus(); await entrance.press('Enter');
    await page.getByRole('dialog', { name: 'Кодовый пост', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    assert.ok(await entrance.evaluate(node => node === document.activeElement), 'Real entrance interaction and focus survive native restoration');
    report.cases.push({ name: 'station-r09-native-context-restore', status: 'PASS', nativeExtension: true,
      heldClockMs: lost.motion.clockMs, identicalCanvasPixels: true, restoredEntranceAndFocus: true,
      graphics: (await page.evaluate(() => globalThis.__stationR09Observed())).map(({ clearTimes, ...value }) => value) });
  } finally {
    await page.evaluate(() => { delete globalThis.__stationR09RestoreContext; });
  }
}
async function setPreferences(page, base, changes) {
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.getByRole('heading', { name: 'Настройки', exact: true }).waitFor();
  if (changes.lowPower !== undefined) await page.getByRole('checkbox', { name: /Экономия ресурсов/ }).setChecked(changes.lowPower);
  if (changes.reducedMotion !== undefined) await page.getByRole('checkbox', { name: /Уменьшить движение/ }).setChecked(changes.reducedMotion);
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  // Candidate selection is deliberately a URL opt-in before default promotion.
  // The final ordinary navigation is separately checked by the station runner.
  if (new URL(page.url()).searchParams.get('stationArt') !== 'r09') await page.goto(candidateUrl(base));
  await stationReady(page);
}

async function repeatedMounts(page, report) {
  const summarize = values => values.map(({ clearTimes, ...value }) => value);
  const before = await page.evaluate(() => globalThis.__stationR09Observed());
  const initial = before.find(value => value.connected), trace = [];
  const result = { name: 'station-r09-repeat-mount-lifetime', status: 'RUNNING', cycles: 3, before: summarize(before), trace,
    scope: 'Real help-route exits and history returns; observed GL texture handles and default-framebuffer activity, not a heap/GPU driver census' };
  report.cases.push(result);
  assert.ok(initial && initial.activeTextures > 0);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.locator('.hub-dock__guide').click();
    await page.getByRole('heading', { name: 'Помощь и управление', exact: true }).waitFor();
    const entry = { cycle: cycle + 1, afterExit: summarize(await page.evaluate(() => globalThis.__stationR09Observed())) };
    trace.push(entry);
    try {
      await page.waitForFunction(() => !document.querySelector('canvas') && globalThis.__stationR09Observed().every(value => !value.connected && value.activeTextures === 0));
    } catch (error) {
      result.status = 'FAIL';
      entry.failure = await page.evaluate(() => ({ url: location.href, canvasCount: document.querySelectorAll('canvas').length,
        graphics: globalThis.__stationR09Observed().map(({ clearTimes, ...value }) => value) }));
      throw error;
    }
    const unmounted = await page.evaluate(() => globalThis.__stationR09Observed());
    await page.waitForTimeout(350);
    const idle = await page.evaluate(() => globalThis.__stationR09Observed());
    assert.deepEqual(idle.map(value => [value.defaultFramebufferClears, value.draws]), unmounted.map(value => [value.defaultFramebufferClears, value.draws]), 'Detached station contexts stop rendering');
    // Native browser history restores the actual candidate URL without a page
    // reload, preserving observation of the real teardown and subsequent mount.
    await page.goBack(); await stationReady(page);
    const after = await page.evaluate(() => globalThis.__stationR09Observed()), connected = after.filter(value => value.connected);
    assert.equal(connected.length, 1, 'Repeated entry creates one connected world');
    assert.equal(connected[0].activeTextures, initial.activeTextures, 'Repeated entry does not accumulate live texture handles');
    assert.equal(connected[0].textureUploadRgbaEstimate, initial.textureUploadRgbaEstimate, 'The same scene has the same observed texture upload footprint');
    assert.ok(after.filter(value => !value.connected).every(value => value.activeTextures === 0), 'Prior worlds release textures or their destroyed context');
    entry.unmounted = summarize(unmounted); entry.remounted = summarize(after);
  }
  result.status = 'PASS';
}

async function runStationR09Checks({ base, browser, report, capture, output }) {
  const manifestPath = 'packages/world-engine/src/assets/hub/r09-manifest.json';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  report.stationR09Acceptance = { runnerSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    manifestSha256: crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'),
    selection: 'explicit ?stationArt=r09; ordinary default routes remain covered by the full suite' };
  assert.deepEqual(manifest.sourceCanvas, [512, 288]);
  const sourceFiles = manifest.assets.map(asset => {
    const file = path.join('apps/web/public', asset.url), bytes = fs.readFileSync(file);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256, asset.sha256, `${asset.id}: the served PNG belongs to the measured manifest`);
    assert.equal(bytes.readUInt32BE(16), asset.width); assert.equal(bytes.readUInt32BE(20), asset.height);
    return { url: asset.url, bytes: bytes.length, width: asset.width, height: asset.height, sha256 };
  });
  const pngBytes = sourceFiles.reduce((sum, asset) => sum + asset.bytes, 0);
  const rgbaBytes = manifest.assets.reduce((sum, asset) => sum + asset.width * asset.height * 4, 0);
  assert.ok(pngBytes <= BUDGET.pngBytes); assert.ok(rgbaBytes <= BUDGET.rgbaBytes);
  report.cases.push({ name: 'station-r09-resource-budget', pngBytes, rgbaBytes, sourceFiles, budget: BUDGET,
    estimateScope: 'RGBA of source textures; excludes driver allocation, framebuffer and renderer overhead',
    manifestSha256: crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex') });
  const viewports = [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 844, height: 390 }];
  let geometrySignature;
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    await context.addInitScript(() => {
      if (!localStorage.getItem('synopsis_26063_settings')) localStorage.setItem('synopsis_26063_settings', JSON.stringify({ weather: 'clear', soundEnabled: false, lowPower: false, reducedMotion: false }));
    });
    await context.addInitScript(installDayFixture); await context.addInitScript(installMetrics);
    const page = await context.newPage();
    const loadedPng = new Map(), responseReads = [];
    page.on('response', response => {
      const url = new URL(response.url());
      if (!url.pathname.startsWith('/hub/r09/') || !url.pathname.endsWith('.png')) return;
      const result = { status: response.status() }; loadedPng.set(url.pathname, result);
      responseReads.push(response.body().then(bytes => {
        result.bytes = bytes.length; result.sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      }).catch(error => { result.error = String(error); }));
    });
    page.on('pageerror', error => report.errors.push({ scenario: `station-r09-${viewport.width}`, message: error.message }));
    const loadingBegan = performance.now();
    await page.goto(candidateUrl(base)); await stationReady(page); await page.mouse.move(1, 1);
    await Promise.all(responseReads);
    const loadingElapsedMs = performance.now() - loadingBegan;
    const starting = await stationState(page);
    assert.equal(starting.camera.mode, viewport.width < viewport.height ? 'detail' : 'overview');
    const { offsetX, offsetY, zoom, pixelRatio } = starting.camera;
    assert.ok(offsetX <= .5 && offsetX + 512 * zoom >= viewport.width * pixelRatio - .5, 'Station fills the framebuffer horizontally');
    assert.ok(offsetY <= .5 && offsetY + 288 * zoom >= viewport.height * pixelRatio - .5, 'Station fills the framebuffer vertically');
    await setStationView(page, 'overview');
    const first = await stationState(page);
    assert.deepEqual(first.sourceCanvas, [512, 288]);
    assert.equal(first.camera.mode, 'overview');
    if (viewport.width < viewport.height) assert.deepEqual(first.camera.visibleSourceBounds, [0, 0, 512, 288]);
    else assert.ok(first.camera.visibleSourceBounds[2] > 511.9, 'Landscape overview preserves the source width');
    await page.locator('[data-building-id="lab"]').waitFor();
    assert.equal(first.assets.count, manifest.assets.length, 'The current manifest is loaded by the real R09 renderer');
    assert.equal(first.assets.estimatedRgbaBytes, rgbaBytes);
    for (const source of sourceFiles) {
      assert.equal(loadedPng.get(source.url)?.status, 200, `${source.url}: a real successful PNG response precedes readiness`);
      assert.equal(loadedPng.get(source.url)?.sha256, source.sha256, `${source.url}: response bytes match the current reviewed manifest`);
    }
    report.cases.push({ name: `station-r09-current-art-loaded-${viewport.width}`, stationArt: first.stationArt,
      loadingElapsedMs, responses: Object.fromEntries(loadedPng), sourceCanvas: first.sourceCanvas, assets: first.assets,
      scope: 'Cold browser context through actual network requests and scene readiness, not a production latency SLA' });
    assert.equal(first.motion.foliage.placements, BUDGET.plants);
    assert.ok(first.motion.foliage.bands <= BUDGET.foliageBands);
    assert.equal(first.motion.foliage.rootDisplacement, 0);
    assert.equal(first.motion.foliage.cadenceMs, BUDGET.normalCadenceMs);
    geometrySignature ??= first.staticGeometrySignature;
    assert.equal(first.staticGeometrySignature, geometrySignature, 'One source geometry across all viewport orientations');
    await capture(page, `station-r09-day-${viewport.width}`);
    const initial = await saveCanvas(page, output, `station-r09-motion-a-${viewport.width}`, report);
    const blockers = await page.locator('.hub-topbar,.hub-dock,.hub-scene-caption,.station-pan-controls').evaluateAll(nodes => nodes.map(node => {
      const b = node.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height };
    }).filter(box => box.width && box.height));
    const definitions = [
      ...manifest.assets.filter(asset => asset.role === 'vegetation').map(asset => ({ id: asset.id, group: 'foliage', bounds: asset.sourceBounds })),
      ...manifest.assets.filter(asset => asset.role === 'clouds').map(asset => ({ id: asset.id, group: 'clouds', bounds: asset.sourceBounds })),
      ...manifest.assets.filter(asset => asset.role === 'water').map(asset => ({ id: asset.id, group: 'water', bounds: asset.sourceBounds })),
      { id: 'codepost-stone', group: 'fixed', bounds: [201, 108, 52, 9] },
      { id: 'archive-timber', group: 'fixed', bounds: [300, 147, 35, 7] },
    ];
    const regions = definitions.flatMap(definition => {
      const rect = projectRegion(definition.bounds, first, viewport, initial.image, blockers);
      return rect ? [{ ...definition, rect }] : [];
    });
    assert.ok(regions.filter(region => region.group === 'foliage').length >= 3, 'Several authored crowns are visible above the HUD');
    assert.ok(regions.some(region => region.group === 'fixed'), 'A real architecture patch is visible for the movement comparison');
    const maxima = { foliage: 0, clouds: 0, water: 0, fixed: 0 }, observations = [];
    const visiblyMovingCrowns = new Set();
    let latest, latestState;
    const started = performance.now();
    while (performance.now() - started < 28_000) {
      await page.waitForTimeout(1_200);
      latest = { bytes: await page.locator('canvas').screenshot() };
      latest.image = decodePng(latest.bytes); latestState = await stationState(page);
      assert.equal(latestState.staticGeometrySignature, first.staticGeometrySignature);
      assert.equal(latestState.motion.foliage.rootDisplacement, 0);
      for (const pose of latestState.motion.foliage.poses) for (const offset of pose.offsets) assert.ok(Math.abs(offset[0]) + Math.abs(offset[1]) <= 1);
      const differences = regions.map(region => ({ id: region.id, group: region.group, ...pixelDifference(initial.image, latest.image, region.rect) }));
      for (const difference of differences) {
        maxima[difference.group] = Math.max(maxima[difference.group], difference.changed);
        if (difference.group === 'foliage' && difference.changed >= 4) visiblyMovingCrowns.add(difference.id);
      }
      observations.push({ elapsedMs: performance.now() - started, clockMs: latestState.motion.clockMs,
        paintedFrames: latestState.motion.foliage.paintedFrames, differences });
      assert.equal(maxima.fixed, 0, 'Buildings remain pixel-stable while weather, water and foliage move');
      if (visiblyMovingCrowns.size >= 3 && (viewport.width !== 1366 || (maxima.clouds > 0 && maxima.water > 0))) break;
    }
    assert.ok(visiblyMovingCrowns.size >= 3, 'At least three distinct crowns change actual rendered pixels');
    if (viewport.width === 1366) { assert.ok(maxima.clouds > 0, 'The authored cloud island visibly drifts'); assert.ok(maxima.water > 0, 'The authored distant water visibly moves'); }
    const lastName = `station-r09-motion-b-${viewport.width}.png`;
    fs.writeFileSync(path.join(output, lastName), latest.bytes);
    report.screenshots.push({ name: lastName, sha256: crypto.createHash('sha256').update(latest.bytes).digest('hex') });
    report.cases.push({ name: `station-r09-real-motion-${viewport.width}`, state: latestState, regions, maxima, observations,
      visiblyMovingCrowns: [...visiblyMovingCrowns],
      clockManipulated: false, assertionScope: 'Visible source regions; camera, stone and timber samples remain fixed' });

    const measuredFrom = await page.evaluate(() => performance.now());
    const raf = await page.evaluate(async () => {
      const intervals = []; let start, last;
      await new Promise(resolve => { const frame = now => { start ??= now; if (last !== undefined) intervals.push(now - last); last = now; if (now - start >= 4_000) resolve(); else requestAnimationFrame(frame); }; requestAnimationFrame(frame); });
      intervals.sort((a, b) => a - b); return { samples: intervals.length, p50Ms: intervals[Math.floor(intervals.length * .5)], p95Ms: intervals[Math.floor(intervals.length * .95)] };
    });
    const graphics = await page.evaluate(() => globalThis.__stationR09Observed());
    const connected = graphics.filter(value => value.connected);
    assert.equal(connected.length, 1, 'One connected WebGL context');
    const times = connected[0].clearTimes.filter(time => time >= measuredFrom);
    const intervals = times.slice(1).map((time, index) => time - times[index]).filter(delta => delta > .5).sort((a, b) => a - b);
    assert.ok(intervals.length >= 20, 'Observe actual default-framebuffer rendering, not only idle RAF');
    const p95 = intervals[Math.floor(intervals.length * .95)];
    assert.ok(p95 <= BUDGET.softwareClearP95Ms, `Software-CI render-pass p95 ${p95}ms exceeds ${BUDGET.softwareClearP95Ms}ms`);
    report.cases.push({ name: `station-r09-performance-${viewport.width}`, raf, defaultFramebufferClearIntervals: { samples: intervals.length,
      p50Ms: intervals[Math.floor(intervals.length * .5)], p95Ms: p95 }, graphics: connected.map(({ clearTimes, ...value }) => value),
      scope: 'Software browser CI, clear-pass cadence and observed texture lifetime; not physical mobile/GPU certification', budget: BUDGET });

    if (viewport.width === 1366) await repeatedMounts(page, report);

    await setPreferences(page, base, { reducedMotion: true });
    const still = await stationState(page);
    assert.equal(still.motion.reducedMotion, true); assert.equal(still.motion.foliage.animated, false);
    assert.ok(still.motion.foliage.poses.every(pose => pose.offsets.every(offset => offset[0] === 0 && offset[1] === 0)));
    await page.mouse.move(1, 1); await page.waitForTimeout(250);
    const stillA = await saveCanvas(page, output, `station-r09-reduced-${viewport.width}`, report);
    await page.waitForTimeout(1_500);
    const stillB = decodePng(await page.locator('canvas').screenshot());
    assert.equal(pixelDifference(stillA.image, stillB, { x: 0, y: 0, width: stillB.width, height: stillB.height }).changed, 0, 'Reduced motion freezes the actual canvas');
    report.cases.push({ name: `station-r09-reduced-motion-${viewport.width}`, state: await stationState(page), identicalCanvasPixels: true });
    if (viewport.width === 1366) await nativeContextRestore(page, output, report, stillA.image);
    await setPreferences(page, base, { reducedMotion: false, lowPower: true });
    const low = await stationState(page);
    assert.equal(low.motion.lowPower, true); assert.equal(low.motion.foliage.cadenceMs, BUDGET.lowCadenceMs);
    assert.equal(low.motion.foliage.animated, true, 'Low power retains bounded wind instead of silently removing it');
    assert.equal(await page.locator(HOST).getAttribute('data-fps-limit'), '30');
    const lowStart = await page.evaluate(() => performance.now());
    await page.waitForFunction(previous => {
      const value = JSON.parse(document.querySelector('.world-canvas-host > div[data-station]').dataset.station);
      return value.motion.foliage.elapsedMs - previous >= 2_500;
    }, low.motion.foliage.elapsedMs, { timeout: 10_000 });
    const lowEnd = await stationState(page), lowElapsedMs = await page.evaluate(() => performance.now()) - lowStart;
    const clockElapsedMs = lowEnd.motion.foliage.elapsedMs - low.motion.foliage.elapsedMs;
    const paintedFrames = lowEnd.motion.foliage.paintedFrames - low.motion.foliage.paintedFrames;
    assert.ok(paintedFrames >= Math.floor(clockElapsedMs / BUDGET.lowCadenceMs) - 1
      && paintedFrames <= Math.floor(clockElapsedMs / BUDGET.lowCadenceMs) + 1, 'Observed low-power wind paints at five updates per model second');
    const lowGraphics = (await page.evaluate(() => globalThis.__stationR09Observed())).filter(value => value.connected);
    assert.equal(lowGraphics.length, 1);
    const lowClears = lowGraphics[0].clearTimes.filter(value => value >= lowStart).length;
    assert.ok(lowClears >= 15 && lowClears <= lowElapsedMs / 1000 * 32 + 2, 'Real low-power rendering respects the 30Hz cap within the observation boundaries');
    await capture(page, `station-r09-low-power-${viewport.width}`);
    report.cases.push({ name: `station-r09-low-power-${viewport.width}`, state: lowEnd, frameLimit: 30,
      clockElapsedMs, paintedFrames, lowElapsedMs, defaultFramebufferClears: lowClears });
    await context.close();
  }
  await checkCanvasFallback({ base, browser, report, output });
  await checkWidePlaneSeams({ base, browser, report, output });
}

module.exports = { runStationR09Checks, stationState, stationReady, visibleEntranceGeometry,
  forEachStationView, panOnce, showStationEntrance, candidateUrl, decodePng, pixelDifference, projectRegion, checkCanvasFallback, BUDGET };
