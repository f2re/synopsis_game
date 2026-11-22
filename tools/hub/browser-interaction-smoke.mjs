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
import { createHash } from 'node:crypto';

const base = process.env.HUB_SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.HUB_SMOKE_DIR ?? 'hub-visual-smoke';
const chromeBinary = process.env.CHROME ?? 'chromium';
const matrixMode = process.argv.includes('--capture-matrix');
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

async function inspectPresentedHub(cdp) {
  return evaluate(cdp, `(() => {
    const host = document.querySelector('.world-canvas-host');
    const three = host?.querySelector('.hub-three2d-canvas');
    const canvas = three ?? host?.querySelector('canvas');
    const rect = element => { if (!element) return null; const r=element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
    return { url:location.href, state:document.querySelector('.hub-screen')?.dataset.worldState,
      loading:Boolean(document.querySelector('.hub-world-status')), renderer:three ? 'three2d' : 'legacy2d',
      host:rect(host), canvas:rect(canvas), backing:canvas ? { width:canvas.width, height:canvas.height } : null,
      internalResolution:three?.dataset.hubInternalResolution,
      pixelSettings:three?.dataset.hubPixelSettings ? JSON.parse(three.dataset.hubPixelSettings) : null,
      reducedMotion:canvas?.closest('[data-reduced-motion]')?.dataset.reducedMotion, fonts:document.fonts.status,
      drawCalls:window.__hubCaptureDraws ?? 0, perf:document.querySelector('[data-hub-perf="true"]')?.textContent ?? null };
  })()`);
}

function assertPresentedHub(state, renderer) {
  assert.equal(state.state, 'ready', 'The station must be ready before capture');
  assert.equal(state.loading, false, 'A loading panel is not visual evidence of a rendered world');
  assert.equal(state.renderer, renderer, 'Capture the requested renderer, without a silent capability fallback');
  assert.ok(state.canvas?.width > 0 && state.canvas?.height > 0);
  if (renderer === 'three2d') {
    const scale = Math.max(1, Math.floor(Math.min(state.host.width / 640, state.host.height / 360)));
    const expected = { x:state.host.x + Math.floor((state.host.width - 640 * scale) / 2),
      y:state.host.y + Math.floor((state.host.height - 360 * scale) / 2), width:640 * scale, height:360 * scale };
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(state.canvas[key] - expected[key]) <= 1,
      `Three canvas ${key} must agree with the integer viewport used by raycasting: ${JSON.stringify({ actual:state.canvas, expected })}`);
  }
}

async function waitForPresentedHub(cdp, renderer, url) {
  const deadline=Date.now()+35000;
  let state;
  do {
    state=await inspectPresentedHub(cdp);
    if (state.url===url && state.state==='ready' && !state.loading && state.canvas && state.fonts==='loaded') {
      assertPresentedHub(state,renderer);
      return state;
    }
    if (state.url===url) assert.notEqual(state.state,'error','Station initialization failed');
    await delay(100);
  } while (Date.now()<deadline);
  throw new Error('Presented station timed out: '+JSON.stringify({expectedUrl:url,state}));
}

