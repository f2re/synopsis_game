import Phaser from 'phaser';
import { worldBridge } from '../../bridge/WorldBridge';
import stationFauna from '../../assets/hub/station-fauna.json';
import {
  characterFrameAtTime,
  characterTextureKey,
  parseCharacterManifest,
  type WorldCharacterClip,
  type WorldCharacterAction,
  type WorldCharacterDefinition,
  type WorldCharacterManifest,
} from '../../runtime/characterAssets';
import { normalizeWorldPreferences, type WorldUiPreferences } from '../../runtime/uiPreferences';
import { getR01Layout } from './r01Layout';
import {
  stationCrowdPlan, stationCrowdPose, stationVisitorCount,
  STATION_CROWD_TEXTURES, STATION_VISITOR_LIMIT, STATION_VISITOR_LOW_POWER_LIMIT,
} from './stationCrowd';
import { isMovingFauna, stationFaunaPose, STATION_FAUNA_CYCLE_MS } from './stationFaunaMotion';

const MANIFEST_KEY = 'hub.characters.manifest.v1';
const MANIFEST_URL = '/hub/characters/manifest.json';
const PACK_REGISTRY = 'world.characters.manifest';
const ERROR_REGISTRY = 'world.characters.loadErrors';
const STATION_PRESENCE_EVENT = 'server:station_presence';
const MAX_ANIMATED_ACTORS = 3;
const MAX_ANIMATED_CROWD = 4;
const CROWD_SAMPLE_MS = 64;

/** Dynamically enqueue accepted sheets after their semantic manifest arrives. */
export function preloadHubCharacters(scene: Phaser.Scene): void {
  const errors: string[] = [];
  scene.registry.set(ERROR_REGISTRY, errors);
  scene.registry.remove(PACK_REGISTRY);
  const queue = (raw: unknown) => {
    try {
      const original = parseCharacterManifest(raw);
      const pack = parseCharacterManifest({ ...original, actors: [...original.actors, ...stationFauna.station] });
      scene.registry.set(PACK_REGISTRY, pack);
      for (const actor of pack.actors.filter((entry) => entry.role === 'npc' || entry.role === 'crowd')) {
        for (const clip of Object.values(actor.clips)) {
          const key = characterTextureKey(clip.assetId);
          if (!scene.textures.exists(key)) scene.load.spritesheet(key, clip.url, {
            frameWidth: clip.frameWidth, frameHeight: clip.frameHeight, startFrame: 0, endFrame: clip.frameCount - 1,
          });
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Character manifest rejected');
    }
  };
  const completeKey = `filecomplete-json-${MANIFEST_KEY}`;
  const fileComplete = (_key: string, _type: string, value: unknown) => queue(value);
  const failed = (file: Phaser.Loader.File) => {
    if (file.key === MANIFEST_KEY || file.key.startsWith('character:')) errors.push(`Asset unavailable: ${file.key}`);
  };
  const clean = () => {
    scene.load.off(completeKey, fileComplete);
    scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
    scene.load.off(Phaser.Loader.Events.COMPLETE, clean);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, clean);
    scene.events.off(Phaser.Scenes.Events.DESTROY, clean);
  };
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
  scene.load.once(Phaser.Loader.Events.COMPLETE, clean);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, clean);
  scene.events.once(Phaser.Scenes.Events.DESTROY, clean);
  if (scene.cache.json.exists(MANIFEST_KEY)) queue(scene.cache.json.get(MANIFEST_KEY));
  else {
    scene.load.once(completeKey, fileComplete);
    scene.load.json(MANIFEST_KEY, MANIFEST_URL);
  }
}

interface Actor {
  definition: WorldCharacterDefinition;
  image: Phaser.GameObjects.Image;
  clip: WorldCharacterClip;
  elapsedMs: number;
  frame: number;
  state: WorldCharacterAction;
  faunaReady: boolean;
}

type CrowdActor = { actor: Actor; plan: ReturnType<typeof stationCrowdPlan>[number] };

