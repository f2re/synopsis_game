import Phaser from 'phaser';
import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  FogExp2,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  Points,
  PointsMaterial,
  RGBAFormat,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { BuildingStateId } from '../../bridge/WorldBridge';
import {
  calculateIntegerPassepartout,
  HUB_LOGICAL_HEIGHT,
  HUB_LOGICAL_WIDTH,
} from '../../runtime/fitLogicalViewport';
import type { DayPhase } from '../../scenes/hub/HubTimeOfDay';
import type { Season } from '../../scenes/hub/HubSeason';
import type { WeatherMode } from '../../scenes/hub/HubWeatherOverlay';
import { WORLD_PALETTE } from '../../theme/tokens';
import {
  HUB_BUILDING_BY_ID,
  HUB_WORLD_DEFINITION_V1,
  type HubBuildingDefinition,
  type HubPoint,
  type HubRect,
  type HubWorldDefinition,
} from '../../world/hub/HubWorldDefinition';
import { hubGroundRectObstacle } from '../../world/hub/HubCollision';
import { planHubRoute } from '../../world/hub/HubNavigation';
import { stepHubAvatarMotion } from '../../world/hub/HubAvatarMotion';
import {
  HUB_COLLISION_REVIEW_CLEARANCE,
  HUB_COLLISION_REVIEW_WORLD,
  reviewApproachForEntrance,
} from '../../world/hub/HubCollisionReviewLayout';
import { previewHubProceduralFootprints } from '../../world/hub/HubSpatialAudit';
import { geometryForStructure, type HubStructureGeometry } from '../../world/hub/HubStructureGeometry';
import { HubProjection } from './HubProjection';
import { PixelPostPipeline } from './post/PixelPostPipeline';
import { resolvePixelPostSettings } from './post/PixelPostConfig';

