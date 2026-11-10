import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import type { PublicTaskInstance } from '@synopsis/content-engine';
import { DEFAULT_AVATAR } from '../identity/model.js';
import { ShiftService } from '../shift/shiftService.js';
import { EquipmentService, effectsAllowed, initialEquipmentUser } from './equipmentService.js';

const contentRoot = resolve(process.cwd(), '../../content');
const pencil = { ...DEFAULT_AVATAR, heldItem: 'held.pencil' };

async function fixture(now?: () => Date) {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-equipment-'));
  const storePath = join(directory, 'equipment.json');
  const attemptLogPath = join(directory, 'attempts.jsonl');
  const equipment = new EquipmentService({ storePath });
  const shifts = new ShiftService({ contentRoot, attemptLogPath, equipment, now });
  await shifts.init();
  return { directory, storePath, attemptLogPath, equipment, shifts, cleanup: () => rm(directory, { recursive: true, force: true }) };
}

/** Existing first-shift fixture answers; no educational rules are changed here. */
function correctAnswer(task: PublicTaskInstance): unknown {
  const numeric: Record<string, number> = { kn01_temp_001: 23.4, kn01_dewpoint_001: -5.2, kn01_station_pressure_001: 1021.8 };
  if (task.definitionId in numeric) return { value: numeric[task.definitionId] };
  const payload = task.payload ?? {};
  if (task.type === 'choice') {
    const options = payload.options as Array<{ id: number; label: string }>;
    return { choiceIndex: options.find((option) => option.label.startsWith('Равномерное падение давления'))!.id };
  }
  if (task.type === 'sequence') {
    const steps = payload.steps as Array<{ id: number; label: string }>;
    const labels = ['iRixhVV', 'Nddff', '1snTTT', '2snTdTdTd', '3PoPoPoPo', '4PPPP или 4a3hhh', '5appp'];
    return { order: labels.map((label) => steps.find((step) => step.label === label)!.id) };
  }
  if (task.type === 'stationPlot') return { placements: { obs_t: 'slot_01', obs_td: 'slot_02', obs_p: 'slot_03', obs_wind: 'slot_04' } };
  if (task.type === 'stationBoard') {
    const observations = payload.observations as Array<{ id: string }>;
    return { placements: Object.fromEntries(observations.map((observation) => [observation.id, observation.id.replace(/_t$/, '_nw').replace(/_td$/, '_sw')])) };
  }
  if (task.type === 'findError') return { stationId: 'qc_f' };
  if (task.type === 'dependencySequence') {
    const steps = payload.steps as Array<{ id: number; label: string }>;
    const labels = [
      'Провести критику и физический контроль исходных наблюдений',
      'Сопоставить текущий срок с предыдущим сроком и историей процесса',
      'Проанализировать поле давления и провести изобары',
      'Выделить центры В/Н и основные барические образования',
      'Проанализировать барическую тенденцию и области П/Р',
      'Проанализировать явления погоды, облачность и другие признаки воздушных масс',
      'Выполнить комплексный фронтологический анализ по совокупности признаков',
      'Проверить согласованность итогового анализа с полями и предыдущим сроком',
    ];
    return { order: labels.map((label) => steps.find((step) => step.label === label)!.id) };
  }
  throw new Error(`Missing fixture: ${task.definitionId}`);
}

async function complete(shifts: ShiftService, userId: string) {
  const started = await shifts.startShift(userId);
  let task = started.task;
  while (true) {
    const answer = correctAnswer(task);
    const result = await shifts.submitAnswer(userId, started.shiftId, task.instanceId, answer);
    assert.equal(result.feedback.correct, true);
    if (!result.nextTask) return { started, result, lastTask: task, lastAnswer: answer };
    task = result.nextTask;
  }
}

