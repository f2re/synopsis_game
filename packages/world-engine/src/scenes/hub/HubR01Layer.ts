import Phaser from 'phaser';
import { worldBridge, type DayPhase } from '../../bridge/WorldBridge';
import r01Assets from '../../assets/hub/r01-approval.json';
import { WORLD_PALETTE as P } from '../../theme/tokens';
import type { WorldInteractionTarget } from '../../runtime/uiPreferences';
import { getR01Layout, getR01Decor, type HubR01BuildingId } from './r01Layout';
import type { PhaseColors } from './HubTimeOfDay';

type Bounds = { x: number; y: number; width: number; height: number };

/** Independently exported scenery, facades and props; graphics only add light and focus. */
export class HubR01Layer {
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly terrain: Phaser.GameObjects.Graphics;
  private readonly lights: Phaser.GameObjects.Graphics;
  private readonly accents: Phaser.GameObjects.Graphics;
  private readonly focus: Phaser.GameObjects.Graphics;
  private readonly coastalBackground?: Phaser.GameObjects.Image;
  private readonly campusGround?: Phaser.GameObjects.Image;
  private readonly sprites = new Map<HubR01BuildingId, Phaser.GameObjects.Image>();
  private readonly bounds = new Map<string, Bounds>();
  private decor: Phaser.GameObjects.Image[] = [];
  private fountain?: Phaser.GameObjects.Image;
  private layout: ReturnType<typeof getR01Layout>;
  private phase: DayPhase = 'golden_hour';
  private colors: PhaseColors = { skyTop: P.skyNight0, skyHorizon: P.skyNight3, waterReflect: P.waterGulf0, windowLightAlpha: .75, starsVisible: true };
  private focused: string | null = null;
  private ambientTime = 0;
  private paintTime = 0;
  private readonly unsubs: (() => void)[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.layout = getR01Layout(scene.scale.width, scene.scale.height);
    this.sky = scene.add.graphics().setDepth(0);
    this.terrain = scene.add.graphics().setDepth(2);
    this.lights = scene.add.graphics().setDepth(9);
    this.accents = scene.add.graphics().setDepth(32);
    this.focus = scene.add.graphics().setDepth(35);
    this.coastalBackground = this.optionalImage('coastal-sky')?.setOrigin(.5, 0).setDepth(1);
    this.campusGround = this.optionalImage('campus-ground')?.setOrigin(.5, 0).setDepth(2.5);
    for (const building of this.layout.buildings) {
      const asset = r01Assets.assets.find((candidate) => candidate.id === building.id)!;
      this.sprites.set(building.id, scene.add.image(0, 0, asset.key).setOrigin(.5, 1));
    }
    this.unsubs.push(worldBridge.on<{buildingId: string | null}>('ui:focus_building', ({buildingId}) => {
      this.focused = buildingId;
      this.drawMarkers();
    }));
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.resize();
  }

  private optionalImage(id: string): Phaser.GameObjects.Image | undefined {
    const asset = r01Assets.optionalAssets.find((candidate) => candidate.id === id);
    return asset?.enabled && this.scene.textures.exists(asset.key) ? this.scene.add.image(0, 0, asset.key) : undefined;
  }

