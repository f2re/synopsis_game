/** R07: built application + real isolated server + Chromium/Firefox.
 * No API, artwork, visibility or renderer substitutions. Date alone is fixed.
 * Optional baseline mode uses this same runner from an earlier checkout.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { chromium, firefox } = require(require.resolve('playwright', { paths: [process.env.STATION_PLAYWRIGHT_MODULES || process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd()] }));

const repo = process.cwd(), dist = path.join(repo, 'apps/web/dist');
const browserName = process.env.STATION_BROWSER || 'chromium';
assert.ok(['chromium', 'firefox'].includes(browserName), 'Supported browser');
const baseline = process.env.STATION_ENV_BASELINE === '1';
const output = path.resolve(process.env.STATION_ENV_EVIDENCE || 'artifacts/station-environment-r07');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'station-environment-'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const settingsKey = 'synopsis_26063_settings';
const fixedDatePages = new WeakSet();
const dates = [
  { phase: 'day', iso: '2026-10-27T14:00:00+03:00' },
  { phase: 'twilight', iso: '2026-10-27T18:00:00+03:00' },
  { phase: 'night', iso: '2026-10-27T22:00:00+03:00' },
  { phase: 'white_nights', iso: '2026-06-21T01:00:00+03:00' },
  { phase: 'golden_hour', iso: '2026-10-27T17:00:00+03:00' },
  { phase: 'dawn', iso: '2026-10-27T07:30:00+03:00' },
];
const viewports = [{ width: 1366, height: 768 }, { width: 390, height: 844 }];
const facilityNames = { codepost: 'Кодовый пост', radar: 'Радарный комплекс', lab: 'Аэрологический павильон', cartography: 'Картографический класс', archive: 'Архив наблюдений', hall: 'Турнирный зал' };
function revision() { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(); } catch { return 'unavailable'; } }
const report = {
  status: 'RUNNING', mode: baseline ? 'baseline' : 'candidate', engine: browserName, browser: '', revision: revision(),
  appVersion: JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')).version,
  runnerSha256: sha256(fs.readFileSync(__filename)),
  ci: { runId: process.env.GITHUB_RUN_ID || null, attempt: process.env.GITHUB_RUN_ATTEMPT || null, job: process.env.GITHUB_JOB || null, runner: process.env.RUNNER_NAME || null },
  graphicsSetup: { configuredChromiumFlags: browserName === 'chromium' ? ['--no-sandbox', '--enable-unsafe-swiftshader'] : [],
    firefoxUserPrefs: browserName === 'firefox' ? { 'webgl.force-enabled': true, 'gfx.webrender.all': true } : null,
    softwareEnvironment: process.env.LIBGL_ALWAYS_SOFTWARE || null, rendererSource: 'Read from the existing production canvas after scene readiness.' },
  productionAssets: true, realServer: true, fixedDateOnly: true, cases: [], screenshots: [], measurements: [], errors: [], skipped: [],
  limits: 'RAF intervals and JS heap on this browser host; no physical GPU, sound-listening or pixel-art acceptance claim.',
};
fs.mkdirSync(output, { recursive: true });
let apiProcess, webServer, browser, nativeChrome;
async function reservePort() {
  const server = http.createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function startServers() {
  assert.ok(fs.existsSync(path.join(dist, 'index.html')), 'Build apps/web before browser acceptance');
  assert.ok(fs.existsSync(path.join(repo, 'apps/server/dist/index.js')), 'Build apps/server before browser acceptance');
  const port = await reservePort(), apiBase = `http://127.0.0.1:${port}`;
  apiProcess = spawn(process.execPath, ['apps/server/dist/index.js'], { cwd: repo, env: {
    ...process.env, API_BIND: '127.0.0.1', API_PORT: String(port), SYNOPSIS_SECURITY_PROFILE: 'trusted',
    SYNOPSIS_BOOTSTRAP_ADMIN_CODE: '26063review', SYNOPSIS_ENABLE_TEST_ROSTER: 'true',
    SYNOPSIS_TEST_ROSTER_FILE: path.join(repo, 'config/test-roster.example.json'),
    SYNOPSIS_IDENTITY_STORE: path.join(temp, 'identity.json'), SYNOPSIS_EQUIPMENT_STORE: path.join(temp, 'equipment.json'),
    SYNOPSIS_PROGRESSION_STORE: path.join(temp, 'progression.json'), SYNOPSIS_ATTEMPT_LOG: path.join(temp, 'attempts.jsonl'), SYNOPSIS_CONTENT_ROOT: path.join(repo, 'content'),
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = fs.createWriteStream(path.join(output, 'server.log'));
  apiProcess.stdout.pipe(log); apiProcess.stderr.pipe(log);
  for (let n = 0; n < 80; n++) {
    if (apiProcess.exitCode !== null) throw new Error(`Server exited: ${apiProcess.exitCode}`);
    try { if ((await fetch(apiBase + '/ready')).ok) break; } catch {}
    if (n === 79) throw new Error('Server startup timeout');
    await wait(150);
  }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
  webServer = http.createServer((req, res) => {
    if ((req.url || '').startsWith('/api/')) {
      const proxy = http.request(apiBase + req.url, { method: req.method, headers: req.headers }, upstream => { res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res); });
      proxy.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(proxy); return;
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url || '/', 'http://test.local').pathname); } catch { res.writeHead(400); res.end(); return; }
    let file = path.resolve(dist, '.' + pathname);
    if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403); res.end(); return; }
    if (!path.extname(pathname)) file = path.join(dist, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  webServer.listen(0, '127.0.0.1'); await once(webServer, 'listening');
  return `http://127.0.0.1:${webServer.address().port}`;
}
function record(name, values) { report.cases.push({ name, ...values }); console.log(`ENV ${name}`); }
function observePage(page, scenario) { page.on('pageerror', error => report.errors.push({ scenario, message: error.message })); }
async function ready(page) {
  await page.locator('.hub-screen[data-world-state="ready"]').waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => document.querySelectorAll('canvas').length === 1 && document.querySelectorAll('[data-building-id]').length === 6);
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}
async function setDate(page, iso) {
  const epoch = Date.parse(iso);
  assert.ok(Number.isFinite(epoch), 'A valid fixed station date is required');
  if (!fixedDatePages.has(page)) {
    // One init script per page; later changes update the current document only.
    // Each solar case gets a new page, so navigation never replays stale dates.
    await page.addInitScript(installFixedDate, epoch);
    fixedDatePages.add(page);
  }
  await page.evaluate(installFixedDate, epoch);
}
function installFixedDate(epoch) {
  if (globalThis.__stationFixedDate) { globalThis.__stationFixedDate.set(epoch); return; }
  const NativeDate = globalThis.Date;
  const originals = {
    requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval,
    performance: globalThis.performance, performanceNow: globalThis.performance.now,
  };
  let fixed = epoch;
  function FixedDate(...args) {
    if (!new.target) return new NativeDate(fixed).toString();
    return Reflect.construct(NativeDate, args.length ? args : [fixed], new.target);
  }
  Object.setPrototypeOf(FixedDate, NativeDate);
  FixedDate.prototype = NativeDate.prototype;
  Object.defineProperty(FixedDate, 'now', { value: () => fixed });
  globalThis.Date = FixedDate;
  Object.defineProperty(globalThis, '__stationFixedDate', { value: {
    set(value) { if (!Number.isFinite(value)) throw new Error('Invalid fixed date'); fixed = value; },
    snapshot() { return { fixedEpoch: fixed, dateOnly: globalThis.Date === FixedDate,
      nativeTiming: Object.fromEntries(Object.entries(originals).map(([key, value]) =>
        [key, (key === 'performanceNow' ? globalThis.performance.now : globalThis[key]) === value])),
    }; },
  } });
}
function assertNativeTiming(value) {
  assert.equal(value.clock?.dateOnly, true, 'Only Date is replaced for the solar scenario');
  assert.equal(Object.values(value.clock.nativeTiming).every(Boolean), true, 'RAF, performance and timers retain their original identities');
}
async function state(page) {
  return page.evaluate(() => {
    const host = document.querySelector('.world-canvas-host > div');
    const canvas = document.querySelector('canvas');
    let renderer = { type: 'unknown' };
    if (canvas) {
      // A canvas already bound to one context returns null for other context
      // types. This reads the existing renderer; it does not replace it.
      for (const type of ['webgl2', 'webgl', 'experimental-webgl']) {
        const gl = canvas.getContext(type);
        if (!gl) continue;
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        renderer = { type, renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR), version: gl.getParameter(gl.VERSION),
          unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
          unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null };
        break;
      }
      if (renderer.type === 'unknown' && canvas.getContext('2d')) renderer = { type: 'canvas2d' };
    }
    return { ...host?.dataset, clock: globalThis.__stationFixedDate?.snapshot(), ambientWeather: document.documentElement.dataset.ambientWeather,
      storedWeather: JSON.parse(localStorage.getItem('synopsis_26063_settings') || '{}').weather,
      visibility: document.visibilityState, date: new Date().toISOString(), viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
      canvasCount: document.querySelectorAll('canvas').length, canvasSize: canvas ? [canvas.width, canvas.height] : null, renderer,
      documentSize: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] };
  });
}
async function phaseIs(page, expected) {
  if (!baseline) await page.waitForFunction(phase => document.querySelector('.world-canvas-host > div')?.dataset.phase === phase && document.querySelector('.world-canvas-host > div')?.dataset.lightingMode === 'solar', expected, { timeout: 8_000 });
  const value = await state(page);
  assertNativeTiming(value);
  if (!baseline) { assert.equal(value.phase, expected); assert.equal(value.lightingMode, 'solar'); }
  assert.equal(value.canvasCount, 1, 'Exactly one world canvas');
  return value;
}
async function weatherIs(page, mode, animate) {
  await page.waitForFunction(({ mode, animate }) => {
    const value = document.querySelector('.world-canvas-host > div')?.dataset;
    const drops = Number(value?.rainDrops);
    return value?.weather === mode && value?.renderedWeather === mode && value?.weatherAnimated === String(animate)
      && value?.rainAnimated === String(animate) && Number.isFinite(drops) && (animate ? drops > 0 && drops <= 72 : drops === 0);
  }, { mode, animate }, { polling: 100, timeout: 8_000 });
  return state(page);
}
async function capture(page, name) {
  await page.mouse.move(1, 1);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const metric = await state(page), full = `${name}.png`, canvasFile = `${name}-canvas.png`;
  assert.ok(metric.documentSize[0] <= metric.viewport[0] + 2, `${name}: no horizontal document overflow`);
  assert.ok(metric.documentSize[1] <= metric.viewport[1] + 2, `${name}: no second page scroll region`);
  const fullBytes = await page.screenshot({ path: path.join(output, full) });
  const canvasBytes = await page.locator('canvas').screenshot({ path: path.join(output, canvasFile) });
  report.screenshots.push({ name: full, sha256: sha256(fullBytes) }, { name: canvasFile, sha256: sha256(canvasBytes) });
  record(name, { ...metric, canvasSha256: sha256(canvasBytes) });
  return sha256(canvasBytes);
}
async function createPage(viewport, { reducedMotion = 'no-preference', lowPower = false, weather = 'clear', dpr = 1 } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: dpr, reducedMotion });
  context.setDefaultTimeout(15_000);
  await context.addInitScript(({ key, lowPower, weather }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ soundEnabled: false, weather, lowPower, reducedMotion: false }));
  }, { key: settingsKey, lowPower, weather });
  const page = await context.newPage(); observePage(page, `${viewport.width}/${dpr}`);
  return { context, page };
}
async function visitSettings(page, changes) {
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.getByRole('heading', { name: 'Настройки', exact: true }).waitFor();
  if (changes.weather) await page.getByRole('radio', { name: changes.weather === 'rain' ? 'Дождь' : 'Без дождя', exact: true }).check();
  if (changes.lowPower !== undefined) await page.getByRole('checkbox', { name: /Экономия ресурсов/ }).setChecked(changes.lowPower);
  if (changes.reducedMotion !== undefined) await page.getByRole('checkbox', { name: /Уменьшить движение/ }).setChecked(changes.reducedMotion);
  await page.getByRole('button', { name: 'Готово', exact: true }).click(); await ready(page);
}
async function solarCases(base) {
  for (const viewport of viewports) {
    const hashes = {};
    for (const { phase, iso } of dates) {
      const { context, page } = await createPage(viewport, { reducedMotion: 'reduce' });
      await setDate(page, iso); await page.goto(base); await ready(page); await phaseIs(page, phase);
      await weatherIs(page, 'clear', false);
      hashes[phase] = await capture(page, `solar-${phase}-${viewport.width}`);
      await context.close();
    }
    assert.notEqual(hashes.day, hashes.night, 'Day and night must change the actual canvas, not only diagnostics');
    assert.notEqual(hashes.twilight, hashes.day, 'Twilight must change the actual canvas from day');
    assert.notEqual(hashes.twilight, hashes.night, 'Twilight must remain visually distinct from night');
  }
}
async function weatherCases(base) {
  for (const viewport of viewports) {
    const { context, page } = await createPage(viewport);
    await setDate(page, dates[0].iso); await page.goto(base); await ready(page);
    await weatherIs(page, 'clear', false); await capture(page, `weather-clear-${viewport.width}`);
    await visitSettings(page, { weather: 'rain' });
    await weatherIs(page, 'rain', true); await capture(page, `weather-rain-${viewport.width}`);
    // A visual pair complements the actual layer's discrete state. Difference is
    // recorded, not treated as proof that every changing pixel belongs to rain.
    const before = await page.locator('canvas').screenshot({ path: path.join(output, `weather-rain-pair-a-${viewport.width}.png`) });
    await page.waitForTimeout(550);
    const after = await page.locator('canvas').screenshot({ path: path.join(output, `weather-rain-pair-b-${viewport.width}.png`) });
    report.screenshots.push({ name: `weather-rain-pair-a-${viewport.width}.png`, sha256: sha256(before) }, { name: `weather-rain-pair-b-${viewport.width}.png`, sha256: sha256(after) });
    record(`rain-visual-pair-${viewport.width}`, { separationMs: 550, canvasChanged: sha256(before) !== sha256(after), interpretation: 'Visual comparison; NPC/fountain changes may also contribute.' });
    await page.locator('[data-building-id="archive"]').click();
    await page.getByRole('button', { name: 'Посетить читальный зал', exact: true }).click();
    await page.getByRole('heading', { name: 'Читальный зал архива', exact: true }).waitFor();
    assert.equal(await page.locator('canvas').count(), 0, 'Reading room retires the world canvas');
    await page.getByText('Дождь за окном', { exact: true }).waitFor();
    await page.getByRole('button', { name: /На площадь/ }).click(); await ready(page);
    record(`rain-survives-reading-room-${viewport.width}`, await weatherIs(page, 'rain', true));
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).weather, settingsKey), 'rain');
    await visitSettings(page, { reducedMotion: true });
    await weatherIs(page, 'rain', false); await capture(page, `rain-reduced-motion-${viewport.width}`);
    await visitSettings(page, { reducedMotion: false, lowPower: true });
    await weatherIs(page, 'rain', false); await capture(page, `rain-low-power-${viewport.width}`);
    assert.equal((await state(page)).fpsLimit, '30');
    await visitSettings(page, { lowPower: false });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    record(`rain-system-motion-${viewport.width}`, await weatherIs(page, 'rain', false));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await weatherIs(page, 'rain', true);
    await visitSettings(page, { weather: 'clear' });
    await weatherIs(page, 'clear', false);
    await context.close();
  }
}
async function interactionCases(base) {
  const { context, page } = await createPage(viewports[0], { dpr: 2, reducedMotion: 'reduce' });
  await setDate(page, dates[2].iso); await page.goto(base); await ready(page);
  for (const viewport of [...viewports, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport); await ready(page);
    const boxes = await page.locator('[data-building-id]').evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { id: node.dataset.buildingId, x: box.x, y: box.y, width: box.width, height: box.height };
    }));
    for (const box of boxes) {
      assert.ok(box.width >= 44 && box.height >= 44, `${box.id}: readable touch target after resize`);
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${box.id}: target inside viewport`);
      const points = [[box.width / 2, box.height / 2], [2, box.height / 2], [box.width - 3, box.height / 2], [box.width / 2, 2], [box.width / 2, box.height - 3]];
      for (const [dx, dy] of points) {
        const x = box.x + dx, y = box.y + dy;
        assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-building-id]')?.getAttribute('data-building-id'), { x, y }), box.id, `${box.id}: center/edge is not covered by another surface`);
        await page.mouse.click(x, y);
        await page.getByRole('dialog', { name: facilityNames[box.id], exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      }
      const target = page.locator(`[data-building-id="${box.id}"]`);
      await target.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
      assert.equal(await target.evaluate(node => document.activeElement === node && node.matches(':focus-visible')), true, `${box.id}: real Tab navigation returns to visible focus`);
      await page.keyboard.press('Enter'); await page.getByRole('dialog', { name: facilityNames[box.id], exact: true }).waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await target.evaluate(node => document.activeElement === node), true, `${box.id}: Escape restores the entrance`);
    }
    record(`entrances-resize-${viewport.width}-dpr2`, { viewport, dpr: 2, boxes, pointerSamplesPerEntrance: 5, keyboard: ['Tab', 'Shift+Tab', 'Enter', 'Escape'] });
    await capture(page, `entrances-${viewport.width}-dpr2`);
  }
  await context.close();
}
async function measureCases(base) {
  // Clear golden-hour scenery is the common workload with the authored R01
  // baseline. Candidate rain has its own group and is never relabelled as A/B.
  const measurementDate = dates.find(value => value.phase === 'golden_hour');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 1000 }]) for (const weatherMode of baseline ? ['clear'] : ['clear', 'rain']) for (const lowPower of [false, true]) {
    const { context, page } = await createPage(viewport, { weather: weatherMode, lowPower });
    await setDate(page, measurementDate.iso); await page.goto(base); await ready(page);
    await phaseIs(page, 'golden_hour');
    if (!baseline) await weatherIs(page, weatherMode, weatherMode === 'rain' && !lowPower);
    await page.waitForTimeout(3_000);
    const samples = [];
    for (let run = 0; run < 3; run++) samples.push(await page.evaluate(async () => {
      const intervals = []; let previous, start;
      await new Promise(resolve => {
        function frame(now) {
          if (start === undefined) start = now;
          if (previous !== undefined) intervals.push(now - previous);
          previous = now;
          if (now - start >= 5_000) resolve(); else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      intervals.sort((a, b) => a - b);
      const percentile = p => intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * p))];
      return { elapsedMs: previous - start, frames: intervals.length, p50Ms: percentile(.5), p95Ms: percentile(.95), maxMs: intervals.at(-1), jsHeapBytes: performance.memory?.usedJSHeapSize ?? null };
    }));
    const measuredState = await state(page); assertNativeTiming(measuredState);
    const result = { viewport, weatherMode, lowPower, fixedDate: measurementDate.iso, warmupMs: 3_000, runs: samples, state: measuredState, metric: 'Native browser RAF callback intervals, not guaranteed rendered FPS' };
    report.measurements.push(result); record(`raf-${weatherMode}-${viewport.width}-${lowPower ? 'low-power' : 'normal'}`, result);
    await capture(page, `measured-${weatherMode}-${viewport.width}-${lowPower ? 'low-power' : 'normal'}`);
    await context.close();
  }
}
async function nativeVisibility(base) {
  // The default CDP context without Playwright focus emulation is required to
  // observe actual background-tab visibility. No visibility getter is replaced.
  await browser.close(); browser = undefined;
  const port = await reservePort(), endpoint = `http://127.0.0.1:${port}`;
  nativeChrome = spawn(process.env.CHROMIUM_PATH || chromium.executablePath(), [
    '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader',
    '--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(temp, 'native-browser')}`,
    '--window-size=1366,900', ...(process.env.STATION_BROWSER_HEADED === 'true' ? [] : ['--headless=new']), 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const log = fs.createWriteStream(path.join(output, 'native-browser.log')); nativeChrome.stdout.pipe(log); nativeChrome.stderr.pipe(log);
  for (let n = 0; n < 80; n++) {
    if (nativeChrome.exitCode !== null) throw new Error(`Native Chromium exited: ${nativeChrome.exitCode}`);
    try { if ((await fetch(endpoint + '/json/version')).ok) break; } catch {}
    if (n === 79) throw new Error('Native Chromium startup timeout'); await wait(150);
  }
  browser = await chromium.connectOverCDP(endpoint, { noDefaults: true });
  const context = browser.contexts()[0]; context.setDefaultTimeout(15_000);
  await context.addInitScript(key => localStorage.setItem(key, JSON.stringify({ soundEnabled: false, weather: 'rain' })), settingsKey);
  const page = await context.newPage(); observePage(page, 'native-visibility');
  await page.setViewportSize(viewports[0]); await setDate(page, dates[0].iso); await page.goto(base); await ready(page);
  await phaseIs(page, 'day'); await weatherIs(page, 'rain', true);
  const background = await context.newPage(); await background.goto('about:blank'); await background.bringToFront();
  await page.waitForFunction(() => document.visibilityState === 'hidden', undefined, { polling: 100 });
  await weatherIs(page, 'rain', false);
  await setDate(page, dates[2].iso);
  record('native-hidden-date-change', { ...await state(page), visibilityMocked: false });
  const resumedAt = performance.now(); await page.bringToFront();
  await page.waitForFunction(() => document.visibilityState === 'visible' && document.querySelector('.world-canvas-host > div')?.dataset.phase === 'night', undefined, { polling: 50, timeout: 2_500 });
  const refreshMs = performance.now() - resumedAt;
  await weatherIs(page, 'rain', true);
  record('native-resume-refresh', { ...await state(page), refreshMs, visibilityMocked: false, expectedPhase: 'night', thresholdMs: 2_500 });
  await capture(page, 'native-night-after-resume'); await background.close();
}
function compareBaseline() {
  if (!process.env.STATION_ENV_BASELINE_REPORT) return;
  const before = JSON.parse(fs.readFileSync(path.resolve(process.env.STATION_ENV_BASELINE_REPORT), 'utf8'));
  assert.equal(before.mode, 'baseline'); assert.equal(before.status, 'PASS'); assert.equal(before.engine, report.engine);
  const median = list => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
  const ciKnown = ['runId', 'attempt', 'job', 'runner'].every(key => before.ci?.[key] && report.ci[key]);
  const sameCi = ciKnown ? ['runId', 'attempt', 'job', 'runner'].every(key => before.ci[key] === report.ci[key]) : null;
  report.comparison = { baselineRevision: before.revision, candidateRevision: report.revision,
    sameRunnerAndJob: sameCi === null ? null : sameCi && before.runnerSha256 === report.runnerSha256,
    strictPerformanceGate: false, rainScope: 'Candidate-only measurement group; baseline has no visible rain implementation.',
    values: report.measurements.filter(value => value.weatherMode === 'clear').map(current => {
      const prior = before.measurements.find(value => value.viewport.width === current.viewport.width && value.viewport.height === current.viewport.height && value.lowPower === current.lowPower && value.weatherMode === current.weatherMode);
      assert.ok(prior, 'Matching baseline viewport/power mode');
      const oldP95 = median(prior.runs.map(run => run.p95Ms)), newP95 = median(current.runs.map(run => run.p95Ms));
      const differences = [
        ['browserVersion', before.browser, report.browser], ['dpr', prior.state.dpr, current.state.dpr],
        ['canvasSize', JSON.stringify(prior.state.canvasSize), JSON.stringify(current.state.canvasSize)],
        ['renderer', JSON.stringify(prior.state.renderer), JSON.stringify(current.state.renderer)],
        ['phase', prior.state.phase, current.state.phase], ['fixedDate', prior.fixedDate, current.fixedDate],
        ['ambientWeather', prior.state.ambientWeather, current.state.ambientWeather], ['storedWeather', prior.state.storedWeather, current.state.storedWeather],
        ['reducedMotion', prior.state.reducedMotion, current.state.reducedMotion], ['lowPower', prior.state.lowPower, current.state.lowPower],
      ].filter(([, oldValue, newValue]) => oldValue !== newValue).map(([field, oldValue, newValue]) => ({ field, baseline: oldValue, candidate: newValue }));
      return { viewport: current.viewport, weatherMode: current.weatherMode, lowPower: current.lowPower,
        comparable: differences.length === 0 && sameCi === true && before.runnerSha256 === report.runnerSha256, differences,
        baselineP50Ms: median(prior.runs.map(run => run.p50Ms)), candidateP50Ms: median(current.runs.map(run => run.p50Ms)),
        baselineP95Ms: oldP95, candidateP95Ms: newP95, p95Ratio: newP95 / oldP95 };
    }) };
}
(async () => {
  const base = await startServers();
  browser = await (browserName === 'firefox' ? firefox : chromium).launch({ headless: process.env.STATION_BROWSER_HEADED !== 'true',
    ...(browserName === 'chromium' ? { ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }
      : { firefoxUserPrefs: { 'webgl.force-enabled': true, 'gfx.webrender.all': true } }),
  });
  report.browser = browser.version();
  if (!baseline) { await solarCases(base); await weatherCases(base); await interactionCases(base); }
  await measureCases(base);
  if (!baseline && browserName === 'chromium') await nativeVisibility(base);
  else if (!baseline) report.skipped.push({ name: 'native-hidden-resume', reason: 'Native visibility is accepted in Chromium without CDP focus emulation; Firefox is not represented as passing this check.' });
  assert.deepEqual(report.errors, [], 'Uncaught browser errors'); compareBaseline(); report.status = 'PASS';
  console.log(JSON.stringify({ status: report.status, mode: report.mode, cases: report.cases.length, screenshots: report.screenshots.length, measurements: report.measurements.length }));
})().catch(async error => {
  report.status = 'FAIL'; report.failure = error.stack || String(error); console.error(report.failure); process.exitCode = 1;
  report.failureSnapshots = [];
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) {
    const snapshot = await page.evaluate(() => {
      const rect = node => { const box = node?.getBoundingClientRect(); return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null; };
      const host = document.querySelector('.world-canvas-host > div');
      return { url: location.href, canvasCount: document.querySelectorAll('canvas').length,
        targetsCount: document.querySelectorAll('[data-building-id]').length, hostDataset: { ...host?.dataset },
        hostRect: rect(host), canvasRects: [...document.querySelectorAll('canvas')].map(rect),
        worldState: document.querySelector('.hub-screen')?.dataset.worldState ?? null,
        clock: globalThis.__stationFixedDate?.snapshot(),
      };
    }).catch(error => ({ url: page.url(), snapshotError: String(error) }));
    report.failureSnapshots.push({ ...snapshot, errors: [...report.errors] });
    await page.screenshot({ path: path.join(output, `failure-${Date.now()}.png`) }).catch(() => {});
  }
}).finally(async () => {
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close().catch(() => {});
  if (nativeChrome?.exitCode === null) { const done = once(nativeChrome, 'exit'); nativeChrome.kill('SIGTERM'); await done; }
  if (webServer) { webServer.closeAllConnections(); await new Promise(resolve => webServer.close(resolve)); }
  if (apiProcess?.exitCode === null) { const done = once(apiProcess, 'exit'); apiProcess.kill('SIGTERM'); await done; }
  fs.rmSync(temp, { recursive: true, force: true });
});