test('ownership is server-only; locked badges and unknown IDs fail; all non-practice modes have zero effects', async () => {
  const equipment = new EquipmentService();
  await equipment.init();
  const initial = equipment.getEquipment('u1', DEFAULT_AVATAR);
  assert.equal(initial.catalog.filter((badge) => badge.unlocked).length, 1);
  await assert.rejects(() => equipment.setLoadout('u1', 'badge.accuracy', DEFAULT_AVATAR), { code: 'badge_locked' });
  await assert.rejects(() => equipment.setLoadout('u1', '__proto__', DEFAULT_AVATAR), { code: 'invalid_badge' });
  await assert.rejects(() => equipment.setLoadout('u1', undefined, DEFAULT_AVATAR), { code: 'invalid_badge' });
  assert.equal(equipment.getEquipment('u2', DEFAULT_AVATAR).stats.completedShifts, 0);
  const user = initialEquipmentUser();
  user.badgeId = 'badge.regular';
  user.earned['badge.regular'] = { earnedAt: '2026-11-10T00:00:00Z', sourceShiftId: 'fixture', contentPack: 'fixture' };
  assert.equal(equipment.snapshot(user, { ...DEFAULT_AVATAR, heldItem: 'held.tablet' }, 'practice-draft').charges.reference, 2);
  for (const mode of ['ranked', 'exam', 'blitz', 'solo', 'future-mode', '']) {
    assert.equal(effectsAllowed(mode), false);
    const snapshot = equipment.snapshot(user, pencil, mode);
    assert.equal(snapshot.enabled, false);
    assert.deepEqual(snapshot.charges, { reference: 0, retry: 0 });
  }
});

test('concurrent starts resume one active shift and keep the saved starting loadout snapshot', async () => {
  const f = await fixture();
  try {
    const [one, two] = await Promise.all([f.shifts.startShift('u1', pencil), f.shifts.startShift('u1', pencil)]);
    assert.equal(one.shiftId, two.shiftId);
    assert.deepEqual(one.equipment.charges, { reference: 1, retry: 1 });
    await f.equipment.setLoadout('u1', null, DEFAULT_AVATAR);
    const resumed = await f.shifts.startShift('u1', { ...DEFAULT_AVATAR, heldItem: 'held.tablet' });
    assert.deepEqual(resumed.equipment, one.equipment);
    assert.equal(f.equipment.getEquipment('u1', DEFAULT_AVATAR).nextShift.charges.reference, 0);
    assert.throws(() => f.shifts.getResult('u2', one.shiftId), { code: 'shift_not_found' });
    await assert.rejects(() => f.shifts.openReference('u2', one.shiftId, one.task.instanceId), { code: 'shift_not_found' });
  } finally { await f.cleanup(); }
});

test('reference consumes once under race, persists on restart and excludes the task from independent achievement', async () => {
  const f = await fixture();
  try {
    const started = await f.shifts.startShift('u1');
    const [first, replay] = await Promise.all([
      f.shifts.openReference('u1', started.shiftId, started.task.instanceId),
      f.shifts.openReference('u1', started.shiftId, started.task.instanceId),
    ]);
    assert.deepEqual(replay, first);
    assert.equal(first.equipment.remaining.reference, 0);
    assert.equal(first.equipment.assistedTasks, 1);
    assert.equal(first.assisted, true);
    assert.ok(first.explanation.length > 0);
    assert.ok(first.sources.length > 0);
    assert.equal(Object.hasOwn(started.task, 'explanation'), false);
    const equipment = new EquipmentService({ storePath: f.storePath });
    const restarted = new ShiftService({ contentRoot, attemptLogPath: f.attemptLogPath, equipment });
    await restarted.init();
    const restored = await restarted.startShift('u1');
    assert.equal(restored.shiftId, started.shiftId);
    assert.equal(restored.reference?.explanation, first.explanation);
    const result = await restarted.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: 23.4 });
    assert.equal(result.feedback.assisted, true);
    assert.equal(result.progress.correct, 1);
    assert.equal(restarted.getResult('u1', started.shiftId).unassistedCorrect, 0);
    await assert.rejects(() => restarted.openReference('u1', started.shiftId, result.nextTask!.instanceId), { code: 'reference_unavailable' });
  } finally { await f.cleanup(); }
});

