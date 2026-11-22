import type { AvatarProfile } from '../identity/model.js';
import { LEVEL_ONE_MODE } from '../shift/levelOneRules.js';
import type { EquipmentUser, TrainingShift, TrainingState } from './model.js';

export interface RewardGrant { id: string; title: string; image: string; icon?: string }
export interface RewardView extends RewardGrant {
  description: string;
  kind: 'tool' | 'badge' | 'companion' | 'decoration' | 'certificate';
  status: 'earned' | 'locked' | 'unavailable';
  condition: string;
  progress: { current: number; target: number };
  earnedAt?: string;
  avatarSlot?: 'heldItem' | 'badge' | 'companion';
  avatarItemId?: string;
  trainingBadgeId?: string;
  action?: { href: string; label: string };
}

type RewardDefinition = Omit<RewardView, 'status' | 'progress' | 'earnedAt'> & {
  target: number;
  metric: 'pencil' | 'shifts' | 'accuracy' | 'days' | 'streak' | 'planned';
};
const wardrobe = (id: string) => `/assets/items/wardrobe/${id}.png?v=station-r02-20261116`;
const practice = { href: '/shift', label: 'Начать учебную смену' };

/** The collection is deliberately independent of the old client-reported progression store. */
export const REWARD_CATALOG: readonly RewardDefinition[] = [
  { id: 'held.pencil', title: 'Карандаш синоптика', description: 'Первый рабочий инструмент за доведённый до конца бланк. В учебной смене даёт один повтор ответа.', image: wardrobe('held.pencil'), kind: 'tool',
    condition: 'Завершить первый уровень или одну полную учебную смену', target: 1, metric: 'pencil', avatarSlot: 'heldItem', avatarItemId: 'held.pencil', action: { href: '/level-one', label: 'Открыть первый уровень' } },
  { id: 'badge.first_shift', title: 'Первое дежурство', description: 'Первая полная учебная смена закончена. Значок даёт один повтор ответа в новой учебной смене.', image: wardrobe('badge.first_shift'), kind: 'badge',
    condition: 'Завершить одну полную учебную смену', target: 1, metric: 'shifts', trainingBadgeId: 'badge.first_shift', action: practice },
  { id: 'badge.accuracy', title: 'Точный разбор', description: 'Самостоятельная работа с первого ответа. Значок даёт одну справку и один повтор в новой учебной смене.', image: wardrobe('badge.accuracy'), kind: 'badge',
    condition: 'Самостоятельно решить с первой попытки 8 из 10 заданий одной полной учебной смены', target: 8, metric: 'accuracy', trainingBadgeId: 'badge.accuracy', action: practice },
  { id: 'badge.regular', title: 'Ритм станции', description: 'Возвращайтесь к занятиям в удобном ритме: дни не обязаны идти подряд. Значок даёт две справки в новой учебной смене.', image: wardrobe('badge.regular'), kind: 'badge',
    condition: 'Завершить учебные смены в 3 разных дня по UTC', target: 3, metric: 'days', trainingBadgeId: 'badge.regular', action: practice },
  { id: 'companion.tit', title: 'Спутник «Большая синица»', description: 'Пернатый завсегдатай станции будет сопровождать вашего персонажа.', image: wardrobe('companion.tit'), kind: 'companion',
    condition: 'Завершить 3 полные учебные смены', target: 3, metric: 'shifts', avatarSlot: 'companion', avatarItemId: 'companion.tit', action: practice },
  { id: 'companion.squirrel', title: 'Спутник «Белка»', description: 'Любопытный обитатель станции присоединится к вашему персонажу.', image: wardrobe('companion.squirrel'), kind: 'companion',
    condition: 'Завершить 5 полных учебных смен', target: 5, metric: 'shifts', avatarSlot: 'companion', avatarItemId: 'companion.squirrel', action: practice },
  { id: 'reward_duty_lamp', title: 'Лампа дежурного', description: 'Памятная лампа в вашей коллекции за точную самостоятельную работу.', image: '', icon: 'lamp', kind: 'decoration',
    condition: 'Завершить полную учебную смену с 10 верными самостоятельными ответами подряд с первой попытки', target: 10, metric: 'streak', action: practice },
  { id: 'badge.aerology', title: 'Значок аэролога', description: 'Аэрологический практикум ещё не открыт.', image: wardrobe('badge.aerology'), kind: 'badge',
    condition: 'Завершить аэрологический практикум', target: 1, metric: 'planned', avatarSlot: 'badge', avatarItemId: 'badge.aerology' },
  { id: 'badge_thermometer', title: 'Значок «Термометр»', description: 'Тематическая смена С2 ещё не открыта. Первый бланк не заменяет её прохождение.', image: '', icon: 'thermometer', kind: 'badge',
    condition: 'Успешно пройти тематическую смену С2 «Термометр»', target: 1, metric: 'planned' },
  { id: 'badge_barometer', title: 'Значок «Барометр»', description: 'Тематическая смена С3 ещё не открыта.', image: '', icon: 'barometer', kind: 'badge',
    condition: 'Успешно пройти тематическую смену С3 «Барометр»', target: 1, metric: 'planned' },
  { id: 'badge_weathervane', title: 'Значок «Флюгер»', description: 'Тематическая смена С4 ещё не открыта.', image: '', icon: 'weathervane', kind: 'badge',
    condition: 'Успешно пройти тематическую смену С4 «Ветер и облака»', target: 1, metric: 'planned' },
  { id: 'reward_codepost_token', title: 'Жетон «Кодовый пост 26063»', description: 'Квалификационный экзамен кодового поста ещё не открыт.', image: '', icon: 'token', kind: 'badge',
    condition: 'Сдать квалификационный экзамен кодового поста', target: 1, metric: 'planned' },
  { id: 'reward_certificate', title: 'Свидетельство наблюдателя станции 26063', description: 'Память о прохождении учебной игры. Квалификационный экзамен ещё не открыт.', image: '', icon: 'certificate', kind: 'certificate',
    condition: 'Сдать квалификационный экзамен кодового поста', target: 1, metric: 'planned' },
];

