/** Actual admin forms against the harness's isolated server and production build.
 * No successful response is intercepted or fabricated. All created users/groups
 * belong to this disposable run; credentials and tokens are never reported.
 */
'use strict';
const assert = require('node:assert/strict');
const { exerciseScrollbar, checkHitTarget } = require('./test_all_screens_browser.cjs');

const routeIs = (response, method, route) => response.request().method() === method && new URL(response.url()).pathname === route;
async function actionResponse(page, method, route, action, status = 200) {
  const [response] = await Promise.all([page.waitForResponse(result => routeIs(result, method, route)), action()]);
  assert.equal(response.status(), status, `${method} ${route}: real server status`);
  return response.json();
}
async function request(context, base, route, { method = 'GET', token, data, status = 200 } = {}) {
  const response = await context.request.fetch(base + route, { method, ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}), ...(data ? { data } : {}) });
  assert.equal(response.status(), status, `${method} ${route}: real server status`);
  return response.json();
}
async function rows(page, count) {
  await page.waitForFunction(count => document.querySelectorAll('.roster-row').length === count, count);
}
function groupButton(page, group) { return page.locator('.group-nav-btn').filter({ hasText: group }); }
function userRow(page, name) { return page.locator('.roster-row').filter({ has: page.getByText(name, { exact: true }) }); }
async function selectGroup(page, group) {
  await page.getByRole('heading', { name: 'Учебные группы и доступ', exact: true }).waitFor();
  const button = groupButton(page, group);
  await button.waitFor(); await button.click();
  await page.getByRole('heading', { name: `Группа «${group}»`, exact: true }).waitFor();
  assert.equal(await button.getAttribute('aria-pressed'), 'true');
}
async function focusInside(page, dialog) {
  assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)), 'Opening a modal puts focus inside');
  const cancel = dialog.getByRole('button', { name: 'Отмена', exact: true });
  await cancel.focus();
  for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)), `${key} remains in the modal`);
  }
}
async function backdropClick(page, dialog) {
  const point = await dialog.evaluate(dialog => {
    for (const node of [dialog, ...dialog.querySelectorAll('.modal-backdrop')]) {
      const r = node.getBoundingClientRect();
      const left = Math.max(0, r.left), top = Math.max(0, r.top);
      const right = Math.min(innerWidth, r.right), bottom = Math.min(innerHeight, r.bottom);
      for (const [x, y] of [[left + 2, top + 2], [left + 2, (top + bottom) / 2], [right - 2, top + 2], [right - 2, bottom - 2]]) {
        if (document.elementFromPoint(x, y) === node) return { x, y };
      }
    }
    return null;
  });
  assert.ok(point, 'The dialog exposes a visible backdrop outside its form');
  await page.mouse.click(point.x, point.y); await dialog.waitFor({ state: 'hidden' });
}
async function modalScroll(page, dialog, report, capture, name) {
  await exerciseScrollbar(page, dialog.locator('.hub-auth-scroll'), report, name + '-scroll');
  await capture(page, name);
  const track = dialog.locator('[role="scrollbar"][aria-orientation="vertical"]');
  if (await track.isVisible()) {
    await track.focus(); await track.press('End'); await capture(page, name + '-bottom');
  }
  const geometry = await dialog.evaluate(dialog => {
    const frame = dialog.querySelector('.hub-auth-scroll').getBoundingClientRect();
    const panel = dialog.querySelector('.modal-backdrop > .panel').getBoundingClientRect();
    const rail = dialog.querySelector('.hub-auth-scroll > [aria-orientation="vertical"]').getBoundingClientRect();
    const close = dialog.querySelector('.auth-panel-close'), box = close.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return { closeWidth: box.width, closeHeight: box.height,
      closeVisible: box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth,
      closeHit: hit === close || close.contains(hit), railVisible: rail.height > 0,
      railInset: frame.right - rail.right, railPanelGap: rail.left - panel.right };
  });
  assert.ok(geometry.closeWidth >= 44 && geometry.closeHeight >= 44 && geometry.closeVisible && geometry.closeHit, `${name}: close remains reachable after scrolling to the end`);
  if (geometry.railVisible) assert.ok(geometry.railInset >= 0 && geometry.railInset <= 8 && geometry.railPanelGap >= 0 && geometry.railPanelGap <= 8,
    `${name}: scrollbar is inside the form frame beside its panel, not on the screen edge`);
  report.cases.push({ name: name + '-frame', ...geometry });
  if (await track.isVisible()) await track.press('Home');
}

