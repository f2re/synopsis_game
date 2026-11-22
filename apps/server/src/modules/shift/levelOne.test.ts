import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { assertPublicTaskSafe, type PublicTaskInstance } from '@synopsis/content-engine';
import { DEFAULT_AVATAR, type AvatarProfile } from '../identity/model.js';
import { EquipmentService } from '../equipment/equipmentService.js';
import { TrainingStore } from '../equipment/trainingStore.js';
import { ShiftError, ShiftService } from './shiftService.js';
import { LEVEL_ONE_MODE, LEVEL_ONE_TASK_IDS, type LevelOneSessionView } from './levelOneRules.js';

const CONTENT_ROOT = resolve(process.cwd(), '../../content');
const NEW_AVATAR: AvatarProfile = { ...DEFAULT_AVATAR, top: 'top.field-jacket', headwear: 'headwear.beanie' };
const START_KEY = 'first-level-request-0001';

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-level-one-'));
  const storePath = join(directory, 'training.json');
  const attemptLogPath = join(directory, 'attempts.jsonl');
  const create = async () => {
    const equipment = new EquipmentService({ storePath });
    const service = new ShiftService({ contentRoot: CONTENT_ROOT, attemptLogPath, equipment });
    await service.init();
    return service;
  };
  return { directory, storePath, attemptLogPath, service: await create(), create,
    cleanup: () => rm(directory, { recursive: true, force: true }) };
}

function answerFor(task: PublicTaskInstance) {
  const choices: Record<string, string> = {
    tmpl_c1_aaxx_header: 'Сводка погоды с наземной метеорологической станции',
    tmpl_c2_temp_vs_dewpoint: '1 — температура воздуха, 2 — точка росы',
    tmpl_c2_sign_bit_sn: 'sn = 1',
  };
  if (task.response.kind === 'choice') {
    const options = task.payload?.options as Array<{ id: number; label: string }>;
    const option = options.find((item) => item.label === choices[task.definitionId]);
    assert.ok(option, `Author-approved choice exists for ${task.definitionId}`);
    return { choiceIndex: option.id };
  }
  const values: Record<string, number> = {
    tmpl_c2_positive_temp: 23.4,
    tmpl_c2_negative_dewpoint: -0.8,
    tmpl_c2_encode_temp: -12.8,
  };
  assert.ok(Object.hasOwn(values, task.definitionId));
  return { value: values[task.definitionId] };
}

async function finish(service: ShiftService, userId: string, initial: LevelOneSessionView) {
  let session = initial;
  while (session.task) {
    const result = await service.submitLevelOneAnswer(userId, session.id, session.task.instanceId, answerFor(session.task));
    assert.equal(result.feedback.correct, true);
    session = result.session;
  }
  return session;
}

test('лобби первого уровня ничего не создаёт; выдача содержит только текущую задачу без эталонов', async () => {
  const f = await fixture();
  try {
    const lobby = f.service.levelOneLobby('student');
    assert.equal(lobby.session, null);
    assert.equal(lobby.completedRuns, 0);
    assert.equal(lobby.total, 6);
    assert.deepEqual(f.service.equipment.store.read().users, {});
    assert.deepEqual(f.service.equipment.store.read().shifts, {});
    const started = await f.service.startLevelOne('student', DEFAULT_AVATAR, START_KEY);
    assert.equal(started.mode, LEVEL_ONE_MODE);
    assert.equal(started.contentPack, 'kn01_level1_pack@1.0.0');
    assert.equal(started.contentStatus, 'approved');
    assert.equal(started.status, 'active');
    assert.equal(started.task?.definitionId, 'tmpl_c1_aaxx_header');
    assert.deepEqual(started.review, []);
    assertPublicTaskSafe(started.task!);
    const publicKeys = JSON.stringify(started);
    for (const hidden of ['canonicalByPublic', 'correct_order', 'correctAnswer', 'tmpl_c2_positive_temp']) assert.equal(publicKeys.includes(hidden), false);
  } finally { await f.cleanup(); }
});

test('конкурентный старт и возвращение сохраняют одну попытку и первоначальный портрет', async () => {
  const f = await fixture();
  try {
    const [first, second] = await Promise.all([
      f.service.startLevelOne('student', DEFAULT_AVATAR, START_KEY),
      f.service.startLevelOne('student', NEW_AVATAR, 'first-level-request-0002'),
    ]);
    assert.equal(second.id, first.id);
    assert.deepEqual(second.equipment, first.equipment);
    assert.deepEqual(second.equipment.avatarSnapshot, DEFAULT_AVATAR);
    const result = await f.service.submitLevelOneAnswer('student', first.id, first.task!.instanceId, answerFor(first.task!));
    const resumed = await f.service.startLevelOne('student', NEW_AVATAR, 'first-level-request-0003');
    assert.equal(resumed.task?.instanceId, result.session.task?.instanceId);
    assert.equal(resumed.progress.answered, 1);
    assert.deepEqual(resumed.equipment.avatarPortrait, first.equipment.avatarPortrait);
    assert.equal(Object.keys(f.service.equipment.store.read().shifts).length, 1);
  } finally { await f.cleanup(); }
});