test('retry offer leaks no solution; explicit second attempt is once-only and never repairs first-answer score', async () => {
  const f = await fixture();
  try {
    const started = await f.shifts.startShift('u1', pencil);
    const offer = await f.shifts.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: -99 });
    assert.equal(offer.status, 'retry-offered');
    assert.equal(Object.hasOwn(offer.feedback, 'correctAnswer'), false);
    assert.equal(offer.feedback.details, null);
    assert.equal(offer.feedback.explanation, '');
    assert.deepEqual(offer.feedback.sources, []);
    assert.equal(offer.progress.answered, 0);
    assert.equal((await f.shifts.startShift('u1')).retryAvailable, true);
    assert.deepEqual(await f.shifts.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: -99 }), offer);
    await assert.rejects(() => f.shifts.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: 23.4 }), { code: 'answer_already_recorded' });
    const [answer, replay] = await Promise.all([
      f.shifts.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: 23.4 }, 2),
      f.shifts.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: 23.4 }, 2),
    ]);
    assert.deepEqual(replay, answer);
    assert.equal(answer.feedback.correct, true);
    assert.equal(answer.feedback.retried, true);
    assert.equal(answer.feedback.assisted, true);
    assert.equal(answer.feedback.firstAttemptCorrect, false);
    assert.equal(answer.progress.correct, 0);
    assert.equal(answer.progress.answered, 1);
    assert.equal(answer.equipment.remaining.retry, 0);
    assert.equal(f.equipment.store.read().attempts.length, 2);
    await assert.rejects(() => f.shifts.revealAnswer('u1', started.shiftId, started.task.instanceId), { code: 'task_instance_mismatch' });
    await assert.rejects(() => f.shifts.submitAnswer('u1', started.shiftId, answer.nextTask!.instanceId, { value: -5.2 }, 2), { code: 'retry_unavailable' });
  } finally { await f.cleanup(); }
});

test('reveal finalizes a wrong choice without consuming retry; dependency retry preserves submitted order for feedback', async () => {
  const f = await fixture();
  try {
    const started = await f.shifts.startShift('u1', pencil);
    let task = started.task;
    while (task.type !== 'choice') task = (await f.shifts.submitAnswer('u1', started.shiftId, task.instanceId, correctAnswer(task))).nextTask!;
    const correct = correctAnswer(task) as { choiceIndex: number };
    const wrong = { choiceIndex: (correct.choiceIndex + 1) % (task.payload!.options as unknown[]).length };
    assert.equal((await f.shifts.submitAnswer('u1', started.shiftId, task.instanceId, wrong)).status, 'retry-offered');
    assert.deepEqual(f.equipment.store.read().shifts[started.shiftId].pendingRetry?.firstAnswer, wrong);
    const revealed = await f.shifts.revealAnswer('u1', started.shiftId, task.instanceId);
    assert.equal(revealed.feedback.correct, false);
    assert.match(String(revealed.feedback.correctAnswer), /Равномерное падение/);
    assert.equal(revealed.equipment.remaining.retry, 1);
    assert.deepEqual(await f.shifts.revealAnswer('u1', started.shiftId, task.instanceId), revealed);
    task = revealed.nextTask!;
    while (task.type !== 'dependencySequence') task = (await f.shifts.submitAnswer('u1', started.shiftId, task.instanceId, correctAnswer(task))).nextTask!;
    const order = (correctAnswer(task) as { order: number[] }).order.reverse();
    await f.shifts.submitAnswer('u1', started.shiftId, task.instanceId, { order });
    assert.deepEqual(f.equipment.store.read().shifts[started.shiftId].pendingRetry?.firstAnswer, { order });
    const last = await f.shifts.revealAnswer('u1', started.shiftId, task.instanceId);
    assert.ok((last.feedback.details as { violations: unknown[] }).violations.length > 0);
    assert.equal(last.completed, true);
    assert.equal(last.equipment.remaining.retry, 1);
  } finally { await f.cleanup(); }
});

