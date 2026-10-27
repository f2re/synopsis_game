import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { IdentityService } from './identityService.js';
import { seedTestRoster } from './testRoster.js';
import { ShiftService } from '../shift/shiftService.js';

async function withEnv(run: (dir: string, fixturePath: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'synopsis-test-roster-'));
  const fixturePath = join(dir, 'test-roster.json');
  await writeFile(
    fixturePath,
    JSON.stringify({
      version: 1,
      groups: [
        {
          groupId: 'КН-01-ТЕСТ',
          users: [
            {
              displayName: 'Тестовый Студент',
              roles: ['student'],
              code: '26063',
              codeSet: true,
            },
          ],
        },
      ],
    }),
    'utf8',
  );

  try {
    await run(dir, fixturePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('testRoster: in public profile, seeding is strictly rejected', async () => {
  await withEnv(async (dir, fixturePath) => {
    const service = new IdentityService({
      storePath: join(dir, 'identity.json'),
      securityProfile: 'public',
    });
    await service.init();

    const res = await seedTestRoster(service, {
      securityProfile: 'public',
      enabled: true,
      filePath: fixturePath,
    });

    assert.equal(res.seeded, false);
    assert.equal(res.reason, 'profile_not_trusted');
    assert.equal(service.listGroups().length, 0);
  });
});

test('testRoster: without explicit enabled flag, seeding is rejected', async () => {
  await withEnv(async (dir, fixturePath) => {
    const service = new IdentityService({
      storePath: join(dir, 'identity.json'),
      securityProfile: 'trusted',
    });
    await service.init();

    const res = await seedTestRoster(service, {
      securityProfile: 'trusted',
      enabled: false,
      filePath: fixturePath,
    });

    assert.equal(res.seeded, false);
    assert.equal(res.reason, 'test_mode_not_enabled');
    assert.equal(service.listGroups().length, 0);
  });
});

test('testRoster: in trusted profile with enabled flag, seeds correctly and allows e2e login + shift workflow', async () => {
  await withEnv(async (dir, fixturePath) => {
    const storePath = join(dir, 'identity.json');
    const service = new IdentityService({
      storePath,
      securityProfile: 'trusted',
    });
    await service.init();

    const res = await seedTestRoster(service, {
      securityProfile: 'trusted',
      enabled: true,
      filePath: fixturePath,
    });

    assert.equal(res.seeded, true);
    assert.equal(res.count, 1);

    // Group is present
    const groups = service.listGroups();
    assert.deepEqual(groups, ['КН-01-ТЕСТ']);

    // Student is in roster
    const roster = service.listRoster('КН-01-ТЕСТ');
    assert.equal(roster.length, 1);
    assert.equal(roster[0].displayName, 'Тестовый Студент');
    assert.equal(roster[0].hasCode, true);

    // Student logs in using the code from fixture
    const login = await service.login(roster[0].id, '26063', '127.0.0.1');
    assert.ok(login.token.length > 20);
    assert.equal(login.user.displayName, 'Тестовый Студент');

    // Student cannot log in with invalid code
    await assert.rejects(() => service.login(roster[0].id, 'wrong_code', '127.0.0.1'));

    // Check shift workflow for this e2e user
    const contentRoot = existsSync(join(process.cwd(), 'content'))
      ? join(process.cwd(), 'content')
      : resolve(process.cwd(), '../../content');
    const shiftService = new ShiftService({
      contentRoot,
      attemptLogPath: join(dir, 'attempts.jsonl'),
    });
    await shiftService.init();

    const started = shiftService.startShift(login.user.id);
    assert.ok(started.shiftId);
    assert.ok(started.task);

    // Logout session
    service.logout(login.token);
    assert.throws(() => service.me(login.token));
  });
});
