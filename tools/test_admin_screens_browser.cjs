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
  const point = await dialog.locator('.modal-backdrop').evaluate(node => {
    const r = node.getBoundingClientRect();
    const left = Math.max(0, r.left), top = Math.max(0, r.top);
    const right = Math.min(innerWidth, r.right), bottom = Math.min(innerHeight, r.bottom);
    for (const [x, y] of [[left + 2, top + 2], [left + 2, (top + bottom) / 2], [right - 2, top + 2], [right - 2, bottom - 2]]) {
      if (document.elementFromPoint(x, y) === node) return { x, y };
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
    await track.focus(); await track.press('End'); await capture(page, name + '-bottom'); await track.press('Home');
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
