import type { PublicTaskInstance } from '@synopsis/content-engine';
import type { EquipmentSnapshot, ReferenceView } from '../equipment/model.js';
import type { RewardGrant } from '../equipment/rewardCatalog.js';

/** A short first playable episode; independent from the planned C1–C5 qualification. */
export const LEVEL_ONE_MODE = 'level-one';
export const LEVEL_ONE_ID = 'first-codepost';
export const LEVEL_ONE_TITLE = 'Первый бланк: температура и точка росы';
export const LEVEL_ONE_RULES_VERSION = 'level-one-v1';
export const LEVEL_ONE_PACK = 'kn01_level1_pack@1.0.0';
export const LEVEL_ONE_TASK_IDS = [
  'tmpl_c1_aaxx_header',
  'tmpl_c2_temp_vs_dewpoint',
  'tmpl_c2_sign_bit_sn',
  'tmpl_c2_positive_temp',
  'tmpl_c2_negative_dewpoint',
  'tmpl_c2_encode_temp',
] as const;
export const LEVEL_ONE_REQUEST_ID = /^[a-zA-Z0-9_-]{16,100}$/;
export const LEVEL_ONE_MAX_START_KEYS = 64;

export interface LevelOneSource { sourceId: string; title: string; locator: string }

export interface LevelOneReview {
  instanceId: string;
  definitionId: string;
  question: string;
  answer: unknown;
  correct: boolean;
  assisted: boolean;
  correctAnswer: unknown;
  explanation: string;
  sources: LevelOneSource[];
}

export interface LevelOneState {
  rulesVersion: string;
  requestIds: string[];
  review: LevelOneReview[];
}

export interface LevelOneSessionView {
  id: string;
  shiftId: string;
  levelId: typeof LEVEL_ONE_ID;
  title: typeof LEVEL_ONE_TITLE;
  mode: typeof LEVEL_ONE_MODE;
  status: 'active' | 'completed';
  rulesVersion: string;
  startedAt: string;
  completedAt?: string;
  contentPack: string;
  contentStatus: string;
  progress: { answered: number; correct: number; current: number; total: number };
  unassistedCorrect: number;
  assistedTasks: number;
  task: PublicTaskInstance | null;
  equipment: EquipmentSnapshot;
  review: LevelOneReview[];
  reference?: ReferenceView;
  rewardsGranted: RewardGrant[];
}

export interface LevelOneLobbyView {
  levelId: typeof LEVEL_ONE_ID;
  title: typeof LEVEL_ONE_TITLE;
  total: number;
  help: { reference: 'free'; retry: false; timer: false };
  completedRuns: number;
  bestCorrect: number;
  session: LevelOneSessionView | null;
}
