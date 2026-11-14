import Phaser from 'phaser';
import { ArchiveScene } from '../scenes/archive/ArchiveScene';
import { HubScene } from '../scenes/hub/HubScene';
import { WORLD_LOGICAL_HEIGHT, WORLD_LOGICAL_WIDTH } from './fitLogicalViewport';
import { getWorldPixelSurface } from './worldPixelSurface';

export { WORLD_LOGICAL_HEIGHT, WORLD_LOGICAL_WIDTH } from './fitLogicalViewport';

export interface CreateWorldGameOptions {
  parent: string | HTMLElement;
  transparent?: boolean;
}

export function createWorldGame(options: CreateWorldGameOptions): Phaser.Game {
  const parent = typeof options.parent === 'string' ? document.querySelector<HTMLElement>(options.parent) : options.parent;
  const measure = () => getWorldPixelSurface(parent?.clientWidth ?? WORLD_LOGICAL_WIDTH,
    parent?.clientHeight ?? WORLD_LOGICAL_HEIGHT, window.devicePixelRatio);
  const initial = measure();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: initial.width,
    height: initial.height,
    callbacks: { preBoot: (instance) => instance.registry.set('world.pixelRatio', initial.ratio) },
    transparent: options.transparent ?? false,
    backgroundColor: '#08152f',
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
    scene: [HubScene, ArchiveScene],
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
