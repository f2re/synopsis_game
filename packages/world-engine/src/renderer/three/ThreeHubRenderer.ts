/// <reference path="./three-poc.d.ts" />
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
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  Points,
  PointsMaterial,
  RGBAFormat,
  Scene,
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
  type HubPoint,
  type HubRect,
} from '../../world/hub/HubWorldDefinition';
import { HubProjection } from './HubProjection';
import { PixelPostPipeline } from './post/PixelPostPipeline';

const INTERNAL_WIDTH = 320;
const INTERNAL_HEIGHT = 180;
const AVATAR_SPEED = 105;

function makeGradientMap(): DataTexture {
  const data = new Uint8Array([
    48, 48, 48, 255,
    148, 148, 148, 255,
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
    case 'night': return WORLD_PALETTE.skyNight0;
    case 'twilight': return WORLD_PALETTE.twilight0;
    case 'dawn': return WORLD_PALETTE.twilight3;
    case 'golden_hour': return WORLD_PALETTE.twilight4;
    case 'white_nights': return WORLD_PALETTE.skyNight4;
    case 'day':
    default:
      return WORLD_PALETTE.skyDay1;
  }
}

function deterministicUnit(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
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
  private readonly waterMaterial: MeshToonMaterial;
  private readonly snowMaterial: MeshToonMaterial;
  private readonly windowMaterial: MeshBasicMaterial;
  private readonly avatarRoot = new Group();
  private readonly avatarTarget = new Vector3();
  private avatarHasTarget = false;
  private avatarClock = 0;
  private readonly ambientLight = new AmbientLight(0xffffff, 1.15);
  private readonly sunLight = new DirectionalLight(0xffe7c0, 1.7);
  private weatherPoints?: Points<BufferGeometry, PointsMaterial>;
  private snowGround?: Mesh<BufferGeometry, MeshToonMaterial>;
  private weatherMode: WeatherMode = 'clear';
  private season: Season = 'summer';
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
    this.pipeline = new PixelPostPipeline({
      width: INTERNAL_WIDTH,
      height: INTERNAL_HEIGHT,
      toggles: {
        palette: query.get('pixelPalette') !== '0',
        dither: query.get('pixelDither') !== '0',
        edges: query.get('pixelEdges') !== '0',
      },
    });

    this.groundMaterial = this.toon(WORLD_PALETTE.foliagePine2);
    this.pathMaterial = this.toon(WORLD_PALETTE.stoneConcrete2);
    this.foliageMaterial = this.toon(WORLD_PALETTE.foliagePine3);
    this.waterMaterial = this.toon(WORLD_PALETTE.waterGulf2);
    this.snowMaterial = this.toon(WORLD_PALETTE.birchAndSnow3);
    this.windowMaterial = new MeshBasicMaterial({ color: WORLD_PALETTE.windowLight2 });

    this.scene.add(this.worldRoot, this.weatherGroup, this.debugGroup, this.ambientLight, this.sunLight);
    this.sunLight.position.set(-240, 520, 280);

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

  private createVerticalSlice(): void {
    const sky = colorForPhase('day');
    this.scene.background = new Color(sky);
    this.scene.fog = new FogExp2(WORLD_PALETTE.skyDay2, 0.0009);

    const water = new Mesh(
      this.logicalQuadGeometry({ x: 0, y: HUB_WORLD_DEFINITION_V1.waterlineY, width: 640, height: 40 }),
      this.waterMaterial,
    );
    water.position.y = -0.2;
    this.worldRoot.add(water);

    const ground = new Mesh(
      this.logicalQuadGeometry({ x: 0, y: 205, width: 640, height: 155 }),
      this.groundMaterial,
    );
    this.worldRoot.add(ground);

    const snowGround = new Mesh(
      this.logicalQuadGeometry({ x: 0, y: 205, width: 640, height: 155 }, 1.1),
      this.snowMaterial,
    );
    snowGround.visible = false;
    this.snowGround = snowGround;
    this.worldRoot.add(snowGround);

    for (const path of HUB_WORLD_DEFINITION_V1.paths) {
      for (let index = 0; index < path.points.length - 1; index += 1) {
        this.createPathSegment(path.points[index], path.points[index + 1], path.width);
      }
    }

    const codepost = HUB_BUILDING_BY_ID.get('codepost');
    if (codepost) this.createBuildingBlock(codepost.id, codepost.bounds, codepost.entrance);

    this.createTree({ x: 151, y: 260 });
    this.createAvatar({ x: 322, y: 315 });
    this.createWeatherParticles();
  }

  private createPathSegment(from: HubPoint, to: HubPoint, width: number): void {
    const start = this.projection.logicalToGround(from.x, from.y);
    const end = this.projection.logicalToGround(to.x, to.y);
    const center = start.clone().add(end).multiplyScalar(0.5);
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const mesh = new Mesh(new BoxGeometry(length, 1.4, Math.max(width, 5)), this.pathMaterial);
    mesh.position.set(center.x, 0.7, center.z);
    mesh.rotation.y = -Math.atan2(dz, dx);
    this.worldRoot.add(mesh);
  }

  private createBuildingBlock(id: string, bounds: HubRect, entrance: HubPoint): void {
    const left = this.projection.logicalToGround(bounds.x, entrance.y);
    const right = this.projection.logicalToGround(bounds.x + bounds.width, entrance.y);
    const front = this.projection.logicalToGround(entrance.x, entrance.y);
    const back = this.projection.logicalToGround(entrance.x, entrance.y - 31);
    const width = Math.max(50, left.distanceTo(right));
    const depth = Math.max(30, front.distanceTo(back));
    const center = front.clone().add(back).multiplyScalar(0.5);
    const height = 92;

    const material = this.toon(WORLD_PALETTE.ochreTerracotta2);
    this.buildingMaterials.set(id, material);

    const root = new Group();
    root.userData.buildingId = id;
    root.position.set(center.x, 0, center.z);

    const body = new Mesh(new BoxGeometry(width, height, depth), material);
    body.position.y = height / 2;
    body.userData.buildingId = id;
    root.add(body);

    const roof = new Mesh(
      new ConeGeometry(Math.max(width, depth) * 0.63, 34, 4),
      this.toon(WORLD_PALETTE.ochreTerracotta0),
    );
    roof.position.y = height + 17;
    roof.rotation.y = Math.PI / 4;
    roof.userData.buildingId = id;
    root.add(roof);

    const frontZ = front.z - center.z;
    for (const offset of [-0.23, 0.23]) {
      const windowMesh = new Mesh(new BoxGeometry(18, 20, 2.5), this.windowMaterial);
      windowMesh.position.set(width * offset, 48, frontZ);
      windowMesh.userData.buildingId = id;
      root.add(windowMesh);
    }

    this.worldRoot.add(root);
    this.buildingRoots.push(root);
  }

  private createTree(anchor: HubPoint): void {
    const base = this.projection.logicalToGround(anchor.x, anchor.y);
    const root = new Group();
    root.position.copy(base);

    const trunk = new Mesh(
      new CylinderGeometry(4.5, 6, 28, 6),
      this.toon(WORLD_PALETTE.ochreTerracotta0),
    );
    trunk.position.y = 14;
    root.add(trunk);

    const crown = new Mesh(new ConeGeometry(22, 46, 7), this.foliageMaterial);
    crown.position.y = 49;
    root.add(crown);
    this.worldRoot.add(root);
  }

  private createAvatar(anchor: HubPoint): void {
    const base = this.projection.logicalToGround(anchor.x, anchor.y);
    this.avatarRoot.position.copy(base);

    const coat = this.toon(WORLD_PALETTE.uiTeal3);
    const dark = this.toon(WORLD_PALETTE.inkTelecode0);
    const skin = this.toon(WORLD_PALETTE.ochreTerracotta3);

    const body = new Mesh(new BoxGeometry(13, 21, 8), coat);
    body.position.y = 24;
    const head = new Mesh(new BoxGeometry(10, 10, 10), skin);
    head.position.y = 40;
    const leftLeg = new Mesh(new BoxGeometry(4, 13, 5), dark);
    leftLeg.position.set(-3.5, 7, 0);
    const rightLeg = new Mesh(new BoxGeometry(4, 13, 5), dark);
    rightLeg.position.set(3.5, 7, 0);

    this.avatarRoot.add(body, head, leftLeg, rightLeg);
    this.worldRoot.add(this.avatarRoot);
  }

  private createWeatherParticles(): void {
    const count = 220;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const logicalX = deterministicUnit(i, 1) * HUB_LOGICAL_WIDTH;
      const logicalY = 180 + deterministicUnit(i, 2) * 180;
      const ground = this.projection.logicalToGround(logicalX, logicalY);
      positions[i * 3] = ground.x;
      positions[i * 3 + 1] = 35 + deterministicUnit(i, 3) * 300;
      positions[i * 3 + 2] = ground.z;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: WORLD_PALETTE.skyDay2,
      size: 2.0,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
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
    this.scene.background = new Color(colorForPhase(phase));
    this.sunLight.color.setHex(0xffe7c0);

    switch (phase) {
      case 'night':
        this.ambientLight.intensity = 0.48;
        this.sunLight.intensity = 0.24;
        this.windowMaterial.color.setHex(WORLD_PALETTE.windowLight3);
        break;
      case 'twilight':
      case 'white_nights':
        this.ambientLight.intensity = 0.72;
        this.sunLight.intensity = 0.65;
        this.windowMaterial.color.setHex(WORLD_PALETTE.windowLight2);
        break;
      case 'golden_hour':
        this.ambientLight.intensity = 1.0;
        this.sunLight.intensity = 1.35;
        this.sunLight.color.setHex(WORLD_PALETTE.windowLight3);
        break;
      default:
        this.ambientLight.intensity = 1.15;
        this.sunLight.intensity = 1.7;
        this.sunLight.color.setHex(0xffe7c0);
        this.windowMaterial.color.setHex(WORLD_PALETTE.windowLight1);
        break;
    }
  }

  setSeason(season: Season): void {
    this.season = season;
    switch (season) {
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
    this.syncSnowVisibility();
  }

  setWeather(mode: WeatherMode): void {
    this.weatherMode = mode;
    const points = this.weatherPoints;
    if (points) {
      points.visible = mode === 'rain' || mode === 'snow';
      points.material.color.setHex(mode === 'snow' ? WORLD_PALETTE.birchAndSnow3 : WORLD_PALETTE.skyDay2);
      points.material.size = mode === 'snow' ? 2.8 : 1.4;
      points.material.opacity = mode === 'snow' ? 0.92 : 0.72;
    }

    if (mode === 'fog') this.scene.fog = new FogExp2(WORLD_PALETTE.skyDay2, 0.0042);
    else if (mode === 'rain') this.scene.fog = new FogExp2(WORLD_PALETTE.skyNight4, 0.0019);
    else this.scene.fog = new FogExp2(WORLD_PALETTE.skyDay2, 0.0009);

    if (mode === 'rain') this.groundMaterial.color.setHex(WORLD_PALETTE.foliagePine1);
    else this.setSeason(this.season);
    this.syncSnowVisibility();
  }

  private syncSnowVisibility(): void {
    if (this.snowGround) this.snowGround.visible = this.season === 'winter' || this.weatherMode === 'snow';
  }

  setBuildingStates(states: Record<string, BuildingStateId>): void {
    for (const [id, state] of Object.entries(states)) {
      const material = this.buildingMaterials.get(id);
      if (!material) continue;
      switch (state) {
        case 'locked':
          material.color.setHex(WORLD_PALETTE.stoneConcrete1);
          break;
        case 'active':
          material.color.setHex(WORLD_PALETTE.ochreTerracotta3);
          break;
        case 'just_unlocked':
          material.color.setHex(WORLD_PALETTE.foliagePine4);
          break;
        case 'available':
        default:
          material.color.setHex(WORLD_PALETTE.ochreTerracotta2);
          break;
      }
    }
  }

  walkAvatarTo(logicalX: number, logicalY: number): void {
    this.projection.logicalToGround(logicalX, logicalY, this.avatarTarget);
    this.avatarHasTarget = true;
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

    if (this.avatarHasTarget) {
      const delta = this.avatarTarget.clone().sub(this.avatarRoot.position);
      delta.y = 0;
      const distance = delta.length();
      if (distance < 1.5) {
        this.avatarRoot.position.x = this.avatarTarget.x;
        this.avatarRoot.position.z = this.avatarTarget.z;
        this.avatarHasTarget = false;
      } else {
        const step = Math.min(distance, AVATAR_SPEED * deltaSec);
        delta.normalize().multiplyScalar(step);
        this.avatarRoot.position.add(delta);
        this.avatarRoot.rotation.y = Math.atan2(delta.x, delta.z);
      }
    }

    this.avatarRoot.position.y = this.avatarHasTarget ? Math.abs(Math.sin(this.avatarClock * 18)) * 1.6 : 0;
    this.updateWeather(deltaSec);
    this.pipeline.render(this.renderer, this.scene, this.projection.camera, [this.weatherGroup, this.debugGroup]);
  }

  private updateWeather(deltaSec: number): void {
    const points = this.weatherPoints;
    if (!points?.visible) return;
    const position = points.geometry.getAttribute('position') as BufferAttribute;
    const fallSpeed = this.weatherMode === 'snow' ? 36 : 210;
    for (let index = 0; index < position.count; index += 1) {
      let y = position.getY(index) - fallSpeed * deltaSec;
      if (y < 2) y = 280 + deterministicUnit(index, 8) * 90;
      position.setY(index, y);
      if (this.weatherMode === 'snow') {
        position.setX(index, position.getX(index) + Math.sin(this.avatarClock + index) * deltaSec * 2.5);
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
