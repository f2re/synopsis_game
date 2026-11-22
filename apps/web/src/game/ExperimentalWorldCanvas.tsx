import { useEffect, useRef } from 'react';
import {
  HUB_BUILDINGS,
  normalizeWorldPreferences,
  worldAudio,
  worldBridge,
  type WorldUiPreferences,
} from '@synopsis/world-engine';
import { createExperimentalHubGame } from '@synopsis/world-engine/experimental';
import { PixelScrollArea } from '../features/ui/PixelScrollArea';
import { readHubPreferences, HUB_PREFERENCES_EVENT } from '../features/hub/hubPreferences';
import { getSettings } from '../features/settings/settingsStore';
import { useAmbientWeather } from '../features/atmosphere/AtmosphereProvider';
import { AUDIO_UNLOCK_EVENT, isAudioUnlocked } from '../features/atmosphere/audioGate';

/** The world receives aggregate presence; the account portrait belongs to React. */
export function ExperimentalWorldCanvas({ stationPresence }: { stationPresence: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const weather = useAmbientWeather();
  const weatherRef = useRef(weather);
  const applyAudioRef = useRef<(() => void) | null>(null);
  const applyWeatherRef = useRef<(() => void) | null>(null);
  const publishPresenceRef = useRef<((online: number) => void) | null>(null);
  weatherRef.current = weather;

  useEffect(() => {
    applyWeatherRef.current?.();
    applyAudioRef.current?.();
  }, [weather]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let preferences = normalizeWorldPreferences(readHubPreferences());
    let modalOpen = false;
    let rendererReady = true;
    let phaserContextReady = true;
    let experimentalContextReady = true;
    let activeScene = 'hub';
    let disposed = false;
    worldAudio.setMuted(!preferences.soundEnabled || !isAudioUnlocked() || document.hidden);
    const game = createExperimentalHubGame({ parent: host });
    publishPresenceRef.current = (online) => {
      game.registry.set('server:station_presence', online);
      worldBridge.emit('server:station_presence', online);
    };

    const applyInput = () => {
      game.registry.set('ui.modal_open', modalOpen);
      if (game.input) game.input.enabled = !modalOpen && !document.hidden && rendererReady;
      for (const scene of game.scene.getScenes(true)) {
        scene.input.enabled = !modalOpen && !document.hidden && rendererReady;
        if (scene.input.keyboard) scene.input.keyboard.enabled = !modalOpen && !document.hidden && rendererReady;
      }
    };

    // One absolute presentation snapshot survives delayed scene creation. Weather
    // stays selected when motion stops; the scene owns the static rendering.
    const applyWeather = () => {
      const presentation = {
        mode: weatherRef.current,
        animate: weatherRef.current === 'rain' && !preferences.reducedMotion &&
          !preferences.lowPower && !document.hidden && rendererReady,
      };
      game.registry.set('ui.weather', presentation);
      host.dataset.weather = presentation.mode;
      host.dataset.weatherAnimated = String(presentation.animate);
      worldBridge.emit('ui:weather', presentation);
    };
    applyWeatherRef.current = applyWeather;

    const applyAudio = () => {
      const settings = getSettings();
      const audible = preferences.soundEnabled && settings.masterVolume > 0 && isAudioUnlocked() && !document.hidden && rendererReady;
      worldAudio.setMuted(!audible);
      worldAudio.setReducedSensory(preferences.reducedMotion);
      worldAudio.setLowPower(preferences.lowPower);
      host.dataset.soundMuted = String(worldAudio.isMuted());
      if (!audible || settings.ambientVolume === 0) {
        worldAudio.stopHubAtmosphereSchedule();
        worldAudio.stopAmbient(150);
        return;
      }
      if (activeScene === 'archive') {
        worldAudio.playArchiveAmbient(450);
        if (weatherRef.current === 'rain') worldAudio.addAmbientLayer('audio.ambient.rain-soft', .18, 0, 800);
      } else worldAudio.playHubOutdoorAmbient(weatherRef.current === 'rain', 450);
      if (preferences.reducedMotion || preferences.lowPower || activeScene !== 'hub') {
        worldAudio.stopHubAtmosphereSchedule();
      } else worldAudio.startHubAtmosphereSchedule();
    };
    applyAudioRef.current = applyAudio;

    const applyPreferences = (value: unknown) => {
      const next = normalizeWorldPreferences(value);
      preferences = next;
      game.registry.set('ui.preferences', preferences);
      const fpsLimit = preferences.lowPower ? 30 : 60;
      if (game.loop.fpsLimit !== fpsLimit) game.loop.setFPSLimit(fpsLimit);
      for (const scene of game.scene.getScenes(true)) {
        // Decorative tweens stop; native controls and explicit actions keep working.
        scene.tweens.timeScale = preferences.reducedMotion ? 0 : 1;
        scene.events.emit('ui:preferences', preferences);
      }
      host.dataset.reducedMotion = String(preferences.reducedMotion);
      host.dataset.lowPower = String(preferences.lowPower);
      host.dataset.fpsLimit = String(fpsLimit);
      applyWeather();
      applyAudio();
      worldBridge.emit('world:preferences_applied', { ...preferences, fpsLimit });
    };

    const unsubscribers = [
      worldBridge.on<{ ready: boolean }>('world:experimental_context', ({ ready }) => {
        experimentalContextReady = ready;
        rendererReady = phaserContextReady && experimentalContextReady;
        host.dataset.context = rendererReady ? 'ready' : 'lost';
        handleVisibility();
      }),
      worldBridge.on('world:start_shift', () => {
        window.dispatchEvent(new CustomEvent('hub:start-shift'));
      }),
      worldBridge.on<WorldUiPreferences>('ui:preferences', applyPreferences),
      worldBridge.on<boolean>('ui:modal_open', (open) => {
        modalOpen = open === true;
        applyInput();
      }),
      worldBridge.on<{ scene: string }>('ui:open_scene', ({ scene }) => {
        if (scene !== 'hub' && scene !== 'archive') return;
        if (game.scene.isActive(scene)) return;
        const current = game.scene.getScenes(true)[0];
        if (current) current.scene.start(scene);
      }),
      worldBridge.on<string>('world:scene_ready', (scene) => {
        activeScene = scene;
        applyPreferences(preferences);
        applyInput();
        applyAudio();
        host.dataset.scene = scene;
      }),
      worldBridge.on<Record<string, unknown>>('world:characters_ready', (diagnostic) => {
        host.dataset.characters = JSON.stringify(diagnostic);
      }),
      worldBridge.on<{lightingMode: string; phase: string; weather?: string; rainDrops?: number; rainAnimated?: boolean}>('world:environment_mode', (environment) => {
        host.dataset.lightingMode = environment.lightingMode;
        host.dataset.phase = environment.phase;
        if (environment.weather !== undefined) host.dataset.renderedWeather = environment.weather;
        if (environment.rainDrops !== undefined) host.dataset.rainDrops = String(environment.rainDrops);
        if (environment.rainAnimated !== undefined) host.dataset.rainAnimated = String(environment.rainAnimated);
      }),
    ];

    const handleStoredPreferences = (event: Event) => {
      applyPreferences((event as CustomEvent<WorldUiPreferences>).detail ?? readHubPreferences());
    };
    const handleVisibility = () => {
      const visible = !document.hidden && rendererReady;
      game.registry.set('ui.world_visible', visible);
      worldBridge.emit('ui:world_visible', visible);
      if (!visible) game.loop.sleep();
      else game.loop.wake();
      applyInput();
      applyWeather();
      applyAudio();
    };
    const handleContextLost = () => { phaserContextReady = false; rendererReady = false; host.dataset.context = 'lost'; handleVisibility(); };
    const handleContextRestored = () => {
      phaserContextReady = true;
      rendererReady = experimentalContextReady;
      host.dataset.context = rendererReady ? 'ready' : 'lost';
      applyPreferences(preferences);
      handleVisibility();
    };
    let rendererEventsBound = false;
    const bindRendererEvents = () => {
      if (rendererEventsBound || !game.renderer) return;
      rendererEventsBound = true;
      // Phaser 4 publishes these after renderer resource loss/restoration.
      game.renderer.on('losewebgl', handleContextLost);
      game.renderer.on('restorewebgl', handleContextRestored);
      host.dataset.context = 'ready';
    };
    applyPreferences(preferences);
    game.registry.set('ui.world_visible', !document.hidden);
    window.addEventListener(HUB_PREFERENCES_EVENT, handleStoredPreferences);
    window.addEventListener(AUDIO_UNLOCK_EVENT, applyAudio);
    document.addEventListener('visibilitychange', handleVisibility);
    game.events.once('ready', bindRendererEvents);
    bindRendererEvents();

    const diagnostics = import.meta.env.DEV && new URLSearchParams(window.location.search).get('worldDiagnostics') === '1';
    let renderCount = 0;
    let measuredAt = performance.now();
    const countRender = () => { renderCount++; };
    let diagnosticsTimer: number | undefined;
    if (diagnostics) {
      game.events.on('postrender', countRender);
      diagnosticsTimer = window.setInterval(() => {
        const now = performance.now();
        // Phaser's actualFps measures RAF callbacks before the frame limiter.
        // POST_RENDER measures frames the game actually rendered after the cap.
        host.dataset.actualFps = String(Math.round(game.loop.actualFps));
        host.dataset.renderFps = String(Math.round(renderCount * 1000 / Math.max(1, now - measuredAt)));
        host.dataset.renderer = game.renderer?.type === 2 ? 'webgl' : 'canvas';
        host.dataset.canvasWidth = String(game.canvas?.width ?? 0);
        host.dataset.canvasHeight = String(game.canvas?.height ?? 0);
        host.dataset.visibility = document.visibilityState;
        renderCount = 0;
        measuredAt = now;
      }, 1000);
    }

    return () => {
      disposed = true;
      applyAudioRef.current = null;
      applyWeatherRef.current = null;
      publishPresenceRef.current = null;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener(HUB_PREFERENCES_EVENT, handleStoredPreferences);
      window.removeEventListener(AUDIO_UNLOCK_EVENT, applyAudio);
      document.removeEventListener('visibilitychange', handleVisibility);
      game.events.off('ready', bindRendererEvents);
      game.renderer?.off('losewebgl', handleContextLost);
      game.renderer?.off('restorewebgl', handleContextRestored);
      game.events.off('postrender', countRender);
      if (diagnosticsTimer !== undefined) window.clearInterval(diagnosticsTimer);
      worldAudio.stopHubAtmosphereSchedule();
      worldAudio.stopAmbient(0);
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    publishPresenceRef.current?.(stationPresence);
  }, [stationPresence]);

  return (
    <>
      <div ref={hostRef} className="world-canvas-host" role="group" tabIndex={-1}
        aria-label="Территория станции. Tab — выбор здания; Enter или пробел — перейти; Escape — закрыть описание." />
      <nav className="hub-keyboard-locations" aria-label="Здания станции">
        <span className="hub-keyboard-locations-title">Выберите здание</span>
        <PixelScrollArea label="Здания станции" className="hub-keyboard-locations__scroll" contentClassName="hub-keyboard-locations__list">
          {HUB_BUILDINGS.map((building) => (
            <button key={building.id} type="button" className="hub-keyboard-location" data-hub-building-id={building.id}
              onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })}
              onClick={() => { worldBridge.emit('hub:visit_building', building.id); hostRef.current?.focus(); }}>
              {building.name}
            </button>
          ))}
        </PixelScrollArea>
      </nav>
    </>
  );
}
