'use strict';
const assert = require('node:assert/strict');

async function checkR08Station({ base, browser, report, capture, waitForCampus }) {
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
      await capture(page, `r08-rain-${viewport.width}`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-rendered-weather="rain"][data-rain-animated="false"]').waitFor();
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
}

module.exports = { checkR08Station };
