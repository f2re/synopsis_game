import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AvatarProfile } from '../identity/model.js';

export type BuffCharges = { hints: number; retries: number };

export const ACHIEVEMENTS = [
  { id: 'badge.first-shift', name: 'Первая учебная смена', description: 'Завершить одну серверно подтверждённую учебную смену', goal: 1, metric: 'shifts', effect: 'Дополнительная попытка на смену', image: '/ui/badges/ui_badge_station_seal.png' },
  { id: 'badge.observer', name: 'Внимательный наблюдатель', description: 'Завершить смену без ошибок и учебных подсказок', goal: 1, metric: 'perfect', effect: 'Дополнительная справка на смену', image: '/ui/badges/ui_badge_compass_rose.png' },
  { id: 'badge.duty', name: 'На дежурстве', description: 'Завершить три учебные смены', goal: 3, metric: 'shifts', effect: 'Дополнительная справка на смену', image: '/ui/badges/ui_badge_barometer_dial.png' },
  { id: 'badge.focus', name: 'Компас практиканта', description: 'Завершить три смены без ошибок и учебных подсказок', goal: 3, metric: 'perfect', effect: 'Дополнительная попытка на смену', image: '/ui/badges/ui_badge_synoptic_order.png' },
] as const;

const STARTER_BADGES = new Set(['badge.none', 'badge.meteo', 'badge.aerology']);

type PlayerEquipment = {
  completedShiftIds: string[];
  completed: number;
  perfect: number;
  earned: string[];
};
type StoreData = { version: 1; players: Record<string, PlayerEquipment> };

export class EquipmentError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: string) {
    super(message);
  }
}

/**
 * Persistence and reward authority live on the server. Client-supplied "completed"
 * and "correct" claims are never accepted by the public HTTP API.
 */
export class EquipmentService {
  private readonly players = new Map<string, PlayerEquipment>();
  private persistQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storePath?: string) {}

  async load(): Promise<void> {
    if (!this.storePath) return;
    let raw: string;
    try {
      raw = await readFile(this.storePath, 'utf8');
    } catch (reason) {
      if ((reason as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw reason;
    }
    const data = JSON.parse(raw) as StoreData;
    if (data.version !== 1 || !data.players || typeof data.players !== 'object') {
      throw new Error('Invalid equipment store schema');
    }
    this.players.clear();
    for (const [id, player] of Object.entries(data.players)) {
      if (!Array.isArray(player.completedShiftIds) || !Array.isArray(player.earned)) {
        throw new Error('Invalid player equipment record');
      }
      this.players.set(id, {
        completedShiftIds: [...player.completedShiftIds],
        completed: player.completedShiftIds.length,
        perfect: Math.min(player.completedShiftIds.length, Math.max(0, Number(player.perfect) || 0)),
        earned: [...new Set(player.earned.filter((badge) => ACHIEVEMENTS.some((entry) => entry.id === badge)))],
      });
    }
  }

  private player(userId: string): PlayerEquipment {
    let state = this.players.get(userId);
    if (!state) {
      state = { completedShiftIds: [], completed: 0, perfect: 0, earned: [] };
      this.players.set(userId, state);
    }
    return state;
  }

  getOverview(userId: string) {
    const state = this.player(userId);
    return {
      completedShifts: state.completed,
      perfectShifts: state.perfect,
      earned: [...state.earned],
      achievements: ACHIEVEMENTS.map((badge) => ({
        ...badge,
        earned: state.earned.includes(badge.id),
        progress: Math.min(badge.goal, badge.metric === 'shifts' ? state.completed : state.perfect),
      })),
      note: 'Баффы действуют только в учебной смене, не повышают оценку и не действуют в экзамене или рейтинге.',
    };
  }

  assertEquippable(userId: string, badge: unknown): void {
    if (typeof badge !== 'string') {
      throw new EquipmentError(422, 'Не указан служебный знак', 'invalid_badge');
    }
    if (!STARTER_BADGES.has(badge) && !this.player(userId).earned.includes(badge)) {
      throw new EquipmentError(403, 'Значок ещё не открыт за учебные смены', 'badge_locked');
    }
  }

  deriveBonuses(userId: string, avatar: Pick<AvatarProfile, 'heldItem' | 'badge'>): BuffCharges {
    this.assertEquippable(userId, avatar.badge);
    let hints = avatar.heldItem === 'held.tablet' || avatar.heldItem === 'held.map-folder' ? 1 : 0;
    let retries = avatar.heldItem === 'held.pencil' ? 1 : 0;
    if (avatar.badge === 'badge.observer' || avatar.badge === 'badge.duty') hints += 1;
    if (avatar.badge === 'badge.first-shift' || avatar.badge === 'badge.focus') retries += 1;
    return { hints: Math.min(2, hints), retries: Math.min(2, retries) };
  }

  /** Only call after ShiftService has verified all answers and completed the shift. */
  async recordCompletedShift(userId: string, result: {
    shiftId: string; total: number; firstTryCorrect: number; assisted: boolean;
  }): Promise<string[]> {
    if (!result.shiftId || !Number.isInteger(result.total) || result.total < 1
      || !Number.isInteger(result.firstTryCorrect) || result.firstTryCorrect < 0 || result.firstTryCorrect > result.total) {
      throw new EquipmentError(422, 'Недостоверный результат учебной смены', 'invalid_shift_result');
    }
    const player = this.player(userId);
    if (player.completedShiftIds.includes(result.shiftId)) return [];
    player.completedShiftIds.push(result.shiftId);
    player.completed += 1;
    if (result.firstTryCorrect === result.total && !result.assisted) player.perfect += 1;

    const unlocked: string[] = [];
    for (const badge of ACHIEVEMENTS) {
      const value = badge.metric === 'shifts' ? player.completed : player.perfect;
      if (value >= badge.goal && !player.earned.includes(badge.id)) {
        player.earned.push(badge.id);
        unlocked.push(badge.id);
      }
    }
    await this.persist();
    return unlocked;
  }

  private async persist(): Promise<void> {
    if (!this.storePath) return;
    const storePath = this.storePath;
    this.persistQueue = this.persistQueue.then(async () => {
      const players = Object.fromEntries(this.players.entries());
      const data: StoreData = { version: 1, players };
      await mkdir(dirname(storePath), { recursive: true });
      const tmp = storePath + '.tmp';
      await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await rename(tmp, storePath);
    });
    await this.persistQueue;
  }
}
