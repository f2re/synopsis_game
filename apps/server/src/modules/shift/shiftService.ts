import { createHash, randomInt, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  assertPublicTaskSafe,
  createTaskInstance,
  validateTaskAnswer,
  type PublicTaskInstance,
  type TaskDefinition,
} from '@synopsis/content-engine';
import { decodeGroup, KN01_RULESET_ID, type SupportedKn01Group } from '@synopsis/kn01-codec';
import { DEFAULT_AVATAR, validateAvatar, type AvatarPortrait, type AvatarProfile } from '../identity/model.js';
import { composeAvatarPortrait, validateAvatarPortrait } from '../identity/avatarPortrait.js';
import { EquipmentService, effectsAllowed } from '../equipment/equipmentService.js';
import type { EquipmentSnapshot, ReferenceView, TrainingReward, TrainingShift, TrainingState } from '../equipment/model.js';
import { BLITZ_DURATION_MS, BLITZ_MAX_START_KEYS, BLITZ_MODE, BLITZ_REQUEST_ID, BLITZ_RULES_VERSION, BLITZ_TASK_IDS, type BlitzSessionView } from './blitzRules.js';

interface ContentPack {
  id: string;
  version: string;
  status: string;
  method_profile: string;
  tasks: string[];
}

interface SourceRecord {
  id: string;
  title: string;
  authority?: string;
}

interface DependencyGraphProfile {
  status?: string;
  operations: Array<{ id: string; label: string }>;
  dependencies: Array<[string, string]>;
  review?: { methodical?: string; independent_verification?: string; publication_allowed?: boolean };
}

interface MethodProfile {
  id: string;
  version: string;
  dependency_graphs?: Record<string, DependencyGraphProfile>;
}

type ShiftState = TrainingShift;

export interface ShiftAnswerResult {
  status: 'answered' | 'retry-offered';
  retryAvailable: boolean;
  feedback: {
    correct: boolean;
    correctAnswer?: unknown;
    details: unknown;
    explanation: string;
    principleTags: string[];
    sources: Array<{ sourceId: string; title: string; locator: string }>;
    assisted: boolean;
    retried: boolean;
    firstAttemptCorrect: boolean;
  };
  answered: number;
  completed: boolean;
  nextTask: PublicTaskInstance | null;
  progress: { answered: number; correct: number; current: number; total: number };
  equipment: EquipmentSnapshot;
  reward?: TrainingReward;
}

export class ShiftError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: string) {
    super(message);
  }
}

export interface ShiftServiceOptions {
  contentRoot: string;
  attemptLogPath: string;
  equipment?: EquipmentService;
  avatarAssetsRoot?: string;
  /** Server time only; injected clock is used by deterministic tests. */
  now?: () => Date;
}

export class ShiftService {
  private readonly tasks = new Map<string, TaskDefinition>();
  private readonly sources = new Map<string, SourceRecord>();
  private readonly methodProfiles = new Map<string, MethodProfile>();
  readonly equipment: EquipmentService;
  private auditQueue: Promise<void> = Promise.resolve();
  private readonly auditIds = new Set<string>();
  private pack: ContentPack | null = null;

  constructor(private readonly options: ShiftServiceOptions) { this.equipment = options.equipment ?? new EquipmentService(); }

