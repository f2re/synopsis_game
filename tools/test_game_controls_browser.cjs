/** Real UI controls on an isolated server. Arbitrary valid answers test interaction,
 * never the scientific correctness of content. No successful API response is mocked. */
'use strict';
const assert = require('node:assert/strict');
const { login } = require('./test_saved_portrait_browser.cjs');
const { exerciseScrollbar } = require('./test_all_screens_browser.cjs');
const pathOf = response => new URL(response.url()).pathname;
async function afterClick(page, control, path, method = 'POST') {
  const pending = page.waitForResponse(response => pathOf(response) === path && response.request().method() === method);
  await control.click(); const response = await pending;
  assert.ok(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`);
  return response.json();
}
async function pressWithoutPageScroll(page, control) {
  await control.scrollIntoViewIfNeeded(); await control.focus();
  const parent = page.locator('.app-page-viewport');
  const before = await parent.evaluate(node => node.scrollTop);
  await control.press('Space');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await parent.evaluate(node => node.scrollTop), before, 'Space selects the diagram position without scrolling the page');
}
async function fillTask(page, task) {
  const kind = task.response.kind;
  if (kind === 'numeric') {
    await page.getByLabel('Числовой ответ', { exact: true }).fill('0');
  } else if (kind === 'choice') {
    const options = page.locator('.shift-options [role="radio"]');
    await options.first().focus(); await options.first().press('ArrowRight');
    assert.equal(await options.nth(1).getAttribute('aria-checked'), 'true', 'Radio arrows select and move focus');
    await options.nth(1).press('Home');
    assert.equal(await options.first().getAttribute('aria-checked'), 'true');
    await options.last().click(); assert.equal(await options.last().getAttribute('aria-checked'), 'true');
  } else if (kind === 'sequence' || kind === 'dependencySequence') {
    const rows = page.locator('.shift-sequence-row');
    const initial = await rows.locator('code').allTextContents();
    assert.ok(await rows.first().getByRole('button', { name: /^Поднять/ }).isDisabled());
    assert.ok(await rows.last().getByRole('button', { name: /^Опустить/ }).isDisabled());
    await rows.first().getByRole('button', { name: /^Опустить/ }).click();
    assert.equal(await rows.nth(1).locator('code').innerText(), initial[0]);
    await rows.nth(1).getByRole('button', { name: /^Поднять/ }).press('Space');
    assert.deepEqual(await rows.locator('code').allTextContents(), initial, 'Both sequence controls preserve a complete order');
  } else if (kind === 'stationPlot' || kind === 'stationBoard') {
    const board = kind === 'stationBoard';
    const observations = page.locator(board ? '.station-board-observations button' : '.station-observation');
    const positions = page.locator(board ? '.station-board-slot' : '.station-slot');
    assert.equal(await page.locator('button button, button [role="button"]').count(), 0, 'No nested interactive controls');
    const labels = await positions.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    assert.equal(new Set(labels).size, labels.length, 'Each position has a distinct geometrical name');
    for (let index = 0; index < task.payload.observations.length; index++) {
      await observations.nth(index).click();
      const position = positions.nth(index % task.payload.slots.length);
      if (index === 0) await pressWithoutPageScroll(page, position); else await position.click();
      if (!board && index === 0) {
        const clear = page.locator('.station-observation-clear').first();
        await clear.press('Space');
        assert.ok(await observations.first().evaluate(node => node === document.activeElement), 'Removing a placement returns focus to its observation');
        await position.click();
      }
    }
    assert.equal(await page.locator(board ? '.station-board-observations .is-placed' : '.station-observation.is-placed').count(), task.payload.observations.length);
  } else if (kind === 'findError') {
    const stations = page.locator('.find-error-station');
    await pressWithoutPageScroll(page, stations.first());
    assert.equal(await stations.first().getAttribute('aria-pressed'), 'true');
    await stations.last().click(); assert.equal(await stations.last().getAttribute('aria-pressed'), 'true');
  } else throw new Error(`Uncovered task kind: ${kind}`);
}
async function checkInventory({page, base, viewport, report, capture}) {
  await page.goto(base + '/profile/avatar');
  await page.getByRole('heading', { name: 'Персонаж и инвентарь', exact: true }).waitFor();
  await page.locator('canvas[data-avatar-renderer="editor-static"]').waitFor();
  const tabs = page.getByRole('tablist', { name: 'Раздел персонажа' });
  await tabs.getByRole('tab', { name: /^Инвентарь/ }).focus();
  await page.keyboard.press('End'); assert.equal(await page.getByRole('tab', { name: 'Внешность', exact: true }).getAttribute('aria-selected'), 'true');
  const appearance = page.locator('.inventory-appearance-option');
  for (let i = 0; i < await appearance.count(); i++) { await appearance.nth(i).click(); assert.equal(await appearance.nth(i).getAttribute('aria-pressed'), 'true'); }
  await capture(page, `all-inventory-appearance-${viewport.width}`);
  await page.getByRole('tab', { name: 'Внешность', exact: true }).press('Home');
  const categories = page.locator('.inventory-category');
  for (let i = 0; i < await categories.count(); i++) { await categories.nth(i).click(); assert.equal(await categories.nth(i).getAttribute('aria-pressed'), 'true'); assert.ok(await page.locator('.inventory-item').count()); }
  await categories.first().click();
  await exerciseScrollbar(page, page.locator('.inventory-item-scroll'), report, `all-inventory-catalog-scroll-${viewport.width}`);
  const items = page.locator('.inventory-item');
  if (viewport.width === 1366) for (let i = 0; i < await items.count(); i++) { await items.nth(i).click(); assert.equal(await items.nth(i).getAttribute('aria-pressed'), 'true'); }
  await page.getByLabel('Найти предмет', { exact: true }).fill('неттакогопредмета');
  await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
  await page.getByRole('checkbox', { name: 'На персонаже', exact: true }).check();
  assert.equal(await page.locator('.inventory-item:not(.is-equipped)').count(), 0);
  await page.getByRole('checkbox', { name: 'На персонаже', exact: true }).uncheck();
  await page.getByRole('tab', { name: 'Знаки отличия', exact: true }).click();
  await page.locator('.equipment-badge-grid').waitFor();
  const eligible = page.locator('.equipment-badge.is-unlocked button:not(:disabled)').first();
  if (await eligible.count()) {
    const selected = page.waitForResponse(r => pathOf(r) === '/api/equipment/loadout' && r.request().method() === 'PATCH');
    await eligible.click(); const response = await selected; assert.ok(response.ok());
    await page.getByRole('button', { name: 'Снять учебный знак', exact: true }).click();
    await page.locator('.equipment-active-badge').getByText('Без значка', { exact: true }).waitFor();
  }
  await capture(page, `all-inventory-badges-${viewport.width}`);
  await page.getByRole('tab', { name: /^Инвентарь/ }).click();
  const back = page.getByRole('button', { name: '← На станцию', exact: true });
  await page.getByRole('button', { name: 'На площадке', exact: true }).click();
  await back.click(); const dialog = page.getByRole('dialog', { name: 'Сохранить изменения?', exact: true });
  await dialog.waitFor(); await exerciseScrollbar(page, dialog.locator('.inventory-exit-scroll'), report, `all-inventory-exit-scroll-${viewport.width}`);
  await capture(page, `all-inventory-exit-${viewport.width}`);
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  assert.ok(await back.evaluate(node => node === document.activeElement));
  await back.click(); await dialog.getByRole('button', { name: 'Продолжить примерку', exact: true }).click();
  await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click();
  await page.getByRole('button', { name: 'В центре', exact: true }).click();
  await page.getByRole('tab', { name: 'Внешность', exact: true }).click();
  await page.locator('.inventory-appearance-option[aria-pressed="false"]').first().click();
  await back.click();
  await afterClick(page, dialog.getByRole('button', { name: 'Сохранить и выйти', exact: true }), '/api/identity/avatar', 'PATCH');
  await page.locator('.hub-screen').waitFor();
  report.cases.push({ name: `all-inventory-controls-${viewport.width}`, everyCategory: true, everyAppearanceOption: true, everyItemDescription: viewport.width === 1366, emptyReset: true, equippedFilter: true, tabArrows: true, unsavedExit: true });
}
async function checkShift({page, base, viewport, report, capture}) {
  await page.goto(base + '/shift');
  await capture(page, `all-shift-handover-${viewport.width}`);
  let state = await afterClick(page, page.getByRole('button', { name: 'Принять смену', exact: true }), '/api/shifts');
  const id = state.shiftId, kinds = new Set();
  await page.locator('.shift-card h1').waitFor();
  const mentor = page.getByRole('button', { name: /Спросить Ольхина/ });
  await mentor.click();
  const panel = page.locator('.shift-mentor-panel');
  const tabs = panel.getByRole('tab');
  for (let i = 0; i < await tabs.count(); i++) { await tabs.nth(i).click(); assert.equal(await tabs.nth(i).getAttribute('aria-selected'), 'true'); }
  await tabs.last().press('Home'); assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
  await tabs.first().press('End'); assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
  await exerciseScrollbar(page, panel.locator('.shift-mentor-scroll'), report, `all-mentor-scroll-${viewport.width}`);
  await capture(page, `all-mentor-${viewport.width}`);
  await panel.getByRole('button', { name: 'Закрыть тетрадь', exact: true }).focus(); await page.keyboard.press('Escape');
  assert.ok(await mentor.evaluate(node => node === document.activeElement));
  await page.getByRole('button', { name: 'Сдать смену', exact: true }).click();
  const early = page.getByRole('dialog', { name: 'Смена сдаётся досрочно', exact: true });
  await early.waitFor(); await exerciseScrollbar(page, early.locator('.shift-debrief-scroll'), report, `all-shift-early-scroll-${viewport.width}`);
  await capture(page, `all-shift-early-exit-${viewport.width}`);
  await early.getByRole('button', { name: 'Продолжить эту смену', exact: true }).click();
  let answered = 0, reference = false;
  while (state.task && answered++ < 15) {
    const task = state.task; kinds.add(task.response.kind);
    await page.getByRole('heading', { name: task.question, exact: true }).waitFor();
    const referenceButton = page.locator('.shift-assistance__button').filter({ hasText: 'Открыть справку' });
    if (!reference && await referenceButton.count() && await referenceButton.isEnabled()) {
      await afterClick(page, referenceButton, `/api/shifts/${id}/reference`); reference = true;
      await page.getByRole('heading', { name: 'Справка к заданию', exact: true }).waitFor();
    }
    await fillTask(page, task);
    if (task.response.kind === 'stationBoard') {
      const map = page.locator('.station-board-map');
      if (await map.count()) { await exerciseScrollbar(page, map, report, `all-board-x-${viewport.width}-${answered}`, 'horizontal'); await exerciseScrollbar(page, map, report, `all-board-y-${viewport.width}-${answered}`); }
    }
    await capture(page, `all-task-${task.response.kind}-${answered}-${viewport.width}`);
    let result = await afterClick(page, page.getByRole('button', { name: 'Проверить', exact: true }), `/api/tasks/${encodeURIComponent(task.instanceId)}/answer`);
    if (result.status === 'retry-offered') result = await afterClick(page, page.getByRole('button', { name: 'Показать разбор', exact: true }), `/api/shifts/${id}/reveal`);
    await page.locator('.shift-feedback').waitFor();
    if (result.completed) { await page.getByRole('button', { name: /^Завершить смену ·/ }).click(); break; }
    assert.ok(result.nextTask, 'The authoritative answer contains the next task');
    await page.getByRole('button', { name: 'Следующее задание', exact: true }).click();
    state = { ...state, task: result.nextTask };
  }
  assert.deepEqual([...kinds].sort(), ['choice','dependencySequence','findError','numeric','sequence','stationBoard','stationPlot']);
  const final = page.locator('.shift-debrief-overlay[open]'); await final.waitFor();
  await exerciseScrollbar(page, final.locator('.shift-debrief-scroll'), report, `all-shift-result-scroll-${viewport.width}`);
  await capture(page, `all-shift-result-${viewport.width}`);
  await final.getByRole('button', { name: 'На станцию', exact: true }).click();
  report.cases.push({ name: `all-shift-controls-${viewport.width}`, actualAnswered: answered, kinds: [...kinds], reference, mentorTabs: true, earlyExitContinue: true, completed: true });
}
async function checkBlitz({page, base, viewport, report, capture}) {
  await page.goto(base + '/blitz');
  await page.locator('.blitz-card h1').waitFor();
  await page.locator('.blitz-profile summary').click();
  await capture(page, `all-blitz-lobby-${viewport.width}`);
  let state = await afterClick(page, page.getByRole('button', { name: /^(Начать|Новый) блиц · 90 с$/ }), '/api/blitz-practice');
  // The clock is the actual server clock; no time or response is substituted.
  let count = 0;
  while (state.status === 'active' && state.task && count++ < 8) {
    await page.getByRole('heading', { name: state.task.question, exact: true }).waitFor();
    await fillTask(page, state.task);
    const result = await afterClick(page, page.getByRole('button', { name: 'Отправить ответ', exact: true }), `/api/blitz-practice/${state.id}/answer`);
    state = result.session;
  }
  assert.equal(state.status, 'completed'); assert.equal(state.progress.answered, 6, 'Six actual UI answers finish before the actual deadline');
  const reviews = page.locator('.blitz-review summary');
  for (let i = 0; i < await reviews.count(); i++) await reviews.nth(i).click();
  await exerciseScrollbar(page, page.locator('.app-page-scroll'), report, `all-blitz-result-scroll-${viewport.width}`);
  await capture(page, `all-blitz-result-${viewport.width}`);
  await page.getByRole('button', { name: 'Спокойная учебная смена', exact: true }).click();
  await page.getByRole('heading', { name: 'Записка на краю стола', exact: true }).waitFor();
  report.cases.push({ name: `all-blitz-controls-${viewport.width}`, actualAnswers: state.progress.answered, reviewAccordions: true, ordinaryShiftLink: true });
}
async function runGameControlChecks({base,browser,report,capture,fixture}) {
  for (const viewport of [{width:1366,height:768},{width:390,height:844},{width:844,height:390}]) {
    const context = await browser.newContext({ viewport, reducedMotion:'reduce', deviceScaleFactor:1 });
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push({ scenario:`game-${viewport.width}`,message:error.message }));
    await login(page,base,fixture,fixture.users[1]);
    const args = {page,base,viewport,report,capture};
    await checkInventory(args); await checkShift(args); await checkBlitz(args);
    await context.close();
  }
}
module.exports = {runGameControlChecks};
