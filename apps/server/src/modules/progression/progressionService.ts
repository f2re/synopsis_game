import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const KN01_LEVEL1_ELEMENTS = [
  'AAXX',
  'YYGGiw',
  'IIiii',
  'Nddff',
  '1snTTT',
  '2snTdTdTd',
  '3PoPoPoPo',
  '4PPPP',
  '5appp',
  '00fff',
] as const;

export type Kn01Element = (typeof KN01_LEVEL1_ELEMENTS)[number];

export const KN01_LEVEL1_SKILLS = [
  'kn01.header',
  'kn01.temperature',
  'kn01.pressure',
  'kn01.wind_clouds',
  'kn01.full_telegram',
] as const;

export type Kn01Skill = (typeof KN01_LEVEL1_SKILLS)[number];

export const ELEMENT_TO_SKILL: Record<Kn01Element, Kn01Skill> = {
  AAXX: 'kn01.header',
  YYGGiw: 'kn01.header',
  IIiii: 'kn01.header',
  '1snTTT': 'kn01.temperature',
  '2snTdTdTd': 'kn01.temperature',
  '3PoPoPoPo': 'kn01.pressure',
  '4PPPP': 'kn01.pressure',
  '5appp': 'kn01.pressure',
  Nddff: 'kn01.wind_clouds',
  '00fff': 'kn01.wind_clouds',
};

export const BASE_ELEMENT_GAINS: Record<Kn01Element, number> = {
  AAXX: 20.0,
  YYGGiw: 20.0,
  IIiii: 20.0,
  '1snTTT': 18.0,
  '2snTdTdTd': 18.0,
  '3PoPoPoPo': 16.0,
  '4PPPP': 16.0,
  '5appp': 16.0,
  Nddff: 18.0,
  '00fff': 18.0,
};

export const MANDATORY_SHIFTS_SEQUENCE = [
  'shift_c1',
  'shift_c2',
  'shift_c3',
  'shift_c4',
  'shift_c5',
] as const;

export type ShiftMode = 'mentor' | 'solo' | 'solo_with_handbook' | 'blitz';

export const MODE_MULTIPLIERS: Record<ShiftMode, number> = {
  mentor: 0.6,
  solo: 1.0,
  solo_with_handbook: 0.6,
  blitz: 0.8,
};

export interface ProgressionConfig {
  minElementMasteryForExam: number;
  minOverallMasteryForExam: number;
  examTasksCount: number;
  examMinAccuracy: number;
  examMinCorrect: number;
  dailyDecayRate: number;
  decayGraceHours: number;
  decayFloor: number;
  errorPenaltyFactor: number;
}

export const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
  minElementMasteryForExam: 80.0,
  minOverallMasteryForExam: 85.0,
  examTasksCount: 12,
  examMinAccuracy: 0.8,
  examMinCorrect: 10,
  dailyDecayRate: 0.02,
  decayGraceHours: 24,
  decayFloor: 40.0,
  errorPenaltyFactor: 0.35,
};

export function calculateMasteryGain(
  currentMastery: number,
  baseGain: number,
  mode: ShiftMode = 'solo',
  difficulty: number = 1,
): number {
  const kMode = MODE_MULTIPLIERS[mode] ?? 1.0;
  const kDiff = difficulty === 3 ? 1.5 : difficulty === 2 ? 1.25 : 1.0;
  const saturation = Math.max(0, 1 - currentMastery / 100);
  return Number((kMode * kDiff * baseGain * saturation).toFixed(2));
}

export function calculateMasteryPenalty(
  currentMastery: number,
  baseGain: number,
  mode: ShiftMode = 'solo',
  errorPenaltyFactor: number = 0.35,
): number {
  const kMode = MODE_MULTIPLIERS[mode] ?? 1.0;
  return Number((kMode * errorPenaltyFactor * baseGain * (currentMastery / 100)).toFixed(2));
}

export function calculateTimeDecay(
  mastery: number,
  hoursElapsed: number,
  graceHours: number = 24,
  dailyDecayRate: number = 0.02,
  floor: number = 40.0,
): number {
  if (hoursElapsed <= graceHours || mastery <= floor) {
    return mastery;
  }
  const days = (hoursElapsed - graceHours) / 24;
  const decayed = mastery * Math.pow(1 - dailyDecayRate, days);
  return Math.max(floor, decayed);
}