async function exerciseImportTextarea(page, textarea, report, capture, tag) {
  const value = await textarea.inputValue();
  const area = page.locator('.import-textarea-scroll');
  assert.equal(await area.getByRole('textbox', { name: 'Список учащихся для добавления', exact: true }).count(), 1,
    'The editable viewport keeps its native textbox role');
  await exerciseScrollbar(page, area, report, `admin-import-pixel-scroll-${tag}`);
  await textarea.scrollIntoViewIfNeeded(); await textarea.focus();
  const metrics = await textarea.evaluate(node => {
    const style = getComputedStyle(node), box = node.getBoundingClientRect();
    return { clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, width: box.width,
      scrollbarColor: style.scrollbarColor, scrollbarWidth: style.scrollbarWidth };
  });
  assert.ok(metrics.scrollHeight > metrics.clientHeight, 'The filled import textarea has real scrollable content');
  await textarea.press('Control+Home');
  await page.waitForFunction(() => document.querySelector('.import-textarea').scrollTop <= 1);
  assert.equal(await textarea.evaluate(node => node.selectionStart), 0, 'Ctrl+Home moves the actual text caret');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await capture(page, `admin-import-filled-${tag}`);
  await textarea.press('Control+End');
  await page.waitForFunction(() => {
    const node = document.querySelector('.import-textarea');
    return node.scrollTop >= node.scrollHeight - node.clientHeight - 1;
  });
  assert.equal(await textarea.evaluate(node => node.selectionEnd), value.length, 'Ctrl+End moves the actual text caret');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await capture(page, `admin-import-filled-bottom-${tag}`);
  await textarea.press('Control+Home');
  await page.waitForFunction(() => document.querySelector('.import-textarea').scrollTop <= 1);
  await textarea.hover(); await page.mouse.wheel(0, 100);
  await page.waitForFunction(() => document.querySelector('.import-textarea').scrollTop > 0);
  assert.equal(await textarea.inputValue(), value, 'Keyboard and wheel scrolling preserve every imported name');

  // Paste through the browser clipboard and normal keyboard action. The long
  // draft is never submitted; the original 18 records are restored below.
  const pasted = Array.from({ length: 120 }, (_, index) => `Участник длинного списка ${tag} ${index + 1}`).join('\n');
  await textarea.click();
  await page.evaluate(text => navigator.clipboard.writeText(text), pasted);
  await textarea.press('Control+A'); await textarea.press('Control+V');
  await page.waitForFunction(value => document.querySelector('.import-textarea').value === value, pasted);
  await textarea.press('Control+End'); await textarea.press('Enter'); await textarea.press('X');
  await page.waitForFunction(() => {
    const node = document.querySelector('.import-textarea');
    // Native caret scrolling may leave only the trailing padding below view.
    // The last line itself must fit; scrollbar End is checked separately above.
    const padding = parseFloat(getComputedStyle(node).paddingBottom) || 0;
    return node.scrollHeight - padding - node.scrollTop <= node.clientHeight + 1;
  });
  assert.equal(await textarea.inputValue(), pasted + '\nX', 'Typing after a long paste preserves native insertion');
  assert.equal(await textarea.evaluate(node => node.selectionEnd), pasted.length + 2, 'The caret follows insertion at the bottom');
  await capture(page, `admin-import-long-bottom-${tag}`);
  await textarea.press('Control+Home'); await textarea.press('Shift+End');
  assert.ok(await textarea.evaluate(node => node.selectionStart === 0 && node.selectionEnd > 0), 'Native range selection remains available');
  await textarea.fill('');
  await area.getByRole('scrollbar').waitFor({ state: 'hidden' });
  await textarea.fill(value);
  await area.getByRole('scrollbar').waitFor({ state: 'visible' });
  report.cases.push({ name: `admin-import-textarea-scroll-${tag}`, ...metrics,
    keyboardHomeEnd: true, wheel: true, textPreserved: true, clipboardPaste: 120,
    nativeSelection: true, caretAtBottom: true, clearsRail: true, controlledValueRestoresRail: true });
}

