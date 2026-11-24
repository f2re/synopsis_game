import Phaser from 'phaser';
import { worldBridge } from '../../bridge/WorldBridge';
import stationFauna from '../../assets/hub/station-fauna.json';
import {
  characterFrameAtTime,
  characterPatrolPose,
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
import { r08WalkFrame } from '../art/r08Gait';
import { R09_ACTOR_SPACE, r09ActorDepth, r09CharacterDefinition, r09CrowdPlan, r09FaunaOffset, r09HasContactShadow, r09PatrolPlan } from './r09ActorLayout';

const MANIFEST_KEY = 'hub.characters.manifest.v1';
const MANIFEST_URL = '/hub/characters/manifest.json';
const PACK_REGISTRY = 'world.characters.manifest';
const ERROR_REGISTRY = 'world.characters.loadErrors';
const STATION_PRESENCE_EVENT = 'server:station_presence';
const MAX_ANIMATED_ACTORS = 3;
const MAX_ANIMATED_CROWD = 4;
const CROWD_SAMPLE_MS = 64;

/** Dynamically enqueue accepted sheets after their semantic manifest arrives. */
export function preloadHubCharacters(scene: Phaser.Scene, adaptClip?: (clip: WorldCharacterClip) => WorldCharacterClip): void {
  const errors: string[] = [];
  scene.registry.set(ERROR_REGISTRY, errors);
  scene.registry.remove(PACK_REGISTRY);
  const queue = (raw: unknown) => {
    try {
      const original = parseCharacterManifest(raw);
      const pack = parseCharacterManifest({ ...original, actors: [...original.actors, ...stationFauna.station] });
      if (adaptClip) for (const actor of pack.actors) {
        const clips = actor.clips;
        for (const action of Object.keys(clips) as WorldCharacterAction[]) {
          const clip = clips[action];
          if (clip) clips[action] = adaptClip(clip);
        }
      }
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
  patrol?: { plan: NonNullable<ReturnType<typeof r09PatrolPlan>>; timeMs: number };
  tint?: number;
  nearLamp?: boolean;
  shadow?: Phaser.GameObjects.Ellipse;
}

export interface StationActorLighting {
  ambient: number;
  lamp?: number;
  resolveTexture?: (sourceKey: string, tint: number, variant: string) => string;
}

type CrowdActor = { actor: Actor; plan: ReturnType<typeof stationCrowdPlan>[number] };
export interface HubCharacterLayerOptions { profile?: 'r01' | 'r09' }

export interface StationCharacterPlacement {
  placeActor: (definition: WorldCharacterDefinition) => WorldCharacterDefinition | undefined;
  crowd: ReturnType<typeof stationCrowdPlan>;
  patrol?: ReturnType<typeof stationCrowdPlan>[number];
  walkFrame?: (distance: number) => number;
}

/** Authored frames stay on the source grid. Lighting changes reuse tint textures. */
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
  private readonly profile: 'r01' | 'r09';
  private readonly placement?: StationCharacterPlacement;
  private r09Placed = false;
  private readonly contactShadows?: Phaser.GameObjects.Graphics;
  private shadowsDirty = true;
  private lighting: StationActorLighting = { ambient: 0xffffff };

  constructor(private readonly scene: Phaser.Scene, options: HubCharacterLayerOptions | StationCharacterPlacement = {}) {
    this.profile = 'profile' in options ? options.profile ?? 'r01' : 'r01';
    this.placement = 'placeActor' in options ? options : undefined;
    this.layout = getR01Layout(scene.scale.width, scene.scale.height, scene.registry.get('world.pixelRatio'));
    if (this.profile === 'r09') {
      this.layout = { ...this.layout, ...R09_ACTOR_SPACE, portrait: false, zoom: 1 };
      this.contactShadows = scene.add.graphics().setDepth(19.8);
    }
    this.preferences = normalizeWorldPreferences(scene.registry.get('ui.preferences'));
    this.errors = [...(scene.registry.get(ERROR_REGISTRY) as string[] ?? [])];
    this.pack = scene.registry.get(PACK_REGISTRY) as WorldCharacterManifest | undefined;
    this.crowdWardrobe = STATION_CROWD_TEXTURES.flatMap((id) => {
      const original = this.pack?.actors.find((entry) => entry.id === id && entry.role === 'crowd');
      // Custom R08 placement filters fixed NPCs; its crowd uses the authored
      // wardrobe and explicit crowd routes. R09 also rescales crowd artwork.
      const definition = original && (this.profile === 'r09' ? r09CharacterDefinition(original) : original);
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
    for (const original of this.pack?.actors ?? []) {
      // Fixed employees and campus fauna never receive account clothing or tools.
      if (original.role !== 'npc') continue;
      const definition = this.definitionForScene(original);
      if (!definition) continue;
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
      for (const plan of this.getCrowdPlan()) {
        const definition = this.crowdWardrobe[plan.costume % this.crowdWardrobe.length];
        this.crowd.push({ plan, actor: this.createActor(definition) });
      }
    }
    scene.events.on('ui:preferences', this.applyPreferences, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.resize();
  }

  private definitionForScene(source: WorldCharacterDefinition): WorldCharacterDefinition | undefined {
    return this.profile === 'r09' ? r09CharacterDefinition(source) : this.placement ? this.placement.placeActor(source) : source;
  }

  private getCrowdPlan() {
    return this.profile === 'r09' ? r09CrowdPlan() : this.placement?.crowd ?? stationCrowdPlan(this.layout.portrait);
  }

  private place(image: Phaser.GameObjects.Image, x: number, y: number): void {
    if (image.x === x && image.y === y) return;
    if (Math.round(image.x) !== Math.round(x) || Math.round(image.y) !== Math.round(y)) this.shadowsDirty = true;
    image.setPosition(x, y);
  }

  private placeOnRoute(actor: Actor, pose: ReturnType<typeof stationCrowdPose>): void {
    // While walking, align to the scaled sprite texel so support motion and
    // step cels keep the same grid. Seated and standing anchors stay integral.
    const grid = this.profile === 'r09' && pose.action === 'walk'
      ? actor.clip.frameHeight / actor.definition.displayHeight : 1;
    this.place(actor.image, Math.round(pose.x * grid) / grid, Math.round(pose.y));
  }

  private paintContactShadows(): void {
    if (!this.contactShadows || !this.shadowsDirty) return;
    this.contactShadows.clear();
    for (const actor of [...this.actors, ...this.crowd.map(({ actor }) => actor)]) {
      if (!actor.image.visible) continue;
      this.paintActorLight(actor);
      if (!r09HasContactShadow(actor.definition)) continue;
      const x = Math.round(actor.image.x), y = Math.round(actor.image.y);
      this.contactShadows.fillStyle(0x101b25, .28).fillRect(x - 3, y, 7, 1);
      this.contactShadows.fillStyle(0x101b25, .18).fillRect(x - 2, y + 1, 5, 1);
    }
    this.shadowsDirty = false;
  }

  private createActor(definition: WorldCharacterDefinition, faunaReady = false): Actor {
    const clip = definition.clips.idle;
    const image = this.scene.add.image(0, 0, characterTextureKey(clip.assetId), 0)
      .setOrigin(definition.pivot[0], definition.pivot[1])
      .setScale(definition.displayHeight / clip.frameHeight);
    const shadow = this.placement && definition.id !== 'bird_tit'
      ? this.scene.add.ellipse(0, 0, definition.displayHeight * .24, 4, 0x233339, .52)
      : undefined;
    const plan = this.profile === 'r09' ? r09PatrolPlan(definition) : undefined;
    return { definition, image, clip, elapsedMs: 0, frame: 0, state: 'idle', faunaReady, shadow,
      patrol: plan && { plan, timeMs: 0 } };
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
    // Phaser reuploads the sheet even when setFilter receives its current mode.
    if (source.scaleMode !== Phaser.Textures.FilterMode.NEAREST) texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return true;
  }

  private resize(): void {
    // A crop/pan/resize changes the camera, not a worker's route or animation clock.
    if (this.profile === 'r09' && this.r09Placed) return;
    if (this.profile === 'r01') this.layout = getR01Layout(this.scene.scale.width, this.scene.scale.height, this.scene.registry.get('world.pixelRatio'));
    for (const actor of this.actors) {
      const point = this.layout.portrait ? actor.definition.positions.portrait : actor.definition.positions.landscape;
      this.place(actor.image, point[0], point[1]);
      if (actor.definition.motion) actor.image.setFlipX(false);
      this.setClip(actor, actor.definition.motion && !this.preferences.reducedMotion ? 'walk' : 'idle');
      actor.elapsedMs = 0;
      actor.frame = 0;
      actor.image.setFrame(0);
      if (this.placement) this.placeDepth(actor);
      else actor.image.setDepth(this.profile === 'r09' ? r09ActorDepth(point[1]) : actor.definition.motion?.patrol?.depth ?? 24 + point[1] / this.layout.height * 4);
      if (actor.patrol && !this.preferences.reducedMotion) this.paintPatrol(actor, actor.patrol.plan);
    }
    if (this.crowd.length > 0) {
      const plans = this.getCrowdPlan();
      this.crowd.forEach((entry, index) => { entry.plan = plans[index]; });
      this.paintCrowd();
    }
    this.updateFauna();
    this.r09Placed = this.profile === 'r09';
    this.paintContactShadows();
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
          this.place(actor.image, position[0], position[1]);
          this.placeDepth(actor);
          actor.image.setFlipX(false);
        }
        this.setClip(actor, 'idle');
        actor.elapsedMs = 0;
        if (actor.patrol) actor.patrol.timeMs = 0;
        actor.image.setFrame(0);
        actor.frame = 0;
      }
    } else {
      for (const actor of this.actors) {
        if (actor.patrol) this.paintPatrol(actor, actor.patrol.plan);
        else if (actor.definition.motion) this.setClip(actor, 'walk');
      }
    }
    this.paintCrowd();
    this.paintContactShadows();
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
      if (this.lighting.resolveTexture) this.paintActorLight(actor, true);
    }
    return true;
  }

  private updateFauna(): void {
    for (const actor of this.actors) {
      if (!actor.faunaReady) continue;
      const pose = stationFaunaPose(actor.definition.id, this.faunaTimeMs, this.layout.portrait);
      const point = this.layout.portrait ? actor.definition.positions.portrait : actor.definition.positions.landscape;
      this.setClip(actor, pose.action);
      const offset = this.profile === 'r09' ? r09FaunaOffset(pose.x, pose.y) : [pose.x, pose.y];
      const x = Math.round(point[0] + offset[0]), y = Math.round(point[1] + offset[1]);
      this.place(actor.image, x, y);
      this.placeDepth(actor);
      if (actor.image.flipX !== pose.facingRight) actor.image.setFlipX(pose.facingRight);
      if (pose.action === 'idle') continue;
      const total = actor.clip.durationsMs.reduce((sum, duration) => sum + duration, 0);
      const elapsed = pose.action === 'run' ? pose.elapsed : total * pose.elapsed / pose.duration;
      const frame = characterFrameAtTime(actor.clip, elapsed);
      if (frame !== actor.frame) { actor.image.setFrame(frame); actor.frame = frame; }
    }
  }

  applyLighting(lighting: StationActorLighting): void {
    this.lighting = lighting;
    for (const actor of this.actors) this.paintActorLight(actor, true);
    for (const { actor } of this.crowd) {
      if (!lighting.resolveTexture || actor.image.visible) this.paintActorLight(actor, true);
    }
  }

  private paintActorLight(actor: Actor, force = false): void {
    const { ambient, lamp, resolveTexture } = this.lighting;
    // The archive lamp reaches the adjoining path. Sampling at the foot keeps
    // the light attached to the courtyard as an actor walks past.
    const nearLamp = lamp !== undefined && ((actor.image.x - 294) / 16) ** 2 + ((actor.image.y - 211) / 10) ** 2 <= 1;
    const tint = nearLamp && lamp !== undefined ? lamp : ambient;
    if (!force && actor.tint === tint && actor.nearLamp === nearLamp) return;
    actor.tint = tint;
    actor.nearLamp = nearLamp;
    if (resolveTexture) {
      const key = resolveTexture(characterTextureKey(actor.clip.assetId), tint, nearLamp ? 'actor-lamp' : 'actor-ambient');
      actor.image.setTexture(key, actor.frame);
    } else {
      actor.image.setTint(tint);
    }
  }

  private paintCrowd(): void {
    const limit = this.preferences.lowPower ? STATION_VISITOR_LOW_POWER_LIMIT : STATION_VISITOR_LIMIT;
    const online = Math.min(this.visitors, limit);
    for (const { plan, actor } of this.crowd) {
      const visible = plan.visitors <= online;
      const image = actor.image;
      if (image.visible !== visible) { image.setVisible(visible); this.shadowsDirty = true; }
      if (actor.shadow && actor.shadow.visible !== visible) actor.shadow.setVisible(visible);
      if (!visible) continue;
      const still = this.preferences.reducedMotion || (this.preferences.lowPower && (this.placement !== undefined || plan.visitors > 0));
      const pose = stationCrowdPose(plan, this.crowdTimeMs, still, online);
      this.setClip(actor, pose.action);
      const y = Math.round(pose.y);
      this.placeOnRoute(actor, pose);
      if (image.flipX !== pose.facesLeft) image.setFlipX(pose.facesLeft);
      if (this.placement) this.placeDepth(actor);
      else {
        const depth = this.profile === 'r09' ? r09ActorDepth(y) : (plan.action === 'sit' ? 30.2 : 24) + y / this.layout.height * 4;
        if (image.depth !== depth) image.setDepth(depth);
      }
      const frame = this.plannedFrame(actor, plan, pose);
      if (frame !== actor.frame) { image.setFrame(frame); actor.frame = frame; }
    }
    this.paintContactShadows();
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
      if (actor.patrol) {
        actor.patrol.timeMs += delta;
        if (sample) this.paintPatrol(actor, actor.patrol.plan);
        continue;
      }
      if (this.placement?.patrol && actor.definition.motion) {
        if (sample) this.paintPatrol(actor, this.placement.patrol);
        continue;
      }
      // Extra background actors stay in their authored first frame if a future
      // content pack contains more than this scene's three-actor budget (plus the existing fountain loop).
      if (actor.clip.frameCount === 1 && actor.state === 'idle') continue;
      if (actor.clip.frameCount > 1 && activeLoops++ >= MAX_ANIMATED_ACTORS) {
        if (actor.frame !== 0) { actor.image.setFrame(0); actor.frame = 0; }
        continue;
      }
      actor.elapsedMs += delta;
      if (actor.definition.motion && actor.state === 'walk') {
        const patrol = characterPatrolPose(actor.definition, actor.elapsedMs, this.layout.portrait);
        if (patrol) {
          this.place(actor.image, patrol.x, patrol.y);
          this.placeDepth(actor);
          if (actor.image.flipX !== patrol.flipX) actor.image.setFlipX(patrol.flipX);
        } else {
          const direction = actor.definition.motion.direction === 'right' ? 1 : -1;
          const visibleWidth = this.scene.scale.width / this.layout.zoom;
          const margin = actor.definition.displayHeight * actor.clip.frameWidth / actor.clip.frameHeight + 16;
          const left = (this.layout.width - visibleWidth) / 2 - margin;
          const right = (this.layout.width + visibleWidth) / 2 + margin;
          let x = actor.image.x + direction * actor.definition.motion.speed * delta / 1000;
          if (direction > 0 && x > right) x = left;
          else if (direction < 0 && x < left) x = right;
          this.place(actor.image, x, actor.image.y);
        }
      }
      if (!sample) continue;
      const frame = characterFrameAtTime(actor.clip, actor.elapsedMs);
      if (frame !== actor.frame) { actor.image.setFrame(frame); actor.frame = frame; }
    }
    if (sample) this.sampleTimeMs = 0;
    this.paintContactShadows();
  }

  private plannedFrame(actor: Actor, plan: CrowdActor['plan'], pose: ReturnType<typeof stationCrowdPose>): number {
    if (pose.action === 'walk' && plan.action === 'walk') {
      const length = Math.hypot(plan.to[0] - plan.from[0], plan.to[1] - plan.from[1]);
      const distance = length * pose.elapsed / plan.travelMs;
      if (this.profile === 'r09') {
        return r08WalkFrame(distance * actor.clip.frameHeight / actor.definition.displayHeight, actor.clip.frameCount);
      }
      if (this.placement?.walkFrame) return Math.min(actor.clip.frameCount - 1, this.placement.walkFrame(distance));
    }
    return characterFrameAtTime(actor.clip, pose.elapsed);
  }

  private paintPatrol(actor: Actor, plan: CrowdActor['plan']): void {
    const pose = stationCrowdPose(plan, actor.patrol?.timeMs ?? this.crowdTimeMs, !actor.patrol && this.preferences.lowPower, 0);
    this.setClip(actor, pose.action);
    this.placeOnRoute(actor, pose);
    if (actor.image.flipX !== pose.facesLeft) actor.image.setFlipX(pose.facesLeft);
    this.placeDepth(actor);
    const frame = this.plannedFrame(actor, plan, pose);
    if (actor.frame !== frame) { actor.image.setFrame(frame); actor.frame = frame; }
  }

  private placeDepth({ image, shadow }: Actor): void {
    if (!this.placement) return;
    if (image.depth !== image.y) image.setDepth(image.y);
    if (shadow && (shadow.x !== image.x || shadow.y !== image.y)) {
      shadow.setPosition(image.x, image.y).setDepth(image.y - .25);
    }
  }

  private publishDiagnostics(): void {
    const visible = this.actors.filter((actor) => actor.image.visible);
    const crowd = this.crowd.filter(({ actor }) => actor.image.visible);
    const animated = visible.filter((actor) => !isMovingFauna(actor.definition.id) && actor.clip.frameCount > 1).length;
    const diagnostics = {
      artAccepted: this.pack?.artAcceptance === 'PASS',
      characterClass: this.placement ? 'r08-station-actor' : 'r02-station-actor',
      placementProfile: this.placement ? 'r08' : this.profile,
      ...(this.profile === 'r09' ? { logicalSpace: R09_ACTOR_SPACE } : {}),
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
    for (const actor of this.actors.concat(this.crowd.map(({ actor }) => actor))) {
      actor.shadow?.destroy();
      actor.image.destroy();
    }
    this.contactShadows?.destroy();
  }
}
