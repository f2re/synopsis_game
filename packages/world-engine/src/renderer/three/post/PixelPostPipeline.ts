import {
  Color,
  DepthTexture,
  Mesh,
  MeshNormalMaterial,
  NearestFilter,
  NoBlending,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  UnsignedShortType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { WORLD_PALETTE } from '../../../theme/tokens';

export interface PixelPipelineToggles {
  palette: boolean;
  dither: boolean;
  edges: boolean;
}

export interface PixelPostPipelineOptions {
  width?: number;
  height?: number;
  toggles?: Partial<PixelPipelineToggles>;
  outlineStrength?: number;
  ditherStrength?: number;
}

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 180;

const PALETTE_NUMBERS = [
  WORLD_PALETTE.skyNight0,
  WORLD_PALETTE.skyNight2,
  WORLD_PALETTE.skyNight3,
  WORLD_PALETTE.skyNight4,
  WORLD_PALETTE.twilight0,
  WORLD_PALETTE.skyDay0,
  WORLD_PALETTE.skyDay1,
  WORLD_PALETTE.skyDay2,
  WORLD_PALETTE.waterGulf1,
  WORLD_PALETTE.waterGulf2,
  WORLD_PALETTE.waterGulf3,
  WORLD_PALETTE.waterGulf4,
  WORLD_PALETTE.foliagePine1,
  WORLD_PALETTE.foliagePine3,
  WORLD_PALETTE.stoneConcrete1,
  WORLD_PALETTE.stoneConcrete3,
  WORLD_PALETTE.birchAndSnow2,
  WORLD_PALETTE.ochreTerracotta1,
  WORLD_PALETTE.ochreTerracotta3,
  WORLD_PALETTE.windowLight2,
] as const;

function paletteVectors(): Vector3[] {
  return PALETTE_NUMBERS.map((value) => {
    const color = new Color(value);
    return new Vector3(color.r, color.g, color.b);
  });
}

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D tBeauty;
  uniform sampler2D tDepth;
  uniform sampler2D tNormal;
  uniform vec2 uResolution;
  uniform vec3 uPalette[20];
  uniform bool uPaletteEnabled;
  uniform bool uDitherEnabled;
  uniform bool uEdgesEnabled;
  uniform float uOutlineStrength;
  uniform float uDitherStrength;

  float bayer4(vec2 fragCoord) {
    float x = mod(floor(fragCoord.x), 4.0);
    float y = mod(floor(fragCoord.y), 4.0);

    if (y < 1.0) {
      if (x < 1.0) return 0.0 / 16.0;
      if (x < 2.0) return 8.0 / 16.0;
      if (x < 3.0) return 2.0 / 16.0;
      return 10.0 / 16.0;
    }
    if (y < 2.0) {
      if (x < 1.0) return 12.0 / 16.0;
      if (x < 2.0) return 4.0 / 16.0;
      if (x < 3.0) return 14.0 / 16.0;
      return 6.0 / 16.0;
    }
    if (y < 3.0) {
      if (x < 1.0) return 3.0 / 16.0;
      if (x < 2.0) return 11.0 / 16.0;
      if (x < 3.0) return 1.0 / 16.0;
      return 9.0 / 16.0;
    }

    if (x < 1.0) return 15.0 / 16.0;
    if (x < 2.0) return 7.0 / 16.0;
    if (x < 3.0) return 13.0 / 16.0;
    return 5.0 / 16.0;
  }

  vec3 nearestPalette(vec3 color) {
    vec3 best = uPalette[0];
    float bestDistance = dot(color - best, color - best);

    for (int i = 1; i < 20; i++) {
      vec3 candidate = uPalette[i];
      float distanceToCandidate = dot(color - candidate, color - candidate);
      if (distanceToCandidate < bestDistance) {
        bestDistance = distanceToCandidate;
        best = candidate;
      }
    }

    return best;
  }

  float edgeMask() {
    vec2 texel = 1.0 / uResolution;
    float centerDepth = texture2D(tDepth, vUv).r;
    float depthX = texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r;
    float depthY = texture2D(tDepth, vUv + vec2(0.0, texel.y)).r;
    float depthDelta = max(abs(centerDepth - depthX), abs(centerDepth - depthY));

    vec3 centerNormal = texture2D(tNormal, vUv).rgb;
    vec3 normalX = texture2D(tNormal, vUv + vec2(texel.x, 0.0)).rgb;
    vec3 normalY = texture2D(tNormal, vUv + vec2(0.0, texel.y)).rgb;
    float normalDelta = max(length(centerNormal - normalX), length(centerNormal - normalY));

    float depthEdge = smoothstep(0.0021, 0.0048, depthDelta);
    float normalEdge = smoothstep(0.30, 0.52, normalDelta);
    return clamp(max(depthEdge, normalEdge), 0.0, 1.0);
  }

  void main() {
    vec4 source = texture2D(tBeauty, vUv);
    float sourceDepth = texture2D(tDepth, vUv).r;
    vec3 color = source.rgb;

    // The scene background contains no geometry and therefore keeps depth at
    // the far plane. Grade only those pixels: this creates a reusable sky
    // depth band from the current phase colour without another raster asset.
    if (sourceDepth > 0.9995) {
      float horizonLift = 1.0 - smoothstep(0.74, 0.98, vUv.y);
      vec3 skyTop = color * 0.76;
      vec3 skyHorizon = min(color * 1.16 + vec3(0.030, 0.020, 0.012), vec3(1.0));
      color = mix(skyTop, skyHorizon, horizonLift);
    }

    if (uDitherEnabled) {
      float dither = bayer4(gl_FragCoord.xy) - 0.5;
      color = clamp(color + dither * uDitherStrength, 0.0, 1.0);
    }

    if (uPaletteEnabled) {
      color = nearestPalette(color);
    }

    if (uEdgesEnabled) {
      float edge = edgeMask();
      color = mix(color, uPalette[0], edge * uOutlineStrength);
    }

    gl_FragColor = vec4(color, source.a);
  }
`;

/**
 * Fixed-resolution post stack for the Hub 2.5D renderer.
 * The output drawing buffer stays low-resolution; CSS performs the final
 * nearest-neighbour upscale to the scene viewport.
 */
export class PixelPostPipeline {
  readonly width: number;
  readonly height: number;

  private readonly beautyTarget: WebGLRenderTarget;
  private readonly normalTarget: WebGLRenderTarget;
  private readonly normalMaterial = new MeshNormalMaterial({ blending: NoBlending });
  private readonly postScene = new Scene();
  private readonly postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: ShaderMaterial;
  private readonly quad: Mesh<PlaneGeometry, ShaderMaterial>;

  constructor(options: PixelPostPipelineOptions = {}) {
    this.width = options.width ?? DEFAULT_WIDTH;
    this.height = options.height ?? DEFAULT_HEIGHT;

    this.beautyTarget = new WebGLRenderTarget(this.width, this.height, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: true,
    });
    this.beautyTarget.depthTexture = new DepthTexture(this.width, this.height, UnsignedShortType);

    this.normalTarget = new WebGLRenderTarget(this.width, this.height, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: true,
    });

    const toggles: PixelPipelineToggles = {
      palette: options.toggles?.palette ?? true,
      dither: options.toggles?.dither ?? false,
      edges: options.toggles?.edges ?? true,
    };

    this.material = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tBeauty: { value: this.beautyTarget.texture },
        tDepth: { value: this.beautyTarget.depthTexture },
        tNormal: { value: this.normalTarget.texture },
        uResolution: { value: new Vector2(this.width, this.height) },
        uPalette: { value: paletteVectors() },
        uPaletteEnabled: { value: toggles.palette },
        uDitherEnabled: { value: toggles.dither },
        uEdgesEnabled: { value: toggles.edges },
        uOutlineStrength: { value: Number.isFinite(options.outlineStrength) ? Math.min(0.75, Math.max(0, options.outlineStrength!)) : 0.52 },
        uDitherStrength: { value: Number.isFinite(options.ditherStrength) ? Math.min(0.05, Math.max(0, options.ditherStrength!)) : 0.028 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });

    this.quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    this.postScene.add(this.quad);
  }

  setToggles(toggles: Partial<PixelPipelineToggles>): void {
    if (typeof toggles.palette === 'boolean') this.material.uniforms.uPaletteEnabled.value = toggles.palette;
    if (typeof toggles.dither === 'boolean') this.material.uniforms.uDitherEnabled.value = toggles.dither;
    if (typeof toggles.edges === 'boolean') this.material.uniforms.uEdgesEnabled.value = toggles.edges;
  }

  render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: OrthographicCamera,
    excludeFromNormalPass: readonly Object3D[] = [],
  ): void {
    const previousVisibility = excludeFromNormalPass.map((object) => object.visible);
    const previousOverride = scene.overrideMaterial;
    const previousTarget = renderer.getRenderTarget();

    // An interrupted normal pass must never leave precipitation hidden,
    // overrideMaterial attached, or an offscreen target bound for Phaser.
    try {
      excludeFromNormalPass.forEach((object) => {
        object.visible = false;
      });
      scene.overrideMaterial = this.normalMaterial;
      renderer.setRenderTarget(this.normalTarget);
      renderer.clear();
      renderer.render(scene, camera);

      scene.overrideMaterial = previousOverride;
      excludeFromNormalPass.forEach((object, index) => {
        object.visible = previousVisibility[index];
      });

      renderer.setRenderTarget(this.beautyTarget);
      renderer.clear();
      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(this.postScene, this.postCamera);
    } finally {
      scene.overrideMaterial = previousOverride;
      excludeFromNormalPass.forEach((object, index) => {
        object.visible = previousVisibility[index];
      });
      renderer.setRenderTarget(previousTarget);
    }
  }

  dispose(): void {
    this.beautyTarget.depthTexture?.dispose();
    this.beautyTarget.dispose();
    this.normalTarget.dispose();
    this.normalMaterial.dispose();
    this.quad.geometry.dispose();
    this.material.dispose();
  }
}
