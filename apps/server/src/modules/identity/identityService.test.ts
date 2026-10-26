import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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

    const adminLogin = await service.login(service.listRoster('administrators')[0].id, '1234', '127.0.0.1');
    assert.ok(adminLogin.token.length > 20);
    assert.equal(adminLogin.user.roles.includes('admin'), true);
    assert.equal('loginCodeHash' in adminLogin.user, false);

    const student = await service.createUser(adminLogin.token, {
      displayName: 'Иван Петров',
      groupId: 'М-21',
      roles: ['student'],
      initialCode: '42',
    });
    assert.equal(student.groupId, 'М-21');
    assert.equal('loginCodeHash' in student, false);

    const studentLogin = await service.login(student.id, '42', '127.0.0.2');
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
      () => service.login(student.id, '42', '127.0.0.2'),
      (error: unknown) => error instanceof IdentityError && error.code === 'user_disabled',
    );
  });
});

test('repeated wrong code produces temporary lockout', async () => {
  await withService(async (service) => {
    await service.bootstrapAdmin('Администратор', '1234');
    const adminId = service.listRoster('administrators')[0].id;

    await assert.rejects(() => service.login(adminId, '0000', '10.0.0.1'));
    await assert.rejects(() => service.login(adminId, '0000', '10.0.0.1'));
    await assert.rejects(
      () => service.login(adminId, '1234', '10.0.0.1'),
      (error: unknown) => error instanceof IdentityError && error.code === 'temporarily_locked',
    );
  });
});
