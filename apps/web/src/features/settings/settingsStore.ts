import { useSyncExternalStore } from 'react';

export type AmbientWeatherMode = 'auto' | 'clear' | 'rain';

export interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  weather: AmbientWeatherMode;
  reducedMotion: boolean;
  highContrast: boolean;
  lowPower: boolean;
  integerScale: boolean;
  pixelFont: boolean;
}

export const SETTINGS_KEY = 'synopsis_26063_settings';
export const LEGACY_HUB_KEY = 'synopsis.ui.preferences.v1';
export const SETTINGS_EVENT = 'station:settings-changed';
export const HUB_SETTINGS_EVENT = 'hub:preferences-changed';
export const DEFAULT_SETTINGS: Readonly<UserSettings> = Object.freeze({
  soundEnabled: false,
  musicEnabled: true,
  masterVolume: 70,
  musicVolume: 35,
  sfxVolume: 65,
  ambientVolume: 50,
  weather: 'auto',
  reducedMotion: false,
  highContrast: false,
  lowPower: false,
  integerScale: true,
  pixelFont: true,
});

const booleanKeys = ['soundEnabled', 'musicEnabled', 'reducedMotion', 'highContrast', 'lowPower', 'integerScale', 'pixelFont'] as const;
const volumeKeys = ['masterVolume', 'musicVolume', 'sfxVolume', 'ambientVolume'] as const;

/** Unknown storage values are never spread into preferences or CSS. */
export function normalizeSettings(value: unknown, legacyHub?: unknown): UserSettings {
  const result: UserSettings = { ...DEFAULT_SETTINGS };
  if (legacyHub && typeof legacyHub === 'object' && !Array.isArray(legacyHub)) {
    for (const key of ['soundEnabled', 'reducedMotion', 'lowPower'] as const) {
      const legacy = (legacyHub as Record<string, unknown>)[key];
      if (typeof legacy === 'boolean') result[key] = legacy;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  const candidate = value as Record<string, unknown>;
  for (const key of booleanKeys) {
    if (typeof candidate[key] === 'boolean') result[key] = candidate[key] as boolean;
  }
  for (const key of volumeKeys) {
    const volume = candidate[key];
    if (typeof volume === 'number' && Number.isFinite(volume)) result[key] = Math.round(Math.max(0, Math.min(100, volume)));
  }
  if (candidate.weather === 'auto' || candidate.weather === 'clear' || candidate.weather === 'rain') result.weather = candidate.weather;
  return result;
}

function readJSON(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}

/** A storage read; it does not create audio, write storage or require a session. */
export function loadSettings(): UserSettings {
  return normalizeSettings(readJSON(SETTINGS_KEY), readJSON(LEGACY_HUB_KEY));
}

let current: UserSettings | null = null;
const listeners = new Set<() => void>();
let stopStorageListener: (() => void) | null = null;

export function getSettings(): UserSettings {
  if (!current) current = loadSettings();
  return current;
}

function notify(): void { for (const listener of listeners) listener(); }

export function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function getPresentationPreferences(settings = getSettings()) {
  return { soundEnabled: settings.soundEnabled, reducedMotion: settings.reducedMotion || systemPrefersReducedMotion(), lowPower: settings.lowPower };
}

export function saveSettings(settings: UserSettings): boolean {
  current = normalizeSettings(settings);
  let saved = true;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    localStorage.setItem(LEGACY_HUB_KEY, JSON.stringify({ soundEnabled: current.soundEnabled, reducedMotion: current.reducedMotion, lowPower: current.lowPower }));
  } catch { saved = false; }
  notify();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
    window.dispatchEvent(new CustomEvent(HUB_SETTINGS_EVENT, { detail: getPresentationPreferences(current) }));
  }
  return saved;
}

export function updateSettings(patch: Partial<UserSettings>): boolean {
  return saveSettings(normalizeSettings({ ...getSettings(), ...patch }));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!stopStorageListener && typeof window !== 'undefined') {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== SETTINGS_KEY && event.key !== LEGACY_HUB_KEY) return;
      current = loadSettings();
      notify();
      window.dispatchEvent(new CustomEvent(HUB_SETTINGS_EVENT, { detail: getPresentationPreferences(current) }));
    };
    window.addEventListener('storage', onStorage);
    stopStorageListener = () => window.removeEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) { stopStorageListener?.(); stopStorageListener = null; }
  };
}

export function useSettings(): UserSettings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}

export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, systemPrefersReducedMotion, () => false);
}

export function usePresentationPreferences() {
  const settings = useSettings();
  const systemReducedMotion = useSystemReducedMotion();
  return { soundEnabled: settings.soundEnabled, reducedMotion: settings.reducedMotion || systemReducedMotion, lowPower: settings.lowPower };
}
