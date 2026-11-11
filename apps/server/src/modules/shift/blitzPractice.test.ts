import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import type { PublicTaskInstance } from '@synopsis/content-engine';
import { EquipmentService } from '../equipment/equipmentService.js';
import { DEFAULT_AVATAR } from '../identity/model.js';
import { ShiftService } from './shiftService.js';
import { BLITZ_DURATION_MS, BLITZ_RULES_VERSION, BLITZ_TASK_IDS } from './blitzRules.js';

const contentRoot = resolve(process.cwd(), '../../content');
const startTime = Date.parse('2026-11-11T12:00:00.000Z');
const requestId = (suffix = 'one') => `blitz-request-20261111-${suffix}`;
const hasCode = (code: string) => (error: unknown) => (error as { code?: string }).code === code;

/** Valid input shapes taken from the actual public task; correctness stays with the content checker. */
function answerFor(task: PublicTaskInstance): unknown {
  const payload = task.payload as Record<string, unknown>;
  if (task.response.kind === 'numeric') return { value: 0 };
  if (task.response.kind === 'choice') return { choiceIndex: (payload.options as Array<{ id: number }>)[0].id };
  if (task.response.kind === 'sequence' || task.response.kind === 'dependencySequence') return { order: (payload.steps as Array<{ id: number }>).map((step) => step.id) };
  if (task.response.kind === 'findError') return { stationId: (payload.stations as Array<{ id: string }>)[0].id };
  const slots = payload.slots as Array<{ id: string }>;
  return { placements: Object.fromEntries((payload.observations as Array<{ id: string }>).map((observation, index) => [observation.id, slots[index % slots.length].id])) };
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-blitz-'));
  const storePath = join(directory, 'training.json');
  const attemptLogPath = join(directory, 'attempts.jsonl');
  let now = startTime;
  const create = async () => {
    const service = new ShiftService({ contentRoot, attemptLogPath, equipment: new EquipmentService({ storePath }), now: () => new Date(now) });
    await service.init();
    return service;
  };
  const service = await create();
  const qualify = async (userId = 'student-one') => {
    const started = await service.startShift(userId);
    let task: PublicTaskInstance | null = started.task;
    while (task) task = (await service.submitAnswer(userId, started.shiftId, task.instanceId, answerFor(task))).nextTask;
  };
  return { service, qualify, create, storePath, attemptLogPath, setNow: (value: number) => { now = value; }, dispose: () => rm(directory, { recursive: true, force: true }) };
}

test('блиц открывается по завершению настоящей учебной смены; черновой пакет и правила обозначены', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.service.blitzLobby('student-one')).eligible, false);
    await assert.rejects(f.service.startBlitz('student-one', DEFAULT_AVATAR, requestId()), hasCode('blitz_practice_locked'));
    await assert.rejects(f.service.startBlitz('student-one', DEFAULT_AVATAR, ''), hasCode('invalid_request_id'));
    await f.qualify();
    const lobby = await f.service.blitzLobby('student-one');
    assert.equal(lobby.eligible, true);
    assert.equal(lobby.completedShifts, 1);
    assert.equal(lobby.contentStatus, 'draft');
    assert.equal(lobby.rulesVersion, BLITZ_RULES_VERSION);
    assert.equal(lobby.total, 6);
    assert.equal(lobby.durationSeconds, 90);
    assert.equal(lobby.session, null);
  } finally { await f.dispose(); }
});

test('параллельные старты дают один раунд, один срок и неизменный полный комплект', async () => {
  const f = await fixture();
  try {
    await f.qualify();
    const avatar = { ...DEFAULT_AVATAR, footwear: 'footwear.boots', top: 'top.field-jacket', heldItem: 'held.pencil', companion: 'companion.tit' };
    const sessions = await Promise.all(Array.from({ length: 8 }, (_, index) => f.service.startBlitz('student-one', avatar, requestId(String(index)))));
    assert.equal(new Set(sessions.map((session) => session.id)).size, 1);
    const started = sessions[0];
    assert.equal(Date.parse(started.deadlineAt) - Date.parse(started.startedAt), BLITZ_DURATION_MS);
    assert.deepEqual(started.avatarSnapshot, avatar);
    assert.deepEqual(started.equipment.charges, { reference: 0, retry: 0 });
    assert.equal(started.equipment.enabled, false);
    avatar.footwear = 'footwear.sneakers';
    f.setNow(startTime + 20_000);
    const resumed = await f.service.startBlitz('student-one', DEFAULT_AVATAR, requestId('other-tab'));
    assert.equal(resumed.id, started.id);
    assert.equal(resumed.deadlineAt, started.deadlineAt);
    assert.equal(resumed.avatarSnapshot.footwear, 'footwear.boots');
    assert.equal(Object.keys(resumed.avatarSnapshot).length, 11);
    assert.equal(JSON.stringify(resumed.task).includes('correctAnswer'), false);
    assert.equal(JSON.stringify(resumed.task).includes('23.4'), false);
    const practice = await f.service.startShift('student-one');
    assert.notEqual(practice.shiftId, started.id);
    assert.equal(practice.mode, 'practice-draft');
    f.setNow(startTime + 100_000);
    const secondTabReplay = await f.service.startBlitz('student-one', DEFAULT_AVATAR, requestId('7'));
    assert.equal(secondTabReplay.id, started.id);
    assert.equal(secondTabReplay.status, 'completed');
  } finally { await f.dispose(); }
});

