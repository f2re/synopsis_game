import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import type { PublicTaskInstance } from '@synopsis/content-engine';
import { IdentityService } from '../identity/identityService.js';
import { avatarAppearanceKey, composeAvatarPortrait } from '../identity/avatarPortrait.js';
import { DEFAULT_AVATAR, type AvatarProfile } from '../identity/model.js';
import { ShiftService } from '../shift/shiftService.js';
import { EquipmentService, initialEquipmentUser } from './equipmentService.js';
import type { LevelOneSessionView } from '../shift/levelOneRules.js';

const contentRoot = resolve(process.cwd(), '../../content');

/** Accepted input shapes, deliberately not a fixture claiming all answers correct. */
function answer(task: PublicTaskInstance): unknown {
  const payload = task.payload as Record<string, unknown>;
  if (task.response.kind === 'numeric') return { value: 0 };
  if (task.response.kind === 'choice') return { choiceIndex: (payload.options as Array<{ id: number }>)[0].id };
  if (task.response.kind === 'sequence' || task.response.kind === 'dependencySequence') return { order: (payload.steps as Array<{ id: number }>).map((step) => step.id) };
  if (task.response.kind === 'findError') return { stationId: (payload.stations as Array<{ id: string }>)[0].id };
  const slots = payload.slots as Array<{ id: string }>;
  return { placements: Object.fromEntries((payload.observations as Array<{ id: string }>).map((observation, index) => [observation.id, slots[index % slots.length].id])) };
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-rewards-'));
  const storePath = join(directory, 'equipment.json');
  const create = async () => {
    const equipment = new EquipmentService({ storePath });
    const shifts = new ShiftService({ contentRoot, attemptLogPath: join(directory, 'attempts.jsonl'), equipment });
    await shifts.init();
    return { equipment, shifts };
  };
  return { directory, storePath, create, ...await create(), cleanup: () => rm(directory, { recursive: true, force: true }) };
}

async function finishLevel(shifts: ShiftService, userId: string, session: LevelOneSessionView) {
  while (session.task) session = (await shifts.submitLevelOneAnswer(userId, session.id, session.task.instanceId, answer(session.task))).session;
  return session;
}

async function finishPractice(shifts: ShiftService, userId: string) {
  const started = await shifts.startShift(userId);
  let task: PublicTaskInstance | null = started.task;
  while (task) task = (await shifts.submitAnswer(userId, started.shiftId, task.instanceId, answer(task))).nextTask;
  return shifts.getResult(userId, started.shiftId);
}

test('новый профиль видит все 13 наград закрытыми; выданное снаряжение не считается наградой', async () => {
  const equipment = new EquipmentService();
  await equipment.init();
  const before = equipment.store.read();
  const rewards = equipment.getRewards('new');
  assert.equal(rewards.total, 13);
  assert.equal(rewards.earnedCount, 0);
  assert.equal(rewards.catalog.filter((entry) => entry.status === 'unavailable').length, 6);
  assert.equal(rewards.catalog.every((entry) => entry.condition.length > 0 && entry.progress.current === 0), true);
  assert.equal(rewards.catalog.some((entry) => entry.id === 'badge.training_starter'), false);
  assert.equal(equipment.getEquipment('new', DEFAULT_AVATAR).catalog[0].unlocked, true);
  assert.deepEqual(equipment.store.read(), before, 'The collection is a read, never a grant');
  const legacyOutfit = { ...DEFAULT_AVATAR, heldItem: 'held.pencil', badge: 'badge.aerology', companion: 'companion.tit' };
  assert.deepEqual(equipment.authorizedAvatar('new', legacyOutfit), DEFAULT_AVATAR);
  const snapshot = equipment.snapshot(initialEquipmentUser(), legacyOutfit, 'practice');
  assert.equal(snapshot.heldItem, 'held.none');
  assert.equal(snapshot.charges.retry, 0, 'A forged or legacy pencil cannot supply a charge');
});