const INTERNAL_WIDTH = 320;
const INTERNAL_HEIGHT = 180;
const AVATAR_SPEED = 105;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeGradientMap(): DataTexture {
  const data = new Uint8Array([
    52, 52, 52, 255,
    152, 152, 152, 255,
    255, 255, 255, 255,
  ]);
  const texture = new DataTexture(data, 3, 1, RGBAFormat, UnsignedByteType);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function colorForPhase(phase: DayPhase): number {
  switch (phase) {
    case 'night': return WORLD_PALETTE.skyNight2;
    case 'twilight': return WORLD_PALETTE.skyNight4;
    case 'dawn': return WORLD_PALETTE.twilight1;
    case 'golden_hour': return WORLD_PALETTE.twilight3;
    case 'white_nights': return WORLD_PALETTE.skyNight4;
    case 'day':
    default:
      return WORLD_PALETTE.skyDay0;
  }
}

function deterministicUnit(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

interface StructureStyle extends HubStructureGeometry {
  wall: number;
  roof: number;
}

function styleForStructure(id: string): StructureStyle {
  switch (id) {
    case 'operations':
      return {
        wall: WORLD_PALETTE.stoneConcrete3,
        roof: WORLD_PALETTE.skyNight4,
        ...geometryForStructure(id),
      };
    case 'radar':
      return {
        wall: WORLD_PALETTE.stoneConcrete4,
        roof: WORLD_PALETTE.birchAndSnow2,
        ...geometryForStructure(id),
      };
    case 'cartography':
      return {
        wall: WORLD_PALETTE.birchAndSnow2,
        roof: WORLD_PALETTE.ochreTerracotta1,
        ...geometryForStructure(id),
      };
    case 'lab':
      return {
        wall: WORLD_PALETTE.stoneConcrete3,
        roof: WORLD_PALETTE.skyDay2,
        ...geometryForStructure(id),
      };
    case 'archive':
      return {
        wall: WORLD_PALETTE.ochreTerracotta3,
        roof: WORLD_PALETTE.ochreTerracotta1,
        ...geometryForStructure(id),
      };
    case 'hall':
      return {
        wall: WORLD_PALETTE.stoneConcrete3,
        roof: WORLD_PALETTE.twilight0,
        ...geometryForStructure(id),
      };
    case 'codepost':
      return {
        wall: WORLD_PALETTE.uiTeal4,
        roof: WORLD_PALETTE.stoneConcrete3,
        ...geometryForStructure(id),
      };
    case 'meteo-site':
      return {
        wall: WORLD_PALETTE.birchAndSnow3,
        roof: WORLD_PALETTE.stoneConcrete3,
        ...geometryForStructure(id),
      };
    case 'canteen':
    default:
      return {
        wall: WORLD_PALETTE.ochreTerracotta2,
        roof: WORLD_PALETTE.ochreTerracotta1,
        ...geometryForStructure(id),
      };
  }
}

export interface ThreeHubRendererOptions {
  debug?: boolean;
}

/**
 * Technical vertical slice for ADR-0007.
 *
 * The renderer intentionally uses a second, low-resolution WebGL canvas under
 * the transparent Phaser canvas for the spike. It shares Phaser's lifecycle,
 * input and WorldBridge semantics but not its WebGL context. A shared-context
 * optimisation is deferred until the visual/performance gate has evidence.
 */
export class ThreeHubRenderer {
  private readonly phaserScene: Phaser.Scene;
  private readonly host: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly projection = new HubProjection({
    logicalWidth: HUB_LOGICAL_WIDTH,
    logicalHeight: HUB_LOGICAL_HEIGHT,
  });
  private readonly pipeline: PixelPostPipeline;
  private readonly gradientMap = makeGradientMap();
  private readonly worldRoot = new Group();
  private readonly weatherGroup = new Group();
  private readonly debugGroup = new Group();
  private readonly buildingRoots: Object3D[] = [];
  private readonly buildingMaterials = new Map<string, MeshToonMaterial>();
  private readonly groundMaterial: MeshToonMaterial;
  private readonly pathMaterial: MeshToonMaterial;
  private readonly foliageMaterial: MeshToonMaterial;
  private readonly waterMaterial: MeshBasicMaterial;
  private readonly snowMaterial: MeshToonMaterial;
  private readonly windowMaterial: MeshBasicMaterial;
  private readonly avatarRoot = new Group();
  private avatarWaypoints: Vector3[] = [];
  private navigationWorld: HubWorldDefinition = HUB_WORLD_DEFINITION_V1;
  private collisionReviewEnabled = false;
  private readonly reducedMotion = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  private avatarClock = 0;
  private readonly ambientLight = new AmbientLight(0xffffff, 1.2);
  private readonly sunLight = new DirectionalLight(0xffe7c0, 1.6);
  private weatherPoints?: Points<BufferGeometry, PointsMaterial>;
  private snowGround?: Mesh<BufferGeometry, MeshToonMaterial>;
  private weatherMode: WeatherMode = 'clear';
  private season: Season = 'summer';
  private dayPhase: DayPhase = 'day';
  private resizeHandler: () => void;

  constructor(scene: Phaser.Scene, options: ThreeHubRendererOptions = {}) {
    this.phaserScene = scene;
    const host = scene.game.canvas.parentElement;
    if (!host) throw new Error('ThreeHubRenderer requires the Phaser canvas to have a host element');
    this.host = host;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hub-three2d-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';
    this.canvas.style.imageRendering = 'pixelated';

    const computedPosition = typeof window !== 'undefined' ? window.getComputedStyle(host).position : 'static';
    if (!computedPosition || computedPosition === 'static') this.host.style.position = 'relative';
    this.host.style.overflow = 'hidden';

    scene.game.canvas.style.position = 'relative';
    scene.game.canvas.style.zIndex = '1';
    scene.game.canvas.style.background = 'transparent';
    this.host.prepend(this.canvas);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: false,
      antialias: false,
      depth: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(INTERNAL_WIDTH, INTERNAL_HEIGHT, false);
    this.renderer.outputColorSpace = SRGBColorSpace;

    const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    // Opt-in review only: camera, building positions and accepted Geometry
    // Lock v1 remain unchanged in the default and production renderer.
    this.collisionReviewEnabled = query.get('hubLayout') === 'collisionReview';
    if (this.collisionReviewEnabled) {
      this.navigationWorld = HUB_COLLISION_REVIEW_WORLD;
      console.info('[synopsis/world-engine] H3D-037 unapproved collision review layout enabled');
    }
    const pixelSettings = resolvePixelPostSettings(query);
    this.pipeline = new PixelPostPipeline({
      width: INTERNAL_WIDTH,
      height: INTERNAL_HEIGHT,
      toggles: {
        palette: pixelSettings.palette,
        dither: pixelSettings.dither,
        ditherSky: pixelSettings.ditherSky,
        edges: pixelSettings.edges,
      },
      outlineStrength: pixelSettings.outlineStrength,
      ditherStrength: pixelSettings.ditherStrength,
    });

    this.groundMaterial = this.toon(WORLD_PALETTE.foliagePine2);
    this.pathMaterial = this.toon(WORLD_PALETTE.stoneConcrete3);
    this.foliageMaterial = this.toon(WORLD_PALETTE.foliagePine3);
    this.waterMaterial = new MeshBasicMaterial({ color: WORLD_PALETTE.waterGulf2 });
    this.snowMaterial = this.toon(WORLD_PALETTE.birchAndSnow3);
    this.windowMaterial = new MeshBasicMaterial({ color: WORLD_PALETTE.windowLight2 });

    this.scene.add(this.worldRoot, this.weatherGroup, this.debugGroup, this.ambientLight, this.sunLight);
    this.sunLight.position.set(-260, 520, 310);

    this.projection.assertRoundTrip([
      ...HUB_WORLD_DEFINITION_V1.buildings.map((building) => ({
        id: `${building.id}.entrance`,
        x: building.entrance.x,
        y: building.entrance.y,
      })),
      ...HUB_WORLD_DEFINITION_V1.landmarks.map((landmark) => ({
        id: landmark.id,
        x: landmark.anchor.x,
        y: landmark.anchor.y,
      })),
    ]);

    this.createVerticalSlice();
    if (options.debug || query.get('hubDebug') === '1') this.createDebugMarkers();

    this.resizeHandler = () => this.syncViewport();
    this.syncViewport();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
  }

  private toon(color: number): MeshToonMaterial {
    return new MeshToonMaterial({ color, gradientMap: this.gradientMap });
  }

  private logicalQuadGeometry(rect: HubRect, y = 0): BufferGeometry {
    const a = this.projection.logicalToGround(rect.x, rect.y);
    const b = this.projection.logicalToGround(rect.x + rect.width, rect.y);
    const c = this.projection.logicalToGround(rect.x + rect.width, rect.y + rect.height);
    const d = this.projection.logicalToGround(rect.x, rect.y + rect.height);

    const positions = new Float32Array([
      a.x, y, a.z,
      b.x, y, b.z,
      c.x, y, c.z,
      a.x, y, a.z,
      c.x, y, c.z,
      d.x, y, d.z,
    ]);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private pixelsPerWorldY(anchor: Vector3): number {
    const baseY = this.projection.groundToLogical(anchor).y;
    const oneUp = anchor.clone();
    oneUp.y += 1;
    const upY = this.projection.groundToLogical(oneUp).y;
    return Math.max(0.05, baseY - upY);
  }

  private createVerticalSlice(): void {
    this.scene.background = new Color(colorForPhase('day'));
    this.syncFog();

    const water = new Mesh(
      this.logicalQuadGeometry(HUB_WORLD_DEFINITION_V1.waterBand, -0.25),
      this.waterMaterial,
    );
    this.worldRoot.add(water);
    this.createWaterGlints();
    this.createDistantSkyline();

    const groundY = HUB_WORLD_DEFINITION_V1.waterBand.y + HUB_WORLD_DEFINITION_V1.waterBand.height;
    const groundRect = { x: 0, y: groundY, width: HUB_LOGICAL_WIDTH, height: HUB_LOGICAL_HEIGHT - groundY };
    const ground = new Mesh(this.logicalQuadGeometry(groundRect), this.groundMaterial);
    this.worldRoot.add(ground);

    const snowGround = new Mesh(this.logicalQuadGeometry(groundRect, 1.1), this.snowMaterial);
    snowGround.visible = false;
    this.snowGround = snowGround;
    this.worldRoot.add(snowGround);

    this.createPaths();

    const operations = HUB_WORLD_DEFINITION_V1.landmarks.find((item) => item.kind === 'operations');
    if (operations) {
      this.createStructure('operations', operations.bounds, operations.anchor, false);
    }

    for (const building of HUB_WORLD_DEFINITION_V1.buildings) {
      this.createBuilding(building);
    }

    this.createCentralGlobe();
    this.createTrees();
    this.createForegroundRailing();
    this.createAvatar({ x: 320, y: 316 });
    this.createWeatherParticles();
  }

  private createWaterGlints(): void {
    const material = new MeshBasicMaterial({
      color: WORLD_PALETTE.waterGulf4,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const strips = [
      { x: 82, y: 112, width: 54, height: 2 },
      { x: 224, y: 128, width: 72, height: 2 },
      { x: 360, y: 105, width: 42, height: 2 },
      { x: 468, y: 136, width: 66, height: 2 },
    ];
    for (const rect of strips) {
      this.worldRoot.add(new Mesh(this.logicalQuadGeometry(rect, 0.15), material));
    }
  }

  private createDistantSkyline(): void {
    const count = 13;
    const blocks = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      this.toon(WORLD_PALETTE.stoneConcrete2),
      count,
    );
    const transform = new Object3D();

    for (let index = 0; index < count; index += 1) {
      const centerX = 24 + index * 50 + deterministicUnit(index, 11) * 16;
      const baseY = 120 + deterministicUnit(index, 12) * 6;
      const widthPx = 22 + deterministicUnit(index, 13) * 24;
      const heightPx = 8 + deterministicUnit(index, 14) * 18;
      const base = this.projection.logicalToGround(centerX, baseY);
      const left = this.projection.logicalToGround(centerX - widthPx / 2, baseY);
      const right = this.projection.logicalToGround(centerX + widthPx / 2, baseY);
      const width = left.distanceTo(right);
      const height = heightPx / this.pixelsPerWorldY(base);

      transform.position.set(base.x, height / 2, base.z);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(width, height, 7);
      transform.updateMatrix();
      blocks.setMatrixAt(index, transform.matrix);
    }

    blocks.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(blocks);
  }

  private createPaths(): void {
    const segments: { from: HubPoint; to: HubPoint; width: number }[] = [];
    for (const path of this.navigationWorld.paths) {
      for (let index = 0; index < path.points.length - 1; index += 1) {
        segments.push({ from: path.points[index], to: path.points[index + 1], width: path.width });
      }
    }

    const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), this.pathMaterial, segments.length);
    const transform = new Object3D();
    segments.forEach((segment, index) => {
      const start = this.projection.logicalToGround(segment.from.x, segment.from.y);
      const end = this.projection.logicalToGround(segment.to.x, segment.to.y);
      const center = start.clone().add(end).multiplyScalar(0.5);
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);

      transform.position.set(center.x, 0.7, center.z);
      transform.rotation.set(0, -Math.atan2(dz, dx), 0);
      transform.scale.set(length, 1.3, Math.max(segment.width, 5));
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(mesh);
  }

  private createBuilding(building: HubBuildingDefinition): void {
    this.createStructure(building.id, building.bounds, building.entrance, true);
  }

  private createStructure(
    id: string,
    bounds: HubRect,
    entrance: HubPoint,
    interactive: boolean,
  ): void {
    const style = styleForStructure(id);
    const centerX = bounds.x + bounds.width / 2;
    const baseY = entrance.y;
    const depthPx = Math.min(style.depthPx, Math.max(8, bounds.height * 0.28));
    const centerLogicalY = baseY - depthPx / 2;
    const center = this.projection.logicalToGround(centerX, centerLogicalY);
    const front = this.projection.logicalToGround(centerX, baseY);
    const back = this.projection.logicalToGround(centerX, baseY - depthPx);
    const left = this.projection.logicalToGround(centerX - (bounds.width * style.widthRatio) / 2, centerLogicalY);
    const right = this.projection.logicalToGround(centerX + (bounds.width * style.widthRatio) / 2, centerLogicalY);
    const width = Math.max(18, left.distanceTo(right));
    const depth = Math.max(12, front.distanceTo(back));
    const bodyTopLogicalY = bounds.y + style.roofPx;
    const bodyScreenPixels = Math.max(18, centerLogicalY - bodyTopLogicalY);
    const height = bodyScreenPixels / this.pixelsPerWorldY(center);

    const wallMaterial = this.toon(style.wall);
    const roofMaterial = this.toon(style.roof);
    if (interactive) this.buildingMaterials.set(id, wallMaterial);

    const root = new Group();
    if (interactive) root.userData.buildingId = id;
    root.position.copy(center);

    const body = new Mesh(new BoxGeometry(width, height, depth), wallMaterial);
    body.position.y = height / 2;
    if (interactive) body.userData.buildingId = id;
    root.add(body);

    const roofHeight = Math.max(4, style.roofPx / this.pixelsPerWorldY(center));
    if (style.roofMode === 'flat') {
      const roof = new Mesh(new BoxGeometry(width * 1.04, Math.max(3, roofHeight * 0.28), depth * 1.05), roofMaterial);
      roof.position.y = height + Math.max(1.5, roofHeight * 0.14);
      if (interactive) roof.userData.buildingId = id;
      root.add(roof);
    } else if (style.roofMode === 'dome') {
      const radius = Math.max(9, Math.min(width * 0.32, depth * 0.62));
      const dome = new Mesh(new SphereGeometry(radius, 8, 5), roofMaterial);
      dome.scale.y = clamp(roofHeight / (radius * 1.7), 0.55, 1.15);
      dome.position.y = height + radius * dome.scale.y * 0.72;
      if (interactive) dome.userData.buildingId = id;
      root.add(dome);
    } else {
      const roof = new Mesh(new ConeGeometry(Math.max(width, depth) * 0.48, roofHeight, 4), roofMaterial);
      roof.position.y = height + roofHeight / 2;
      roof.rotation.y = Math.PI / 4;
      if (interactive) roof.userData.buildingId = id;
      root.add(roof);
    }

    const frontZ = front.z - center.z;
    const windowCount = Math.max(1, style.windowCount);
    const windowWidth = clamp(width / (windowCount * 3.0), 5, 14);
    const windowHeight = clamp(height * 0.18, 5, 16);
    const windows = new InstancedMesh(
      new BoxGeometry(windowWidth, windowHeight, 2.1),
      this.windowMaterial,
      windowCount,
    );
    if (interactive) windows.userData.buildingId = id;
    const windowTransform = new Object3D();
    for (let index = 0; index < windowCount; index += 1) {
      const t = windowCount === 1 ? 0.5 : index / (windowCount - 1);
      const x = -width * 0.34 + t * width * 0.68;
      windowTransform.position.set(x, height * 0.52, frontZ);
      windowTransform.rotation.set(0, 0, 0);
      windowTransform.scale.set(1, 1, 1);
      windowTransform.updateMatrix();
      windows.setMatrixAt(index, windowTransform.matrix);
    }
    windows.instanceMatrix.needsUpdate = true;
    root.add(windows);

    this.worldRoot.add(root);
    if (interactive) this.buildingRoots.push(root);
  }

  private createCentralGlobe(): void {
    const landmark = HUB_WORLD_DEFINITION_V1.landmarks.find((item) => item.kind === 'central-globe');
    if (!landmark) return;

    const base = this.projection.logicalToGround(landmark.anchor.x, landmark.anchor.y);
    const root = new Group();
    root.position.copy(base);

    const pedestal = new Mesh(
      new CylinderGeometry(10, 14, 15, 8),
      this.toon(WORLD_PALETTE.stoneConcrete2),
    );
    pedestal.position.y = 7.5;
    root.add(pedestal);

    const globe = new Mesh(
      new SphereGeometry(17, 8, 6),
      this.toon(WORLD_PALETTE.waterGulf4),
    );
    globe.position.y = 32;
    globe.rotation.y = 0.4;
    root.add(globe);
    this.worldRoot.add(root);
  }

  private createTrees(): void {
    const anchors = Object.entries(HUB_WORLD_DEFINITION_V1.environmentAnchors)
      .filter(([id]) => id.startsWith('tree.'))
      .map(([, anchor]) => anchor);
    if (anchors.length === 0) return;

    const trunkMaterial = this.toon(WORLD_PALETTE.ochreTerracotta0);
    const trunks = new InstancedMesh(new CylinderGeometry(3.7, 5.2, 24, 6), trunkMaterial, anchors.length);
    const lowerCrowns = new InstancedMesh(new ConeGeometry(18, 34, 7), this.foliageMaterial, anchors.length);
    const upperCrowns = new InstancedMesh(new ConeGeometry(13, 29, 7), this.foliageMaterial, anchors.length);
    const transform = new Object3D();

    anchors.forEach((anchor, index) => {
      const base = this.projection.logicalToGround(anchor.x, anchor.y);
      const scale = clamp(0.68 + ((anchor.y - 170) / 190) * 0.52, 0.62, 1.18);

      transform.rotation.set(0, 0, 0);
      transform.scale.set(scale, scale, scale);

      transform.position.set(base.x, 12 * scale, base.z);
      transform.updateMatrix();
      trunks.setMatrixAt(index, transform.matrix);

      transform.position.set(base.x, 33 * scale, base.z);
      transform.updateMatrix();
      lowerCrowns.setMatrixAt(index, transform.matrix);

      transform.position.set(base.x, 50 * scale, base.z);
      transform.updateMatrix();
      upperCrowns.setMatrixAt(index, transform.matrix);
    });

    trunks.instanceMatrix.needsUpdate = true;
    lowerCrowns.instanceMatrix.needsUpdate = true;
    upperCrowns.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(trunks, lowerCrowns, upperCrowns);
  }

  private createForegroundRailing(): void {
    const start = this.projection.logicalToGround(18, 334);
    const end = this.projection.logicalToGround(622, 334);
    const center = start.clone().add(end).multiplyScalar(0.5);
    const length = start.distanceTo(end);
    const material = this.toon(WORLD_PALETTE.stoneConcrete1);

    const topRail = new Mesh(new BoxGeometry(length, 3.2, 4.2), material);
    topRail.position.set(center.x, 24, center.z);
    this.worldRoot.add(topRail);

    const lowerRail = new Mesh(new BoxGeometry(length, 2.4, 3.6), material);
    lowerRail.position.set(center.x, 11, center.z);
    this.worldRoot.add(lowerRail);

    const posts = new InstancedMesh(new BoxGeometry(4, 28, 4), material, 9);
    const postTransform = new Object3D();
    for (let index = 0; index <= 8; index += 1) {
      const t = index / 8;
      const x = start.x + (end.x - start.x) * t;
      const z = start.z + (end.z - start.z) * t;
      postTransform.position.set(x, 14, z);
      postTransform.rotation.set(0, 0, 0);
      postTransform.scale.set(1, 1, 1);
      postTransform.updateMatrix();
      posts.setMatrixAt(index, postTransform.matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    this.worldRoot.add(posts);
  }

  private createAvatar(anchor: HubPoint): void {
    const base = this.projection.logicalToGround(anchor.x, anchor.y);
    this.avatarRoot.position.copy(base);

    const coat = this.toon(WORLD_PALETTE.uiTeal3);
    const dark = this.toon(WORLD_PALETTE.inkTelecode0);
    const skin = this.toon(WORLD_PALETTE.ochreTerracotta3);

    const body = new Mesh(new BoxGeometry(11, 18, 7), coat);
    body.position.y = 21;
    const head = new Mesh(new BoxGeometry(9, 9, 9), skin);
    head.position.y = 34;
    const leftLeg = new Mesh(new BoxGeometry(3.5, 11, 4.5), dark);
    leftLeg.position.set(-3, 6, 0);
    const rightLeg = new Mesh(new BoxGeometry(3.5, 11, 4.5), dark);
    rightLeg.position.set(3, 6, 0);

    this.avatarRoot.add(body, head, leftLeg, rightLeg);
    this.worldRoot.add(this.avatarRoot);
  }

  private createWeatherParticles(): void {
    const count = 170;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const logicalX = deterministicUnit(index, 1) * HUB_LOGICAL_WIDTH;
      const logicalY = 72 + deterministicUnit(index, 2) * 288;
      const ground = this.projection.logicalToGround(logicalX, logicalY);
      positions[index * 3] = ground.x;
      positions[index * 3 + 1] = 30 + deterministicUnit(index, 3) * 260;
      positions[index * 3 + 2] = ground.z;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: WORLD_PALETTE.skyDay2,
      size: 1.7,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      depthTest: false,
    });
    const points = new Points(geometry, material);
    points.visible = false;
    this.weatherPoints = points;
    this.weatherGroup.add(points);
  }

  private createDebugMarkers(): void {
    const markerMaterial = new MeshBasicMaterial({ color: WORLD_PALETTE.actionAccent1 });
    for (const building of HUB_WORLD_DEFINITION_V1.buildings) {
      const ground = this.projection.logicalToGround(building.entrance.x, building.entrance.y);
      const marker = new Mesh(new BoxGeometry(5, 5, 5), markerMaterial);
      marker.position.set(ground.x, 2.5, ground.z);
      this.debugGroup.add(marker);
    }
  }

  setDayPhase(phase: DayPhase): void {
    this.dayPhase = phase;
    this.scene.background = new Color(colorForPhase(phase));
    this.sunLight.color.setHex(0xffe7c0);

    switch (phase) {
      case 'night':
        this.ambientLight.intensity = 0.9;
        this.sunLight.intensity = 0.48;
        this.windowMaterial.color.setHex(WORLD_PALETTE.windowLight3);
        break;
      case 'twilight':
      case 'white_nights':
        this.ambientLight.intensity = 0.86;
        this.sunLight.intensity = 0.72;
        this.windowMaterial.color.setHex(WORLD_PALETTE.windowLight2);
        break;
      case 'golden_hour':
        this.ambientLight.intensity = 1.02;
        this.sunLight.intensity = 1.28;
        this.sunLight.color.setHex(WORLD_PALETTE.windowLight3);
        this.windowMaterial.color.setHex(WORLD_PALETTE.windowLight2);
        break;
      default:
        this.ambientLight.intensity = 1.2;
        this.sunLight.intensity = 1.6;
        this.windowMaterial.color.setHex(WORLD_PALETTE.windowLight1);
        break;
    }
    this.syncFog();
  }

  setSeason(season: Season): void {
    this.season = season;
    this.applySeasonMaterials();
  }

  setWeather(mode: WeatherMode): void {
    this.weatherMode = mode;
    const points = this.weatherPoints;
    if (points) {
      points.visible = mode === 'rain' || mode === 'snow';
      points.material.color.setHex(mode === 'snow' ? WORLD_PALETTE.birchAndSnow3 : WORLD_PALETTE.skyDay2);
      points.material.size = mode === 'snow' ? 2.4 : 1.15;
      points.material.opacity = mode === 'snow' ? 0.9 : 0.64;
    }
    this.applySeasonMaterials();
    this.syncFog();
  }

  private applySeasonMaterials(): void {
    switch (this.season) {
      case 'spring':
        this.foliageMaterial.color.setHex(WORLD_PALETTE.foliagePine4);
        this.groundMaterial.color.setHex(WORLD_PALETTE.foliagePine2);
        break;
      case 'autumn':
        this.foliageMaterial.color.setHex(WORLD_PALETTE.ochreTerracotta2);
        this.groundMaterial.color.setHex(WORLD_PALETTE.foliagePine1);
        break;
      case 'winter':
        this.foliageMaterial.color.setHex(WORLD_PALETTE.foliagePine1);
        this.groundMaterial.color.setHex(WORLD_PALETTE.stoneConcrete2);
        break;
      case 'summer':
      default:
        this.foliageMaterial.color.setHex(WORLD_PALETTE.foliagePine3);
        this.groundMaterial.color.setHex(WORLD_PALETTE.foliagePine2);
        break;
    }
    if (this.weatherMode === 'rain') {
      this.groundMaterial.color.setHex(WORLD_PALETTE.foliagePine1);
    }
    this.syncSnowVisibility();
  }

  private syncFog(): void {
    if (this.weatherMode === 'fog') {
      const color = this.dayPhase === 'night' ? WORLD_PALETTE.skyNight4 : WORLD_PALETTE.skyDay2;
      this.scene.fog = new FogExp2(color, 0.00255);
      return;
    }
    if (this.weatherMode === 'rain') {
      this.scene.fog = new FogExp2(WORLD_PALETTE.skyNight4, 0.00135);
      return;
    }
    if (this.dayPhase === 'night') {
      this.scene.fog = new FogExp2(WORLD_PALETTE.skyNight3, 0.00095);
      return;
    }
    this.scene.fog = new FogExp2(WORLD_PALETTE.skyDay2, 0.00055);
  }

  private syncSnowVisibility(): void {
    if (this.snowGround) this.snowGround.visible = this.season === 'winter' || this.weatherMode === 'snow';
  }

  setBuildingStates(states: Record<string, BuildingStateId>): void {
    for (const id of Object.keys(states)) {
      const material = this.buildingMaterials.get(id);
      if (!material) continue;
      // Progression is semantic state, not an alternate facade texture/material.
      // Keep the canonical architecture readable; a dedicated accent/emissive
      // channel will communicate locked/active/unlocked without repainting it.
      material.color.setHex(styleForStructure(id).wall);
    }
  }

  /** In the opt-in collision-review mode the dossier opens after arrival. */
  get isArrivalGated(): boolean {
    return this.collisionReviewEnabled;
  }

  get isAvatarMoving(): boolean {
    return this.avatarWaypoints.length > 0;
  }

  /** Returns the status for a discrete user request; never emits game events. */
  walkAvatarTo(logicalX: number, logicalY: number): 'moving' | 'arrived' | 'unreachable' {
    // The navigation authority lives in canonical 640×360 logical coordinates.
    // Never project the avatar's animated vertical bob as the navigation origin.
    const groundPosition = this.avatarRoot.position.clone();
    groundPosition.y = 0;
    const current = this.projection.groundToLogical(groundPosition);
    const goal = this.collisionReviewEnabled
      ? reviewApproachForEntrance({ x: logicalX, y: logicalY })
      : { x: logicalX, y: logicalY };
    const obstacles = [hubGroundRectObstacle('hub-water', this.navigationWorld.waterBand)];
    if (this.collisionReviewEnabled) {
      // These procedural footprints are activated ONLY for the explicit
      // unapproved review variant, where paths and entrances are rerouted.
      obstacles.push(...previewHubProceduralFootprints(this.navigationWorld));
    }
    const route = planHubRoute(
      this.navigationWorld.paths,
      { x: current.x, y: current.y },
      goal,
      {
        obstacles,
        clearance: this.collisionReviewEnabled ? HUB_COLLISION_REVIEW_CLEARANCE : 2,
      },
    );
    if (!route) {
      this.avatarWaypoints = [];
      console.warn('[synopsis/world-engine] Hub destination is not connected to an approved path');
      return 'unreachable';
    }

    // The planned geometry is validated even for reduced-motion users.
    // Only the *visual interpolation* is omitted; no unsafe free-space route
    // is accepted and the logical destination remains the same.
    if (this.reducedMotion) {
      const destination = route[route.length - 1];
      this.avatarRoot.position.copy(this.projection.logicalToGround(destination.x, destination.y));
      this.avatarWaypoints = [];
      return 'arrived';
    }

    this.avatarWaypoints = route.slice(1).map((point) => this.projection.logicalToGround(point.x, point.y));
    return this.avatarWaypoints.length > 0 ? 'moving' : 'arrived';
  }

  /**
   * Read-only browser QA coordinates, available only with the explicit
   * ?hubE2E=1 switch. Mouse input itself is NOT synthesized here: the CI
   * runner sends real Chrome DevTools mouse events to the Phaser canvas.
   * This method discovers visible pixels without guessing facade locations.
   */
  getBrowserSmokeTargets(): ReadonlyArray<{
    id: string;
    logicalX: number;
    logicalY: number;
    clientX: number;
    clientY: number;
  }> {
    if (typeof window === 'undefined' ||
        new URLSearchParams(window.location.search).get('hubE2E') !== '1') return [];

    // The observer is installed during Phaser.create(), before the first
    // Three.js render tick. Update transforms explicitly; otherwise Raycaster
    // tests uninitialized group matrices and finds no visible building.
    this.scene.updateMatrixWorld(true);
    const cam = this.phaserScene.cameras.main;
    const rect = this.phaserScene.game.canvas.getBoundingClientRect();
    const viewportW = Math.max(this.phaserScene.scale.width, 1);
    const viewportH = Math.max(this.phaserScene.scale.height, 1);
    const targets: { id: string; logicalX: number; logicalY: number; clientX: number; clientY: number }[] = [];

    for (const building of HUB_WORLD_DEFINITION_V1.buildings) {
      const samples: { x: number; y: number; rank: number }[] = [];
      for (let ix = 1; ix <= 9; ix += 1) {
        for (let iy = 1; iy <= 9; iy += 1) {
          const x = building.bounds.x + building.bounds.width * ix / 10;
          const y = building.bounds.y + building.bounds.height * iy / 10;
          const rank = Math.hypot(ix - 5, iy - 5);
          samples.push({ x, y, rank });
        }
      }
      samples.sort((a, b) => a.rank - b.rank);
      for (const p of samples) {
        if (this.pickBuilding(p.x, p.y) !== building.id) continue;
        const localX = cam.x + (p.x - cam.scrollX) * cam.zoom;
        const localY = cam.y + (p.y - cam.scrollY) * cam.zoom;
        targets.push({
          id: building.id,
          logicalX: p.x,
          logicalY: p.y,
          clientX: rect.left + localX * rect.width / viewportW,
          clientY: rect.top + localY * rect.height / viewportH,
        });
        break;
      }
    }
    return targets;
  }

  pickBuilding(logicalX: number, logicalY: number): string | undefined {
    const intersections = this.projection.rayFromLogical(logicalX, logicalY).intersectObjects(this.buildingRoots, true);
    for (const hit of intersections) {
      let object: Object3D | null = hit.object;
      while (object) {
        const buildingId = object.userData.buildingId;
        if (typeof buildingId === 'string') return buildingId;
        object = object.parent;
      }
    }
    return undefined;
  }

  update(deltaMs: number): void {
    const deltaSec = Math.min(deltaMs, 100) / 1000;
    this.avatarClock += deltaSec;

    // Step in the world ground plane via a renderer-independent, tested
    // distance budget; the cosmetic hop is never part of collision geometry.
    const motion = stepHubAvatarMotion(
      { x: this.avatarRoot.position.x, z: this.avatarRoot.position.z },
      this.avatarWaypoints,
      AVATAR_SPEED * deltaSec,
    );
    this.avatarRoot.position.x = motion.position.x;
    this.avatarRoot.position.z = motion.position.z;
    if (motion.headingRadians !== null) this.avatarRoot.rotation.y = motion.headingRadians;
    if (motion.completedWaypoints > 0) this.avatarWaypoints.splice(0, motion.completedWaypoints);

    this.avatarRoot.position.y = this.avatarWaypoints.length > 0 ? Math.abs(Math.sin(this.avatarClock * 18)) * 1.4 : 0;
    this.updateWeather(deltaSec);
    this.pipeline.render(this.renderer, this.scene, this.projection.camera, [this.weatherGroup, this.debugGroup]);
  }

  private updateWeather(deltaSec: number): void {
    const points = this.weatherPoints;
    if (!points?.visible) return;
    const position = points.geometry.getAttribute('position') as BufferAttribute;
    const fallSpeed = this.weatherMode === 'snow' ? 34 : 190;
    for (let index = 0; index < position.count; index += 1) {
      let y = position.getY(index) - fallSpeed * deltaSec;
      if (y < 2) y = 270 + deterministicUnit(index, 8) * 90;
      position.setY(index, y);
      if (this.weatherMode === 'snow') {
        position.setX(index, position.getX(index) + Math.sin(this.avatarClock + index) * deltaSec * 2.2);
      }
    }
    position.needsUpdate = true;
  }

  private syncViewport(): void {
    const fit = calculateIntegerPassepartout(
      Math.max(this.phaserScene.scale.width, 1),
      Math.max(this.phaserScene.scale.height, 1),
      HUB_LOGICAL_WIDTH,
      HUB_LOGICAL_HEIGHT,
    );
    this.canvas.style.left = `${fit.viewportX}px`;
    this.canvas.style.top = `${fit.viewportY}px`;
    this.canvas.style.width = `${fit.viewportWidth}px`;
    this.canvas.style.height = `${fit.viewportHeight}px`;
  }

  destroy(): void {
    this.phaserScene.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<MeshToonMaterial | MeshBasicMaterial | PointsMaterial>();
    this.scene.traverse((object: Object3D) => {
      if (object instanceof Mesh || object instanceof Points) {
        geometries.add(object.geometry as BufferGeometry);
        const material = object.material;
        if (Array.isArray(material)) material.forEach((item) => materials.add(item as MeshToonMaterial));
        else materials.add(material as MeshToonMaterial);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.gradientMap.dispose();
    this.pipeline.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
