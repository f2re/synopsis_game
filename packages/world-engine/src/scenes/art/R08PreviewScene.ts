import Phaser from 'phaser';
import { worldBridge } from '../../bridge/WorldBridge';
import { normalizeWorldPreferences } from '../../runtime/uiPreferences';
import { HubTimeOfDay, type DayPhase } from '../hub/HubTimeOfDay';
import { getR01PhaseStyle, normalizeR01Weather, r01RainDrop, R01_RAIN_DROP_LIMIT, R01_RAIN_FRAME_MS } from '../hub/r01Environment';
import { WORLD_PALETTE } from '../../theme/tokens';
import { getR08StationLayout, R08_STATION_SCALE } from './r08StationLayout';
import { HubCharacterLayer, preloadHubCharacters } from '../hub/HubCharacterLayer';
import { R08_CHARACTERS } from './r08StationCharacters';
import { r08ActorClip, r08WalkFrame } from './r08Gait';
import {
  parseCharacterManifest,
  type WorldCharacterClip, type WorldCharacterDefinition,
} from '../../runtime/characterAssets';
import {
  parseR08PreviewManifest, r08AmbientTint, r08ArchiveTarget, r08ObserverPose, r08Viewport,
  R08_MANIFEST_URL, R08_OBSERVER_ID, R08_SOURCE_SCALE,
  type R08PreviewAsset, type R08PreviewManifest, type R08PreviewPreferences,
  type R08PreviewStatus, type R08PreviewTarget, type R08LightRegion,
} from './r08PreviewModel';

export interface R08PreviewSceneOptions {
  station?: boolean;
  preferences: R08PreviewPreferences;
  onStatus: (status: R08PreviewStatus) => void;
  onTarget: (target: R08PreviewTarget | null) => void;
  onVisitArchive: () => void;
}
const MANIFEST_KEY = 'r08:manifest';
const CHARACTER_KEY = 'r08:characters';
const imageKey = (asset: R08PreviewAsset) => `r08:asset:${asset.id}`;
const clipKey = (clip: WorldCharacterClip) => `r08:npc:${clip.assetId}`;
const R08_SKY_TINT: Record<DayPhase, number> = {
  dawn: 0xe3c7d2, day: 0xffffff, golden_hour: 0xffd8bb, twilight: 0x9db0c3, night: 0x40567f, white_nights: 0xa7bacb,
};

/** Shared R08 rendering for the art inspector and the in-game acceptance view. */
export class R08PreviewScene extends Phaser.Scene {
  private preferences: R08PreviewPreferences;
  private manifest?: R08PreviewManifest;
  private observerDefinition?: WorldCharacterDefinition;
  private observer?: Phaser.GameObjects.Image;
  private characters?: HubCharacterLayer;
  private images: Array<{ asset: R08PreviewAsset; image: Phaser.GameObjects.Image }> = [];
  private lightImages: Array<{ region: R08LightRegion; image: Phaser.GameObjects.Image }> = [];
  private failures: string[] = [];
  private ready = false;
  private twilightAvailable = false;
  private walkTimeMs = 0;
  private lastFrame = -1;
  private lastClip = '';
  private loaderCleanups: Array<() => void> = [];
  private readonly sourceScale: number;
  private readonly stationClock?: HubTimeOfDay;
  private unsubscribeVisibility?: () => void;
  private unsubscribeWeather?: () => void;
  private rain?: Phaser.GameObjects.Graphics;
  private rainTimeMs = 0;
  private nextRainPaint = 0;

  constructor(private readonly options: R08PreviewSceneOptions) {
    super({ key: options.station ? 'hub' : 'R08Preview' });
    this.preferences = { ...options.preferences };
    this.sourceScale = options.station ? R08_STATION_SCALE : R08_SOURCE_SCALE;
    if (options.station) this.stationClock = new HubTimeOfDay();
  }

