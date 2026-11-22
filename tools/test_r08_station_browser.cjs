'use strict';
const assert = require('node:assert/strict');
const R08_RESIDENTS = ['character.r01.observer', 'npc.r01.vera', 'companion.r01.pascal', 'animal_squirrel', 'bird_tit'];

async function checkR08Residents(page, viewport, report) {
  const host = page.locator('.world-canvas-r08-plane [data-characters]');
  await host.waitFor();
  const diagnostics = JSON.parse(await host.getAttribute('data-characters'));
  assert.equal(diagnostics.characterClass, 'r08-station-actor');
  assert.deepEqual(diagnostics.errors, [], 'R08 resident assets are ready');
  const residents = diagnostics.actors.map(actor => actor.id);
  for (const id of R08_RESIDENTS) assert.ok(residents.includes(id), `R08 resident is visible in scene diagnostics: ${id}`);
  assert.ok(diagnostics.animatedActors <= diagnostics.animationBudget);
  report.cases.push({ name: `r08-residents-${viewport.width}`, residents, animatedActors: diagnostics.animatedActors,
    animationBudget: diagnostics.animationBudget, faunaAnimationBudget: diagnostics.faunaAnimationBudget });
}

async function measureR08(page, viewport, report) {
  const result = await page.evaluate(async () => {
    const canvas = document.querySelector('.world-canvas-r08-plane canvas');
    const host = canvas.parentElement;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    const intervals = [];
    await new Promise(resolve => {
      let previous;
      function sample(current) {
        if (previous !== undefined) intervals.push(current - previous);
        previous = current;
        if (intervals.length === 120) resolve();
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    intervals.sort((left, right) => left - right);
    const art = performance.getEntriesByType('resource')
      .filter(entry => new URL(entry.name).pathname.startsWith('/hub/r08-preview/'));
    return {
      renderer: gl ? 'webgl' : 'canvas',
      rendererDescription: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
      backingStore: [canvas.width, canvas.height],
      devicePixelRatio,
      refreshIntervals: intervals.length,
      p50Ms: intervals[59],
      p95Ms: intervals[113],
      maxIntervalMs: intervals.at(-1),
      rainDrops: Number(host.dataset.rainDrops),
      fpsLimit: Number(host.dataset.fpsLimit),
      artRequests: art.length,
      artTransferBytes: art.reduce((bytes, entry) => bytes + entry.transferSize, 0),
      jsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
    };
  });
  report.cases.push({ name: `r08-present-${viewport.width}`, viewport,
    scope: 'Browser RAF intervals, CSS viewport profiles; not render submission or physical device latency', ...result });
  assert.equal(result.refreshIntervals, 120);
  assert.equal(result.fpsLimit, 60);
  assert.ok(result.rainDrops > 0 && result.rainDrops <= 72, 'Animated rain stays within its scene budget');
  assert.ok(result.artRequests > 0 && result.artTransferBytes > 0, 'Measure the loaded R08 art package');
  assert.ok(result.backingStore[0] * result.backingStore[1] <= 2_000_000, 'Limit physical backing pixels');
  if (process.env.STATION_R08_REQUIRE_WEBGL === '1') assert.equal(result.renderer, 'webgl');
  return result;
}

async function checkR08ContextRecovery(page, render, report) {
  const canvas = page.locator('.world-canvas-r08-plane canvas');
  const host = page.locator('.world-canvas-r08-plane [data-context]');
  const extensionAvailable = await canvas.evaluate(node => Boolean((node.getContext('webgl2') ?? node.getContext('webgl'))?.getExtension('WEBGL_lose_context')));
  if (!extensionAvailable) {
    if (process.env.STATION_R08_REQUIRE_WEBGL === '1') assert.fail('WEBGL_lose_context is required for native context recovery evidence');
    report.cases.push({ name: 'r08-webgl-recovery', renderer: render.renderer, status: 'skipped', reason: 'WEBGL_lose_context unavailable' });
    return;
  }

  const before = await canvas.screenshot();
  const extension = await canvas.evaluateHandle(node => (node.getContext('webgl2') ?? node.getContext('webgl')).getExtension('WEBGL_lose_context'));
  try {
    await extension.evaluate(control => control.loseContext());
    await page.waitForFunction(() => document.querySelector('.world-canvas-r08-plane [data-context]')?.dataset.context === 'lost');
    assert.ok(await canvas.evaluate(node => (node.getContext('webgl2') ?? node.getContext('webgl')).isContextLost()));
    await extension.evaluate(control => control.restoreContext());
    await page.waitForFunction(() => document.querySelector('.world-canvas-r08-plane [data-context]')?.dataset.context === 'ready');
  } finally {
    await extension.dispose();
  }
  assert.equal(await host.getAttribute('data-context'), 'ready');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.ok(before.equals(await canvas.screenshot()), 'The frozen R08 canvas must repaint exactly after context restoration');
  report.cases.push({ name: 'r08-webgl-recovery', renderer: render.renderer, status: 'passed', frozenCanvasMatches: true });
}

async function checkR08Station({ base, browser, report, capture, waitForCampus }) {
  const slowProfiles = [];
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport });
    try {
      await context.addInitScript(() => localStorage.setItem('synopsis_26063_settings', JSON.stringify({ weather: 'rain', soundEnabled: false })));
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push({ scenario: 'R08', viewport, message: error.message }));
      const ground = page.waitForResponse(response => response.ok() && new URL(response.url()).pathname === '/hub/r08-preview/archive-local-ground.png');
      await page.goto(base + '/?stationArt=r08');
      await waitForCampus(page);
      await ground;
      await page.locator('[data-rendered-weather="rain"][data-rain-animated="true"]').waitFor();
      await checkR08Residents(page, viewport, report);
      const render = await measureR08(page, viewport, report);
      // Catch sustained stalls even in software CI without equating the ceiling to a device FPS target.
      if (render.p95Ms > 100) slowProfiles.push({ viewport, p95Ms: render.p95Ms, renderer: render.rendererDescription ?? render.renderer });
      await capture(page, `r08-rain-${viewport.width}`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-rendered-weather="rain"][data-rain-animated="false"]').waitFor();
      if (viewport.width === 1366) await checkR08ContextRecovery(page, render, report);
      const buttons = page.locator('[data-building-id]');
      assert.equal(await buttons.count(), 6);
      const scrollbar = page.getByRole('scrollbar', { name: /Панорама станции/ });
      if (viewport.width === 390) {
        await scrollbar.waitFor();
        await scrollbar.press('Home');
        await page.waitForFunction(() => document.querySelector('.world-canvas-r08-scroll [role="scrollbar"]').getAttribute('aria-valuenow') === '0');
        await scrollbar.press('End');
        await page.waitForFunction(() => {
          const track = document.querySelector('.world-canvas-r08-scroll [role="scrollbar"]');
          return track.getAttribute('aria-valuenow') === track.getAttribute('aria-valuemax');
        });
        const rail = await scrollbar.boundingBox();
        assert.ok(rail);
        await scrollbar.hover();
        await page.mouse.wheel(0, -1200);
        await page.waitForFunction(() => document.querySelector('.world-canvas-r08-scroll [role="scrollbar"]').getAttribute('aria-valuenow') === '0');
        await page.mouse.move(180, 320);
        await page.mouse.wheel(1200, 0);
        await page.waitForFunction(() => document.querySelector('.world-canvas-r08-scroll [role="region"]').scrollLeft > 0);
        const thumb = await scrollbar.locator('.pixel-scroll-area__thumb').boundingBox();
        assert.ok(thumb);
        const x = thumb.x + thumb.width / 2;
        const y = rail.y + rail.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(rail.x + 2, y, { steps: 5 });
        await page.mouse.up();
        await page.waitForFunction(() => document.querySelector('.world-canvas-r08-scroll [role="scrollbar"]').getAttribute('aria-valuenow') === '0');
      } else assert.equal(await scrollbar.count(), 0);
      for (const button of await buttons.all()) {
        await button.focus();
        await button.scrollIntoViewIfNeeded();
        const id = await button.getAttribute('data-building-id');
        assert.ok(await button.evaluate(node => {
          const bounds = node.getBoundingClientRect();
          return bounds.width === 44 && bounds.height === 44 && [[22, 22], [2, 2], [42, 42]].every(([x, y]) =>
            document.elementFromPoint(bounds.left + x, bounds.top + y) === node,
          );
        }), `R08: entrance ${id} receives input across its full target at ${viewport.width}px`);
        await button.click({ position: { x: 2, y: 2 } });
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await button.press('Space');
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
      }
      await page.locator('[data-building-id="archive"]').press('Enter');
      await page.getByRole('button', { name: 'Посетить читальный зал' }).click();
      await page.waitForURL('**/archive');
      await page.goBack();
      await waitForCampus(page);
      assert.equal(await page.locator('canvas').count(), 1);
      assert.equal(await buttons.count(), 6);
      report.cases.push({ name: `r08-station-${viewport.width}`, viewport, entrances: 6, archiveRoundTrip: true, reducedMotion: true });
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(slowProfiles, [], 'R08 browser RAF p95 exceeded the 100 ms CI stall ceiling');
}

module.exports = { checkR08Station };
