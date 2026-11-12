/** Real Chromium + production assets + real isolated server. No API/artwork mocks.
 * Requires built apps/web/dist and apps/server/dist. Run on a host that permits sockets.
 * STATION_PLAYWRIGHT_MODULES=/path/to/node_modules node tools/test_station_screens.cjs
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require(require.resolve('playwright', { paths: [process.env.STATION_PLAYWRIGHT_MODULES || process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd()] }));
const repo = process.cwd(), dist = path.join(repo, 'apps/web/dist');
const output = path.resolve(process.env.STATION_SCREEN_EVIDENCE || 'artifacts/cozy-screens-r01');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'station-screen-test-'));
const fixture = JSON.parse(fs.readFileSync('config/test-roster.example.json', 'utf8')).groups[0];
const report = { status: 'RUNNING', browser: '', productionAssets: true, realServer: true, cases: [], errors: [], screenshots: [] };
fs.mkdirSync(output, { recursive: true });
let apiProcess, webServer, browser;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function reservePort() { const server = http.createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function startServers() {
  const port = await reservePort();
  const baseApi = `http://127.0.0.1:${port}`;
  apiProcess = spawn(process.execPath, ['apps/server/dist/index.js'], { cwd: repo, env: {
    ...process.env, API_BIND: '127.0.0.1', API_PORT: String(port), SYNOPSIS_SECURITY_PROFILE: 'trusted',
    SYNOPSIS_BOOTSTRAP_ADMIN_CODE: '', SYNOPSIS_ENABLE_TEST_ROSTER: 'true', SYNOPSIS_TEST_ROSTER_FILE: path.join(repo, 'config/test-roster.example.json'),
    SYNOPSIS_IDENTITY_STORE: path.join(temp, 'identity.json'), SYNOPSIS_EQUIPMENT_STORE: path.join(temp, 'equipment.json'),
    SYNOPSIS_PROGRESSION_STORE: path.join(temp, 'progression.json'), SYNOPSIS_ATTEMPT_LOG: path.join(temp, 'attempts.jsonl'), SYNOPSIS_CONTENT_ROOT: path.join(repo, 'content'),
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = fs.createWriteStream(path.join(output, 'server.log')); apiProcess.stdout.pipe(log); apiProcess.stderr.pipe(log);
  for (let n = 0; n < 80; n++) {
    if (apiProcess.exitCode !== null) throw new Error(`Server exited: ${apiProcess.exitCode}`);
    try { if ((await fetch(`${baseApi}/ready`)).ok) break; } catch {}
    if (n === 79) throw new Error('Server startup timeout');
    await wait(150);
  }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
  webServer = http.createServer((req, res) => {
    if ((req.url || '').startsWith('/api/')) {
      const proxy = http.request(baseApi + req.url, { method: req.method, headers: req.headers }, upstream => { res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res); });
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
async function capture(page, name) {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(img => img.getBoundingClientRect().width > 0).map(img => img.decode().catch(() => undefined))); });
  const metric = await page.evaluate(() => ({
    viewport: [innerWidth, innerHeight], scrollWidth: document.documentElement.scrollWidth,
    brokenImages: [...document.images].filter(img => img.getBoundingClientRect().width > 0 && img.complete && img.naturalWidth === 0).map(img => new URL(img.src).pathname),
    heading: document.querySelector('main h1,dialog h2')?.textContent,
    canvasCount: document.querySelectorAll('canvas').length,
  }));
  assert.ok(metric.scrollWidth <= metric.viewport[0] + 2, `${name}: horizontal overflow ${JSON.stringify(metric)}`);
  assert.deepEqual(metric.brokenImages, [], `${name}: broken artwork`);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  report.screenshots.push(`${name}.png`); report.cases.push({ name, ...metric });
}
async function measurePresentation(page, name) {
  const metrics = await page.evaluate(async () => {
    const frames = []; let previous = performance.now();
    await new Promise(resolve => {
      function tick(now) { frames.push(now - previous); previous = now; if (frames.length < 120) requestAnimationFrame(tick); else resolve(); }
      requestAnimationFrame(tick);
    });
    frames.shift(); frames.sort((a, b) => a - b);
    const drops = [...document.querySelectorAll('.station-room-art__drop')];
    return {
      rafCadenceMs: { p50: frames[Math.floor(frames.length * .5)], p95: frames[Math.floor(frames.length * .95)], samples: frames.length },
      jsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
      decorativeDrops: drops.length,
      animatedDrops: drops.filter(node => getComputedStyle(node).display !== 'none' && getComputedStyle(node).animationName !== 'none').length,
      fpsLimit: document.querySelector('.world-canvas-host > div')?.dataset.fpsLimit ?? null,
      reducedMotion: document.documentElement.dataset.reducedMotion,
      lowPower: document.documentElement.dataset.lowPower,
      // Transfer size is observable here; GPU hardware memory is not.
      resourceBytes: performance.getEntriesByType('resource').reduce((total, entry) => total + (entry.transferSize || 0), 0),
    };
  });
  assert.ok(metrics.decorativeDrops <= 12, 'Rain has a bounded number of visual elements');
  if (metrics.reducedMotion === 'true' || metrics.lowPower === 'true') assert.equal(metrics.animatedDrops, 0);
  if (name === 'home-full-motion-performance') {
    assert.equal(metrics.decorativeDrops, 12, 'Rain renders all twelve authored drops');
    assert.equal(metrics.animatedDrops, 12, 'Full-motion rain animates behind the window');
  }
  report.cases.push({ name, measurement: 'Browser RAF cadence and JS heap; not physical-GPU profiling', ...metrics });
}
async function waitForCampus(page) {
  await page.locator('.hub-screen').waitFor();
  await page.waitForFunction(() => document.querySelector('.hub-scene-caption') && !document.querySelector('.hub-scene-caption').textContent.includes('Подготовка'), undefined, { timeout: 30_000 });
  await page.locator('canvas').first().waitFor();
}
(async () => {
  const base = await startServers();
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  report.browser = browser.version();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      if (!localStorage.getItem('synopsis_26063_settings')) localStorage.setItem('synopsis_26063_settings', JSON.stringify({ weather: 'rain', soundEnabled: false }));
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ viewport: viewport.width, message: error.message }));
    await page.goto(base); await page.getByRole('heading', { name: /Позывной/ }).waitFor();
    assert.equal(await page.locator('canvas').count(), 0, 'Home must not mount Phaser');
    await capture(page, `home-${viewport.width}`);
    await measurePresentation(page, `home-performance-${viewport.width}`);
    const openedAt = await page.evaluate(() => performance.now());
    await page.getByRole('button', { name: /Библиотека Понятия/ }).click();
    await page.getByRole('heading', { name: 'Библиотека синоптика' }).waitFor();
    await page.waitForFunction(() => document.activeElement === document.querySelector('main h1'));
    report.cases.push({ name: `library-opening-${viewport.width}`, inputToHeadingMs: await page.evaluate(() => performance.now()) - openedAt });
    await page.getByLabel('Что хотите найти?').fill('точка росы');
    await page.locator('.library-result').first().click();
    await page.getByRole('heading', { name: 'Точка росы', exact: true }).waitFor();
    await page.getByRole('button', { name: 'В избранное', exact: false }).click();
    await capture(page, `library-${viewport.width}`);
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('synopsis_26063_library_favorites_v1')))).length, 1);
    await page.reload();
    await page.getByRole('button', { name: /Избранное/ }).click();
    assert.equal(await page.locator('.library-result').count(), 1, 'Bookmarks persist on reload');
    await page.getByLabel('Что хотите найти?').fill('несуществующеепонятие');
    await page.getByRole('heading', { name: 'Ничего не найдено' }).waitFor();
    await page.getByRole('button', { name: 'Показать все темы' }).click();
    await page.getByRole('button', { name: /Открыть таблицы КН-01/ }).click();
    await page.locator('dialog[open]').waitFor();
    await capture(page, `codebook-${viewport.width}`);
    await page.keyboard.press('Escape');
    await page.getByRole('heading', { name: 'Библиотека синоптика' }).waitFor();
    await page.goto(base + '/help');
    await page.getByRole('heading', { name: 'Помощь и управление' }).waitFor();
    await page.getByText('Что сохраняется?', { exact: true }).click();
    await capture(page, `help-${viewport.width}`);
    await page.getByRole('button', { name: /Настроить атмосферу/ }).click();
    await page.getByRole('heading', { name: 'Настройки', exact: true }).waitFor();
    const master = page.locator('#settings-masterVolume'); await master.focus(); await master.press('Home');
    await page.getByRole('radio', { name: 'Дождь', exact: true }).check();
    await page.getByRole('checkbox', { name: /Экономия ресурсов/ }).check();
    await capture(page, `settings-${viewport.width}`);
    await page.reload();
    assert.equal(await master.inputValue(), '0');
    assert.ok(await page.getByRole('checkbox', { name: /Экономия ресурсов/ }).isChecked());
    await page.getByRole('button', { name: /Назад/ }).first().click();
    await page.getByRole('heading', { name: 'Помощь и управление' }).waitFor();
    await page.goto(base + '/campus'); await waitForCampus(page);
    await capture(page, `campus-${viewport.width}`);
    assert.equal(await page.locator('.world-canvas-host > div').first().getAttribute('data-fps-limit'), '30');
    await measurePresentation(page, `campus-performance-${viewport.width}`);
    await page.locator('.hub-dock__route').click();
    await page.getByRole('button', { name: /Архив наблюдений/ }).click();
    await page.waitForFunction(() => document.querySelector('.hub-scene-caption')?.textContent.includes('Читальный зал архива'));
    await capture(page, `archive-${viewport.width}`);
    await page.getByRole('button', { name: /Открыть библиотеку/ }).click();
    await page.getByRole('heading', { name: 'Библиотека синоптика' }).waitFor();
    await page.goto(base);
    const exit = page.getByRole('button', { name: 'Выйти из игры', exact: true }); await exit.click();
    await page.getByRole('dialog', { name: 'Завершить сеанс?' }).waitFor();
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.querySelector('dialog[open]').contains(document.activeElement)), 'Exit traps keyboard focus');
    await page.keyboard.press('Escape');
    assert.ok(await exit.evaluate(node => node === document.activeElement), 'Escape restores opener focus');
    await exit.click(); await page.getByRole('dialog').getByRole('button', { name: 'Выйти из игры', exact: true }).click();
    await page.getByRole('heading', { name: 'До следующей смены' }).waitFor();
    await capture(page, `exit-${viewport.width}`);
    assert.equal(await page.locator('canvas').count(), 0);
    await context.close();
  }
  // Native audio nodes are observed, not replaced, to prove real gesture/start/stop behavior.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    const Original = window.AudioContext || window.webkitAudioContext;
    const probe = window.__stationAudioProbe = { contexts: 0, oscillators: 0, buffers: 0 };
    if (Original) window.AudioContext = new Proxy(Original, { construct(target, args) {
      const ctx = Reflect.construct(target, args); probe.contexts++;
      for (const [method, counter] of [['createOscillator', 'oscillators'], ['createBufferSource', 'buffers']]) {
        const original = ctx[method].bind(ctx);
        ctx[method] = (...input) => { const node = original(...input); const start = node.start.bind(node); let started = false;
          node.start = (...parameters) => { if (!started) { started = true; probe[counter]++; node.addEventListener('ended', () => probe[counter]--, { once: true }); } return start(...parameters); }; return node;
        };
      }
      return ctx;
    } });
  });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push({ scenario: 'session/audio', message: error.message }));
  await page.goto(base); await page.getByRole('heading', { name: /Позывной/ }).waitFor();
  assert.equal(await page.evaluate(() => window.__stationAudioProbe.contexts), 0, 'No AudioContext before a gesture');
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.getByRole('radio', { name: 'Дождь', exact: true }).check();
  await page.getByRole('button', { name: /Назад/ }).first().click();
  await measurePresentation(page, 'home-full-motion-performance');
  await page.getByRole('button', { name: 'Включить звук', exact: true }).click();
  await page.waitForFunction(() => window.__stationAudioProbe.oscillators > 0);
  assert.equal(await page.evaluate(() => window.__stationAudioProbe.contexts), 1, 'Music and ambience share a context');
  await page.getByRole('button', { name: /Учебная смена/ }).click();
  await page.getByRole('dialog', { name: 'Вход в учебную группу' }).waitFor();
  await page.getByLabel('Группа', { exact: true }).selectOption({ label: fixture.groupId });
  await page.getByLabel('Пользователь', { exact: true }).selectOption({ label: fixture.users[0].displayName });
  await page.getByLabel('Персональный код', { exact: true }).fill(fixture.users[0].code);
  await page.getByRole('dialog').getByRole('button', { name: 'Войти', exact: true }).click();
  await page.getByRole('heading', { name: 'Записка на краю стола' }).waitFor();
  await page.waitForFunction(() => window.__stationAudioProbe.oscillators === 0);
  await capture(page, 'shift-handover-authenticated');
  const sessionToken = await page.evaluate(() => sessionStorage.getItem('synopsis.session.token'));
  assert.ok(sessionToken);
  // A direct URL must request confirmation while the real authenticated session remains valid.
  const exitPage = await context.newPage();
  await exitPage.goto(base);
  await exitPage.evaluate(token => sessionStorage.setItem('synopsis.session.token', token), sessionToken);
  await exitPage.goto(base + '/exit');
  await exitPage.getByRole('heading', { name: 'Завершить сеанс?' }).waitFor();
  assert.equal(await exitPage.evaluate(() => sessionStorage.getItem('synopsis.session.token')), sessionToken);
  await exitPage.close();
  await page.getByRole('button', { name: 'Вернуться в центр', exact: true }).click(); await waitForCampus(page);
  assert.equal(await page.locator('.world-canvas-host > div').first().getAttribute('data-fps-limit'), '60');
  await measurePresentation(page, 'campus-full-motion-performance');
  await page.getByRole('button', { name: `Профиль: ${fixture.users[0].displayName}`, exact: true }).click();
  await page.getByRole('button', { name: 'Выйти из игры', exact: true }).click();
  await page.getByRole('dialog', { name: 'Завершить сеанс?' }).getByRole('button', { name: 'Выйти из игры', exact: true }).click();
  await page.getByRole('heading', { name: 'До следующей смены' }).waitFor();
  await page.waitForFunction(() => window.__stationAudioProbe.oscillators === 0 && window.__stationAudioProbe.buffers === 0);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('synopsis.session.token')), null);
  const revoked = await context.request.get(base + '/api/identity/me', { headers: { authorization: `Bearer ${sessionToken}` } });
  assert.equal(revoked.status(), 401, 'Real server session revoked');
  report.cases.push({ name: 'authenticated-exit-audio', serverRevocation: 401, ...await page.evaluate(() => window.__stationAudioProbe) });
  assert.deepEqual(report.errors, [], 'Uncaught browser errors');
  report.status = 'PASS';
  console.log(JSON.stringify({ status: report.status, screenshots: report.screenshots.length, cases: report.cases.length, errors: report.errors.length }));
})().catch(async error => {
  report.status = 'FAIL'; report.failure = error.stack || String(error); console.error(report.failure); process.exitCode = 1;
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, `failure-${Date.now()}.png`), fullPage: true }).catch(() => {});
}).finally(async () => {
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (webServer) await new Promise(resolve => webServer.close(resolve));
  if (apiProcess?.exitCode === null) { const done = once(apiProcess, 'exit'); apiProcess.kill('SIGTERM'); await done; }
  fs.rmSync(temp, { recursive: true, force: true });
});
