import { useEffect, useRef, useState } from 'react';
import {
  createWorldGame,
  normalizeWorldPreferences,
  worldAudio,
  worldBridge,
  type WorldInteractionTarget,
  type WorldUiPreferences,
} from '@synopsis/world-engine';
import { readHubPreferences, HUB_PREFERENCES_EVENT } from '../features/hub/hubPreferences';
import { getSettings } from '../features/settings/settingsStore';
import { useAmbientWeather } from '../features/atmosphere/AtmosphereProvider';
import { AUDIO_UNLOCK_EVENT, isAudioUnlocked } from '../features/atmosphere/audioGate';

/** The world contains campus NPCs only; the account portrait belongs to React. */
export function WorldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [targets, setTargets] = useState<WorldInteractionTarget[]>([]);
  const weather = useAmbientWeather();
  const weatherRef = useRef(weather);
  const applyAudioRef = useRef<(() => void) | null>(null);
  weatherRef.current = weather;

  useEffect(() => { applyAudioRef.current?.(); }, [weather]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let preferences = normalizeWorldPreferences(readHubPreferences());
    let modalOpen = false;
    let rendererReady = true;
    let activeScene = 'hub';
    let disposed = false;
    worldAudio.setMuted(!preferences.soundEnabled || !isAudioUnlocked() || document.hidden);
    const game = createWorldGame({ parent: host });

    const applyInput = () => {
      game.registry.set('ui.modal_open', modalOpen);
      if (game.input) game.input.enabled = !modalOpen && !document.hidden && rendererReady;
      for (const scene of game.scene.getScenes(true)) {
        scene.input.enabled = !modalOpen && !document.hidden && rendererReady;
        if (scene.input.keyboard) scene.input.keyboard.enabled = !modalOpen && !document.hidden && rendererReady;
      }
    };

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
      applyAudio();
      worldBridge.emit('world:preferences_applied', { ...preferences, fpsLimit });
    };

    const unsubscribers = [
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
        if (scene !== 'hub') setTargets([]);
      }),
      worldBridge.on<Record<string, unknown>>('world:characters_ready', (diagnostic) => {
        host.dataset.characters = JSON.stringify(diagnostic);
      }),
      worldBridge.on<WorldInteractionTarget[]>('world:interaction_layout', (layout) => {
        if (!disposed) setTargets(layout);
      }),
      worldBridge.on<{lightingMode: string; phase: string}>('world:environment_mode', (environment) => {
        host.dataset.lightingMode = environment.lightingMode;
        host.dataset.phase = environment.phase;
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
      applyAudio();
    };
    const handleContextLost = () => { rendererReady = false; host.dataset.context = 'lost'; handleVisibility(); };
    const handleContextRestored = () => {
      rendererReady = true;
      host.dataset.context = 'ready';
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

  return (
    <div className="world-canvas-host" role="group" aria-label="Территория станции. Tab — выбор здания; Enter или пробел — открыть описание.">
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      {targets.map((target) => (
        <button
          key={target.id}
          type="button"
          aria-label={`${target.label}. ${target.state === 'locked' ? 'Модуль готовится' : 'Открыть'}`}
          title={target.label}
          data-building-id={target.id}
          onFocus={() => worldBridge.emit('ui:focus_building', { buildingId: target.id })}
          onBlur={() => worldBridge.emit('ui:focus_building', { buildingId: null })}
          onPointerEnter={() => worldBridge.emit('ui:focus_building', { buildingId: target.id })}
          onPointerLeave={() => worldBridge.emit('ui:focus_building', { buildingId: null })}
          onClick={() => worldBridge.notifyBuildingClicked(target.id)}
          style={{
            position: 'absolute', left: target.x, top: target.y,
            width: target.width, height: target.height,
            padding: 0, margin: 0, border: 0, outline: 'none',
            background: 'transparent', color: 'transparent', cursor: 'pointer', zIndex: 2,
          }}
        />
      ))}
    </div>
  );
}