test('первый бланк автоматически выдаёт карандаш один раз вместе с сохранённым завершением', async () => {
  const f = await fixture();
  try {
    const initial = await f.shifts.startLevelOne('alice', DEFAULT_AVATAR, 'reward-first-level-0001');
    assert.deepEqual(initial.rewardsGranted, []);
    const completed = await finishLevel(f.shifts, 'alice', initial);
    assert.deepEqual(completed.rewardsGranted.map((entry) => entry.id), ['held.pencil']);
    const entry = f.equipment.store.read().users.alice.earned['held.pencil'];
    assert.deepEqual(entry, { earnedAt: completed.completedAt, sourceShiftId: completed.id, contentPack: completed.contentPack });
    assert.equal(f.equipment.getRewards('alice').earnedCount, 1);
    assert.equal(f.equipment.getRewards('bob').earnedCount, 0);
    assert.equal(f.equipment.getEquipment('alice', DEFAULT_AVATAR).stats.completedShifts, 0);
    assert.equal((await f.shifts.blitzLobby('alice')).eligible, false);
    assert.equal(f.equipment.getRewards('alice').catalog.find((reward) => reward.id === 'badge_thermometer')!.status, 'unavailable');
    const restarted = await f.create();
    assert.deepEqual(restarted.shifts.getLevelOne('alice', completed.id).rewardsGranted, completed.rewardsGranted);
    const second = await finishLevel(restarted.shifts, 'alice', await restarted.shifts.startLevelOne('alice', DEFAULT_AVATAR, 'reward-first-level-0002'));
    assert.deepEqual(second.rewardsGranted, []);
    assert.deepEqual(restarted.equipment.store.read().users.alice.earned['held.pencil'], entry);
  } finally { await f.cleanup(); }
});

test('спутники выдаются за 3 и 5 полных смен, а первый уровень не увеличивает счётчик', async () => {
  const f = await fixture();
  try {
    await finishLevel(f.shifts, 'alice', await f.shifts.startLevelOne('alice', DEFAULT_AVATAR, 'reward-companions-0001'));
    for (let count = 1; count <= 5; count++) {
      const result = await finishPractice(f.shifts, 'alice');
      assert.equal(f.equipment.ownsReward('alice', 'companion.tit'), count >= 3);
      assert.equal(f.equipment.ownsReward('alice', 'companion.squirrel'), count >= 5);
      const ids = result.reward!.newRewards!.map((entry) => entry.id);
      assert.equal(ids.includes('companion.tit'), count === 3);
      assert.equal(ids.includes('companion.squirrel'), count === 5);
    }
    const result = await finishPractice(f.shifts, 'alice');
    assert.deepEqual(result.reward!.newRewards, []);
    assert.equal(f.equipment.ownsReward('alice', 'badge.aerology'), false);
    const restored = await f.create();
    assert.equal(restored.equipment.ownsReward('alice', 'companion.tit'), true);
    assert.equal(restored.equipment.ownsReward('bob', 'companion.tit'), false);
  } finally { await f.cleanup(); }
});

test('миграция восстанавливает награды из сохранённых ответов и не меняет счётчики или даты', async () => {
  const f = await fixture();
  try {
    for (let count = 0; count < 3; count++) await finishPractice(f.shifts, 'alice');
    const original = f.equipment.store.read();
    const old = structuredClone(original);
    delete old.users.alice.earned['held.pencil'];
    delete old.users.alice.earned['companion.tit'];
    for (const shift of Object.values(old.shifts)) delete shift.awardedRewardIds;
    await writeFile(f.storePath, JSON.stringify(old));
    const restored = await f.create();
    assert.equal(restored.equipment.ownsReward('alice', 'held.pencil'), true);
    assert.equal(restored.equipment.ownsReward('alice', 'companion.tit'), true);
    const migrated = restored.equipment.store.read();
    assert.equal(migrated.users.alice.completedShifts, original.users.alice.completedShifts);
    assert.deepEqual(migrated.users.alice.practiceDates, original.users.alice.practiceDates);
    assert.deepEqual(migrated.users.alice.earned['badge.first_shift'], original.users.alice.earned['badge.first_shift']);
    assert.deepEqual(migrated.users.alice.earned['held.pencil'], original.users.alice.earned['held.pencil']);
    assert.deepEqual(migrated.users.alice.earned['companion.tit'], original.users.alice.earned['companion.tit']);
    const saved = await readFile(f.storePath, 'utf8');
    await f.create();
    assert.equal(await readFile(f.storePath, 'utf8'), saved, 'A second restart has nothing to award');
  } finally { await f.cleanup(); }
});