/** Authored frames only. No breathing scale/tween, texture redraw or React frame events. */
export class HubCharacterLayer {
  private readonly actors: Actor[] = [];
  private readonly crowd: CrowdActor[] = [];
  private readonly crowdWardrobe: WorldCharacterDefinition[];
  private readonly unsubscribePresence: () => void;
  private readonly errors: string[];
  private readonly pack?: WorldCharacterManifest;
  private preferences: WorldUiPreferences;
  private layout: ReturnType<typeof getR01Layout>;
  private sampleTimeMs = 0;
  private faunaTimeMs = 0;
  private crowdTimeMs = 0;
  private crowdSampleMs = 0;
  private visitors = 0;
  private destroyed = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.layout = getR01Layout(scene.scale.width, scene.scale.height, scene.registry.get('world.pixelRatio'));
    this.preferences = normalizeWorldPreferences(scene.registry.get('ui.preferences'));
    this.errors = [...(scene.registry.get(ERROR_REGISTRY) as string[] ?? [])];
    this.pack = scene.registry.get(PACK_REGISTRY) as WorldCharacterManifest | undefined;
    this.crowdWardrobe = STATION_CROWD_TEXTURES.flatMap((id) => {
      const definition = this.pack?.actors.find((entry) => entry.id === id && entry.role === 'crowd');
      return definition && Object.values(definition.clips).every((clip) => this.validTexture(clip)) ? [definition] : [];
    });
    const crowdEnabled = this.crowdWardrobe.length > 0;
    this.visitors = stationVisitorCount(scene.registry.get(STATION_PRESENCE_EVENT));
    this.unsubscribePresence = worldBridge.on<unknown>(STATION_PRESENCE_EVENT, (value) => {
      const count = stationVisitorCount(value);
      if (count === this.visitors) return;
      this.visitors = count;
      this.paintCrowd();
      this.publishDiagnostics();
    });
    for (const definition of this.pack?.actors ?? []) {
      // Fixed employees and campus fauna never receive account clothing or tools.
      if (definition.role !== 'npc' || (crowdEnabled && definition.id === 'character.r01.observer')) continue;
      const clip = definition.clips.idle;
      if (!this.validTexture(clip)) continue;
      const actions = definition.id === 'animal_squirrel' ? ['run'] as const : ['hop', 'flutter'] as const;
      const faunaReady = isMovingFauna(definition.id) && actions.every((action) => {
        const motion = definition.clips[action];
        return motion && this.validTexture(motion);
      });
      this.actors.push(this.createActor(definition, faunaReady));
    }
    if (crowdEnabled) {
      for (const plan of stationCrowdPlan(this.layout.portrait)) {
        const definition = this.crowdWardrobe[plan.costume % this.crowdWardrobe.length];
        this.crowd.push({ plan, actor: this.createActor(definition) });
      }
    }
    scene.events.on('ui:preferences', this.applyPreferences, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.resize();
  }

  private createActor(definition: WorldCharacterDefinition, faunaReady = false): Actor {
    const clip = definition.clips.idle;
    const image = this.scene.add.image(0, 0, characterTextureKey(clip.assetId), 0)
      .setOrigin(definition.pivot[0], definition.pivot[1])
      .setScale(definition.displayHeight / clip.frameHeight);
    return { definition, image, clip, elapsedMs: 0, frame: 0, state: 'idle', faunaReady };
  }

  private validTexture(clip: WorldCharacterClip): boolean {
    const key = characterTextureKey(clip.assetId);
    if (!this.scene.textures.exists(key)) return false;
    const texture = this.scene.textures.get(key);
    const source = texture.source[0];
    if (!source || source.width % clip.frameWidth || source.height % clip.frameHeight ||
        (source.width / clip.frameWidth) * (source.height / clip.frameHeight) !== clip.frameCount ||
        !texture.has(String(clip.frameCount - 1))) {
      this.errors.push(`Frame geometry differs from manifest: ${clip.assetId}`);
      return false;
    }
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return true;
  }

  private resize(): void {
    this.layout = getR01Layout(this.scene.scale.width, this.scene.scale.height, this.scene.registry.get('world.pixelRatio'));
    for (const actor of this.actors) {
      const point = this.layout.portrait ? actor.definition.positions.portrait : actor.definition.positions.landscape;
      actor.image.setPosition(point[0], point[1]);
      this.setClip(actor, actor.definition.motion && !this.preferences.reducedMotion ? 'walk' : 'idle');
      actor.elapsedMs = 0;
      actor.frame = 0;
      actor.image.setFrame(0);
      actor.image.setDepth(24 + point[1] / this.layout.height * 4);
    }
    if (this.crowd.length > 0) {
      const plans = stationCrowdPlan(this.layout.portrait);
      this.crowd.forEach((entry, index) => { entry.plan = plans[index]; });
      this.paintCrowd();
    }
    this.updateFauna();
    this.publishDiagnostics();
  }

