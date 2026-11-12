/** Portrait acceptance inside the real station Chromium harness.
 * Success paths use the real API, identity store and production artwork.
 * The one deliberately aborted PATCH tests a network failure, never a fake success.
 */
'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
const DEFAULT = {
  skinTone: 'skin.warm', hair: 'hair.short', hairColor: 'haircolor.brown',
  headwear: 'headwear.none', top: 'top.center-jacket', bottom: 'bottom.dark-trousers',
  footwear: 'footwear.sneakers', backpack: 'backpack.none', heldItem: 'held.none',
  companion: 'companion.none', badge: 'badge.none',
};
const FIELD = {
  ...DEFAULT, skinTone: 'skin.deep', hair: 'hair.curl', hairColor: 'haircolor.auburn',
  headwear: 'headwear.cap', top: 'top.field-jacket', bottom: 'bottom.field-trousers',
  footwear: 'footwear.boots', backpack: 'backpack.field', heldItem: 'held.pencil', badge: 'badge.meteo',
};
const REST = {
  ...FIELD, headwear: 'headwear.beanie', top: 'top.sweater', bottom: 'bottom.jeans',
  footwear: 'footwear.sneakers', backpack: 'backpack.city', heldItem: 'held.none',
  companion: 'companion.tit', badge: 'badge.none',
};
function checkSaved(user, expected) {
  assert.deepEqual(user.avatar, expected, 'All eleven appearance values survive the real save');
  assert.equal(Object.keys(user.avatar).length, 11);
  const portrait = user.avatarPortrait;
  assert.equal(portrait.version, 1);
  assert.equal(portrait.width, 160); assert.equal(portrait.height, 160);
  assert.match(portrait.pngDataUrl, /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(portrait.sha256, hash(Buffer.from(portrait.pngDataUrl.split(',')[1], 'base64')));
  assert.equal(portrait.appearanceKey, hash(JSON.stringify(user.avatar)));
}
function checkSnapshot(value, user) {
  assert.deepEqual(value.equipment.avatarSnapshot, user.avatar);
  assert.deepEqual(value.equipment.avatarPortrait, user.avatarPortrait);
}
function answerFor(task) {
  // Valid answer shapes exercise transport and completion, not scientific correctness.
  const payload = task.payload, kind = task.response.kind;
  if (kind === 'numeric') return { value: 0 };
  if (kind === 'choice') return { choiceIndex: payload.options[0].id };
  if (['sequence', 'dependencySequence'].includes(kind)) return { order: payload.steps.map(step => step.id) };
  if (kind === 'findError') return { stationId: payload.stations[0].id };
  return { placements: Object.fromEntries(payload.observations.map((item, index) => [item.id, payload.slots[index % payload.slots.length].id])) };
}
async function assertPortrait(page, selector, user, size) {
  await page.waitForFunction(({ selector, sha }) => document.querySelector(selector)?.dataset.portraitSha === sha,
    { selector, sha: user.avatarPortrait.sha256 });
  const image = page.locator(selector).first();
  const actual = await image.evaluate(async node => {
    const img = node.querySelector('img'); await img.decode();
    const box = node.getBoundingClientRect();
    return { src: img.src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
      width: box.width, height: box.height, rendering: getComputedStyle(img).imageRendering,
      state: node.dataset.portraitState };
  });
  assert.equal(actual.src, user.avatarPortrait.pngDataUrl, 'DOM reuses the exact saved PNG');
  assert.equal(actual.state, 'saved');
  assert.equal(actual.naturalWidth, 160); assert.equal(actual.naturalHeight, 160);
  assert.equal(actual.rendering, 'pixelated');
  if (size) { assert.equal(actual.width, size); assert.equal(actual.height, size); }
}
async function login(page, base, fixture, selected) {
  await page.goto(base);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.getByRole('dialog', { name: 'Вход в учебную группу' }).waitFor();
  await page.getByLabel('Группа', { exact: true }).selectOption({ label: fixture.groupId });
  await page.getByLabel('Пользователь', { exact: true }).selectOption({ label: selected.displayName });
  await page.getByLabel('Персональный код', { exact: true }).fill(selected.code);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/identity/login' && r.request().method() === 'POST');
  await page.getByRole('dialog').getByRole('button', { name: 'Войти', exact: true }).click();
  const result = await response; assert.equal(result.status(), 200);
  await page.getByRole('dialog', { name: 'Вход в учебную группу' }).waitFor({ state: 'hidden' });
  return result.json();
}
async function saveFromEditor(page) {
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/identity/avatar' && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Сохранить персонажа', exact: true }).click();
  const result = await response; assert.equal(result.status(), 200);
  const user = (await result.json()).user;
  await assertPortrait(page, '.inventory-saved-portrait .saved-avatar-portrait', user, 80);
  return user;
}
async function checkMentorDoesNotCoverAnswer(page) {
  const geometry = await page.evaluate(() => {
    const rectangle = node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    };
    const controls = [...document.querySelectorAll('.shift-numeric > div, .shift-card .shift-primary')].map(rectangle);
    const helpers = [...document.querySelectorAll('.shift-mentor-trigger, .shift-mentor-reaction, .shift-mentor-panel')].map(rectangle);
    return { controls, helpers, overlap: controls.some(a => helpers.some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)) };
  });
  assert.ok(geometry.controls.length > 0 && geometry.helpers.length > 0, 'Observe real answer controls and mentor controls');
  assert.equal(geometry.overlap, false, 'Mentor controls must not cover an answer field or submit button');
  return geometry;
}

