/**
 * Контракты уровней и смен программы «KN01-AAA».
 *
 * Инвариант безопасности:
 * Клиентские структуры данных (PublicTask, TaskSlot) никогда не содержат
 * эталонных значений ответов или проверочных ключей.
 */

export type TaskType =
  | 'identify'
  | 'decode'
  | 'anatomy'
  | 'encode'
  | 'sequence'
  | 'findError'
  | 'fullTelegram';

export type GameModeId = 'mentor' | 'standard' | 'blitz';

export interface RewardDefinition {
  id: string;
  name: string;
  type: 'item' | 'badge' | 'certificate' | 'unlock';
  lore: string;
}

export interface TaskSlot {
  position: number;
  type: TaskType;
  target_concept: string;
  difficulty: number;
}

export interface ShiftDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  target_duration_minutes: number;
  covered_groups: string[];
  prerequisites?: string[];
  pass_threshold_accuracy?: number;
  task_slots: TaskSlot[];
  reward: RewardDefinition;
  unlocks: string[];
}

export interface GameModeDefinition {
  id: GameModeId;
  name: string;
  description: string;
  handbook_allowed: boolean | 'with_penalty';
  hint_after_mistake: boolean;
  timer_seconds: number | null;
  mastery_multiplier: number;
  mastery_multiplier_with_handbook?: number;
  available_initially?: boolean;
  available_after_shift_passed?: boolean;
  unlock_prerequisite?: string;
}

export interface LevelDefinition {
  schema_version: string;
  level_id: string;
  title: string;
  description: string;
  method_profile: string;
  shifts: ShiftDefinition[];
  game_modes: GameModeDefinition[];
}

/**
 * Публичное задание для клиента (без эталона ответа).
 */
export interface PublicTask {
  instanceId: string;
  definitionId: string;
  type: TaskType;
  prompt: string;
  payload: Record<string, unknown>;
  hintsRemaining?: number;
}

/**
 * Шаблон генератора заданий на сервере.
 */
export interface TaskTemplate {
  id: string;
  type: TaskType;
  covered_groups: string[];
  edge_case_ids: string[];
  distractor_error_codes: string[];
  generate(seed: number): {
    publicTask: PublicTask;
    secretValidationContext: Record<string, unknown>;
  };
}
