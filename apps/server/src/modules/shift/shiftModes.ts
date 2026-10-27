export type ShiftMode = 'mentor' | 'solo' | 'solo_with_handbook' | 'blitz';

export interface ShiftModeConfig {
  mode: ShiftMode;
  name: string;
  handbookAllowed: boolean;
  mentorHintsAllowed: boolean;
  timeLimitMs: number | null;
  networkGraceMs: number;
  baseMasteryMultiplier: number;
}

export const SHIFT_MODE_CONFIGS: Record<ShiftMode, ShiftModeConfig> = {
  mentor: {
    mode: 'mentor',
    name: 'С наставником',
    handbookAllowed: true,
    mentorHintsAllowed: true,
    timeLimitMs: null,
    networkGraceMs: 0,
    baseMasteryMultiplier: 0.6,
  },
  solo: {
    mode: 'solo',
    name: 'Самостоятельно',
    handbookAllowed: true,
    mentorHintsAllowed: false,
    timeLimitMs: null,
    networkGraceMs: 0,
    baseMasteryMultiplier: 1.0,
  },
  solo_with_handbook: {
    mode: 'solo_with_handbook',
    name: 'Самостоятельно со справочником',
    handbookAllowed: true,
    mentorHintsAllowed: false,
    timeLimitMs: null,
    networkGraceMs: 0,
    baseMasteryMultiplier: 0.6,
  },
  blitz: {
    mode: 'blitz',
    name: 'Блиц 90 с',
    handbookAllowed: false,
    mentorHintsAllowed: false,
    timeLimitMs: 90_000,
    networkGraceMs: 2_500,
    baseMasteryMultiplier: 0.8,
  },
};

export class ShiftModeError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

/**
 * Проверяет доступность выбранного режима для игрока по истории пройденных смен:
 * - «С наставником»: доступен всегда;
 * - «Самостоятельно»: доступен после сдачи хотя бы одной смены;
 * - «Блиц 90 с»: доступен после сдачи смены С2 («Термометр»).
 */
export function assertModeAllowed(mode: ShiftMode, userCompletedShifts: string[]): void {
  if (mode === 'mentor') {
    return;
  }
  if (mode === 'solo' || mode === 'solo_with_handbook') {
    if (userCompletedShifts.length === 0) {
      throw new ShiftModeError(
        403,
        'Режим «Самостоятельно» открывается после первой сданной смены',
        'MODE_LOCKED',
      );
    }
    return;
  }
  if (mode === 'blitz') {
    if (!userCompletedShifts.includes('shift_c2')) {
      throw new ShiftModeError(
        403,
        'Режим «Блиц 90 с» открывается после сдачи смены С2 (Термометр)',
        'MODE_LOCKED',
      );
    }
    return;
  }

  throw new ShiftModeError(400, `Неизвестный режим смены: ${mode}`, 'UNKNOWN_MODE');
}

export interface ActiveShiftSessionOptions {
  id: string;
  userId: string;
  shiftId: string;
  mode: ShiftMode;
  userCompletedShifts: string[];
  tasks: string[];
  startedAt?: number;
}

/**
 * Серверный контекст активной смены с контролем таймера и фиксацией справочника.
 */
export class ActiveShiftSession {
  public readonly id: string;
  public readonly userId: string;
  public readonly shiftId: string;
  public readonly mode: ShiftMode;
  public readonly startedAt: number;
  public readonly config: ShiftModeConfig;
  public readonly tasks: string[];

  private currentTaskIndex = 0;
  private readonly tasksWithHandbook = new Set<string>();
  private completed = false;

  constructor(options: ActiveShiftSessionOptions) {
    assertModeAllowed(options.mode, options.userCompletedShifts);

    this.id = options.id;
    this.userId = options.userId;
    this.shiftId = options.shiftId;
    this.mode = options.mode;
    this.config = SHIFT_MODE_CONFIGS[options.mode];
    this.tasks = options.tasks;
    this.startedAt = options.startedAt ?? Date.now();
  }

  public isCompleted(): boolean {
    return this.completed;
  }

  public getRemainingMs(nowMs: number = Date.now()): number | null {
    if (this.config.timeLimitMs === null) {
      return null;
    }
    const elapsed = nowMs - this.startedAt;
    const totalAllowed = this.config.timeLimitMs + this.config.networkGraceMs;
    const remaining = totalAllowed - elapsed;
    return Math.max(0, remaining);
  }

  public isExpired(nowMs: number = Date.now()): boolean {
    if (this.config.timeLimitMs === null) {
      return false;
    }
    const elapsed = nowMs - this.startedAt;
    return elapsed > this.config.timeLimitMs + this.config.networkGraceMs;
  }

  /**
   * Фиксирует открытие справочника для текущего задания.
   * В блице открытие справочника категорически запрещено.
   */
  public openHandbook(taskId: string): {
    handbookUsed: boolean;
    effectiveMultiplier: number;
  } {
    if (this.completed) {
      throw new ShiftModeError(400, 'Смена уже завершена', 'SHIFT_COMPLETED');
    }
    if (!this.config.handbookAllowed) {
      throw new ShiftModeError(
        403,
        'Справочник недоступен в режиме «Блиц 90 с»',
        'HANDBOOK_FORBIDDEN_IN_BLITZ',
      );
    }

    this.tasksWithHandbook.add(taskId);

    const effectiveMultiplier =
      this.mode === 'solo' ? SHIFT_MODE_CONFIGS.solo_with_handbook.baseMasteryMultiplier : this.config.baseMasteryMultiplier;

    return {
      handbookUsed: true,
      effectiveMultiplier,
    };
  }

  /**
   * Приём ответа на задание с серверной проверкой таймера блица и расчётом множителя освоения.
   */
  public submitAnswer(
    taskId: string,
    nowMs: number = Date.now(),
  ): {
    remainingMs: number | null;
    effectiveMode: ShiftMode;
    masteryMultiplier: number;
    isLastTask: boolean;
  } {
    if (this.completed) {
      throw new ShiftModeError(400, 'Смена уже завершена', 'SHIFT_COMPLETED');
    }

    if (this.isExpired(nowMs)) {
      this.completed = true;
      throw new ShiftModeError(
        408,
        'Время выполнения смены в режиме «Блиц» истекло (90 с)',
        'BLITZ_TIMEOUT',
      );
    }

    const handbookUsed = this.tasksWithHandbook.has(taskId);
    let effectiveMode: ShiftMode = this.mode;
    let masteryMultiplier = this.config.baseMasteryMultiplier;

    if (this.mode === 'solo' && handbookUsed) {
      effectiveMode = 'solo_with_handbook';
      masteryMultiplier = SHIFT_MODE_CONFIGS.solo_with_handbook.baseMasteryMultiplier;
    }

    this.currentTaskIndex += 1;
    const isLastTask = this.currentTaskIndex >= this.tasks.length;
    if (isLastTask) {
      this.completed = true;
    }

    return {
      remainingMs: this.getRemainingMs(nowMs),
      effectiveMode,
      masteryMultiplier,
      isLastTask,
    };
  }

  public hasUsedHandbook(taskId: string): boolean {
    return this.tasksWithHandbook.has(taskId);
  }
}
