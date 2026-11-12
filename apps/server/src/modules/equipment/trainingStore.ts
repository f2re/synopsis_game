import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TrainingState } from './model.js';
import { validateAvatar } from '../identity/model.js';
import { avatarAppearanceKey, validateAvatarPortrait } from '../identity/avatarPortrait.js';
import { BLITZ_DURATION_MS, BLITZ_MAX_START_KEYS, BLITZ_MODE, BLITZ_REQUEST_ID, BLITZ_RULES_VERSION, BLITZ_TASK_IDS } from '../shift/blitzRules.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonemptyString(value) && Number.isFinite(Date.parse(value));
}

export interface TrainingStoreOptions {
  storePath?: string;
  /** Test seam: failure must precede any change to visible in-memory state. */
  writeSnapshot?: (snapshot: string) => Promise<void>;
}

export class TrainingStore {
  private state: TrainingState = { version: 1, users: {}, shifts: {}, attempts: [] };
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly options: TrainingStoreOptions = {}) {}

  async init(): Promise<void> {
    if (!this.options.storePath) return;
    let input: string;
    try { input = await readFile(this.options.storePath, 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const value: unknown = JSON.parse(input);
    if (!isRecord(value)) throw new Error('Некорректное хранилище учебной экипировки');
    const state = value as unknown as TrainingState;
    if (state.version !== 1 || !isRecord(state.users) || !isRecord(state.shifts) || !Array.isArray(state.attempts)) {
      throw new Error('Неизвестный формат хранилища учебной экипировки; автоматический сброс запрещён');
    }
    for (const user of Object.values(state.users)) {
      if (!isRecord(user) || !Array.isArray(user.practiceDates) || !user.practiceDates.every((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) || !isRecord(user.earned)
        || ![user.completedShifts, user.unassistedCorrect, user.bestUnassistedCorrect].every((number) => Number.isSafeInteger(number) && number >= 0)
        || !Number.isSafeInteger(user.bestTotal) || user.bestTotal < 1 || user.bestUnassistedCorrect > user.bestTotal
        || !(user.badgeId === null || typeof user.badgeId === 'string')
        || !Object.values(user.earned).every((earned) => isRecord(earned) && isTimestamp(earned.earnedAt) && isNonemptyString(earned.sourceShiftId) && isNonemptyString(earned.contentPack))) {
        throw new Error('Повреждён профиль учебной экипировки');
      }
    }
    const blitzStartKeys = new Set<string>();
    const activeBlitzUsers = new Set<string>();
    for (const [id, shift] of Object.entries(state.shifts)) {
      if (!isRecord(shift) || shift.id !== id || !isNonemptyString(shift.userId) || !Object.hasOwn(state.users, shift.userId)
        || !Array.isArray(shift.taskIds) || shift.taskIds.length < 1 || !shift.taskIds.every(isNonemptyString)
        || !Number.isSafeInteger(shift.seed) || shift.seed < 1 || !isTimestamp(shift.createdAt) || !isNonemptyString(shift.mode) || !isNonemptyString(shift.contentPack) || !isNonemptyString(shift.contentStatus)
        || !isRecord(shift.responses) || !isRecord(shift.references) || !isRecord(shift.equipment) || !Array.isArray(shift.assistedTaskIds) || !shift.assistedTaskIds.every(isNonemptyString)
        || ![shift.currentIndex, shift.correct, shift.unassistedCorrect].every((number) => Number.isSafeInteger(number) && number >= 0)
        || shift.currentIndex > shift.taskIds.length || shift.correct > shift.currentIndex || shift.unassistedCorrect > shift.correct
        || !isRecord(shift.equipment.remaining) || !isRecord(shift.equipment.charges) || ![shift.equipment.remaining.reference, shift.equipment.remaining.retry, shift.equipment.charges.reference, shift.equipment.charges.retry].every((number) => Number.isSafeInteger(number) && number >= 0 && number <= 2)
        || shift.equipment.remaining.reference > shift.equipment.charges.reference || shift.equipment.remaining.retry > shift.equipment.charges.retry
        || typeof shift.equipment.enabled !== 'boolean' || shift.equipment.assistedTasks !== shift.assistedTaskIds.length
        || new Set(shift.assistedTaskIds).size !== shift.assistedTaskIds.length
        || !Object.values(shift.responses).every((entry) => isRecord(entry) && isNonemptyString(entry.fingerprint) && isRecord(entry.response))
        || !Object.entries(shift.references).every(([instanceId, reference]) => isRecord(reference) && reference.instanceId === instanceId && reference.assisted === true && typeof reference.explanation === 'string' && Array.isArray(reference.sources))
        || (shift.pendingRetry !== undefined && (!isRecord(shift.pendingRetry) || shift.pendingRetry.instanceId !== `${id}:${shift.currentIndex + 1}` || shift.currentIndex >= shift.taskIds.length || shift.equipment.remaining.retry < 1))) {
        throw new Error('Повреждена сохранённая учебная смена');
      }
      if (shift.equipment.avatarSnapshot !== undefined) {
        shift.equipment.avatarSnapshot = validateAvatar(shift.equipment.avatarSnapshot);
        if (shift.equipment.avatarSnapshot.heldItem !== shift.equipment.heldItem) throw new Error('Снимок инструмента смены не совпадает с комплектом персонажа');
      }
      if (shift.equipment.avatarPortrait !== undefined) {
        if (!shift.equipment.avatarSnapshot) throw new Error('У сохранённого портрета смены нет полного профиля персонажа');
        shift.equipment.avatarPortrait = validateAvatarPortrait(shift.equipment.avatarPortrait, shift.equipment.avatarSnapshot);
      }
      if (shift.mode === BLITZ_MODE) {
        const blitz = shift.blitz;
        if (!isRecord(blitz) || blitz.rulesVersion !== BLITZ_RULES_VERSION || !Array.isArray(blitz.requestIds)
          || blitz.requestIds.length < 1 || blitz.requestIds.length > BLITZ_MAX_START_KEYS || new Set(blitz.requestIds).size !== blitz.requestIds.length
          || !blitz.requestIds.every((requestId) => typeof requestId === 'string' && BLITZ_REQUEST_ID.test(requestId))
          || !isTimestamp(blitz.deadlineAt) || Date.parse(blitz.deadlineAt) - Date.parse(shift.createdAt) !== BLITZ_DURATION_MS
          || JSON.stringify(shift.taskIds) !== JSON.stringify(BLITZ_TASK_IDS)
          || !Array.isArray(blitz.review) || blitz.review.length !== shift.currentIndex
          || blitz.review.filter((entry) => entry?.correct === true).length !== shift.correct
          || !blitz.review.every((entry, index) => isRecord(entry) && entry.instanceId === `${id}:${index + 1}` && typeof entry.question === 'string'
            && typeof entry.correct === 'boolean' && typeof entry.explanation === 'string' && Array.isArray(entry.sources)
            && entry.sources.every((source: unknown) => isRecord(source) && typeof source.sourceId === 'string' && typeof source.title === 'string' && typeof source.locator === 'string'))
          || shift.equipment.enabled || shift.equipment.charges.reference !== 0 || shift.equipment.charges.retry !== 0
          || shift.assistedTaskIds.length !== 0 || Object.keys(shift.references).length !== 0 || shift.pendingRetry !== undefined || shift.reward !== undefined
          || (shift.completedAt === undefined ? blitz.finishReason !== undefined || shift.currentIndex === shift.taskIds.length
            : !isTimestamp(shift.completedAt) || Date.parse(shift.completedAt) < Date.parse(shift.createdAt) || (blitz.finishReason === 'timeout'
              ? shift.completedAt !== blitz.deadlineAt || shift.currentIndex === shift.taskIds.length
              : blitz.finishReason !== 'answered' || shift.currentIndex !== shift.taskIds.length || Date.parse(shift.completedAt) > Date.parse(blitz.deadlineAt)))) {
          throw new Error('Повреждён сохранённый блиц: восстановление таймера или начисление наград запрещено');
        }
        validateAvatar(blitz.avatarSnapshot);
        if (blitz.avatarSnapshot.heldItem !== shift.equipment.heldItem) throw new Error('Снимок инструмента блица не совпадает с комплектом персонажа');
        if (shift.equipment.avatarSnapshot && avatarAppearanceKey(shift.equipment.avatarSnapshot) !== avatarAppearanceKey(blitz.avatarSnapshot)) throw new Error('Снимок внешности блица не совпадает с сохранённым портретом');
        for (const requestId of blitz.requestIds) {
          const key = `${shift.userId}:${requestId}`;
          if (blitzStartKeys.has(key)) throw new Error('Один запрос начала блица привязан к разным раундам');
          blitzStartKeys.add(key);
        }
        if (!shift.completedAt) {
          if (activeBlitzUsers.has(shift.userId)) throw new Error('У пользователя сохранено несколько активных блицев');
          activeBlitzUsers.add(shift.userId);
        }
      } else if (shift.blitz !== undefined) throw new Error('Блиц сохранён с некорректным режимом');
      const historicalAvatar = shift.equipment.avatarSnapshot ?? shift.blitz?.avatarSnapshot;
      for (const entry of Object.values(shift.responses)) {
        const cached = (entry.response as Record<string, unknown>).equipment;
        if (cached === undefined) continue;
        if (!isRecord(cached)) throw new Error('Повреждена сохранённая копия экипировки в ответе');
        if (cached.avatarSnapshot !== undefined) {
          const avatar = validateAvatar(cached.avatarSnapshot);
          if (!historicalAvatar || avatarAppearanceKey(avatar) !== avatarAppearanceKey(historicalAvatar)
            || avatar.heldItem !== cached.heldItem) throw new Error('Внешность в сохранённом ответе не совпадает с началом смены');
          cached.avatarSnapshot = avatar;
        }
        if (cached.avatarPortrait !== undefined) {
          if (!cached.avatarSnapshot || !shift.equipment.avatarPortrait) throw new Error('У портрета в сохранённом ответе нет исторического снимка');
          const portrait = validateAvatarPortrait(cached.avatarPortrait, validateAvatar(cached.avatarSnapshot));
          if (JSON.stringify(portrait) !== JSON.stringify(shift.equipment.avatarPortrait)) throw new Error('Портрет в сохранённом ответе не совпадает с началом смены');
          cached.avatarPortrait = portrait;
        }
      }
    }
    const eventIds = new Set<string>();
    for (const attempt of state.attempts) {
      if (!isRecord(attempt) || !isNonemptyString(attempt.eventId) || eventIds.has(attempt.eventId)) {
        throw new Error('Повреждён журнал учебных попыток');
      }
      eventIds.add(attempt.eventId);
    }
    this.state = state;
  }

  read(): TrainingState { return structuredClone(this.state); }

  /** A global queue also serializes different users sharing this single-file store. */
  transaction<T>(update: (draft: TrainingState) => T | Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const draft = structuredClone(this.state);
      const result = await update(draft);
      const serialized = JSON.stringify(draft) + '\n';
      // Resuming or replaying an already committed operation is read-only. It
      // must still work if the disk becomes temporarily unwritable afterwards.
      if (serialized === JSON.stringify(this.state) + '\n') return structuredClone(result);
      if (this.options.writeSnapshot) await this.options.writeSnapshot(serialized);
      else if (this.options.storePath) await this.writeAtomic(serialized);
      this.state = draft;
      return structuredClone(result);
    };
    const result = this.queue.then(run, run);
    // A temporary disk error must not poison all subsequent writes.
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async writeAtomic(snapshot: string): Promise<void> {
    const path = this.options.storePath!;
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temporary, 'wx', 0o600);
      try { await handle.writeFile(snapshot, 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      await rename(temporary, path);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}