export const AVATAR_REWARD_SLOTS = ['heldItem', 'badge', 'companion'] as const;

export function isRewardItem(id: string): boolean {
  return REWARD_CATALOG.some((reward) => reward.avatarItemId === id);
}

export function ownsReward(user: EquipmentUser | undefined, id: string): boolean {
  const reward = REWARD_CATALOG.find((entry) => entry.id === id);
  return Boolean(reward && reward.metric !== 'planned' && user?.earned[id]);
}

export function authorizedAvatar(avatar: AvatarProfile, owns: (id: string) => boolean): AvatarProfile {
  const result = { ...avatar };
  for (const slot of AVATAR_REWARD_SLOTS) {
    if (isRewardItem(result[slot]) && !owns(result[slot])) result[slot] = slot === 'heldItem' ? 'held.none' : `${slot}.none`;
  }
  return result;
}

const isPractice = (mode: string) => mode === 'practice' || mode === 'practice-draft';

export function completedActivities(state: TrainingState, userId: string): TrainingShift[] {
  return Object.values(state.shifts).filter((shift) => shift.userId === userId && Boolean(shift.completedAt)
    && shift.currentIndex === shift.taskIds.length && (isPractice(shift.mode) || shift.mode === LEVEL_ONE_MODE))
    .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!) || a.id.localeCompare(b.id));
}

