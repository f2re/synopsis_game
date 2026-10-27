import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR,
  USER_ROLES,
  type AdminUser,
  type AvatarProfile,
  type IdentityState,
  type SecurityProfile,
  type SessionUser,
  type UserRecord,
  type UserRole,
  type UserStatus,
  toAdminUser,
  toSessionUser,
  validateAvatar,
} from './model.js';

export class IdentityError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

interface SessionRecord {
  userId: string;
  expiresAt: number;
}

interface IpAttempt {
  count: number;
  lockedUntil: number;
}

export interface IdentityServiceOptions {
  storePath: string;
  securityProfile?: SecurityProfile;
  maxAttempts?: number;
  lockMs?: number;
  sessionTtlMs?: number;
}

export interface CreateUserInput {
  displayName: string;
  groupId: string;
  roles?: UserRole[];
  initialCode?: string;
  codeSet?: boolean;
}

export interface BatchCreateUserItem {
  displayName: string;
  initialCode?: string;
}

export interface BatchCreateUsersInput {
  groupId: string;
  roles?: UserRole[];
  users: BatchCreateUserItem[];
}

export interface BatchCreateResultItem extends AdminUser {
  initialCode: string;
}

export interface BatchCreateResult {
  groupId: string;
  count: number;
  created: BatchCreateResultItem[];
}

function normalizeText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new IdentityError(400, `Поле ${field} обязательно`, 'invalid_input');
  }
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > maxLength) {
    throw new IdentityError(400, `Некорректное значение ${field}`, 'invalid_input');
  }
  return normalized;
}

function normalizeRoles(value: unknown): UserRole[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }
  const roles = [...new Set(value)] as unknown[];
  return roles.filter((role): role is UserRole => typeof role === 'string' && USER_ROLES.includes(role as UserRole));
}

