/** Actual pointer/keyboard checks for the station UI. Uses the production app. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

async function controlGeometry(page, selector) {
  return page.locator(selector).evaluateAll(nodes => nodes.flatMap(node => {
    const b = node.getBoundingClientRect(), s = getComputedStyle(node);
    if (!b.width || !b.height || s.visibility === 'hidden' || b.bottom <= 0 || b.top >= innerHeight) return [];
    const points = [[.5, .5], [.15, .2], [.85, .2], [.15, .8], [.85, .8]];
    return [{ name: node.getAttribute('aria-label') || node.textContent.trim(), width: b.width, height: b.height,
      clipped: b.left < 0 || b.right > innerWidth || b.top < 0 || b.bottom > innerHeight,
      hit: points.every(([x, y]) => { const target = document.elementFromPoint(b.left + b.width * x, b.top + b.height * y); return target === node || node.contains(target); }),
      borderImage: s.borderImageSource, disabled: node.disabled }];
  }));
}

async function checkDialog(page, viewport, report, capture, name) {
  const dialog = page.locator('.hub-dialog[open]');
  await dialog.waitFor();
  const geometry = await controlGeometry(page, '.hub-dialog[open] .hub-dialog__close');
  assert.equal(geometry.length, 1);
  assert.ok(geometry[0].hit && !geometry[0].clipped, `${name}: close remains reachable`);
  assert.ok(geometry[0].width >= 44 && geometry[0].height >= 44, `${name}: close target >= 44px`);
  const body = dialog.locator('.hub-dialog__body');
  const scroll = await body.evaluate(node => {
    const s = getComputedStyle(node), b = node.getBoundingClientRect();
    const thumb = getComputedStyle(node, '::-webkit-scrollbar-thumb');
    return { height: node.clientHeight, total: node.scrollHeight, top: node.scrollTop, color: s.scrollbarColor,
      customThumb: { color: thumb.backgroundColor, radius: thumb.borderRadius },
      gutter: node.offsetWidth - node.clientWidth - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth),
      box: { x: b.x, y: b.y, width: b.width, height: b.height } };
  });
  assert.ok(scroll.color !== 'auto' || (scroll.customThumb.color !== 'rgba(0, 0, 0, 0)' && scroll.customThumb.color !== 'transparent'), `${name}: scrollbar uses the interface palette`);
  await capture(page, `${name}-${viewport.width}`);
  if (scroll.total > scroll.height + 2) {
    const closeBefore = await dialog.locator('.hub-dialog__close').boundingBox();
    await body.hover(); await page.mouse.wheel(0, 700);
    await page.waitForFunction(() => document.querySelector('.hub-dialog[open] .hub-dialog__body').scrollTop > 0);
    assert.deepEqual(await dialog.locator('.hub-dialog__close').boundingBox(), closeBefore, 'Scroll keeps the header/close in place');
    await capture(page, `${name}-scrolled-${viewport.width}`);
    await body.hover(); await page.mouse.wheel(0, -10000);
    await page.waitForFunction(() => document.querySelector('.hub-dialog[open] .hub-dialog__body').scrollTop === 0);
    if (scroll.gutter > 0) {
      const x = scroll.box.x + scroll.box.width - scroll.gutter / 2;
      const y = scroll.box.y + Math.min(16, scroll.box.height / 4);
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x, scroll.box.y + scroll.box.height * .75, { steps: 12 });
      await page.mouse.up();
      assert.ok(await body.evaluate(node => node.scrollTop > 0), 'Dragging the native thumb scrolls the dialog');
    }
  }
  await dialog.locator('.hub-dialog__close').focus();
  await page.keyboard.press('Shift+Tab');
  assert.ok(await page.evaluate(() => document.querySelector('.hub-dialog[open]').contains(document.activeElement)), 'Modal keeps keyboard focus');
  report.cases.push({ name: `${name}-controls-${viewport.width}`, geometry, scroll, wheelAndThumb: scroll.total > scroll.height + 2 });
}

async function checkStationUI({ page, base, viewport, report, capture, waitForCampus }) {
  const controls = await controlGeometry(page, '.hub-topbar button, .hub-dock button');
  assert.ok(controls.length >= 7, 'Inspect all visible main controls');
  for (const c of controls) {
    assert.ok(c.width >= 44 && c.height >= 44, `${c.name}: target ${c.width}×${c.height}`);
    assert.equal(c.clipped, false, `${c.name}: control inside viewport`);
    assert.equal(c.hit, true, `${c.name}: five pointer samples reach the control`);
    assert.equal(c.borderImage, 'none', `${c.name}: no stretched raster frame`);
  }
  const visibleText = await page.locator('body').innerText();
  assert.doesNotMatch(visibleText, /кампус|эмуляци|симуляци|художественный закат|не фактическ/iu);
  const profile = page.locator('.hub-profile-button');
  const before = await profile.boundingBox();
  await profile.hover();
  await capture(page, `ui-topbar-hover-${viewport.width}`);
  const box = await profile.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await capture(page, `ui-topbar-pressed-${viewport.width}`);
  assert.deepEqual(await profile.boundingBox(), before, 'Press feedback does not move the hit area');
  await page.mouse.up();
  await checkDialog(page, viewport, report, capture, 'ui-profile');
  await page.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
  assert.ok(await profile.evaluate(node => node === document.activeElement), 'Close returns focus to profile');

  const route = page.locator('.hub-dock__route');
  await route.hover(); await capture(page, `ui-dock-hover-${viewport.width}`);
  await route.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  assert.ok(await route.evaluate(node => node === document.activeElement && node.matches(':focus-visible')), 'Keyboard focus is visible on the real control');
  await capture(page, `ui-keyboard-focus-${viewport.width}`);
  await page.keyboard.press('Enter');
  await checkDialog(page, viewport, report, capture, 'ui-route');
  await page.keyboard.press('Escape');
  assert.ok(await route.evaluate(node => node === document.activeElement), 'Escape restores route opener');
  await route.click();
  await page.mouse.click(2, viewport.height / 2);
  await page.locator('.hub-dialog[open]').waitFor({ state: 'hidden' });
  assert.ok(await route.evaluate(node => node === document.activeElement), 'Backdrop restores route opener');

  await page.getByRole('button', { name: 'Журнал занятий', exact: true }).click();
  await checkDialog(page, viewport, report, capture, 'ui-journal-guest');
  assert.equal(await page.locator('.synoptic-duty-ticker').count(), 0, 'Journal does not show an invented dispatch feed');
  await page.keyboard.press('Escape');
  const clock = page.locator('.hub-clock');
  if (await clock.isVisible()) { await clock.click(); await page.getByRole('dialog', { name: 'Журнал занятий' }).waitFor(); await page.keyboard.press('Escape'); }

  await page.locator('.hub-dock__profile').click();
  await page.getByRole('dialog', { name: 'Наблюдатель' }).waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.hub-dock__guide').click();
  await page.getByRole('heading', { name: 'Помощь и управление' }).waitFor();
  await page.goBack(); await waitForCampus(page);
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.getByRole('heading', { name: 'Настройки', exact: true }).waitFor();
  const preview = page.getByRole('button', { name: 'Послушать сигнал', exact: true });
  assert.equal(await preview.isDisabled(), true, 'Muted sound has a real disabled preview');
  await page.getByRole('button', { name: /Назад/ }).first().click(); await waitForCampus(page);
  await page.locator('.hub-dock__primary').click();
  await page.getByRole('dialog', { name: 'Вход в учебную группу' }).waitFor();
  await capture(page, `ui-start-login-${viewport.width}`);
  await page.keyboard.press('Escape');

  // Hit a building through the DOM interaction target used by mouse and keyboard.
  const building = page.locator('[data-building-id="codepost"]');
  if (await building.isVisible()) {
    await building.click();
    await page.getByRole('dialog', { name: 'Кодовый пост' }).waitFor();
    await capture(page, `ui-building-${viewport.width}`);
    await page.keyboard.press('Escape');
  }
  assert.equal(await page.locator('dialog[open]').count(), 0, 'No invisible modal remains after closing');
  assert.equal(await page.locator('canvas').count(), 1, 'One world after repeated actions');
  assert.equal(new URL(page.url()).pathname, '/', 'Navigation returns to the main station');
  report.cases.push({ name: `ui-real-input-${viewport.width}`, controls, pointerForced: false, keyboardActivation: true });
}

async function checkWorldLoading({ base, browser, report, capture, waitForCampus }) {
  const { assets } = JSON.parse(fs.readFileSync('packages/world-engine/src/assets/hub/r01-approval.json', 'utf8'));
  const texture = assets[0].url;
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true })));
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ scenario: 'world-load', message: error.message }));
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const delayed = async route => { await held; await route.continue(); };
  await page.route('**' + texture, delayed);
  await page.goto(base);
  await page.locator('.hub-screen[data-world-state="loading"]').waitFor();
  await page.getByRole('heading', { name: 'Открываем станцию…', exact: true }).waitFor();
  await page.locator('.hub-dock__route').click();
  await page.getByRole('dialog', { name: 'На станции', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await capture(page, 'ui-world-loading');
  release(); await waitForCampus(page); await page.unroute('**' + texture, delayed);

  const failed = route => route.abort('failed');
  await page.route('**' + texture, failed);
  await page.reload();
  await page.locator('.hub-screen[data-world-state="error"]').waitFor({ timeout: 30_000 });
  await page.getByRole('heading', { name: 'Не удалось открыть вид станции', exact: true }).waitFor();
  await capture(page, 'ui-world-load-failed');
  await page.locator('.hub-dock__archive').click();
  await page.getByRole('heading', { name: 'Библиотека синоптика' }).waitFor();
  await page.getByRole('button', { name: /Назад/ }).first().click();
  await page.locator('.hub-screen[data-world-state="error"]').waitFor({ timeout: 30_000 });
  await page.unroute('**' + texture, failed);
  await page.getByRole('button', { name: 'Перезагрузить страницу', exact: true }).click();
  await waitForCampus(page);
  await capture(page, 'ui-world-load-recovered');
  report.cases.push({ name: 'world-load-recovery', heldRealTexture: texture, failedRequest: 'abort', navigationWhileLoading: true, navigationAfterFailure: true, retryRealAsset: true });
  await context.close();

  const retina = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await retina.addInitScript(() => localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true })));
  const compact = await retina.newPage();
  compact.on('pageerror', error => report.errors.push({ scenario: 'retina', message: error.message }));
  await compact.goto(base); await waitForCampus(compact);
  await capture(compact, 'ui-home-390-dpr2');
  await compact.getByRole('button', { name: 'Журнал занятий', exact: true }).click();
  await capture(compact, 'ui-journal-390-dpr2');
  await retina.close();
}

module.exports = { checkStationUI, checkWorldLoading, controlGeometry };