test('справка бесплатна для каждого задания, сохраняется и честно отмечает помощь', async () => {
  const f = await fixture();
  try {
    let session = await f.service.startLevelOne('student', DEFAULT_AVATAR, START_KEY);
    const originalEquipment = structuredClone(session.equipment);
    for (let index = 0; index < LEVEL_ONE_TASK_IDS.length; index++) {
      const task = session.task!;
      const reference = await f.service.openLevelOneReference('student', session.id, task.instanceId);
      const replay = await f.service.openLevelOneReference('student', session.id, task.instanceId);
      assert.equal(reference.explanation.length > 0, true);
      assert.deepEqual(replay, reference);
      assert.deepEqual(reference.equipment.remaining, { reference: 0, retry: 0 });
      const recovered = f.service.getLevelOne('student', session.id);
      assert.equal(recovered.reference?.instanceId, task.instanceId);
      assert.equal(recovered.assistedTasks, index + 1);
      const result = await f.service.submitLevelOneAnswer('student', session.id, task.instanceId, answerFor(task));
      assert.equal(result.feedback.assisted, true);
      session = result.session;
    }
    assert.equal(session.status, 'completed');
    assert.equal(session.progress.correct, 6);
    assert.equal(session.unassistedCorrect, 0);
    assert.equal(session.review.every((item) => item.assisted), true);
    assert.deepEqual(session.equipment.avatarPortrait, originalEquipment.avatarPortrait);
    const restarted = await f.create();
    assert.deepEqual(restarted.getLevelOne('student', session.id), session);
  } finally { await f.cleanup(); }
});

test('завершение сохраняет разбор, но не даёт награды обычной смены и не открывает блиц', async () => {
  const f = await fixture();
  try {
    const started = await f.service.startLevelOne('student', DEFAULT_AVATAR, START_KEY);
    const complete = await finish(f.service, 'student', started);
    assert.equal(complete.status, 'completed');
    assert.equal(complete.progress.answered, 6);
    assert.equal(complete.progress.correct, 6);
    assert.equal(complete.unassistedCorrect, 6);
    assert.equal(complete.task, null);
    assert.ok(complete.completedAt);
    assert.deepEqual(complete.review.map((item) => item.definitionId), [...LEVEL_ONE_TASK_IDS]);
    assert.equal(complete.review.every((item) => item.explanation.length > 0 && item.sources.length > 0), true);
    const equipment = f.service.equipment.getEquipment('student', DEFAULT_AVATAR);
    assert.equal(equipment.stats.completedShifts, 0);
    assert.equal(equipment.stats.unassistedCorrect, 0);
    assert.equal(equipment.catalog.filter((badge) => badge.unlocked).length, 1);
    assert.equal((await f.service.blitzLobby('student')).eligible, false);
    assert.equal(f.service.equipment.store.read().shifts[complete.id].reward, undefined);
    const lobby = f.service.levelOneLobby('student');
    assert.equal(lobby.completedRuns, 1);
    assert.equal(lobby.bestCorrect, 6);
    assert.deepEqual(lobby.session, complete);
    const replay = await f.service.startLevelOne('student', NEW_AVATAR, START_KEY);
    assert.deepEqual(replay, complete);
    const again = await f.service.startLevelOne('student', NEW_AVATAR, 'explicit-repeat-0001');
    assert.notEqual(again.id, complete.id);
    assert.deepEqual(again.equipment.avatarSnapshot, NEW_AVATAR);
    assert.equal(again.progress.answered, 0);
    assert.equal(f.service.levelOneLobby('student').completedRuns, 1);
  } finally { await f.cleanup(); }
});

