export interface HubPreferences {
  soundEnabled: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
}

export const HUB_PREFERENCES_KEY = 'synopsis.ui.preferences.v1';
export const HUB_PREFERENCES_EVENT = 'hub:preferences-changed';

/** Local presentation preferences never alter server-owned progress or answers. */
export function readHubPreferences(): HubPreferences {
  const defaults: HubPreferences = {
    soundEnabled: false,
    reducedMotion: typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
    lowPower: false,
  };
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(HUB_PREFERENCES_KEY) ?? 'null');
    if (!stored || typeof stored !== 'object') return defaults;
    const value = stored as Partial<HubPreferences>;
    return {
      soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : defaults.soundEnabled,
      reducedMotion: defaults.reducedMotion || value.reducedMotion === true,
      lowPower: typeof value.lowPower === 'boolean' ? value.lowPower : defaults.lowPower,
    };
  } catch {
    return defaults;
  }
}

export function saveHubPreferences(preferences: HubPreferences): boolean {
  let saved = true;
  try {
    localStorage.setItem(HUB_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    saved = false;
  }
  window.dispatchEvent(new CustomEvent(HUB_PREFERENCES_EVENT, { detail: preferences }));
  return saved;
}
