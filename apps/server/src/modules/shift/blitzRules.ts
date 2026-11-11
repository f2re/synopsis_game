import type { PublicTaskInstance } from '@synopsis/content-engine';
import type { AvatarProfile } from '../identity/model.js';
import type { EquipmentSnapshot } from '../equipment/model.js';

/** A separate practice scenario; this does not unlock the planned C2/ranked mode. */
export const BLITZ_MODE = 'blitz-practice';
export const BLITZ_RULES_VERSION = 'blitz-practice-v1';
export const BLITZ_DURATION_MS = 90_000;
export const BLITZ_TASK_IDS = [
  'kn01_temp_001', 'kn01_dewpoint_001', 'kn01_station_pressure_001',
  'kn01_tendency_001', 'kn01_section1_order_001', 'station_plot_basic_001',
] as const;
export const BLITZ_REQUEST_ID = /^[a-zA-Z0-9_-]{16,100}$/;
export const BLITZ_MAX_START_KEYS = 64;

export interface BlitzReview {
  instanceId: string;
  question: string;
  correct: boolean;
  explanation: string;
  sources: Array<{ sourceId: string; title: string; locator: string }>;
}

export interface BlitzState {
  rulesVersion: string;
  requestIds: string[];
  deadlineAt: string;
  avatarSnapshot: AvatarProfile;
  finishReason?: 'answered' | 'timeout';
  review: BlitzReview[];
}

export interface BlitzSessionView {
  id: string;
  mode: typeof BLITZ_MODE;
  status: 'active' | 'completed';
  rulesVersion: string;
  durationSeconds: number;
  startedAt: string;
  deadlineAt: string;
  serverNow: string;
  completedAt?: string;
  finishReason?: 'answered' | 'timeout';
  contentPack: string;
  contentStatus: string;
  avatarSnapshot: AvatarProfile;
  equipment: EquipmentSnapshot;
  progress: { answered: number; correct: number; current: number; total: number };
  task: PublicTaskInstance | null;
  review: BlitzReview[];
}
