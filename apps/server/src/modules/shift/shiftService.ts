import { randomInt, randomUUID } from 'node:crypto';
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

export interface ShiftBonuses { hints: number; retries: number }

interface ShiftState {
  id: string;
  userId: string;
  seed: number;
  taskIds: string[];
  currentIndex: number;
  correct: number;
  createdAt: string;
  bonuses: ShiftBonuses;
  hintsUsed: number;
  retriesUsed: number;
  firstTryCorrect: number;
  attemptedTaskIds: Set<string>;
}

export class ShiftError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: string) {
    super(message);
  }
}

export interface ShiftServiceOptions {
  contentRoot: string;
  attemptLogPath: string;
}

export class ShiftService {
  private readonly tasks = new Map<string, TaskDefinition>();
  private readonly sources = new Map<string, SourceRecord>();
  private readonly methodProfiles = new Map<string, MethodProfile>();
  private readonly shifts = new Map<string, ShiftState>();
  private pack: ContentPack | null = null;

  constructor(private readonly options: ShiftServiceOptions) {}

  async init(): Promise<void> {
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
  }

  startShift(userId: string, bonuses: ShiftBonuses = { hints: 0, retries: 0 }) {
    const pack = this.requirePack();
    const state: ShiftState = {
      id: randomUUID(),
      userId,
      seed: randomInt(1, 0x7fffffff),
      taskIds: [...pack.tasks],
      currentIndex: 0,
      correct: 0,
      createdAt: new Date().toISOString(),
      bonuses: { hints: Math.max(0, Math.min(2, Math.trunc(bonuses.hints))), retries: Math.max(0, Math.min(2, Math.trunc(bonuses.retries))) },
      hintsUsed: 0,
      retriesUsed: 0,
      firstTryCorrect: 0,
      attemptedTaskIds: new Set<string>(),
    };
    this.shifts.set(state.id, state);
    return {
      shiftId: state.id,
      mode: pack.status === 'published' ? 'practice' : 'practice-draft',
      contentPack: this.contentPackId(pack),
      contentStatus: pack.status,
      task: this.buildCurrentTask(state).publicTask,
      progress: this.progress(state),
      bonuses: this.remainingBonuses(state),
    };
  }

  getCurrentTask(userId: string, shiftId: string) {
    const state = this.requireShift(userId, shiftId);
    if (state.currentIndex >= state.taskIds.length) throw new ShiftError(409, 'Смена уже завершена', 'shift_completed');
    return { task: this.buildCurrentTask(state).publicTask, progress: this.progress(state), bonuses: this.remainingBonuses(state) };
  }

  getHint(userId: string, shiftId: string) {
    const state = this.requireShift(userId, shiftId);
    if (state.currentIndex >= state.taskIds.length) throw new ShiftError(409, 'Смена завершена', 'shift_completed');
    if (this.remainingBonuses(state).hints < 1) throw new ShiftError(409, 'Справки на эту смену израсходованы', 'hints_exhausted');
    const kind = this.buildCurrentTask(state).publicTask.response.kind;
    const hints: Record<string, string> = {
      numeric: 'Проверьте знак, единицы измерения и правила декодирования группы КН-01. Сравните результат с физически допустимым диапазоном.',
      choice: 'Сопоставьте каждое утверждение с описанным физическим процессом и его временным развитием.',
      sequence: 'Начинайте с исходных наблюдений, затем переходите к их физическому анализу и итоговому выводу.',
      dependencySequence: 'Сначала выполните физический контроль наблюдений; заключительный анализ должен опираться на все предыдущие этапы.',
      stationPlot: 'Проверьте, какой параметр к какому полю станционной модели относится.',
      stationBoard: 'Сначала определите станцию, затем положение метеоэлемента относительно её центра.',
      findError: 'Проверьте физическую согласованность температуры и точки росы для каждой станции.',
    };
    state.hintsUsed += 1;
    return { hint: hints[kind] ?? 'Вспомните физический смысл величин и порядок проверки наблюдений.', bonuses: this.remainingBonuses(state) };
  }

  private remainingBonuses(state: ShiftState): ShiftBonuses {
    return { hints: state.bonuses.hints - state.hintsUsed, retries: state.bonuses.retries - state.retriesUsed };
  }

  async submitAnswer(userId: string, shiftId: string, instanceId: string, submitted: unknown, useRetry = false) {
    const state = this.requireShift(userId, shiftId);
    if (state.currentIndex >= state.taskIds.length) throw new ShiftError(409, 'Смена уже завершена', 'shift_completed');
    const current = this.buildCurrentTask(state);
    if (current.publicTask.instanceId !== instanceId) throw new ShiftError(409, 'Ответ относится не к текущему заданию', 'task_instance_mismatch');

    const validation = validateTaskAnswer(current.definition, current.validationContext, submitted);
    const firstAttempt = !state.attemptedTaskIds.has(instanceId);
    const retryGranted = !validation.correct && useRetry === true && firstAttempt && this.remainingBonuses(state).retries > 0;
    state.attemptedTaskIds.add(instanceId);
    if (retryGranted) state.retriesUsed += 1;
    if (validation.correct) {
      state.correct += 1;
      if (firstAttempt) state.firstTryCorrect += 1;
    }
    const answeredIndex = state.currentIndex;
    if (!retryGranted) state.currentIndex += 1;

    await this.appendAttempt({
      occurredAt: new Date().toISOString(),
      userId,
      shiftId,
      instanceId,
      definitionId: current.definition.id,
      contentPack: this.contentPackId(this.requirePack()),
      rulesetId: KN01_RULESET_ID,
      answer: validation.normalizedAnswer,
      correct: validation.correct,
    });

    const completed = state.currentIndex >= state.taskIds.length;
    const nextTask = completed ? null : this.buildCurrentTask(state).publicTask;
    return {
      feedback: {
        correct: validation.correct,
        correctAnswer: retryGranted ? null : validation.correctAnswer,
        details: retryGranted ? null : (validation as unknown as { details?: unknown }).details ?? null,
        explanation: retryGranted ? 'Повторная попытка активирована. Эталон не раскрыт — проверьте рассуждение ещё раз.' : current.definition.explanation ?? '',
        principleTags: retryGranted ? [] : current.definition.principle_tags ?? [],
        sources: retryGranted ? [] : this.resolveSources(current.definition),
      },
      answered: retryGranted ? answeredIndex : answeredIndex + 1,
      completed,
      nextTask,
      retryGranted,
      bonuses: this.remainingBonuses(state),
      progress: this.progress(state),
    };
  }

  getResult(userId: string, shiftId: string) {
    const state = this.requireShift(userId, shiftId);
    return {
      shiftId,
      completed: state.currentIndex >= state.taskIds.length,
      answered: state.currentIndex,
      correct: state.correct,
      total: state.taskIds.length,
      firstTryCorrect: state.firstTryCorrect,
      assisted: state.hintsUsed > 0 || state.retriesUsed > 0,
      hintsUsed: state.hintsUsed,
      retriesUsed: state.retriesUsed,
      startedAt: state.createdAt,
      contentPack: this.contentPackId(this.requirePack()),
    };
  }

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

  private requireShift(userId: string, shiftId: string): ShiftState {
    const state = this.shifts.get(shiftId);
    if (!state || state.userId !== userId) throw new ShiftError(404, 'Смена не найдена', 'shift_not_found');
    return state;
  }

  private contentPackId(pack: ContentPack): string { return `${pack.id}@${pack.version}`; }

  private async appendAttempt(record: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(this.options.attemptLogPath), { recursive: true });
    await appendFile(this.options.attemptLogPath, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
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
