import type { AmbientWeatherMode, UserSettings } from '../settings/settingsStore';

export type AmbientWeather = 'clear' | 'rain';
export type AtmosphereSurface = 'home' | 'campus' | 'library' | 'help' | 'settings' | 'study' | 'silent';
export const WEATHER_CYCLE_MS = 12 * 60_000;

/** Authored scenery only. This is unrelated to observations and task weather. */
export function ambientWeatherAt(mode: AmbientWeatherMode, timeMs: number): AmbientWeather {
  if (mode !== 'auto') return mode;
  const phase = ((Math.floor(timeMs / 1000) % (WEATHER_CYCLE_MS / 1000)) + WEATHER_CYCLE_MS / 1000) % (WEATHER_CYCLE_MS / 1000);
  return phase >= 480 && phase < 660 ? 'rain' : 'clear';
}

export function atmospherePolicy(settings: UserSettings, surface: AtmosphereSurface, visible: boolean, unlocked: boolean) {
  const audible = settings.soundEnabled && settings.masterVolume > 0 && visible && unlocked && surface !== 'silent';
  return {
    audible,
    music: audible && settings.musicEnabled && settings.musicVolume > 0 && surface !== 'study',
    indoorAmbient: audible && settings.ambientVolume > 0 && surface !== 'campus' && surface !== 'study',
    campusOwnsAmbient: surface === 'campus',
  };
}
