import Phaser from 'phaser';
import { ArchiveScene } from '../scenes/archive/ArchiveScene';
import { HubScene } from '../scenes/hub/HubScene';
import { ThreeHubProbeScene } from '../scenes/hub/ThreeHubProbeScene';
import type { PixelPipelineToggles } from '../renderer/three/post/PixelPostPipeline';
import {
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
} from './fitLogicalViewport';

export {
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
  WORLD_LOGICAL_WIDTH,
} from './fitLogicalViewport';

export type HubRendererMode = 'legacy2d' | 'three2d';

export interface CreateWorldGameOptions {
  parent: string | HTMLElement;
  transparent?: boolean;
  hubRenderer?: HubRendererMode;
  hubDebugGeometryLock?: boolean;
  hubPipelineToggles?: Partial<PixelPipelineToggles>;
}

export function createWorldGame(options: CreateWorldGameOptions): Phaser.Game {
  const hubRenderer = options.hubRenderer ?? 'legacy2d';
  const logicalWidth = hubRenderer === 'three2d' ? HUB_LOGICAL_WIDTH : WORLD_LOGICAL_WIDTH;
  const logicalHeight = hubRenderer === 'three2d' ? HUB_LOGICAL_HEIGHT : WORLD_LOGICAL_HEIGHT;
  const parent = typeof options.parent === 'string' ? document.querySelector<HTMLElement>(options.parent) : options.parent;
  const initialWidth = Math.max(parent?.clientWidth ?? logicalWidth, logicalWidth);
  const initialHeight = Math.max(parent?.clientHeight ?? logicalHeight, logicalHeight);

  const scenes = hubRenderer === 'three2d'
    ? [new ThreeHubProbeScene({
        debugGeometryLock: options.hubDebugGeometryLock,
        pipelineToggles: options.hubPipelineToggles,
      }), ArchiveScene]
    : [HubScene, ArchiveScene];

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: initialWidth,
    height: initialHeight,
    transparent: options.transparent ?? hubRenderer === 'three2d',
    backgroundColor: '#08152f',
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: scenes,
  });
}