function scryptKey(code: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(code, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function createVerifier(code: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptKey(code, salt)).toString('hex');
  return { salt, hash };
}

async function verifyCode(code: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await scryptKey(code, salt);
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export class IdentityService {
  private state: IdentityState = { version: 1, users: [] };
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly ipAttempts = new Map<string, IpAttempt>();
  private readonly securityProfile: SecurityProfile;
  private readonly maxAttempts: number;
  private readonly lockMs: number;
  private readonly sessionTtlMs: number;
  private persistQueue: Promise<void> = Promise.resolve();

  constructor(private readonly options: IdentityServiceOptions) {
    this.securityProfile = options.securityProfile ?? 'public';
    this.maxAttempts = options.maxAttempts ?? 5;
    this.lockMs = options.lockMs ?? 60_000;
    this.sessionTtlMs = options.sessionTtlMs ?? 8 * 60 * 60_000;
  }

  async init(): Promise<void> {
    try {
      const raw = await readFile(this.options.storePath, 'utf8');
      const parsed = JSON.parse(raw) as IdentityState;
      if (parsed.version !== 1 || !Array.isArray(parsed.users)) {
        throw new Error('unsupported identity store');
      }
      this.state = parsed;
      for (const user of this.state.users) {
        if (user.roles.includes('admin') && user.codeSet === undefined) {
          user.codeSet = true;
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await this.persist();
    }
  }

  getSecurityProfile(): SecurityProfile {
    return this.securityProfile;
  }

  hasAdmin(): boolean {
    return this.state.users.some((user) => user.roles.includes('admin'));
  }

  async seedDirectUser(input: CreateUserInput): Promise<AdminUser | null> {
    const existing = this.state.users.find(
      (u) => u.displayName === input.displayName && u.groupId === input.groupId,
    );
    if (existing) {
      return toAdminUser(existing);
    }
    const user = await this.buildUser(input);
    this.state.users.push(user);
    await this.persist();
    return toAdminUser(user);
  }

  async bootstrapAdmin(displayName: string, code: string): Promise<boolean> {
    if (this.hasAdmin()) return false;
    this.validateLoginCode(code);
    const user = await this.buildUser({
      displayName,
      groupId: 'administrators',
      roles: ['admin'],
      initialCode: code,
      codeSet: true,
    });
    this.state.users.push(user);
    await this.persist();
    return true;
  }

  listGroups(): string[] {
    return [...new Set(
      this.state.users
        .filter((u) => u.status === 'active' && !u.roles.includes('admin') && !u.roles.includes('display'))
        .map((u) => u.groupId),
    )].sort((a, b) => a.localeCompare(b, 'ru'));
  }

  listRoster(groupId: string): Array<Pick<SessionUser, 'id' | 'displayName' | 'groupId'> & { hasCode: boolean }> {
    return this.state.users
      .filter((user) => user.status === 'active' && user.groupId === groupId && !user.roles.includes('display') && !user.roles.includes('admin'))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'))
      .map((user) => ({
        id: user.id,
        displayName: user.displayName,
        groupId: user.groupId,
        hasCode: Boolean(user.codeSet),
      }));
  }

  async login(userId: string, code: string, ip: string): Promise<{ token: string; user: SessionUser }> {
    const user = this.findUser(userId);
    if (user.status !== 'active') {
      throw new IdentityError(403, 'Учётная запись отключена', 'user_disabled');
    }

    const now = Date.now();
    const ipKey = `${ip}:${userId}`;
    const ipAttempt = this.ipAttempts.get(ipKey);
    if (ipAttempt && ipAttempt.lockedUntil > now) {
      throw new IdentityError(429, 'Слишком много попыток. Повторите вход позже', 'temporarily_locked');
    }
    if (user.lockedUntil && Date.parse(user.lockedUntil) > now) {
      throw new IdentityError(429, 'Профиль временно заблокирован после ошибок входа', 'temporarily_locked');
    }

    const trimmedCode = typeof code === 'string' ? code.trim() : '';

    if (!user.codeSet) {
      // Первый вход: код вводить не требуется!
      if (trimmedCode) {
        // Если код был введен при первом входе, сохраняем его
        this.validateLoginCode(trimmedCode);
        const verifier = await createVerifier(trimmedCode);
        user.loginCodeSalt = verifier.salt;
        user.loginCodeHash = verifier.hash;
        user.codeSet = true;
      }
    } else {
      // Пользователь уже задал код ранее: обязательная проверка
      if (!trimmedCode) {
        throw new IdentityError(400, 'Введите персональный код', 'code_required');
      }
      const ok = await verifyCode(trimmedCode, user.loginCodeSalt, user.loginCodeHash);
      if (!ok) {
        user.failedAttempts += 1;
        const nextIp = ipAttempt ?? { count: 0, lockedUntil: 0 };
        nextIp.count += 1;
        if (user.failedAttempts >= this.maxAttempts || nextIp.count >= this.maxAttempts) {
          const lockedUntil = now + this.lockMs;
          user.lockedUntil = new Date(lockedUntil).toISOString();
          nextIp.lockedUntil = lockedUntil;
          nextIp.count = 0;
        }
        this.ipAttempts.set(ipKey, nextIp);
        await this.persist();
        throw new IdentityError(401, 'Неверный код входа', 'invalid_code');
      }
    }

    user.failedAttempts = 0;
    delete user.lockedUntil;
    this.ipAttempts.delete(ipKey);
    user.lastLoginAt = new Date().toISOString();
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(token, { userId: user.id, expiresAt: now + this.sessionTtlMs });
    await this.persist();
    return { token, user: toSessionUser(user) };
  }

  async adminLogin(code: string, ip: string): Promise<{ token: string; user: SessionUser }> {
    const trimmedCode = typeof code === 'string' ? code.trim() : '';
    if (!trimmedCode) {
      throw new IdentityError(400, 'Введите код администратора', 'code_required');
    }

    const now = Date.now();
    const ipKey = `${ip}:admin`;
    const ipAttempt = this.ipAttempts.get(ipKey);
    if (ipAttempt && ipAttempt.lockedUntil > now) {
      throw new IdentityError(429, 'Слишком много попыток. Повторите вход позже', 'temporarily_locked');
    }

    const admins = this.state.users.filter((u) => u.status === 'active' && u.roles.includes('admin'));
    if (admins.length === 0) {
      throw new IdentityError(404, 'Администратор не найден', 'no_admin');
    }

    for (const admin of admins) {
      const ok = await verifyCode(trimmedCode, admin.loginCodeSalt, admin.loginCodeHash);
      if (ok) {
        admin.failedAttempts = 0;
        delete admin.lockedUntil;
        this.ipAttempts.delete(ipKey);
        admin.lastLoginAt = new Date().toISOString();
        const token = randomBytes(32).toString('base64url');
        this.sessions.set(token, { userId: admin.id, expiresAt: now + this.sessionTtlMs });
        await this.persist();
        return { token, user: toSessionUser(admin) };
      }
    }

    const nextIp = ipAttempt ?? { count: 0, lockedUntil: 0 };
    nextIp.count += 1;
    if (nextIp.count >= this.maxAttempts) {
      const lockedUntil = now + this.lockMs;
      nextIp.lockedUntil = lockedUntil;
      nextIp.count = 0;
    }
    this.ipAttempts.set(ipKey, nextIp);
    await this.persist();
    throw new IdentityError(401, 'Неверный код администратора', 'invalid_code');
  }

  async setUserCode(token: string, newCode: string, currentCode?: string): Promise<SessionUser> {
    const user = this.requireSession(token);
    const trimmedNew = typeof newCode === 'string' ? newCode.trim() : '';
    this.validateLoginCode(trimmedNew);

    if (user.codeSet) {
      const trimmedCurrent = typeof currentCode === 'string' ? currentCode.trim() : '';
      if (!trimmedCurrent) {
        throw new IdentityError(400, 'Введите текущий код для подтверждения', 'current_code_required');
      }
      const ok = await verifyCode(trimmedCurrent, user.loginCodeSalt, user.loginCodeHash);
      if (!ok) {
        throw new IdentityError(401, 'Неверный текущий код', 'invalid_code');
      }
    }

    const verifier = await createVerifier(trimmedNew);
    user.loginCodeSalt = verifier.salt;
    user.loginCodeHash = verifier.hash;
    user.codeSet = true;
    user.failedAttempts = 0;
    delete user.lockedUntil;
    await this.persist();
    return toSessionUser(user);
  }

  logout(token: string): void {
    this.sessions.delete(token);
  }

  me(token: string): SessionUser {
    return toSessionUser(this.requireSession(token));
  }

  async updateAvatar(token: string, input: unknown): Promise<SessionUser> {
    const user = this.requireSession(token);
    try {
      user.avatar = validateAvatar(input);
    } catch (error) {
      throw new IdentityError(400, (error as Error).message, 'invalid_avatar');
    }
    await this.persist();
    return toSessionUser(user);
  }

  listUsers(token: string): AdminUser[] {
    this.requireAdmin(token);
    return this.state.users
      .slice()
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'))
      .map(toAdminUser);
  }

  async createUser(token: string, input: CreateUserInput): Promise<AdminUser> {
    this.requireAdmin(token);
    const user = await this.buildUser(input);
    this.state.users.push(user);
    await this.persist();
    return toAdminUser(user);
  }

  async batchCreateUsers(token: string, input: BatchCreateUsersInput): Promise<BatchCreateResult> {
    this.requireAdmin(token);
    const groupId = normalizeText(input.groupId, 'groupId', 64);
    const roles = normalizeRoles(input.roles);

    if (!Array.isArray(input.users) || input.users.length === 0) {
      throw new IdentityError(400, 'Список пользователей для импорта пуст', 'empty_batch');
    }

    if (input.users.length > 500) {
      throw new IdentityError(400, 'Превышен лимит импорта за один раз (максимум 500 записей)', 'batch_too_large');
    }

    const created: BatchCreateResultItem[] = [];
    for (const item of input.users) {
      const rawName = typeof item?.displayName === 'string' ? item.displayName.trim() : '';
      if (!rawName) continue;
      const initialCode = (typeof item.initialCode === 'string' && item.initialCode.trim().length > 0)
        ? item.initialCode.trim()
        : String(Math.floor(100000 + Math.random() * 900000));

      const user = await this.buildUser({
        displayName: rawName,
        groupId,
        roles,
        initialCode,
      });

      this.state.users.push(user);
      created.push({
        ...toAdminUser(user),
        initialCode,
      });
    }

    if (created.length === 0) {
      throw new IdentityError(400, 'Не найдено корректных записей для добавления', 'no_valid_users');
    }

    await this.persist();
    return {
      groupId,
      count: created.length,
      created,
    };
  }

  async setUserStatus(token: string, userId: string, status: UserStatus): Promise<AdminUser> {
    const actor = this.requireAdmin(token);
    const user = this.findUser(userId);
    if (user.id === actor.id && status === 'disabled') {
      throw new IdentityError(409, 'Нельзя отключить текущую административную сессию', 'self_disable');
    }
    if (status !== 'active' && status !== 'disabled') {
      throw new IdentityError(400, 'Неизвестный статус', 'invalid_status');
    }
    user.status = status;
    if (status === 'disabled') {
      user.disabledAt = new Date().toISOString();
      for (const [sessionToken, session] of this.sessions) {
        if (session.userId === user.id) this.sessions.delete(sessionToken);
      }
    } else {
      delete user.disabledAt;
      user.failedAttempts = 0;
      delete user.lockedUntil;
    }
    await this.persist();
    return toAdminUser(user);
  }

  async resetCode(token: string, userId: string, code?: string): Promise<void> {
    this.requireAdmin(token);
    const user = this.findUser(userId);
    const trimmed = typeof code === 'string' ? code.trim() : '';
    if (trimmed) {
      this.validateLoginCode(trimmed);
      const verifier = await createVerifier(trimmed);
      user.loginCodeSalt = verifier.salt;
      user.loginCodeHash = verifier.hash;
      user.codeSet = true;
    } else {
      user.codeSet = false;
    }
    user.failedAttempts = 0;
    delete user.lockedUntil;
    for (const [sessionToken, session] of this.sessions) {
      if (session.userId === user.id) this.sessions.delete(sessionToken);
    }
    await this.persist();
  }

  getAvatarCatalog(): typeof AVATAR_OPTIONS {
    return AVATAR_OPTIONS;
  }

  private async buildUser(input: CreateUserInput): Promise<UserRecord> {
    const displayName = normalizeText(input.displayName, 'displayName', 80);
    const groupId = normalizeText(input.groupId, 'groupId', 64);
    const roles = normalizeRoles(input.roles);
    const initialCode = (typeof input.initialCode === 'string' && input.initialCode.trim().length > 0)
      ? input.initialCode.trim()
      : String(Math.floor(100000 + Math.random() * 900000));
    this.validateLoginCode(initialCode);
    const verifier = await createVerifier(initialCode);
    return {
      id: randomUUID(),
      displayName,
      groupId,
      roles,
      status: 'active',
      loginCodeSalt: verifier.salt,
      loginCodeHash: verifier.hash,
      avatar: { ...DEFAULT_AVATAR },
      createdAt: new Date().toISOString(),
      codeSet: Boolean(input.codeSet),
      failedAttempts: 0,
    };
  }

  private validateLoginCode(code: string): void {
    if (typeof code !== 'string') {
      throw new IdentityError(400, 'Код входа обязателен', 'invalid_code_format');
    }
    const min = this.securityProfile === 'trusted' ? 2 : 4;
    if (code.length < min || code.length > 12 || !/^[0-9A-Za-zА-Яа-яЁё_-]+$/u.test(code)) {
      throw new IdentityError(
        400,
        this.securityProfile === 'trusted'
          ? 'Код должен содержать 2–12 допустимых символов'
          : 'Для открытого профиля код должен содержать 4–12 допустимых символов',
        'invalid_code_format',
      );
    }
  }

  private findUser(userId: string): UserRecord {
    const user = this.state.users.find((candidate) => candidate.id === userId);
    if (!user) throw new IdentityError(404, 'Пользователь не найден', 'user_not_found');
    return user;
  }

  private requireSession(token: string): UserRecord {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      if (session) this.sessions.delete(token);
      throw new IdentityError(401, 'Сессия недействительна или истекла', 'invalid_session');
    }
    const user = this.findUser(session.userId);
    if (user.status !== 'active') throw new IdentityError(403, 'Учётная запись отключена', 'user_disabled');
    return user;
  }

  private requireAdmin(token: string): UserRecord {
    const user = this.requireSession(token);
    if (!user.roles.includes('admin')) {
      throw new IdentityError(403, 'Требуются права администратора', 'admin_required');
    }
    return user;
  }

  private async persist(): Promise<void> {
    const snapshot = JSON.stringify(this.state, null, 2) + '\n';
    this.persistQueue = this.persistQueue.then(async () => {
      await mkdir(dirname(this.options.storePath), { recursive: true });
      const temporary = `${this.options.storePath}.tmp`;
      await writeFile(temporary, snapshot, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.options.storePath);
    });
    await this.persistQueue;
  }
}
