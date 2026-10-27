/**
 * packages/world-engine/src/world/hubSchedule.ts
 * 
 * Расписание и планировщик фоновых циклов живого мира хаба станции 26063.
 * Согласно спецификации:
 * - 18 фоновых циклов (>= 14).
 * - Одновременно заметных случайных событий <= 3 (строгий лимит планировщика).
 * - Воспроизводимость поведения по сиду (PRNG от даты и координат станции).
 * - Интерактивность фауны (клики) и фиксация находок на сервере через worldBridge.
 */

import { worldBridge } from '../bridge/WorldBridge.ts';

export interface AmbientCycle {
  id: string;
  name: string;
  type: 'continuous' | 'sporadic' | 'synoptic_hour';
  intervalRangeSec?: [number, number];
  durationSec?: number;
  synopticHoursUtc?: number[];
  inStudyCalm: boolean;
  priority: number;
}

export const HUB_AMBIENT_CYCLES: AmbientCycle[] = [
  // Постоянные циклы (1-4, 7-8, 18)
  { id: 'cycle_radar', name: 'Вращение радара ДМРЛ', type: 'continuous', inStudyCalm: true, priority: 1 },
  { id: 'cycle_anemometer', name: 'Анемометр М-63М', type: 'continuous', inStudyCalm: true, priority: 1 },
  { id: 'cycle_windsock', name: 'Флаг и ветроуказатель', type: 'continuous', inStudyCalm: true, priority: 1 },
  { id: 'cycle_beacons', name: 'Оградительные маяки мачты', type: 'continuous', inStudyCalm: true, priority: 1 },
  { id: 'cycle_water_glimmer', name: 'Блики залива', type: 'continuous', inStudyCalm: true, priority: 1 },
  { id: 'cycle_clouds', name: 'Дрейф облаков', type: 'continuous', inStudyCalm: true, priority: 1 },
  { id: 'cycle_foreground_branches', name: 'Ветви переднего плана', type: 'continuous', inStudyCalm: true, priority: 1 },

  // Спорадические циклы хаба (5-6, 9-13, 15, 17) — лимит не более 3 одновременно!
  { id: 'cycle_window_toggle', name: 'Включение/выключение окон', type: 'sporadic', intervalRangeSec: [20, 60], durationSec: 5, inStudyCalm: false, priority: 2 },
  { id: 'cycle_window_silhouette', name: 'Силуэт сотрудника в окне', type: 'sporadic', intervalRangeSec: [40, 90], durationSec: 8, inStudyCalm: false, priority: 2 },
  { id: 'cycle_flock_distant', name: 'Стая птиц вдали', type: 'sporadic', intervalRangeSec: [60, 120], durationSec: 12, inStudyCalm: false, priority: 3 },
  { id: 'cycle_gull_flight', name: 'Чайка над заливом', type: 'sporadic', intervalRangeSec: [45, 90], durationSec: 10, inStudyCalm: false, priority: 3 },
  { id: 'cycle_tit_perch', name: 'Синица на метеоплощадке', type: 'sporadic', intervalRangeSec: [30, 90], durationSec: 30, inStudyCalm: false, priority: 4 },
  { id: 'cycle_squirrel_tree', name: 'Белка на сосне', type: 'sporadic', intervalRangeSec: [120, 240], durationSec: 25, inStudyCalm: false, priority: 4 },
  { id: 'cycle_duck_swim', name: 'Кряква у причала', type: 'sporadic', intervalRangeSec: [60, 150], durationSec: 40, inStudyCalm: false, priority: 3 },
  { id: 'cycle_lab_assistant', name: 'Лаборантка между архивом и залом', type: 'sporadic', intervalRangeSec: [120, 180], durationSec: 18, inStudyCalm: false, priority: 2 },
  { id: 'cycle_night_aircraft', name: 'Самолёт с огнями', type: 'sporadic', intervalRangeSec: [600, 1200], durationSec: 30, inStudyCalm: false, priority: 5 },

  // Синоптические синхронные события (14, 16)
  { id: 'cycle_tech_synoptic_term', name: 'Выход техника к будке БП', type: 'synoptic_hour', synopticHoursUtc: [0, 3, 6, 9, 12, 15, 18, 21], durationSec: 120, inStudyCalm: false, priority: 5 },
  { id: 'cycle_radiosonde_launch', name: 'Запуск радиозонда', type: 'synoptic_hour', synopticHoursUtc: [0, 12], durationSec: 60, inStudyCalm: false, priority: 5 },
];

export interface FindingDiscovery {
  id: string;
  name: string;
  description: string;
  rewardId: string;
}

