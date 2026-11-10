import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { IdentityError, IdentityService } from './identityService.js';

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
    await assert.rejects(() => failed);
    assert.deepEqual(service.me(login.token).avatar, login.user.avatar);
    assert.equal(await readFile(`${storePath}.saved`, 'utf8'), saved);
    assert.equal((await readdir(directory)).some((name) => name.endsWith('.tmp')), false);

    await rm(storePath, { recursive: true });
    await rename(`${storePath}.saved`, storePath);
    const updated = await service.updateAvatar(login.token, { ...login.user.avatar, heldItem: 'held.tablet' });
    assert.equal(updated.avatar.heldItem, 'held.tablet');
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
    assert.equal(service.me(login.token).avatar.heldItem, 'held.map-folder');
    const restarted = new IdentityService({ storePath, securityProfile: 'trusted' });
    await restarted.init();
    const restoredLogin = await restarted.adminLogin('1234', '127.0.0.2');
    assert.equal(restoredLogin.user.avatar.heldItem, 'held.map-folder');
    assert.equal(restarted.listUsers(restoredLogin.token).find((user) => user.id === student.id)?.status, 'disabled');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

