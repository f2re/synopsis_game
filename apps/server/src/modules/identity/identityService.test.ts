import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { IdentityError, IdentityService } from './identityService.js';
import { avatarAppearanceKey, portraitToPngBytes } from './avatarPortrait.js';

async function withService(run: (service: IdentityService) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-identity-'));
  try {
    const service = new IdentityService({
      storePath: join(directory, 'identity.json'),
      securityProfile: 'trusted',
      maxAttempts: 2,
      lockMs: 5_000,
    });
    await service.init();
    await run(service);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('bootstrap admin, create user and persist avatar without exposing verifier', async () => {
  await withService(async (service) => {
    assert.equal(await service.bootstrapAdmin('Администратор', '1234'), true);
    assert.equal(await service.bootstrapAdmin('Другой', '9999'), false);

    // Admin should be hidden from public groups and roster
    assert.deepEqual(service.listGroups(), []);
    assert.deepEqual(service.listRoster('administrators'), []);

    // Admin logs in via adminLogin
    const adminLogin = await service.adminLogin('1234', '127.0.0.1');
    assert.ok(adminLogin.token.length > 20);
    assert.equal(adminLogin.user.roles.includes('admin'), true);
    assert.equal('loginCodeHash' in adminLogin.user, false);

    const student = await service.createUser(adminLogin.token, {
      displayName: 'Иван Петров',
      groupId: 'М-21',
      roles: ['student'],
    });
    assert.equal(student.groupId, 'М-21');
    assert.equal('loginCodeHash' in student, false);

    // Group and student now visible in public list
    assert.deepEqual(service.listGroups(), ['М-21']);
    const roster = service.listRoster('М-21');
    assert.equal(roster.length, 1);
    assert.equal(roster[0].displayName, 'Иван Петров');
    assert.equal(roster[0].hasCode, false); // first time, no code set

    // Student can log in first time without code
    const firstLogin = await service.login(student.id, '', '127.0.0.2');
    assert.equal(firstLogin.user.displayName, 'Иван Петров');

    // Student sets their personal code
    const userWithCode = await service.setUserCode(firstLogin.token, '5566');
    assert.equal(userWithCode.codeSet, true);

    // After setting code, logging in without code is rejected
    await assert.rejects(
      () => service.login(student.id, '', '127.0.0.2'),
      (error: unknown) => error instanceof IdentityError && error.code === 'code_required',
    );

    // Logging in with wrong code is rejected
    await assert.rejects(
      () => service.login(student.id, '0000', '127.0.0.2'),
      (error: unknown) => error instanceof IdentityError && error.code === 'invalid_code',
    );

    // Logging in with correct code succeeds
    const studentLogin = await service.login(student.id, '5566', '127.0.0.2');
    const updated = await service.updateAvatar(studentLogin.token, {
      ...studentLogin.user.avatar,
      hair: 'hair.wave',
      top: 'top.field-jacket',
      companion: 'companion.tit',
    });
    assert.equal(updated.avatar.hair, 'hair.wave');
    assert.equal(updated.avatar.companion, 'companion.tit');

    await service.setUserStatus(adminLogin.token, student.id, 'disabled');
    await assert.rejects(
      () => service.login(student.id, '5566', '127.0.0.2'),
      (error: unknown) => error instanceof IdentityError && error.code === 'user_disabled',
    );
  });
});

test('repeated wrong code produces temporary lockout', async () => {
  await withService(async (service) => {
    await service.bootstrapAdmin('Администратор', '1234');

    await assert.rejects(() => service.adminLogin('0000', '10.0.0.1'));
    await assert.rejects(() => service.adminLogin('0000', '10.0.0.1'));
    await assert.rejects(
      () => service.adminLogin('1234', '10.0.0.1'),
      (error: unknown) => error instanceof IdentityError && error.code === 'temporarily_locked',
    );
  });
});

test('station presence counts distinct other accounts until logout, disable, or lease expiry', async (context) => {
  await withService(async (service) => {
    await service.bootstrapAdmin('Администратор', '1234');
    const admin = await service.adminLogin('1234', '127.0.0.1');
    const student = await service.createUser(admin.token, { displayName: 'Игрок', groupId: 'Группа', roles: ['student'] });
    const screen = await service.createUser(admin.token, { displayName: 'Проектор', groupId: 'Группа', roles: ['display'] });
    const viewer = await service.login(screen.id, '', '127.0.0.2');
    const first = await service.login(student.id, '', '127.0.0.3');
    const second = await service.login(student.id, '', '127.0.0.4');

    let now = Date.now();
    const clock = context.mock.method(Date, 'now', () => now);

    assert.throws(() => service.renewStationPresence('invalid'), { code: 'invalid_session' });
    assert.throws(() => service.renewStationPresence(viewer.token), { code: 'game_session_required' });
    assert.deepEqual(service.renewStationPresence(admin.token), { online: 0 }, 'login itself does not report presence');
    assert.throws(() => service.renewStationPresence(admin.token), { status: 429, code: 'presence_rate_limited' });
    assert.deepEqual(service.renewStationPresence(first.token), { online: 1 });
    assert.deepEqual(service.renewStationPresence(second.token), { online: 1 }, 'exclude both sessions of the caller');
    const start = now;
    now += 1_000;
    assert.deepEqual(service.renewStationPresence(admin.token), { online: 1 }, 'count both sessions as one other account');
    service.logout(first.token);
    now += 1_000;
    assert.deepEqual(service.renewStationPresence(admin.token), { online: 1 });

    now = start + 44_000;
    assert.deepEqual(service.renewStationPresence(admin.token), { online: 1 });
    now = start + 45_000;
    assert.deepEqual(service.renewStationPresence(admin.token), { online: 0 }, 'expiry is exclusive');

    assert.deepEqual(service.renewStationPresence(second.token), { online: 1 }, 'reconnection renews a lapsed lease');
    await service.setUserStatus(admin.token, student.id, 'disabled');
    now += 1_000;
    assert.deepEqual(service.renewStationPresence(admin.token), { online: 0 });
    assert.throws(() => service.renewStationPresence(second.token), { code: 'invalid_session' });
    clock.mock.restore();
  });
});

test('batch create users from list with auto-generated and custom codes', async () => {
  await withService(async (service) => {
    await service.bootstrapAdmin('Администратор', '1234');
    const adminLogin = await service.adminLogin('1234', '127.0.0.1');

    const result = await service.batchCreateUsers(adminLogin.token, {
      groupId: 'СИН-2026',
      roles: ['student'],
      users: [
        { displayName: 'Иванов Иван Иванович' },
        { displayName: 'Петрова Анна Сергеевна', initialCode: '7788' },
        { displayName: 'Сидоров Алексей Дмитриевич' },
      ],
    });

    assert.equal(result.count, 3);
    assert.equal(result.groupId, 'СИН-2026');
    assert.equal(result.created[1].displayName, 'Петрова Анна Сергеевна');
    assert.equal(result.created[1].initialCode, '7788');
    assert.ok(result.created[0].initialCode.length >= 4);

    const roster = service.listRoster('СИН-2026');
    assert.equal(roster.length, 3);

    // Student 1 logs in first time without code
    const student1 = result.created[0];
    const login1 = await service.login(student1.id, '', '127.0.0.3');
    assert.equal(login1.user.displayName, 'Иванов Иван Иванович');
    assert.equal(login1.user.groupId, 'СИН-2026');

    // Student 2 sets code on first login
    const login2 = await service.login(result.created[1].id, '7788', '127.0.0.4');
    assert.equal(login2.user.displayName, 'Петрова Анна Сергеевна');
    assert.equal(login2.user.codeSet, true);

    // Reject empty batch
    await assert.rejects(
      () => service.batchCreateUsers(adminLogin.token, { groupId: 'СИН-2026', users: [] }),
      (err: unknown) => err instanceof IdentityError && err.code === 'empty_batch',
    );
  });
});

test('failed avatar save keeps committed equipment visible and later writes recover after a real rename failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-avatar-rollback-'));
  const storePath = join(directory, 'identity.json');
  try {
    const service = new IdentityService({ storePath, securityProfile: 'trusted' });
    await service.init();
    await service.bootstrapAdmin('Администратор', '1234');
    const login = await service.adminLogin('1234', '127.0.0.1');
    const saved = await readFile(storePath, 'utf8');

    // Replacing the target with a directory makes the atomic rename fail even
    // when tests run with filesystem privileges that bypass permission bits.
    await rename(storePath, `${storePath}.saved`);
    await mkdir(storePath);
    const failed = service.updateAvatar(login.token, { ...login.user.avatar, heldItem: 'held.pencil' });
    assert.deepEqual(service.me(login.token).avatar, login.user.avatar);
    assert.deepEqual(service.me(login.token).avatarPortrait, login.user.avatarPortrait);
    await assert.rejects(() => failed);
    assert.deepEqual(service.me(login.token).avatar, login.user.avatar);
    assert.deepEqual(service.me(login.token).avatarPortrait, login.user.avatarPortrait);
    assert.equal(await readFile(`${storePath}.saved`, 'utf8'), saved);
    assert.equal((await readdir(directory)).some((name) => name.endsWith('.tmp')), false);

    await rm(storePath, { recursive: true });
    await rename(`${storePath}.saved`, storePath);
    const updated = await service.updateAvatar(login.token, { ...login.user.avatar, heldItem: 'held.tablet' });
    assert.equal(updated.avatar.heldItem, 'held.tablet');
    assert.equal(updated.avatarPortrait?.appearanceKey, avatarAppearanceKey(updated.avatar));
    const restarted = new IdentityService({ storePath, securityProfile: 'trusted' });
    await restarted.init();
    assert.equal((await restarted.adminLogin('1234', '127.0.0.2')).user.avatar.heldItem, 'held.tablet');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('concurrent avatar saves return their own committed loadouts and a later admin snapshot preserves the latest one', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-avatar-queue-'));
  const storePath = join(directory, 'identity.json');
  try {
    const service = new IdentityService({ storePath, securityProfile: 'trusted' });
    await service.init();
    await service.bootstrapAdmin('Администратор', '1234');
    const login = await service.adminLogin('1234', '127.0.0.1');
    const student = await service.createUser(login.token, { displayName: 'Тестовый учащийся', groupId: 'ТЕСТ' });
    const [first, second] = await Promise.all([
      service.updateAvatar(login.token, { ...login.user.avatar, heldItem: 'held.pencil' }),
      service.updateAvatar(login.token, { ...login.user.avatar, heldItem: 'held.map-folder' }),
      service.setUserStatus(login.token, student.id, 'disabled'),
    ]);
    assert.equal(first.avatar.heldItem, 'held.pencil');
    assert.equal(second.avatar.heldItem, 'held.map-folder');
    assert.equal(first.avatarPortrait?.appearanceKey, avatarAppearanceKey(first.avatar));
    assert.equal(second.avatarPortrait?.appearanceKey, avatarAppearanceKey(second.avatar));
    assert.deepEqual(service.me(login.token).avatarPortrait, second.avatarPortrait);
    assert.equal(service.me(login.token).avatar.heldItem, 'held.map-folder');
    const restarted = new IdentityService({ storePath, securityProfile: 'trusted' });
    await restarted.init();
    const restoredLogin = await restarted.adminLogin('1234', '127.0.0.2');
    assert.equal(restoredLogin.user.avatar.heldItem, 'held.map-folder');
    assert.deepEqual(restoredLogin.user.avatarPortrait, second.avatarPortrait);
    assert.equal(restarted.listUsers(restoredLogin.token).find((user) => user.id === student.id)?.status, 'disabled');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a saved portrait is copied on reads, survives restart without art assets, and unchanged Save does not write', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-portrait-save-'));
  const storePath = join(directory, 'identity.json');
  try {
    const service = new IdentityService({ storePath, securityProfile: 'trusted' });
    await service.init(); await service.bootstrapAdmin('Администратор', '1234');
    const login = await service.adminLogin('1234', '127.0.0.1');
    const outfit = { ...login.user.avatar, hair: 'hair.long', hairColor: 'haircolor.auburn', top: 'top.hoodie', footwear: 'footwear.boots' };
    const saved = await service.updateAvatar(login.token, { ...outfit, pngDataUrl: 'data:image/svg+xml,<svg/>', avatarPortrait: { pngDataUrl: 'https://example.invalid/a' } });
    assert.equal(Object.keys(saved.avatar).length, 11);
    assert.ok(portraitToPngBytes(saved.avatarPortrait!).length > 100);
    assert.notEqual(saved.avatarPortrait!.sha256, login.user.avatarPortrait!.sha256);
    const canonical = structuredClone(saved.avatarPortrait);
    saved.avatar.top = 'top.shirt'; saved.avatarPortrait!.pngDataUrl = 'forged';
    const list = service.listUsers(login.token); list[0].avatarPortrait!.sha256 = 'forged';
    assert.deepEqual(service.me(login.token).avatarPortrait, canonical);
    assert.deepEqual(service.me(login.token).avatar, outfit);
    // Existing portraits are their own durable data, not a cache of today's atlas.
    const restarted = new IdentityService({ storePath, securityProfile: 'trusted', avatarAssetsRoot: join(directory, 'missing-art') });
    await restarted.init();
    const restored = await restarted.adminLogin('1234', '127.0.0.2');
    assert.deepEqual(restored.user.avatarPortrait, canonical);
    await rename(storePath, `${storePath}.saved`); await mkdir(storePath);
    assert.deepEqual((await restarted.updateAvatar(restored.token, outfit)).avatarPortrait, canonical);
    assert.deepEqual(restarted.me(restored.token).avatarPortrait, canonical);
    assert.equal((await readdir(directory)).some((name) => name.endsWith('.tmp')), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('same outfit can refresh a portrait from an older art revision', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-portrait-refresh-'));
  const storePath = join(directory, 'identity.json');
  try {
    const first = new IdentityService({ storePath, securityProfile: 'trusted' });
    await first.init();
    await first.bootstrapAdmin('Администратор', '1234');
    const record = JSON.parse(await readFile(storePath, 'utf8'));
    record.users[0].avatarPortrait.sourceRevision = 'portrait-v1:older-art:0123456789abcdef';
    await writeFile(storePath, JSON.stringify(record));

    const service = new IdentityService({ storePath, securityProfile: 'trusted' });
    await service.init();
    const login = await service.adminLogin('1234', '127.0.0.1');
    assert.equal(login.user.avatarPortrait?.sourceRevision, record.users[0].avatarPortrait.sourceRevision);
    const updated = await service.updateAvatar(login.token, login.user.avatar);
    assert.deepEqual(updated.avatar, login.user.avatar);
    assert.equal(updated.avatarPortrait?.appearanceKey, login.user.avatarPortrait?.appearanceKey);
    assert.notEqual(updated.avatarPortrait?.sourceRevision, login.user.avatarPortrait?.sourceRevision);
    assert.deepEqual(JSON.parse(await readFile(storePath, 'utf8')).users[0].avatarPortrait, updated.avatarPortrait);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('legacy profiles migrate once; missing assets or corrupted stored PNG never replace the identity file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synopsis-portrait-migrate-'));
  const storePath = join(directory, 'identity.json');
  try {
    const service = new IdentityService({ storePath, securityProfile: 'trusted' });
    await service.init(); await service.bootstrapAdmin('Администратор', '1234');
    const legacy = JSON.parse(await readFile(storePath, 'utf8'));
    delete legacy.users[0].avatarPortrait;
    legacy.users[0].avatar.headwear = 'headwear.beanie';
    const legacyBytes = JSON.stringify(legacy);
    await writeFile(storePath, legacyBytes);
    const unavailable = new IdentityService({ storePath, avatarAssetsRoot: join(directory, 'missing-art') });
    await assert.rejects(unavailable.init());
    assert.equal(await readFile(storePath, 'utf8'), legacyBytes);
    const migrated = new IdentityService({ storePath, securityProfile: 'trusted' });
    await migrated.init();
    const login = await migrated.adminLogin('1234', '127.0.0.1');
    assert.equal(login.user.avatarPortrait?.appearanceKey, avatarAppearanceKey(login.user.avatar));
    const after = await readFile(storePath, 'utf8');
    const next = new IdentityService({ storePath, avatarAssetsRoot: join(directory, 'still-missing-art') });
    await next.init();
    assert.equal(await readFile(storePath, 'utf8'), after);
    const corrupt = JSON.parse(after); corrupt.users[0].avatarPortrait.pngDataUrl = 'data:image/png;base64,AAAA';
    const corruptBytes = JSON.stringify(corrupt); await writeFile(storePath, corruptBytes);
    await assert.rejects(new IdentityService({ storePath }).init(), /checksum/);
    assert.equal(await readFile(storePath, 'utf8'), corruptBytes);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

