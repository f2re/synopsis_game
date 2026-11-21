import assert from 'node:assert/strict';
import test from 'node:test';
import { IdentityError } from '../identity/identityService.js';
import { USER_ROLES, type UserRole } from '../identity/model.js';
import { requireLevelOnePlayer } from './levelOneAccess.js';

test('сессия экрана не получает доступ к данным и операциям первого уровня', () => {
  for (const roles of [['display'], ['display', 'admin'], ['admin', 'display'], ['student', 'display'], ['display', 'instructor']] as UserRole[][]) {
    assert.throws(() => requireLevelOnePlayer({ id: 'screen', roles }),
      (error: unknown) => error instanceof IdentityError && error.status === 403 && error.code === 'game_session_required');
  }
});

test('разрешённые игровые роли сохраняют собственную идентичность для проверки владения', () => {
  for (const role of USER_ROLES.filter((candidate) => candidate !== 'display')) {
    const user = { id: `own-${role}`, roles: [role] as UserRole[] };
    assert.equal(requireLevelOnePlayer(user), user);
  }
  const admin = { id: 'own-admin', roles: ['admin', 'student'] as UserRole[] };
  assert.equal(requireLevelOnePlayer(admin).id, 'own-admin');
  assert.equal(requireLevelOnePlayer(admin), admin, 'The policy cannot substitute another owner for an admin');
});
