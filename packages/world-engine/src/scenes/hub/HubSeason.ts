import type { WorldLocation } from './HubTimeOfDay.ts';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonParticle = 'none' | 'petals' | 'leaves' | 'snow';
export type SeasonWeather = 'clear' | 'rain' | 'snow';

export interface SeasonProfile {
  id: Season;
  label: string;
  /** Множитель-тинт для переднего плана L9 (растительность). 0xFFFFFF — без изменений. */
  foliageTint: number;
  /** Цветовая вуаль поверх земли и фасадов (L6–L5). */
  washColor: number;
  washAlpha: number;
  /** Доля площади земли, закрытая снегом (0..1). */
  snowCover: number;
  /** Снег на крышах зданий. */
  roofSnow: boolean;
  /** Цвет травы под процедурными постройками и тропинками. */
  groundAccent: number;
  particle: SeasonParticle;
  particleColors: readonly number[];
  particleCount: number;
  defaultWeather: SeasonWeather;
  /** Смещение окон: зимой свет включается раньше (короткий день). */
  windowLightBoost: number;
}

export const SEASONS_ORDER: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_PROFILES: Readonly<Record<Season, SeasonProfile>> = {
  spring: {
    id: 'spring',
    label: 'Весна',
    foliageTint: 0xe6ffd0,
    washColor: 0xcfe8b0,
    washAlpha: 0.08,
    snowCover: 0.08,
    roofSnow: false,
    groundAccent: 0x86c46a,
    particle: 'petals',
    particleColors: [0xf6d9e4, 0xffffff, 0xe9b8cc],
    particleCount: 14,
    defaultWeather: 'clear',
    windowLightBoost: 0,
  },
  summer: {
    id: 'summer',
    label: 'Лето',
    foliageTint: 0xffffff,
    washColor: 0xfff2b8,
    washAlpha: 0.04,
    snowCover: 0,
    roofSnow: false,
    groundAccent: 0x7bb865,
    particle: 'none',
    particleColors: [],
    particleCount: 0,
    defaultWeather: 'clear',
    windowLightBoost: 0,
  },
  autumn: {
    id: 'autumn',
    label: 'Осень',
    foliageTint: 0xffc27a,
    washColor: 0xd9894a,
    washAlpha: 0.14,
    snowCover: 0,
    roofSnow: false,
    groundAccent: 0xa89a58,
    particle: 'leaves',
    particleColors: [0xd9702f, 0xe8a43a, 0xb5472a, 0xc9b24a],
    particleCount: 24,
    defaultWeather: 'clear',
    windowLightBoost: 0.1,
  },
  winter: {
    id: 'winter',
    label: 'Зима',
    foliageTint: 0xdbe6f2,
    washColor: 0xdfeaf7,
    washAlpha: 0.22,
    snowCover: 0.85,
    roofSnow: true,
    groundAccent: 0xe9e4d6,
    particle: 'snow',
    particleColors: [0xf4f7fa, 0xdfeaf7],
    particleCount: 40,
    defaultWeather: 'snow',
    windowLightBoost: 0.2,
  },
};

export function seasonForMonth(month: number): Season {
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

/** Сезон по календарю станции (месяц в её часовом поясе, 0..11). */
export function calculateSeason(date: Date, location: Pick<WorldLocation, 'timezone'>): Season {
  let month = date.getMonth();
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: location.timezone,
      month: 'numeric',
    })
      .formatToParts(date)
      .find((p) => p.type === 'month')?.value;
    if (part !== undefined) month = parseInt(part, 10) - 1;
  } catch {
    // Резерв: локальное время устройства
  }
  return seasonForMonth(month);
}

export function nextSeason(season: Season): Season {
  return SEASONS_ORDER[(SEASONS_ORDER.indexOf(season) + 1) % SEASONS_ORDER.length];
}

export function isSeason(value: unknown): value is Season {
  return typeof value === 'string' && (SEASONS_ORDER as readonly string[]).includes(value);
}
