import Phaser from 'phaser';
import { ArchiveScene } from '../scenes/archive/ArchiveScene';
import { HubScene } from '../scenes/hub/HubScene';

export const WORLD_LOGICAL_WIDTH = 480;
export const WORLD_LOGICAL_HEIGHT = 270;

export interface CreateWorldGameOptions {
  parent: string | HTMLElement;
  transparent?: boolean;
}

export function createWorldGame(options: CreateWorldGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: WORLD_LOGICAL_WIDTH,
    height: WORLD_LOGICAL_HEIGHT,
    transparent: options.transparent ?? false,
    backgroundColor: '#8ec9e5',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_LOGICAL_WIDTH,
      height: WORLD_LOGICAL_HEIGHT,
    },
    scene: [HubScene, ArchiveScene],
  });
}