export interface ErrorJournalEntry {
  id: string;
  taskTemplateId: string;
  errorCode: string;
  element: Kn01Element;
  repeatCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface ShiftSummary {
  id: string;
  userId: string;
  shiftId: string;
  mode: ShiftMode;
  totalTasks: number;
  correctTasks: number;
  accuracy: number;
  durationMs: number;
  maxStreak: number;
  passed: boolean;
  rewardsGranted: string[];
  unlockedShifts: string[];
  unlockedLocations: string[];
  masteryDeltas: Partial<Record<Kn01Element, number>>;
  completedAt: string;
}

export interface ProgressionState {
  userId: string;
  elementMastery: Record<Kn01Element, number>;
  skillMastery: Record<Kn01Skill, number>;
  completedShifts: string[];
  unlockedShifts: string[];
  examPassed: boolean;
  examAttempts: number;
  rankTitle: string;
  rewards: string[];
  unlockedLocations: string[];
  errorJournal: Record<string, ErrorJournalEntry>;
  shiftHistory: ShiftSummary[];
  maxStreak: number;
  currentStreak: number;
  lastActiveAt: string;
  failedExamCooldownShiftsRemaining: number;
}

export class ProgressionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export interface ProgressionServiceOptions {
  storePath?: string;
  config?: Partial<ProgressionConfig>;
}

export class ProgressionService {
  private readonly config: ProgressionConfig;
  private readonly storePath?: string;
  private readonly states = new Map<string, ProgressionState>();

  constructor(options: ProgressionServiceOptions = {}) {
    this.storePath = options.storePath;
    this.config = { ...DEFAULT_PROGRESSION_CONFIG, ...options.config };
  }

  public getProgression(userId: string, now: string = new Date().toISOString()): ProgressionState {
    let state = this.states.get(userId);
    if (!state) {
      state = this.createInitialState(userId, now);
      this.states.set(userId, state);
    }
    return state;
  }

  public applyDecay(userId: string, now: string = new Date().toISOString()): void {
    const state = this.getProgression(userId, now);
    const lastActive = new Date(state.lastActiveAt).getTime();
    const current = new Date(now).getTime();
    const hoursElapsed = Math.max(0, (current - lastActive) / (1000 * 60 * 60));

    if (hoursElapsed > this.config.decayGraceHours) {
      for (const el of KN01_LEVEL1_ELEMENTS) {
        state.elementMastery[el] = Number(
          calculateTimeDecay(
            state.elementMastery[el],
            hoursElapsed,
            this.config.decayGraceHours,
            this.config.dailyDecayRate,
            this.config.decayFloor,
          ).toFixed(2),
        );
      }
      this.recalculateSkillMastery(state);
    }
  }

  public recordAnswer(
    userId: string,
    input: {
      taskTemplateId: string;
      element: Kn01Element;
      isCorrect: boolean;
      errorCode?: string;
      mode?: ShiftMode;
      difficulty?: number;
      now?: string;
    },
  ): {
    newMastery: number;
    delta: number;
    errorEntry?: ErrorJournalEntry;
  } {
    const now = input.now ?? new Date().toISOString();
    const state = this.getProgression(userId, now);
    state.lastActiveAt = now;

    const element = input.element;
    const currentMastery = state.elementMastery[element] ?? 0.0;
    const baseGain = BASE_ELEMENT_GAINS[element] ?? 18.0;
    const mode = input.mode ?? 'solo';
    const difficulty = input.difficulty ?? 1;

    let delta = 0;
    let errorEntry: ErrorJournalEntry | undefined;

    if (input.isCorrect) {
      state.currentStreak += 1;
      if (state.currentStreak > state.maxStreak) {
        state.maxStreak = state.currentStreak;
      }
      delta = calculateMasteryGain(currentMastery, baseGain, mode, difficulty);
      state.elementMastery[element] = Number(Math.min(100.0, currentMastery + delta).toFixed(2));

      // Resolve in error journal if previously recorded
      const journalKey = `${input.taskTemplateId}:${element}`;
      if (state.errorJournal[journalKey] && !state.errorJournal[journalKey].resolved) {
        state.errorJournal[journalKey].resolved = true;
        state.errorJournal[journalKey].resolvedAt = now;
      }
    } else {
      state.currentStreak = 0;
      delta = -calculateMasteryPenalty(
        currentMastery,
        baseGain,
        mode,
        this.config.errorPenaltyFactor,
      );
      state.elementMastery[element] = Number(Math.max(0.0, currentMastery + delta).toFixed(2));

      // Record in error journal
      const errCode = input.errorCode ?? 'ERR_UNKNOWN_INCORRECT';
      const journalKey = `${input.taskTemplateId}:${element}`;
      const existing = state.errorJournal[journalKey];
      if (existing) {
        existing.repeatCount += 1;
        existing.lastOccurredAt = now;
        existing.resolved = false;
        existing.resolvedAt = undefined;
        existing.errorCode = errCode;
        errorEntry = existing;
      } else {
        errorEntry = {
          id: randomUUID(),
          taskTemplateId: input.taskTemplateId,
          errorCode: errCode,
          element,
          repeatCount: 1,
          firstOccurredAt: now,
          lastOccurredAt: now,
          resolved: false,
        };
        state.errorJournal[journalKey] = errorEntry;
      }
    }

    this.recalculateSkillMastery(state);

    return {
      newMastery: state.elementMastery[element],
      delta: Number(delta.toFixed(2)),
      errorEntry,
    };
  }