test('неверный ответ имеет сохранённый разбор; повтор доставки не пишет попытку дважды', async () => {
  const f = await fixture();
  try {
    const started = await f.service.startLevelOne('student', DEFAULT_AVATAR, START_KEY);
    const right = answerFor(started.task!) as { choiceIndex: number };
    const submitted = { choiceIndex: (right.choiceIndex + 1) % 4 };
    const result = await f.service.submitLevelOneAnswer('student', started.id, started.task!.instanceId, submitted);
    assert.equal(result.feedback.correct, false);
    assert.equal(result.session.progress.correct, 0);
    assert.equal(result.session.review[0].correct, false);
    assert.ok(result.session.review[0].explanation);
    const replay = await f.service.submitLevelOneAnswer('student', started.id, started.task!.instanceId, submitted);
    assert.deepEqual(replay, result);
    await assert.rejects(f.service.submitLevelOneAnswer('student', started.id, started.task!.instanceId, right),
      (error: unknown) => error instanceof ShiftError && error.code === 'answer_already_recorded');
    assert.equal(f.service.equipment.store.read().attempts.length, 1);
    const log = (await readFile(f.attemptLogPath, 'utf8')).trim().split('\n');
    assert.equal(log.length, 1);
  } finally { await f.cleanup(); }
});

test('перезапуск сервиса восстанавливает уровень, текущую справку и ответ после потери связи', async () => {
  const f = await fixture();
  try {
    const started = await f.service.startLevelOne('student', DEFAULT_AVATAR, START_KEY);
    const submitted = answerFor(started.task!);
    const result = await f.service.submitLevelOneAnswer('student', started.id, started.task!.instanceId, submitted);
    await f.service.openLevelOneReference('student', started.id, result.session.task!.instanceId);
    const recovered = await f.create();
    const current = recovered.levelOneLobby('student').session!;
    assert.equal(current.id, started.id);
    assert.equal(current.progress.answered, 1);
    assert.equal(current.reference?.instanceId, result.session.task!.instanceId);
    const replay = await recovered.submitLevelOneAnswer('student', started.id, started.task!.instanceId, submitted);
    assert.equal(replay.session.reference?.instanceId, current.reference?.instanceId);
    assert.deepEqual(replay.feedback, result.feedback);
    assert.equal(recovered.equipment.store.read().attempts.length, 1);
  } finally { await f.cleanup(); }
});

test('пользователь и режим изолированы; некорректный ввод не расходует задание', async () => {
  const f = await fixture();
  try {
    const level = await f.service.startLevelOne('owner', DEFAULT_AVATAR, START_KEY);
    const practice = await f.service.startShift('owner');
    assert.notEqual(level.id, practice.shiftId);
    assert.throws(() => f.service.getLevelOne('stranger', level.id), (error: unknown) => error instanceof ShiftError && error.status === 404);
    await assert.rejects(f.service.submitLevelOneAnswer('stranger', level.id, level.task!.instanceId, answerFor(level.task!)),
      (error: unknown) => error instanceof ShiftError && error.status === 404);
    await assert.rejects(f.service.openLevelOneReference('stranger', level.id, level.task!.instanceId),
      (error: unknown) => error instanceof ShiftError && error.status === 404);
    assert.throws(() => f.service.getLevelOne('owner', practice.shiftId), (error: unknown) => error instanceof ShiftError && error.code === 'level_not_found');
    await assert.rejects(f.service.submitAnswer('owner', level.id, level.task!.instanceId, answerFor(level.task!)),
      (error: unknown) => error instanceof ShiftError && error.code === 'shift_mode_mismatch');
    for (const bad of [null, {}, { choiceIndex: -1 }, { choiceIndex: 100 }, { choiceIndex: '0' }]) {
      await assert.rejects(f.service.submitLevelOneAnswer('owner', level.id, level.task!.instanceId, bad),
        (error: unknown) => error instanceof ShiftError && error.code === 'invalid_answer');
    }
    assert.equal(f.service.getLevelOne('owner', level.id).progress.answered, 0);
    assert.equal(f.service.equipment.store.read().attempts.length, 0);
    const resumedPractice = await f.service.startShift('owner');
    assert.equal(resumedPractice.shiftId, practice.shiftId);
    assert.equal(resumedPractice.progress.total, 10);
  } finally { await f.cleanup(); }
});

test('повреждённый разбор или случайная награда первого уровня не принимаются при восстановлении', async () => {
  const f = await fixture();
  try {
    const session = await f.service.startLevelOne('student', DEFAULT_AVATAR, START_KEY);
    await f.service.submitLevelOneAnswer('student', session.id, session.task!.instanceId, answerFor(session.task!));
    const original = JSON.parse(await readFile(f.storePath, 'utf8'));
    for (const mutation of ['review', 'reward', 'duplicate-active']) {
      const state = structuredClone(original);
      if (mutation === 'review') state.shifts[session.id].levelOne.review[0].correct = false;
      if (mutation === 'reward') state.shifts[session.id].reward = { newBadges: [], completedShifts: 1, unassistedCorrect: 1, practiceDays: 1 };
      if (mutation === 'duplicate-active') {
        const copy = structuredClone(state.shifts[session.id]);
        copy.id = 'duplicate'; copy.currentIndex = 0; copy.correct = 0; copy.unassistedCorrect = 0;
        copy.levelOne.review = []; copy.responses = {}; copy.levelOne.requestIds = ['duplicate-request-0001'];
        state.shifts.duplicate = copy;
      }
      const damaged = join(f.directory, `damaged-${mutation}.json`);
      await writeFile(damaged, JSON.stringify(state));
      await assert.rejects(new TrainingStore({ storePath: damaged }).init(), /первого уровня|первых уровней/);
    }
  } finally { await f.cleanup(); }
});