  async init(): Promise<void> {
    await this.equipment.init();
    const [taskFiles, methodFiles, pack, sourceFile] = await Promise.all([
      this.readTaskFiles(),
      this.readMethodProfileFiles(),
      this.readJson<ContentPack>(join(this.options.contentRoot, 'packs/core_ru_001.json')),
      this.readJson<{ sources: SourceRecord[] }>(join(this.options.contentRoot, 'sources/sources.json')),
    ]);

    this.methodProfiles.clear();
    for (const profile of methodFiles) {
      if (this.methodProfiles.has(profile.id)) throw new Error(`Дублирующийся id методического профиля: ${profile.id}`);
      this.methodProfiles.set(profile.id, profile);
    }

    this.tasks.clear();
    for (const taskFile of taskFiles) {
      for (const rawTask of taskFile.tasks) {
        if (this.tasks.has(rawTask.id)) throw new Error(`Дублирующийся id задания: ${rawTask.id}`);
        this.tasks.set(rawTask.id, this.resolveTaskDefinition(rawTask));
      }
    }
    this.sources.clear();
    for (const source of sourceFile.sources) this.sources.set(source.id, source);
    this.pack = pack;
    this.validateContent();
    await this.migrateActivityPortraits();
    try {
      const log = await readFile(this.options.attemptLogPath, 'utf8');
      for (const line of log.split('\n')) {
        if (!line.trim()) continue;
        try { const entry = JSON.parse(line) as { eventId?: string }; if (entry.eventId) this.auditIds.add(entry.eventId); } catch { /* Legacy malformed audit lines cannot erase canonical evidence. */ }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('Журнал попыток недоступен; канонические записи сохранены в хранилище смен.');
    }
    await this.flushAudit();
  }

  async startShift(userId: string, avatar: AvatarProfile = DEFAULT_AVATAR, avatarPortrait?: AvatarPortrait) {
    const pack = this.requirePack();
    return this.equipment.store.transaction(async (draft) => {
      const active = Object.values(draft.shifts).find((shift) => shift.userId === userId && effectsAllowed(shift.mode) && shift.currentIndex < shift.taskIds.length);
      if (active) {
        if (active.contentPack !== this.contentPackId(pack)) throw new ShiftError(409, 'Учебный пакет изменился. Незавершённая смена требует восстановления прежней версии пакета.', 'content_version_changed');
        return this.startResponse(active);
      }
      const appearance = await this.activityAppearance(avatar, avatarPortrait);
      const mode = pack.status === 'published' ? 'practice' : 'practice-draft';
      const state: ShiftState = {
        id: randomUUID(), userId, seed: randomInt(1, 0x7fffffff), taskIds: [...pack.tasks],
        currentIndex: 0, correct: 0, unassistedCorrect: 0, createdAt: this.now(),
        mode, contentPack: this.contentPackId(pack), contentStatus: pack.status,
        equipment: this.equipment.snapshot(this.equipment.requireUser(draft, userId), appearance.avatar, mode, appearance.portrait),
        assistedTaskIds: [], references: {}, responses: {},
      };
      draft.shifts[state.id] = state;
      return this.startResponse(state);
    });
  }

  getCurrentTask(userId: string, shiftId: string) {
    const state = this.requirePracticeShift(userId, shiftId);
    if (state.currentIndex >= state.taskIds.length) throw new ShiftError(409, 'Смена уже завершена', 'shift_completed');
    if (state.contentPack !== this.contentPackId(this.requirePack())) throw new ShiftError(409, 'Версия учебного пакета изменилась', 'content_version_changed');
    return this.startResponse(state);
  }

  async submitAnswer(userId: string, shiftId: string, instanceId: string, submitted: unknown, attempt: unknown = 1): Promise<ShiftAnswerResult> {
    if (attempt !== 1 && attempt !== 2) throw new ShiftError(400, 'Допустимы только первая и повторная попытки', 'invalid_attempt');
    const fingerprint = this.fingerprint(submitted);
    const result = await this.equipment.store.transaction((draft) => {
      const state = this.requirePracticeShift(userId, shiftId, draft);
      const key = `${instanceId}:${attempt}`;
      const previous = state.responses[key];
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new ShiftError(409, 'Эта попытка уже зафиксирована с другим ответом', 'answer_already_recorded');
        return previous.response as ShiftAnswerResult;
      }
      const current = this.requireCurrentTask(state, instanceId);
      if (attempt === 2 && (!state.pendingRetry || state.pendingRetry.instanceId !== instanceId || state.equipment.remaining.retry < 1 || !effectsAllowed(state.mode))) {
        throw new ShiftError(409, 'Повторная попытка недоступна', 'retry_unavailable');
      }
      if (attempt === 1 && state.pendingRetry) throw new ShiftError(409, 'Выберите повтор или откройте разбор', 'retry_decision_required');
      const validation = validateTaskAnswer(current.definition, current.validationContext, submitted);
      if (attempt === 2) {
        state.equipment.remaining.retry -= 1;
        this.markAssisted(state, instanceId);
      }
      const assisted = state.assistedTaskIds.includes(instanceId);
      draft.attempts.push({ eventId: `${state.id}:${state.currentIndex + 1}:attempt:${attempt}`, occurredAt: this.now(),
        userId, shiftId, instanceId, definitionId: current.definition.id, contentPack: state.contentPack,
        rulesetId: KN01_RULESET_ID, answer: validation.normalizedAnswer, correct: validation.correct,
        attempt, assisted, });

      let response: ShiftAnswerResult;
      if (attempt === 1 && !validation.correct && state.equipment.remaining.retry > 0 && effectsAllowed(state.mode)) {
        state.pendingRetry = { instanceId, firstAnswer: structuredClone(submitted) };
        response = { status: 'retry-offered', retryAvailable: true,
          feedback: { correct: false, details: null, explanation: '', principleTags: [], sources: [], assisted, retried: false, firstAttemptCorrect: false },
          answered: state.currentIndex, completed: false, nextTask: null, progress: this.progress(state), equipment: structuredClone(state.equipment) };
      } else {
        response = this.finishTask(draft, state, current.definition, validation, attempt === 1 && validation.correct, attempt === 2);
      }
      state.responses[key] = { fingerprint, response };
      return response;
    });
    await this.flushAudit();
    return result;
  }

