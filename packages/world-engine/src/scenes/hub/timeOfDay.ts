export type HubTimeOfDay = 'day' | 'noon' | 'twilight' | 'night';

export interface HubLightingPreset {
  /** World-only multiply tint. Runtime UI must be rendered above/excluded from this pass. */
  multiply: readonly [number, number, number];
  /** World-only additive tint, normalized 0..1. */
  additive: readonly [number, number, number];
  environmentAlpha: number;
  skyAlpha: number;
  windowLightAlpha: number;
  lampGlowAlpha: number;
}

/**
 * Lighting contract for the approved Hub composition.
 *
 * The approved master is the twilight visual baseline. These values describe the
 * runtime lighting stack; they do not authorize repainting/recomposing the Hub.
 * Final rendering must apply the environment/sky/window/lamp masks defined by
 * packages/contracts/hub-main-screen.contract.json and must exclude L7 runtime UI.
 */
export const HUB_LIGHTING_PRESETS: Readonly<Record<HubTimeOfDay, HubLightingPreset>> = {
  day: {
    multiply: [0.98, 1.04, 1.1],
    additive: [0.015, 0.025, 0.035],
    environmentAlpha: 0.68,
    skyAlpha: 0.5,
    windowLightAlpha: 0.12,
    lampGlowAlpha: 0.08,
  },
  noon: {
    multiply: [0.97, 1.04, 1.12],
    additive: [0.02, 0.035, 0.055],
    environmentAlpha: 0.82,
    skyAlpha: 0.62,
    windowLightAlpha: 0.06,
    lampGlowAlpha: 0.04,
  },
  twilight: {
    multiply: [1, 1, 1],
    additive: [0, 0, 0],
    environmentAlpha: 0,
    skyAlpha: 0,
    windowLightAlpha: 0.65,
    lampGlowAlpha: 0.55,
  },
  night: {
    multiply: [0.42, 0.56, 0.85],
    additive: [0, 0, 0.035],
    environmentAlpha: 0.88,
    skyAlpha: 0.92,
    windowLightAlpha: 1,
    lampGlowAlpha: 1,
  },
};

export const DEFAULT_HUB_TIME_OF_DAY: HubTimeOfDay = 'twilight';

export function isHubTimeOfDay(value: string | null | undefined): value is HubTimeOfDay {
  return value === 'day' || value === 'noon' || value === 'twilight' || value === 'night';
}
