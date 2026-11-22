import Phaser from 'phaser';
import { ArchiveScene } from '../scenes/archive/ArchiveScene';
import { HubScene } from '../scenes/hub/HubScene';
import { R08PreviewScene } from '../scenes/art/R08PreviewScene';
import { worldBridge } from '../bridge/WorldBridge';
import { WORLD_LOGICAL_HEIGHT, WORLD_LOGICAL_WIDTH } from './fitLogicalViewport';
import { getWorldPixelSurface } from './worldPixelSurface';
import { R08_SOURCE_SIZE } from '../scenes/art/r08PreviewModel';
import { R08_STATION_SCALE } from '../scenes/art/r08StationLayout';

export { WORLD_LOGICAL_HEIGHT, WORLD_LOGICAL_WIDTH } from './fitLogicalViewport';

export interface CreateWorldGameOptions {
  parent: string | HTMLElement;
  transparent?: boolean;
  stationArt?: 'r08';
}

export function createWorldGame(options: CreateWorldGameOptions): Phaser.Game {
  const parent = typeof options.parent === 'string' ? document.querySelector<HTMLElement>(options.parent) : options.parent;
  const measure = () => {
    const width = parent?.clientWidth || WORLD_LOGICAL_WIDTH;
    const height = parent?.clientHeight || WORLD_LOGICAL_HEIGHT;
    const surface = getWorldPixelSurface(width, height, window.devicePixelRatio);
    if (options.stationArt !== 'r08') return surface;
    // The panorama may be wider than the screen. Bound fill work to one 2×
    // source frame while Phaser and the DOM still share the CSS projection.
    const [sourceWidth, sourceHeight] = R08_SOURCE_SIZE;
    const pixelBudget = sourceWidth * sourceHeight * R08_STATION_SCALE ** 2;
    const ratio = Math.min(surface.ratio, Math.sqrt(pixelBudget / (width * height)));
    return { width: Math.max(1, Math.floor(width * ratio)), height: Math.max(1, Math.floor(height * ratio)), ratio };
  };
  const initial = measure();
  const hub = options.stationArt === 'r08' ? new R08PreviewScene({
    station: true,
    preferences: { phase: 'day', pose: 'walk', framing: 'station', reducedMotion: false, lowPower: false },
    onStatus: ({ state, message }) => {
      if (state === 'ready') worldBridge.notifySceneReady('hub');
      if (state === 'error') worldBridge.emit('world:load_error', { scene: 'hub', message });
    },
    onTarget: () => {},
    onVisitArchive: () => {},
  }) : HubScene;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: initial.width,
    height: initial.height,
    callbacks: { preBoot: (instance) => instance.registry.set('world.pixelRatio', initial.ratio) },
    transparent: options.transparent ?? false,
    backgroundColor: '#08152f',
    // R08 entrances use DOM controls, while the panorama owns wheel and swipe gestures.
    input: options.stationArt === 'r08' ? { mouse: { preventDefaultWheel: false }, touch: { capture: false } } : undefined,
    // worldAudio owns the shared context; these scenes do not use Phaser sound.
    audio: { noAudio: true },
    fps: { target: 60, limit: 60 },
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [hub, ArchiveScene],
  });
  const resize = () => {
    if (!game.canvas) return;
    const { width, height, ratio } = measure();
    if (game.scale.width === width && game.scale.height === height && game.registry.get('world.pixelRatio') === ratio) return;
    game.registry.set('world.pixelRatio', ratio);
    game.scale.resize(width, height);
  };
  const observer = new ResizeObserver(resize);
  if (parent) observer.observe(parent);
  window.addEventListener('resize', resize);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    observer.disconnect();
    window.removeEventListener('resize', resize);
  });
  return game;
}