/** A retry or a reference cannot turn an assisted answer into an independent streak. */
export function independentStreak(shift: TrainingShift, state: TrainingState): number {
  if (!isPractice(shift.mode)) return 0;
  let best = 0;
  let current = 0;
  for (let index = 1; index <= shift.currentIndex; index += 1) {
    const instanceId = `${shift.id}:${index}`;
    const answer = state.attempts.find((entry) => entry.shiftId === shift.id && entry.userId === shift.userId
      && entry.instanceId === instanceId && entry.attempt === 1);
    current = answer?.correct === true && answer.assisted === false && !shift.assistedTaskIds.includes(instanceId) ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

export function rewardCollection(state: TrainingState, userId: string): { catalog: RewardView[]; earnedCount: number; total: number } {
  const user = state.users[userId];
  const completed = completedActivities(state, userId);
  const shifts = completed.filter((shift) => isPractice(shift.mode));
  const bestStreak = shifts.reduce((best, shift) => Math.max(best, independentStreak(shift, state)), 0);
  const best = shifts.reduce<{ correct: number; total: number }>((candidate, shift) =>
    shift.unassistedCorrect / shift.taskIds.length > candidate.correct / candidate.total
      ? { correct: shift.unassistedCorrect, total: shift.taskIds.length } : candidate, { correct: 0, total: 10 });
  const days = new Set(shifts.map((shift) => shift.completedAt!.slice(0, 10))).size;
  const catalog = REWARD_CATALOG.map((definition): RewardView => {
    const { metric, target: defaultTarget, action: earningAction, ...entry } = definition;
    const earned = ownsReward(user, definition.id) ? user!.earned[definition.id] : undefined;
    const target = metric === 'accuracy' ? Math.ceil(best.total * .8) : defaultTarget;
    const current = metric === 'pencil' ? Math.min(1, completed.length) : metric === 'shifts' ? shifts.length
      : metric === 'accuracy' ? best.correct : metric === 'days' ? days : metric === 'streak' ? bestStreak : 0;
    const action = !earned ? earningAction : entry.avatarSlot ? { href: '/profile/avatar', label: 'Выбрать в инвентаре' }
      : entry.trainingBadgeId ? { href: '/profile/avatar?section=badges', label: 'Выбрать значок' } : undefined;
    return { ...entry, status: metric === 'planned' ? 'unavailable' : earned ? 'earned' : 'locked',
      ...(metric === 'accuracy' ? { condition: `Самостоятельно решить с первой попытки ${target} из ${best.total} заданий одной полной учебной смены` } : {}),
      progress: { current: earned ? target : Math.min(current, target), target },
      ...(earned ? { earnedAt: earned.earnedAt } : {}),
      ...(action ? { action } : {}),
    };
  });
  return { catalog, earnedCount: catalog.filter((entry) => entry.status === 'earned').length, total: catalog.length };
}

/** Grants and completion are written by the same TrainingStore transaction. */
export function grantCompletionRewards(state: TrainingState, shift: TrainingShift, historicalPracticeCount?: number): RewardGrant[] {
  if (!shift.completedAt || shift.currentIndex !== shift.taskIds.length || !(isPractice(shift.mode) || shift.mode === LEVEL_ONE_MODE)) return [];
  const user = state.users[shift.userId];
  if (!user) return [];
  const completed = completedActivities(state, shift.userId);
  const practiceCount = historicalPracticeCount ?? completed.filter((entry) => isPractice(entry.mode)).length;
  const eligible = ['held.pencil'];
  if (isPractice(shift.mode)) {
    if (practiceCount >= 3) eligible.push('companion.tit');
    if (practiceCount >= 5) eligible.push('companion.squirrel');
    if (independentStreak(shift, state) >= 10) eligible.push('reward_duty_lamp');
  }
  const granted: string[] = [];
  for (const id of eligible) {
    if (user.earned[id]) continue;
    user.earned[id] = { earnedAt: shift.completedAt, sourceShiftId: shift.id, contentPack: shift.contentPack };
    granted.push(id);
  }
  if (granted.length) shift.awardedRewardIds = [...new Set([...(shift.awardedRewardIds ?? []), ...granted])];
  return rewardGrants(granted);
}

export function rewardGrants(ids: readonly string[]): RewardGrant[] {
  return ids.flatMap((id) => {
    const reward = REWARD_CATALOG.find((entry) => entry.id === id);
    return reward ? [{ id, title: reward.title, image: reward.image, ...(reward.icon ? { icon: reward.icon } : {}) }] : [];
  });
}
