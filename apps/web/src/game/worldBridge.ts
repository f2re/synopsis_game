/**
 * apps/web/src/game/worldBridge.ts
 * 
 * Мост между React UI и Phaser (World Engine) на клиенте.
 * Реализует грубые (coarse) события без per-frame React state updates.
 */

import { worldBridge, type DayPhase, type BuildingStateId } from '@synopsis/world-engine/bridge';

export type StampType = 'ПРИНЯТО' | 'ПРОВЕРИТЬ' | 'ДОПУСК';
export type MentorExpression = 'neutral' | 'smile' | 'thoughtful' | 'surprised' | 'approval' | 'glasses_up';

export interface CodePostTaskEvents {
  printTeletype: (text: string) => void;
  triggerStamp: (stamp: StampType) => void;
  updateStreak: (streak: number) => void;
  signalError: (group: string) => void;
  setMentorFace: (expression: MentorExpression) => void;
  setStudyCalm: (calm: boolean) => void;
  interactWithCat: () => void;
}

export function createCodePostBridge(): CodePostTaskEvents {
  return {
    printTeletype: (text: string) => {
      worldBridge.emit('codepost:print', { text });
    },
    triggerStamp: (stamp: StampType) => {
      worldBridge.emit('codepost:stamp', { stamp });
    },
    updateStreak: (streak: number) => {
      worldBridge.emit('codepost:streak', { streak });
    },
    signalError: (group: string) => {
      worldBridge.emit('codepost:error', { group });
    },
    setMentorFace: (expression: MentorExpression) => {
      worldBridge.emit('codepost:mentor_expression', { expression });
    },
    setStudyCalm: (calm: boolean) => {
      worldBridge.emit('codepost:study_calm', { calm });
    },
    interactWithCat: () => {
      worldBridge.emit('codepost:cat_click', {});
    },
  };
}

export const codePostBridge = createCodePostBridge();

export { worldBridge, type DayPhase, type BuildingStateId };
