/** Real collection, wardrobe and earning flow against the isolated production server.
 * Fresh students are created through its admin API; no successful response or
 * achievement is mocked. Run with STATION_SCREEN_PHASES=rewards. */
'use strict';
const assert = require('node:assert/strict');
const { login } = require('./test_saved_portrait_browser.cjs');
const { exerciseScrollbar, checkHitTarget } = require('./test_all_screens_browser.cjs');

const pathOf = response => new URL(response.url()).pathname;
async function request(context, base, route, { method = 'GET', data, token, status = 200 } = {}) {
  const response = await context.request.fetch(base + route, {
    method, ...(data ? { data } : {}), ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  });
  assert.equal(response.status(), status, `${method} ${route}: real server status`);
  return response.json();
}
async function afterAction(page, action, route, method = 'POST', status = 200) {
  const pending = page.waitForResponse(response => pathOf(response) === route && response.request().method() === method);
  await action();
  const response = await pending;
  assert.equal(response.status(), status, `${method} ${route}: action acknowledged`);
  return response.json();
}
const choices = [
  'Сводка погоды с наземной метеорологической станции',
  '1 — температура воздуха, 2 — точка росы',
  'sn = 1',
];
async function completeFirstLevel(page) {
  let run = await afterAction(page, () => page.getByRole('button', { name: 'Начать первый уровень', exact: true }).click(), '/api/level-one', 'POST', 201);
  for (let index = 0; index < 6; index++) {
    const task = run.task;
    await page.locator(`.level-one-task[data-instance-id="${task.instanceId}"]`).waitFor();
    if (task.response.kind === 'choice') {
      const selected = task.payload.options.findIndex(option => option.label === choices[index]);
      assert.ok(selected >= 0, 'The source-checked authored option exists');
      await page.getByRole('radio').nth(selected).click();
    } else {
      await page.getByRole('textbox', { name: 'Числовой ответ, °C', exact: true }).fill(['23,4', '-0,8', '-12,8'][index - 3]);
    }
    const response = await afterAction(page,
      () => page.getByRole('button', { name: 'Проверить ответ', exact: true }).click(), `/api/level-one/${run.id}/answer`);
    run = response.session;
    await page.locator('.level-one-shell[data-level-state="feedback"]').waitFor();
    await page.getByRole('button', { name: index === 5 ? 'Посмотреть результат' : 'Следующее задание', exact: true }).click();
  }
  await page.getByRole('heading', { name: 'Первый уровень завершён', exact: true }).waitFor();
  assert.equal(run.progress.correct, 6);
  assert.equal(run.rewardsGranted.filter(reward => reward.id === 'held.pencil').length, 1);
  return run;
}

