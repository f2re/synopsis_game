import Phaser from 'phaser';
import { R08PreviewScene, type R08PreviewSceneOptions } from '../scenes/art/R08PreviewScene';
import { type R08PreviewPreferences } from '../scenes/art/r08PreviewModel';
import { getWorldPixelSurface } from './worldPixelSurface';

export interface R08PreviewHandle {
  setPreferences: (preferences: R08PreviewPreferences) => void;
  visitArchive: () => void;
  destroy: () => void;
}

/** Dedicated, disposable game for /art/r08. It shares no Hub bridge or audio loop. */
export function createR08PreviewGame(parent: HTMLElement, options: R08PreviewSceneOptions): R08PreviewHandle {
  let disposed = false;
  let rendererReady = true;
  let boundRenderer = false;
  let preferences = { ...options.preferences };
  const measure = () => getWorldPixelSurface(parent.clientWidth || 960, parent.clientHeight || 540, window.devicePixelRatio);
  const initial = measure();
  const scene = new R08PreviewScene(options);
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: initial.width, height: initial.height,
    backgroundColor: '#102128', audio: { noAudio: true },
    fps: { target: 60, limit: preferences.lowPower ? 30 : 60 },
    render: { antialias: false, pixelArt: true, roundPixels: false },
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    callbacks: { preBoot: (instance) => instance.registry.set('r08.pixelRatio', initial.ratio) },
    scene: [scene],
  });
  const resize = () => {
    if (disposed || !game.canvas) return;
    const { width, height, ratio } = measure();
    game.registry.set('r08.pixelRatio', ratio);
    game.canvas.style.width = '100%';
    game.canvas.style.height = '100%';
    game.canvas.style.display = 'block';
    if (game.scale.width !== width || game.scale.height !== height) game.scale.resize(width, height);
  };
  const visibility = () => {
    if (disposed) return;
    const active = !document.hidden && rendererReady;
    parent.dataset.visibility = active ? 'visible' : 'paused';
    // READY is emitted just before Game.start. Never wake an unstarted TimeStep.
    if (game.isRunning) { if (active) game.loop.wake(); else game.loop.sleep(); }
    if (game.input) game.input.enabled = active;
  };
  const lost = () => { rendererReady = false; parent.dataset.context = 'lost'; visibility(); };
  const restored = () => { rendererReady = true; parent.dataset.context = 'ready'; scene.applyPreferences(preferences); resize(); visibility(); };
  const bind = () => {
    if (disposed || boundRenderer || !game.renderer) return;
    boundRenderer = true;
    game.renderer.on('losewebgl', lost);
    game.renderer.on('restorewebgl', restored);
    parent.dataset.context = 'ready';
    parent.dataset.renderer = game.renderer.type === Phaser.WEBGL ? 'webgl' : 'canvas';
    resize();
  };
  const ready = () => { bind(); queueMicrotask(() => { if (!disposed) { resize(); visibility(); } }); };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('resize', resize);
  game.events.once(Phaser.Core.Events.READY, ready);
  bind();

  return {
    setPreferences: (next) => {
      if (disposed) return;
      preferences = { ...next };
      const fpsLimit = next.lowPower ? 30 : 60;
      if (game.loop.fpsLimit !== fpsLimit) game.loop.setFPSLimit(fpsLimit);
      scene.applyPreferences(preferences);
      parent.dataset.phase = next.phase;
      parent.dataset.reducedMotion = String(next.reducedMotion);
      parent.dataset.lowPower = String(next.lowPower);
      parent.dataset.fpsLimit = String(fpsLimit);
      parent.dataset.pose = next.pose;
    },
    visitArchive: () => { if (!disposed && rendererReady && !document.hidden) game.events.emit('r08:visit-archive'); },
    destroy: () => {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
      game.events.off(Phaser.Core.Events.READY, ready);
      game.renderer?.off('losewebgl', lost);
      game.renderer?.off('restorewebgl', restored);
      game.destroy(true);
      // Phaser defers destruction to its next step; a paused preview must process it.
      if (game.isRunning && !game.loop.running) game.loop.wake();
    },
  };
}
