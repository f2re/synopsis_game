import Phaser from 'phaser';
import manifestJson from '../../assets/hub/r09-manifest.json';
import { worldBridge, type DayPhase } from '../../bridge/WorldBridge';
import { normalizeWorldPreferences } from '../../runtime/uiPreferences';
import { HubVegetationWindLayer } from './HubVegetationWindLayer';
import { r09ActorDepth } from './r09ActorLayout';
import { normalizeR01Weather, r01RainDrop, R01_RAIN_DROP_LIMIT } from './r01Environment';
import { R09_ENTRANCES, R09_SOURCE_HEIGHT, R09_SOURCE_WIDTH, r09CloudOffset, r09EntranceTargets, r09Pan, r09PhaseStyle, r09Viewport, type R09ViewMode, type R09Viewport } from './r09SceneModel';

interface StationAsset {
  id: string; role: string; key: string; url: string; width: number; height: number;
  originalSceneXY: number[]; anchorScenePx: number[]; depthSourceY: number;
  density?: number;
  foregroundOccludesActors?: boolean;
  motionReady?: boolean; wind?: { kind?: 'tree'|'shrub'|'grass'|'reed'|'flag'; rootFraction?: number; gain?: number };
  kind?: 'tree'|'shrub'|'grass'|'reed'|'flag'; rootFraction?: number; gain?: number;
}
interface Domain { polygons?: number[][][]; rowSpans?: number[][] }
interface StationManifest {
  review: { productionReady: boolean }; assets: StationAsset[];
  domains: { sky: Domain; water: Domain; cloudClip?: Domain };
  lightRegions: { maskRole: string; sourceBounds: number[]; tint: string; suggestedAlpha: number; verticalFalloff?: [number, number] }[];
}
export const R09_STATION_MANIFEST = manifestJson as unknown as StationManifest;

const SCENE_PLANE_DEPTHS: Record<string, number> = {
  sky: 0, water: 1, 'architecture-ground': 3, 'foreground-occluder': 31,
};

// Sparse native pixels with irregular spacing and three brightness levels.
const STAR_GROUPS = [
  { opacity: .42, points: [[156, 28], [193, 17], [228, 35], [254, 29], [284, 20], [298, 47], [333, 30], [407, 26], [468, 21]] },
  { opacity: .66, points: [[174, 40], [217, 22], [271, 39], [319, 14], [342, 35], [440, 29]] },
  { opacity: 1, points: [[238, 17], [299, 32], [401, 17]] },
];

/** A single authored 512×288 terrace. Only extracted organic pixels move;
 * the ground, architecture, contact edges and camera registration are shared. */
