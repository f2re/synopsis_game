/** Presentation settings only. They never change learning answers or progress. */
export interface WorldUiPreferences {
  soundEnabled: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
}

export const DEFAULT_WORLD_PREFERENCES: Readonly<WorldUiPreferences> = {
  soundEnabled: false,
  reducedMotion: false,
  lowPower: false,
};

export function normalizeWorldPreferences(value: unknown): WorldUiPreferences {
  const candidate = value && typeof value === 'object' ? value as Partial<WorldUiPreferences> : {};
  return {
    soundEnabled: candidate.soundEnabled === true,
    reducedMotion: candidate.reducedMotion === true,
    lowPower: candidate.lowPower === true,
  };
}

export interface WorldInteractionTarget {
  id: string;
  label: string;
  state: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
