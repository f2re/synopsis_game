import { WORLD_PALETTE } from '../../theme/tokens.ts';
import type { DayPhase } from '../../bridge/WorldBridge.ts';

export type { DayPhase };

export interface WorldLocation {
  latitude: number;
  longitude: number;
  timezone: string;
}

export const STATION_26063_LOCATION: WorldLocation = {
  latitude: 59.93,
  longitude: 30.31,
  timezone: 'Europe/Moscow',
};

export interface PhaseColors {
  skyTop: number;
  skyHorizon: number;
  waterReflect: number;
  windowLightAlpha: number;
  starsVisible: boolean;
}

export const PHASE_COLOR_MAP: Record<DayPhase, PhaseColors> = {
  night: {
    skyTop: WORLD_PALETTE.skyNight0,
    skyHorizon: WORLD_PALETTE.skyNight3,
    waterReflect: WORLD_PALETTE.waterGulf0,
    windowLightAlpha: 0.75,
    starsVisible: true,
  },
  dawn: {
    skyTop: WORLD_PALETTE.twilight0,
    skyHorizon: WORLD_PALETTE.twilight4,
    waterReflect: WORLD_PALETTE.waterGulf1,
    windowLightAlpha: 0.4,
    starsVisible: false,
  },
  day: {
    skyTop: WORLD_PALETTE.skyDay0,
    skyHorizon: WORLD_PALETTE.skyDay2,
    waterReflect: WORLD_PALETTE.waterGulf3,
    windowLightAlpha: 0.1,
    starsVisible: false,
  },
  golden_hour: {
    skyTop: WORLD_PALETTE.twilight1,
    skyHorizon: WORLD_PALETTE.twilight4,
    waterReflect: WORLD_PALETTE.waterGulf2,
    windowLightAlpha: 0.3,
    starsVisible: false,
  },
  twilight: {
    skyTop: WORLD_PALETTE.skyNight2,
    skyHorizon: WORLD_PALETTE.twilight2,
    waterReflect: WORLD_PALETTE.waterGulf1,
    windowLightAlpha: 0.6,
    starsVisible: true,
  },
  white_nights: {
    skyTop: WORLD_PALETTE.skyNight4,
    skyHorizon: WORLD_PALETTE.twilight3,
    waterReflect: WORLD_PALETTE.waterGulf2,
    windowLightAlpha: 0.45,
    starsVisible: false,
  },
};

export const PHASES_ORDER: DayPhase[] = [
  'night',
  'dawn',
  'day',
  'golden_hour',
  'twilight',
  'white_nights',
];

export class HubTimeOfDay {
  private currentPhase: DayPhase = 'day';
  private location: WorldLocation = STATION_26063_LOCATION;
  private isAcceleratedDemo = false;
  private demoTimer = 0;
  private realTimeCheckTimer = 0;
  private readonly demoPhaseDurationMs = 5000; // 5s на фазу в демо-режиме (30s полный цикл)

  constructor(location: WorldLocation = STATION_26063_LOCATION) {
    this.location = location;
    // По умолчанию рассчитываем фазу суток из реального астрономического времени локации
    this.currentPhase = this.calculateSolarPhase(new Date());
  }

  getCurrentPhase(): DayPhase {
    return this.currentPhase;
  }

  getPhaseColors(): PhaseColors {
    return PHASE_COLOR_MAP[this.currentPhase];
  }

  setPhase(phase: DayPhase): void {
    this.currentPhase = phase;
  }

  setAcceleratedDemo(enabled: boolean): void {
    this.isAcceleratedDemo = enabled;
    this.demoTimer = 0;
    if (!enabled) {
      // При выключении демо немедленно возвращаемся к реальному времени
      this.currentPhase = this.calculateSolarPhase(new Date());
    }
  }

  isDemoMode(): boolean {
    return this.isAcceleratedDemo;
  }

  update(deltaMs: number, onPhaseChange?: (newPhase: DayPhase) => void): void {
    if (this.isAcceleratedDemo) {
      this.demoTimer += deltaMs;
      if (this.demoTimer >= this.demoPhaseDurationMs) {
        this.demoTimer = 0;
        const currentIndex = PHASES_ORDER.indexOf(this.currentPhase);
        const nextIndex = (currentIndex + 1) % PHASES_ORDER.length;
        this.currentPhase = PHASES_ORDER[nextIndex];
        onPhaseChange?.(this.currentPhase);
      }
      return;
    }

    // В обычном режиме проверяем переход астрономической фазы каждые 30 секунд
    this.realTimeCheckTimer += deltaMs;
    if (this.realTimeCheckTimer >= 30000) {
      this.realTimeCheckTimer = 0;
      const expectedPhase = this.calculateSolarPhase(new Date());
      if (expectedPhase !== this.currentPhase) {
        this.currentPhase = expectedPhase;
        onPhaseChange?.(this.currentPhase);
      }
    }
  }