  preload(): void {
    this.options.onStatus({ state: 'loading' });
    this.failures = [];
    this.walkTimeMs = 0;
    this.lastFrame = -1;
    this.lastClip = '';
    const enqueueScene = (_key: string, _type: string, value: unknown) => {
      try {
        this.manifest = parseR08PreviewManifest(value);
        for (const asset of this.manifest.assets) {
          if (!this.textures.exists(imageKey(asset)) && asset.role !== 'master') this.load.image(imageKey(asset), asset.url);
        }
      } catch (error) { this.failures.push(error instanceof Error ? error.message : 'Не удалось прочитать слои.'); }
    };
    const enqueueObserver = (_key: string, _type: string, value: unknown) => {
      try {
        this.observerDefinition = parseCharacterManifest(value).actors.find((actor) => actor.id === R08_OBSERVER_ID);
        const definition = this.observerDefinition;
        if (!definition?.clips.walk || definition.displayHeight !== 48) throw new Error('Отсутствует принятый наблюдатель высотой 48 пикселей.');
        definition.clips.idle = r08ActorClip(definition.clips.idle);
        definition.clips.walk = r08ActorClip(definition.clips.walk);
        for (const clip of [definition.clips.idle, definition.clips.walk]) {
          if (!this.textures.exists(clipKey(clip))) this.load.spritesheet(clipKey(clip), clip.url, {
            frameWidth: clip.frameWidth, frameHeight: clip.frameHeight, startFrame: 0, endFrame: clip.frameCount - 1,
          });
        }
      } catch (error) { this.failures.push(error instanceof Error ? error.message : 'Не удалось прочитать персонажа.'); }
    };
    const failed = (file: Phaser.Loader.File) => {
      if (file.key.startsWith('r08:')) this.failures.push(`Не загрузился ресурс ${file.key}.`);
    };
    this.load.once(`filecomplete-json-${MANIFEST_KEY}`, enqueueScene);
    this.load.once(`filecomplete-json-${CHARACTER_KEY}`, enqueueObserver);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
    this.loaderCleanups = [
      () => this.load.off(`filecomplete-json-${MANIFEST_KEY}`, enqueueScene),
      () => this.load.off(`filecomplete-json-${CHARACTER_KEY}`, enqueueObserver),
      () => this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failed),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    if (this.cache.json.exists(MANIFEST_KEY)) enqueueScene(MANIFEST_KEY, 'json', this.cache.json.get(MANIFEST_KEY));
    else this.load.json(MANIFEST_KEY, R08_MANIFEST_URL);
    if (this.options.station) preloadHubCharacters(this, r08ActorClip);
    else if (this.cache.json.exists(CHARACTER_KEY)) enqueueObserver(CHARACTER_KEY, 'json', this.cache.json.get(CHARACTER_KEY));
    else this.load.json(CHARACTER_KEY, '/hub/characters/manifest.json');
  }