test('повтор и конкурирующая отправка ответа фиксируются ровно один раз; другой ответ и чужой аккаунт отклонены', async () => {
  const f = await fixture();
  try {
    await f.qualify();
    const started = await f.service.startBlitz('student-one', DEFAULT_AVATAR, requestId());
    const task = started.task!;
    const before = f.service.equipment.store.read().attempts.length;
    await assert.rejects(f.service.submitBlitzAnswer('student-one', started.id, `${started.id}:2`, { value: 0 }), hasCode('task_instance_mismatch'));
    const submitted = answerFor(task);
    const results = await Promise.all(Array.from({ length: 6 }, () => f.service.submitBlitzAnswer('student-one', started.id, task.instanceId, submitted)));
    for (const result of results) {
      assert.equal(result.accepted, true);
      assert.equal(result.session.progress.answered, 1);
    }
    assert.equal(f.service.equipment.store.read().attempts.length, before + 1);
    await assert.rejects(f.service.submitBlitzAnswer('student-one', started.id, task.instanceId, { value: 1 }), hasCode('answer_already_recorded'));
    await assert.rejects(f.service.getBlitz('student-two', started.id), hasCode('shift_not_found'));
    await assert.rejects(f.service.submitBlitzAnswer('student-two', started.id, task.instanceId, submitted), hasCode('shift_not_found'));
    assert.equal((await f.service.blitzLobby('student-two')).session, null);
  } finally { await f.dispose(); }
});

