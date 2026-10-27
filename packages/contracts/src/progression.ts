/**
 * Контракты прогрессии, освоения и доменных событий программы «KN01-AAA».
 */

import type { GameModeId } from './level.js';

export interface ShiftCompletionRecord {
  shiftId: string;
  mode: GameModeId;
  accuracy: number;
  correctTasks: number;
  totalTasks: number;
  durationSeconds: number;
  completedAt: string;
}

export interface ErrorJournalEntry {
  id: string;
  occurredAt: string;
  shiftId: string;
  taskDefinitionId: string;
  errorCode: string;
  explanation: string;
  resolved: boolean;
}

export interface ProgressionState {
  userId: string;
  levelId: string;
  overallMastery: number;
  groupMastery: Record<string, number>;
  completedShifts: Record<string, ShiftCompletionRecord>;
  unlockedFeatures: string[];
  earnedRewards: string[];
  errorJournal: ErrorJournalEntry[];
  updatedAt: string;
}

/**
 * Доменные события прогрессии и завершения смены
 */

export interface ProgressionUnlockedEvent {
  type: 'progression.unlocked';
  userId: string;
  unlockedId: string;
  kind: 'shift' | 'mode' | 'building' | 'feature';
  timestamp: string;
}

export interface ProgressionRewardGrantedEvent {
  type: 'progression.reward_granted';
  userId: string;
  rewardId: string;
  rewardType: 'item' | 'badge' | 'certificate';
  sourceShiftId: string;
  timestamp: string;
}

export interface ShiftCompletedEvent {
  type: 'shift.completed';
  userId: string;
  shiftId: string;
  mode: GameModeId;
  accuracy: number;
  correctTasks: number;
  totalTasks: number;
  durationSeconds: number;
  timestamp: string;
  rewardsGranted: string[];
  newUnlocks: string[];
}

export type ProgressionDomainEvent =
  | ProgressionUnlockedEvent
  | ProgressionRewardGrantedEvent
  | ShiftCompletedEvent;
