import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { AvatarProfile } from '../api';
import {
  createWorldGame,
  normalizeWorldPreferences,
  worldAudio,
  worldBridge,
  type WorldInteractionTarget,
  type WorldAvatarCommand,
  type WorldAvatarNavigationState,
  type WorldUiPreferences,
} from '@synopsis/world-engine';
import { readHubPreferences, HUB_PREFERENCES_EVENT } from '../features/hub/hubPreferences';
import './world-avatar.css';

const INITIAL_NAVIGATION: WorldAvatarNavigationState = { ready: false, acceptedActions: [], requestedAction: 'idle', paused: false, moving: false };
const STEP_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', ц: 'up', ы: 'down', ф: 'left', в: 'right' } as const;

export function WorldCanvas({ avatar }: { avatar?: AvatarProfile }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [targets, setTargets] = useState<WorldInteractionTarget[]>([]);
  const [navigation, setNavigation] = useState(INITIAL_NAVIGATION);
  const [controlsOpen, setControlsOpen] = useState(false);
  const controlsRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    worldBridge.setAvatarPresentation(avatar);
    setControlsOpen(false);
  }, [avatar]);

  useEffect(() => {
    worldBridge.emit<WorldAvatarCommand>('ui:avatar_command', { kind: 'controls', open: controlsOpen });
  }, [controlsOpen]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let preferences = normalizeWorldPreferences(readHubPreferences());
    let modalOpen = false;
    let rendererReady = true;
    let activeScene = 'hub';
    let disposed = false;
    worldAudio.setMuted(!preferences.soundEnabled);
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
      const audible = preferences.soundEnabled && !document.hidden && rendererReady;
      worldAudio.setMuted(!audible);
      worldAudio.setReducedSensory(preferences.reducedMotion);
      worldAudio.setLowPower(preferences.lowPower);
      host.dataset.soundMuted = String(worldAudio.isMuted());
      if (!audible) {
        worldAudio.stopHubAtmosphereSchedule();
        worldAudio.stopAmbient(150);
        return;
      }
      if (activeScene === 'archive') worldAudio.playArchiveAmbient(450);
      else worldAudio.playHubOutdoorAmbient(false, 450);
      if (preferences.reducedMotion || preferences.lowPower || activeScene !== 'hub') {
        worldAudio.stopHubAtmosphereSchedule();
      } else worldAudio.startHubAtmosphereSchedule();
    };

    const applyPreferences = (value: unknown) => {
      const next = normalizeWorldPreferences(value);
      const audioChanged = next.soundEnabled !== preferences.soundEnabled ||
        next.reducedMotion !== preferences.reducedMotion || next.lowPower !== preferences.lowPower;
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
      if (audioChanged) applyAudio();
      worldBridge.emit('world:preferences_applied', { ...preferences, fpsLimit });
    };

    const unsubscribers = [
      worldBridge.on('world:start_shift', () => {
        window.dispatchEvent(new CustomEvent('hub:start-shift'));
      }),
      worldBridge.on<WorldUiPreferences>('ui:preferences', applyPreferences),
      worldBridge.on<boolean>('ui:modal_open', (open) => {
        modalOpen = open === true;
        if (modalOpen) setControlsOpen(false);
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
        if (scene !== 'hub') { setTargets([]); setControlsOpen(false); setNavigation(INITIAL_NAVIGATION); }
      }),
      worldBridge.on<Record<string, unknown>>('world:characters_ready', (diagnostic) => {
        host.dataset.characters = JSON.stringify(diagnostic);
      }),
      worldBridge.on<Record<string, unknown>>('world:avatar_ready', (diagnostic) => {
        host.dataset.avatar = JSON.stringify(diagnostic);
      }),
      worldBridge.on<WorldAvatarNavigationState>('world:avatar_navigation', (state) => {
        if (!disposed) setNavigation(state);
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
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener(HUB_PREFERENCES_EVENT, handleStoredPreferences);
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

  const canWalk = navigation.ready && navigation.acceptedActions.includes('walk');
  const canInspect = navigation.ready && navigation.acceptedActions.includes('inspect');
  const command = (value: WorldAvatarCommand) => worldBridge.emit('ui:avatar_command', value);
  const handleMovementKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (!controlsOpen || navigation.paused || event.altKey || event.ctrlKey || event.metaKey) return;
    const direction = STEP_KEYS[event.key as keyof typeof STEP_KEYS] ?? STEP_KEYS[event.key.toLowerCase() as keyof typeof STEP_KEYS];
    if (direction && canWalk) {
      event.preventDefault();
      if (!event.repeat) command({ kind: 'step', direction });
    } else if (['e', 'у'].includes(event.key.toLowerCase()) && canInspect) {
      event.preventDefault();
      if (!event.repeat) command({ kind: 'inspect' });
    } else if (event.key === 'Escape') {
      event.preventDefault(); setControlsOpen(false); controlsRef.current?.focus();
    }
  };

  return (
    <div className="world-canvas-host" role="group" aria-label="Интерактивный кампус. Tab — выбор здания; Enter или пробел — открыть описание."
      onPointerDown={(event) => {
        if (!controlsOpen || !canWalk || navigation.paused || event.button !== 0 || !(event.target instanceof HTMLCanvasElement)) return;
        const box = hostRef.current?.getBoundingClientRect();
        if (box) command({ kind: 'point', x: event.clientX - box.left, y: event.clientY - box.top });
      }}>
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
      {(canWalk || canInspect) && <aside className="campus-avatar-controls" aria-label="Управление персонажем" onKeyDown={handleMovementKeys}>
        <button ref={controlsRef} type="button" className="campus-avatar-controls__toggle" aria-expanded={controlsOpen}
          aria-controls="campus-avatar-movement" disabled={navigation.paused} onClick={() => setControlsOpen((open) => !open)}>
          {controlsOpen ? 'Закрыть управление' : canWalk ? 'Прогулка по площади' : 'Осмотр персонажа'}
        </button>
        {controlsOpen && <div id="campus-avatar-movement" className="campus-avatar-controls__body">
          {canWalk && <div className="campus-avatar-controls__directions" role="group" aria-label="Шаг по дорожке">
            {([['left', '←', 'Влево по дорожке'], ['up', '↑', 'Вверх по дорожке'], ['down', '↓', 'Вниз по дорожке'], ['right', '→', 'Вправо по дорожке']] as const).map(([direction, icon, label]) =>
              <button key={direction} type="button" disabled={navigation.paused} aria-label={label} onClick={() => command({ kind: 'step', direction })}>{icon}</button>)}
          </div>}
          <div className="campus-avatar-controls__actions">
            {canInspect && <button type="button" disabled={navigation.paused} onClick={() => command({ kind: 'inspect' })}>Осмотр</button>}
            <button type="button" disabled={navigation.paused} onClick={() => command({ kind: 'stop' })}>Стоп</button>
          </div>
          <p>{canWalk ? 'Стрелки / WASD — по дорожке. Клик по дорожке — к точке.' : 'Осмотр — одно движение.'}{canInspect ? ' E — осмотр.' : ''}</p>
          <span className="campus-avatar-controls__state" role="status">{navigation.moving ? 'Идёт по площади' : navigation.requestedAction === 'inspect' ? 'Осмотр' : 'Стойка'}</span>
        </div>}
      </aside>}
    </div>
  );
}