  private applyPreferences(value: unknown): void {
    this.preferences = normalizeWorldPreferences(value);
    this.sampleTimeMs = 0;
    if (this.preferences.reducedMotion || this.preferences.lowPower) {
      this.faunaTimeMs = 0;
      this.updateFauna();
    }
    if (this.preferences.reducedMotion) {
      for (const actor of this.actors) {
        if (actor.definition.motion) {
          const position = this.layout.portrait ? actor.definition.positions.portrait : actor.definition.positions.landscape;
          actor.image.setPosition(position[0], position[1]);
        }
        this.setClip(actor, 'idle');
        actor.elapsedMs = 0;
        actor.image.setFrame(0);
        actor.frame = 0;
      }
    } else {
      for (const actor of this.actors) if (actor.definition.motion) this.setClip(actor, 'walk');
    }
    this.paintCrowd();
    this.publishDiagnostics();
  }

  private setClip(actor: Actor, state: WorldCharacterAction): boolean {
    const clip = actor.definition.clips[state];
    if (!clip) return false;
    if (actor.clip !== clip) {
      if (!this.validTexture(clip)) return false;
      actor.clip = clip;
      actor.state = state;
      actor.elapsedMs = 0;
      actor.frame = 0;
      actor.image.setTexture(characterTextureKey(clip.assetId), 0);
    }
    return true;
  }

  private updateFauna(): void {
    for (const actor of this.actors) {
      if (!actor.faunaReady) continue;
      const pose = stationFaunaPose(actor.definition.id, this.faunaTimeMs, this.layout.portrait);
      const point = this.layout.portrait ? actor.definition.positions.portrait : actor.definition.positions.landscape;
      this.setClip(actor, pose.action);
      const x = Math.round(point[0] + pose.x), y = Math.round(point[1] + pose.y);
      if (actor.image.x !== x || actor.image.y !== y) actor.image.setPosition(x, y);
      if (actor.image.flipX !== pose.facingRight) actor.image.setFlipX(pose.facingRight);
      if (pose.action === 'idle') continue;
      const total = actor.clip.durationsMs.reduce((sum, duration) => sum + duration, 0);
      const elapsed = pose.action === 'run' ? pose.elapsed : total * pose.elapsed / pose.duration;
      const frame = characterFrameAtTime(actor.clip, elapsed);
      if (frame !== actor.frame) { actor.image.setFrame(frame); actor.frame = frame; }
    }
  }

  applyLighting(tint: number): void {
    for (const actor of this.actors) actor.image.setTint(tint);
    for (const { actor } of this.crowd) actor.image.setTint(tint);
  }

  private paintCrowd(): void {
    const limit = this.preferences.lowPower ? STATION_VISITOR_LOW_POWER_LIMIT : STATION_VISITOR_LIMIT;
    const online = Math.min(this.visitors, limit);
    for (const { plan, actor } of this.crowd) {
      const visible = plan.visitors <= online;
      const image = actor.image;
      if (image.visible !== visible) image.setVisible(visible);
      if (!visible) continue;
      const still = this.preferences.reducedMotion || (this.preferences.lowPower && plan.visitors > 0);
      const pose = stationCrowdPose(plan, this.crowdTimeMs, still, online);
      this.setClip(actor, pose.action);
      const x = Math.round(pose.x), y = Math.round(pose.y);
      if (image.x !== x || image.y !== y) image.setPosition(x, y);
      if (image.flipX !== pose.facesLeft) image.setFlipX(pose.facesLeft);
      const depth = (plan.action === 'sit' ? 30.2 : 24) + y / this.layout.height * 4;
      if (image.depth !== depth) image.setDepth(depth);
      const frame = characterFrameAtTime(actor.clip, pose.elapsed);
      if (frame !== actor.frame) { image.setFrame(frame); actor.frame = frame; }
    }
  }

