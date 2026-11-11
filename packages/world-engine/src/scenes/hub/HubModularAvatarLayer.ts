import Phaser from 'phaser';
import { worldBridge } from '../../bridge/WorldBridge';
import { AVATAR_ACTIONS, avatarFrameAtTime, avatarProfileKey, type AvatarAction, type AvatarDirection, type ModularAvatarProfile } from '../../runtime/modularAvatarManifest';
import { modularAvatarCompositor, type AvatarComposite, type AvatarLease, type AvatarSheet } from '../../runtime/modularAvatarCompositor';
import { normalizeWorldPreferences, type WorldUiPreferences } from '../../runtime/uiPreferences';
import type { WorldAvatarPresentation } from '../../runtime/characterAssets';
import type { WorldAvatarCommand, WorldAvatarNavigationState } from '../../runtime/avatarNavigation';
import { WORLD_PALETTE as P } from '../../theme/tokens';
import { avatarWalkwayStep, findAvatarRoute, getAvatarWalkway, type AvatarPoint } from './avatarWalkway';
import { getR01Layout } from './r01Layout';

let instanceId = 0;
const DISPLAY_SCALE = .5; // Native 96×144 → 48×72; nearest-neighbour sampling.

/** One saved personal body and an optional independent companion, never an NPC skin. */
export class HubModularAvatarLayer {
  private readonly texturePrefix = `player-modular-${++instanceId}`;
  private readonly unsubscribers: (() => void)[];
  private readonly pathGraphic: Phaser.GameObjects.Graphics;
  private preferences: WorldUiPreferences;
  private profile: ModularAvatarProfile | null = null;
  private lease?: AvatarLease<AvatarComposite>;
  private body?: Phaser.GameObjects.Image;
  private companion?: Phaser.GameObjects.Image;
  private textureKeys: string[] = [];
  private request = 0;
  private destroyed = false;
  private pendingPose: string | null = null;
  private modalOpen = false;
  private visible = true;
  private controlsOpen = false;
  private portrait: boolean | undefined;
  private direction: AvatarDirection = 'down';
  private action: AvatarAction = 'idle';
  private elapsed = 0;
  private sampleTime = 0;
  private frame = 0;
  private point: AvatarPoint = { x: 544, y: 490 };
  private route: AvatarPoint[] = [];
  private error: string | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly reserveBudget: (actors: number) => void) {
    this.preferences = normalizeWorldPreferences(scene.registry.get('ui.preferences'));
    this.modalOpen = scene.registry.get('ui.modal_open') === true;
    this.visible = scene.registry.get('ui.world_visible') !== false;
    this.pathGraphic = scene.add.graphics().setDepth(23);
    this.unsubscribers = [
      worldBridge.on<WorldAvatarPresentation>('ui:avatar_presentation', (value) => this.setProfile(value.profile ?? null)),
      worldBridge.on<WorldAvatarCommand>('ui:avatar_command', (command) => this.command(command)),
      worldBridge.on<boolean>('ui:modal_open', (open) => {
        this.modalOpen = open === true;
        if (this.modalOpen) { this.controlsOpen = false; this.stop(); }
        this.drawPath(); this.publish();
      }),
      worldBridge.on<boolean>('ui:world_visible', (visible) => { this.visible = visible === true; this.publish(); }),
    ];
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
    this.action = 'idle'; this.route = []; this.direction = 'down'; this.pendingPose = null;
    this.point = { ...getAvatarWalkway(Boolean(this.portrait)).spawn };
    this.error = null;
    this.drawPath(); this.publish();
    if (profile) void this.setPose('idle', 'down');
  }

  private async setPose(action: AvatarAction, direction: AvatarDirection, restart = false): Promise<void> {
    if (!this.profile || this.destroyed) return;
    const pose = `${action}:${direction}`;
    if (!restart && this.pendingPose === pose) return;
    this.action = action; this.direction = direction;
    const request = ++this.request;
    this.pendingPose = null;
    if (!restart && this.lease?.value.action === action && this.lease.value.direction === direction) {
      this.publish(); return;
    }
    this.pendingPose = pose;
    try {
      const lease = await modularAvatarCompositor.acquire(this.profile, direction, action);
      if (this.destroyed || request !== this.request) { lease.release(); return; }
      this.clearVisuals();
      this.lease = lease;
      this.pendingPose = null;
      this.elapsed = 0; this.sampleTime = 0; this.frame = 0;
      this.error = lease.value.action !== action ? `Clip ${action} is not accepted; displaying idle` : null;
      if (lease.value.action !== 'walk') this.route = [];
      this.body = this.createImage(lease.value.body, 'body', lease.value.clip.durationsMs.length);
      if (lease.value.companion) this.companion = this.createImage(lease.value.companion, 'companion', lease.value.clip.durationsMs.length);
      this.reserveBudget(this.companion ? 2 : 1);
      this.place(); this.drawPath();
      this.publish();
    } catch (error) {
      if (this.destroyed || request !== this.request) return;
      this.clearVisuals();
      this.pendingPose = null; this.route = [];
      this.error = error instanceof Error ? error.message : 'Modular avatar unavailable';
      this.drawPath(); this.publish();
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
    if (this.portrait !== layout.portrait) {
      this.portrait = layout.portrait;
      this.point = { ...getAvatarWalkway(layout.portrait).spawn };
      this.stop();
    }
    this.place();
    this.drawPath();
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
      // Changing preferences cancels at the present foot point; pending motion cannot teleport.
      this.stop();
      this.elapsed = 0; this.frame = 0;
      this.body?.setFrame(0); this.companion?.setFrame(0);
    }
    this.publish();
  }

  private get paused(): boolean { return this.modalOpen || !this.visible; }

  private accepted(action: AvatarAction): boolean { return Boolean(this.profile && this.lease?.value.manifest.clips[action]); }

  private nextDirection(target: AvatarPoint): AvatarDirection {
    const dx = target.x - this.point.x, dy = target.y - this.point.y;
    return Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
  }

  private command(command: WorldAvatarCommand): void {
    if (!command || this.destroyed) return;
    if (command.kind === 'controls') {
      this.controlsOpen = command.open === true && !this.paused;
      if (!this.controlsOpen) this.stop();
      this.drawPath(); return;
    }
    if (command.kind === 'stop') { this.stop(); return; }
    if (!this.controlsOpen || this.paused) return;
    if (command.kind === 'inspect') { this.inspectAvatar(); return; }
    if (command.kind === 'step') {
      if (!['down', 'left', 'up', 'right'].includes(command.direction)) return;
      const target = avatarWalkwayStep(getAvatarWalkway(Boolean(this.portrait)), this.point, command.direction);
      if (target) this.walkAvatarTo(target.x, target.y);
    } else if (command.kind === 'point' && Number.isFinite(command.x) && Number.isFinite(command.y)) {
      const layout = getR01Layout(this.scene.scale.width, this.scene.scale.height);
      const x = (command.x - (this.scene.scale.width - layout.width * layout.zoom) / 2) / layout.zoom;
      const y = (command.y - (this.scene.scale.height - layout.height * layout.zoom) / 2) / layout.zoom;
      this.walkAvatarTo(x, y);
    }
  }

  /** A route is allowed only when its complete walk clip passed the asset manifest gate. */
  walkAvatarTo(x: number, y: number): void {
    if (this.paused || !this.accepted('walk')) return;
    const route = findAvatarRoute(getAvatarWalkway(Boolean(this.portrait)), this.point, { x, y });
    if (!route.length) return;
    const direction = this.nextDirection(route[0]);
    if (this.preferences.reducedMotion) {
      this.point = route[route.length - 1]; this.route = [];
      void this.setPose('idle', direction); this.place(); this.drawPath(); this.publish(); return;
    }
    this.route = route;
    void this.setPose('walk', direction);
    this.drawPath(); this.publish();
  }

  inspectAvatar(): void {
    if (this.paused || !this.accepted('inspect')) return;
    this.route = [];
    if (this.preferences.reducedMotion) this.stop();
    else void this.setPose('inspect', this.direction, true);
    this.drawPath(); this.publish();
  }

  private stop(): void {
    this.route = [];
    if (this.action !== 'idle' || this.pendingPose) void this.setPose('idle', this.direction);
    this.drawPath(); this.publish();
  }

  private drawPath(): void {
    this.pathGraphic.clear();
    if (!this.controlsOpen || this.paused || !this.accepted('walk')) return;
    const walkway = getAvatarWalkway(Boolean(this.portrait));
    this.pathGraphic.lineStyle(2, P.windowLight2, .8);
    for (const [from, to] of walkway.edges) this.pathGraphic.lineBetween(walkway.nodes[from].x, walkway.nodes[from].y, walkway.nodes[to].x, walkway.nodes[to].y);
    const target = this.route[this.route.length - 1];
    if (target) this.pathGraphic.strokeRect(target.x - 4, target.y - 4, 8, 8);
  }

  update(deltaMs: number): void {
    if (this.destroyed || this.paused || this.preferences.reducedMotion || !this.lease || this.pendingPose) return;
    const delta = Math.max(0, Math.min(Number.isFinite(deltaMs) ? deltaMs : 0, 100));
    if (this.route.length && this.action === 'walk' && this.lease.value.action === 'walk' && this.lease.value.direction === this.direction) {
      const target = this.route[0], dx = target.x - this.point.x, dy = target.y - this.point.y;
      const distance = Math.hypot(dx, dy), step = delta * .055;
      if (distance <= step) {
        this.point = this.route.shift()!;
        void this.setPose(this.route.length ? 'walk' : 'idle', this.route.length ? this.nextDirection(this.route[0]) : this.direction);
        this.drawPath();
      } else { this.point.x += dx / distance * step; this.point.y += dy / distance * step; }
      this.place();
    }
    if (this.pendingPose) return;
    this.elapsed += delta; this.sampleTime += delta;
    const state = avatarFrameAtTime(this.lease.value.clip, this.elapsed);
    if (state.complete && this.action === 'inspect') { void this.setPose('idle', this.direction); return; }
    if (this.preferences.lowPower && this.sampleTime < 250) return;
    this.sampleTime = 0;
    if (state.frame !== this.frame) { this.frame = state.frame; this.body?.setFrame(this.frame); this.companion?.setFrame(this.frame); }
  }

  private publish(): void {
    const value = this.lease?.value;
    const actors = this.body ? this.companion ? 2 : 1 : 0;
    const navigation: WorldAvatarNavigationState = { ready: Boolean(this.body),
      acceptedActions: AVATAR_ACTIONS.filter((action) => this.accepted(action)), requestedAction: this.action,
      paused: this.paused, moving: this.route.length > 0 };
    const diagnostic = { rig: value?.manifest.rigId ?? 'player.modular.r01.v1', revision: value?.manifest.revision ?? null,
      ready: Boolean(this.body), profilePresent: Boolean(this.profile), profileKey: this.profile ? avatarProfileKey(this.profile) : null,
      compositeKey: value?.key ?? null, requestedAction: this.action, action: value?.action ?? null, direction: this.direction,
      companion: this.profile?.companion ?? 'companion.none', visibleActors: actors,
      animatedActors: this.preferences.reducedMotion || this.paused ? 0 : actors, sceneAnimationBudget: 3,
      acceptedActions: navigation.acceptedActions, position: { ...this.point }, moving: navigation.moving, paused: this.paused,
      reducedMotion: this.preferences.reducedMotion, lowPower: this.preferences.lowPower,
      cache: modularAvatarCompositor.diagnostics(), error: this.error };
    this.scene.registry.set('world.avatar.diagnostics', diagnostic);
    worldBridge.emit('world:avatar_ready', diagnostic);
    worldBridge.emit('world:avatar_navigation', navigation);
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
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.scene.events.off('ui:preferences', this.applyPreferences, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.clearVisuals();
    this.pathGraphic.destroy();
  }
}
