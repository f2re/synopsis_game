import Phaser from 'phaser';
import { worldBridge } from '../../bridge/WorldBridge';
import {
  characterFrameAtTime,
  characterTextureKey,
  normalizeAvatarPresentation,
  parseCharacterManifest,
  type WorldAvatarPresentation,
  type WorldCharacterClip,
  type WorldCharacterDefinition,
  type WorldCharacterManifest,
} from '../../runtime/characterAssets';
import { normalizeWorldPreferences, type WorldUiPreferences } from '../../runtime/uiPreferences';
import { getR01Layout } from './r01Layout';

const MANIFEST_KEY = 'hub.characters.manifest.v1';
const MANIFEST_URL = '/hub/characters/manifest.json';
const PACK_REGISTRY = 'world.characters.manifest';
const ERROR_REGISTRY = 'world.characters.loadErrors';
const MAX_ANIMATED_ACTORS = 3;

/** Dynamically enqueue accepted sheets after their semantic manifest arrives. */
export function preloadHubCharacters(scene: Phaser.Scene): void {
  const errors: string[] = [];
  scene.registry.set(ERROR_REGISTRY, errors);
  scene.registry.remove(PACK_REGISTRY);
  const queue = (raw: unknown) => {
    try {
      const pack = parseCharacterManifest(raw);
      scene.registry.set(PACK_REGISTRY, pack);
      for (const actor of pack.actors) {
        for (const clip of Object.values(actor.clips)) {
          const key = characterTextureKey(clip.assetId);
          if (!scene.textures.exists(key)) scene.load.spritesheet(key, clip.url, {
            frameWidth: clip.frameWidth, frameHeight: clip.frameHeight, startFrame: 0, endFrame: clip.frameCount - 1,
          });
        }
      }
      for (const item of pack.equipment) {
        const key = characterTextureKey(item.assetId);
        if (!scene.textures.exists(key)) scene.load.image(key, item.url);
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
  };
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
  scene.load.once(Phaser.Loader.Events.COMPLETE, clean);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, clean);
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
  state: 'idle' | 'walk';
  target?: { x: number; y: number };
}

/** Authored frames only. No breathing scale/tween, texture redraw or React frame events. */
export class HubCharacterLayer {
  private readonly actors: Actor[] = [];
  private readonly errors: string[];
  private readonly pack?: WorldCharacterManifest;
  private readonly unsubscribePresentation: () => void;
  private readonly equipment = new Map<string, Phaser.GameObjects.Image>();
  private preferences: WorldUiPreferences;
  private presentation: WorldAvatarPresentation;
  private layout: ReturnType<typeof getR01Layout>;
  private sampleTimeMs = 0;
  private destroyed = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.layout = getR01Layout(scene.scale.width, scene.scale.height);
    this.preferences = normalizeWorldPreferences(scene.registry.get('ui.preferences'));
    this.presentation = worldBridge.getAvatarPresentation();
    this.errors = [...(scene.registry.get(ERROR_REGISTRY) as string[] ?? [])];
    this.pack = scene.registry.get(PACK_REGISTRY) as WorldCharacterManifest | undefined;
    for (const definition of this.pack?.actors ?? []) {
      const clip = definition.clips.idle;
      if (!this.validTexture(clip)) continue;
      const image = scene.add.image(0, 0, characterTextureKey(clip.assetId), 0)
        .setOrigin(definition.pivot[0], definition.pivot[1])
        .setScale(definition.displayHeight / clip.frameHeight);
      this.actors.push({ definition, image, clip, elapsedMs: 0, frame: 0, state: 'idle' });
    }
    for (const item of this.pack?.equipment ?? []) {
      const key = characterTextureKey(item.assetId);
      if (!scene.textures.exists(key)) continue;
      const image = scene.add.image(0, 0, key).setOrigin(.5, .5).setVisible(false);
      image.setScale(item.displayHeight / image.height);
      image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.equipment.set(item.id, image);
    }
    this.unsubscribePresentation = worldBridge.on<WorldAvatarPresentation>('ui:avatar_presentation', (value) => {
      this.presentation = normalizeAvatarPresentation(value);
      this.applySelection();
    });
    scene.events.on('ui:preferences', this.applyPreferences, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.resize();
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
    this.layout = getR01Layout(this.scene.scale.width, this.scene.scale.height);
    for (const actor of this.actors) {
      const point = this.layout.portrait ? actor.definition.positions.portrait : actor.definition.positions.landscape;
      actor.image.setPosition(point[0], point[1]);
      actor.target = undefined;
      this.setClip(actor, actor.definition.motion && !this.preferences.reducedMotion ? 'walk' : 'idle');
      actor.elapsedMs = 0;
      actor.frame = 0;
      actor.image.setFrame(0);
      actor.image.setDepth(24 + point[1] / this.layout.height * 4);
    }
    this.applySelection();
  }

  private applySelection(): void {
    const playerPresent = this.actors.some((actor) => actor.definition.role === 'player');
    const priority = { player: 0, companion: 1, npc: 2 };
    this.actors.sort((a, b) => priority[a.definition.role] - priority[b.definition.role]);
    for (const actor of this.actors) {
      actor.image.setVisible(actor.definition.role !== 'companion' || (playerPresent && actor.definition.id === this.presentation.companion));
    }
    for (const [id, image] of this.equipment) image.setVisible(id === this.presentation.heldItem);
    this.placeEquipment();
    this.publishDiagnostics();
  }

  private placeEquipment(): void {
    const player = this.actors.find((actor) => actor.definition.role === 'player');
    for (const item of this.pack?.equipment ?? []) {
      const image = this.equipment.get(item.id);
      if (!image) continue;
      if (!player) { image.setVisible(false); continue; }
      image.setPosition(
        Math.round(player.image.x + item.anchor[0] * player.definition.displayHeight),
        Math.round(player.image.y + item.anchor[1] * player.definition.displayHeight),
      ).setDepth(player.image.depth + .01);
    }
  }

  private applyPreferences(value: unknown): void {
    this.preferences = normalizeWorldPreferences(value);
    this.sampleTimeMs = 0;
    if (this.preferences.reducedMotion) {
      for (const actor of this.actors) {
        if (actor.definition.motion) {
          const position = this.layout.portrait ? actor.definition.positions.portrait : actor.definition.positions.landscape;
          actor.image.setPosition(position[0], position[1]);
        }
        if (actor.target) {
          actor.image.setPosition(actor.target.x, actor.target.y);
          actor.target = undefined;
        }
        this.setClip(actor, 'idle');
        actor.elapsedMs = 0;
        actor.image.setFrame(0);
        actor.frame = 0;
      }
      this.placeEquipment();
    } else {
      for (const actor of this.actors) if (actor.definition.motion) this.setClip(actor, 'walk');
    }
    this.publishDiagnostics();
  }

  private setClip(actor: Actor, state: 'idle' | 'walk'): boolean {
    const clip = actor.definition.clips[state];
    if (!clip || !this.validTexture(clip)) return false;
    if (actor.clip !== clip) {
      actor.clip = clip;
      actor.state = state;
      actor.elapsedMs = 0;
      actor.frame = 0;
      actor.image.setTexture(characterTextureKey(clip.assetId), 0);
    }
    return true;
  }

  /** Explicit presentation command; absent walk art never becomes a sliding idle. */
  walkAvatarTo(x: number, y: number): void {
    const actor = this.actors.find((candidate) => candidate.definition.role === 'player');
    if (!actor || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const target = {
      x: Math.max(12, Math.min(this.layout.width - 12, x)),
      y: Math.max(this.layout.shore + actor.definition.displayHeight, Math.min(this.layout.height - 12, y)),
    };
    if (this.preferences.reducedMotion) {
      actor.image.setPosition(target.x, target.y);
      this.placeEquipment();
    } else {
      const facing = actor.definition.clips.walk?.facing;
      const dx = target.x - actor.image.x, dy = target.y - actor.image.y;
      const direction = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'back' : 'front');
      // A single facing is not a four-direction avatar. Asymmetric clothing and
      // held equipment are never mirrored without their own authored frames.
      if (facing === direction && this.setClip(actor, 'walk')) actor.target = target;
    }
    this.publishDiagnostics();
  }

  update(deltaMs: number): void {
    if (this.destroyed || this.preferences.reducedMotion) return;
    const delta = Math.max(0, Math.min(Number.isFinite(deltaMs) ? deltaMs : 0, 100));
    this.sampleTimeMs += delta;
    const sample = !this.preferences.lowPower || this.sampleTimeMs >= 250;
    let activeLoops = 0;
    let moved = false;
    let arrived = false;
    for (const actor of this.actors) {
      if (!actor.image.visible) continue;
      // Extra background actors stay in their authored first frame if a future
      // content pack contains more than this scene's three-actor budget (plus the existing fountain loop).
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
      if (actor.target) {
        moved = true;
        const dx = actor.target.x - actor.image.x;
        const dy = actor.target.y - actor.image.y;
        const distance = Math.hypot(dx, dy);
        const step = delta * .055;
        if (distance <= step) {
          actor.image.setPosition(actor.target.x, actor.target.y);
          actor.target = undefined;
          this.setClip(actor, 'idle');
          arrived = true;
        } else actor.image.setPosition(actor.image.x + dx / distance * step, actor.image.y + dy / distance * step);
        actor.image.setDepth(24 + actor.image.y / this.layout.height * 4);
      }
      if (!sample) continue;
      const frame = characterFrameAtTime(actor.clip, actor.elapsedMs);
      if (frame !== actor.frame) { actor.image.setFrame(frame); actor.frame = frame; }
    }
    if (sample) this.sampleTimeMs = 0;
    if (moved) this.placeEquipment();
    if (arrived) this.publishDiagnostics();
  }

  private publishDiagnostics(): void {
    const visible = this.actors.filter((actor) => actor.image.visible);
    const animated = visible.filter((actor) => actor.clip.frameCount > 1).length;
    const playerPresent = visible.some((actor) => actor.definition.role === 'player');
    const selectedCompanionReady = this.presentation.companion === 'companion.none' ||
      visible.some((actor) => actor.definition.role === 'companion' && actor.definition.id === this.presentation.companion);
    const selectedItemReady = this.presentation.heldItem === 'held.none' || (playerPresent && this.equipment.has(this.presentation.heldItem));
    const diagnostics = {
      artAccepted: this.pack?.artAcceptance === 'PASS',
      characterClass: 'r01-detailed-actor',
      playerPresent,
      personalizationScope: playerPresent ? 'world-and-inventory' : 'inventory-preview',
      visibleActors: visible.length,
      animatedActors: this.preferences.reducedMotion ? 0 : Math.min(animated, MAX_ANIMATED_ACTORS),
      animationBudget: MAX_ANIMATED_ACTORS,
      reducedMotion: this.preferences.reducedMotion,
      lowPower: this.preferences.lowPower,
      selectedItem: this.presentation.heldItem,
      selectedItemReady,
      selectedCompanion: this.presentation.companion,
      selectedCompanionReady,
      actors: visible.map((actor) => ({ id: actor.definition.id, state: actor.state, frames: actor.clip.frameCount, pivot: actor.definition.pivot })),
      errors: [...this.errors],
    };
    this.scene.registry.set('world.characters.diagnostics', diagnostics);
    worldBridge.emit('world:characters_ready', diagnostics);
  }

  destroy(): void {
    this.destroyed = true;
    this.unsubscribePresentation();
    this.scene.events.off('ui:preferences', this.applyPreferences, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.actors.forEach((actor) => actor.image.destroy());
    this.equipment.forEach((image) => image.destroy());
  }
}