async function runRewardChecks({ base, browser, report, capture }) {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('synopsis_26063_settings', JSON.stringify({ soundEnabled: false, lowPower: true })));
    const tag = String(viewport.width);
    try {
      const admin = await request(context, base, '/api/admin/login', { method: 'POST', data: { code: '26063review' } });
      const fixture = { groupId: 'Проверка наград' };
      const student = { displayName: `Коллекция ${tag}`, code: '24680' };
      const created = await request(context, base, '/api/admin/users', { method: 'POST', token: admin.token, status: 201,
        data: { displayName: student.displayName, groupId: fixture.groupId, roles: ['student'], initialCode: student.code } });
      // Admin creation leaves codeSet=false. Establish the code through the real
      // reset API so the shared login helper exercises the ordinary code field.
      await request(context, base, `/api/admin/users/${encodeURIComponent(created.user.id)}/reset-code`, {
        method: 'POST', token: admin.token, data: { code: student.code },
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push({ scenario: 'rewards', viewport: viewport.width, message: error.message }));
      const identity = await login(page, base, fixture, student);
      const read = route => request(context, base, route, { token: identity.token });
      await request(context, base, '/api/rewards', { status: 401 });
      const fresh = await read('/api/rewards');
      assert.equal(fresh.total, 13);
      assert.equal(fresh.catalog.length, 13);
      assert.equal(fresh.earnedCount, 0, 'New accounts have no achievements');
      assert.equal(new Set(fresh.catalog.map(reward => reward.id)).size, 13);
      for (const reward of fresh.catalog) {
        assert.ok(reward.condition.length > 0);
        assert.notEqual(reward.status, 'earned');
        assert.equal(reward.progress.current, 0);
      }
      for (const [slot, id] of [['heldItem', 'held.pencil'], ['badge', 'badge.aerology'], ['companion', 'companion.tit'], ['companion', 'companion.squirrel']]) {
        const denied = await request(context, base, '/api/identity/avatar', { method: 'PATCH', token: identity.token, status: 403,
          data: { avatar: { ...identity.user.avatar, [slot]: id } } });
        assert.equal(denied.code, 'reward_locked', `Direct API cannot equip ${id}`);
      }
      await page.goto(base + '/rewards');
      await page.getByRole('heading', { name: 'Награды', exact: true }).waitFor();
      await page.locator('.reward-card').last().waitFor();
      assert.equal(await page.locator('.reward-card').count(), 13);
      const pencil = page.locator('[data-reward-id="held.pencil"]');
      const aerology = page.locator('[data-reward-id="badge.aerology"]');
      assert.equal(await pencil.getAttribute('data-reward-status'), 'locked');
      assert.equal(await aerology.getAttribute('data-reward-status'), 'unavailable');
      assert.equal(await aerology.getByRole('button').count(), 0, 'An unopened module has no misleading start action');
      const silhouette = await pencil.locator('.reward-card__art img, .reward-card__art svg').evaluate(node => ({
        filter: getComputedStyle(node).filter, animation: getComputedStyle(node).animationName,
        glow: getComputedStyle(node.closest('.reward-card')).boxShadow,
        artGlow: getComputedStyle(node.closest('.reward-card__art')).boxShadow,
      }));
      assert.match(silhouette.filter, /brightness\(0\)/, 'Locked art is an actual silhouette');
      assert.equal(silhouette.animation, 'none', 'Reduced motion keeps the silhouette still');
      await capture(page, `rewards-locked-${tag}`);
      await exerciseScrollbar(page, page.locator('.rewards-scroll'), report, `rewards-scroll-${tag}`);
      const earnedFilter = page.getByRole('button', { name: 'Полученные', exact: true });
      await checkHitTarget(earnedFilter, 'Earned filter');
      await earnedFilter.focus(); await page.keyboard.press('Enter');
      await page.getByRole('heading', { name: 'Первая награда впереди', exact: true }).waitFor();
      assert.equal(await page.locator('.reward-card').count(), 0);
      await page.getByRole('button', { name: 'Показать все награды', exact: true }).click();
      assert.equal(await page.locator('.reward-card').count(), 13);
      await page.getByRole('button', { name: 'Закрытые', exact: true }).click();
      assert.equal(await page.locator('.reward-card').count(), 13);
      await page.getByRole('button', { name: 'Все', exact: true }).click();

      await page.goto(base + '/profile/avatar');
      await page.locator('canvas[data-avatar-renderer="editor-static"]').waitFor();
      await page.getByLabel('Найти предмет', { exact: true }).fill('Карандаш');
      await page.getByRole('button', { name: /Карандаш синоптика.*Открыть описание/ }).click();
      assert.equal(await page.getByRole('button', { name: 'Награда не получена', exact: true }).isDisabled(), true);
      await capture(page, `rewards-wardrobe-locked-${tag}`);

      await page.goto(base + '/rewards');
      await page.locator('[data-reward-id="held.pencil"]').getByRole('button', { name: /Открыть первый уровень/ }).click();
      await page.waitForURL(url => url.pathname === '/level-one');
      const run = await completeFirstLevel(page);
      await page.getByRole('heading', { name: 'Награда получена', exact: true }).waitFor();
      const announcement = page.locator('[data-granted-reward-id="held.pencil"]');
      await announcement.waitFor();
      await announcement.scrollIntoViewIfNeeded();
      await capture(page, `rewards-first-level-granted-${tag}`);
      const earned = await read('/api/rewards');
      assert.equal(earned.earnedCount, 1, 'The first level earns only its own pencil');
      const reward = earned.catalog.find(item => item.id === 'held.pencil');
      assert.equal(reward.status, 'earned');
      assert.ok(reward.earnedAt);
      assert.equal((await read('/api/equipment')).stats.completedShifts, 0);
      await page.goto(base + '/rewards');
      await page.locator('[data-reward-id="held.pencil"][data-reward-status="earned"]').waitFor();
      const receivedArt = await pencil.locator('.reward-card__art img, .reward-card__art svg').evaluate(node => ({
        filter: getComputedStyle(node).filter,
        glow: getComputedStyle(node.closest('.reward-card')).boxShadow,
        artGlow: getComputedStyle(node.closest('.reward-card__art')).boxShadow,
      }));
      assert.doesNotMatch(receivedArt.filter, /brightness\(0\)/, 'Earned reward returns to colour');
      assert.notEqual(receivedArt.glow, silhouette.glow, 'An earned card gains its own glow beyond the ordinary card shadow');
      assert.equal(silhouette.artGlow, 'none');
      assert.notEqual(receivedArt.artGlow, 'none', 'The earned artwork has a visible static glow');
      await capture(page, `rewards-earned-${tag}`);
      await page.reload();
      await page.locator('[data-reward-id="held.pencil"][data-reward-status="earned"]').waitFor();
      assert.deepEqual(await read('/api/rewards'), earned, 'Reading and reloading do not grant again or change the date');
      assert.equal((await read(`/api/level-one/${run.id}`)).rewardsGranted.filter(item => item.id === 'held.pencil').length, 1);

      await page.getByRole('button', { name: /Персонаж и инвентарь/ }).click();
      await page.locator('canvas[data-avatar-renderer="editor-static"]').waitFor();
      await page.getByLabel('Найти предмет', { exact: true }).fill('Карандаш');
      await page.getByRole('button', { name: /Карандаш синоптика.*Открыть описание/ }).click();
      await page.getByRole('button', { name: 'Взять в руки', exact: true }).click();
      const saved = await afterAction(page, () => page.getByRole('button', { name: 'Сохранить персонажа', exact: true }).click(), '/api/identity/avatar', 'PATCH');
      assert.equal(saved.user.avatar.heldItem, 'held.pencil');
      assert.ok(saved.user.avatarPortrait.sha256);
      assert.equal((await read('/api/equipment')).nextShift.charges.retry, 1);
      await page.reload();
      await page.getByRole('button', { name: 'В руках: Карандаш синоптика. Выбрать предмет', exact: true }).waitFor();
      await capture(page, `rewards-wardrobe-earned-${tag}`);

      const offline = route => route.abort('failed');
      await page.route('**/api/rewards', offline);
      await page.goto(base + '/rewards');
      await page.getByRole('heading', { name: 'Не удалось обновить коллекцию', exact: true }).waitFor();
      await page.getByText('Не удалось открыть награды. Проверьте соединение.', { exact: true }).waitFor();
      assert.equal(await page.locator('.reward-card').count(), 0, 'A failed request is not a fabricated zero-progress collection');
      await capture(page, `rewards-connection-error-${tag}`);
      await page.unroute('**/api/rewards', offline);
      await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
      await page.locator('[data-reward-id="held.pencil"][data-reward-status="earned"]').waitFor();
      assert.equal((await read('/api/rewards')).earnedCount, 1);
      report.cases.push({ name: `rewards-end-to-end-${tag}`, viewport, freshLocked: 13,
        directEquipRejected: 4, exactFirstLevelAward: 1, preservedAfterReload: true,
        confirmedPortrait: true, keyboardFilter: true, connectionRecovery: true, silhouette, receivedArt });
    } finally { await context.close(); }
  }
}

module.exports = { runRewardChecks };