test('completion and earned badges commit together; result/answer replay and restart never grant twice', async () => {
  const f = await fixture();
  try {
    const finished = await complete(f.shifts, 'u1');
    assert.equal(finished.result.reward?.completedShifts, 1);
    assert.deepEqual(finished.result.reward?.newBadges.map((badge) => badge.id), ['badge.first_shift', 'badge.accuracy']);
    for (let i = 0; i < 3; i += 1) {
      assert.equal(f.shifts.getResult('u1', finished.started.shiftId).reward?.completedShifts, 1);
      assert.deepEqual(await f.shifts.submitAnswer('u1', finished.started.shiftId, finished.lastTask.instanceId, finished.lastAnswer), finished.result);
    }
    await f.equipment.setLoadout('u1', 'badge.accuracy', pencil);
    const equipment = new EquipmentService({ storePath: f.storePath });
    const restarted = new ShiftService({ contentRoot, attemptLogPath: f.attemptLogPath, equipment });
    await restarted.init();
    assert.deepEqual(await restarted.submitAnswer('u1', finished.started.shiftId, finished.lastTask.instanceId, finished.lastAnswer), finished.result);
    assert.equal(equipment.getEquipment('u1', DEFAULT_AVATAR).stats.completedShifts, 1);
    assert.equal(equipment.getEquipment('u1', DEFAULT_AVATAR).loadout.badgeId, 'badge.accuracy');
    assert.equal(equipment.getEquipment('u2', DEFAULT_AVATAR).catalog.find((badge) => badge.id === 'badge.accuracy')?.unlocked, false);
    const next = await restarted.startShift('u1', pencil);
    assert.notEqual(next.shiftId, finished.started.shiftId);
    assert.deepEqual(next.equipment.charges, { reference: 1, retry: 2 });
    const persisted = JSON.parse(await readFile(f.storePath, 'utf8'));
    assert.equal(persisted.users.u1.earned['badge.accuracy'].sourceShiftId, finished.started.shiftId);
    assert.equal(persisted.users.u1.earned['badge.accuracy'].contentPack, 'core_ru_001@0.6.0');
  } finally { await f.cleanup(); }
});

test('regularity counts distinct server UTC dates and does not require consecutive days', async () => {
  let now = new Date('2026-11-10T23:59:00Z');
  const f = await fixture(() => now);
  try {
    await complete(f.shifts, 'u1');
    await complete(f.shifts, 'u1');
    assert.equal(f.equipment.getEquipment('u1', DEFAULT_AVATAR).stats.practiceDays, 1);
    now = new Date('2026-11-11T00:01:00Z');
    await complete(f.shifts, 'u1');
    assert.equal(f.equipment.getEquipment('u1', DEFAULT_AVATAR).catalog.find((badge) => badge.id === 'badge.regular')!.unlocked, false);
    now = new Date('2026-11-15T10:00:00Z');
    const last = await complete(f.shifts, 'u1');
    assert.deepEqual(last.result.reward?.newBadges.map((badge) => badge.id), ['badge.regular']);
    assert.equal(last.result.reward?.practiceDays, 3);
  } finally { await f.cleanup(); }
});

