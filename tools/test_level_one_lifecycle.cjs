/* Real Web API + real LevelOneScreen / AvatarEditor handlers + real file-backed services.
 * Requests are routed in-process: no HTTP listener, browser, DOM or visual acceptance. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { randomUUID, createHash } = require('node:crypto');
const { load, Runner, Events, deferred, flush, nodes, text } = require('./ui_test_harness.cjs');
const repo = path.resolve(__dirname, '..');
const canonical = value => JSON.parse(JSON.stringify(value));
const nodeText = node => text(node).replace(/\s+/g, ' ').trim();
const button = (runner, label) => nodes(runner.output).find(node => node.type === 'button' && nodeText(node) === label);
const main = runner => nodes(runner.output).find(node => node.type === 'main');
const numberInput = runner => nodes(runner.output).find(node => node.type === 'input' && node.props.id === 'level-one-number');
const checkedRadio = runner => nodes(runner.output).find(node => node.props?.role === 'radio' && node.props['aria-checked']);
const checkedTask = runner => nodes(runner.output).find(node => node.props?.['data-instance-id']);
const outputs = [], calls = [], audio = [], timers = new Map(), stored = new Map();
let timerId = 0;
const window = Object.assign(new Events(), {
  setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
  clearTimeout: id => timers.delete(id),
  sessionStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
});
async function settle(runner, predicate = () => main(runner)?.props['data-level-state'] !== 'loading') {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1));
    await flush(runner);
    if (predicate()) return;
  }
  throw new Error(`Handler did not settle: ${text(runner.output).slice(0, 350)}`);
}
function click(runner, label) {
  const control = button(runner, label);
  assert(control, `Missing button: ${label}`);
  assert(!control.props.disabled, `Disabled button: ${label}`);
  control.props.onClick(); runner.render();
}
function fill(runner, value) {
  const control = numberInput(runner);
  assert(control && !control.props.disabled);
  const label = nodes(runner.output).find(node => node.type === 'label' && node.props.htmlFor === control.props.id);
  assert(label, 'The numeric field has an associated label');
  // Native adjacent text nodes concatenate; the harness's general text() helper
  // inserts separators and would invent a space before the comma here.
  const labelText = Array.isArray(label.props.children) ? label.props.children.join('') : label.props.children;
  assert.equal(labelText, 'Числовой ответ, °C', 'The accessible label includes the actual task temperature unit');
  control.props.onChange({ target: { value } }); runner.render();
}
function choose(runner, label) {
  const control = nodes(runner.output).find(node => node.props?.role === 'radio' && nodeText(node).endsWith(label));
  assert(control && !control.props.disabled, `Missing enabled choice: ${label}`);
  control.props.onClick(); runner.render();
}
function submit(runner) {
  const form = nodes(runner.output).find(node => node.type === 'form');
  assert(form);
  form.props.onSubmit({ preventDefault() {} }); runner.render();
}

(async () => {
  process.chdir(repo);
  const { IdentityService } = await import(pathToFileURL(path.join(repo, 'apps/server/dist/modules/identity/identityService.js')));
  const { EquipmentService } = await import(pathToFileURL(path.join(repo, 'apps/server/dist/modules/equipment/equipmentService.js')));
  const { ShiftService } = await import(pathToFileURL(path.join(repo, 'apps/server/dist/modules/shift/shiftService.js')));
  const scratch = path.join(repo, 'apps/server/.local');
  await fsp.mkdir(scratch, { recursive: true });
  const directory = await fsp.mkdtemp(path.join(scratch, 'level-one-integration-'));
  const storePath = path.join(directory, 'training.json');
  const attemptLogPath = path.join(directory, 'attempts.jsonl');
  const createService = async () => {
    const service = new ShiftService({ contentRoot: path.join(repo, 'content'), attemptLogPath, equipment: new EquipmentService({ storePath }) });
    await service.init(); return service;
  };
  let service;
  try {
    service = await createService();
    const identity = new IdentityService({ storePath: path.join(directory, 'identity.json'), securityProfile: 'trusted',
      ownsReward: (userId, rewardId) => service.equipment.ownsReward(userId, rewardId) });
    await identity.init();
    await identity.bootstrapAdmin('Проверка первого уровня', '2088');
    const admin = await identity.adminLogin('2088', '127.0.0.1');
    const student = await identity.createUser(admin.token, { displayName: 'Игрок проверки', groupId: 'Локальная проверка', roles: ['student'] });
    let heldLobby = null, hangLobby = false, dropAnswer = false, rejectAnswer = false, dropStart = false;
    const bridgeFetch = async (url, init = {}) => {
      const method = init.method ?? 'GET';
      const pathname = new URL(url, 'http://in-process.invalid').pathname;
      const body = init.body ? JSON.parse(init.body) : {};
      if (pathname.startsWith('/api/level-one')) calls.push({ method, path: pathname, body: canonical(body) });
      try {
        let result;
        if (pathname === '/api/identity/login') result = await identity.login(body.userId, body.code, '127.0.0.2');
        else {
          const authorization = new Headers(init.headers).get('authorization') ?? '';
          const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
          const user = identity.me(token);
          if (pathname === '/api/equipment') result = service.equipment.getEquipment(user.id, user.avatar);
          else if (pathname === '/api/rewards') result = service.equipment.getRewards(user.id);
          else if (pathname === '/api/identity/avatar') result = { user: await identity.updateAvatar(token, body.avatar) };
          else if (pathname === '/api/level-one' && method === 'GET') {
            if (hangLobby) {
              hangLobby = false;
              await new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
            }
            result = service.levelOneLobby(user.id);
            if (heldLobby) { const held = heldLobby; heldLobby = null; return held.promise; }
          } else if (pathname === '/api/level-one' && method === 'POST') {
            result = await service.startLevelOne(user.id, user.avatar, body.requestId, user.avatarPortrait);
            if (dropStart) { dropStart = false; throw new Error('Start response lost after persistence'); }
          } else {
            const match = pathname.match(/^\/api\/level-one\/([^/]+)(?:\/(answer|reference))?$/);
            assert(match, `Unexpected in-process route: ${method} ${pathname}`);
            const id = decodeURIComponent(match[1]);
            if (!match[2]) result = service.getLevelOne(user.id, id);
            else if (match[2] === 'reference') result = await service.openLevelOneReference(user.id, id, body.instanceId);
            else {
              if (rejectAnswer) { rejectAnswer = false; throw new Error('Connection lost before persistence'); }
              result = await service.submitLevelOneAnswer(user.id, id, body.instanceId, body.answer);
              if (dropAnswer) { dropAnswer = false; throw new Error('Answer response lost after persistence'); }
            }
          }
        }
        return new Response(JSON.stringify(result), { status: pathname === '/api/level-one' && method === 'POST' ? 201 : 200, headers: { 'content-type': 'application/json' } });
      } catch (error) {
        if (!Number.isInteger(error.status)) throw error;
        return new Response(JSON.stringify({ error: error.message, code: error.code }), { status: error.status, headers: { 'content-type': 'application/json' } });
      }
    };
    const apiModule = load('apps/web/src/api.ts', {}, { Headers, fetch: bridgeFetch, sessionStorage: window.sessionStorage });
    let user = await apiModule.api.login(student.id, '2088');
    const options = load('apps/web/src/features/avatar/avatarOptions.ts');
    const portrait = load('apps/web/src/features/avatar/SavedAvatarPortrait.tsx', { './saved-avatar-portrait.css': {} });
    const drafts = load('apps/web/src/features/avatar/avatarDraft.ts', { './avatarOptions': options }, { window });
    const rewards = load('apps/web/src/features/rewards/useRewards.ts', { '../../api': apiModule }, { window, AbortController });
    const { AvatarEditor } = load('apps/web/src/features/avatar/AvatarEditor.tsx', {
      '../../api': apiModule, '@synopsis/world-engine': { worldAudio: { play() {} } },
      './AvatarPreview': { AvatarPreview: 'StaticFitting' }, './SavedAvatarPortrait': portrait,
      './AvatarOptionGrid': { AvatarAppearance: 'AvatarAppearance', AvatarOptionGrid: 'AvatarOptionGrid' },
      './avatarOptions': options, './avatarDraft': drafts, './inventory.css': {},
      '../hub/hubPreferences': { readHubPreferences: () => ({ soundEnabled: false }) },
      '../ui/modalFocus': { keepTabInDialog() {} }, '../ui/PixelScrollArea': { PixelScrollArea: 'PixelScrollArea' },
      './EquipmentBadges': { EquipmentBadges: 'EquipmentBadges', EquipmentSummary: 'EquipmentSummary' },
      '../rewards/useRewards': rewards,
    }, { window, AbortController });
    const model = load('apps/web/src/features/levelOne/levelOneModel.ts');
    const lore = load('apps/web/src/features/shift/shiftLore.ts');
    const { LevelOneScreen } = load('apps/web/src/features/levelOne/LevelOneScreen.tsx', {
      '../../api': apiModule, '../../brand': { GAME_MARK: '26063' },
      '@synopsis/world-engine/audio': { worldAudio: { play: id => audio.push(id) } },
      '../avatar/SavedAvatarPortrait': portrait, '../ui': { PixelIcon: 'PixelIcon', PixelProgressBar: 'PixelProgressBar' },
      '../ui/radioGroupKeys': { handleRadioGroupKeyDown() {} }, '../shift/WorkroomBackdrop': { WorkroomBackdrop: 'WorkroomBackdrop' },
      '../shift/shiftLore': lore, './levelOneModel': model, '../shift/ShiftWorkspace.css': {}, './levelOne.css': {},
      '../rewards/RewardGrants': { RewardGrants: 'RewardGrants' },
    }, { window, AbortController, crypto: { randomUUID } });
    const navigation = [];
    const level = () => new Runner(LevelOneScreen, { user, onExit: () => navigation.push('station'), onOpenCharacter: () => navigation.push('character'), onStartPractice: () => navigation.push('practice') });
    const current = () => service.levelOneLobby(user.id).session;
    const startPosts = () => calls.filter(call => call.path === '/api/level-one' && call.method === 'POST');
    const successChoices = {
      tmpl_c1_aaxx_header: 'Сводка погоды с наземной метеорологической станции',
      tmpl_c2_temp_vs_dewpoint: '1 — температура воздуха, 2 — точка росы',
      tmpl_c2_sign_bit_sn: 'sn = 1',
    };

    // No level is created before the player chooses and commits an appearance.
    let screen = level(); await settle(screen);
    assert.equal(startPosts().length, 0);
    click(screen, 'Настроить персонажа');
    assert.deepEqual(navigation, ['character']); screen.unmount();
    const saveEvents = [];
    const editor = new Runner(AvatarEditor, { user, initialSection: 'appearance', onBack() {},
      onSaved: value => { user = value; saveEvents.push('saved'); }, onContinueToLevel: () => saveEvents.push('level') });
    await settle(editor, () => Boolean(button(editor, 'На площадке')));
    click(editor, 'На площадке');
    click(editor, 'Сохранить и продолжить');
    await settle(editor, () => saveEvents.length === 2);
    assert.deepEqual(saveEvents, ['saved', 'level']);
    assert(portrait.isSavedAvatarPortrait(user.avatarPortrait));
    assert.equal(user.avatar.top, 'top.field-jacket');
    const initialPortrait = canonical(user.avatarPortrait); editor.unmount();
    outputs.push('real character save acknowledges matching PNG before level navigation');

    screen = level(); await settle(screen);
    dropStart = true;
    click(screen, 'Начать первый уровень');
    await settle(screen, () => text(screen.output).includes('Start response lost'));
    const firstId = current().id;
    const firstKey = startPosts().at(-1).body.requestId;
    click(screen, 'Начать первый уровень');
    await settle(screen, () => main(screen).props['data-level-state'] === 'task');
    assert.equal(current().id, firstId);
    assert.equal(startPosts().at(-1).body.requestId, firstKey);
    assert.deepEqual(canonical(current().equipment.avatarPortrait), initialPortrait);
    outputs.push('lost start response retries same request key without a second run');

    const firstTask = current().task;
    const wrong = firstTask.payload.options.find(option => option.label !== successChoices[firstTask.definitionId]);
    choose(screen, wrong.label); submit(screen);
    await settle(screen, () => main(screen).props['data-level-state'] === 'feedback');
    assert.equal(current().progress.answered, 1); assert.equal(current().progress.correct, 0);
    assert.match(text(screen.output), /Разберём ответ/);
    click(screen, 'Следующее задание');
    const secondTask = current().task;
    choose(screen, successChoices[secondTask.definitionId]);
    const choiceBefore = checkedRadio(screen).props['aria-checked'];
    click(screen, 'Открыть объяснение');
    await settle(screen, () => Boolean(button(screen, 'Объяснение открыто')));
    assert.equal(current().assistedTasks, 1);
    assert.equal(checkedRadio(screen).props['aria-checked'], choiceBefore);
    assert.equal(checkedTask(screen).props['data-instance-id'], secondTask.instanceId);
    const note = nodes(screen.output).find(node => node.type === 'details' && String(node.props.className).includes('level-one-note'));
    assert(note && note.props.open === undefined && note.props.onToggle === undefined && note.props.onClick === undefined);
    const noteCalls = calls.length; screen.render();
    assert.equal(calls.length, noteCalls, 'Unrelated render creates no request');
    assert(checkedRadio(screen), 'Optional note is a sibling of the selected answer');
    submit(screen); await settle(screen, () => main(screen).props['data-level-state'] === 'feedback');
    assert.equal(current().review[1].assisted, true);
    click(screen, 'Следующее задание');
    outputs.push('wrong answer is durable; help preserves choice and is recorded separately; native note has no state handler');

    // Changing the current profile cannot replace the portrait of an active run.
    user = await apiModule.api.updateAvatar({ ...user.avatar, headwear: 'headwear.beanie', hair: 'hair.wave' });
    const newerPortrait = canonical(user.avatarPortrait);
    assert.notEqual(newerPortrait.appearanceKey, initialPortrait.appearanceKey);
    screen.render({ user });
    assert.equal(nodes(screen.output).find(node => node.type === portrait.SavedAvatarPortrait).props.portrait.appearanceKey, initialPortrait.appearanceKey);
    const startsBeforeReload = startPosts().length;
    screen.unmount(); service = await createService();
    screen = level(); await settle(screen);
    assert.equal(startPosts().length, startsBeforeReload);
    assert.equal(current().progress.answered, 2);
    assert.equal(current().review.length, 2);
    assert.equal(nodes(screen.output).find(node => node.type === portrait.SavedAvatarPortrait).props.portrait.appearanceKey, initialPortrait.appearanceKey);
    choose(screen, successChoices[current().task.definitionId]); submit(screen);
    await settle(screen, () => main(screen).props['data-level-state'] === 'feedback'); click(screen, 'Следующее задание');
    outputs.push('service restart and component reload resume the same run with durable review and immutable saved portrait');

    fill(screen, '23,4');
    const numericInstance = current().task.instanceId;
    screen.unmount(); screen = level(); await settle(screen);
    assert.equal(numberInput(screen).props.value, '23,4', 'Scoped unsubmitted decimal draft survives reload');
    assert.equal(current().task.instanceId, numericInstance);
    dropAnswer = true; submit(screen);
    await settle(screen, () => Boolean(button(screen, 'Проверить сохранение')));
    assert.equal(numberInput(screen).props.value, '23,4'); assert.equal(numberInput(screen).props.disabled, true);
    const attemptsAfterLostResponse = service.equipment.store.read().attempts.length;
    click(screen, 'Отправить тот же ответ');
    await settle(screen, () => main(screen).props['data-level-state'] === 'feedback');
    assert.equal(service.equipment.store.read().attempts.length, attemptsAfterLostResponse);
    assert.equal(current().progress.answered, 4);
    const delivery = calls.filter(call => call.path.endsWith('/answer') && call.body.instanceId === numericInstance);
    assert.equal(delivery.length, 2); assert.deepEqual(delivery[0].body, delivery[1].body);
    click(screen, 'Следующее задание');
    outputs.push('comma input draft survives reload; exact payload replay recovers a persisted answer without duplicate grading');

    fill(screen, '0,8');
    const sign = nodes(screen.output).find(node => node.props?.['aria-label'] === 'Изменить знак числа');
    sign.props.onClick(); screen.render();
    assert.equal(numberInput(screen).props.value, '-0,8');
    rejectAnswer = true; submit(screen);
    await settle(screen, () => Boolean(button(screen, 'Проверить сохранение')));
    assert.equal(current().progress.answered, 4);
    click(screen, 'Проверить сохранение');
    await settle(screen, () => !numberInput(screen).props.disabled);
    assert.equal(numberInput(screen).props.value, '-0,8');
    submit(screen); await settle(screen, () => main(screen).props['data-level-state'] === 'feedback');
    click(screen, 'Следующее задание'); fill(screen, '−12.8'); submit(screen);
    await settle(screen, () => main(screen).props['data-level-state'] === 'feedback');
    assert.equal(current().status, 'completed');
    click(screen, 'Посмотреть результат');
    assert.equal(main(screen).props['data-level-state'], 'completed');
    assert.match(text(screen.output), /Первый уровень завершён/);
    assert.equal(current().progress.correct, 5);
    assert.equal(current().unassistedCorrect, 4); assert.equal(current().assistedTasks, 1);
    assert.equal(current().review.length, 6);
    assert.equal(service.equipment.getEquipment(user.id, user.avatar).stats.completedShifts, 0);
    assert.equal((await service.blitzLobby(user.id)).eligible, false);
    outputs.push('numeric fields expose Celsius in their associated labels; sign-button handler and typographic minus reach server numbers; failed unsaved answer recovers without erasing input; complete summary is accurate');

    screen.unmount(); service = await createService();
    screen = level(); await settle(screen);
    assert.equal(main(screen).props['data-level-state'], 'completed');
    assert.equal(startPosts().length, startsBeforeReload);
    const replayButton = button(screen, 'Пройти уровень ещё раз');
    replayButton.props.onClick(); replayButton.props.onClick(); screen.render();
    await settle(screen, () => main(screen).props['data-level-state'] === 'task');
    assert.equal(startPosts().length, startsBeforeReload + 1, 'Double activation starts one replay');
    assert.notEqual(current().id, firstId);
    assert.equal(current().progress.answered, 0);
    assert.deepEqual(canonical(current().equipment.avatarPortrait), newerPortrait);
    assert.equal(service.levelOneLobby(user.id).completedRuns, 1);
    screen.unmount();
    outputs.push('completed reload performs only GET; explicit replay captures new character exactly once and does not grant ordinary-shift rewards');

    // Reproduce StrictMode cleanup/setup with the obsolete request resolved last.
    const oldLobby = deferred(); heldLobby = oldLobby;
    screen = level(); await flush(screen);
    screen.strictRemount(); await settle(screen);
    assert.equal(main(screen).props['data-level-state'], 'task');
    oldLobby.reject(new Error('obsolete cancelled response')); await flush(screen);
    assert.equal(main(screen).props['data-level-state'], 'task');
    assert(!text(screen.output).includes('obsolete cancelled response'));
    choose(screen, successChoices[current().task.definitionId]);
    assert.equal(button(screen, 'Проверить ответ').props.disabled, false, 'The current task remains editable after an obsolete response');
    screen.unmount();
    outputs.push('StrictMode cleanup/setup rejects stale request writes without replacing the current task');

    hangLobby = true; screen = level(); await flush(screen);
    assert.equal(main(screen).props['data-level-state'], 'loading');
    for (const callback of [...timers.values()]) callback();
    await settle(screen, () => Boolean(button(screen, 'Повторить подключение')));
    assert.match(text(screen.output), /не ответил вовремя/);
    click(screen, 'Повторить подключение'); await settle(screen);
    assert.equal(main(screen).props['data-level-state'], 'task'); screen.unmount();
    assert.equal(timers.size, 0);
    outputs.push('finite startup timeout has a working read-only retry and releases request timers');

    const currentId = current().id;
    assert.throws(() => service.getLevelOne('another-account', currentId), error => error.status === 404);
    await assert.rejects(service.submitLevelOneAnswer('another-account', currentId, current().task.instanceId, { choiceIndex: 0 }), error => error.status === 404);
    assert.equal(Object.keys(service.equipment.store.read().shifts).length, 2);
    outputs.push('another account cannot read or answer the run');

    const files = ['apps/web/src/features/levelOne/LevelOneScreen.tsx', 'apps/web/src/features/levelOne/levelOneModel.ts', 'apps/web/src/api.ts', 'apps/web/src/features/avatar/AvatarEditor.tsx', 'apps/web/src/features/avatar/SavedAvatarPortrait.tsx', 'apps/server/src/modules/shift/shiftService.ts', 'apps/server/src/modules/shift/levelOneRules.ts', 'apps/server/src/modules/equipment/trainingStore.ts'];
    const report = { status: 'PASS', kind: 'real-handlers-and-services-in-process', checks: outputs,
      runCount: 2, completedRuns: 1, reviewedAnswers: 6, correct: 5, unassistedCorrect: 4, assistedTasks: 1,
      realModules: ['Web api.ts request serialization', 'AvatarEditor handlers', 'LevelOneScreen handlers', 'IdentityService', 'ShiftService', 'EquipmentService', 'TrainingStore', 'content-engine', 'kn01-codec'],
      limits: ['No browser, HTTP listener, native DOM, layout, pointer/keyboard execution or screenshot.', 'Hook doubles model lifecycle contracts; useLayoutEffect is an effect alias, not a paint/focus measurement.', 'In-process request routing mirrors the endpoint mapping; production HTTP dispatch and deployment are not exercised.'],
      sha256: Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) };
    const evidenceFile = process.env.SYNOPSIS_LEVEL_ONE_EVIDENCE || 'docs/testing/evidence/level-one/integration-lifecycle.json';
    fs.writeFileSync(evidenceFile, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { await fsp.rm(directory, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
