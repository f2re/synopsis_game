import Phaser from 'phaser';
import { ArchiveScene } from '../scenes/archive/ArchiveScene';
import { ExperimentalHubScene } from '../scenes/hub/ExperimentalHubScene';
import {
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
} from './fitLogicalViewport';


export {
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
  LEGACY_LOGICAL_HEIGHT,
  LEGACY_LOGICAL_WIDTH,
} from './fitLogicalViewport';

export interface CreateWorldGameOptions {
  parent: string | HTMLElement;
  transparent?: boolean;
}

export function createExperimentalHubGame(options: CreateWorldGameOptions): Phaser.Game {
  const parent = typeof options.parent === 'string' ? document.querySelector<HTMLElement>(options.parent) : options.parent;
  const initialWidth = Math.max(parent?.clientWidth ?? HUB_LOGICAL_WIDTH, HUB_LOGICAL_WIDTH);
  const initialHeight = Math.max(parent?.clientHeight ?? HUB_LOGICAL_HEIGHT, HUB_LOGICAL_HEIGHT);

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: initialWidth,
    height: initialHeight,
    transparent: options.transparent ?? true,
    backgroundColor: 'rgba(0,0,0,0)',
    audio: { noAudio: true },
    fps: { target: 60, limit: 60 },
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [new ExperimentalHubScene(), ArchiveScene],
  });
}