async function runSavedPortraitChecks({ base, browser, report, capture, waitForCampus, fixture }) {
  // Keep the other public fixture user untouched for the station audio/logout suite.
  const selected = fixture.users[1];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true })));
    const page = await context.newPage(), atlasRequests = [];
    page.on('pageerror', error => report.errors.push({ scenario: 'saved-portrait', viewport: viewport.width, message: error.message }));
    page.on('request', request => { if (request.url().includes('/assets/avatar/modular-r01/')) atlasRequests.push(new URL(request.url()).pathname); });
    const session = await login(page, base, fixture, selected);
    const request = async (route, method = 'GET', data, expected = 200) => {
      const response = await context.request.fetch(base + route, { method, data, headers: { authorization: `Bearer ${session.token}` } });
      assert.equal(response.status(), expected, `${route}: unexpected HTTP status`);
      return response.json();
    };
    // Reset only the isolated fixture's appearance so each viewport starts identically.
    const initial = (await request('/api/identity/avatar', 'PATCH', { avatar: DEFAULT })).user;
    checkSaved(initial, DEFAULT);
    await page.reload();
    await assertPortrait(page, '.station-home__identity .saved-avatar-portrait', initial, 40);
    await page.getByRole('button', { name: /Продолжить в кампусе/ }).click();
    await waitForCampus(page);
    await assertPortrait(page, '.hub-profile-button .saved-avatar-portrait', initial, 40);
    await page.getByRole('button', { name: `Профиль: ${selected.displayName}`, exact: true }).click();
    await assertPortrait(page, '.hub-profile-identity .saved-avatar-portrait', initial, 80);
    assert.equal(atlasRequests.length, 0, 'Title, campus and profile must not request the fitting atlas');
    report.cases.push({ name: `portrait-no-editor-resources-${viewport.width}`, atlasRequests: 0, sha256: initial.avatarPortrait.sha256 });

    await page.goto(base + '/profile/avatar');
    const canvas = page.locator('canvas[data-avatar-renderer="editor-static"]');
    await canvas.waitFor();
    await page.waitForFunction(() => {
      const c = document.querySelector('canvas[data-avatar-renderer="editor-static"]');
      return c && c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((value, i) => i % 4 === 3 && value > 0);
    });
    assert.equal(await page.locator('canvas').count(), 1);
    const firstFrame = await canvas.evaluate(node => node.toDataURL());
    await page.waitForTimeout(400); // Observe several display frames without changing the fitting.
    assert.equal(await canvas.evaluate(node => node.toDataURL()), firstFrame, 'Fitting is static, without autoplay');
    const directions = {};
    for (const [label, direction] of [['Слева', 'left'], ['Сзади', 'up'], ['Справа', 'right'], ['Спереди', 'down']]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.locator(`canvas[data-avatar-direction="${direction}"]`).waitFor();
      await page.waitForFunction(() => {
        const c = document.querySelector('canvas[data-avatar-renderer="editor-static"]');
        return c && c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((value, i) => i % 4 === 3 && value > 0);
      });
      assert.equal(await canvas.getAttribute('data-avatar-frame'), '0');
      directions[direction] = hash(await canvas.evaluate(node => node.toDataURL()));
    }
    assert.equal(new Set(Object.values(directions)).size, 4, 'Each manual direction has its own rendered view');
    const directionLabels = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.querySelectorAll('.inventory-directions button')].map(node => ({ label: node.textContent, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
    });
    for (const label of directionLabels) assert.ok(label.scrollWidth <= label.clientWidth, `Direction label must fit: ${JSON.stringify(label)}`);
    const stage = page.getByRole('group', { name: /Примерка одежды/ });
    await stage.focus(); await page.keyboard.press('ArrowLeft');
    await page.locator('canvas[data-avatar-direction="left"]').waitFor();
    await page.getByRole('button', { name: 'Спереди', exact: true }).click();
    await page.getByRole('button', { name: 'На площадке', exact: true }).click();
    await page.getByRole('tab', { name: 'Внешность', exact: true }).click();
    await page.getByRole('region', { name: 'Тон кожи', exact: true }).getByRole('button', { name: 'Тёмный', exact: true }).click();
    await page.getByRole('region', { name: 'Цвет волос', exact: true }).getByRole('button', { name: 'Рыжий', exact: true }).click();
    await page.getByRole('region', { name: 'Причёска', exact: true }).getByRole('button', { name: 'Кудри', exact: true }).click();
    await canvas.waitFor();
    await assertPortrait(page, '.inventory-saved-portrait .saved-avatar-portrait', initial, 80);
    const saved = await saveFromEditor(page); checkSaved(saved, FIELD);
    assert.notEqual(saved.avatarPortrait.sha256, initial.avatarPortrait.sha256);
    await page.getByRole('button', { name: 'Обувь: Полевые ботинки. Выбрать предмет', exact: true }).waitFor();
    await capture(page, `portrait-editor-saved-${viewport.width}`);
    report.cases.push({ name: `portrait-editor-static-${viewport.width}`, observedStaticMs: 400, directions, directionLabels, savedFields: saved.avatar,
      sha256: saved.avatarPortrait.sha256, fittingAtlasRequests: [...new Set(atlasRequests)] });

    await page.getByRole('button', { name: 'После смены', exact: true }).click();
    const abortSave = route => route.request().method() === 'PATCH' ? route.abort('failed') : route.continue();
    await page.route('**/api/identity/avatar', abortSave);
    await page.getByRole('button', { name: 'Сохранить персонажа', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Нет связи с сервером' }).waitFor();
    await assertPortrait(page, '.inventory-saved-portrait .saved-avatar-portrait', saved, 80);
    assert.equal(await stage.getAttribute('data-outfit-state'), 'draft');
    assert.deepEqual((await request('/api/identity/me')).user.avatarPortrait, saved.avatarPortrait);
    await capture(page, `portrait-save-network-failure-${viewport.width}`);
    await page.unroute('**/api/identity/avatar', abortSave);
    await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click();
    await page.getByRole('button', { name: '← В кампус', exact: true }).click();
    await waitForCampus(page);
    await assertPortrait(page, '.hub-profile-button .saved-avatar-portrait', saved, 40);
    assert.equal(await page.locator('canvas').count(), 1, 'Exactly one world after editor unmount');
    await capture(page, `portrait-campus-${viewport.width}`);
    await page.reload(); await waitForCampus(page);
    await assertPortrait(page, '.hub-profile-button .saved-avatar-portrait', saved, 40);
    await page.goto(base);
    await assertPortrait(page, '.station-home__identity .saved-avatar-portrait', saved, 40);
    await capture(page, `portrait-title-${viewport.width}`);

    await page.goto(base + '/shift');
    await page.getByRole('heading', { name: 'Записка на краю стола' }).waitFor();
    const starting = page.waitForResponse(r => new URL(r.url()).pathname === '/api/shifts' && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Принять смену', exact: true }).click();
    const practiceResponse = await starting; assert.equal(practiceResponse.status(), 201);
    const practice = await practiceResponse.json(); checkSnapshot(practice, saved);
    await assertPortrait(page, '.shift-equipment .saved-avatar-portrait', saved, 40);
    const changed = (await request('/api/identity/avatar', 'PATCH', { avatar: REST })).user;
    checkSaved(changed, REST);
    checkSnapshot(await request(`/api/shifts/${practice.shiftId}/task`), saved);
    await assertPortrait(page, '.shift-equipment .saved-avatar-portrait', saved, 40);
    await page.reload();
    await page.getByRole('button', { name: 'Принять смену', exact: true }).click();
    await assertPortrait(page, '.shift-equipment .saved-avatar-portrait', saved, 40);
    const initialGeometry = await checkMentorDoesNotCoverAnswer(page);
    const numeric = page.getByRole('textbox', { name: 'Числовой ответ', exact: true });
    await numeric.scrollIntoViewIfNeeded();
    const scrolledGeometry = await checkMentorDoesNotCoverAnswer(page);
    // The guide icon contributes its existing accessible name before the button text.
    await page.getByRole('button', { name: /Спросить Ольхина/ }).click();
    await page.getByRole('complementary', { name: 'Клеёнчатая тетрадь Иннокентия Борисовича', exact: true }).waitFor();
    if (viewport.width <= 760 || viewport.height <= 540) await checkMentorDoesNotCoverAnswer(page);
    await page.getByRole('button', { name: 'Закрыть тетрадь', exact: true }).click();
    await numeric.fill('0');
    assert.equal(await numeric.inputValue(), '0');
    await checkMentorDoesNotCoverAnswer(page);
    await capture(page, `portrait-shift-pinned-${viewport.width}`);
    const submitted = page.waitForResponse(r => new URL(r.url()).pathname === `/api/tasks/${encodeURIComponent(practice.task.instanceId)}/answer` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    const submitResponse = await submitted; assert.equal(submitResponse.status(), 200);
    let firstAnswer = await submitResponse.json(); checkSnapshot(firstAnswer, saved);
    await assertPortrait(page, '.shift-equipment .saved-avatar-portrait', saved, 40);
    await capture(page, `portrait-shift-feedback-${viewport.width}`);
    report.cases.push({ name: `portrait-shift-input-${viewport.width}`, initialGeometry, scrolledGeometry,
      mentorOpenClose: true, numericInput: '0', realAnswerStatus: submitResponse.status() });
    if (firstAnswer.status === 'retry-offered') {
      firstAnswer = await request(`/api/shifts/${practice.shiftId}/reveal`, 'POST', { instanceId: practice.task.instanceId });
      checkSnapshot(firstAnswer, saved);
    }
    let task = firstAnswer.nextTask;
    const practiceTasks = new Set([practice.task.instanceId]);
    while (task) {
      assert.ok(!practiceTasks.has(task.instanceId), 'Ordinary practice must advance after answer/reveal');
      practiceTasks.add(task.instanceId);
      assert.ok(practiceTasks.size <= practice.progress.total, 'Ordinary practice stays within the server task count');
      let result = await request(`/api/tasks/${encodeURIComponent(task.instanceId)}/answer`, 'POST',
        { shiftId: practice.shiftId, answer: answerFor(task), attempt: 1 });
      checkSnapshot(result, saved);
      if (result.status === 'retry-offered') {
        result = await request(`/api/shifts/${practice.shiftId}/reveal`, 'POST', { instanceId: task.instanceId });
        checkSnapshot(result, saved);
      }
      task = result.nextTask;
    }
    const result = await request(`/api/shifts/${practice.shiftId}/result`);
    assert.equal(result.completed, true); checkSnapshot(result, saved);

    await page.goto(base + '/blitz');
    // A preceding viewport may have completed a round for this same isolated account.
    const startBlitz = page.getByRole('button', { name: /^(Начать блиц|Новый блиц) · 90 с$/ });
    await startBlitz.waitFor();
    const startingBlitz = page.waitForResponse(r => new URL(r.url()).pathname === '/api/blitz-practice' && r.request().method() === 'POST');
    await startBlitz.click();
    const blitzResponse = await startingBlitz; assert.equal(blitzResponse.status(), 201);
    let blitz = await blitzResponse.json(); checkSnapshot(blitz, changed);
    await assertPortrait(page, '.blitz-profile .saved-avatar-portrait', changed, 80);
    const latestProfile = { ...FIELD, headwear: 'headwear.none', hair: 'hair.long', hairColor: 'haircolor.blond' };
    const latest = (await request('/api/identity/avatar', 'PATCH', { avatar: latestProfile })).user;
    checkSaved(latest, latestProfile);
    assert.notEqual(latest.avatarPortrait.sha256, changed.avatarPortrait.sha256);
    await page.reload();
    await assertPortrait(page, '.blitz-profile .saved-avatar-portrait', changed, 80);
    checkSnapshot(await request(`/api/blitz-practice/${blitz.id}`), changed);
    await capture(page, `portrait-blitz-pinned-${viewport.width}`);
    const blitzTasks = new Set();
    while (blitz.status === 'active' && blitz.task) {
      assert.ok(!blitzTasks.has(blitz.task.instanceId), 'Blitz must advance after an accepted answer');
      blitzTasks.add(blitz.task.instanceId);
      assert.ok(blitzTasks.size <= blitz.progress.total, 'Blitz stays within the server task count');
      const answer = await request(`/api/blitz-practice/${blitz.id}/answer`, 'POST', { instanceId: blitz.task.instanceId, answer: answerFor(blitz.task) });
      assert.equal(answer.accepted, true, 'The real server accepts the answer before its deadline');
      blitz = answer.session; checkSnapshot(blitz, changed);
    }
    assert.equal(blitz.status, 'completed');
    await page.reload();
    await page.getByRole('heading', { name: 'Раунд завершён', exact: true }).waitFor();
    await assertPortrait(page, '.blitz-profile .saved-avatar-portrait', changed, 80);
    await capture(page, `portrait-blitz-result-${viewport.width}`);
    report.cases.push({ name: `portrait-session-snapshots-${viewport.width}`, ordinaryStartAndResultSha: saved.avatarPortrait.sha256,
      blitzStartAndResultSha: changed.avatarPortrait.sha256, currentProfileSha: latest.avatarPortrait.sha256,
      ordinaryCompleted: result.completed, blitzCompleted: blitz.status, faultInjection: 'One aborted avatar PATCH; confirmed image and server data preserved' });
    await context.close();

    // A fresh browser context authenticates normally, with no copied session or cache.
    const restoredContext = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const restored = await restoredContext.newPage(), restoredAtlas = [];
    restored.on('pageerror', error => report.errors.push({ scenario: 'portrait-fresh-login', viewport: viewport.width, message: error.message }));
    restored.on('request', request => { if (request.url().includes('/assets/avatar/modular-r01/')) restoredAtlas.push(request.url()); });
    const restoredSession = await login(restored, base, fixture, selected);
    assert.deepEqual(restoredSession.user.avatarPortrait, latest.avatarPortrait);
    checkSaved(restoredSession.user, latestProfile);
    await assertPortrait(restored, '.station-home__identity .saved-avatar-portrait', latest, 40);
    assert.equal(restoredAtlas.length, 0, 'Fresh login renders the stored PNG without loading parts');
    await restored.goto(base + '/profile/avatar');
    await restored.locator('canvas[data-avatar-renderer="editor-static"]').waitFor();
    await restored.getByRole('button', { name: 'Обувь: Полевые ботинки. Выбрать предмет', exact: true }).waitFor();
    await restored.getByRole('tab', { name: 'Внешность', exact: true }).click();
    assert.equal(await restored.getByRole('region', { name: 'Причёска', exact: true }).getByRole('button', { name: /Длинные/ }).getAttribute('aria-pressed'), 'true');
    assert.equal(await restored.getByRole('region', { name: 'Цвет волос', exact: true }).getByRole('button', { name: /Светлый/ }).getAttribute('aria-pressed'), 'true');
    await assertPortrait(restored, '.inventory-saved-portrait .saved-avatar-portrait', latest, 80);
    await capture(restored, `portrait-editor-restored-${viewport.width}`);
    report.cases.push({ name: `portrait-fresh-login-${viewport.width}`, restoredAllElevenFields: true, restoredOffCropBoots: true,
      atlasRequestsBeforeEditor: 0, sha256: latest.avatarPortrait.sha256 });
    await restoredContext.close();
  }
}
module.exports = { runSavedPortraitChecks };