  async openReference(userId: string, shiftId: string, instanceId: string) {
    return this.equipment.store.transaction((draft) => {
      const state = this.requirePracticeShift(userId, shiftId, draft);
      const current = this.requireCurrentTask(state, instanceId);
      if (state.references[instanceId]) return { ...state.references[instanceId], equipment: state.equipment };
      if (!effectsAllowed(state.mode) || state.equipment.remaining.reference < 1) throw new ShiftError(409, 'В этой смене больше нет обращений к справке', 'reference_unavailable');
      const explanation = String(current.definition.explanation ?? '');
      if (!explanation) throw new ShiftError(409, 'Для этого задания ещё нет авторской справки', 'reference_missing');
      const reference: ReferenceView = { instanceId, explanation, sources: this.resolveSources(current.definition), assisted: true };
      state.references[instanceId] = reference;
      state.equipment.remaining.reference -= 1;
      this.markAssisted(state, instanceId);
      return { ...reference, equipment: state.equipment };
    });
  }

  async revealAnswer(userId: string, shiftId: string, instanceId: string): Promise<ShiftAnswerResult> {
    return this.equipment.store.transaction((draft) => {
      const state = this.requirePracticeShift(userId, shiftId, draft);
      const key = `${instanceId}:reveal`;
      if (state.responses[key]) return state.responses[key].response as ShiftAnswerResult;
      const current = this.requireCurrentTask(state, instanceId);
      if (!state.pendingRetry || state.pendingRetry.instanceId !== instanceId) throw new ShiftError(409, 'Сначала отправьте ответ на задание', 'reveal_unavailable');
      const validation = validateTaskAnswer(current.definition, current.validationContext, state.pendingRetry.firstAnswer);
      const response = this.finishTask(draft, state, current.definition, validation, false, false);
      state.responses[key] = { fingerprint: 'reveal', response };
      return response;
    });
  }

  getResult(userId: string, shiftId: string) {
    const state = this.requirePracticeShift(userId, shiftId);
    return {
      shiftId,
      completed: state.currentIndex >= state.taskIds.length,
      answered: state.currentIndex,
      correct: state.correct,
      total: state.taskIds.length,
      startedAt: state.createdAt,
      contentPack: state.contentPack,
      equipment: state.equipment,
      unassistedCorrect: state.unassistedCorrect,
      ...(state.reward ? { reward: state.reward } : {}),
    };
  }

  async blitzLobby(userId: string) {
    return this.equipment.store.transaction((draft) => {
      const now = this.now();
      const sessions = Object.values(draft.shifts).filter((shift) => shift.userId === userId && shift.mode === BLITZ_MODE);
      for (const session of sessions) this.expireBlitz(session, now);
      const latest = sessions.at(-1);
      const completedShifts = draft.users[userId]?.completedShifts ?? 0;
      return { mode: BLITZ_MODE, rulesVersion: BLITZ_RULES_VERSION, durationSeconds: BLITZ_DURATION_MS / 1000,
        total: BLITZ_TASK_IDS.length, eligible: completedShifts >= 1, completedShifts,
        contentPack: this.contentPackId(this.requirePack()), contentStatus: this.requirePack().status,
        session: latest ? this.blitzView(latest, now) : null };
    });
  }

