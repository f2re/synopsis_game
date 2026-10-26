import Phaser from 'phaser';
import { ArchiveScene } from '../scenes/archive/ArchiveScene';
import { HubScene } from '../scenes/hub/HubScene';
import { WORLD_LOGICAL_HEIGHT, WORLD_LOGICAL_WIDTH } from './fitLogicalViewport';

export { WORLD_LOGICAL_HEIGHT, WORLD_LOGICAL_WIDTH } from './fitLogicalViewport';

export interface CreateWorldGameOptions {
  parent: string | HTMLElement;
  transparent?: boolean;
}

export function createWorldGame(options: CreateWorldGameOptions): Phaser.Game {
  const parent = typeof options.parent === 'string' ? document.querySelector<HTMLElement>(options.parent) : options.parent;
  const initialWidth = Math.max(parent?.clientWidth ?? WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_WIDTH);
  const initialHeight = Math.max(parent?.clientHeight ?? WORLD_LOGICAL_HEIGHT, WORLD_LOGICAL_HEIGHT);

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: initialWidth,
    height: initialHeight,
    transparent: options.transparent ?? false,
    backgroundColor: '#08152f',
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [HubScene, ArchiveScene],
  });
}