export class HubR09Layer {
  private readonly images: { asset: StationAsset; image: Phaser.GameObjects.Image }[] = [];
  private readonly cloudImages: { asset: StationAsset; image: Phaser.GameObjects.Image; offset: number }[] = [];
  private readonly receivers: { image: Phaser.GameObjects.Image; alpha: number }[] = [];
  private readonly canvasRenderer: boolean;
  private readonly canvasTints = new Map<string, { texture: Phaser.Textures.CanvasTexture; tint: number }>();
  private readonly maskGraphics: Phaser.GameObjects.Graphics[] = [];
  private readonly masks: Phaser.Display.Masks.GeometryMask[] = [];
  private readonly waterGlints: Phaser.GameObjects.Graphics;
  private readonly fountain: Phaser.GameObjects.Graphics;
  private readonly stars: Phaser.GameObjects.Graphics;
  private readonly rain: Phaser.GameObjects.Graphics;
  private readonly focus: Phaser.GameObjects.Graphics;
  private readonly wind: HubVegetationWindLayer;
  private readonly unsubs: (() => void)[] = [];
  private viewport: R09Viewport;
  private requestedViewMode?: R09ViewMode;
  private requestedCenterX?: number;
  private phase: DayPhase = 'day';
  private weather = normalizeR01Weather(undefined);
  private preferences = normalizeWorldPreferences(undefined);
  private paused = false;
  private clockMs = 0;
  private previousFrameTime?: number;
  private paintMs = 0;
  private diagnosticMs = 0;
  private waterFrame = 0;
  private focused: string | null = null;
  private disposed = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.canvasRenderer = scene.game.renderer.type === Phaser.CANVAS;
    this.viewport = r09Viewport(scene.scale.width, scene.scale.height, scene.registry.get('world.pixelRatio'));
    for (const asset of R09_STATION_MANIFEST.assets) {
      scene.textures.get(asset.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (!(asset.role in SCENE_PLANE_DEPTHS) && asset.role !== 'clouds') continue;
      const image = scene.add.image(asset.originalSceneXY[0], asset.originalSceneXY[1], asset.key)
        .setOrigin(0, 0).setDepth(asset.role === 'clouds' ? .5 : SCENE_PLANE_DEPTHS[asset.role]);
      if (asset.density) image.setScale(1 / asset.density);
      if (asset.role === 'clouds') this.cloudImages.push({ asset, image, offset: 0 });
      else this.images.push({ asset, image });
    }
    const skyMask = this.makeMask(R09_STATION_MANIFEST.domains.sky);
    const waterMask = this.makeMask(R09_STATION_MANIFEST.domains.water);
    // The moving cloud has a dedicated, independently traced corridor. A
    // coarse sky polygon would paint across the mast and distant conifers.
    const cloudMask = this.makeMask(R09_STATION_MANIFEST.domains.cloudClip ?? { rowSpans: [] });
    this.cloudImages.forEach(({ image }) => image.setMask(cloudMask));
    this.waterGlints = scene.add.graphics().setDepth(1.5).setMask(waterMask);
    this.stars = scene.add.graphics().setDepth(.25).setMask(skyMask);
    this.fountain = scene.add.graphics().setDepth(4);
    this.focus = scene.add.graphics().setDepth(35);
    this.rain = scene.add.graphics().setDepth(34);
    for (const region of R09_STATION_MANIFEST.lightRegions) {
      const asset = R09_STATION_MANIFEST.assets.find((entry) => entry.role === region.maskRole);
      if (!asset) continue;
      const [x, y, width, height] = region.sourceBounds;
      const rows = region.verticalFalloff ? height : 1;
      const tint = Number.parseInt(region.tint.slice(1), 16);
      const key = this.canvasRenderer ? this.getCanvasTint(asset.key, tint, region.tint) : asset.key;
      for (let row = 0; row < rows; row++) {
        const falloff = region.verticalFalloff;
        const weight = falloff ? falloff[0] + (falloff[1] - falloff[0]) * row / Math.max(1, rows - 1) : 1;
        // A receiver fade follows native rows. Vertex-alpha interpolation
        // would introduce a smooth gradient within each enlarged pixel.
        const image = scene.add.image(0, 0, key).setOrigin(0, 0)
          .setCrop(x, y + (falloff ? row : 0), width, falloff ? 1 : height)
          .setDepth(32).setBlendMode(Phaser.BlendModes.ADD);
        if (!this.canvasRenderer) image.setTint(tint);
        this.receivers.push({ image, alpha: region.suggestedAlpha * weight });
      }
    }
    this.wind = new HubVegetationWindLayer(scene);
    this.wind.setPlacements(R09_STATION_MANIFEST.assets.filter((asset) => asset.role === 'vegetation').map((asset) => ({
      id: asset.id, textureKey: asset.key,
      anchorX: asset.anchorScenePx[0], anchorY: asset.anchorScenePx[1],
      width: asset.width, height: asset.height,
      // The front balustrade occludes actors. Plants on the open terraces
      // sort by their planted foot, on the same depth scale as the actors.
      depth: asset.foregroundOccludesActors ? SCENE_PLANE_DEPTHS['foreground-occluder'] + .1 : r09ActorDepth(asset.depthSourceY),
      kind: asset.wind?.kind ?? asset.kind ?? 'shrub',
      rootFraction: asset.wind?.rootFraction ?? asset.rootFraction ?? .25,
      gain: asset.wind?.gain ?? asset.gain ?? 1.5,
    })));
    this.unsubs.push(
      worldBridge.on<{buildingId: string | null}>('ui:focus_building', ({buildingId}) => {
        this.focused = buildingId; this.drawFocus();
      }),
      worldBridge.on<'left'|'right'>('ui:station_pan', (direction) => {
        if (direction !== 'left' && direction !== 'right') return;
        const next = r09Pan(this.viewport, direction);
        if (next === this.viewport) return;
        this.requestedCenterX = next.centerX; this.resize();
      }),
      worldBridge.on<R09ViewMode>('ui:station_view', (mode) => {
        if ((mode !== 'overview' && mode !== 'detail') || mode === this.viewport.mode) return;
        this.requestedViewMode = mode;
        this.requestedCenterX = undefined;
        this.resize();
      }),
      worldBridge.on<boolean>('ui:world_visible', (visible) => {
        if (this.paused !== !visible) this.previousFrameTime = undefined;
        this.paused = !visible; this.syncMotion(); this.publishDiagnostics();
      }),
    );
    scene.events.on('ui:preferences', this.onPreferences, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.preferences = normalizeWorldPreferences(scene.registry.get('ui.preferences'));
    this.paused = scene.registry.get('ui.world_visible') === false;
    this.weather = normalizeR01Weather(scene.registry.get('ui.weather'));
    this.resize(); this.syncMotion(); this.applyDayPhase('day');
  }

  // Phaser's Canvas image path applies alpha and blending but ignores sprite tint.
  // Retain one mutable variant per lit plane (and one per fixed receiver color).
  private readonly getCanvasTint = (sourceKey: string, tint: number, variant = 'phase'): string => {
    if (tint === 0xffffff) return sourceKey;
    const key = `${sourceKey}_r09_canvas_${variant}`;
    let cached = this.canvasTints.get(key);
    if (cached?.tint === tint) return key;
    const source = this.scene.textures.get(sourceKey).getSourceImage();
    // R09 source keys are loaded as images through the station manifest.
    if (!('naturalWidth' in source)) return sourceKey;
    if (!cached) {
      // Phaser's pool may return an old opaque game canvas. Context alpha
      // cannot be changed after the first getContext call, even on resize.
      const canvas = source.ownerDocument.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      if (!canvas.getContext('2d', { alpha: true, willReadFrequently: true })) return sourceKey;
      const texture = this.scene.textures.addCanvas(key, canvas);
      if (!texture) return sourceKey;
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      cached = { texture, tint };
      this.canvasTints.set(key, cached);
    }
    const context = cached.texture.getContext();
    context.clearRect(0, 0, source.width, source.height);
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, source.width, source.height);
    const red = (tint >> 16 & 255) / 255;
    const green = (tint >> 8 & 255) / 255;
    const blue = (tint & 255) / 255;
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] *= red;
      pixels.data[i + 1] *= green;
      pixels.data[i + 2] *= blue;
    }
    context.putImageData(pixels, 0, 0);
    cached.tint = tint;
    return key;
  };

  private tintPlane(image: Phaser.GameObjects.Image, sourceKey: string, tint: number): void {
    if (this.canvasRenderer) image.setTexture(this.getCanvasTint(sourceKey, tint));
    else image.setTint(tint);
  }

  private makeMask(domain: Domain): Phaser.Display.Masks.GeometryMask {
    const graphic = this.scene.add.graphics().setVisible(false).fillStyle(0xffffff);
    if (domain.rowSpans?.length) {
      for (const [y, left, right] of domain.rowSpans) graphic.fillRect(left, y, right - left, 1);
    } else {
      for (const polygon of domain.polygons ?? []) {
        graphic.beginPath().moveTo(polygon[0][0], polygon[0][1]);
        polygon.slice(1).forEach(([x, y]) => graphic.lineTo(x, y));
        graphic.closePath().fillPath();
      }
    }
    const mask = graphic.createGeometryMask();
    this.maskGraphics.push(graphic); this.masks.push(mask);
    return mask;
  }

  private resize(): void {
    if (this.disposed) return;
    const ratio = this.scene.registry.get('world.pixelRatio') ?? 1;
    if (this.viewport.bufferWidth !== this.scene.scale.width || this.viewport.bufferHeight !== this.scene.scale.height || this.viewport.pixelRatio !== ratio) {
      this.requestedCenterX = undefined;
    }
    this.viewport = r09Viewport(this.scene.scale.width, this.scene.scale.height,
      ratio, this.requestedViewMode, this.requestedCenterX);
    const view = this.viewport;
    // Canvas's roundPixels adds half a source pixel to each sprite size.
    // Fractional scales also need a shared unsnapped projection across planes.
    this.scene.cameras.main.setViewport(0, 0, view.bufferWidth, view.bufferHeight)
      .setZoom(view.zoom).centerOn(view.centerX, view.centerY).setRoundPixels(!this.canvasRenderer && view.mode === 'detail' && Number.isInteger(view.zoom));
    this.updateCameraBackground();
    worldBridge.emit('world:interaction_layout', r09EntranceTargets(view));
    worldBridge.emit('world:station_view', { stationArt: 'r09', mode: view.mode, canPanLeft: view.canPanLeft, canPanRight: view.canPanRight });
    this.drawFocus(); this.drawRain(); this.publishDiagnostics();
  }

  private onPreferences(value: unknown): void {
    const next = normalizeWorldPreferences(value);
    if (this.preferences.reducedMotion !== next.reducedMotion) this.previousFrameTime = undefined;
    this.preferences = next;
    this.syncMotion();
    // A still preference restores all environmental motion, not only foliage.
    if (this.preferences.reducedMotion) this.drawAmbient(true);
    this.drawRain(); this.publishDiagnostics();
  }

  private syncMotion(): void {
    this.wind.setEnvironment({ weather: this.weather.mode, reducedMotion: this.preferences.reducedMotion,
      lowPower: this.preferences.lowPower, paused: this.paused });
  }

  private updateCameraBackground(): void {
    this.scene.cameras.main.setBackgroundColor(this.viewport.mode === 'overview' || this.phase === 'night' ? 0x101e25 : 0x21382b);
  }

  applyDayPhase(phase: DayPhase): void {
    this.phase = phase;
    const style = r09PhaseStyle(phase, this.weather.mode === 'rain');
    this.updateCameraBackground();
    for (const { asset, image } of this.images) this.tintPlane(image, asset.key, asset.role === 'sky' ? style.sky : asset.role === 'water' ? style.water : style.scenery);
    this.cloudImages.forEach(({ asset, image }) => this.tintPlane(image, asset.key, style.sky));
    this.wind.setTint(style.scenery, this.canvasRenderer ? this.getCanvasTint : undefined);
    this.receivers.forEach(({ image, alpha }) => image.setAlpha(Math.min(.65, alpha * style.lights)));
    this.stars.clear();
    if (style.stars > 0) {
      for (const { opacity, points } of STAR_GROUPS) {
        this.stars.fillStyle(0xd9e6f4, style.stars * opacity);
        for (const [x, y] of points) this.stars.fillRect(x, y, 1, 1);
      }
    }
    this.drawAmbient(this.preferences.reducedMotion); this.drawRain(); this.publishDiagnostics();
  }

  setWeather(value: unknown): void {
    this.weather = normalizeR01Weather(value); this.syncMotion(); this.applyDayPhase(this.phase);
  }

  getSceneryTint(): number { return r09PhaseStyle(this.phase, this.weather.mode === 'rain').scenery; }

  getEnvironment() {
    const animated = this.weather.mode === 'rain' && this.weather.animate && !this.paused && !this.preferences.reducedMotion && !this.preferences.lowPower;
    return { stationArt: 'r09', weather: this.weather.mode, rainDrops: animated ? R01_RAIN_DROP_LIMIT : 0, rainAnimated: animated };
  }

  private drawAmbient(still = false): void {
    const time = still ? 0 : this.clockMs;
    this.waterFrame = Math.floor(time / (this.preferences.lowPower ? 600 : 350));
    for (const [index, cloud] of this.cloudImages.entries()) {
      const start = cloud.asset.originalSceneXY[0], width = cloud.asset.width;
      cloud.offset = r09CloudOffset(time, start, width, still || cloud.asset.motionReady !== true, index);
      cloud.image.setX(start + cloud.offset);
    }
    const glintAlpha = this.phase === 'night' ? .17 : this.weather.mode === 'rain' ? .2 : .37;
    this.waterGlints.clear().fillStyle(0xd9e8dc, glintAlpha);
    // These horizontal native-pixel marks are clipped by the exact water
    // domain. Trees and shore edges are never water receivers.
    for (let i = 0; i < 24; i++) {
      const right = i >= 7;
      const x = right ? 447 + (i * 17 + this.waterFrame) % 64 : 308 + (i * 7 + this.waterFrame) % 27;
      const y = right ? 97 + (i * 7) % 29 : 79 + (i * 3) % 9;
      if ((i + this.waterFrame) % 4 !== 0) this.waterGlints.fillRect(x, y, 2 + (i + this.waterFrame) % 3, 1);
    }
    this.fountain.clear().fillStyle(0xd4e5da, glintAlpha);
    // Source-water strips independently inspected at native resolution. No
    // movement on the front stone rim (y212–215) or the armillary sphere.
    const fountainWater = [[220, 209, 4], [237, 209, 4], [194, 217, 4], [254, 218, 4], [214, 219, 5]];
    fountainWater.forEach(([x, y, width], index) => {
      if ((this.waterFrame + index) % 4 !== 0) this.fountain.fillRect(x, y, 1 + (this.waterFrame + index) % width, 1);
    });
  }

  private drawRain(): void {
    this.rain.clear();
    if (!this.getEnvironment().rainAnimated) return;
    const [left, top, width, height] = this.viewport.visibleSourceBounds;
    this.rain.fillStyle(0xd8e8e8, .35);
    for (let i = 0; i < R01_RAIN_DROP_LIMIT; i++) {
      const drop = r01RainDrop(i, this.clockMs, width, height);
      const x = Math.round(left + drop.x), y = Math.round(top + drop.y);
      const splashTop = Math.max(0, y);
      const splashBottom = Math.min(R09_SOURCE_HEIGHT, y + Math.max(2, Math.round(drop.length)));
      if (x >= 0 && x < R09_SOURCE_WIDTH && splashBottom > splashTop) {
        this.rain.fillRect(x, splashTop, 1, splashBottom - splashTop);
      }
    }
  }

  private drawFocus(): void {
    this.focus.clear();
    const entrance = R09_ENTRANCES.find(({ id }) => id === this.focused);
    if (!entrance) return;
    // Four tiny corners at the real threshold; no labels on the facade.
    const { x, y } = entrance;
    this.focus.fillStyle(0xffdf9a, 1);
    for (const dx of [-6, 5]) for (const dy of [-6, 5]) {
      this.focus.fillRect(x + dx, y + dy, 2, 1);
      this.focus.fillRect(x + dx, y + dy - (dy > 0 ? 1 : -1), 1, 1);
    }
  }

  private publishDiagnostics(): void {
    if (this.disposed) return;
    const v = this.viewport;
    const diagnostic = {
      stationArt: 'r09', sourceCanvas: [512, 288],
      camera: { mode: v.mode, zoom: v.zoom, offsetX: v.offsetX, offsetY: v.offsetY, pixelRatio: v.pixelRatio,
        centerX: v.centerX, centerY: v.centerY, visibleSourceBounds: v.visibleSourceBounds,
        canPanLeft: v.canPanLeft, canPanRight: v.canPanRight },
      assets: { count: R09_STATION_MANIFEST.assets.length,
        estimatedRgbaBytes: R09_STATION_MANIFEST.assets.reduce((sum, asset) => sum + asset.width * asset.height * 4, 0) },
      motion: { clockMs: this.clockMs, paused: this.paused, reducedMotion: this.preferences.reducedMotion,
        lowPower: this.preferences.lowPower, foliage: this.wind.getDiagnostics(),
        cloudOffsets: this.cloudImages.map(({ offset }) => offset), waterFrame: this.waterFrame },
      phase: this.phase, weather: this.weather.mode,
      staticGeometrySignature: 'r09:512x288:sourceScale1:source-registered',
      visiblePoiIds: r09EntranceTargets(v).map(({ id }) => id),
    };
    this.scene.registry.set('world.station', diagnostic);
    worldBridge.emit('world:station_diagnostics', diagnostic);
  }

  update(deltaMs: number, frameTimeMs?: number): number {
    if (this.disposed || this.paused || this.preferences.reducedMotion) {
      this.previousFrameTime = undefined;
      return 0;
    }
    // Phaser's FPS-limited delta includes its accumulator remainder. Reusing
    // that value can advance scenery faster than wall time. Native frame
    // timestamps give one shared elapsed interval for the territory and NPCs.
    let elapsed = deltaMs;
    if (frameTimeMs !== undefined) {
      if (!Number.isFinite(frameTimeMs) || (this.previousFrameTime !== undefined && frameTimeMs < this.previousFrameTime)) return 0;
      elapsed = this.previousFrameTime === undefined ? 0 : frameTimeMs - this.previousFrameTime;
      this.previousFrameTime = frameTimeMs;
    } else this.previousFrameTime = undefined;
    const delta = Math.min(100, Math.max(0, Number.isFinite(elapsed) ? elapsed : 0));
    this.clockMs += delta; this.paintMs += delta; this.diagnosticMs += delta;
    this.wind.update(delta);
    const cadence = this.preferences.lowPower ? 200 : 100;
    if (this.paintMs >= cadence) { this.paintMs %= cadence; this.drawAmbient(); this.drawRain(); }
    if (this.diagnosticMs >= 1000) { this.diagnosticMs %= 1000; this.publishDiagnostics(); }
    return delta;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.scene.events.off('ui:preferences', this.onPreferences, this);
    this.unsubs.forEach((off) => off()); this.wind.destroy();
    [...this.images, ...this.cloudImages].forEach(({ image }) => { image.clearMask(); image.destroy(); });
    this.receivers.forEach(({ image }) => image.destroy());
    for (const key of this.canvasTints.keys()) this.scene.textures.remove(key);
    this.canvasTints.clear();
    [this.waterGlints, this.fountain, this.stars, this.rain, this.focus].forEach((graphic) => { graphic.clearMask(); graphic.destroy(); });
    this.masks.forEach((mask) => mask.destroy()); this.maskGraphics.forEach((graphic) => graphic.destroy());
    // React clears its own panorama on route/scene changes. An old Game can
    // finish its deferred destruction after a replacement has mounted; it
    // must not publish a global clear that erases the new scene's controls.
  }
}
