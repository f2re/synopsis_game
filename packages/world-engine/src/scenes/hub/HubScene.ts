import Phaser from 'phaser';
import { worldAudio } from '../../audio/WorldAudioManager';
import {
  HUB_MASTER_HEIGHT,
  HUB_MASTER_NIGHT_STATIC_URL,
  HUB_MASTER_NIGHT_TEXTURE_KEY,
  HUB_MASTER_STATIC_URL,
  HUB_MASTER_TEXTURE_KEY,
  HUB_MASTER_WIDTH,
} from '../../assets/hub/masterAsset';
import { HubDossierLayer } from './HubDossierLayer';
import { HubHud } from './HubHud';
import { HubPoiLayer } from './HubPoiLayer';
import { HUB_LOCATIONS, type HubLocationDefinition } from './locationRegistry';
import { HUB_THEME } from './hubTheme';

export class HubScene extends Phaser.Scene {
  private hubBg!: any;
  private isNightMode = true;
  private baseZoom = 1;
  private notice?: any;
  private hud?: HubHud;
  private poiLayer?: HubPoiLayer;
  private dossierLayer?: HubDossierLayer;
  private nightBeacons: any[] = [];
  private readonly reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor() {
    super('hub');
  }

  preload(): void {
    if (!this.textures.exists(HUB_MASTER_TEXTURE_KEY)) {
      this.load.image(HUB_MASTER_TEXTURE_KEY, HUB_MASTER_STATIC_URL);
    }
    if (!this.textures.exists(HUB_MASTER_NIGHT_TEXTURE_KEY)) {
      this.load.image(HUB_MASTER_NIGHT_TEXTURE_KEY, HUB_MASTER_NIGHT_STATIC_URL);
    }

    this.load.image('bld-radar', '/hub/buildings/hub_radar_night.png');
    this.load.image('bld-cartography', '/hub/buildings/hub_cartography_night.png');
    this.load.image('bld-synoptic', '/hub/buildings/hub_synoptic_night.png');
    this.load.image('bld-archive', '/hub/buildings/hub_archive_night.png');
    this.load.image('bld-aerology', '/hub/buildings/hub_aerology_night.png');
    this.load.image('bld-tournament', '/hub/buildings/hub_tournament_night.png');

    this.load.image('outline-radar', '/hub/outlines/outline_radar.png');
    this.load.image('outline-cartography', '/hub/outlines/outline_cartography.png');
    this.load.image('outline-synoptic', '/hub/outlines/outline_synoptic.png');
    this.load.image('outline-archive', '/hub/outlines/outline_archive.png');
    this.load.image('outline-aerology', '/hub/outlines/outline_aerology.png');
    this.load.image('outline-tournament', '/hub/outlines/outline_tournament.png');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#030914');

    const initialTexture = this.isNightMode && this.textures.exists(HUB_MASTER_NIGHT_TEXTURE_KEY)
      ? HUB_MASTER_NIGHT_TEXTURE_KEY
      : HUB_MASTER_TEXTURE_KEY;

    this.hubBg = this.add
      .image(0, 0, initialTexture)
      .setOrigin(0, 0)
      .setDisplaySize(HUB_MASTER_WIDTH, HUB_MASTER_HEIGHT);

    this.setupAtmosphericVfx();

    this.dossierLayer = new HubDossierLayer(this, () => this.startShift());
    this.poiLayer = new HubPoiLayer(this, HUB_LOCATIONS, {
      onStartShift: () => this.startShift(),
      onDetails: (location) => this.openDossier(location),
      isBlocked: () => this.dossierLayer?.isOpen ?? false,
    });
    this.hud = new HubHud(
      this,
      {
        onToggleDayNight: () => this.toggleDayNight(),
        onZoomIn: () => this.zoomBy(1.18),
        onZoomOut: () => this.zoomBy(1 / 1.18),
        onResetView: () => this.resetCameraView(),
      },
      this.isNightMode,
    );

    this.setupInteractiveCamera();
    this.fitViewport();

    const onResize = () => this.fitViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    if (this.isNightMode) {
      worldAudio.playNightAmbient(1800);
    } else {
      worldAudio.playHubOutdoorAmbient(false, 1800);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.poiLayer?.destroy();
      this.dossierLayer?.destroy();
      this.hud?.destroy();
      worldAudio.stopHubAtmosphereSchedule();
      worldAudio.stopAmbient(1000);
    });

