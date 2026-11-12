/** Independent interaction coverage for the public reading/help/settings screens.
 * Run by test_station_screens.cjs against built assets and its real isolated server.
 * This file never substitutes API responses, storage failures, controls or artwork.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const SETTINGS_KEY = 'synopsis_26063_settings';
const FAVORITES_KEY = 'synopsis_26063_library_favorites_v1';
const library = JSON.parse(fs.readFileSync('content/library/synoptic_library.json', 'utf8'));
const codebook = JSON.parse(fs.readFileSync('content/codebook/kn01_level1.json', 'utf8'));

async function nextPaint(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function expectSettings(page, key, expected) {
  await page.waitForFunction(({ storageKey, key, expected }) => JSON.parse(localStorage.getItem(storageKey) || '{}')[key] === expected,
    { storageKey: SETTINGS_KEY, key, expected });
}

async function checkHitTarget(control, label) {
  await control.scrollIntoViewIfNeeded();
  const result = await control.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const center = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const style = getComputedStyle(node);
    return { width: rect.width, height: rect.height, hit: center === node || node.contains(center), radius: style.borderRadius,
      name: node.getAttribute('aria-label') || node.textContent.trim() };
  });
  assert.ok(result.width >= 44 && result.height >= 44, `${label}: target >=44px: ${JSON.stringify(result)}`);
  assert.ok(result.hit, `${label}: its visible center accepts input`);
  return result;
}

/** Exercise the public scrollbar semantics and actual pointer input, not internal state setters. */
async function exerciseScrollbar(page, area, report, label, axis = 'vertical') {
  const vertical = axis === 'vertical';
  const viewport = area.locator(':scope > .pixel-scroll-area__viewport');
  assert.equal(await viewport.count(), 1, `${label}: one scrolling viewport`);
  const measure = () => viewport.evaluate((node, vertical) => ({ offset: vertical ? node.scrollTop : node.scrollLeft,
    size: vertical ? node.clientHeight : node.clientWidth, total: vertical ? node.scrollHeight : node.scrollWidth }), vertical);
  await nextPaint(page);
  const initial = await measure();
  const track = area.locator(`:scope > [role="scrollbar"][aria-orientation="${axis}"]`);
  if (initial.total <= initial.size + 2) {
    assert.equal(await track.isVisible(), false, `${label}: no decorative scrollbar for a fitting document`);
    report.cases.push({ name: label, fits: true, ...initial });
    return;
  }
  await track.waitFor({ state: 'visible' });
  assert.ok(await track.getAttribute('aria-controls'), `${label}: scrollbar identifies its viewport`);
  const thumb = track.locator('.pixel-scroll-area__thumb');
  assert.equal(await thumb.evaluate(node => getComputedStyle(node).borderRadius), '0px', `${label}: square thumb`);
  const controlId = await track.getAttribute('aria-controls');
  const atTop = () => page.waitForFunction(({ id, vertical, axis }) => {
    const node = document.getElementById(id);
    const control = [...document.querySelectorAll('[role="scrollbar"]')].find(element => element.getAttribute('aria-controls') === id && element.getAttribute('aria-orientation') === axis);
    return (vertical ? node.scrollTop : node.scrollLeft) <= 1 && control && Number(control.getAttribute('aria-valuenow')) <= 1;
  }, { id: controlId, vertical, axis });
  const moved = () => page.waitForFunction(({ id, vertical }) => {
    const node = document.getElementById(id); return (vertical ? node.scrollTop : node.scrollLeft) > 1;
  }, { id: controlId, vertical });
  await track.focus(); await track.press('Home'); await atTop();
  await viewport.scrollIntoViewIfNeeded();
  // Use this viewport's content, not a nested catalogue that intentionally contains wheel input.
  const wheelPoint = await viewport.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    for (const [x, y] of [[.02, .5], [.98, .5], [.5, .1], [.5, .5], [.5, .9]]) {
      const point = { x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y };
      const hit = document.elementFromPoint(point.x, point.y);
      if (hit && (hit === node || hit.closest('.pixel-scroll-area__viewport') === node)) return point;
    }
    return null;
  });
  assert.ok(wheelPoint, `${label}: viewport exposes an unobstructed wheel target`);
  await page.mouse.move(wheelPoint.x, wheelPoint.y); await page.mouse.wheel(vertical ? 0 : 320, vertical ? 320 : 0); await moved();
  await track.focus(); await track.press('Home'); await atTop();
  await track.hover(); await page.mouse.wheel(vertical ? 0 : 320, vertical ? 320 : 0); await moved();
  await track.focus(); await track.press('Home'); await atTop();
  await track.scrollIntoViewIfNeeded();
  const start = await thumb.boundingBox(), rail = await track.boundingBox();
  assert.ok(start && rail && (vertical ? start.height >= 24 && start.height < rail.height : start.width >= 24 && start.width < rail.width), `${label}: thumb has a visible draggable range`);
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(vertical ? start.x + start.width / 2 : rail.x + rail.width - start.width / 2 - 2,
    vertical ? rail.y + rail.height - start.height / 2 - 2 : start.y + start.height / 2, { steps: 8 });
  await page.mouse.up(); await moved();
  await track.focus(); await track.press('Home'); await atTop();
  await track.press('PageDown'); await moved();
  await track.press('End');
  await page.waitForFunction(({ id, vertical }) => {
    const node = document.getElementById(id); return vertical ? node.scrollHeight - node.clientHeight - node.scrollTop <= 2 : node.scrollWidth - node.clientWidth - node.scrollLeft <= 2;
  }, { id: controlId, vertical });
  const bottom = await measure();
  await page.waitForFunction(({ id, axis }) => {
    const node = document.getElementById(id);
    const control = [...document.querySelectorAll('[role="scrollbar"]')].find(element => element.getAttribute('aria-controls') === id && element.getAttribute('aria-orientation') === axis);
    const actual = axis === 'vertical' ? node.scrollTop : node.scrollLeft;
    return control && Math.abs(Number(control.getAttribute('aria-valuenow')) - actual) <= 2;
  }, { id: controlId, axis });
  assert.ok(Number(await track.getAttribute('aria-valuenow')) > 0, `${label}: accessible value follows scrolling`);
  await track.press(vertical ? 'ArrowUp' : 'ArrowLeft');
  await page.waitForFunction(({ id, vertical, offset }) => {
    const node = document.getElementById(id); return (vertical ? node.scrollTop : node.scrollLeft) < offset;
  }, { id: controlId, vertical, offset: bottom.offset });
  await track.press('Home'); await atTop();
  report.cases.push({ name: label, axis, wheel: true, trackWheel: true, thumbDrag: true, home: true, end: true, pageDown: true, arrowBack: true, ...initial });
}