export const FINDINGS_REGISTRY: Record<string, FindingDiscovery> = {
  tit_observation: {
    id: 'finding_tit',
    name: 'Синица у метеоплощадки',
    description: 'Обнаружена большая синица на ограждении будки БП',
    rewardId: 'reward_companion_tit',
  },
  squirrel_pine: {
    id: 'finding_squirrel',
    name: 'Белка-кладовщица',
    description: 'Найдена белка, прячущая сосновую шишку за архивом',
    rewardId: 'badge_squirrel_watcher',
  },
  duck_pier: {
    id: 'finding_mallard',
    name: 'Утки у причала',
    description: 'Замечена пара крякв на водной глади Финского залива',
    rewardId: 'badge_mallard_spotter',
  },
  sparrows_council: {
    id: 'finding_sparrows',
    name: 'Воробьиный совет',
    description: 'Вспугнута стайка воробьёв на гранитной дорожке',
    rewardId: 'badge_sparrow_friend',
  },
};

/**
 * Детерминированный генератор псевдослучайных чисел (Mulberry32).
 */
export function createMulberry32(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeedFromDateAndLocation(date: Date, lat: number, lon: number): number {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return (dayOfYear * 10000 + Math.floor(lat * 100) + Math.floor(lon * 10)) >>> 0;
}

export class HubScheduleManager {
  private prng: () => number;
  private activeSporadicEvents: Set<string> = new Set();
  private nextEventSchedule: Map<string, number> = new Map();
  private maxConcurrentSporadic = 3;
  private isStudyCalm = false;
  private discoveredFindings: Set<string> = new Set();

  constructor(seed: number) {
    this.prng = createMulberry32(seed);
    this.initSchedule();
  }

  private initSchedule(): void {
    HUB_AMBIENT_CYCLES.forEach((cycle) => {
      if (cycle.type === 'sporadic' && cycle.intervalRangeSec) {
        const [minSec, maxSec] = cycle.intervalRangeSec;
        const delay = minSec + this.prng() * (maxSec - minSec);
        this.nextEventSchedule.set(cycle.id, delay);
      }
    });
  }

  setStudyCalm(enabled: boolean): void {
    this.isStudyCalm = enabled;
  }

  getActiveSporadicCount(): number {
    return this.activeSporadicEvents.size;
  }

  getActiveSporadicEvents(): string[] {
    return Array.from(this.activeSporadicEvents);
  }

  update(deltaSeconds: number, currentUtcHour: number): string[] {
    const startedThisTick: string[] = [];

    // Если активен профиль study-calm, новые спорадические события не запускаются
    if (this.isStudyCalm) {
      return startedThisTick;
    }

    // 1. Проверка синоптических событий по часам UTC (сроки 00, 03, 06... и зонд 00, 12)
    HUB_AMBIENT_CYCLES.forEach((cycle) => {
      if (cycle.type === 'synoptic_hour' && cycle.synopticHoursUtc) {
        if (cycle.synopticHoursUtc.includes(currentUtcHour)) {
          if (!this.activeSporadicEvents.has(cycle.id) && this.activeSporadicEvents.size < this.maxConcurrentSporadic) {
            this.activeSporadicEvents.add(cycle.id);
            startedThisTick.push(cycle.id);
          }
        }
      }
    });

    // 2. Обновление таймеров спорадических событий
    this.nextEventSchedule.forEach((remainingSec, id) => {
      const newSec = remainingSec - deltaSeconds;
      if (newSec <= 0) {
        // Попытка запустить событие (строго с проверкой лимита <= 3)
        if (this.activeSporadicEvents.size < this.maxConcurrentSporadic && !this.activeSporadicEvents.has(id)) {
          this.activeSporadicEvents.add(id);
          startedThisTick.push(id);
        }

        // Планирование следующего появления
        const cycle = HUB_AMBIENT_CYCLES.find((c) => c.id === id);
        if (cycle?.intervalRangeSec) {
          const [minSec, maxSec] = cycle.intervalRangeSec;
          const nextInterval = minSec + this.prng() * (maxSec - minSec);
          this.nextEventSchedule.set(id, nextInterval);
        }
      } else {
        this.nextEventSchedule.set(id, newSec);
      }
    });

    return startedThisTick;
  }

  finishEvent(eventId: string): void {
    this.activeSporadicEvents.delete(eventId);
  }

  // Реакция на нажатие по животному / находке
  interactWithFauna(entityId: string): { reacted: boolean; finding?: FindingDiscovery } {
    let finding: FindingDiscovery | undefined;

    if (entityId === 'bird_tit') {
      finding = FINDINGS_REGISTRY.tit_observation;
    } else if (entityId === 'animal_squirrel') {
      finding = FINDINGS_REGISTRY.squirrel_pine;
    } else if (entityId === 'bird_mallard') {
      finding = FINDINGS_REGISTRY.duck_pier;
    } else if (entityId === 'birds_sparrows') {
      finding = FINDINGS_REGISTRY.sparrows_council;
    }

    if (finding && !this.discoveredFindings.has(finding.id)) {
      this.discoveredFindings.add(finding.id);
      // Фиксация находки на сервере
      worldBridge.emit('world:finding_discovered', finding);
    }

    return { reacted: true, finding };
  }
}
