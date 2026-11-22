/* Prepared real-browser acceptance. Not executed in the restricted workspace.
 * Loaded by test_station_screens.cjs with STATION_SCREEN_PHASES=level-one on an
 * authorized host. Uses the real isolated server and its public fixture account. */
'use strict';
const assert = require('node:assert/strict');
const { login } = require('./test_saved_portrait_browser.cjs');

const correctChoices = [
  'Сводка погоды с наземной метеорологической станции',
  '1 — температура воздуха, 2 — точка росы',
  'sn = 1',
];
const routeOf = response => new URL(response.url()).pathname;
async function responseAfter(page, action, route, method = 'POST', status = 200) {
  const pending = page.waitForResponse(response => routeOf(response) === route && response.request().method() === method);
  await action();
  const response = await pending;
  assert.equal(response.status(), status, `${method} ${route}`);
  return response.json();
}
async function waitForTask(page, task) {
  await page.locator(`.level-one-task[data-instance-id="${task.instanceId}"]`).waitFor();
  await page.getByRole('heading', { name: task.question, exact: true }).waitFor();
}
async function inspectNumericControls(page) {
  const input = page.getByRole('textbox', { name: 'Числовой ответ, °C', exact: true });
  await input.scrollIntoViewIfNeeded();
  const measured = await page.locator('.level-one-number').evaluate(node => {
    const controls = [...node.querySelectorAll('input, button')].map(control => {
      const box = control.getBoundingClientRect();
      return { width: box.width, height: box.height,
        hit: control.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)) };
    });
    const suffix = node.querySelector(':scope > div > span[aria-hidden="true"]');
    let unit = null;
    if (suffix) {
      const range = document.createRange();
      range.selectNodeContents(suffix);
      const style = getComputedStyle(suffix);
      unit = { text: suffix.textContent, visible: style.visibility === 'visible' && style.display !== 'none',
        textRects: [...range.getClientRects()].map(box => ({ left: box.left, top: box.top,
          right: box.right, bottom: box.bottom, width: box.width, height: box.height })) };
    }
    const viewport = document.querySelector('.app-page-viewport');
    return { controls, unit, noHorizontalPageOverflow: viewport.scrollWidth <= viewport.clientWidth + 1 };
  });
  assert.ok(measured.noHorizontalPageOverflow, 'The answer creates no horizontal page overflow');
  assert.equal(measured.controls.length, 2);
  for (const control of measured.controls) {
    assert.ok(control.width >= 44 && control.height >= 44 && control.hit, 'Real numeric targets are reachable and at least 44 px');
  }
  assert.equal(measured.unit?.text, '°C', 'The visible numeric suffix is exactly degrees Celsius');
  assert.equal(measured.unit.textRects.length, 1, `The Celsius suffix stays on one text line: ${JSON.stringify(measured.unit)}`);
  assert.ok(measured.unit.visible && measured.unit.textRects[0].width > 0 && measured.unit.textRects[0].height > 0,
    'The one-line Celsius suffix is visibly rendered');
  return measured;
}