test('a failed completion write preserves the current task and rewards; next write and replay recover safely', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-equipment-failure-'));
  let fail = false;
  const snapshots: string[] = [];
  const equipment = new EquipmentService({ writeSnapshot: async (snapshot) => { if (fail) throw new Error('injected disk full'); snapshots.push(snapshot); } });
  const shifts = new ShiftService({ contentRoot, attemptLogPath: join(directory, 'attempts.jsonl'), equipment });
  try {
    await shifts.init();
    const started = await shifts.startShift('u1');
    let task = started.task;
    while (task.type !== 'dependencySequence') task = (await shifts.submitAnswer('u1', started.shiftId, task.instanceId, correctAnswer(task))).nextTask!;
    const before = equipment.store.read();
    const writesBefore = snapshots.length;
    fail = true;
    await assert.rejects(() => shifts.submitAnswer('u1', started.shiftId, task.instanceId, correctAnswer(task)), /disk full/);
    assert.deepEqual(equipment.store.read(), before);
    assert.equal(snapshots.length, writesBefore);
    assert.equal(equipment.getEquipment('u1', DEFAULT_AVATAR).stats.completedShifts, 0);
    fail = false;
    const result = await shifts.submitAnswer('u1', started.shiftId, task.instanceId, correctAnswer(task));
    assert.equal(result.completed, true);
    assert.equal(equipment.getEquipment('u1', DEFAULT_AVATAR).stats.completedShifts, 1);
    assert.equal(equipment.store.read().attempts.length, 10);
    fail = true;
    assert.deepEqual(await shifts.submitAnswer('u1', started.shiftId, task.instanceId, correctAnswer(task)), result);
    assert.equal(equipment.store.read().attempts.length, 10);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('real atomic rename failure rolls back memory; malformed existing store fails closed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-equipment-corrupt-'));
  const storePath = join(directory, 'equipment.json');
  try {
    const equipment = new EquipmentService({ storePath });
    await equipment.init();
    await mkdir(storePath);
    await assert.rejects(() => equipment.setLoadout('u1', null, DEFAULT_AVATAR));
    assert.equal(equipment.getEquipment('u1', DEFAULT_AVATAR).loadout.badgeId, 'badge.training_starter');
    await rm(storePath, { recursive: true });
    await equipment.setLoadout('u1', null, DEFAULT_AVATAR);
    assert.equal(equipment.getEquipment('u1', DEFAULT_AVATAR).loadout.badgeId, null);
    for (const malformed of ['{broken', JSON.stringify({ version: 1, users: { u1: { completedShifts: -1 } }, shifts: {}, attempts: [] })]) {
      await writeFile(storePath, malformed);
      await assert.rejects(() => new EquipmentService({ storePath }).init());
      assert.equal(await readFile(storePath, 'utf8'), malformed);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('audit-file outage does not lose a committed answer; restart reconstructs its audit projection once', async () => {
  const f = await fixture();
  try {
    const started = await f.shifts.startShift('u1');
    await mkdir(f.attemptLogPath);
    const result = await f.shifts.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: 23.4 });
    assert.equal(result.progress.correct, 1);
    assert.equal(f.equipment.store.read().attempts.length, 1);
    await rm(f.attemptLogPath, { recursive: true });
    const equipment = new EquipmentService({ storePath: f.storePath });
    const restarted = new ShiftService({ contentRoot, attemptLogPath: f.attemptLogPath, equipment });
    await restarted.init();
    const records = (await readFile(f.attemptLogPath, 'utf8')).trim().split('\n');
    assert.equal(records.length, 1);
    assert.equal(JSON.parse(records[0]).correct, true);
    await restarted.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: 23.4 });
    assert.equal((await readFile(f.attemptLogPath, 'utf8')).trim().split('\n').length, 1);
  } finally { await f.cleanup(); }
});

test('corrupt replay containers, pending retry or audit IDs fail closed without replacing the saved file', async () => {
  const f = await fixture();
  try {
    const started = await f.shifts.startShift('u1', pencil);
    await f.shifts.openReference('u1', started.shiftId, started.task.instanceId);
    await f.shifts.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: -99 });
    const saved = await readFile(f.storePath, 'utf8');
    const state = JSON.parse(saved);
    const shift = state.shifts[started.shiftId];
    // Named properties on arrays disappear in JSON.stringify, silently losing
    // spent-reference/replay evidence if these containers are accepted on load.
    const corruptions = [
      ...[{ responses: [] }, { references: [] }, { pendingRetry: { instanceId: 'another-task' } }]
        .map((change) => ({ ...state, shifts: { ...state.shifts, [started.shiftId]: { ...shift, ...change } } })),
      { ...state, attempts: [{}] },
      { ...state, attempts: [state.attempts[0], state.attempts[0]] },
    ];
    for (const corrupted of corruptions) {
      const input = JSON.stringify(corrupted);
      await writeFile(f.storePath, input);
      await assert.rejects(() => new EquipmentService({ storePath: f.storePath }).init(), /Поврежд/);
      assert.equal(await readFile(f.storePath, 'utf8'), input);
    }
    await writeFile(f.storePath, saved);
    const equipment = new EquipmentService({ storePath: f.storePath });
    const restarted = new ShiftService({ contentRoot, attemptLogPath: f.attemptLogPath, equipment });
    await restarted.init();
    const resumed = await restarted.startShift('u1', DEFAULT_AVATAR);
    assert.equal(resumed.retryAvailable, true);
    assert.equal(resumed.equipment.remaining.reference, 0);
    assert.equal(resumed.equipment.remaining.retry, 1);
    const result = await restarted.submitAnswer('u1', started.shiftId, started.task.instanceId, { value: 23.4 }, 2);
    assert.equal(result.feedback.retried, true);
    assert.equal(result.equipment.remaining.retry, 0);
    assert.equal(result.progress.correct, 0);
  } finally { await f.cleanup(); }
});