async function checkPageScroll({ page, viewport, report, capture }, name) {
  const outer = page.locator('.app-page-scroll');
  assert.equal(await outer.count(), 1, `${name}: one page scroll area`);
  const bounds = await outer.locator(':scope > .pixel-scroll-area__viewport').evaluate(node => ({
    width: node.clientWidth, scrollWidth: node.scrollWidth, height: node.clientHeight, scrollHeight: node.scrollHeight,
  }));
  assert.ok(bounds.scrollWidth <= bounds.width + 2, `${name}: no concealed horizontal overflow inside page: ${JSON.stringify(bounds)}`);
  await exerciseScrollbar(page, outer, report, `${name}-outer-scroll-${viewport.width}`);
  await capture(page, `${name}-top-${viewport.width}`);
  const track = outer.locator(':scope > [role="scrollbar"][aria-orientation="vertical"]');
  if (await track.isVisible()) {
    await track.focus(); await track.press('End'); await nextPaint(page);
    await capture(page, `${name}-bottom-${viewport.width}`);
    await track.press('Home');
  }
}

async function checkCodebook({ page, viewport, report, capture, opener }) {
  const dialog = page.getByRole('dialog', { name: 'Наставление КН-01', exact: true });
  await dialog.waitFor();
  const close = dialog.getByRole('button', { name: 'Закрыть справочник', exact: true });
  const closeBox = await close.boundingBox();
  await checkHitTarget(close, 'Codebook close');
  const names = [];
  for (const entry of codebook.pages) {
    const button = dialog.locator('.codebook-page-links button').filter({ hasText: entry.title });
    await checkHitTarget(button, `Codebook group ${entry.groupId}`);
    await button.click();
    await page.waitForFunction(title => document.querySelector('.codebook-page h3')?.textContent === title, entry.title);
    assert.equal(await button.getAttribute('aria-current'), 'page');
    assert.ok(await dialog.locator('.codebook-page h3').evaluate(node => node === document.activeElement), 'Explicit group selection announces the new article');
    await page.keyboard.press('Tab');
    assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)), 'Tab from article heading remains in the codebook');
    assert.equal(await close.evaluate(node => node === document.activeElement), false, 'Tab from article follows document order, without returning to close');
    await page.keyboard.press('Shift+Tab');
    assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)), 'Shift+Tab from article control remains in the codebook');
    names.push(entry.groupId);
  }
  await dialog.getByLabel('Найти группу', { exact: true }).fill('группа-которой-нет');
  await dialog.getByRole('heading', { name: 'Попробуйте другой запрос' }).waitFor();
  await dialog.getByRole('button', { name: 'Все группы', exact: true }).click();
  assert.equal(await dialog.locator('.codebook-page-links button').count(), codebook.pages.length, 'Codebook reset restores every group');
  await dialog.locator('.codebook-page-links button').first().click();
  await exerciseScrollbar(page, dialog.locator('.codebook-scroll'), report, `all-codebook-scroll-${viewport.width}`);
  await exerciseScrollbar(page, dialog.locator('.codebook-nav .pixel-scroll-area'), report, `all-codebook-groups-scroll-${viewport.width}`, 'horizontal');
  assert.deepEqual(await close.boundingBox(), closeBox, 'Codebook scrolling keeps close/header fixed');
  await capture(page, `all-codebook-${viewport.width}`);
  const scroll = dialog.locator('[role="scrollbar"][aria-orientation="vertical"]');
  if (await scroll.isVisible()) { await scroll.focus(); await scroll.press('End'); await capture(page, `all-codebook-bottom-${viewport.width}`); }
  await close.focus(); await close.press('Shift+Tab');
  assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)), 'Codebook backward Tab stays inside');
  await page.keyboard.press('Tab');
  assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)), 'Codebook forward Tab stays inside');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.ok(await opener.evaluate(node => node === document.activeElement), 'Codebook restores library opener');
  await opener.click(); await dialog.waitFor();
  await close.click(); await dialog.waitFor({ state: 'hidden' });
  await opener.click(); await dialog.waitFor();
  await page.mouse.click(2, viewport.height / 2); await dialog.waitFor({ state: 'hidden' });
  report.cases.push({ name: `all-codebook-controls-${viewport.width}`, groups: names, searchReset: true, close: true, escape: true, backdrop: true, focusReturn: true });
}