  private resize(): void {
    const scene = this.scene;
    this.layout = getR01Layout(scene.scale.width, scene.scale.height);
    const {width, height, zoom, portrait, horizon, shore} = this.layout;
    scene.cameras.main.setViewport(0, 0, scene.scale.width, scene.scale.height);
    scene.cameras.main.setZoom(zoom).centerOn(width / 2, height / 2);
    scene.cameras.main.setBackgroundColor(P.skyNight0);

    const visibleWidth = scene.scale.width / zoom;
    const visibleHeight = scene.scale.height / zoom;
    const top = (height - visibleHeight) / 2;
    if (this.coastalBackground) {
      // The authored coast is at 62.5% of the source plate. Keep that low horizon
      // aligned while covering the full visible sky, including portrait letterboxing.
      const plate = this.coastalBackground;
      const scale = Math.max(visibleWidth / plate.width, (horizon - top + 8) / (plate.height * .625));
      plate.setScale(scale).setPosition(width / 2, horizon - plate.height * scale * .625);
    }
    if (this.campusGround) {
      const bottom = height / 2 + visibleHeight / 2;
      // Cover preserves native paving and rail proportions; portrait crops the
      // empty side paving while retaining the authored central staircase.
      const ground = this.campusGround;
      const scale = Math.max(visibleWidth / ground.width, (bottom - shore + 8) / ground.height);
      ground.setPosition(width / 2, shore).setScale(scale);
    }

    this.bounds.clear();
    for (const [index, building] of this.layout.buildings.entries()) {
      const sprite = this.sprites.get(building.id)!;
      const scale = Math.min(building.width / sprite.width, building.height / sprite.height);
      sprite.setScale(scale).setPosition(building.x + building.width / 2, building.y + building.height);
      sprite.setDepth(10 + index);
      this.bounds.set(building.id, {
        x: sprite.x - sprite.displayWidth / 2,
        y: sprite.y - sprite.displayHeight,
        width: sprite.displayWidth,
        height: sprite.displayHeight,
      });
    }
    this.decor.forEach((sprite) => sprite.destroy());
    this.decor = [];
    this.fountain = undefined;
    for (const placement of getR01Decor(portrait)) {
      const sprite = this.optionalImage(placement.id);
      if (!sprite) continue;
      sprite.setOrigin(.5, 1).setPosition(placement.x, placement.y).setDepth(placement.depth);
      sprite.setScale(Math.min(placement.width / sprite.width, placement.height / sprite.height));
      this.decor.push(sprite);
      if (placement.id === 'prop-fountain') this.fountain = sprite;
    }
    this.drawStatic();
    this.drawMarkers();
    this.publishTargets();
  }

  applyDayPhase(phase: DayPhase, colors: PhaseColors): void {
    this.phase = phase;
    this.colors = colors;
    this.drawStatic();
  }

  private publishTargets(): void {
    const {width, height, zoom} = this.layout;
    const offsetX = (this.scene.scale.width - width * zoom) / 2;
    const offsetY = (this.scene.scale.height - height * zoom) / 2;
    const targets: WorldInteractionTarget[] = this.layout.buildings.map((building) => {
      const box = this.bounds.get(building.id)!;
      const hitWidth = Math.max(44, box.width * zoom * .78);
      const hitHeight = Math.max(44, box.height * zoom * .72);
      return {
        id: building.id, label: building.label, state: building.state,
        x: Math.max(0, Math.min(this.scene.scale.width - hitWidth, offsetX + (box.x + box.width / 2) * zoom - hitWidth / 2)),
        y: Math.max(0, Math.min(this.scene.scale.height - hitHeight, offsetY + (box.y + box.height) * zoom - hitHeight)),
        width: hitWidth, height: hitHeight,
      };
    });
    worldBridge.emit('world:interaction_layout', targets);
  }

  private drawStatic(): void {
    const {width: w, height: h, portrait, zoom, shore} = this.layout;
    const visibleHeight = this.scene.scale.height / zoom;
    const top = (h - visibleHeight) / 2;
    const bottom = h / 2 + visibleHeight / 2;
    this.sky.clear();
    this.terrain.clear();
    this.lights.clear();
    // Neutral backing is only visible when an optional plate cannot be loaded.
    this.sky.fillStyle(this.colors.skyTop).fillRect(-w, top - 8, w * 3, bottom - top + 16);
    this.terrain.fillStyle(P.stoneConcrete0).fillRect(-w, shore, w * 3, bottom - shore + 8);
    const warmLight = this.phase !== 'day';
    for (const building of this.layout.buildings) {
      const box = this.bounds.get(building.id)!;
      pixelEllipse(this.lights, box.x + box.width / 2, box.y + box.height - 1, box.width * .44, 9, P.skyNight0, .36);
      if (warmLight && (building.state === 'active' || building.state === 'available')) {
        pixelEllipse(this.lights, box.x + box.width / 2, box.y + box.height + 2, 24, 7, P.windowLight1, .18);
      }
    }
    if (warmLight) {
      for (const placement of getR01Decor(portrait)) {
        if (placement.id === 'prop-lamp') pixelEllipse(this.lights, placement.x, placement.y + 1, 15, 5, P.windowLight1, .18);
      }
    }
    this.drawAmbient();
  }