  update(deltaMs: number): void {
    if (this.destroyed || this.preferences.reducedMotion) return;
    const delta = Math.max(0, Math.min(Number.isFinite(deltaMs) ? deltaMs : 0, 100));
    this.sampleTimeMs += delta;
    this.crowdTimeMs += delta;
    this.crowdSampleMs += delta;
    const crowdInterval = this.preferences.lowPower ? 250 : CROWD_SAMPLE_MS;
    if (this.crowd.length > 0 && this.crowdSampleMs >= crowdInterval) {
      this.crowdSampleMs %= crowdInterval;
      this.paintCrowd();
    }
    if (!this.preferences.lowPower) {
      this.faunaTimeMs = (this.faunaTimeMs + delta) % STATION_FAUNA_CYCLE_MS;
      this.updateFauna();
    }
    const sample = !this.preferences.lowPower || this.sampleTimeMs >= 250;
    let activeLoops = 0;
    for (const actor of this.actors) {
      if (!actor.image.visible) continue;
      if (isMovingFauna(actor.definition.id)) continue;
      // Extra background actors stay in their authored first frame if a future
      // content pack contains more than this scene's three-actor budget (plus the existing fountain loop).
      if (actor.clip.frameCount === 1 && actor.state === 'idle') continue;
      if (actor.clip.frameCount > 1 && activeLoops++ >= MAX_ANIMATED_ACTORS) {
        if (actor.frame !== 0) { actor.image.setFrame(0); actor.frame = 0; }
        continue;
      }
      actor.elapsedMs += delta;
      if (actor.definition.motion && actor.state === 'walk') {
        const direction = actor.definition.motion.direction === 'right' ? 1 : -1;
        const visibleWidth = this.scene.scale.width / this.layout.zoom;
        const margin = actor.definition.displayHeight * actor.clip.frameWidth / actor.clip.frameHeight + 16;
        const left = (this.layout.width - visibleWidth) / 2 - margin;
        const right = (this.layout.width + visibleWidth) / 2 + margin;
        let x = actor.image.x + direction * actor.definition.motion.speed * delta / 1000;
        if (direction > 0 && x > right) x = left;
        else if (direction < 0 && x < left) x = right;
        actor.image.setPosition(x, actor.image.y);
      }
      if (!sample) continue;
      const frame = characterFrameAtTime(actor.clip, actor.elapsedMs);
      if (frame !== actor.frame) { actor.image.setFrame(frame); actor.frame = frame; }
    }
    if (sample) this.sampleTimeMs = 0;
  }

  private publishDiagnostics(): void {
    const visible = this.actors.filter((actor) => actor.image.visible);
    const crowd = this.crowd.filter(({ actor }) => actor.image.visible);
    const animated = visible.filter((actor) => !isMovingFauna(actor.definition.id) && actor.clip.frameCount > 1).length;
    const diagnostics = {
      artAccepted: this.pack?.artAcceptance === 'PASS',
      characterClass: 'r01-detailed-actor',
      playerPresent: false,
      personalizationScope: 'saved-portrait',
      visibleActors: visible.length + crowd.length,
      onlineVisitors: crowd.filter(({ plan }) => plan.visitors > 0).length,
      animatedActors: this.preferences.reducedMotion ? 0 : Math.min(animated, MAX_ANIMATED_ACTORS),
      animationBudget: MAX_ANIMATED_ACTORS,
      crowdAnimationBudget: this.preferences.reducedMotion ? 0 : this.preferences.lowPower ? 2 : MAX_ANIMATED_CROWD,
      faunaAnimationBudget: this.preferences.lowPower || this.preferences.reducedMotion ? 0 : 1,
      reducedMotion: this.preferences.reducedMotion,
      lowPower: this.preferences.lowPower,
      actors: [
        ...visible.map((actor) => ({ id: actor.definition.id, state: actor.state, frames: actor.clip.frameCount, pivot: actor.definition.pivot })),
        ...crowd.map(({ actor, plan }) => ({ id: plan.id, state: actor.state, frames: actor.clip.frameCount, pivot: actor.definition.pivot })),
      ],
      errors: [...this.errors],
    };
    this.scene.registry.set('world.characters.diagnostics', diagnostics);
    worldBridge.emit('world:characters_ready', diagnostics);
  }

  destroy(): void {
    this.destroyed = true;
    this.unsubscribePresence();
    this.scene.events.off('ui:preferences', this.applyPreferences, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.actors.forEach((actor) => actor.image.destroy());
    this.crowd.forEach(({ actor }) => actor.image.destroy());
  }
}