  calculateSolarPhase(date: Date = new Date()): DayPhase {
    const solar = calculateSolarPosition(date, this.location);
    const { elevationDeg, hourAngleDeg, midnightElevationDeg } = solar;

    // Художественное состояние «белые ночи» включается, только если в
    // текущие сутки нет морской ночи (минимальная высота Солнца > -12°).
    // Это явно выбранный критерий среды, а не официальный прогноз.
    const isWhiteNight = midnightElevationDeg > -12 && elevationDeg < 0;

    if (elevationDeg >= 0) {
      const latitude = degreesToRadians(this.location.latitude);
      const cosHourAngle = -Math.tan(latitude) * Math.tan(solar.declinationRad);
      // В полярный день, когда границы восхода нет, вся освещённая
      // часть суток остаётся днём. В прочих случаях выделяем ~48 мин
      // после восхода и перед закатом для художественного света.
      if (cosHourAngle <= -1) return 'day';
      const sunriseHourAngleDeg = radiansToDegrees(Math.acos(Math.min(1, Math.max(-1, cosHourAngle))));
      const dayHourAngleDeg = Math.max(0, sunriseHourAngleDeg - 12);
      if (Math.abs(hourAngleDeg) <= dayHourAngleDeg) return 'day';
      return hourAngleDeg < 0 ? 'dawn' : 'golden_hour';
    }

    if (isWhiteNight) return 'white_nights';
    // Гражданские сумерки: -6° ≤ h < 0°. Утреннее состояние — dawn,
    // вечернее — twilight; далее морские сумерки до -12°.
    if (elevationDeg >= -6) return hourAngleDeg < 0 ? 'dawn' : 'twilight';
    if (elevationDeg >= -12) return 'twilight';
    return 'night';
  }
}

/** Геометрическое положение центра Солнца без поправки на рефракцию.
 * NOAA GML, General Solar Position Calculations:
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * Границы гражданских (-6°) и морских (-12°) сумерек: USNO
 * https://aa.usno.navy.mil/faq/RST_defs
 *
 * Это приближённый расчёт для художественного освещения, НЕ
 * астрономический эфемеридный сервис и НЕ учёт рельефа/рефракции.
 */
export interface SolarPosition {
  elevationDeg: number;
  hourAngleDeg: number;
  declinationRad: number;
  midnightElevationDeg: number;
}

const degreesToRadians = (value: number): number => value * Math.PI / 180;
const radiansToDegrees = (value: number): number => value * 180 / Math.PI;

export function calculateSolarPosition(date: Date, location: WorldLocation): SolarPosition {
  const year = date.getUTCFullYear();
  const dayOfYear = Math.floor((
    Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(year, 0, 1)
  ) / 86_400_000) + 1;
  const daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
  const utcHours = date.getUTCHours()
    + date.getUTCMinutes() / 60
    + date.getUTCSeconds() / 3600
    + date.getUTCMilliseconds() / 3_600_000;
  const gamma = 2 * Math.PI / daysInYear * (dayOfYear - 1 + (utcHours - 12) / 24);
  const equationOfTimeMin = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
  const declinationRad =
    0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);

  // UTC-минуты + уравнение времени + 4 мин/градус восточной долготы.
  // Часовой пояс нужен только при отображении времени в интерфейсе.
  const trueSolarTimeMin = ((utcHours * 60 + equationOfTimeMin + 4 * location.longitude)
    % 1440 + 1440) % 1440;
  const hourAngleDeg = trueSolarTimeMin / 4 - 180;
  const latitudeRad = degreesToRadians(location.latitude);
  const hourAngleRad = degreesToRadians(hourAngleDeg);
  const sinElevation =
    Math.sin(latitudeRad) * Math.sin(declinationRad)
    + Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const sinMidnightElevation =
    Math.sin(latitudeRad) * Math.sin(declinationRad)
    - Math.cos(latitudeRad) * Math.cos(declinationRad);

  return {
    elevationDeg: radiansToDegrees(Math.asin(Math.min(1, Math.max(-1, sinElevation)))),
    hourAngleDeg,
    declinationRad,
    midnightElevationDeg: radiansToDegrees(Math.asin(Math.min(1, Math.max(-1, sinMidnightElevation)))),
  };
}
