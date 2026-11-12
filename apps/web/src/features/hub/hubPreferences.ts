import { getPresentationPreferences, getSettings, HUB_SETTINGS_EVENT, LEGACY_HUB_KEY, systemPrefersReducedMotion, updateSettings } from '../settings/settingsStore';

export interface HubPreferences {
  soundEnabled: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
}

export const HUB_PREFERENCES_KEY = LEGACY_HUB_KEY;
export const HUB_PREFERENCES_EVENT = HUB_SETTINGS_EVENT;

/** Compatibility adapter: the station and campus share one settings store. */
export function readHubPreferences(): HubPreferences { return getPresentationPreferences(); }

export function saveHubPreferences(preferences: HubPreferences): boolean {
  return updateSettings({
    soundEnabled: preferences.soundEnabled,
    lowPower: preferences.lowPower,
    // A system override is effective, not a permanent user choice.
    reducedMotion: systemPrefersReducedMotion() ? getSettings().reducedMotion : preferences.reducedMotion,
  });
}