  public completeShift(
    userId: string,
    input: {
      shiftId: string;
      mode: ShiftMode;
      durationMs: number;
      taskResults: Array<{
        taskTemplateId: string;
        element: Kn01Element;
        isCorrect: boolean;
        errorCode?: string;
        difficulty?: number;
      }>;
      now?: string;
    },
  ): ShiftSummary {
    const now = input.now ?? new Date().toISOString();
    const state = this.getProgression(userId, now);

    if (!state.unlockedShifts.includes(input.shiftId)) {
      throw new ProgressionError(403, `Смена ${input.shiftId} ещё не разблокирована`, 'SHIFT_LOCKED');
    }

    const masteryDeltas: Partial<Record<Kn01Element, number>> = {};
    let correctCount = 0;
    let shiftStreak = 0;
    let maxShiftStreak = 0;

    for (const task of input.taskResults) {
      if (task.isCorrect) {
        correctCount += 1;
        shiftStreak += 1;
        if (shiftStreak > maxShiftStreak) {
          maxShiftStreak = shiftStreak;
        }
      } else {
        shiftStreak = 0;
      }

      const res = this.recordAnswer(userId, {
        taskTemplateId: task.taskTemplateId,
        element: task.element,
        isCorrect: task.isCorrect,
        errorCode: task.errorCode,
        mode: input.mode,
        difficulty: task.difficulty,
        now,
      });

      masteryDeltas[task.element] = Number(
        ((masteryDeltas[task.element] ?? 0) + res.delta).toFixed(2),
      );
    }

    const totalTasks = input.taskResults.length;
    const accuracy = totalTasks > 0 ? Number((correctCount / totalTasks).toFixed(2)) : 0;
    const passed = accuracy >= 0.7; // 70% threshold to pass a training shift

    const rewardsGranted: string[] = [];
    const unlockedShifts: string[] = [];
    const unlockedLocations: string[] = [];

    if (passed) {
      if (!state.completedShifts.includes(input.shiftId)) {
        state.completedShifts.push(input.shiftId);
      }

      // First shift reward
      if (!state.rewards.includes('pencil_trainee')) {
        state.rewards.push('pencil_trainee');
        rewardsGranted.push('pencil_trainee');
      }

      // Shift-specific badges
      if (input.shiftId === 'shift_c2' && !state.rewards.includes('badge_thermometer')) {
        state.rewards.push('badge_thermometer');
        rewardsGranted.push('badge_thermometer');
      }
      if (input.shiftId === 'shift_c3' && !state.rewards.includes('badge_barometer')) {
        state.rewards.push('badge_barometer');
        rewardsGranted.push('badge_barometer');
      }
      if (input.shiftId === 'shift_c4' && !state.rewards.includes('badge_vane')) {
        state.rewards.push('badge_vane');
        rewardsGranted.push('badge_vane');
      }

      // Unlock next shift in sequence: C1 -> C2 -> C3 -> C4 -> C5 -> Exam
      const currentIndex = MANDATORY_SHIFTS_SEQUENCE.indexOf(
        input.shiftId as (typeof MANDATORY_SHIFTS_SEQUENCE)[number],
      );
      if (currentIndex >= 0 && currentIndex < MANDATORY_SHIFTS_SEQUENCE.length - 1) {
        const nextShift = MANDATORY_SHIFTS_SEQUENCE[currentIndex + 1];
        if (!state.unlockedShifts.includes(nextShift)) {
          state.unlockedShifts.push(nextShift);
          unlockedShifts.push(nextShift);
        }
      }

      // Reduce cooldown if returning from a failed exam
      if (state.failedExamCooldownShiftsRemaining > 0) {
        state.failedExamCooldownShiftsRemaining -= 1;
      }

      // Check if Exam can now be unlocked
      const examCheck = this.checkExamEligibility(userId);
      if (examCheck.eligible && !state.unlockedShifts.includes('shift_exam')) {
        state.unlockedShifts.push('shift_exam');
        unlockedShifts.push('shift_exam');
      }
    }

    // Duty lamp reward for streak >= 10
    if (state.maxStreak >= 10 && !state.rewards.includes('duty_lamp')) {
      state.rewards.push('duty_lamp');
      rewardsGranted.push('duty_lamp');
    }

    const summary: ShiftSummary = {
      id: randomUUID(),
      userId,
      shiftId: input.shiftId,
      mode: input.mode,
      totalTasks,
      correctTasks: correctCount,
      accuracy,
      durationMs: input.durationMs,
      maxStreak: maxShiftStreak,
      passed,
      rewardsGranted,
      unlockedShifts,
      unlockedLocations,
      masteryDeltas,
      completedAt: now,
    };

    state.shiftHistory.push(summary);

    return summary;
  }

