import * as THREE from 'three';
import { calculateIntegerPassepartout, HUB_LOGICAL_HEIGHT, HUB_LOGICAL_WIDTH } from '../../runtime/logicalViewportMath';
import { WORLD_PALETTE } from '../../theme/tokens';
import { createHubOrthographicCamera } from './camera/createHubOrthographicCamera';
import { HUB_GEOMETRY_LOCK_V1 } from './geometryLock';
import { PixelPostPipeline, type PixelPipelineToggles } from './post/PixelPostPipeline';
import { createStyleLabScene } from './styleLab/createStyleLabScene';

export interface ThreeHubRendererOptions {
  parent: HTMLElement;
  debugGeometryLock?: boolean;
  pipelineToggles?: Partial<PixelPipelineToggles>;
}

export class ThreeHubRenderer {
  readonly canvas: HTMLCanvasElement;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = createHubOrthographicCamera();
  private readonly pipeline: PixelPostPipeline;
  private readonly parent: HTMLElement;
  private disposed = false;

  constructor(options: ThreeHubRendererOptions) {
    this.parent = options.parent;
    this.canvas = document.createElement('canvas');
    this.canvas.dataset.renderer = 'three2d';
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, {
      position: 'absolute',
      pointerEvents: 'none',
      imageRendering: 'pixelated',
      zIndex: '0',
    });

    const computedPosition = window.getComputedStyle(this.parent).position;
    if (computedPosition === 'static') this.parent.style.position = 'relative';
    this.parent.insertBefore(this.canvas, this.parent.firstChild);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(WORLD_PALETTE.skyDay1, 1);

    this.scene.background = new THREE.Color(WORLD_PALETTE.skyDay1);
    this.scene.add(createStyleLabScene(options.debugGeometryLock ?? false));

    this.pipeline = new PixelPostPipeline(
      this.renderer,
      this.scene,
      this.camera,
      HUB_GEOMETRY_LOCK_V1.internalFramebuffer.width,
      HUB_GEOMETRY_LOCK_V1.internalFramebuffer.height,
      options.pipelineToggles,
    );
  }

  resize(hostWidth: number, hostHeight: number): void {
    if (this.disposed) return;
    const fit = calculateIntegerPassepartout(hostWidth, hostHeight, HUB_LOGICAL_WIDTH, HUB_LOGICAL_HEIGHT);
    this.canvas.style.left = `${fit.viewportX}px`;
    this.canvas.style.top = `${fit.viewportY}px`;
    this.canvas.style.width = `${fit.viewportWidth}px`;
    this.canvas.style.height = `${fit.viewportHeight}px`;
  }

  setPipelineToggles(toggles: Partial<PixelPipelineToggles>): void {
    this.pipeline.setToggles(toggles);
  }

  render(): void {
    if (this.disposed) return;
    this.pipeline.render();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.pipeline.dispose();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
    this.renderer.dispose();
    this.canvas.remove();
  }
}