async function checkPersonalCode({ base, browser, report, capture, viewport, student }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true })));
  const page = await context.newPage(), tag = String(viewport.width);
  page.on('pageerror', error => report.errors.push({ scenario: 'personal-code', viewport: viewport.width, message: error.message }));
  let token, releaseSave = () => {};
  try {
    await page.goto(base + '/');
    const profile = page.locator('.hub-profile-button');
    await profile.click();
    await page.getByRole('button', { name: 'Войти в учебную группу', exact: true }).click();
    const loginDialog = page.getByRole('dialog', { name: 'Вход в учебную группу', exact: true });
    await loginDialog.waitFor();
    await loginDialog.getByLabel('Группа', { exact: true }).selectOption({ label: student.groupId });
    await loginDialog.getByLabel('Пользователь', { exact: true }).selectOption({ label: student.displayName });
    await loginDialog.getByLabel('Задать персональный код (необязательно)', { exact: true }).fill('');
    const login = await actionResponse(page, 'POST', '/api/identity/login', () => loginDialog.getByRole('button', { name: 'Войти', exact: true }).click());
    token = login.token;
    assert.equal(login.user.id, student.id); assert.equal(login.user.codeSet, false);
    await loginDialog.waitFor({ state: 'hidden' });
    await profile.click();
    await page.getByRole('button', { name: 'Задать код входа', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Персональный код входа', exact: true });
    await dialog.waitFor(); await focusInside(page, dialog);
    assert.equal(await dialog.getByLabel('Текущий код', { exact: true }).count(), 0, 'First code requires no previous code');
    const next = dialog.getByLabel('Новый персональный код', { exact: true });
    const confirm = dialog.getByLabel('Повторите новый код', { exact: true });
    const save = dialog.getByRole('button', { name: 'Сохранить код', exact: true });
    let writes = 0;
    const countWrites = req => { if (req.method() === 'POST' && new URL(req.url()).pathname === '/api/identity/set-code') writes++; };
    page.on('request', countWrites);
    await next.fill('studentone'); await confirm.fill('different'); await save.click();
    await dialog.getByRole('alert').filter({ hasText: 'Новые коды не совпадают' }).waitFor();
    assert.equal(writes, 0, 'Personal-code mismatch does not send a write');
    await modalScroll(page, dialog, report, capture, `admin-personal-code-validation-${tag}`);
    await confirm.fill('studentone');

    // Delay dispatch, then continue the original request to the actual server.
    // Neither the successful response nor the saved profile is fabricated.
    let notifyHeld;
    const held = new Promise(resolve => { notifyHeld = resolve; });
    const release = new Promise(resolve => { releaseSave = resolve; });
    await page.route('**/api/identity/set-code', async route => { notifyHeld(); await release; await route.continue(); }, { times: 1 });
    const finished = page.waitForResponse(response => routeIs(response, 'POST', '/api/identity/set-code'));
    void finished.catch(() => {});
    await save.click(); await held;
    await dialog.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.ok(await profile.evaluate(node => node === document.activeElement), 'Closing a pending code save returns to the profile control');
    await profile.click(); await page.getByRole('button', { name: 'Задать код входа', exact: true }).click(); await dialog.waitFor();
    const replacement = await dialog.elementHandle();
    assert.equal(await dialog.getByLabel('Текущий код', { exact: true }).count(), 0);
    releaseSave();
    const response = await finished; assert.equal(response.status(), 200);
    const updated = (await response.json()).user;
    assert.equal(updated.id, student.id); assert.equal(updated.codeSet, true);
    await dialog.getByLabel('Текущий код', { exact: true }).waitFor();
    assert.ok(await replacement.evaluate(node => node.isConnected && node.open), 'Late success updates the owner without closing the replacement form');
    assert.equal((await request(context, base, '/api/identity/me', { token })).user.codeSet, true);
    await capture(page, `admin-personal-code-race-${tag}`);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    assert.ok(await profile.evaluate(node => node === document.activeElement));

    await profile.click(); await page.getByRole('button', { name: 'Сменить код входа', exact: true }).click(); await dialog.waitFor();
    await dialog.getByLabel('Текущий код', { exact: true }).fill('studentone');
    await next.fill('studenttwo'); await confirm.fill('studenttwo');
    const changed = await actionResponse(page, 'POST', '/api/identity/set-code', () => save.click());
    assert.equal(changed.user.id, student.id); assert.equal(changed.user.codeSet, true);
    await dialog.waitFor({ state: 'hidden' });
    assert.ok(await profile.evaluate(node => node === document.activeElement), 'Completed save returns focus');
    await profile.click(); await page.getByRole('button', { name: 'Сменить код входа', exact: true }).click(); await dialog.waitFor();
    assert.equal(await dialog.getByLabel('Текущий код', { exact: true }).inputValue(), '');
    assert.equal(await next.inputValue(), '', 'Saved code fields are cleared on reopening');
    await capture(page, `admin-personal-code-saved-${tag}`);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    assert.ok(await profile.evaluate(node => node === document.activeElement));
    const verified = await request(context, base, '/api/identity/login', { method: 'POST', data: { userId: student.id, code: 'studenttwo' } });
    assert.equal(verified.user.id, student.id);
    await request(context, base, '/api/identity/logout', { method: 'POST', token: verified.token });
    assert.equal(writes, 2); page.off('request', countWrites);
    report.cases.push({ name: `admin-personal-code-controls-${tag}`, viewport, disposableStudent: true, stationLogin: true,
      mismatch: true, firstCodeSavedByRealServer: true, delayedRealRequest: true, closeDuringSave: true,
      replacementDialogSurvives: true, owningProfileUpdated: true, currentCodeFieldAppears: true,
      changeCode: true, reopenedFieldsCleared: true, escape: true, focusReturn: true, actualLoginWithSavedCode: true });
  } catch (error) {
    await capture(page, `admin-personal-code-failure-${tag}`).catch(() => {}); throw error;
  } finally {
    releaseSave();
    if (token) await context.request.post(base + '/api/identity/logout', { headers: { authorization: `Bearer ${token}` } }).catch(() => {});
    await context.close();
  }
}

async function checkAdminViewport({ base, browser, report, capture, adminCode, viewport }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    if (!localStorage.getItem('synopsis_26063_settings')) localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true }));
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ scenario: 'admin-screens', viewport: viewport.width, message: error.message }));
  const tag = String(viewport.width);
  const group = `Проверка ${report.engine || 'ui'} ${tag}`;
  const firstName = `Проверка ${tag} Первый`, secondName = `Проверка ${tag} Второй`;
  let adminToken;
  const studentTokens = [];
  try {
    await page.goto(base + '/admin');
    await page.getByRole('heading', { name: 'Вход администратора', exact: true }).waitFor();
    const loginCode = page.getByLabel('Код администратора', { exact: true });
    const loginButton = page.getByRole('button', { name: 'Войти в панель', exact: true });
    assert.equal(await loginButton.isDisabled(), true, 'Empty admin code cannot be submitted');
    await loginCode.fill('wrong-review');
    await checkHitTarget(loginButton, 'Admin login');
    await actionResponse(page, 'POST', '/api/admin/login', () => loginButton.click(), 401);
    await page.getByRole('alert').filter({ hasText: 'Неверный код администратора' }).waitFor();
    await exerciseScrollbar(page, page.locator('.app-page-scroll'), report, `admin-login-scroll-${tag}`);
    await capture(page, `admin-login-error-${tag}`);
    await loginCode.fill(adminCode);
    const login = await actionResponse(page, 'POST', '/api/admin/login', () => loginCode.press('Enter'));
    adminToken = login.token;
    assert.ok(login.user.roles.includes('admin'), 'The real server authenticates an administrator');
    await page.getByRole('heading', { name: 'Учебные группы и доступ', exact: true }).waitFor();
    await page.getByText('Обновляем список учащихся…', { exact: true }).waitFor({ state: 'hidden' });

    const newGroup = page.getByRole('button', { name: '+ Группа', exact: true });
    await checkHitTarget(newGroup, 'Create group'); await newGroup.click();
    const groupName = page.getByLabel('Название группы', { exact: true });
    await groupName.fill(group);
    await page.locator('.new-group-inline').getByRole('button', { name: 'Отмена', exact: true }).click();
    assert.equal(await groupButton(page, group).count(), 0, 'Cancelling a group creates no row');
    await newGroup.click(); await groupName.fill(group); await groupName.press('Enter');
    await page.getByRole('heading', { name: `Группа «${group}»`, exact: true }).waitFor();
    await page.getByText('Группа сохранится после добавления первого учащегося. Введите ФИО или загрузите список.', { exact: true }).waitFor();
    assert.ok(!(await request(context, base, '/api/identity/groups')).groups.includes(group), 'An empty draft is not represented as persisted');
    const nameInput = page.getByLabel('ФИО нового учащегося', { exact: true });
    const addOne = page.getByRole('button', { name: '+ Добавить', exact: true });
    assert.equal(await addOne.isDisabled(), true);
    await nameInput.fill(firstName); await checkHitTarget(addOne, 'Add first student');
    const first = (await actionResponse(page, 'POST', '/api/admin/users', () => addOne.click(), 201)).user;
    await rows(page, 1);
    assert.equal(first.groupId, group); assert.equal(first.displayName, firstName);
    assert.ok((await request(context, base, '/api/identity/groups')).groups.includes(group));

    // Establish a real code on our disposable student, so reset proves a state
    // transition instead of merely returning success for an already empty code.
    const firstLogin = await request(context, base, '/api/identity/login', { method: 'POST', data: { userId: first.id, code: 'review1' } });
    studentTokens.push(firstLogin.token); assert.equal(firstLogin.user.codeSet, true);
    await page.reload(); await selectGroup(page, group); await rows(page, 1);
    assert.match(await userRow(page, firstName).locator('.col-code').innerText(), /Задан/);
    await nameInput.fill(secondName);
    await actionResponse(page, 'POST', '/api/admin/users', () => nameInput.press('Enter'), 201); await rows(page, 2);

    const importMode = page.getByRole('button', { name: 'Импорт списком', exact: true });
    await checkHitTarget(importMode, 'Import mode'); await importMode.click();
    assert.equal(await importMode.getAttribute('aria-pressed'), 'true');
    const names = Array.from({ length: 18 }, (_, index) => `Участник ${tag} ${String(index + 1).padStart(2, '0')}`);
    const textarea = page.getByLabel('Список учащихся для добавления', { exact: true });
    const importSubmit = page.locator('.group-add-box button[type="submit"]');
    assert.equal(await importSubmit.isDisabled(), true);
    await textarea.fill('\n' + names.join('\n') + '\n');
    await exerciseImportTextarea(page, textarea, report, capture, tag);
    await checkHitTarget(importSubmit, 'Submit text import');
    const imported = await actionResponse(page, 'POST', '/api/admin/users/batch', () => importSubmit.click(), 201);
    assert.equal(imported.count, names.length); await rows(page, 20);
    const upload = page.getByRole('button', { name: /Загрузить файл/ });
    await checkHitTarget(upload, 'Upload student file');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), upload.click()]);
    const fileText = `Из файла ${tag} Один\nИз файла ${tag} Два`;
    await chooser.setFiles({ name: 'students.txt', mimeType: 'text/plain', buffer: Buffer.from(fileText, 'utf8') });
    await page.waitForFunction(value => document.querySelector('.import-textarea')?.value === value, fileText);
    const uploaded = await actionResponse(page, 'POST', '/api/admin/users/batch', () => importSubmit.click(), 201);
    assert.equal(uploaded.count, 2); await rows(page, 22);
    await capture(page, `admin-import-${tag}`);
    await page.getByRole('button', { name: '+ Добавить одного', exact: true }).click();
    const stored = (await request(context, base, '/api/admin/users', { token: adminToken })).users.filter(user => user.groupId === group);
    assert.equal(stored.length, 22, 'Every displayed import row exists on the server');
    assert.equal(new Set(stored.map(user => user.id)).size, 22);

    const search = page.getByLabel('Поиск по ФИО в текущей группе', { exact: true });
    await search.fill(firstName.toLowerCase()); await rows(page, 1);
    assert.equal(await userRow(page, firstName).count(), 1, 'Search is case-insensitive');
    const clear = page.getByRole('button', { name: 'Очистить поиск', exact: true });
    await checkHitTarget(clear, 'Clear student search'); await clear.click(); await rows(page, 22);
    assert.ok(await search.evaluate(node => node === document.activeElement));
    await search.fill('запись-которой-нет'); await rows(page, 0);
    await capture(page, `admin-empty-search-${tag}`);
    await page.getByRole('button', { name: 'Сбросить поиск', exact: true }).click(); await rows(page, 22);
    assert.ok(await search.evaluate(node => node === document.activeElement));
    const outer = page.locator('.app-page-scroll');
    await exerciseScrollbar(page, outer, report, `admin-page-scroll-${tag}`);
    await capture(page, `admin-overview-${tag}`);
    await exerciseScrollbar(page, page.locator('.admin-group-scroll'), report, `admin-groups-scroll-${tag}`);
    const table = page.locator('.roster-table-container');
    assert.ok(await table.locator(':scope > .pixel-scroll-area__viewport').evaluate(node => node.scrollHeight > node.clientHeight + 2), 'Twenty-two rows exercise actual table overflow');
    await exerciseScrollbar(page, table, report, `admin-roster-scroll-${tag}`);
    await exerciseScrollbar(page, table, report, `admin-roster-horizontal-${tag}`, 'horizontal');
    await capture(page, `admin-roster-${tag}`);

    const firstRow = userRow(page, firstName);
    await checkHitTarget(firstRow.locator('.pixel-switch'), 'Student status switch');
    await actionResponse(page, 'PATCH', `/api/admin/users/${first.id}/status`, () => firstRow.locator('.pixel-switch').click());
    await firstRow.locator('.roster-badge.disabled').waitFor();
    assert.ok(!(await request(context, base, '/api/identity/roster?group=' + encodeURIComponent(group))).users.some(user => user.id === first.id));
    const enable = firstRow.getByRole('checkbox', { name: `Включить ${firstName}`, exact: true });
    await enable.focus();
    await actionResponse(page, 'PATCH', `/api/admin/users/${first.id}/status`, () => enable.press('Space'));
    await firstRow.locator('.roster-badge.active').waitFor();
    assert.ok((await request(context, base, '/api/identity/roster?group=' + encodeURIComponent(group))).users.some(user => user.id === first.id));

    const reset = firstRow.getByRole('button', { name: '↺ Сброс', exact: true });
    await checkHitTarget(reset, 'Reset student code'); await reset.click();
    const resetDialog = page.getByRole('dialog', { name: 'Сброс кода доступа', exact: true });
    await resetDialog.waitFor(); await focusInside(page, resetDialog);
    await modalScroll(page, resetDialog, report, capture, `admin-reset-${tag}`);
    await resetDialog.getByRole('button', { name: 'Отмена', exact: true }).click(); await resetDialog.waitFor({ state: 'hidden' });
    assert.ok(await reset.evaluate(node => node === document.activeElement));
    assert.equal((await request(context, base, '/api/identity/roster?group=' + encodeURIComponent(group))).users.find(user => user.id === first.id).hasCode, true, 'Cancel does not reset the code');
    await reset.click(); await resetDialog.waitFor(); await page.keyboard.press('Escape'); await resetDialog.waitFor({ state: 'hidden' });
    assert.ok(await reset.evaluate(node => node === document.activeElement));
    await reset.click(); await resetDialog.waitFor(); await backdropClick(page, resetDialog);
    assert.ok(await reset.evaluate(node => node === document.activeElement));
    await reset.click(); await resetDialog.waitFor();
    await actionResponse(page, 'POST', `/api/admin/users/${first.id}/reset-code`, () => resetDialog.getByRole('button', { name: 'Подтвердить сброс', exact: true }).click());
    await resetDialog.waitFor({ state: 'hidden' });
    await page.waitForFunction(name => [...document.querySelectorAll('.roster-row')].some(row => row.querySelector('.user-name-text')?.textContent === name && row.querySelector('.col-code')?.textContent.includes('Не задан')), firstName);
    assert.equal((await request(context, base, '/api/identity/roster?group=' + encodeURIComponent(group))).users.find(user => user.id === first.id).hasCode, false, 'Confirmed reset clears the real code');
    const afterReset = await request(context, base, '/api/identity/login', { method: 'POST', data: { userId: first.id, code: '' } });
    studentTokens.push(afterReset.token); assert.equal(afterReset.user.id, first.id);

    const openCode = page.getByRole('button', { name: 'Сменить код администратора', exact: true });
    await checkHitTarget(openCode, 'Open admin code'); await openCode.click();
    const codeDialog = page.getByRole('dialog', { name: 'Код администратора', exact: true });
    await codeDialog.waitFor(); await focusInside(page, codeDialog);
    const current = codeDialog.getByLabel('Текущий код', { exact: true });
    const next = codeDialog.getByLabel('Новый персональный код', { exact: true });
    const confirm = codeDialog.getByLabel('Повторите новый код', { exact: true });
    const save = codeDialog.getByRole('button', { name: 'Сохранить код', exact: true });
    assert.equal(await save.isDisabled(), true);
    let codeRequests = 0;
    const observeCode = req => { if (req.method() === 'POST' && new URL(req.url()).pathname === '/api/identity/set-code') codeRequests++; };
    page.on('request', observeCode);
    await current.fill(adminCode); await next.fill('reviewnew'); await confirm.fill('different'); await save.click();
    await codeDialog.getByRole('alert').filter({ hasText: 'Новые коды не совпадают' }).waitFor();
    assert.equal(codeRequests, 0, 'Mismatch validation makes no mutation request');
    await current.fill('wrongreview'); await confirm.fill('reviewnew');
    await actionResponse(page, 'POST', '/api/identity/set-code', () => save.click(), 401);
    await codeDialog.getByRole('alert').filter({ hasText: 'Неверный текущий код' }).waitFor();
    assert.equal(codeRequests, 1); page.off('request', observeCode);
    await modalScroll(page, codeDialog, report, capture, `admin-code-error-${tag}`);
    await codeDialog.getByRole('button', { name: 'Отмена', exact: true }).click(); await codeDialog.waitFor({ state: 'hidden' });
    assert.ok(await openCode.evaluate(node => node === document.activeElement));
    await openCode.click(); await codeDialog.waitFor(); assert.equal(await next.inputValue(), '', 'Reopening clears unsaved sensitive fields');
    await page.keyboard.press('Escape'); await codeDialog.waitFor({ state: 'hidden' });
    await openCode.click(); await codeDialog.waitFor(); await backdropClick(page, codeDialog);
    assert.ok(await openCode.evaluate(node => node === document.activeElement));
    const stillWorks = await request(context, base, '/api/admin/login', { method: 'POST', data: { code: adminCode } });
    await request(context, base, '/api/identity/logout', { method: 'POST', token: stillWorks.token });

    await page.reload(); await selectGroup(page, group); await rows(page, 22);
    assert.match(await userRow(page, firstName).locator('.col-code').innerText(), /Не задан/);
    assert.equal(await userRow(page, firstName).getByRole('checkbox').isChecked(), true);
    await page.getByRole('button', { name: '← На станцию', exact: true }).click();
    await page.waitForURL(base + '/'); await page.locator('.hub-screen').waitFor();
    report.cases.push({ name: `admin-controls-${tag}`, viewport, realServer: true, persistedStudents: 22,
      groupCancel: true, groupSavedAfterFirstStudent: true, textImport: 18, fileImport: 2,
      search: true, clear: true, emptyReset: true, statusPointerAndKeyboard: true,
      resetCancel: true, resetConfirmed: true, resetAllowsActualLoginWithoutCode: true,
      modalFocus: true, escape: true, backdrop: true, focusReturn: true,
      adminLoginError: true, codeMismatch: true, wrongCurrentCode: true, bootstrapCodeUnchanged: true, reloadPersistence: true, returnToStation: true });
    await checkPersonalCode({ base, browser, report, capture, viewport, student: first });
  } catch (error) {
    await capture(page, `admin-failure-${tag}`).catch(() => {}); throw error;
  } finally {
    for (const token of [...studentTokens, adminToken].filter(Boolean)) {
      await context.request.post(base + '/api/identity/logout', { headers: { authorization: `Bearer ${token}` } }).catch(() => {});
    }
    await context.close();
  }
}

async function runAdminScreenChecks({ base, browser, report, capture, adminCode }) {
  assert.ok(typeof adminCode === 'string' && adminCode.length > 0, 'The harness supplies its isolated bootstrap admin code');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await checkAdminViewport({ base, browser, report, capture, adminCode, viewport });
  }
}
module.exports = { runAdminScreenChecks };
