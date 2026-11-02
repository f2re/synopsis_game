import Phaser from 'phaser';
import { worldBridge } from '../../bridge/WorldBridge';
import {
  bindLogicalViewport,
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
} from '../../runtime/fitLogicalViewport';
import { ThreeHubRenderer } from '../../renderer/three/ThreeHubRenderer';
import type { PixelPipelineToggles } from '../../renderer/three/post/PixelPostPipeline';

export interface ThreeHubProbeSceneOptions {
  debugGeometryLock?: boolean;
  pipelineToggles?: Partial<PixelPipelineToggles>;
}

/**
 * R1 technical-spike scene. It keeps Phaser as lifecycle owner while delegating
 * only world rendering to a sibling Three.js canvas. No gameplay semantics are
 * moved into Three.js here.
 */
export class ThreeHubProbeScene extends Phaser.Scene {
  private readonly options: ThreeHubProbeSceneOptions;
  private threeRenderer?: ThreeHubRenderer;
  private resizeHandler?: () => void;

  constructor(options: ThreeHubProbeSceneOptions = {}) {
    super('hub');
    this.options = options;
  }

  create(): void {
    bindLogicalViewport(this, HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT, { backgroundColor: null });

    const parent = this.game.canvas.parentElement;
    if (!parent) {
      throw new Error('ThreeHubProbeScene requires the Phaser canvas to have a parent element.');
    }

    Object.assign(this.game.canvas.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '1',
      pointerEvents: 'auto',
    });

    this.threeRenderer = new ThreeHubRenderer({
      parent,
      debugGeometryLock: this.options.debugGeometryLock,
      pipelineToggles: this.options.pipelineToggles,
    });

    this.resizeHandler = () => {
      this.threeRenderer?.resize(Math.max(this.scale.width, 1), Math.max(this.scale.height, 1));
    };
    this.resizeHandler();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);

    worldBridge.notifySceneReady('hub');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup();
    });
  }

  override update(): void {
    this.threeRenderer?.render();
  }

  private cleanup(): void {
    if (this.resizeHandler) {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
      this.resizeHandler = undefined;
    }
    this.threeRenderer?.dispose();
    this.threeRenderer = undefined;
  }
}