  async startBlitz(userId: string, avatar: AvatarProfile, requestId: unknown, avatarPortrait?: AvatarPortrait): Promise<BlitzSessionView> {
    if (typeof requestId !== 'string' || !BLITZ_REQUEST_ID.test(requestId)) {
      throw new ShiftError(400, 'Для начала блица нужен идентификатор запроса', 'invalid_request_id');
    }
    return this.equipment.store.transaction(async (draft) => {
      const now = this.now();
      const sessions = Object.values(draft.shifts).filter((shift) => shift.userId === userId && shift.mode === BLITZ_MODE);
      for (const session of sessions) this.expireBlitz(session, now);
      // Replaying a start after a lost response, even after expiry, never creates a new clock.
      const replay = sessions.find((shift) => shift.blitz?.requestIds.includes(requestId));
      if (replay) return this.blitzView(replay, now);
      const active = sessions.find((shift) => !shift.completedAt);
      if (active) {
        if (active.blitz!.requestIds.length >= BLITZ_MAX_START_KEYS) throw new ShiftError(429, 'Для восстановления раунда обновите его состояние', 'blitz_start_limit');
        // A second tab's start must also replay this same round after it expires.
        active.blitz!.requestIds.push(requestId);
        return this.blitzView(active, now);
      }
      if ((draft.users[userId]?.completedShifts ?? 0) < 1) {
        throw new ShiftError(403, 'Сначала завершите одну учебную смену КН-01', 'blitz_practice_locked');
      }
      const pack = this.requirePack();
      if (!BLITZ_TASK_IDS.every((id) => pack.tasks.includes(id))) {
        throw new ShiftError(503, 'Для этой версии блица недоступен полный набор заданий', 'blitz_content_unavailable');
      }
      const appearance = await this.activityAppearance(avatar, avatarPortrait);
      const state: ShiftState = {
        id: randomUUID(), userId, seed: randomInt(1, 0x7fffffff), taskIds: [...BLITZ_TASK_IDS],
        currentIndex: 0, correct: 0, unassistedCorrect: 0, createdAt: now,
        mode: BLITZ_MODE, contentPack: this.contentPackId(pack), contentStatus: pack.status,
        equipment: this.equipment.snapshot(this.equipment.requireUser(draft, userId), appearance.avatar, BLITZ_MODE, appearance.portrait),
        assistedTaskIds: [], references: {}, responses: {},
        blitz: { rulesVersion: BLITZ_RULES_VERSION, requestIds: [requestId], deadlineAt: new Date(Date.parse(now) + BLITZ_DURATION_MS).toISOString(),
          avatarSnapshot: appearance.avatar, review: [] },
      };
      draft.shifts[state.id] = state;
      return this.blitzView(state, now);
    });
  }

  async getBlitz(userId: string, blitzId: string): Promise<BlitzSessionView> {
    return this.equipment.store.transaction((draft) => {
      const state = this.requireBlitz(userId, blitzId, draft);
      const now = this.now();
      this.expireBlitz(state, now);
      return this.blitzView(state, now);
    });
  }

  async submitBlitzAnswer(userId: string, blitzId: string, instanceId: string, submitted: unknown) {
    const fingerprint = this.fingerprint(submitted);
    const result = await this.equipment.store.transaction((draft) => {
      const state = this.requireBlitz(userId, blitzId, draft);
      const now = this.now();
      this.expireBlitz(state, now);
      const key = `${instanceId}:1`;
      const previous = state.responses[key];
      if (previous) {
        if (previous.fingerprint !== fingerprint) return { conflict: true as const };
        // The feedback is immutable, but the session is always current (two tabs/reconnect).
        return { accepted: true, feedback: (previous.response as ShiftAnswerResult).feedback, session: this.blitzView(state, now) };
      }
      // Return the persisted result rather than throwing inside the atomic transaction.
      if (state.completedAt) return { accepted: false, session: this.blitzView(state, now) };
      const current = this.requireCurrentTask(state, instanceId);
      const validation = validateTaskAnswer(current.definition, current.validationContext, submitted);
      draft.attempts.push({ eventId: `${state.id}:${state.currentIndex + 1}:attempt:1`, occurredAt: now,
        userId, shiftId: blitzId, instanceId, definitionId: current.definition.id, contentPack: state.contentPack,
        rulesetId: KN01_RULESET_ID, mode: BLITZ_MODE, modeRulesVersion: state.blitz!.rulesVersion,
        answer: validation.normalizedAnswer, correct: validation.correct, attempt: 1, assisted: false });
      const response = this.finishTask(draft, state, current.definition, validation, validation.correct, false, now);
      state.responses[key] = { fingerprint, response };
      state.blitz!.review.push({ instanceId, question: current.publicTask.question, correct: validation.correct,
        explanation: response.feedback.explanation, sources: response.feedback.sources });
      return { accepted: true, feedback: response.feedback, session: this.blitzView(state, now) };
    });
    if ('conflict' in result) throw new ShiftError(409, 'Этот ответ уже зафиксирован', 'answer_already_recorded');
    await this.flushAudit();
    return result;
  }

