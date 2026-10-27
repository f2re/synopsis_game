import { WORLD_PALETTE } from '../../theme/tokens';
import type { DayPhase } from '../../bridge/WorldBridge';

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
  private readonly demoPhaseDurationMs = 5000; // 5s на фазу в демо-режиме (30s полный цикл)

  constructor(location: WorldLocation = STATION_26063_LOCATION) {
    this.location = location;
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
  }

  update(deltaMs: number, onPhaseChange?: (newPhase: DayPhase) => void): void {
    if (!this.isAcceleratedDemo) return;

    this.demoTimer += deltaMs;
    if (this.demoTimer >= this.demoPhaseDurationMs) {
      this.demoTimer = 0;
      const currentIndex = PHASES_ORDER.indexOf(this.currentPhase);
      const nextIndex = (currentIndex + 1) % PHASES_ORDER.length;
      this.currentPhase = PHASES_ORDER[nextIndex];
      onPhaseChange?.(this.currentPhase);
    }
  }

  calculateSolarPhase(date: Date = new Date()): DayPhase {
    // В июне/июле в Санкт-Петербурге действуют Белые ночи
    const month = date.getMonth(); // 0-based: 5 = June, 6 = July
    const hours = date.getHours();

    if ((month === 5 || month === 6) && (hours >= 23 || hours <= 4)) {
      return 'white_nights';
    }

    if (hours >= 23 || hours < 5) return 'night';
    if (hours >= 5 && hours < 8) return 'dawn';
    if (hours >= 8 && hours < 18) return 'day';
    if (hours >= 18 && hours < 21) return 'golden_hour';
    return 'twilight';
  }
}