test('пакет без методического допуска не запускает первый уровень', async () => {
  const f = await fixture();
  try {
    const contentRoot = join(f.directory, 'content');
    await cp(CONTENT_ROOT, contentRoot, { recursive: true });
    const path = join(contentRoot, 'packs/kn01_level1.json');
    const pack = JSON.parse(await readFile(path, 'utf8'));
    pack.review.publication_allowed = false;
    await writeFile(path, JSON.stringify(pack));
    const service = new ShiftService({ contentRoot, attemptLogPath: join(f.directory, 'blocked-attempts.jsonl') });
    await assert.rejects(service.init(), /принятого и независимо проверенного/);
  } finally { await f.cleanup(); }
});

test('пустое или нечисловое значение не превращается в проверенный ноль', async () => {
  const f = await fixture();
  try {
    let session = await f.service.startLevelOne('student', DEFAULT_AVATAR, START_KEY);
    for (let index = 0; index < 3; index++) {
      session = (await f.service.submitLevelOneAnswer('student', session.id, session.task!.instanceId, answerFor(session.task!))).session;
    }
    assert.equal(session.task?.response.kind, 'numeric');
    for (const submitted of [{ value: null }, { value: '' }, { value: '23.4' }, { value: NaN }, { value: Infinity }, {}]) {
      await assert.rejects(f.service.submitLevelOneAnswer('student', session.id, session.task!.instanceId, submitted),
        (error: unknown) => error instanceof ShiftError && error.code === 'invalid_answer');
    }
    assert.equal(f.service.getLevelOne('student', session.id).progress.answered, 3);
    const zero = await f.service.submitLevelOneAnswer('student', session.id, session.task!.instanceId, { value: 0 });
    assert.equal(zero.feedback.correct, false);
    assert.equal(zero.session.review.at(-1)?.answer, 0);
    assert.equal(zero.session.progress.answered, 4);
  } finally { await f.cleanup(); }
});

test('сбой сохранения не создаёт прохождение и не принимает последний ответ; повтор восстанавливает запись', async () => {
  const f = await fixture();
  try {
    let rejectWrites = true;
    let writes = 0;
    const equipment = new EquipmentService({ writeSnapshot: async () => {
      writes++;
      if (rejectWrites) throw new Error('Test storage unavailable');
    } });
    const service = new ShiftService({ contentRoot: CONTENT_ROOT, attemptLogPath: join(f.directory, 'atomic-attempts.jsonl'), equipment });
    await service.init();
    await assert.rejects(service.startLevelOne('student', DEFAULT_AVATAR, START_KEY), /Test storage unavailable/);
    assert.deepEqual(equipment.store.read().shifts, {});
    rejectWrites = false;
    let session = await service.startLevelOne('student', DEFAULT_AVATAR, START_KEY);
    for (let index = 0; index < 5; index++) {
      session = (await service.submitLevelOneAnswer('student', session.id, session.task!.instanceId, answerFor(session.task!))).session;
    }
    const lastTask = session.task!;
    const answer = answerFor(lastTask);
    rejectWrites = true;
    await assert.rejects(service.submitLevelOneAnswer('student', session.id, lastTask.instanceId, answer), /Test storage unavailable/);
    assert.equal(service.getLevelOne('student', session.id).progress.answered, 5);
    assert.equal(service.getLevelOne('student', session.id).status, 'active');
    assert.equal(equipment.store.read().attempts.length, 5);
    rejectWrites = false;
    const result = await service.submitLevelOneAnswer('student', session.id, lastTask.instanceId, answer);
    assert.equal(result.session.status, 'completed');
    assert.equal(equipment.store.read().attempts.length, 6);
    rejectWrites = true;
    const committedWrites = writes;
    assert.deepEqual(await service.submitLevelOneAnswer('student', session.id, lastTask.instanceId, answer), result);
    assert.deepEqual(await service.startLevelOne('student', NEW_AVATAR, START_KEY), result.session);
    assert.equal(writes, committedWrites, 'Replaying a saved result needs no new durable write');
    assert.equal(equipment.getEquipment('student', DEFAULT_AVATAR).stats.completedShifts, 0);
  } finally { await f.cleanup(); }
});