  create(): void {
    this.loaderCleanups.forEach((clean) => clean());
    this.loaderCleanups = [];
    if (!this.manifest || (!this.options.station && !this.observerDefinition) || this.failures.length) {
      this.options.onStatus({ state: 'error', message: this.failures[0] ?? 'Комплект пилота ещё не собран.' });
      return;
    }
    for (const asset of this.manifest.assets.filter((entry) => entry.role !== 'master')) {
      const source = this.textures.get(imageKey(asset)).source[0];
      if (!source || source.width !== asset.width || source.height !== asset.height) {
        this.options.onStatus({ state: 'error', message: 'Размер загруженного слоя отличается от манифеста.' });
        return;
      }
      this.textures.get(imageKey(asset)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const facade = this.manifest.assets.find((asset) => asset.role === 'archive-facade')!;
    const facadeDepth = (facade.originalSceneXY[1] + (facade.pivotLocalPx?.[1] ?? facade.height)) * this.sourceScale;
    for (const asset of this.manifest.assets.filter((entry) => entry.role !== 'master' && !entry.role.endsWith('light-mask'))) {
      const image = this.add.image(asset.originalSceneXY[0] * this.sourceScale, asset.originalSceneXY[1] * this.sourceScale, imageKey(asset))
        .setOrigin(0, 0).setScale(this.sourceScale);
      const depth = asset.role === 'archive-local-ground' ? 0
        : asset.role === 'archive-porch-steps' ? 1
          : asset.role === 'material-refinement' ? facadeDepth + 1.5
          : asset.role.endsWith('-occluder')
              ? (asset.depthSourceY ?? asset.anchorScenePx?.[1] ?? asset.originalSceneXY[1] + (asset.pivotLocalPx?.[1] ?? asset.height)) * this.sourceScale
              : facadeDepth + (asset.role === 'archive-facade' ? 0 : asset.role === 'archive-entry-lamp' ? 1 : 2);
      image.setDepth(depth);
      this.images.push({ asset, image });
    }
    for (const region of this.manifest.lightRegions) {
      const mask = this.manifest.assets.find((asset) => asset.role === region.maskRole)!;
      const image = this.add.image(0, 0, imageKey(mask)).setOrigin(0, 0).setScale(this.sourceScale)
        .setCrop(...region.sourceBounds).setTint(Number.parseInt(region.tint.slice(1), 16))
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(region.maskRole === 'ground-light-mask' ? 2 : facadeDepth + 2);
      this.lightImages.push({ region, image });
    }
    if (this.options.station) this.characters = new HubCharacterLayer(this, R08_CHARACTERS);
    else if (this.observerDefinition) {
      const definition = this.observerDefinition;
      const idle = definition.clips.idle;
      for (const clip of [idle, definition.clips.walk!]) this.textures.get(clipKey(clip)).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.observer = this.add.image(0, 0, clipKey(idle), 0)
        .setOrigin(definition.pivot[0], definition.pivot[1]).setScale(48 / idle.frameHeight);
    }
    this.twilightAvailable = this.game.renderer.type === Phaser.WEBGL;
    this.ready = true;
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.game.events.on('r08:visit-archive', this.visitArchive, this);
    if (this.options.station) {
      this.rain = this.add.graphics().setDepth(this.sourceScale * 288);
      this.events.on('ui:preferences', this.applyStationPreferences, this);
      this.unsubscribeVisibility = worldBridge.on<boolean>('ui:world_visible', (visible) => {
        if (visible) this.stationClock?.refresh(new Date(), this.applyStationPreferences);
      });
      this.unsubscribeWeather = worldBridge.on('ui:weather', this.applyStationPreferences);
      this.stationClock?.refresh(new Date());
      this.applyStationPreferences();
    }
    this.applyPreferences(this.preferences);
    this.options.onStatus({ state: 'ready', assets: this.manifest.assets.length,
      foregroundAvailable: this.manifest.assets.some((asset) => asset.role === 'foreground-occluder'),
      twilightAvailable: this.twilightAvailable, review: this.manifest.review });
    this.publishDiagnostics();
  }

  private readonly applyStationPreferences = () => {
    const settings = normalizeWorldPreferences(this.registry.get('ui.preferences'));
    const phase = this.stationClock?.getCurrentPhase() ?? 'day';
    this.applyPreferences({ ...this.preferences, ...settings,
      phase: phase === 'day' ? 'day' : 'twilight' });
    const weather = normalizeR01Weather(this.registry.get('ui.weather'));
    const renderedPhase = this.twilightAvailable ? phase : 'day';
    worldBridge.emit('world:environment_mode', { lightingMode: 'solar', phase: renderedPhase,
      weather: weather.mode, rainDrops: weather.animate ? R01_RAIN_DROP_LIMIT : 0, rainAnimated: weather.animate });
  };

  applyPreferences(preferences: R08PreviewPreferences): void {
    this.preferences = { ...preferences };
    if (!this.ready) return;
    // Canvas does not implement image tint; keep a truthful daytime fallback.
    if (!this.twilightAvailable) this.preferences.phase = 'day';
    const solarPhase = this.stationClock?.getCurrentPhase();
    const weather = normalizeR01Weather(this.registry.get('ui.weather'));
    const style = solarPhase && this.twilightAvailable ? getR01PhaseStyle(solarPhase, weather.mode) : undefined;
    for (const { asset, image } of this.images) {
      if (style && solarPhase) {
        const skyTint = weather.mode === 'rain' ? style.skyTint : R08_SKY_TINT[solarPhase];
        const tintAt = (y: number) => Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(skyTint), Phaser.Display.Color.IntegerToColor(style.sceneryTint),
          288, Math.min(y, 288));
        const top = tintAt(asset.originalSceneXY[1]);
        const bottom = tintAt(asset.originalSceneXY[1] + asset.height);
        const topTint = Phaser.Display.Color.GetColor(top.r, top.g, top.b);
        const bottomTint = Phaser.Display.Color.GetColor(bottom.r, bottom.g, bottom.b);
        image.setTint(topTint, topTint, bottomTint, bottomTint);
        continue;
      }
      if (this.preferences.phase === 'day') image.clearTint();
      else {
        const top = r08AmbientTint(asset.originalSceneXY[1]);
        const bottom = r08AmbientTint(asset.originalSceneXY[1] + asset.height);
        image.setTint(top, top, bottom, bottom);
      }
    }
    for (const { region, image } of this.lightImages) image.setAlpha(region.suggestedAlpha * (style?.lightAlpha ?? Number(this.preferences.phase !== 'day')));
    this.observer?.setTint(style?.sceneryTint ?? (this.preferences.phase === 'day' ? 0xffffff : 0x9eafb5));
    this.characters?.applyLighting(style?.sceneryTint ?? 0xffffff);
    this.paintObserver();
    this.resize();
    this.publishDiagnostics();
  }

  update(_time: number, delta: number): void {
    if (!this.ready) return;
    this.stationClock?.update(delta, this.applyStationPreferences);
    this.characters?.update(delta);
    if (this.rain && normalizeR01Weather(this.registry.get('ui.weather')).animate) {
      this.rainTimeMs += Math.max(0, Math.min(delta, 100));
      if (this.rainTimeMs >= this.nextRainPaint) {
        this.nextRainPaint = this.rainTimeMs + R01_RAIN_FRAME_MS;
        this.paintRain();
      }
    }
    if (!this.observer || this.preferences.reducedMotion || this.preferences.lowPower || this.preferences.pose !== 'walk') return;
    this.walkTimeMs += Math.max(0, Math.min(delta, 100));
    this.paintObserver();
  }

  private paintObserver(): void {
    const definition = this.observerDefinition;
    if (!this.observer || !definition) return;
    const pose = r08ObserverPose(this.preferences.pose, this.walkTimeMs, this.sourceScale);
    const moving = !this.preferences.reducedMotion && !this.preferences.lowPower && pose.moving;
    const clip = moving ? definition.clips.walk! : definition.clips.idle;
    const frame = moving ? r08WalkFrame(pose.travel) : 0;
    if (this.lastClip !== clip.assetId || this.lastFrame !== frame) {
      this.observer.setTexture(clipKey(clip), frame);
      this.lastClip = clip.assetId;
      this.lastFrame = frame;
    }
    this.observer.setPosition(pose.x, pose.y).setDepth(pose.y).setFlipX(pose.facing === 'left');
  }

  private resize(): void {
    if (!this.manifest) return;
    const width = this.scale.width;
    const height = this.scale.height;
    if (this.options.station) {
      const ratio = Number(this.registry.get('world.pixelRatio')) || 1;
      const viewport = getR08StationLayout(width, height, ratio);
      this.cameras.main.setViewport(0, 0, width, height).setZoom(viewport.zoom).centerOn(viewport.centerX, viewport.centerY);
      this.paintRain();
      worldBridge.emit('world:interaction_layout', viewport.targets);
      return;
    }
    const ratio = Number(this.registry.get('r08.pixelRatio')) || 1;
    const viewport = r08Viewport(width, height, this.preferences.framing);
    this.cameras.main.setViewport(0, 0, width, height).setZoom(viewport.zoom).centerOn(viewport.centerX, viewport.centerY);
    this.options.onTarget(r08ArchiveTarget(this.manifest.archive.sourceBounds, viewport, ratio, width / ratio, height / ratio));
  }

  private visitArchive(): void { if (this.ready) this.options.onVisitArchive(); }

  private paintRain(): void {
    const rain = this.rain;
    if (!rain) return;
    rain.clear();
    if (!normalizeR01Weather(this.registry.get('ui.weather')).animate) return;
    const camera = this.cameras.main;
    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;
    const left = camera.midPoint.x - width / 2;
    const top = camera.midPoint.y - height / 2;
    rain.lineStyle(1, WORLD_PALETTE.waterGulf4, .45);
    for (let index = 0; index < R01_RAIN_DROP_LIMIT; index++) {
      const drop = r01RainDrop(index, this.rainTimeMs, width, height);
      const x = Math.round(left + drop.x), y = Math.round(top + drop.y);
      rain.lineBetween(x, y, x - 1, y + drop.length);
    }
  }

  private publishDiagnostics(): void {
    this.registry.set('r08.preview', {
      ready: this.ready, phase: this.preferences.phase, reducedMotion: this.preferences.reducedMotion,
      twilightAvailable: this.twilightAvailable,
      pose: this.preferences.pose, actorHeightWorldPx: 48, sourceToWorldScale: this.sourceScale,
      sourceCanvas: [512, 288], worldCanvas: [512 * this.sourceScale, 288 * this.sourceScale], assets: this.manifest?.assets.map((asset) => asset.id),
      lightRegions: this.lightImages.map(({ region }) => region.id), separateShadowPlanes: false,
      textureBytes: this.manifest?.assets.reduce((total, asset) => total + asset.width * asset.height * 4, 0) ?? 0,
    });
  }

  private cleanup(): void {
    this.loaderCleanups.forEach((clean) => clean());
    this.loaderCleanups = [];
    this.ready = false;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.game.events.off('r08:visit-archive', this.visitArchive, this);
    this.events.off('ui:preferences', this.applyStationPreferences, this);
    this.unsubscribeVisibility?.();
    this.unsubscribeWeather?.();
    this.characters?.destroy();
    this.characters = undefined;
    this.rain = undefined;
    this.rainTimeMs = 0;
    this.nextRainPaint = 0;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.images = [];
    this.lightImages = [];
    this.observer = undefined;
  }
}
