import { IdentityError } from '../identity/identityService.js';
import type { UserRole } from '../identity/model.js';

/** Display sessions are restricted to public broadcast data, including mixed-role accounts. */
export function requireLevelOnePlayer<T extends { roles: readonly UserRole[] }>(user: T): T {
  if (user.roles.includes('display')) {
    throw new IdentityError(403, 'Для первого уровня требуется игровая сессия', 'game_session_required');
  }
  return user;
}