  private drawMarkers(): void {
    this.focus.clear();
    for (const building of this.layout.buildings) {
      const box = this.bounds.get(building.id)!;
      const selected = building.id === this.focused;
      const x = box.x + box.width / 2;
      const y = box.y + box.height - 2;
      const color = building.state === 'locked' ? P.stoneConcrete3 : P.actionAccent1;
      this.focus.fillStyle(P.skyNight0, .96).fillRect(x - 9, y - 7, 18, 16);
      this.focus.lineStyle(1, selected ? P.windowLight3 : color, selected ? 1 : .7).strokeRect(x - 9, y - 7, 18, 16);
      if (building.state === 'locked') {
        this.focus.lineStyle(1, color).strokeRect(x - 3, y - 4, 6, 5);
        this.focus.fillStyle(color).fillRect(x - 4, y, 8, 5);
        this.focus.fillStyle(P.skyNight0).fillRect(x, y + 2, 1, 2);
      } else {
        this.focus.lineStyle(2, color).lineBetween(x - 4, y, x + 4, y);
        this.focus.lineBetween(x + 1, y - 3, x + 4, y).lineBetween(x + 1, y + 3, x + 4, y);
      }
      if (selected) {
        const pad = 3;
        this.focus.lineStyle(2, P.windowLight3, 1);
        for (const [cx, cy, dx, dy] of [[box.x-pad,box.y-pad,1,1],[box.x+box.width+pad,box.y-pad,-1,1],[box.x-pad,box.y+box.height+pad,1,-1],[box.x+box.width+pad,box.y+box.height+pad,-1,-1]]) {
          this.focus.lineBetween(cx,cy,cx + dx * 15,cy);
          this.focus.lineBetween(cx,cy,cx,cy + dy * 15);
        }
      }
    }
  }

  private drawAmbient(): void {
    this.accents.clear();
    const fountain = this.fountain;
    if (!fountain) return;
    const t = Math.floor(this.ambientTime / 350);
    // A few native-pixel highlights in the basin; reduced-motion leaves them still.
    this.accents.fillStyle(P.waterGulf4, .45);
    const waterY = fountain.y - fountain.displayHeight * .4;
    for (let i = 0; i < 5; i++) {
      const x = fountain.x - fountain.displayWidth * .28 + i * fountain.displayWidth * .14;
      this.accents.fillRect(Math.round(x), Math.round(waterY + (i % 2) * 2), 2 + ((t + i) % 2), 1);
    }
  }

  update(deltaMs: number): void {
    this.ambientTime += Math.min(deltaMs, 100);
    this.paintTime += deltaMs;
    if (this.paintTime < 125) return;
    this.paintTime = 0;
    this.drawAmbient();
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.unsubs.forEach((unsubscribe) => unsubscribe());
    this.sprites.forEach((sprite) => sprite.destroy());
    this.decor.forEach((sprite) => sprite.destroy());
    this.coastalBackground?.destroy();
    this.campusGround?.destroy();
    [this.sky,this.terrain,this.lights,this.accents,this.focus].forEach((graphic) => graphic.destroy());
  }
}

function pixelEllipse(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha=1): void {
  g.fillStyle(color, alpha);
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const extent = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    g.fillRect(Math.round(x - extent), Math.round(y + dy), extent * 2, 1);
  }
}