  private expireBlitz(state: ShiftState, now: string): void {
    if (!state.completedAt && state.blitz && Date.parse(now) >= Date.parse(state.blitz.deadlineAt)) {
      state.completedAt = state.blitz.deadlineAt;
      state.blitz.finishReason = 'timeout';
    }
  }

  private async activityAppearance(avatar: AvatarProfile, portrait?: AvatarPortrait) {
    const saved = validateAvatar(avatar);
    return { avatar: saved, portrait: portrait ? validateAvatarPortrait(portrait, saved)
      : await composeAvatarPortrait(saved, { assetsRoot: this.options.avatarAssetsRoot }) };
  }

  private async migrateActivityPortraits(): Promise<void> {
    await this.equipment.store.transaction(async (draft) => {
      for (const shift of Object.values(draft.shifts)) {
        // Never substitute today's clothes for an unknown historical outfit.
        const profile = shift.equipment.avatarSnapshot ?? shift.blitz?.avatarSnapshot;
        if (!profile) continue;
        const appearance = await this.activityAppearance(profile, shift.equipment.avatarPortrait);
        shift.equipment.avatarSnapshot = appearance.avatar;
        shift.equipment.avatarPortrait = appearance.portrait;
        for (const entry of Object.values(shift.responses)) {
          const response = entry.response as { equipment?: EquipmentSnapshot };
          if (response.equipment) {
            // Present cached copies were already validated by TrainingStore.
            // Only missing legacy copies may be filled from this same historical pair.
            response.equipment.avatarSnapshot ??= { ...appearance.avatar };
            response.equipment.avatarPortrait ??= { ...appearance.portrait };
          }
        }
      }
    });
  }

  private blitzView(state: ShiftState, now: string): BlitzSessionView {
    const blitz = state.blitz!;
    if (!state.completedAt && state.contentPack !== this.contentPackId(this.requirePack())) {
      throw new ShiftError(409, 'Версия учебного пакета изменилась. Текущий блиц требует прежней версии пакета.', 'content_version_changed');
    }
    return { id: state.id, mode: BLITZ_MODE, status: state.completedAt ? 'completed' : 'active',
      rulesVersion: blitz.rulesVersion, durationSeconds: BLITZ_DURATION_MS / 1000, startedAt: state.createdAt,
      deadlineAt: blitz.deadlineAt, serverNow: now, ...(state.completedAt ? { completedAt: state.completedAt, finishReason: blitz.finishReason } : {}),
      contentPack: state.contentPack, contentStatus: state.contentStatus,
      avatarSnapshot: blitz.avatarSnapshot, equipment: state.equipment, progress: this.progress(state),
      task: state.completedAt ? null : this.buildCurrentTask(state).publicTask,
      // The server has accepted these answers already; unopened tasks are never included.
      review: blitz.review };
  }

  private requireBlitz(userId: string, blitzId: string, draft: TrainingState): ShiftState {
    const state = this.requireShift(userId, blitzId, draft);
    if (state.mode !== BLITZ_MODE || !state.blitz) throw new ShiftError(404, 'Блиц не найден', 'blitz_not_found');
    return state;
  }

  private requirePracticeShift(userId: string, shiftId: string, draft = this.equipment.store.read()): ShiftState {
    const state = this.requireShift(userId, shiftId, draft);
    if (!effectsAllowed(state.mode)) throw new ShiftError(409, 'Для этого сценария используйте его отдельный маршрут', 'shift_mode_mismatch');
    return state;
  }