async function checkLibrary({ page, base, viewport, report, capture }) {
  await page.goto(base + '/library');
  await page.getByRole('heading', { name: 'Библиотека синоптика', exact: true }).waitFor();
  const categoryBar = page.getByRole('navigation', { name: 'Разделы библиотеки' });
  const categories = [];
  for (const category of library.categories) {
    const button = categoryBar.getByRole('button', { name: category.title, exact: true });
    await checkHitTarget(button, `Library category ${category.title}`); await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.library-result').count(), library.articles.filter(article => article.category === category.id).length);
    categories.push(category.id);
  }
  await categoryBar.getByRole('button', { name: 'Все темы', exact: true }).click();
  const first = library.articles[0];
  if (viewport.width === 1366) {
    for (const entry of library.articles) {
      await page.locator('.library-result').filter({ has: page.getByText(entry.title, { exact: true }) }).click();
      await page.waitForFunction(title => document.querySelector('#library-article-heading')?.textContent === title, entry.title);
    }
  }
  await page.getByLabel('Что хотите найти?', { exact: true }).fill(first.title);
  await page.locator('.library-result').filter({ has: page.getByText(first.title, { exact: true }) }).click();
  await page.getByRole('heading', { name: first.title, exact: true }).waitFor();
  if (viewport.width > 760) {
    const columns = await page.locator('.library-body').evaluate(node => {
      const frame = node.getBoundingClientRect(), article = node.querySelector('.library-reader').getBoundingClientRect();
      return { width: frame.width, articleWidth: article.width,
        unusedRight: frame.right - parseFloat(getComputedStyle(node).borderRightWidth) - article.right };
    });
    assert.ok(Math.abs(columns.unusedRight) <= 2, `Library article fills the available grid width: ${JSON.stringify(columns)}`);
    report.cases.push({ name: `all-library-column-fill-${viewport.width}`, ...columns });
  }
  const favorite = page.locator('.library-favorite');
  await checkHitTarget(favorite, 'Library bookmark'); await favorite.click();
  assert.equal(await favorite.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), FAVORITES_KEY), [first.id]);
  await capture(page, `all-library-reader-${viewport.width}`);
  const related = page.locator('.library-related button').first();
  const relatedTitle = (await related.innerText()).replace(/\s*→\s*$/, '').trim();
  await related.click();
  await page.getByRole('heading', { name: relatedTitle, exact: true }).waitFor();
  if (viewport.width <= 760) {
    await page.getByRole('button', { name: '← К каталогу', exact: true }).click();
    assert.ok(await page.getByLabel('Что хотите найти?', { exact: true }).evaluate(node => node === document.activeElement));
  }
  await page.reload(); await page.getByRole('heading', { name: 'Библиотека синоптика' }).waitFor();
  await page.getByRole('button', { name: /Избранное/ }).click();
  assert.equal(await page.locator('.library-result').count(), 1, 'Library bookmark survives reload');
  await page.locator('.library-result').click(); await page.locator('.library-favorite').click();
  await page.getByRole('heading', { name: 'Здесь будут ваши закладки' }).waitFor();
  await page.getByRole('button', { name: 'Показать все темы', exact: true }).click();
  await page.getByLabel('Что хотите найти?', { exact: true }).fill('несуществующее-понятие');
  await page.getByRole('heading', { name: 'Ничего не найдено' }).waitFor();
  await page.getByRole('button', { name: 'Показать все темы', exact: true }).click();
  assert.equal(await page.locator('.library-result').count(), library.articles.length);
  const catalogue = page.locator('.library-catalog .pixel-scroll-area');
  if (await catalogue.count()) await exerciseScrollbar(page, catalogue, report, `all-library-scroll-${viewport.width}`);
  await capture(page, `all-library-catalog-${viewport.width}`);
  await checkPageScroll({ page, viewport, report, capture }, 'all-library');
  const opener = page.getByRole('button', { name: 'Открыть таблицы КН-01 →', exact: true });
  await opener.click();
  await checkCodebook({ page, viewport, report, capture, opener });
  report.cases.push({ name: `all-library-controls-${viewport.width}`, categories, articlesOpened: viewport.width === 1366 ? library.articles.length : 2, bookmarksAddedRemoved: true, emptyAndReset: true, reload: true });
}

