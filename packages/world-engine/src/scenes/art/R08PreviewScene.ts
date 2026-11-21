import Phaser from 'phaser';
import {
  characterFrameAtTime, parseCharacterManifest,
  type WorldCharacterClip, type WorldCharacterDefinition,
} from '../../runtime/characterAssets';
import {
  parseR08PreviewManifest, r08AmbientTint, r08ArchiveTarget, r08ObserverPose, r08Viewport,
  R08_MANIFEST_URL, R08_OBSERVER_ID, R08_SOURCE_SCALE,
  type R08PreviewAsset, type R08PreviewManifest, type R08PreviewPreferences,
  type R08PreviewStatus, type R08PreviewTarget, type R08LightRegion,
} from './r08PreviewModel';

export interface R08PreviewSceneOptions {
  preferences: R08PreviewPreferences;
  onStatus: (status: R08PreviewStatus) => void;
  onTarget: (target: R08PreviewTarget | null) => void;
  onVisitArchive: () => void;
}
const MANIFEST_KEY = 'r08:manifest';
const CHARACTER_KEY = 'r08:characters';
const imageKey = (asset: R08PreviewAsset) => `r08:asset:${asset.id}`;
const clipKey = (clip: WorldCharacterClip) => `r08:npc:${clip.assetId}`;

/** A route-local inspection scene. It cannot select or replace the production Hub. */
export class R08PreviewScene extends Phaser.Scene {
  private preferences: R08PreviewPreferences;
  private manifest?: R08PreviewManifest;
  private observerDefinition?: WorldCharacterDefinition;
  private observer?: Phaser.GameObjects.Image;
  private images: Array<{ asset: R08PreviewAsset; image: Phaser.GameObjects.Image }> = [];
  private lightImages: Array<{ region: R08LightRegion; image: Phaser.GameObjects.Image }> = [];
  private failures: string[] = [];
  private ready = false;
  private twilightAvailable = false;
  private walkTimeMs = 0;
  private lastFrame = -1;
  private lastClip = '';
  private loaderCleanups: Array<() => void> = [];

  constructor(private readonly options: R08PreviewSceneOptions) {
    super({ key: 'R08Preview' });
    this.preferences = { ...options.preferences };
  }

  preload(): void {
    this.options.onStatus({ state: 'loading' });
    const enqueueScene = (_key: string, _type: string, value: unknown) => {
      try {
        this.manifest = parseR08PreviewManifest(value);
        for (const asset of this.manifest.assets) this.load.image(imageKey(asset), asset.url);
      } catch (error) { this.failures.push(error instanceof Error ? error.message : 'Не удалось прочитать слои.'); }
    };
    const enqueueObserver = (_key: string, _type: string, value: unknown) => {
      try {
        this.observerDefinition = parseCharacterManifest(value).actors.find((actor) => actor.id === R08_OBSERVER_ID);
        const definition = this.observerDefinition;
        if (!definition?.clips.walk || definition.displayHeight !== 48) throw new Error('Отсутствует принятый наблюдатель высотой 48 пикселей.');
        for (const clip of [definition.clips.idle, definition.clips.walk]) {
          this.load.spritesheet(clipKey(clip), clip.url, {
            frameWidth: clip.frameWidth, frameHeight: clip.frameHeight, startFrame: 0, endFrame: clip.frameCount - 1,
          });
        }
      } catch (error) { this.failures.push(error instanceof Error ? error.message : 'Не удалось прочитать персонажа.'); }
    };
    const failed = (file: Phaser.Loader.File) => this.failures.push(`Не загрузился ресурс ${file.key}.`);
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
    this.load.json(MANIFEST_KEY, R08_MANIFEST_URL);
    this.load.json(CHARACTER_KEY, '/hub/characters/manifest.json');
  }