  private finishTask(draft: TrainingState, state: ShiftState, definition: TaskDefinition,
    validation: ReturnType<typeof validateTaskAnswer>, firstCorrect: boolean, retried: boolean, completedAt = this.now()): ShiftAnswerResult {
    const instanceId = `${state.id}:${state.currentIndex + 1}`;
    const assisted = state.assistedTaskIds.includes(instanceId);
    if (firstCorrect) state.correct += 1;
    if (firstCorrect && !assisted) state.unassistedCorrect += 1;
    delete state.pendingRetry;
    state.currentIndex += 1;
    const completed = state.currentIndex === state.taskIds.length;
    if (completed) {
      if (state.mode === BLITZ_MODE && state.blitz) {
        state.completedAt = completedAt;
        state.blitz.finishReason = 'answered';
      } else this.equipment.complete(draft, state, completedAt);
    }
    return { status: 'answered', retryAvailable: false,
      feedback: { correct: validation.correct, correctAnswer: validation.correctAnswer,
        details: (validation as unknown as { details?: unknown }).details ?? null,
        explanation: definition.explanation ?? '', principleTags: definition.principle_tags ?? [],
        sources: this.resolveSources(definition), assisted, retried, firstAttemptCorrect: firstCorrect },
      answered: state.currentIndex, completed, nextTask: completed ? null : this.buildCurrentTask(state).publicTask,
      progress: this.progress(state), equipment: structuredClone(state.equipment),
      ...(state.reward ? { reward: structuredClone(state.reward) } : {}),
    };
  }

  private startResponse(state: ShiftState) {
    const task = this.buildCurrentTask(state).publicTask;
    return { shiftId: state.id, mode: state.mode, contentPack: state.contentPack, contentStatus: state.contentStatus,
      task, progress: this.progress(state), equipment: state.equipment,
      retryAvailable: Boolean(state.pendingRetry),
      ...(state.references[task.instanceId] ? { reference: state.references[task.instanceId] } : {}),
    };
  }

  private requireCurrentTask(state: ShiftState, instanceId: string) {
    if (state.currentIndex >= state.taskIds.length) throw new ShiftError(409, 'Смена уже завершена', 'shift_completed');
    if (state.contentPack !== this.contentPackId(this.requirePack())) throw new ShiftError(409, 'Версия учебного пакета изменилась', 'content_version_changed');
    const current = this.buildCurrentTask(state);
    if (current.publicTask.instanceId !== instanceId) throw new ShiftError(409, 'Ответ относится не к текущему заданию', 'task_instance_mismatch');
    return current;
  }

  private markAssisted(state: ShiftState, instanceId: string) {
    if (!state.assistedTaskIds.includes(instanceId)) state.assistedTaskIds.push(instanceId);
    state.equipment.assistedTasks = state.assistedTaskIds.length;
  }

  private now(): string { return (this.options.now?.() ?? new Date()).toISOString(); }
  private fingerprint(input: unknown): string { return createHash('sha256').update(JSON.stringify(input) ?? 'undefined').digest('hex'); }

  private resolveTaskDefinition(task: TaskDefinition): TaskDefinition {
    if (task.type !== 'dependencySequence') return task;
    const profileId = String(task.method_profile ?? '');
    const graphId = String(task.dependency_graph ?? '');
    const profile = this.methodProfiles.get(profileId);
    const graph = profile?.dependency_graphs?.[graphId];
    if (!profile || !graph) throw new Error(`Задание ${task.id}: не найден граф ${profileId}/${graphId}`);
    if (graph.review?.publication_allowed === true && graph.status !== 'published') {
      throw new Error(`Граф ${profileId}/${graphId}: publication_allowed=true при status=${graph.status}`);
    }
    const indexById = new Map(graph.operations.map((operation, index) => [operation.id, index]));
    if (indexById.size !== graph.operations.length) throw new Error(`Граф ${profileId}/${graphId}: дублирующиеся operation.id`);
    const dependencies: Array<[number, number]> = graph.dependencies.map(([beforeId, afterId]) => {
      const before = indexById.get(beforeId);
      const after = indexById.get(afterId);
      if (before === undefined || after === undefined) throw new Error(`Граф ${profileId}/${graphId}: неизвестная операция в зависимости ${beforeId} -> ${afterId}`);
      return [before, after];
    });
    return {
      ...task,
      steps: graph.operations.map((operation) => operation.label),
      dependencies,
      resolved_profile_version: profile.version,
      resolved_graph_status: graph.status ?? 'draft',
    };
  }

  private buildCurrentTask(state: ShiftState): {
    publicTask: PublicTaskInstance;
    validationContext: Record<string, unknown>;
    definition: TaskDefinition;
  } {
    const taskId = state.taskIds[state.currentIndex];
    const definition = this.tasks.get(taskId);
    if (!definition) throw new ShiftError(500, `Не найдено задание ${taskId}`, 'content_missing');
    const built = createTaskInstance(definition, {
      seed: state.seed + state.currentIndex,
      instanceId: `${state.id}:${state.currentIndex + 1}`,
      contentPack: this.contentPackId(this.requirePack()),
    });
    assertPublicTaskSafe(built.publicTask);
    return { ...built, definition };
  }