async function checkSettings({ page, base, viewport, report, capture, waitForCampus }) {
  await page.goto(base + '/settings');
  await page.getByRole('heading', { name: 'Настройки', exact: true }).waitFor();
  const checkboxes = [
    ['Звуковое сопровождение', 'soundEnabled', false], ['Спокойная музыка', 'musicEnabled', false],
    ['Уменьшить движение', 'reducedMotion', false], ['Экономия ресурсов', 'lowPower', false],
    ['Повышенный контраст', 'highContrast', false], ['Плотный шрифт для чтения', 'pixelFont', true],
  ];
  const toggled = [];
  for (const [name, key, inverted] of checkboxes) {
    const control = page.getByRole('checkbox', { name: new RegExp(name) });
    assert.equal(await control.isDisabled(), false, `${name}: browser permits changing preference`);
    const before = await control.isChecked();
    await control.focus(); await control.press('Space');
    assert.equal(await control.isChecked(), !before, `${name}: keyboard changes value`);
    await expectSettings(page, key, inverted ? before : !before);
    if (['reducedMotion', 'lowPower', 'highContrast', 'pixelFont'].includes(key)) {
      await page.waitForFunction(({ key, expected }) => document.documentElement.dataset[key] === String(expected), { key, expected: inverted ? before : !before });
    }
    await control.click(); assert.equal(await control.isChecked(), before, `${name}: pointer changes value`);
    await expectSettings(page, key, inverted ? !before : before);
    toggled.push(key);
  }
  const levels = { masterVolume: 33, musicVolume: 34, ambientVolume: 35, sfxVolume: 36 };
  for (const [key, value] of Object.entries(levels)) {
    const slider = page.locator('#settings-' + key);
    await slider.focus(); await slider.press('Home');
    assert.equal(await slider.inputValue(), '0', `${key}: Home`);
    await slider.press('End'); assert.equal(await slider.inputValue(), '100', `${key}: End`);
    await slider.press('Home');
    for (let i = 0; i < value; i++) await slider.press('ArrowRight');
    assert.equal(await slider.inputValue(), String(value), `${key}: arrows`);
    await expectSettings(page, key, value);
  }
  for (const [name, value] of [['Без дождя', 'clear'], ['Дождь', 'rain'], ['Иногда дождь', 'auto']]) {
    const radio = page.getByRole('radio', { name, exact: true });
    await radio.check(); assert.ok(await radio.isChecked()); await expectSettings(page, 'weather', value);
  }
  await page.getByRole('radio', { name: 'Дождь', exact: true }).check();
  const sound = page.getByRole('checkbox', { name: /Звуковое сопровождение/ });
  await sound.check();
  const signal = page.getByRole('button', { name: 'Послушать сигнал', exact: true });
  assert.equal(await signal.isDisabled(), false); await checkHitTarget(signal, 'Sound preview'); await signal.click();
  await sound.uncheck(); assert.equal(await signal.isDisabled(), true, 'Muted signal unavailable');
  await capture(page, `all-settings-controls-${viewport.width}`);
  await checkPageScroll({ page, viewport, report, capture }, 'all-settings');
  if (viewport.width === 1366) {
    const contrast = page.getByRole('checkbox', { name: /Повышенный контраст/ });
    await contrast.check(); await capture(page, `all-settings-high-contrast-${viewport.width}`); await contrast.uncheck();
  }
  await page.reload(); await page.getByRole('heading', { name: 'Настройки', exact: true }).waitFor();
  for (const [key, value] of Object.entries(levels)) assert.equal(await page.locator('#settings-' + key).inputValue(), String(value), `${key}: reload persists value`);
  assert.ok(await page.getByRole('radio', { name: 'Дождь', exact: true }).isChecked());
  await page.getByRole('button', { name: 'По умолчанию', exact: true }).click();
  assert.deepEqual(await page.locator('input[type="range"]').evaluateAll(nodes => nodes.map(node => Number(node.value))), [70, 35, 50, 65]);
  assert.ok(await page.getByRole('radio', { name: 'Иногда дождь', exact: true }).isChecked());
  assert.equal(await sound.isChecked(), false);
  assert.equal(await page.getByRole('checkbox', { name: /Повышенный контраст/ }).isChecked(), false);
  await page.getByRole('checkbox', { name: /Экономия ресурсов/ }).check();
  await page.getByRole('button', { name: 'Готово', exact: true }).click(); await waitForCampus(page);
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.getByRole('button', { name: /Назад/ }).first().click(); await waitForCampus(page);
  report.cases.push({ name: `all-settings-controls-${viewport.width}`, checkboxKeyboardAndPointer: toggled, volumeKeyboardAndReload: levels, weatherRadios: 3, reset: true, disabledSignal: true, signalClicked: true, bothReturns: true });
}