    this.events.on(Phaser.Scenes.Events.SLEEP, () => {
      worldAudio.stopHubAtmosphereSchedule();
      worldAudio.stopAmbient(900);
    });

    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      if (this.isNightMode) {
        worldAudio.playNightAmbient(1200);
      } else {
        worldAudio.playHubOutdoorAmbient(false, 1200);
      }
    });
  }

  private setupAtmosphericVfx(): void {
    const radarBeacon = this.add.circle(137, 90, 3, 0xd65e5e, 0.88).setDepth(20);
    const aeroBeacon = this.add.circle(759, 100, 3, 0xd65e5e, 0.82).setDepth(20);
    this.nightBeacons = [radarBeacon, aeroBeacon];

    if (!this.reducedMotion) {
      this.tweens.add({
        targets: radarBeacon,
        alpha: 0.32,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: aeroBeacon,
        alpha: 0.28,
        duration: 1450,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private fitViewport(): void {
    const camera = this.cameras.main;
    const vpW = Math.max(this.scale.width, 1);
    const vpH = Math.max(this.scale.height, 1);
    this.baseZoom = Math.max(vpW / HUB_MASTER_WIDTH, vpH / HUB_MASTER_HEIGHT);

    camera.setViewport(0, 0, vpW, vpH);
    camera.setZoom(this.baseZoom);
    camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);

    this.hud?.layout(vpW, vpH);
    this.poiLayer?.refreshScale();
  }

  private setupInteractiveCamera(): void {
    const camera = this.cameras.main;
    camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);

    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      if (this.dossierLayer?.isOpen) return;
      this.zoomBy(deltaY > 0 ? 0.94 : 1.06);
    });
  }

  private zoomBy(factor: number): void {
    const camera = this.cameras.main;
    const nextZoom = Phaser.Math.Clamp(camera.zoom * factor, this.baseZoom, this.baseZoom * 2.2);
    if (Math.abs(nextZoom - camera.zoom) < 0.001) return;
    camera.setZoom(nextZoom);
    camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);
    this.poiLayer?.refreshScale();
    worldAudio.play('audio.ui.click-soft');
  }

  private resetCameraView(): void {
    const camera = this.cameras.main;
    if (this.reducedMotion) {
      camera.setZoom(this.baseZoom);
      camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);
      this.poiLayer?.refreshScale();
      return;
    }

    this.tweens.add({
      targets: camera,
      zoom: this.baseZoom,
      duration: 220,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.poiLayer?.refreshScale(),
      onComplete: () => camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2),
    });
    worldAudio.play('audio.ui.click-soft');
  }

  private toggleDayNight(): void {
    this.isNightMode = !this.isNightMode;
    const targetKey = this.isNightMode ? HUB_MASTER_NIGHT_TEXTURE_KEY : HUB_MASTER_TEXTURE_KEY;
    if (this.textures.exists(targetKey)) {
      this.hubBg.setTexture(targetKey);
    }

    for (const beacon of this.nightBeacons) {
      beacon.setVisible(this.isNightMode);
    }
    this.hud?.setNight(this.isNightMode);

    if (this.isNightMode) {
      worldAudio.playNightAmbient(1200);
    } else {
      worldAudio.playHubOutdoorAmbient(false, 1200);
    }
    worldAudio.play('audio.interact.lamp-switch');
  }

  private openDossier(location: HubLocationDefinition): void {
    this.dossierLayer?.open(location.dossierId);
    worldAudio.play('audio.ui.click-soft');
  }

  private startShift(): void {
    this.poiLayer?.clearSelection();
    window.dispatchEvent(new CustomEvent('hub:start-shift'));
    this.showNotice('Открываем рабочее место дежурной смены…');
  }

  private showNotice(message: string): void {
    this.notice?.destroy(true);
    const x = this.scale.width / 2;
    const y = Math.max(42, this.scale.height - 92);
    const bg = this.add
      .rectangle(x, y, 360, 34, HUB_THEME.color.panel, 0.95)
      .setStrokeStyle(1, HUB_THEME.color.primary, 0.78)
      .setScrollFactor(0);
    const text = this.add
      .text(x, y, message, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '11px',
        color: HUB_THEME.css.textPrimary,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.notice = this.add.container(0, 0, [bg, text]).setDepth(HUB_THEME.depth.hud + 10).setScrollFactor(0);

    this.time.delayedCall(1400, () => {
      if (!this.notice?.active) return;
      if (this.reducedMotion) {
        this.notice.destroy(true);
      } else {
        this.tweens.add({
          targets: this.notice,
          alpha: 0,
          duration: 180,
          onComplete: () => this.notice?.destroy(true),
        });
      }
    });
  }
}
