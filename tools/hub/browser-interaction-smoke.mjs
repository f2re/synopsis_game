#!/usr/bin/env node
/**
 * H3D-042: Real Chrome mouse/keyboard smoke against the production build.
 * No Playwright/Puppeteer dependency. Node 22 native WebSocket + fetch and
 * Chrome DevTools Protocol. All actions are actual browser input, not scene
 * method invocations. A read-only observer is gated by hubE2E=1.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.HUB_SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.HUB_SMOKE_DIR ?? 'hub-visual-smoke';
const chromeBinary = process.env.CHROME ?? 'chromium';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = { status: 'started', url: '', targets: [], steps: [], errors: [] };
mkdirSync(output, { recursive: true });

async function randomPort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).on('error', reject));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function findChromeTarget(port, processHandle) {
  const endpoint = 'http://127.0.0.1:' + port + '/json/list';
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processHandle.exitCode !== null) throw new Error('Chromium exited before DevTools initialization');
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(1200) });
      const targets = await response.json();
      const tab = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (tab) return tab.webSocketDebuggerUrl;
    } catch { /* Chromium not ready yet */ }
    await delay(200);
  }
  throw new Error('Could not obtain Chromium DevTools page target');
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.serial = 1;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      let data;
      try { data = JSON.parse(String(event.data)); } catch { return; }
      if (!data.id) return;
      const waiter = this.pending.get(data.id);
      if (!waiter) return;
      this.pending.delete(data.id);
      clearTimeout(waiter.timer);
      if (data.error) waiter.reject(new Error(waiter.method + ': ' + JSON.stringify(data.error)));
      else waiter.resolve(data.result ?? {});
    });
    socket.addEventListener('close', () => {
      for (const item of this.pending.values()) {
        clearTimeout(item.timer);
        item.reject(new Error('CDP socket closed'));
      }
      this.pending.clear();
    });
  }

  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP connection timeout')), 10000);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP handshake failed')); }, { once: true });
    });
    return new Cdp(socket);
  }

  request(method, params = {}) {
    const id = this.serial++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP timeout for ' + method));
      }, 20000);
      this.pending.set(id, { method, timer, resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() { this.socket.close(); }
}

async function evaluate(cdp, expression) {
  const response = await cdp.request('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error('Browser evaluation failed: ' + JSON.stringify(response.exceptionDetails).slice(0, 1300));
  }
  return response.result?.value;
}

async function snapshot(cdp) {
  return evaluate(cdp, 'window.__synopsisHubSmoke?.snapshot() ?? null');
}

async function until(cdp, label, predicate, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await snapshot(cdp);
    if (predicate(last)) return last;
    await delay(200);
  }
  throw new Error(label + ' timed out: ' + JSON.stringify(last));
}

