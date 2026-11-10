import { AVATAR_OPTIONS, type AvatarProfile } from '../identity/model.js';
import {
  EquipmentError,
  type BadgeView, type EffectCharges, type EquipmentSnapshot, type EquipmentUser,
  type TrainingReward, type TrainingShift, type TrainingState,
} from './model.js';
import { TrainingStore, type TrainingStoreOptions } from './trainingStore.js';

export const TRAINING_BADGE_IDS = ['badge.training_starter', 'badge.first_shift', 'badge.accuracy', 'badge.regular'] as const;
const BADGES = [
  { id: TRAINING_BADGE_IDS[0], name: 'На связи', description: 'Стартовый значок учебной смены.', image: '/assets/items/badge_starter.png', effects: { reference: 1, retry: 0 }, effectDescription: '+1 обращение к справке за смену.', condition: 'Доступен с первого входа', target: 1 },
  { id: TRAINING_BADGE_IDS[1], name: 'Первое дежурство', description: 'Вы довели первую учебную смену до разбора.', image: '/assets/items/badge_first_shift.png', effects: { reference: 0, retry: 1 }, effectDescription: '+1 повтор неверного ответа до показа решения.', condition: 'Завершить одну учебную смену', target: 1 },
  { id: TRAINING_BADGE_IDS[2], name: 'Точный разбор', description: 'Не менее 80% заданий полной смены решены самостоятельно с первой попытки.', image: '/assets/items/badge_accuracy.png', effects: { reference: 1, retry: 1 }, effectDescription: '+1 справка и +1 повтор за смену.', condition: 'Самостоятельно решить с первой попытки 8 из 10 заданий одной полной смены', target: 8 },
  { id: TRAINING_BADGE_IDS[3], name: 'Ритм станции', description: 'Учебные смены завершены в три разных дня. Дни не обязаны идти подряд.', image: '/assets/items/badge_regular.png', effects: { reference: 2, retry: 0 }, effectDescription: '+2 обращения к справке за смену.', condition: 'Завершить смены в 3 разных дня по UTC', target: 3 },
] as const;

export function effectsAllowed(mode: string): boolean { return mode === 'practice' || mode === 'practice-draft'; }

export function initialEquipmentUser(): EquipmentUser {
  return { badgeId: TRAINING_BADGE_IDS[0], completedShifts: 0, unassistedCorrect: 0, bestUnassistedCorrect: 0, bestTotal: 10, practiceDates: [], earned: {} };
}

export class EquipmentService {
  readonly store: TrainingStore;

  constructor(options: TrainingStoreOptions = {}) { this.store = new TrainingStore(options); }
  async init(): Promise<void> { await this.store.init(); }

  getEquipment(userId: string, avatar: AvatarProfile) {
    return this.view(this.store.read().users[userId] ?? initialEquipmentUser(), avatar);
  }

  async setLoadout(userId: string, badgeId: unknown, avatar: AvatarProfile) {
    if (badgeId !== null && (typeof badgeId !== 'string' || !TRAINING_BADGE_IDS.includes(badgeId as typeof TRAINING_BADGE_IDS[number]))) {
      throw new EquipmentError(400, 'Неизвестный учебный значок', 'invalid_badge');
    }
    return this.store.transaction((state) => {
      const user = this.requireUser(state, userId);
      if (badgeId !== null && badgeId !== TRAINING_BADGE_IDS[0] && !user.earned[badgeId]) {
        throw new EquipmentError(403, 'Значок ещё не получен', 'badge_locked');
      }
      user.badgeId = badgeId;
      return this.view(user, avatar);
    });
  }

  requireUser(state: TrainingState, userId: string): EquipmentUser {
    return state.users[userId] ?? (state.users[userId] = initialEquipmentUser());
  }

  snapshot(user: EquipmentUser, avatar: AvatarProfile, mode: string): EquipmentSnapshot {
    const enabled = effectsAllowed(mode);
    const allowedHeld = AVATAR_OPTIONS.heldItem as readonly string[];
    const heldItem = allowedHeld.includes(avatar.heldItem) ? avatar.heldItem : 'held.none';
    const badge = BADGES.find((candidate) => candidate.id === user.badgeId && (candidate.id === TRAINING_BADGE_IDS[0] || user.earned[candidate.id]));
    const charges: EffectCharges = {
      reference: enabled ? Math.min(2, (badge?.effects.reference ?? 0) + (heldItem === 'held.tablet' || heldItem === 'held.map-folder' ? 1 : 0)) : 0,
      retry: enabled ? Math.min(2, (badge?.effects.retry ?? 0) + (heldItem === 'held.pencil' ? 1 : 0)) : 0,
    };
    return { badgeId: badge?.id ?? null, badgeName: badge?.name ?? null, heldItem, enabled, charges, remaining: { ...charges }, assistedTasks: 0 };
  }

