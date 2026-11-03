import Phaser from 'phaser';
import { ArchiveScene } from '../scenes/archive/ArchiveScene';
import { HubScene } from '../scenes/hub/HubScene';
import {
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
} from './fitLogicalViewport';
import { isThreeHubRenderer, resolveHubRendererMode, type HubRendererMode } from './hubRendererMode';

export {
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
  LEGACY_LOGICAL_HEIGHT,
  LEGACY_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
} from './fitLogicalViewport';
export { resolveHubRendererMode, isThreeHubRenderer, type HubRendererMode } from './hubRendererMode';

export interface CreateWorldGameOptions {
  parent: string | HTMLElement;
  transparent?: boolean;
  hubRenderer?: HubRendererMode;
}

export function createWorldGame(options: CreateWorldGameOptions): Phaser.Game {
  const parent = typeof options.parent === 'string' ? document.querySelector<HTMLElement>(options.parent) : options.parent;
  const rendererMode = options.hubRenderer ?? resolveHubRendererMode();
  const threeHub = isThreeHubRenderer(rendererMode);
  const minimumWidth = threeHub ? HUB_LOGICAL_WIDTH : WORLD_LOGICAL_WIDTH;
  const minimumHeight = threeHub ? HUB_LOGICAL_HEIGHT : WORLD_LOGICAL_HEIGHT;
  const initialWidth = Math.max(parent?.clientWidth ?? minimumWidth, minimumWidth);
  const initialHeight = Math.max(parent?.clientHeight ?? minimumHeight, minimumHeight);

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: initialWidth,
    height: initialHeight,
    transparent: options.transparent ?? threeHub,
    backgroundColor: threeHub ? 'rgba(0,0,0,0)' : '#08152f',
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