async function runLevelOneChecks({ base, browser, report, capture, fixture }) {
  const viewports = [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 844, height: 390 }];
  for (const [viewportIndex, viewport] of viewports.entries()) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true })));
    try {
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push({ scenario: 'level-one', viewport: viewport.width, message: error.message }));
      const identity = await login(page, base, fixture, fixture.users[1]);
      const read = async route => {
        const response = await context.request.get(base + route, { headers: { authorization: `Bearer ${identity.token}` } });
        assert.equal(response.status(), 200, route);
        return response.json();
      };
      const before = await read('/api/level-one'), equipmentBefore = await read('/api/equipment');
      assert.notEqual(before.session?.status, 'active', 'This isolated scenario begins before a run or after the preceding viewport completed it');
      let starts = 0;
      page.on('request', request => { if (routeOf(request) === '/api/level-one' && request.method() === 'POST') starts++; });
      await page.goto(base + '/level-one');
      await page.locator('.level-one-shell:is([data-level-state="ready"], [data-level-state="completed"])').waitFor();
      assert.equal(starts, 0, 'Opening the level performs no start mutation');
      await page.getByRole('button', { name: 'Настроить персонажа', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/profile/avatar' && url.searchParams.get('returnTo') === '/level-one');
      await page.locator('canvas[data-avatar-renderer="editor-static"]').waitFor();
      await page.getByRole('button', { name: 'На площадке', exact: true }).click();
      await page.getByRole('region', { name: 'Тон кожи', exact: true }).locator('button[aria-pressed="false"]').first().click();
      const saved = (await responseAfter(page,
        () => page.getByRole('button', { name: 'Сохранить и продолжить', exact: true }).click(),
        '/api/identity/avatar', 'PATCH')).user;
      await page.waitForURL(url => url.pathname === '/level-one');
      assert.ok(saved.avatarPortrait?.sha256, 'Navigation follows an acknowledged saved portrait');
      assert.equal(Object.keys(saved.avatar).length, 11, 'All appearance slots reach the actual save');
      assert.equal(starts, 0, 'Saving the character returns to the level without starting it');
      const startLabel = before.session ? 'Пройти уровень ещё раз' : 'Начать первый уровень';
      let run = await responseAfter(page, () => page.getByRole('button', { name: startLabel, exact: true }).click(), '/api/level-one', 'POST', 201);
      assert.equal(starts, 1);
      assert.deepEqual(run.equipment.avatarPortrait, saved.avatarPortrait);
      await page.locator(`.level-one-observer [data-portrait-sha="${saved.avatarPortrait.sha256}"]`).waitFor();
      await capture(page, `level-one-start-${viewport.width}`);
      let numericGeometry;
      for (let index = 0; index < 6; index++) {
        const task = run.task;
        await waitForTask(page, task);
        if (index === 0 && viewport.width === 1366 && viewport.height === 768) {
          // No click, focus or scroll before this measurement: the first action
          // must already fit even while disabled until the player chooses an answer.
          const submitGeometry = await page.getByRole('button', { name: 'Проверить ответ', exact: true }).evaluate(node => {
            const box = node.getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return { left: box.left, top: box.top, right: box.right, bottom: box.bottom,
              width: box.width, height: box.height, viewport: [innerWidth, innerHeight], disabled: node.disabled,
              fullyInsideViewport: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
              centerReachesControl: node.contains(hit) };
          });
          assert.ok(submitGeometry.fullyInsideViewport, `The first submit action is entirely visible without scrolling: ${JSON.stringify(submitGeometry)}`);
          assert.ok(submitGeometry.centerReachesControl, 'The first submit center is not covered by another element');
          report.cases.push({ name: 'level-one-first-submit-visible-1366', ...submitGeometry });
        }
        if (task.response.kind === 'choice') {
          const target = task.payload.options.findIndex(option => index === 0 ? option.label !== correctChoices[index] : option.label === correctChoices[index]);
          assert.ok(target >= 0, `The authored choice exists for task ${index + 1}`);
          const choice = page.getByRole('radio').nth(target);
          await choice.click();
          if (index === 0) {
            const originalCard = await page.locator('.level-one-task').elementHandle();
            const summary = page.locator('.level-one-note > summary');
            await summary.focus(); await summary.press('Enter');
            assert.equal(await page.locator('.level-one-note').evaluate(node => node.open), true);
            await summary.press('Space');
            assert.equal(await page.locator('.level-one-note').evaluate(node => node.open), false);
            assert.equal(await choice.getAttribute('aria-checked'), 'true', 'Native note toggling preserves the selected answer');
            assert.equal(await originalCard.evaluate(node => node.isConnected), true, 'The actual task DOM stays mounted');
            await originalCard.dispose();
          }
          if (index === 1) {
            await responseAfter(page, () => page.getByRole('button', { name: 'Открыть объяснение', exact: true }).click(), `/api/level-one/${run.id}/reference`);
            assert.equal(await choice.getAttribute('aria-checked'), 'true', 'Opening the explanation preserves selection');
            await page.getByRole('heading', { name: 'Объяснение к заданию', exact: true }).waitFor();
          }
        } else {
          const input = page.getByRole('textbox', { name: 'Числовой ответ, °C', exact: true });
          await input.fill(index === 3 ? '23,4' : index === 4 ? '0,8' : '−12.8');
          if (index === 4) {
            await page.getByRole('button', { name: 'Изменить знак числа', exact: true }).click();
            assert.equal(await input.inputValue(), '-0,8');
          }
          if (index === 3) {
            await page.reload(); await waitForTask(page, task);
            assert.equal(await input.inputValue(), '23,4', 'The numeric draft survives a real page reload');
            assert.equal((await read('/api/level-one')).session.id, run.id);
            assert.equal(starts, 1, 'Reload resumes the same run');
            numericGeometry = await inspectNumericControls(page);
            await capture(page, `level-one-numeric-${viewport.width}`);
          }
        }
        const result = await responseAfter(page,
          () => page.getByRole('button', { name: 'Проверить ответ', exact: true }).click(), `/api/level-one/${run.id}/answer`);
        run = result.session;
        await page.locator('.level-one-shell[data-level-state="feedback"]').waitFor();
        assert.equal(run.review.length, index + 1);
        const feedback = page.locator('#level-one-feedback-title');
        assert.ok(await feedback.evaluate(node => node === document.activeElement), 'Accepted feedback receives real DOM focus');
        await page.getByRole('button', { name: index === 5 ? 'Посмотреть результат' : 'Следующее задание', exact: true }).click();
      }
      await page.getByRole('heading', { name: 'Первый уровень завершён', exact: true }).waitFor();
      assert.equal(run.progress.correct, 5); assert.equal(run.unassistedCorrect, 4); assert.equal(run.assistedTasks, 1);
      // The application must expose the result itself; no test scroll or focus
      // may conceal the retained-scroll problem observed in the previous CI.
      const resultGeometry = await page.locator('.level-one-result').evaluate(node => {
        const measure = selector => {
          const element = node.querySelector(selector);
          if (!element) return null;
          const box = element.getBoundingClientRect(), style = getComputedStyle(element);
          return { left: box.left, top: box.top, right: box.right, bottom: box.bottom,
            width: box.width, height: box.height,
            fullyInsideViewport: box.width > 0 && box.height > 0 && style.visibility === 'visible' && style.display !== 'none'
              && box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight };
        };
        return { viewport: [innerWidth, innerHeight], heading: measure('h1'), stats: measure('dl.level-one-stats'),
          values: [...node.querySelectorAll('dl.level-one-stats dd')].map(value => value.textContent.trim()) };
      });
      assert.ok(resultGeometry.heading?.fullyInsideViewport, `The result heading is fully visible without test scrolling: ${JSON.stringify(resultGeometry)}`);
      assert.ok(resultGeometry.stats?.fullyInsideViewport, `All result statistics are fully visible without test scrolling: ${JSON.stringify(resultGeometry)}`);
      assert.deepEqual(resultGeometry.values, ['5 / 6', '4', '1'], 'The visible result matches the six reviewed answers');
      report.cases.push({ name: `level-one-result-visible-${viewport.width}`, ...resultGeometry });
      await capture(page, `level-one-complete-${viewport.width}`);
      await page.reload();
      await page.getByRole('heading', { name: 'Первый уровень завершён', exact: true }).waitFor();
      const persisted = await read('/api/level-one');
      assert.equal(persisted.session.id, run.id); assert.equal(persisted.completedRuns, before.completedRuns + 1);
      assert.equal(starts, 1, 'Completed reload does not start another run');
      assert.equal((await read('/api/equipment')).stats.completedShifts, equipmentBefore.stats.completedShifts, 'The introductory level grants no ordinary-shift completion');
      await page.locator('.level-one-journal > details > summary').first().click();
      assert.equal(await page.locator('.level-one-journal > details').first().evaluate(node => node.open), true);
      if (viewportIndex === viewports.length - 1) {
        const replay = await responseAfter(page, () => page.getByRole('button', { name: 'Пройти уровень ещё раз', exact: true }).click(), '/api/level-one', 'POST', 201);
        assert.notEqual(replay.id, run.id); assert.equal(starts, 2);
      }
      report.cases.push({ name: `level-one-playable-${viewport.width}`, viewport, confirmedSaveBeforeNavigation: true,
        nativeNotePreservedSelection: true, completedAnswers: 6, correct: 5, unassistedCorrect: 4, assistedTasks: 1,
        numericGeometry, resumedActive: true, resumedResult: true, starts });
    } finally { await context.close(); }
  }
}

module.exports = { runLevelOneChecks };