  complete(state: TrainingState, shift: TrainingShift, completedAt: string): TrainingReward {
    if (shift.reward) return shift.reward;
    const user = this.requireUser(state, shift.userId);
    if (!effectsAllowed(shift.mode) || shift.currentIndex !== shift.taskIds.length) {
      throw new EquipmentError(409, 'Награды доступны только за завершённую учебную смену', 'unverified_completion');
    }
    user.completedShifts += 1;
    user.unassistedCorrect += shift.unassistedCorrect;
    if (shift.unassistedCorrect / shift.taskIds.length > user.bestUnassistedCorrect / user.bestTotal) {
      user.bestUnassistedCorrect = shift.unassistedCorrect;
      user.bestTotal = shift.taskIds.length;
    }
    const day = completedAt.slice(0, 10);
    if (!user.practiceDates.includes(day)) user.practiceDates.push(day);
    const earnedIds: string[] = [];
    const grant = (id: string, earned: boolean) => {
      if (!earned || user.earned[id]) return;
      user.earned[id] = { earnedAt: completedAt, sourceShiftId: shift.id, contentPack: shift.contentPack };
      earnedIds.push(id);
    };
    grant(TRAINING_BADGE_IDS[1], user.completedShifts >= 1);
    grant(TRAINING_BADGE_IDS[2], shift.unassistedCorrect / shift.taskIds.length >= 0.8);
    grant(TRAINING_BADGE_IDS[3], user.practiceDates.length >= 3);
    shift.completedAt = completedAt;
    shift.reward = {
      newBadges: this.catalog(user).filter((badge) => earnedIds.includes(badge.id)),
      completedShifts: user.completedShifts,
      unassistedCorrect: user.unassistedCorrect,
      practiceDays: user.practiceDates.length,
    };
    return shift.reward;
  }

  private catalog(user: EquipmentUser): BadgeView[] {
    return BADGES.map((badge, index) => {
      const current = index === 0 ? 1 : index === 1 ? user.completedShifts : index === 2 ? user.bestUnassistedCorrect : user.practiceDates.length;
      const target = index === 2 ? Math.ceil(user.bestTotal * 0.8) : badge.target;
      const description = index === 2 ? `Самостоятельно решить с первой попытки ${target} из ${user.bestTotal} заданий одной полной смены` : badge.condition;
      return { id: badge.id, name: badge.name, description: badge.description, image: badge.image, effects: { ...badge.effects }, effectDescription: badge.effectDescription,
        unlocked: index === 0 || Boolean(user.earned[badge.id]), equipped: user.badgeId === badge.id,
        unlock: { current: Math.min(current, target), target, description },
        ...(user.earned[badge.id] ? { earnedAt: user.earned[badge.id].earnedAt } : {}),
      };
    });
  }

  private view(user: EquipmentUser, avatar: AvatarProfile) {
    return {
      loadout: { badgeId: user.badgeId }, catalog: this.catalog(user),
      stats: { completedShifts: user.completedShifts, unassistedCorrect: user.unassistedCorrect, practiceDays: user.practiceDates.length },
      nextShift: this.snapshot(user, avatar, 'practice-draft'),
      tools: [
        { id: 'held.tablet', effects: { reference: 1, retry: 0 }, effectDescription: '+1 обращение к справке за учебную смену.' },
        { id: 'held.map-folder', effects: { reference: 1, retry: 0 }, effectDescription: '+1 обращение к справке за учебную смену.' },
        { id: 'held.pencil', effects: { reference: 0, retry: 1 }, effectDescription: '+1 повтор неверного ответа до показа решения.' },
      ],
      rules: { chargeCap: 2, description: 'Один учебный значок. Планшет или папка дают +1 справку, карандаш — +1 повтор. Не более 2 применений каждого эффекта за смену. Набор фиксируется при старте; в рейтинге, блице и экзамене эффекты отключены.' },
    };
  }
}