test('граница 90 секунд принадлежит серверу; поздний ответ не учитывается, повтор принятого ответа не меняет итог', async () => {
  const f = await fixture();
  try {
    await f.qualify();
    const started = await f.service.startBlitz('student-one', DEFAULT_AVATAR, requestId());
    f.setNow(startTime + BLITZ_DURATION_MS - 1);
    const first = await f.service.submitBlitzAnswer('student-one', started.id, started.task!.instanceId, answerFor(started.task!));
    assert.equal(first.accepted, true);
    const next = first.session.task!;
    f.setNow(startTime + BLITZ_DURATION_MS);
    const late = await f.service.submitBlitzAnswer('student-one', started.id, next.instanceId, answerFor(next));
    assert.equal(late.accepted, false);
    assert.equal(late.session.status, 'completed');
    assert.equal(late.session.finishReason, 'timeout');
    assert.equal(late.session.completedAt, started.deadlineAt);
    assert.equal(late.session.progress.answered, 1);
    assert.equal(late.session.review.length, 1);
    assert.equal(late.session.task, null);
    const replay = await f.service.submitBlitzAnswer('student-one', started.id, started.task!.instanceId, answerFor(started.task!));
    assert.equal(replay.accepted, true);
    assert.deepEqual(replay.session, late.session);
    const disk = JSON.parse(await readFile(f.storePath, 'utf8'));
    assert.equal(disk.shifts[started.id].completedAt, started.deadlineAt);
    const audit = (await readFile(f.attemptLogPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(audit.filter((entry) => entry.shiftId === started.id).length, 1);
  } finally { await f.dispose(); }
});

test('перезапуск восстанавливает ответы и снимок одежды без добавления времени; закрытая вкладка не ставит паузу', async () => {
  const f = await fixture();
  try {
    await f.qualify();
    const started = await f.service.startBlitz('student-one', { ...DEFAULT_AVATAR, backpack: 'backpack.field' }, requestId());
    f.setNow(startTime + 20_000);
    await f.service.submitBlitzAnswer('student-one', started.id, started.task!.instanceId, answerFor(started.task!));
    f.setNow(startTime + 35_000);
    const restarted = await f.create();
    const resumed = await restarted.getBlitz('student-one', started.id);
    assert.equal(resumed.status, 'active');
    assert.equal(resumed.progress.answered, 1);
    assert.equal(resumed.deadlineAt, started.deadlineAt);
    assert.deepEqual(resumed.avatarSnapshot, started.avatarSnapshot);
    f.setNow(startTime + 100_000);
    const nextRestart = await f.create();
    const expired = (await nextRestart.blitzLobby('student-one')).session!;
    assert.equal(expired.status, 'completed');
    assert.equal(expired.completedAt, started.deadlineAt);
    assert.equal(expired.progress.answered, 1);
    const startReplay = await nextRestart.startBlitz('student-one', DEFAULT_AVATAR, requestId());
    assert.equal(startReplay.id, started.id);
    assert.equal(startReplay.status, 'completed');
    const newRound = await nextRestart.startBlitz('student-one', DEFAULT_AVATAR, requestId('next'));
    assert.notEqual(newRound.id, started.id);
    assert.equal(newRound.startedAt, new Date(startTime + 100_000).toISOString());
  } finally { await f.dispose(); }
});

test('шесть исходных заданий завершают блиц без наград, справки, повторов и обхода через API смены', async () => {
  const f = await fixture();
  try {
    await f.qualify();
    const before = f.service.equipment.store.read().users['student-one'];
    let session = await f.service.startBlitz('student-one', { ...DEFAULT_AVATAR, heldItem: 'held.map-folder' }, requestId());
    const id = session.id;
    const instanceId = session.task!.instanceId;
    await assert.rejects(f.service.openReference('student-one', id, instanceId), hasCode('shift_mode_mismatch'));
    await assert.rejects(f.service.revealAnswer('student-one', id, instanceId), hasCode('shift_mode_mismatch'));
    await assert.rejects(f.service.submitAnswer('student-one', id, instanceId, { value: 0 }, 1), hasCode('shift_mode_mismatch'));
    await assert.rejects(f.service.submitAnswer('student-one', id, instanceId, { value: 0 }, 2), hasCode('shift_mode_mismatch'));
    assert.throws(() => f.service.getCurrentTask('student-one', id), hasCode('shift_mode_mismatch'));
    assert.throws(() => f.service.getResult('student-one', id), hasCode('shift_mode_mismatch'));
    const seen: string[] = [];
    while (session.task) {
      seen.push(session.task.definitionId);
      session = (await f.service.submitBlitzAnswer('student-one', id, session.task.instanceId, answerFor(session.task))).session;
    }
    assert.deepEqual(seen, [...BLITZ_TASK_IDS]);
    assert.equal(session.status, 'completed');
    assert.equal(session.finishReason, 'answered');
    assert.equal(session.progress.answered, 6);
    assert.equal(session.review.length, 6);
    assert.deepEqual(f.service.equipment.store.read().users['student-one'], before);
    assert.equal(f.service.equipment.store.read().shifts[id].reward, undefined);
    const restarted = await f.create();
    assert.deepEqual((await restarted.getBlitz('student-one', id)).review, session.review);
  } finally { await f.dispose(); }
});

test('ошибка записи не создаёт фантомный раунд и не принимает недолговечный ответ', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-blitz-write-'));
  let unavailable = false;
  let durable = '';
  try {
    const equipment = new EquipmentService({ writeSnapshot: async (snapshot) => { if (unavailable) throw new Error('disk unavailable'); durable = snapshot; } });
    const service = new ShiftService({ contentRoot, attemptLogPath: join(directory, 'attempts.jsonl'), equipment, now: () => new Date(startTime) });
    await service.init();
    const practice = await service.startShift('student-one');
    let task: PublicTaskInstance | null = practice.task;
    while (task) task = (await service.submitAnswer('student-one', practice.shiftId, task.instanceId, answerFor(task))).nextTask;
    unavailable = true;
    await assert.rejects(service.startBlitz('student-one', DEFAULT_AVATAR, requestId()), /disk unavailable/);
    assert.equal((await service.blitzLobby('student-one')).session, null);
    unavailable = false;
    const started = await service.startBlitz('student-one', DEFAULT_AVATAR, requestId());
    const snapshot = durable;
    unavailable = true;
    await assert.rejects(service.submitBlitzAnswer('student-one', started.id, started.task!.instanceId, answerFor(started.task!)), /disk unavailable/);
    assert.equal(durable, snapshot);
    assert.equal((await service.getBlitz('student-one', started.id)).progress.answered, 0);
    unavailable = false;
    const accepted = await service.submitBlitzAnswer('student-one', started.id, started.task!.instanceId, answerFor(started.task!));
    assert.equal(accepted.session.progress.answered, 1);
    unavailable = true;
    assert.equal((await service.submitBlitzAnswer('student-one', started.id, started.task!.instanceId, answerFor(started.task!))).session.progress.answered, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('повреждённый сохранённый таймер не восстанавливается молча', async () => {
  const f = await fixture();
  try {
    await f.qualify();
    const started = await f.service.startBlitz('student-one', DEFAULT_AVATAR, requestId());
    const disk = JSON.parse(await readFile(f.storePath, 'utf8'));
    disk.shifts[started.id].blitz.deadlineAt = new Date(startTime + BLITZ_DURATION_MS + 1).toISOString();
    await writeFile(f.storePath, JSON.stringify(disk));
    await assert.rejects(f.create(), /Повреждён сохранённый блиц/);
  } finally { await f.dispose(); }
});