async function capture(cdp, name) {
  const result = await cdp.request('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(join(output, 'ui-' + name + '.png'), Buffer.from(result.data, 'base64'));
}

async function click(cdp, target) {
  const x = target.clientX, y = target.clientY;
  assert.ok(Number.isFinite(x) && Number.isFinite(y), 'Real CSS pointer coordinates required');
  await cdp.request('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp.request('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await cdp.request('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}

async function escape(cdp) {
  const args = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
  await cdp.request('Input.dispatchKeyEvent', { type: 'keyDown', ...args });
  await cdp.request('Input.dispatchKeyEvent', { type: 'keyUp', ...args });
}

async function run(cdp) {
  await cdp.request('Page.enable');
  await cdp.request('Runtime.enable');
  report.url = base + '/?hubRenderer=three2d&hubLayout=collisionReview&hubPhase=day&hubSeason=summer&hubWeather=clear&hubE2E=1';
  await cdp.request('Page.navigate', { url: report.url });
  let state = await until(cdp, 'Hub 2.5D scene initialization', s => s?.ready === true && s.arrivalGated === true, 35000);
  report.targets = state.targets;
  assert.ok(Array.isArray(state.targets) && state.targets.length >= 3,
    'At least three real 3D building meshes must be individually pickable');
  report.steps.push({ name: '3D raycast targets', result: 'PASS', ids: state.targets.map(x => x.id) });
  await capture(cdp, 'ready');

  // Short first route: real pointer -> Phaser hit-test -> walk -> one dossier.
  const byId = new Map(state.targets.map(t => [t.id, t]));
  const first = byId.get('codepost') ?? state.targets[0];
  await click(cdp, first);
  state = await until(cdp, 'initial real pointer hit', s => s?.pointerHits?.includes(first.id), 5000);
  // The initial very short walk may have completed already on a fast runner.
  assert.ok(state.worldEvents.length <= 1, 'More than one event before first route completes');
  state = await until(cdp, 'initial building dossier', s => s?.worldEvents?.includes(first.id) && s.dossierOpen, 30000);
  assert.deepEqual(state.worldEvents, [first.id], 'Exactly one world event for first arrival');
  report.steps.push({ name: 'pointer -> walk -> arrival -> dossier', result: 'PASS', building: first.id });
  await capture(cdp, 'arrival-dossier');

  await escape(cdp);
  await until(cdp, 'Escape closes the dossier', s => s?.dossierOpen === false, 5000);
  report.steps.push({ name: 'keyboard Escape closes modal', result: 'PASS' });

  // Second click supersedes an in-progress route; canceled visit never fires.
  const choices = state.targets.filter(t => t.id !== first.id);
  const second = byId.get('hall') ?? choices[0];
  const candidate = byId.get('cartography');
  const third = candidate && candidate.id !== second.id ? candidate : choices.find(t => t.id !== second.id);
  assert.ok(second && third && second.id !== third.id, 'Need distinct retarget buildings');
  await click(cdp, second);
  await until(cdp, 'retarget first hit', s => s?.pointerHits?.includes(second.id), 5000);
  await click(cdp, third);
  await until(cdp, 'retarget second hit', s => s?.pointerHits?.at(-1) === third.id, 5000);
  state = await until(cdp, 'retarget final arrival', s => s?.worldEvents?.length > 1 && s.dossierOpen, 45000);
  assert.deepEqual(state.worldEvents, [first.id, third.id],
    'Canceled destination ' + second.id + ' must never produce a world event');
  report.steps.push({ name: 'consecutive real clicks supersede pending destination', result: 'PASS',
    canceled: second.id, final: third.id });
  await capture(cdp, 'retarget-arrival');
  await escape(cdp);
  await until(cdp, 'final modal closes', s => s?.dossierOpen === false, 5000);
}

const profile = mkdtempSync(join(tmpdir(), 'hub-cdp-'));
let chrome, cdp;
let stderr = '';
try {
  const port = await randomPort();
  chrome = spawn(chromeBinary, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-allow-origins=*', '--remote-debugging-port=' + port,
    '--user-data-dir=' + profile, '--window-size=1280,720',
    '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-12000); });
  const url = await findChromeTarget(port, chrome);
  cdp = await Cdp.open(url);
  await run(cdp);
  report.status = 'PASS';
  console.log('Hub real browser interaction smoke PASS: ' + report.steps.map(x => x.name).join('; '));
} catch (error) {
  report.status = 'FAIL';
  report.errors.push(String(error?.stack ?? error));
  report.chromeStderr = stderr.slice(-5000);
  console.error('Hub real browser interaction smoke FAIL:', error);
  process.exitCode = 1;
} finally {
  writeFileSync(join(output, 'ui-interaction-report.json'), JSON.stringify(report, null, 2) + '\n');
  try { cdp?.close(); } catch {}
  if (chrome && chrome.exitCode === null) chrome.kill('SIGTERM');
  await delay(250);
  rmSync(profile, { recursive: true, force: true });
}