async function checkHelpAndServiceRoutes({ page, base, viewport, report, capture, waitForCampus }) {
  await page.goto(base + '/help'); await page.getByRole('heading', { name: 'Помощь и управление' }).waitFor();
  const summaries = page.locator('.station-help-faq summary');
  const count = await summaries.count(); assert.ok(count >= 8);
  for (let i = 0; i < count; i++) {
    const summary = summaries.nth(i); await checkHitTarget(summary, `Help FAQ ${i + 1}`);
    await summary.click(); assert.ok(await summary.evaluate(node => node.parentElement.open));
    await summary.focus(); await summary.press('Space'); assert.equal(await summary.evaluate(node => node.parentElement.open), false);
  }
  await summaries.last().click(); await capture(page, `all-help-expanded-${viewport.width}`);
  await checkPageScroll({ page, viewport, report, capture }, 'all-help');
  await page.getByRole('button', { name: /К первой смене/ }).click();
  await page.getByRole('dialog', { name: 'Вход в учебную группу' }).waitFor();
  await page.keyboard.press('Escape'); await page.getByRole('heading', { name: 'Помощь и управление' }).waitFor();
  await page.getByRole('button', { name: /Библиотека понятий/ }).click();
  await page.getByRole('heading', { name: 'Библиотека синоптика' }).waitFor();
  await page.getByRole('button', { name: /Назад/ }).first().click();
  await page.getByRole('button', { name: /Настроить атмосферу/ }).click();
  await page.getByRole('heading', { name: 'Настройки', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await page.getByRole('heading', { name: 'Помощь и управление' }).waitFor();
  await page.getByRole('button', { name: /^На станцию/ }).click(); await waitForCampus(page);
  await page.locator('.hub-dock__guide').click();
  await page.getByRole('button', { name: /Назад/ }).first().click(); await waitForCampus(page);
  await page.goto(base + '/arena-tv');
  await page.getByRole('heading', { name: 'Большой экран', exact: true }).waitFor();
  await capture(page, `all-arena-state-${viewport.width}`);
  await page.getByRole('button', { name: /На станцию/ }).click(); await waitForCampus(page);
  await page.goto(base + '/missing-ui-review-page');
  await page.getByRole('heading', { name: 'Такой страницы пока нет' }).waitFor();
  await capture(page, `all-not-found-${viewport.width}`);
  await page.getByRole('button', { name: 'На станцию', exact: true }).click(); await waitForCampus(page);
  await page.goto(base + '/codebook');
  await page.getByRole('dialog', { name: 'Наставление КН-01', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Закрыть справочник', exact: true }).click(); await waitForCampus(page);
  report.cases.push({ name: `all-help-service-controls-${viewport.width}`, faqPointerAndKeyboard: count, helpActions: 5, arenaReturn: true, unknownRouteReturn: true, standaloneCodebookReturn: true });
}

async function runAdditionalScreenChecks({ base, browser, report, capture, waitForCampus }) {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    await context.addInitScript(() => {
      if (!localStorage.getItem('synopsis_26063_settings')) localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true }));
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ scenario: 'all-public-screens', viewport: viewport.width, message: error.message }));
    const args = { page, base, viewport, report, capture, waitForCampus };
    try {
      await checkLibrary(args);
      await checkSettings(args);
      await checkHelpAndServiceRoutes(args);
    } catch (error) {
      await capture(page, `all-public-failure-${viewport.width}`).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  // A narrower phone catches text that can fit at 390px but overflows the page's inner viewport.
  const viewport = { width: 320, height: 720 };
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true })));
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ scenario: 'narrow-overview', viewport: 320, message: error.message }));
  try {
    await page.goto(base); await waitForCampus(page); await capture(page, 'all-home-320');
    for (const [path, heading] of [['help', 'Помощь и управление'], ['settings', 'Настройки'], ['library', 'Библиотека синоптика']]) {
      await page.goto(base + '/' + path);
      await page.getByRole('heading', { name: heading, exact: true }).waitFor();
      await page.locator('.app-page-scroll').waitFor();
      await checkPageScroll({ page, viewport, report, capture }, 'all-narrow-' + path);
    }
    report.cases.push({ name: 'all-narrow-overview-320', screens: ['station', 'help', 'settings', 'library'], innerHorizontalOverflow: false });
  } finally { await context.close(); }

  if (report.engine === 'chromium') {
    const colors = await browser.newContext({ viewport: { width: 390, height: 844 }, forcedColors: 'active', reducedMotion: 'reduce' });
    const native = await colors.newPage();
    native.on('pageerror', error => report.errors.push({ scenario: 'forced-colors', message: error.message }));
    try {
      await native.goto(base + '/help'); await native.getByRole('heading', { name: 'Помощь и управление' }).waitFor();
      assert.ok(await native.evaluate(() => matchMedia('(forced-colors: active)').matches));
      const viewportNode = native.locator('.app-page-scroll > .pixel-scroll-area__viewport');
      const bounds = await viewportNode.evaluate(node => ({ height: node.clientHeight, total: node.scrollHeight, width: node.clientWidth, totalWidth: node.scrollWidth, nativeWidth: getComputedStyle(node).scrollbarWidth }));
      assert.ok(bounds.height > 0 && bounds.total > bounds.height, 'Forced colors preserve the bounded native scrolling viewport');
      assert.ok(bounds.totalWidth <= bounds.width + 2, 'Forced colors do not conceal horizontal overflow');
      assert.notEqual(bounds.nativeWidth, 'none', 'Native scrollbar is enabled in forced colors');
      assert.equal(await native.locator('.app-page-scroll > .pixel-scroll-area__track').isVisible(), false, 'Custom scrollbar yields to the system high-contrast scrollbar');
      await viewportNode.focus(); await viewportNode.press('End');
      await native.waitForFunction(() => {
        const node = document.querySelector('.app-page-viewport'); return node.scrollTop > 0 && node.scrollHeight - node.clientHeight - node.scrollTop <= 2;
      });
      const last = native.locator('.station-help-faq summary').last();
      await checkHitTarget(last, 'Last FAQ in forced colors'); await last.click();
      assert.ok(await last.evaluate(node => node.parentElement.open));
      await viewportNode.focus(); await viewportNode.press('End'); await nextPaint(native);
      await capture(native, 'all-forced-colors-help-bottom-390');
      report.cases.push({ name: 'all-forced-colors-native-scroll-390', media: 'active', customTrackHidden: true, nativeEndKey: true, lastFaqReachable: true, ...bounds });
    } finally { await colors.close(); }
  }

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  await touch.addInitScript(() => {
    if (!localStorage.getItem('synopsis_26063_settings')) localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true }));
  });
  const tapped = await touch.newPage();
  tapped.on('pageerror', error => report.errors.push({ scenario: 'touch-controls', message: error.message }));
  try {
    await tapped.goto(base); await waitForCampus(tapped);
    await tapped.locator('.hub-profile-button').tap(); await tapped.getByRole('dialog', { name: 'Наблюдатель' }).waitFor();
    await tapped.getByRole('button', { name: 'Закрыть окно', exact: true }).tap();
    await tapped.locator('.hub-dock__route').tap(); await tapped.getByRole('dialog', { name: 'На станции', exact: true }).waitFor();
    await tapped.getByRole('button', { name: 'Закрыть окно', exact: true }).tap();
    await tapped.locator('.hub-dock__archive').tap(); await tapped.getByRole('heading', { name: 'Библиотека синоптика' }).waitFor();
    await tapped.getByRole('button', { name: 'Открыть таблицы КН-01 →', exact: true }).tap();
    const dialog = tapped.getByRole('dialog', { name: 'Наставление КН-01', exact: true }); await dialog.waitFor();
    const track = dialog.locator('.codebook-scroll > [role="scrollbar"][aria-orientation="vertical"]');
    await track.waitFor({ state: 'visible' });
    const bounds = await track.boundingBox();
    await tapped.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height - 3);
    await tapped.waitForFunction(() => document.querySelector('.codebook-scroll > .pixel-scroll-area__viewport').scrollTop > 0);
    await capture(tapped, 'all-touch-codebook-scrolled-390');
    await dialog.getByRole('button', { name: 'Закрыть справочник', exact: true }).tap();
    await tapped.getByRole('button', { name: /Назад/ }).first().tap(); await waitForCampus(tapped);
    await tapped.getByRole('button', { name: 'Настройки', exact: true }).tap();
    await tapped.getByRole('heading', { name: 'Настройки', exact: true }).waitFor();
    await tapped.getByRole('button', { name: 'Готово', exact: true }).tap(); await waitForCampus(tapped);
    await tapped.locator('.hub-dock__guide').tap(); await tapped.getByRole('heading', { name: 'Помощь и управление' }).waitFor();
    await tapped.getByRole('button', { name: /Назад/ }).first().tap(); await waitForCampus(tapped);
    report.cases.push({ name: 'all-touch-station-controls-390', hasTouch: true, profile: true, route: true, library: true, settings: true, help: true, codebookTrackTapScroll: true, nativeSwipeClaimed: false });
  } finally { await touch.close(); }
}

module.exports = { runAdditionalScreenChecks, exerciseScrollbar, checkHitTarget };
