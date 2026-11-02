import * as THREE from 'three';

export interface PixelPipelineToggles {
  palette: boolean;
  dithering: boolean;
  edges: boolean;
}

export const DEFAULT_PIXEL_PIPELINE_TOGGLES: PixelPipelineToggles = {
  palette: true,
  dithering: true,
  edges: true,
};

const WORLD_PALETTE = [
  0x070d1e, 0x0e1a35, 0x18284d, 0x263b66,
  0x5e8fc4, 0x8db7de, 0xc4ddf0, 0x0b2236,
  0x22566f, 0x3e7c93, 0x0f241b, 0x2a5638,
  0x3f7546, 0x6a9a55, 0x2d323c, 0x464c58,
  0x656c78, 0x8d939c, 0xb9bdc2, 0x6b3a2c,
  0x9a5838, 0xc98a4e, 0xe6c07a, 0xffc768,
].map((hex) => new THREE.Color(hex));

const postVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const postFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uBeauty;
  uniform sampler2D uNormal;
  uniform sampler2D uDepth;
  uniform vec2 uInternalSize;
  uniform vec3 uPalette[24];
  uniform bool uPaletteEnabled;
  uniform bool uDitherEnabled;
  uniform bool uEdgesEnabled;
  varying vec2 vUv;

  float bayer4(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    float x = q.x;
    float y = q.y;
    float index = 0.0;

    if (y < 1.0) {
      if (x < 1.0) index = 0.0;
      else if (x < 2.0) index = 8.0;
      else if (x < 3.0) index = 2.0;
      else index = 10.0;
    } else if (y < 2.0) {
      if (x < 1.0) index = 12.0;
      else if (x < 2.0) index = 4.0;
      else if (x < 3.0) index = 14.0;
      else index = 6.0;
    } else if (y < 3.0) {
      if (x < 1.0) index = 3.0;
      else if (x < 2.0) index = 11.0;
      else if (x < 3.0) index = 1.0;
      else index = 9.0;
    } else {
      if (x < 1.0) index = 15.0;
      else if (x < 2.0) index = 7.0;
      else if (x < 3.0) index = 13.0;
      else index = 5.0;
    }
    return (index + 0.5) / 16.0 - 0.5;
  }

  vec3 nearestPalette(vec3 color) {
    vec3 best = uPalette[0];
    float bestDistance = dot(color - best, color - best);
    for (int i = 1; i < 24; i++) {
      vec3 candidate = uPalette[i];
      float d = dot(color - candidate, color - candidate);
      if (d < bestDistance) {
        bestDistance = d;
        best = candidate;
      }
    }
    return best;
  }

  float edgeStrength(vec2 uv) {
    vec2 texel = 1.0 / uInternalSize;
    float centerDepth = texture2D(uDepth, uv).r;
    vec3 centerNormal = texture2D(uNormal, uv).xyz;

    float depthEdge = 0.0;
    float normalEdge = 0.0;
    vec2 offsets[4];
    offsets[0] = vec2(texel.x, 0.0);
    offsets[1] = vec2(-texel.x, 0.0);
    offsets[2] = vec2(0.0, texel.y);
    offsets[3] = vec2(0.0, -texel.y);

    for (int i = 0; i < 4; i++) {
      float sampleDepth = texture2D(uDepth, uv + offsets[i]).r;
      vec3 sampleNormal = texture2D(uNormal, uv + offsets[i]).xyz;
      depthEdge = max(depthEdge, abs(centerDepth - sampleDepth));
      normalEdge = max(normalEdge, length(centerNormal - sampleNormal));
    }

    return max(step(0.0025, depthEdge), step(0.22, normalEdge));
  }

  void main() {
    vec3 color = texture2D(uBeauty, vUv).rgb;
    vec2 internalPixel = floor(vUv * uInternalSize);

    if (uDitherEnabled) {
      color += vec3(bayer4(internalPixel) * 0.035);
    }
    if (uPaletteEnabled) {
      color = nearestPalette(clamp(color, 0.0, 1.0));
    }
    if (uEdgesEnabled && edgeStrength(vUv) > 0.5) {
      color = uPalette[0];
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export class PixelPostPipeline {
  readonly internalWidth: number;
  readonly internalHeight: number;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly beautyTarget: THREE.WebGLRenderTarget;
  private readonly normalTarget: THREE.WebGLRenderTarget;
  private readonly normalMaterial = new THREE.MeshNormalMaterial();
  private readonly postScene = new THREE.Scene();
  private readonly postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly postMaterial: THREE.ShaderMaterial;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    internalWidth = 320,
    internalHeight = 180,
    toggles: Partial<PixelPipelineToggles> = {},
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.internalWidth = internalWidth;
    this.internalHeight = internalHeight;

    this.beautyTarget = new THREE.WebGLRenderTarget(internalWidth, internalHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    this.beautyTarget.depthTexture = new THREE.DepthTexture(internalWidth, internalHeight, THREE.UnsignedIntType);

    this.normalTarget = new THREE.WebGLRenderTarget(internalWidth, internalHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });

    this.postMaterial = new THREE.ShaderMaterial({
      vertexShader: postVertexShader,
      fragmentShader: postFragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uBeauty: { value: this.beautyTarget.texture },
        uNormal: { value: this.normalTarget.texture },
        uDepth: { value: this.beautyTarget.depthTexture },
        uInternalSize: { value: new THREE.Vector2(internalWidth, internalHeight) },
        uPalette: { value: WORLD_PALETTE },
        uPaletteEnabled: { value: toggles.palette ?? DEFAULT_PIXEL_PIPELINE_TOGGLES.palette },
        uDitherEnabled: { value: toggles.dithering ?? DEFAULT_PIXEL_PIPELINE_TOGGLES.dithering },
        uEdgesEnabled: { value: toggles.edges ?? DEFAULT_PIXEL_PIPELINE_TOGGLES.edges },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
    quad.frustumCulled = false;
    this.postScene.add(quad);
  }

  setToggles(toggles: Partial<PixelPipelineToggles>): void {
    if (toggles.palette !== undefined) this.postMaterial.uniforms.uPaletteEnabled.value = toggles.palette;
    if (toggles.dithering !== undefined) this.postMaterial.uniforms.uDitherEnabled.value = toggles.dithering;
    if (toggles.edges !== undefined) this.postMaterial.uniforms.uEdgesEnabled.value = toggles.edges;
  }

  render(): void {
    const previousTarget = this.renderer.getRenderTarget();
    const previousOverride = this.scene.overrideMaterial;

    this.scene.overrideMaterial = null;
    this.renderer.setRenderTarget(this.beautyTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.scene.overrideMaterial = this.normalMaterial;
    this.renderer.setRenderTarget(this.normalTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.scene.overrideMaterial = previousOverride;
    this.renderer.setRenderTarget(previousTarget);
    this.renderer.render(this.postScene, this.postCamera);
  }

  dispose(): void {
    this.beautyTarget.dispose();
    this.normalTarget.dispose();
    this.normalMaterial.dispose();
    this.postMaterial.dispose();
    for (const child of this.postScene.children) {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    }
  }
}
