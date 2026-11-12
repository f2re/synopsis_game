import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { worldAudio } from '@synopsis/world-engine/audio';
import { usePresentationPreferences, useSettings } from '../settings/settingsStore';
import { ambientWeatherAt, atmospherePolicy, type AmbientWeather, type AtmosphereSurface } from './ambientPolicy';
import { AUDIO_UNLOCK_EVENT, isAudioUnlocked, unlockAudioFromGesture } from './audioGate';
import { StationMusic } from './StationMusic';
import './atmosphere.css';

const AmbientWeatherContext = createContext<AmbientWeather>('clear');
export function useAmbientWeather(): AmbientWeather { return useContext(AmbientWeatherContext); }
export type { AtmosphereSurface } from './ambientPolicy';

/** One station-level owner. WorldCanvas owns campus beds; this owns indoor beds. */
export function AtmosphereProvider({ surface, children }: { surface: AtmosphereSurface; children: ReactNode }) {
  const settings = useSettings();
  const preferences = usePresentationPreferences();
  const [visible, setVisible] = useState(() => !document.hidden);
  const [unlocked, setUnlocked] = useState(isAudioUnlocked);
  const [clock, setClock] = useState(Date.now);
  const music = useRef<StationMusic | null>(null);
  if (!music.current) music.current = new StationMusic(() => worldAudio.getMusicOutput());
  const weather = ambientWeatherAt(settings.weather, clock);
  const policy = atmospherePolicy(settings, surface, visible, unlocked);

  useEffect(() => {
    const onUnlock = () => setUnlocked(isAudioUnlocked());
    const onVisibility = () => { setVisible(!document.hidden); setClock(Date.now()); };
    window.addEventListener('pointerdown', unlockAudioFromGesture, { capture: true, passive: true });
    window.addEventListener('keydown', unlockAudioFromGesture, { capture: true });
    window.addEventListener(AUDIO_UNLOCK_EVENT, onUnlock);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerdown', unlockAudioFromGesture, true);
      window.removeEventListener('keydown', unlockAudioFromGesture, true);
      window.removeEventListener(AUDIO_UNLOCK_EVENT, onUnlock);
      document.removeEventListener('visibilitychange', onVisibility);
      music.current?.stop();
      worldAudio.stopHubAtmosphereSchedule();
      worldAudio.stopAmbient(0);
      worldAudio.setMuted(true);
    };
  }, []);

  useEffect(() => {
    if (!visible || settings.weather !== 'auto' || surface === 'silent') return;
    const timer = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [visible, settings.weather, surface]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reducedMotion = String(preferences.reducedMotion);
    root.dataset.lowPower = String(settings.lowPower);
    root.dataset.highContrast = String(settings.highContrast);
    root.dataset.pixelFont = String(settings.pixelFont);
    root.dataset.integerScale = String(settings.integerScale);
    root.dataset.ambientWeather = weather;
    root.dataset.atmosphereSurface = surface;
    // Also use effective system preference when settings changed outside the campus.
    worldAudio.setReducedSensory(preferences.reducedMotion);
    worldAudio.setLowPower(settings.lowPower);
  }, [preferences.reducedMotion, settings.lowPower, settings.highContrast, settings.pixelFont, settings.integerScale, weather, surface]);

  useEffect(() => {
    worldAudio.setVolume('master', settings.masterVolume / 100);
    worldAudio.setVolume('music', settings.musicVolume / 100);
    worldAudio.setVolume('effects', settings.sfxVolume / 100);
    worldAudio.setVolume('ui', settings.sfxVolume / 100);
    worldAudio.setVolume('ambient', settings.ambientVolume / 100);
  }, [settings.masterVolume, settings.musicVolume, settings.sfxVolume, settings.ambientVolume]);

  useEffect(() => {
    worldAudio.setMuted(!policy.audible);
    if (policy.music) music.current?.start(settings.lowPower);
    else music.current?.stop();
    // Campus ambience has one owner in WorldCanvas (including archive visits).
    if (policy.campusOwnsAmbient) return;
    if (!policy.indoorAmbient) {
      worldAudio.stopHubAtmosphereSchedule();
      worldAudio.stopAmbient(200);
      return;
    }
    worldAudio.playArchiveAmbient(600);
    if (weather === 'rain') worldAudio.addAmbientLayer('audio.ambient.rain-soft', 0.18, 0, 800);
    return () => {
      worldAudio.stopHubAtmosphereSchedule();
      worldAudio.stopAmbient(200);
    };
  }, [policy.audible, policy.music, policy.indoorAmbient, policy.campusOwnsAmbient, settings.lowPower, weather]);

  return <AmbientWeatherContext.Provider value={weather}>{children}</AmbientWeatherContext.Provider>;
}
