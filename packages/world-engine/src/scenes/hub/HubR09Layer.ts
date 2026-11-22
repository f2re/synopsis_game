import Phaser from 'phaser';
import manifestJson from '../../assets/hub/r09-manifest.json';
import { worldBridge, type DayPhase } from '../../bridge/WorldBridge';
import { normalizeWorldPreferences } from '../../runtime/uiPreferences';
import { HubVegetationWindLayer } from './HubVegetationWindLayer';
import { normalizeR01Weather, r01RainDrop, R01_RAIN_DROP_LIMIT } from './r01Environment';
import { R09_ENTRANCES, r09CloudOffset, r09EntranceTargets, r09Pan, r09PhaseStyle, r09Viewport, type R09Viewport } from './r09SceneModel';

interface StationAsset {
  id: string; role: string; key: string; url: string; width: number; height: number;
  originalSceneXY: number[]; anchorScenePx: number[]; depthSourceY: number;
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

/** A single authored 512×288 terrace. Only extracted organic pixels move;
 * the ground, architecture, contact edges and camera registration are shared. */
export class HubR09Layer {
  private readonly images: { asset: StationAsset; image: Phaser.GameObjects.Image }[] = [];
  private readonly cloudImages: { asset: StationAsset; image: Phaser.GameObjects.Image; offset: number }[] = [];
  private readonly receivers: { image: Phaser.GameObjects.Image; alpha: number }[] = [];
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
  private requestedCenterX?: number;
  private phase: DayPhase = 'day';
  private weather = normalizeR01Weather(undefined);
  private preferences = normalizeWorldPreferences(undefined);
  private paused = false;
  private clockMs = 0;
  private paintMs = 0;
  private diagnosticMs = 0;
  private waterFrame = 0;
  private focused: string | null = null;
  private disposed = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.viewport = r09Viewport(scene.scale.width, scene.scale.height, scene.registry.get('world.pixelRatio'));
    const depth: Record<string, number> = { sky: 0, water: 1, 'architecture-ground': 3, 'foreground-occluder': 31 };
    for (const asset of R09_STATION_MANIFEST.assets) {
      scene.textures.get(asset.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (!(asset.role in depth) && asset.role !== 'clouds') continue;
      const image = scene.add.image(asset.originalSceneXY[0], asset.originalSceneXY[1], asset.key)
        .setOrigin(0, 0).setDepth(asset.role === 'clouds' ? .5 : depth[asset.role]);
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
      for (let row = 0; row < rows; row++) {
        const falloff = region.verticalFalloff;
        const weight = falloff ? falloff[0] + (falloff[1] - falloff[0]) * row / Math.max(1, rows - 1) : 1;
        // A receiver fade follows native rows. Vertex-alpha interpolation
        // would introduce a smooth gradient within each enlarged pixel.
        const image = scene.add.image(0, 0, asset.key).setOrigin(0, 0)
          .setCrop(x, y + (falloff ? row : 0), width, falloff ? 1 : height)
          .setDepth(32).setTint(Number.parseInt(region.tint.slice(1), 16)).setBlendMode(Phaser.BlendModes.ADD);
        this.receivers.push({ image, alpha: region.suggestedAlpha * weight });
      }
    }
    this.wind = new HubVegetationWindLayer(scene);
    this.wind.setPlacements(R09_STATION_MANIFEST.assets.filter((asset) => asset.role === 'vegetation').map((asset) => ({
      id: asset.id, textureKey: asset.key,
      anchorX: asset.anchorScenePx[0], anchorY: asset.anchorScenePx[1],
      width: asset.width, height: asset.height,
      // The foreground plate contains the clean donor. Crowns must cover it,
      // while the plate itself occludes people behind the stone balustrade.
      depth: 31.1 + asset.depthSourceY / 1000,
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
        this.requestedCenterX = r09Pan(this.viewport, direction).centerX; this.resize();
      }),
      worldBridge.on<boolean>('ui:world_visible', (visible) => {
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
      ratio, this.requestedCenterX);
    const view = this.viewport;
    this.scene.cameras.main.setViewport(0, 0, view.bufferWidth, view.bufferHeight)
      .setZoom(view.zoom).centerOn(view.centerX, view.centerY).setRoundPixels(true);
    worldBridge.emit('world:interaction_layout', r09EntranceTargets(view));
    worldBridge.emit('world:station_view', { stationArt: 'r09', canPanLeft: view.canPanLeft, canPanRight: view.canPanRight });
    this.drawFocus(); this.drawRain(); this.publishDiagnostics();
  }

  private onPreferences(value: unknown): void {
    this.preferences = normalizeWorldPreferences(value);
    this.syncMotion();
    // A still preference restores all environmental motion, not only foliage.
    if (this.preferences.reducedMotion) this.drawAmbient(true);
    this.drawRain(); this.publishDiagnostics();
  }

  private syncMotion(): void {
    this.wind.setEnvironment({ weather: this.weather.mode, reducedMotion: this.preferences.reducedMotion,
      lowPower: this.preferences.lowPower, paused: this.paused });
  }

  applyDayPhase(phase: DayPhase): void {
    this.phase = phase;
    const style = r09PhaseStyle(phase, this.weather.mode === 'rain');
    this.scene.cameras.main.setBackgroundColor(this.phase === 'night' ? 0x101e25 : 0x21382b);
    for (const { asset, image } of this.images) image.setTint(asset.role === 'sky' ? style.sky : asset.role === 'water' ? style.water : style.scenery);
    this.cloudImages.forEach(({ image }) => image.setTint(style.sky));
    this.wind.setTint(style.scenery);
    this.receivers.forEach(({ image, alpha }) => image.setAlpha(Math.min(.65, alpha * style.lights)));
    this.stars.clear().fillStyle(0xe4edf2, style.stars);
    if (style.stars > 0) {
      for (let i = 0; i < 26; i++) this.stars.fillRect(164 + (i * 73) % 241, (i * 17 + 3) % 35, 1, 1);
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
      this.rain.fillRect(x, y, 1, Math.max(2, Math.round(drop.length)));
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
      camera: { zoom: v.zoom, offsetX: v.offsetX, offsetY: v.offsetY, pixelRatio: v.pixelRatio,
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

  update(deltaMs: number): void {
    if (this.disposed || this.paused || this.preferences.reducedMotion) return;
    const delta = Math.min(100, Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0));
    this.clockMs += delta; this.paintMs += delta; this.diagnosticMs += delta;
    this.wind.update(delta);
    const cadence = this.preferences.lowPower ? 200 : 100;
    if (this.paintMs >= cadence) { this.paintMs %= cadence; this.drawAmbient(); this.drawRain(); }
    if (this.diagnosticMs >= 1000) { this.diagnosticMs %= 1000; this.publishDiagnostics(); }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.scene.events.off('ui:preferences', this.onPreferences, this);
    this.unsubs.forEach((off) => off()); this.wind.destroy();
    [...this.images, ...this.cloudImages].forEach(({ image }) => { image.clearMask(); image.destroy(); });
    this.receivers.forEach(({ image }) => image.destroy());
    [this.waterGlints, this.fountain, this.stars, this.rain, this.focus].forEach((graphic) => { graphic.clearMask(); graphic.destroy(); });
    this.masks.forEach((mask) => mask.destroy()); this.maskGraphics.forEach((graphic) => graphic.destroy());
    // React clears its own panorama on route/scene changes. An old Game can
    // finish its deferred destruction after a replacement has mounted; it
    // must not publish a global clear that erases the new scene's controls.
  }
}