  private validateContent(): void {
    const pack = this.requirePack();
    if (!Array.isArray(pack.tasks) || pack.tasks.length === 0) throw new Error('Пакет core_ru_001 не содержит заданий');
    for (const taskId of pack.tasks) {
      const definition = this.tasks.get(taskId);
      if (!definition) throw new Error(`Пакет ссылается на отсутствующее задание ${taskId}`);
      const built = createTaskInstance(definition, { seed: 1, instanceId: `validation:${taskId}`, contentPack: this.contentPackId(pack) });
      assertPublicTaskSafe(built.publicTask);

      if (definition.type === 'decode' && definition.answer?.kind === 'numeric') {
        const payload = definition.payload as { group?: string; encoded?: string } | undefined;
        if (!payload?.group || !payload.encoded) throw new Error(`У задания ${taskId} отсутствуют group/encoded`);
        const decoded = decodeGroup(payload.encoded, payload.group as SupportedKn01Group, KN01_RULESET_ID);
        if (typeof decoded.value !== 'number') throw new Error(`Задание ${taskId} ожидает числовой результат, а кодек вернул структуру`);
        if (decoded.value !== Number(definition.answer.value)) throw new Error(`Эталон ${taskId} расходится с кодеком: ${definition.answer.value} != ${decoded.value}`);
      }
    }
  }

  private resolveSources(definition: TaskDefinition) {
    return (definition.sources ?? []).map((reference: { source_id: string; locator?: string }) => ({
      sourceId: reference.source_id,
      title: this.sources.get(reference.source_id)?.title ?? reference.source_id,
      locator: reference.locator ?? '',
    }));
  }

  private progress(state: ShiftState) {
    return { answered: state.currentIndex, correct: state.correct, current: Math.min(state.currentIndex + 1, state.taskIds.length), total: state.taskIds.length };
  }

  private requirePack(): ContentPack {
    if (!this.pack) throw new ShiftError(503, 'Учебный пакет ещё не загружен', 'content_not_ready');
    return this.pack;
  }

  private requireShift(userId: string, shiftId: string, data = this.equipment.store.read()): ShiftState {
    const state = data.shifts[shiftId];
    if (!state || state.userId !== userId) throw new ShiftError(404, 'Смена не найдена', 'shift_not_found');
    return state;
  }

  private contentPackId(pack: ContentPack): string { return `${pack.id}@${pack.version}`; }

  private async appendAttempt(record: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(this.options.attemptLogPath), { recursive: true });
    await appendFile(this.options.attemptLogPath, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
  }

  private async flushAudit(): Promise<void> {
    const flush = async () => {
      for (const record of this.equipment.store.read().attempts) {
        if (this.auditIds.has(record.eventId)) continue;
        try {
          await this.appendAttempt(record);
          this.auditIds.add(record.eventId);
        } catch {
          // The atomic training store remains authoritative. Retry projection on
          // the next answer or restart; never turn a committed answer into a 500.
          console.warn('Копия журнала попыток временно недоступна; запись сохранена в хранилище смен.');
          return;
        }
      }
    };
    this.auditQueue = this.auditQueue.then(flush, flush);
    await this.auditQueue;
  }

  private async readTaskFiles(): Promise<Array<{ tasks: TaskDefinition[] }>> {
    const taskRoot = join(this.options.contentRoot, 'tasks');
    const files = (await readdir(taskRoot)).filter((name) => name.endsWith('.json')).sort();
    if (files.length === 0) throw new Error('Каталог content/tasks не содержит JSON-файлов заданий');
    return Promise.all(files.map((name) => this.readJson<{ tasks: TaskDefinition[] }>(join(taskRoot, name))));
  }

  private async readMethodProfileFiles(): Promise<MethodProfile[]> {
    const profileRoot = join(this.options.contentRoot, 'method-profiles');
    const files = (await readdir(profileRoot)).filter((name) => name.endsWith('.json')).sort();
    if (files.length === 0) throw new Error('Каталог content/method-profiles не содержит JSON-файлов');
    return Promise.all(files.map((name) => this.readJson<MethodProfile>(join(profileRoot, name))));
  }

  private async readJson<T>(path: string): Promise<T> {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  }
}