async function runCaptureMatrix(cdp) {
  await cdp.request('Page.enable');
  await cdp.request('Runtime.enable');
  await cdp.request('Emulation.setDeviceMetricsOverride', { width:1280, height:720, deviceScaleFactor:1, mobile:false });
  await cdp.request('Emulation.setEmulatedMedia', { features:[{ name:'prefers-reduced-motion', value:'reduce' }] });
  // Observe real draw calls; do not call scene methods, advance time or synthesize progress.
  await cdp.request('Page.addScriptToEvaluateOnNewDocument', { source:`(() => {
    window.__hubCaptureDraws = 0;
    const target = new URLSearchParams(location.search).get('hubRenderer')==='three2d'
      ? '.hub-three2d-canvas' : '.world-canvas-host canvas';
    for (const prototype of [window.WebGLRenderingContext?.prototype, window.WebGL2RenderingContext?.prototype].filter(Boolean)) {
      for (const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
        const original=prototype[name]; if (!original) continue;
        prototype[name]=function(...args) {
          if (this.canvas?.matches?.(target)) window.__hubCaptureDraws++;
          return original.apply(this,args);
        };
      }
    }
  })();` });
  const variants = [
    ['legacy-day-clear', 'hubRenderer=legacy2d'],
    ['three-day-clear', ''],
    ['three-res-320', 'hubRenderWidth=320'],
    ['three-res-480', 'hubRenderWidth=480'],
    ['three-res-640', 'hubRenderWidth=640'],
    ['three-collision-review', 'hubLayout=collisionReview'],
    ['three-night-clear', 'hubPhase=night'],
    ['three-day-rain', 'hubWeather=rain'],
    ['three-winter-snow', 'hubSeason=winter&hubWeather=snow'],
    ['three-day-fog', 'hubSeason=autumn&hubWeather=fog'],
    ['three-palette-off', 'pixelPalette=0'],
    ['three-dither-on', 'pixelDither=1'],
    ['three-edges-off', 'pixelEdges=0'],
    ['three-outline-soft', 'pixelOutlineStrength=0.15'],
    ['three-outline-strong', 'pixelOutlineStrength=0.75'],
    ['three-dither-strong', 'pixelDither=1&pixelDitherStrength=0.05'],
    ['three-dither-sky', 'pixelDither=1&pixelDitherSky=1'],
    ['three-perf-probe', 'hubPerf=1'],
    ['three-res-480-perf', 'hubRenderWidth=480&hubPerf=1'],
    ['three-day-clear-repeat', ''],
  ];
  for (const [name, override] of variants) {
    const query = new URLSearchParams('hubRenderer=three2d&hubPhase=day&hubSeason=summer&hubWeather=clear');
    for (const [key,value] of new URLSearchParams(override)) query.set(key,value);
    const url=base + '/?' + query;
    const renderer=query.get('hubRenderer');
    const navigation=await cdp.request('Page.navigate', { url });
    assert.equal(navigation.errorText,undefined,`${name}: navigation must succeed`);
    let state=await waitForPresentedHub(cdp,renderer,url);
    // Wait for actual requestAnimationFrame callbacks after scene and fonts are ready.
    const presented=await evaluate(cdp, `new Promise(resolve => {
      const samples=[]; function frame(time) { samples.push({time,drawCalls:window.__hubCaptureDraws});
        if(samples.length===8) resolve(samples); else requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
    })`);
    assert.ok(presented.at(-1).drawCalls>presented[0].drawCalls,`${name}: WebGL must draw after readiness`);
    state=await inspectPresentedHub(cdp);
    assertPresentedHub(state,renderer);
    assert.equal(state.reducedMotion,'true',`${name}: capture uses the actual reduced-motion preference`);
    if(renderer==='three2d') {
      const width=Number(query.get('hubRenderWidth')??320);
      assert.deepEqual(state.backing,{width,height:width*9/16});
      assert.equal(state.internalResolution,`${width}x${width*9/16}`);
      assert.ok(state.pixelSettings,'Record the actual settings passed to the shader pipeline');
    }
    if(query.get('hubPerf')==='1') assert.match(state.perf??'',/render p50\/p95\/max:/);
    const full=await cdp.request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    writeFileSync(join(output,name+'.png'),Buffer.from(full.data,'base64'));
    writeFileSync(join(output,name+'.dom.html'),await evaluate(cdp,'document.documentElement.outerHTML'));
    // A separate world-only clip excludes clocks, HUD, performance text and the
    // Phaser label layer. Keep the full screenshot above for human review.
    await evaluate(cdp, `(() => {
      const canvas=document.querySelector('.hub-three2d-canvas')??document.querySelector('.world-canvas-host canvas');
      window.__hubCaptureVisibility=[...document.body.querySelectorAll('*')]
        .filter(element=>element!==canvas&&!element.contains(canvas))
        .map(element=>[element,element.style.getPropertyValue('visibility'),element.style.getPropertyPriority('visibility')]);
      for(const [element] of window.__hubCaptureVisibility) element.style.setProperty('visibility','hidden','important');
      return true;
    })()`);
    let world;
    try {
      await evaluate(cdp,'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      world=await cdp.request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...state.canvas,scale:1}});
    } finally {
      await evaluate(cdp,`(() => { for(const [element,value,priority] of window.__hubCaptureVisibility??[]) {
        if(value) element.style.setProperty('visibility',value,priority); else element.style.removeProperty('visibility');
      } delete window.__hubCaptureVisibility; return true; })()`);
    }
    const bytes=Buffer.from(world.data,'base64');
    writeFileSync(join(output,name+'.world.png'),bytes);
    const worldSha256=createHash('sha256').update(bytes).digest('hex');
    report.steps.push({name,result:'PASS',url,...state,presented,worldSha256});
    console.log(`Captured ready ${name}: ${renderer}, ${state.backing.width}x${state.backing.height}, world ${worldSha256}`);
  }
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
  await waitForPresentedHub(cdp, 'three2d', report.url);
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

  // Keyboard-only access: real Tab moves from the canvas host to the
  // first native semantic building button. Enter must request exactly the
  // same safe walking + dossier flow as a physical mouse pointer hit.
  await evaluate(cdp, "document.querySelector('.world-canvas-host').focus(); true");
  let keyboardId = null;
  // The shared scroll viewport may precede the first button when overflowing.
  for (let tab = 0; tab < 3 && !keyboardId; tab += 1) {
    await cdp.request('Input.dispatchKeyEvent', {
      type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
    });
    await cdp.request('Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
    });
    keyboardId = await evaluate(cdp, "document.activeElement?.getAttribute('data-hub-building-id') ?? null");
  }
  assert.ok(keyboardId, 'Tab from game canvas must focus a native building button');
  const oldCount = state.worldEvents.length;
  await cdp.request('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13,
  });
  // DevTools keyDown is not guaranteed to synthesize a text/keypress event;
  // a separate "char" packet models physical Enter for native buttons.
  await cdp.request('Input.dispatchKeyEvent', {
    type: 'char', text: '\r', unmodifiedText: '\r',
    key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13,
  });
  await cdp.request('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13,
  });
  const focusAfterEnter = await evaluate(cdp,
    "({element:document.activeElement?.tagName, id:document.activeElement?.getAttribute('data-hub-building-id')})");
  console.log('Hub keyboard activation:', JSON.stringify({ keyboardId, focusAfterEnter }));
  state = await until(cdp, 'keyboard-selected building arrival', s =>
    s?.worldEvents?.length > oldCount && s.dossierOpen === true, 45000);
  assert.equal(state.worldEvents.at(-1), keyboardId, 'Enter must visit the focused building');
  assert.equal(state.worldEvents.length, oldCount + 1, 'Keyboard visit must emit once');
  report.steps.push({
    name: 'Tab -> native building button -> Enter -> safe visit -> dossier',
    result: 'PASS', building: keyboardId,
  });
  await capture(cdp, 'keyboard-arrival');
  await escape(cdp);
  await until(cdp, 'keyboard modal closes', s => s?.dossierOpen === false, 5000);
  // The same native list remains usable in narrow portrait and landscape.
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await cdp.request('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: false });
    await evaluate(cdp, "document.querySelector('.world-canvas-host').focus(); true");
    let lastId = null;
    for (let tab = 0; tab < 14 && lastId !== 'canteen'; tab += 1) {
      for (const type of ['keyDown', 'keyUp']) await cdp.request('Input.dispatchKeyEvent', {
        type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
      });
      lastId = await evaluate(cdp, "document.activeElement?.getAttribute('data-hub-building-id') ?? null");
    }
    assert.equal(lastId, 'canteen', 'Keyboard must reach all eight buildings in the narrow list');
    await delay(150);
    assertPresentedHub(await inspectPresentedHub(cdp), 'three2d');
    const geometry = await evaluate(cdp, `(() => {
      const nav = document.querySelector('.hub-keyboard-locations');
      const area = nav.querySelector('.pixel-scroll-area');
      const view = area.querySelector('.pixel-scroll-area__viewport');
      const rail = area.querySelector('.pixel-scroll-area__track--vertical');
      const box = e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
      return { nav:box(nav), view:box(view), rail:box(rail), top:view.scrollTop,
        extent:view.scrollHeight-view.clientHeight, buttons:[...nav.querySelectorAll('button')].map(box) };
    })()`);
    assert.ok(geometry.nav.x >= 0 && geometry.nav.x + geometry.nav.width <= viewport.width + 1);
    assert.ok(geometry.nav.y >= 0 && geometry.nav.y + geometry.nav.height <= viewport.height + 1);
    assert.ok(geometry.buttons.every(button => button.height >= 44 && button.width >= 44));
    if (geometry.extent > 1) {
      assert.ok(geometry.top > 0, 'Tab reveals the final building inside the bounded viewport');
      await cdp.request('Input.dispatchMouseEvent', { type:'mouseWheel',
        x:geometry.view.x + geometry.view.width / 2, y:geometry.view.y + geometry.view.height / 2,
        deltaX:0, deltaY:-2000 });
      await delay(100);
      const afterContentWheel = await evaluate(cdp, "document.querySelector('.hub-keyboard-locations .pixel-scroll-area__viewport').scrollTop");
      assert.equal(afterContentWheel, 0, 'Wheel over list content reaches the top');
      await cdp.request('Input.dispatchMouseEvent', { type:'mouseWheel',
        x:geometry.rail.x + geometry.rail.width / 2, y:geometry.rail.y + geometry.rail.height / 2,
        deltaX:0, deltaY:160 });
      await delay(100);
      const afterRailWheel = await evaluate(cdp, "document.querySelector('.hub-keyboard-locations .pixel-scroll-area__viewport').scrollTop");
      assert.ok(afterRailWheel > 0, 'Wheel over pixel rail scrolls this list');
      const thumb = await evaluate(cdp, `(() => {
        const r = document.querySelector('.hub-keyboard-locations .pixel-scroll-area__thumb').getBoundingClientRect();
        return { x:r.x+r.width/2, y:r.y+r.height/2, height:r.height };
      })()`);
      await cdp.request('Input.dispatchMouseEvent', { type:'mouseMoved', x:thumb.x, y:thumb.y });
      await cdp.request('Input.dispatchMouseEvent', { type:'mousePressed', x:thumb.x, y:thumb.y, button:'left', clickCount:1 });
      await cdp.request('Input.dispatchMouseEvent', { type:'mouseMoved', x:thumb.x, y:geometry.rail.y + thumb.height / 2, button:'left', buttons:1 });
      await cdp.request('Input.dispatchMouseEvent', { type:'mouseReleased', x:thumb.x, y:geometry.rail.y + thumb.height / 2, button:'left', clickCount:1 });
      await delay(100);
      const afterDrag = await evaluate(cdp, "document.querySelector('.hub-keyboard-locations .pixel-scroll-area__viewport').scrollTop");
      assert.ok(afterDrag <= 3, 'Dragging the pixel thumb reaches the top');
      for (const type of ['keyDown', 'keyUp']) await cdp.request('Input.dispatchKeyEvent', { type, key:'End', code:'End', windowsVirtualKeyCode:35, nativeVirtualKeyCode:35 });
      await delay(100);
      const afterEnd = await evaluate(cdp, "document.querySelector('.hub-keyboard-locations .pixel-scroll-area__viewport').scrollTop");
      assert.ok(afterEnd >= geometry.extent - 2, 'End on the pixel rail reaches the list bottom');
    }
    report.steps.push({ name:'narrow native building navigation and pixel scrolling', result:'PASS', viewport, extent:geometry.extent });
    await capture(cdp, 'keyboard-list-' + viewport.width);
  }
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
  await (matrixMode ? runCaptureMatrix(cdp) : run(cdp));
  report.status = 'PASS';
  console.log(`Hub real browser ${matrixMode ? 'capture matrix' : 'interaction smoke'} PASS: ` + report.steps.map(x => x.name).join('; '));
} catch (error) {
  report.status = 'FAIL';
  report.errors.push(String(error?.stack ?? error));
  report.chromeStderr = stderr.slice(-5000);
  console.error(`Hub real browser ${matrixMode ? 'capture matrix' : 'interaction smoke'} FAIL:`, error);
  process.exitCode = 1;
} finally {
  writeFileSync(join(output, matrixMode ? 'capture-matrix-report.json' : 'ui-interaction-report.json'), JSON.stringify(report, null, 2) + '\n');
  try { cdp?.close(); } catch {}
  if (chrome && chrome.exitCode === null) chrome.kill('SIGTERM');
  await delay(250);
  rmSync(profile, { recursive: true, force: true });
}
