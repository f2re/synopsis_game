import type { BlitzState } from '../shift/blitzRules.js';
import type { LevelOneState } from '../shift/levelOneRules.js';
import type { AvatarPortrait, AvatarProfile } from '../identity/model.js';
import type { RewardGrant } from './rewardCatalog.js';

export interface EffectCharges { reference: number; retry: number }

export interface EquipmentSnapshot {
  badgeId: string | null;
  badgeName: string | null;
  heldItem: string;
  enabled: boolean;
  charges: EffectCharges;
  remaining: EffectCharges;
  assistedTasks: number;
  /** Fixed at activity start; absent only for a legacy activity without a full outfit. */
  avatarSnapshot?: AvatarProfile;
  avatarPortrait?: AvatarPortrait;
}

export interface BadgeView {
  id: string;
  name: string;
  description: string;
  image: string;
  effectDescription: string;
  effects: EffectCharges;
  unlocked: boolean;
  equipped: boolean;
  unlock: { current: number; target: number; description: string };
  earnedAt?: string;
}

export interface EquipmentUser {
  badgeId: string | null;
  completedShifts: number;
  unassistedCorrect: number;
  bestUnassistedCorrect: number;
  bestTotal: number;
  practiceDates: string[];
  earned: Record<string, { earnedAt: string; sourceShiftId: string; contentPack: string }>;
}

export interface ReferenceView {
  instanceId: string;
  explanation: string;
  sources: Array<{ sourceId: string; title: string; locator: string }>;
  assisted: true;
}

export interface TrainingReward {
  newBadges: BadgeView[];
  newRewards?: RewardGrant[];
  completedShifts: number;
  unassistedCorrect: number;
  practiceDays: number;
}

/** All mutable practice state and its rewards share one atomic commit. */
export interface TrainingShift {
  id: string;
  userId: string;
  seed: number;
  taskIds: string[];
  currentIndex: number;
  correct: number;
  unassistedCorrect: number;
  createdAt: string;
  completedAt?: string;
  mode: string;
  contentPack: string;
  contentStatus: string;
  equipment: EquipmentSnapshot;
  assistedTaskIds: string[];
  references: Record<string, ReferenceView>;
  pendingRetry?: { instanceId: string; firstAnswer: unknown };
  responses: Record<string, { fingerprint: string; response: unknown }>;
  reward?: TrainingReward;
  /** Receipts of automatic grants; no claim endpoint and no client-written progress. */
  awardedRewardIds?: string[];
  /** Server-owned clock, outfit and accepted answers for the timed practice mode. */
  blitz?: BlitzState;
  /** Separate first-level completion and review; never awards ordinary-shift progress. */
  levelOne?: LevelOneState;
}

export interface TrainingState {
  version: 1;
  users: Record<string, EquipmentUser>;
  shifts: Record<string, TrainingShift>;
  /** Canonical durable evidence. attempts.jsonl is a repairable audit projection. */
  attempts: Array<Record<string, unknown> & { eventId: string }>;
}

export class EquipmentError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: string) {
    super(message);
  }
}