  public checkExamEligibility(userId: string): {
    eligible: boolean;
    reasons: string[];
    minElementMastery: number;
    overallMastery: number;
  } {
    const state = this.getProgression(userId);
    const reasons: string[] = [];

    // 1. Mandatory shifts completed
    for (const shift of MANDATORY_SHIFTS_SEQUENCE) {
      if (!state.completedShifts.includes(shift)) {
        reasons.push(`Не пройдена обязательная смена ${shift}`);
      }
    }

    // 2. Cooldown check
    if (state.failedExamCooldownShiftsRemaining > 0) {
      reasons.push(
        `Требуется пройти ещё ${state.failedExamCooldownShiftsRemaining} тренировочную смену перед пересдачей допуска`,
      );
    }

    // 3. Element mastery: >= 80% on each element
    let minMastery = 100.0;
    let sumMastery = 0.0;
    for (const el of KN01_LEVEL1_ELEMENTS) {
      const val = state.elementMastery[el] ?? 0.0;
      if (val < minMastery) {
        minMastery = val;
      }
      sumMastery += val;
      if (val < this.config.minElementMasteryForExam) {
        reasons.push(
          `Освоение элемента ${el} (${val}%) ниже порога ${this.config.minElementMasteryForExam}%`,
        );
      }
    }

    const overallMastery = Number((sumMastery / KN01_LEVEL1_ELEMENTS.length).toFixed(2));
    if (overallMastery < this.config.minOverallMasteryForExam) {
      reasons.push(
        `Общее освоение элементов (${overallMastery}%) ниже порога ${this.config.minOverallMasteryForExam}%`,
      );
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      minElementMastery: Number(minMastery.toFixed(2)),
      overallMastery,
    };
  }

  public completeExam(
    userId: string,
    input: {
      durationMs: number;
      taskResults: Array<{
        taskTemplateId: string;
        element: Kn01Element;
        isCorrect: boolean;
        errorCode?: string;
      }>;
      now?: string;
    },
  ): {
    passed: boolean;
    accuracy: number;
    correctCount: number;
    totalCount: number;
    rewards: string[];
    unlockedLocations: string[];
    rankTitle?: string;
  } {
    const now = input.now ?? new Date().toISOString();
    const state = this.getProgression(userId, now);

    if (!state.unlockedShifts.includes('shift_exam')) {
      throw new ProgressionError(403, 'Квалификационный допуск ещё не открыт', 'EXAM_LOCKED');
    }

    state.examAttempts += 1;
    let correctCount = 0;
    for (const task of input.taskResults) {
      if (task.isCorrect) {
        correctCount += 1;
      }
      this.recordAnswer(userId, {
        taskTemplateId: task.taskTemplateId,
        element: task.element,
        isCorrect: task.isCorrect,
        errorCode: task.errorCode,
        mode: 'solo',
        difficulty: 2,
        now,
      });
    }

    const totalCount = input.taskResults.length;
    const accuracy = totalCount > 0 ? Number((correctCount / totalCount).toFixed(2)) : 0;
    const passed =
      accuracy >= this.config.examMinAccuracy && correctCount >= this.config.examMinCorrect;

    const rewards: string[] = [];
    const unlockedLocations: string[] = [];

    if (passed) {
      state.examPassed = true;
      state.rankTitle = 'Техник-метеоролог';

      if (!state.rewards.includes('token_code_post_26063')) {
        state.rewards.push('token_code_post_26063');
        rewards.push('token_code_post_26063');
      }
      if (!state.rewards.includes('certificate_code_post_level1')) {
        state.rewards.push('certificate_code_post_level1');
        rewards.push('certificate_code_post_level1');
      }

      if (!state.unlockedLocations.includes('cartography_class')) {
        state.unlockedLocations.push('cartography_class');
        unlockedLocations.push('cartography_class');
      }
      if (!state.unlockedLocations.includes('archive_vault')) {
        state.unlockedLocations.push('archive_vault');
        unlockedLocations.push('archive_vault');
      }
    } else {
      // 1 training shift cooldown on failure
      state.failedExamCooldownShiftsRemaining = 1;
    }

    return {
      passed,
      accuracy,
      correctCount,
      totalCount,
      rewards,
      unlockedLocations,
      rankTitle: passed ? state.rankTitle : undefined,
    };
  }

