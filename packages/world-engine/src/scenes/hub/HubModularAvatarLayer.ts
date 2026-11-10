import Phaser from 'phaser';
import { worldBridge } from '../../bridge/WorldBridge';
import { avatarFrameAtTime, avatarProfileKey, type AvatarAction, type AvatarDirection, type ModularAvatarProfile } from '../../runtime/modularAvatarManifest';
import { modularAvatarCompositor, type AvatarComposite, type AvatarLease, type AvatarSheet } from '../../runtime/modularAvatarCompositor';
import { normalizeWorldPreferences, type WorldUiPreferences } from '../../runtime/uiPreferences';
import type { WorldAvatarPresentation } from '../../runtime/characterAssets';
import { getR01Layout } from './r01Layout';

let instanceId = 0;
const DISPLAY_SCALE = .5; // Native 96×144 → 48×72; nearest-neighbour sampling.

/** One saved personal body and an optional independent companion, never an NPC skin. */
export class HubModularAvatarLayer {
  private readonly texturePrefix = `player-modular-${++instanceId}`;
  private readonly unsubscribe: () => void;
  private preferences: WorldUiPreferences;
  private profile: ModularAvatarProfile | null = null;
  private lease?: AvatarLease<AvatarComposite>;
  private body?: Phaser.GameObjects.Image;
  private companion?: Phaser.GameObjects.Image;
  private textureKeys: string[] = [];
  private request = 0;
  private destroyed = false;
  private direction: AvatarDirection = 'down';
  private action: AvatarAction = 'idle';
  private elapsed = 0;
  private sampleTime = 0;
  private frame = 0;
  private point = { x: 556, y: 490 };
  private target?: { x: number; y: number };
  private error: string | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly reserveBudget: (actors: number) => void) {
    this.preferences = normalizeWorldPreferences(scene.registry.get('ui.preferences'));
    this.unsubscribe = worldBridge.on<WorldAvatarPresentation>('ui:avatar_presentation', (value) => this.setProfile(value.profile ?? null));
    scene.events.on('ui:preferences', this.applyPreferences, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.resize();
    this.setProfile(worldBridge.getAvatarPresentation().profile ?? null);
  }

  private setProfile(profile: ModularAvatarProfile | null): void {
    if (profile && this.profile && avatarProfileKey(profile) === avatarProfileKey(this.profile)) return;
    this.request++;
    this.clearVisuals(); // An account switch cannot display a previous person's outfit.
    this.profile = profile ? { ...profile } : null;
    this.action = 'idle'; this.target = undefined; this.direction = 'down';
    this.error = null;
    if (profile) void this.setPose('idle', 'down');
    else this.publish();
  }

  private async setPose(action: AvatarAction, direction: AvatarDirection): Promise<void> {
    if (!this.profile || this.destroyed) return;
    this.action = action; this.direction = direction;
    const request = ++this.request;
    try {
      const lease = await modularAvatarCompositor.acquire(this.profile, direction, action);
      if (this.destroyed || request !== this.request) { lease.release(); return; }
      this.clearVisuals();
      this.lease = lease;
      this.elapsed = 0; this.sampleTime = 0; this.frame = 0;
      this.error = lease.value.action !== action ? `Clip ${action} is not accepted; displaying idle` : null;
      if (lease.value.action !== 'walk') this.target = undefined;
      this.body = this.createImage(lease.value.body, 'body', lease.value.clip.durationsMs.length);
      if (lease.value.companion) this.companion = this.createImage(lease.value.companion, 'companion', lease.value.clip.durationsMs.length);
      this.reserveBudget(this.companion ? 2 : 1);
      this.place();
      this.publish();
    } catch (error) {
      if (this.destroyed || request !== this.request) return;
      this.clearVisuals();
      this.error = error instanceof Error ? error.message : 'Modular avatar unavailable';
      this.publish();
    }
  }

  private createImage(sheet: AvatarSheet, suffix: string, frames: number): Phaser.GameObjects.Image {
    const key = `${this.texturePrefix}-${suffix}`;
    // Phaser owns this upload surface; destroying a scene cannot erase the shared CPU cache.
    const texture = this.scene.textures.createCanvas(key, sheet.canvas.width, sheet.canvas.height);
    if (!texture) throw new Error('Modular avatar: Phaser texture allocation failed');
    this.textureKeys.push(key);
    texture.context.imageSmoothingEnabled = false;
    texture.context.drawImage(sheet.canvas, 0, 0);
    for (let index = 0; index < frames; index++) texture.add(String(index), 0, index * sheet.frame.width, 0, sheet.frame.width, sheet.frame.height);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return this.scene.add.image(0, 0, key, 0)
      .setOrigin(sheet.frame.pivot[0] / sheet.frame.width, sheet.frame.pivot[1] / sheet.frame.height)
      .setScale(DISPLAY_SCALE);
  }

  private resize(): void {
    const layout = getR01Layout(this.scene.scale.width, this.scene.scale.height);
    this.point = layout.portrait ? { x: 241, y: 595 } : { x: 556, y: 490 };
    this.target = undefined;
    this.place();
    if (this.action === 'walk') void this.setPose('idle', this.direction);
  }

  private place(): void {
    const layout = getR01Layout(this.scene.scale.width, this.scene.scale.height);
    const depth = 24 + this.point.y / layout.height * 4;
    this.body?.setPosition(Math.round(this.point.x), Math.round(this.point.y)).setDepth(depth);
    const child = this.lease?.value.companion;
    if (this.companion && child) this.companion.setPosition(
      Math.round(this.point.x + child.anchor[0] * DISPLAY_SCALE), Math.round(this.point.y + child.anchor[1] * DISPLAY_SCALE),
    ).setDepth(depth + (child.anchor[1] < 0 ? -.01 : .01));
  }

  private applyPreferences(value: unknown): void {
    this.preferences = normalizeWorldPreferences(value);
    this.sampleTime = 0;
    if (this.preferences.reducedMotion) {
      if (this.target) { this.point = this.target; this.target = undefined; this.place(); }
      this.elapsed = 0; this.frame = 0;
      this.body?.setFrame(0); this.companion?.setFrame(0);
      if (this.action !== 'idle') void this.setPose('idle', this.direction);
    }
    this.publish();
  }

  walkAvatarTo(x: number, y: number): void {
    if (!this.profile || !this.lease || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const layout = getR01Layout(this.scene.scale.width, this.scene.scale.height);
    const target = { x: Math.max(24, Math.min(layout.width - 24, x)), y: Math.max(layout.shore + 72, Math.min(layout.height - 12, y)) };
    const dx = target.x - this.point.x, dy = target.y - this.point.y;
    const direction: AvatarDirection = Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
    if (this.preferences.reducedMotion) { this.point = target; this.place(); void this.setPose('idle', direction); return; }
    this.target = target;
    void this.setPose('walk', direction);
  }

  update(deltaMs: number): void {
    if (this.destroyed || this.preferences.reducedMotion || !this.lease) return;
    const delta = Math.max(0, Math.min(Number.isFinite(deltaMs) ? deltaMs : 0, 100));
    if (this.target && this.lease.value.action === 'walk' && this.lease.value.direction === this.direction) {
      const dx = this.target.x - this.point.x, dy = this.target.y - this.point.y;
      const distance = Math.hypot(dx, dy), step = delta * .055;
      if (distance <= step) {
        this.point = this.target; this.target = undefined;
        void this.setPose('idle', this.direction);
      } else { this.point.x += dx / distance * step; this.point.y += dy / distance * step; }
      this.place();
    }
    this.elapsed += delta; this.sampleTime += delta;
    if (this.preferences.lowPower && this.sampleTime < 250) return;
    this.sampleTime = 0;
    const state = avatarFrameAtTime(this.lease.value.clip, this.elapsed);
    if (state.frame !== this.frame) { this.frame = state.frame; this.body?.setFrame(this.frame); this.companion?.setFrame(this.frame); }
  }

  private publish(): void {
    const value = this.lease?.value;
    const actors = this.body ? this.companion ? 2 : 1 : 0;
    const diagnostic = { rig: value?.manifest.rigId ?? 'player.modular.r01.v1', revision: value?.manifest.revision ?? null,
      ready: Boolean(this.body), profilePresent: Boolean(this.profile), profileKey: this.profile ? avatarProfileKey(this.profile) : null,
      compositeKey: value?.key ?? null, requestedAction: this.action, action: value?.action ?? null, direction: this.direction,
      companion: this.profile?.companion ?? 'companion.none', visibleActors: actors,
      animatedActors: this.preferences.reducedMotion ? 0 : actors, sceneAnimationBudget: 3,
      reducedMotion: this.preferences.reducedMotion, lowPower: this.preferences.lowPower,
      cache: modularAvatarCompositor.diagnostics(), error: this.error };
    this.scene.registry.set('world.avatar.diagnostics', diagnostic);
    worldBridge.emit('world:avatar_ready', diagnostic);
  }

  private clearVisuals(): void {
    this.body?.destroy(); this.companion?.destroy(); this.body = this.companion = undefined;
    for (const key of this.textureKeys) this.scene.textures.remove(key);
    this.textureKeys = [];
    this.lease?.release(); this.lease = undefined;
    this.reserveBudget(0);
  }

  destroy(): void {
    this.destroyed = true; this.request++;
    this.unsubscribe();
    this.scene.events.off('ui:preferences', this.applyPreferences, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.clearVisuals();
  }
}