  create(): void {
    this.loaderCleanups.forEach((clean) => clean());
    this.loaderCleanups = [];
    if (!this.manifest || !this.observerDefinition || this.failures.length) {
      this.options.onStatus({ state: 'error', message: this.failures[0] ?? 'Комплект пилота ещё не собран.' });
      return;
    }
    for (const asset of this.manifest.assets) {
      const source = this.textures.get(imageKey(asset)).source[0];
      if (!source || source.width !== asset.width || source.height !== asset.height) {
        this.options.onStatus({ state: 'error', message: 'Размер загруженного слоя отличается от манифеста.' });
        return;
      }
      this.textures.get(imageKey(asset)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const facade = this.manifest.assets.find((asset) => asset.role === 'archive-facade')!;
    const facadeDepth = (facade.originalSceneXY[1] + (facade.pivotLocalPx?.[1] ?? facade.height)) * R08_SOURCE_SCALE;
    for (const asset of this.manifest.assets.filter((entry) => entry.role !== 'master' && !entry.role.endsWith('light-mask'))) {
      const image = this.add.image(asset.originalSceneXY[0] * R08_SOURCE_SCALE, asset.originalSceneXY[1] * R08_SOURCE_SCALE, imageKey(asset))
        .setOrigin(0, 0).setScale(R08_SOURCE_SCALE);
      const depth = asset.role === 'archive-local-ground' ? 0
        : asset.role === 'archive-porch-steps' ? 1
          : asset.role === 'foreground-occluder'
              ? (asset.depthSourceY ?? asset.anchorScenePx?.[1] ?? asset.originalSceneXY[1] + (asset.pivotLocalPx?.[1] ?? asset.height)) * R08_SOURCE_SCALE
              : facadeDepth + (asset.role === 'archive-facade' ? 0 : asset.role === 'archive-entry-lamp' ? 1 : 2);
      image.setDepth(depth);
      this.images.push({ asset, image });
    }
    for (const region of this.manifest.lightRegions) {
      const mask = this.manifest.assets.find((asset) => asset.role === region.maskRole)!;
      const image = this.add.image(0, 0, imageKey(mask)).setOrigin(0, 0).setScale(R08_SOURCE_SCALE)
        .setCrop(...region.sourceBounds).setTint(Number.parseInt(region.tint.slice(1), 16))
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(region.maskRole === 'ground-light-mask' ? 2 : facadeDepth + 2);
      this.lightImages.push({ region, image });
    }
    const definition = this.observerDefinition;
    const idle = definition.clips.idle;
    for (const clip of [idle, definition.clips.walk!]) this.textures.get(clipKey(clip)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.observer = this.add.image(0, 0, clipKey(idle), 0)
      .setOrigin(definition.pivot[0], definition.pivot[1]).setScale(48 / idle.frameHeight);
    this.twilightAvailable = this.game.renderer.type === Phaser.WEBGL;
    this.ready = true;
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.game.events.on('r08:visit-archive', this.visitArchive, this);
    this.applyPreferences(this.preferences);
    this.options.onStatus({ state: 'ready', assets: this.manifest.assets.length,
      foregroundAvailable: this.manifest.assets.some((asset) => asset.role === 'foreground-occluder'),
      twilightAvailable: this.twilightAvailable, review: this.manifest.review });
    this.publishDiagnostics();
  }

  applyPreferences(preferences: R08PreviewPreferences): void {
    this.preferences = { ...preferences };
    if (!this.ready) return;
    // Canvas does not implement image tint; keep a truthful daytime fallback.
    if (!this.twilightAvailable) this.preferences.phase = 'day';
    for (const { asset, image } of this.images) {
      if (this.preferences.phase === 'day') image.clearTint();
      else {
        const top = r08AmbientTint(asset.originalSceneXY[1]);
        const bottom = r08AmbientTint(asset.originalSceneXY[1] + asset.height);
        image.setTint(top, top, bottom, bottom);
      }
    }
    for (const { region, image } of this.lightImages) image.setAlpha(this.preferences.phase === 'day' ? 0 : region.suggestedAlpha);
    this.observer?.setTint(this.preferences.phase === 'day' ? 0xffffff : 0x9eafb5);
    this.paintObserver();
    this.resize();
    this.publishDiagnostics();
  }

  update(_time: number, delta: number): void {
    if (!this.ready || this.preferences.reducedMotion || this.preferences.pose !== 'walk') return;
    this.walkTimeMs += Math.max(0, Math.min(delta, 100));
    this.paintObserver();
  }

  private paintObserver(): void {
    const definition = this.observerDefinition;
    if (!this.observer || !definition) return;
    const moving = !this.preferences.reducedMotion && this.preferences.pose === 'walk';
    const clip = moving ? definition.clips.walk! : definition.clips.idle;
    const frame = moving ? characterFrameAtTime(clip, this.walkTimeMs) : 0;
    if (this.lastClip !== clip.assetId || this.lastFrame !== frame) {
      this.observer.setTexture(clipKey(clip), frame);
      this.lastClip = clip.assetId;
      this.lastFrame = frame;
    }
    const pose = r08ObserverPose(this.preferences.pose, this.walkTimeMs);
    this.observer.setPosition(pose.x, pose.y).setDepth(pose.y).setFlipX(pose.facing === 'left');
  }

  private resize(): void {
    if (!this.manifest) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const ratio = Number(this.registry.get('r08.pixelRatio')) || 1;
    const viewport = r08Viewport(width, height, this.preferences.framing);
    this.cameras.main.setViewport(0, 0, width, height).setZoom(viewport.zoom).centerOn(viewport.centerX, viewport.centerY);
    this.options.onTarget(r08ArchiveTarget(this.manifest.archive.sourceBounds, viewport, ratio, width / ratio, height / ratio));
  }

  private visitArchive(): void { if (this.ready) this.options.onVisitArchive(); }

  private publishDiagnostics(): void {
    this.registry.set('r08.preview', {
      ready: this.ready, phase: this.preferences.phase, reducedMotion: this.preferences.reducedMotion,
      twilightAvailable: this.twilightAvailable,
      pose: this.preferences.pose, actorHeightWorldPx: 48, sourceToWorldScale: R08_SOURCE_SCALE,
      sourceCanvas: [512, 288], worldCanvas: [960, 540], assets: this.manifest?.assets.map((asset) => asset.id),
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
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.images = [];
    this.lightImages = [];
    this.observer = undefined;
  }
}