  public getErrorJournal(
    userId: string,
    options: { unresolvedOnly?: boolean } = {},
  ): ErrorJournalEntry[] {
    const state = this.getProgression(userId);
    const list = Object.values(state.errorJournal);
    if (options.unresolvedOnly) {
      return list.filter((e) => !e.resolved);
    }
    return list.sort((a, b) => b.repeatCount - a.repeatCount);
  }

  public async saveState(): Promise<void> {
    if (!this.storePath) return;
    await mkdir(dirname(this.storePath), { recursive: true });
    const obj = Object.fromEntries(this.states.entries());
    await writeFile(this.storePath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  public async loadState(): Promise<void> {
    if (!this.storePath) return;
    try {
      const data = await readFile(this.storePath, 'utf-8');
      const parsed = JSON.parse(data) as Record<string, ProgressionState>;
      this.states.clear();
      for (const [k, v] of Object.entries(parsed)) {
        this.states.set(k, v);
      }
    } catch {
      // File not found or invalid — start with empty map
    }
  }

  private createInitialState(userId: string, now: string): ProgressionState {
    const elementMastery: Record<Kn01Element, number> = {
      AAXX: 0.0,
      YYGGiw: 0.0,
      IIiii: 0.0,
      Nddff: 0.0,
      '1snTTT': 0.0,
      '2snTdTdTd': 0.0,
      '3PoPoPoPo': 0.0,
      '4PPPP': 0.0,
      '5appp': 0.0,
      '00fff': 0.0,
    };

    const skillMastery: Record<Kn01Skill, number> = {
      'kn01.header': 0.0,
      'kn01.temperature': 0.0,
      'kn01.pressure': 0.0,
      'kn01.wind_clouds': 0.0,
      'kn01.full_telegram': 0.0,
    };

    return {
      userId,
      elementMastery,
      skillMastery,
      completedShifts: [],
      unlockedShifts: ['shift_c1'],
      examPassed: false,
      examAttempts: 0,
      rankTitle: 'Стажёр',
      rewards: [],
      unlockedLocations: ['synoptic_post'],
      errorJournal: {},
      shiftHistory: [],
      maxStreak: 0,
      currentStreak: 0,
      lastActiveAt: now,
      failedExamCooldownShiftsRemaining: 0,
    };
  }

  private recalculateSkillMastery(state: ProgressionState): void {
    const el = state.elementMastery;

    state.skillMastery['kn01.header'] = Number(
      ((el.AAXX + el.YYGGiw + el.IIiii) / 3).toFixed(2),
    );
    state.skillMastery['kn01.temperature'] = Number(
      ((el['1snTTT'] + el['2snTdTdTd']) / 2).toFixed(2),
    );
    state.skillMastery['kn01.pressure'] = Number(
      ((el['3PoPoPoPo'] + el['4PPPP'] + el['5appp']) / 3).toFixed(2),
    );
    state.skillMastery['kn01.wind_clouds'] = Number(
      ((el.Nddff + el['00fff']) / 2).toFixed(2),
    );

    let allSum = 0;
    for (const k of KN01_LEVEL1_ELEMENTS) {
      allSum += el[k];
    }
    state.skillMastery['kn01.full_telegram'] = Number(
      (allSum / KN01_LEVEL1_ELEMENTS.length).toFixed(2),
    );
  }
}