test('запись внешности проверяет владение на сервере; другая учётная запись и planned-награды закрыты', async () => {
  const f = await fixture();
  try {
    const identity = new IdentityService({ storePath: join(f.directory, 'identity.json'), securityProfile: 'trusted', ownsReward: (userId, id) => f.equipment.ownsReward(userId, id) });
    await identity.init(); await identity.bootstrapAdmin('Администратор', '1234');
    const admin = await identity.adminLogin('1234', '127.0.0.1');
    const student = await identity.createUser(admin.token, { displayName: 'Ученик', groupId: 'Тест' });
    const login = await identity.login(student.id, '', '127.0.0.2');
    for (const change of [{ heldItem: 'held.pencil' }, { badge: 'badge.aerology' }, { companion: 'companion.tit' }, { companion: 'companion.squirrel' }]) {
      await assert.rejects(identity.updateAvatar(login.token, { ...login.user.avatar, ...change }), { code: 'reward_locked', status: 403 });
    }
    assert.deepEqual(identity.me(login.token).avatar, login.user.avatar);
    await finishLevel(f.shifts, student.id, await f.shifts.startLevelOne(student.id, DEFAULT_AVATAR, 'reward-identity-level-0001'));
    const earned = await identity.updateAvatar(login.token, { ...login.user.avatar, heldItem: 'held.pencil' });
    assert.equal(earned.avatar.heldItem, 'held.pencil');
    assert.equal(earned.avatarPortrait!.appearanceKey, avatarAppearanceKey(earned.avatar));
    await assert.rejects(identity.updateAvatar(admin.token, { ...admin.user.avatar, heldItem: 'held.pencil' }), { code: 'reward_locked' });
    await assert.rejects(identity.updateAvatar(login.token, { ...earned.avatar, badge: 'badge.aerology' }), { code: 'reward_locked' });
  } finally { await f.cleanup(); }
});

test('старые свободно выбранные награды снимаются вместе с портретом; заработанный карандаш сохраняется', async () => {
  const f = await fixture();
  try {
    const storePath = join(f.directory, 'legacy-identity.json');
    // Only the fixture can stand in for the pre-reward unrestricted identity service.
    const old = new IdentityService({ storePath, securityProfile: 'trusted', ownsReward: () => true });
    await old.init(); await old.bootstrapAdmin('Администратор', '1234');
    const login = await old.adminLogin('1234', '127.0.0.1');
    const outfit: AvatarProfile = { ...login.user.avatar, top: 'top.sweater', heldItem: 'held.pencil', badge: 'badge.aerology', companion: 'companion.tit' };
    await old.updateAvatar(login.token, outfit);
    await finishLevel(f.shifts, login.user.id, await f.shifts.startLevelOne(login.user.id, DEFAULT_AVATAR, 'reward-migration-level-0001'));
    const migrated = new IdentityService({ storePath, securityProfile: 'trusted', ownsReward: (id, item) => f.equipment.ownsReward(id, item) });
    await migrated.init();
    const restored = await migrated.adminLogin('1234', '127.0.0.2');
    assert.deepEqual(restored.user.avatar, { ...outfit, badge: 'badge.none', companion: 'companion.none' });
    assert.equal(restored.user.avatarPortrait!.appearanceKey, avatarAppearanceKey(restored.user.avatar));
    const disk = JSON.parse(await readFile(storePath, 'utf8'));
    assert.deepEqual(disk.users[0].avatar, restored.user.avatar);
    assert.equal(disk.users[0].avatarPortrait.sha256, restored.user.avatarPortrait!.sha256);
  } finally { await f.cleanup(); }
});

test('отсутствие проверки владения закрывает награды; новая смена исправляет старый допустимый PNG', async () => {
  const f = await fixture();
  try {
    const identity = new IdentityService({ storePath: join(f.directory, 'without-rewards.json'), securityProfile: 'trusted' });
    await identity.init(); await identity.bootstrapAdmin('Администратор', '1234');
    const login = await identity.adminLogin('1234', '127.0.0.1');
    const legacy = { ...DEFAULT_AVATAR, heldItem: 'held.pencil', companion: 'companion.tit' };
    await assert.rejects(identity.updateAvatar(login.token, legacy), { code: 'reward_locked' });
    const portrait = await composeAvatarPortrait(legacy);
    const started = await f.shifts.startShift('new', legacy, portrait);
    assert.deepEqual(started.equipment.avatarSnapshot, DEFAULT_AVATAR);
    assert.equal(started.equipment.heldItem, 'held.none');
    assert.equal(started.equipment.charges.retry, 0);
    assert.equal(started.equipment.avatarPortrait!.appearanceKey, avatarAppearanceKey(DEFAULT_AVATAR));
    // The portrait crops the shoulders: a hand item or off-frame companion can
    // leave identical pixels. Its complete appearance binding must still change.
    assert.notEqual(started.equipment.avatarPortrait!.appearanceKey, portrait.appearanceKey);
    assert.deepEqual(started.equipment.avatarPortrait, await composeAvatarPortrait(DEFAULT_AVATAR));
  } finally { await f.cleanup(); }
});
