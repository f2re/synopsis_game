import Phaser from 'phaser';
import { worldAudio } from '../../audio/WorldAudioManager';
import {
  HUB_MASTER_HEIGHT,
  HUB_MASTER_NIGHT_STATIC_URL,
  HUB_MASTER_NIGHT_TEXTURE_KEY,
  HUB_MASTER_RUNTIME_DATA_URI,
  HUB_MASTER_STATIC_URL,
  HUB_MASTER_TEXTURE_KEY,
  HUB_MASTER_WIDTH,
} from '../../assets/hub/masterAsset';

interface FacilityDossier {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  statusColor: string;
  isLocked?: boolean;
  unlockRequirement?: string;
  textureKey: string;
  specs: { label: string; value: string }[];
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export class HubScene extends Phaser.Scene {
  private hubBg!: Phaser.GameObjects.Image;
  private isNightMode = true;
  private baseZoom = 1;
  private notice?: Phaser.GameObjects.Container;
  private hudContainer?: Phaser.GameObjects.Container;
  private telemetryContainer?: Phaser.GameObjects.Container;
  private hintText?: Phaser.GameObjects.Text;
  private timeButtonText?: Phaser.GameObjects.Text;
  private activeModal?: Phaser.GameObjects.Container;
  private nightBeacons: Phaser.GameObjects.Arc[] = [];

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

    // High-resolution building textures
    this.load.image('bld-radar', '/hub/buildings/hub_radar_night.png');
    this.load.image('bld-cartography', '/hub/buildings/hub_cartography_night.png');
    this.load.image('bld-synoptic', '/hub/buildings/hub_synoptic_night.png');
    this.load.image('bld-archive', '/hub/buildings/hub_archive_night.png');
    this.load.image('bld-aerology', '/hub/buildings/hub_aerology_night.png');
    this.load.image('bld-tournament', '/hub/buildings/hub_tournament_night.png');

    // Contour glow outlines
    this.load.image('outline-radar', '/hub/outlines/outline_radar.png');
    this.load.image('outline-cartography', '/hub/outlines/outline_cartography.png');
    this.load.image('outline-synoptic', '/hub/outlines/outline_synoptic.png');
    this.load.image('outline-archive', '/hub/outlines/outline_archive.png');
    this.load.image('outline-aerology', '/hub/outlines/outline_aerology.png');
    this.load.image('outline-tournament', '/hub/outlines/outline_tournament.png');

    // UI badges
    this.load.image('badge-seal', '/ui/badges/ui_badge_station_seal.png');
    this.load.image('badge-compass', '/ui/badges/ui_badge_compass_rose.png');
    this.load.image('badge-order', '/ui/badges/ui_badge_synoptic_order.png');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#030914');

    // Background setup: start in Night mode with the master 6-facility composite
    const initialTexture = this.isNightMode && this.textures.exists(HUB_MASTER_NIGHT_TEXTURE_KEY)
      ? HUB_MASTER_NIGHT_TEXTURE_KEY
      : (this.textures.exists(HUB_MASTER_NIGHT_TEXTURE_KEY) ? HUB_MASTER_NIGHT_TEXTURE_KEY : HUB_MASTER_TEXTURE_KEY);

    this.hubBg = this.add
      .image(0, 0, initialTexture)
      .setOrigin(0, 0)
      .setDisplaySize(HUB_MASTER_WIDTH, HUB_MASTER_HEIGHT);

    // If night texture was still in transit when create() fired, apply it as soon as loaded
    if (this.isNightMode && initialTexture !== HUB_MASTER_NIGHT_TEXTURE_KEY) {
      this.load.once(`filecomplete-image-${HUB_MASTER_NIGHT_TEXTURE_KEY}`, () => {
        if (this.hubBg && this.isNightMode) {
          this.hubBg.setTexture(HUB_MASTER_NIGHT_TEXTURE_KEY);
        }
      });
    }

    this.setupAtmosphericVfx();
    this.createBuildingInteractives();
    this.setupInteractiveCamera();
    this.setupHud();
    this.setupStationTelemetry();
    this.fitViewport();

    // Scale resize event
    const onResize = () => {
      this.fitViewport();
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    // Sound
    if (this.isNightMode) {
      worldAudio.playNightAmbient(1800);
    } else {
      worldAudio.playHubOutdoorAmbient(false, 1800);
    }

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      worldAudio.stopHubAtmosphereSchedule();
      worldAudio.stopAmbient(1200);
    });

    this.events.on(Phaser.Scenes.Events.SLEEP, () => {
      worldAudio.stopHubAtmosphereSchedule();
      worldAudio.stopAmbient(1000);
    });

    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      if (this.isNightMode) {
        worldAudio.playNightAmbient(1800);
      } else {
        worldAudio.playHubOutdoorAmbient(false, 1800);
      }
    });
  }

  private setupAtmosphericVfx(): void {
    // 1. Radar mast red obstruction beacon
    const radarBeacon = this.add.circle(137, 90, 3.5, 0xff2222, 0.95).setDepth(20);
    const radarGlow = this.add.circle(137, 90, 8, 0xff3333, 0.35).setDepth(19);

    this.tweens.add({
      targets: [radarBeacon, radarGlow],
      alpha: 0.1,
      scale: 0.7,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 2. Aerology mast beacon
    const aeroBeacon = this.add.circle(759, 100, 3, 0xff4422, 0.9).setDepth(20);
    const aeroGlow = this.add.circle(759, 100, 7, 0xff5533, 0.3).setDepth(19);

    this.tweens.add({
      targets: [aeroBeacon, aeroGlow],
      alpha: 0.12,
      scale: 0.75,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.nightBeacons = [radarBeacon, radarGlow, aeroBeacon, aeroGlow];
  }

  private fitViewport(): void {
    const camera = this.cameras.main;
    const vpW = Math.max(this.scale.width, 1);
    const vpH = Math.max(this.scale.height, 1);

    this.baseZoom = Math.max(vpW / HUB_MASTER_WIDTH, vpH / HUB_MASTER_HEIGHT);

    camera.setViewport(0, 0, vpW, vpH);
    camera.setZoom(this.baseZoom);
    camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);

    this.repositionHud();
    this.repositionTelemetry();
  }

  private setupInteractiveCamera(): void {
    const camera = this.cameras.main;

    // Stable centered viewport - no dragging into voids!
    camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);

    // Mouse wheel zoom: always centered on campus, never exposes black borders
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      if (this.activeModal) return;
      const zoomFactor = deltaY > 0 ? 0.94 : 1.06;
      const minZoom = this.baseZoom;
      const maxZoom = this.baseZoom * 2.2;
      const newZoom = Phaser.Math.Clamp(camera.zoom * zoomFactor, minZoom, maxZoom);

      if (Math.abs(newZoom - camera.zoom) > 0.001) {
        camera.setZoom(newZoom);
        camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);
        this.hideHint();
      }
    });
  }

  private resetCameraView(): void {
    const camera = this.cameras.main;
    this.tweens.add({
      targets: camera,
      zoom: this.baseZoom,
      duration: 300,
      ease: 'Cubic.easeOut',
    });
    camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);
    worldAudio.play('audio.ui.click-soft');
  }

  private toggleDayNight(): void {
    this.isNightMode = !this.isNightMode;
    const targetKey = this.isNightMode ? HUB_MASTER_NIGHT_TEXTURE_KEY : HUB_MASTER_TEXTURE_KEY;

    if (this.textures.exists(targetKey)) {
      this.hubBg.setTexture(targetKey);
    }

    for (const b of this.nightBeacons) {
      b.setVisible(this.isNightMode);
    }

    if (this.isNightMode) {
      worldAudio.playNightAmbient(1200);
      this.timeButtonText?.setText('🌙 Ночь');
    } else {
      worldAudio.playHubOutdoorAmbient(false, 1200);
      this.timeButtonText?.setText('☀️ День');
    }
    worldAudio.play('audio.interact.lamp-switch');
  }

  private setupHud(): void {
    this.hudContainer?.destroy(true);

    const hud = this.add.container(0, 0).setDepth(400).setScrollFactor(0);

    // 1. Time of Day Toggle Pill
    const timeBg = this.add
      .rectangle(0, 0, 96, 32, 0x07182c, 0.92)
      .setStrokeStyle(1.5, 0xf1c75b, 0.85)
      .setInteractive({ useHandCursor: true });
    this.timeButtonText = this.add
      .text(0, 0, this.isNightMode ? '🌙 Ночь' : '☀️ День', {
        fontFamily: 'monospace, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f7f4e7',
      })
      .setOrigin(0.5);

    timeBg.on('pointerover', () => timeBg.setFillStyle(0x132a48, 0.96));
    timeBg.on('pointerout', () => timeBg.setFillStyle(0x07182c, 0.92));
    timeBg.on('pointerdown', () => this.toggleDayNight());

    const timePill = this.add.container(58, 24, [timeBg, this.timeButtonText]);

    // 2. Zoom In button [+]
    const zoomInBg = this.add
      .rectangle(126, 24, 30, 32, 0x07182c, 0.92)
      .setStrokeStyle(1.5, 0xf1c75b, 0.85)
      .setInteractive({ useHandCursor: true });
    const zoomInText = this.add
      .text(126, 24, '+', {
        fontFamily: 'monospace, monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f7f4e7',
      })
      .setOrigin(0.5);

    zoomInBg.on('pointerover', () => zoomInBg.setFillStyle(0x132a48, 0.96));
    zoomInBg.on('pointerout', () => zoomInBg.setFillStyle(0x07182c, 0.92));
    zoomInBg.on('pointerdown', () => {
      const camera = this.cameras.main;
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * 1.2, this.baseZoom, this.baseZoom * 2.2));
      camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);
      worldAudio.play('audio.ui.click-soft');
      this.hideHint();
    });

    // 3. Zoom Out button [−]
    const zoomOutBg = this.add
      .rectangle(162, 24, 30, 32, 0x07182c, 0.92)
      .setStrokeStyle(1.5, 0xf1c75b, 0.85)
      .setInteractive({ useHandCursor: true });
    const zoomOutText = this.add
      .text(162, 24, '−', {
        fontFamily: 'monospace, monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f7f4e7',
      })
      .setOrigin(0.5);

    zoomOutBg.on('pointerover', () => zoomOutBg.setFillStyle(0x132a48, 0.96));
    zoomOutBg.on('pointerout', () => zoomOutBg.setFillStyle(0x07182c, 0.92));
    zoomOutBg.on('pointerdown', () => {
      const camera = this.cameras.main;
      camera.setZoom(Phaser.Math.Clamp(camera.zoom / 1.2, this.baseZoom, this.baseZoom * 2.2));
      camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);
      worldAudio.play('audio.ui.click-soft');
      this.hideHint();
    });

    // 4. Center / Reset button [⛶]
    const centerBg = this.add
      .rectangle(198, 24, 32, 32, 0x07182c, 0.92)
      .setStrokeStyle(1.5, 0xf1c75b, 0.85)
      .setInteractive({ useHandCursor: true });
    const centerText = this.add
      .text(198, 24, '⛶', {
        fontFamily: 'monospace, monospace',
        fontSize: '15px',
        color: '#f7f4e7',
      })
      .setOrigin(0.5);

    centerBg.on('pointerover', () => centerBg.setFillStyle(0x132a48, 0.96));
    centerBg.on('pointerout', () => centerBg.setFillStyle(0x07182c, 0.92));
    centerBg.on('pointerdown', () => this.resetCameraView());

    // 5. Menu / Profile toggle [👤 Профиль]
    const menuBg = this.add
      .rectangle(260, 24, 82, 32, 0x07182c, 0.92)
      .setStrokeStyle(1.5, 0xf1c75b, 0.85)
      .setInteractive({ useHandCursor: true });
    const menuText = this.add
      .text(260, 24, '👤 Профиль', {
        fontFamily: 'monospace, monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#f7f4e7',
      })
      .setOrigin(0.5);

    menuBg.on('pointerover', () => menuBg.setFillStyle(0x132a48, 0.96));
    menuBg.on('pointerout', () => menuBg.setFillStyle(0x07182c, 0.92));
    menuBg.on('pointerdown', () => {
      worldAudio.play('audio.ui.click-soft');
      this.dispatchUiEvent('hub:session-menu');
    });

    // 6. Hint banner at the bottom
    this.hintText = this.add
      .text(0, 0, '✢ Перемещение — зажмите ЛКМ • ⚲ Масштаб — колёсико мыши • Наведите на объект для контурного фокуса', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        color: '#dfcf9d',
        backgroundColor: '#07162cee',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(450);

    hud.add([timePill, zoomInBg, zoomInText, zoomOutBg, zoomOutText, centerBg, centerText, menuBg, menuText]);
    this.hudContainer = hud;

    this.repositionHud();

    // Auto-fade hint after 6 seconds
    this.time.delayedCall(6000, () => this.hideHint());
  }

  private setupStationTelemetry(): void {
    this.telemetryContainer?.destroy(true);

    const container = this.add.container(0, 0).setDepth(350).setScrollFactor(0);

    // Dark sleek background bar
    const barBg = this.add
      .rectangle(0, 0, 820, 28, 0x07182c, 0.92)
      .setStrokeStyle(1, 0x3d5c7c, 0.8);

    // Station crest icon if available
    let crest: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    if (this.textures.exists('badge-seal')) {
      crest = this.add.image(-390, 0, 'badge-seal').setDisplaySize(20, 20);
    } else {
      crest = this.add.rectangle(-390, 0, 16, 16, 0xf1c75b);
    }

    const titleText = this.add
      .text(-372, 0, 'СТАНЦИЯ 26063 · «СИНОПТИК»', {
        fontFamily: 'monospace, monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#f1c75b',
      })
      .setOrigin(0, 0.5);

    // Weather specs
    const telemetryText = this.add
      .text(-145, 0, 'P 1013.4 гПа ↗ +1.2 • T +8.2°C • Td +3.5°C • Ветер: ЮЗ 6 м/с • ДМРЛ: АКТИВЕН', {
        fontFamily: 'monospace, monospace',
        fontSize: '10px',
        color: '#dbe7e4',
      })
      .setOrigin(0, 0.5);

    // Quick shift button
    const shiftBtnBg = this.add
      .rectangle(345, 0, 118, 20, 0x244336, 0.95)
      .setStrokeStyle(1, 0x5db489, 0.9)
      .setInteractive({ useHandCursor: true });
    const shiftBtnText = this.add
      .text(345, 0, 'СМЕНА: КОД КН-01 →', {
        fontFamily: 'monospace, monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#e6faef',
      })
      .setOrigin(0.5);

    shiftBtnBg.on('pointerover', () => shiftBtnBg.setFillStyle(0x35624e, 1));
    shiftBtnBg.on('pointerout', () => shiftBtnBg.setFillStyle(0x244336, 0.95));
    shiftBtnBg.on('pointerdown', () => this.startShift());

    container.add([barBg, crest, titleText, telemetryText, shiftBtnBg, shiftBtnText]);
    this.telemetryContainer = container;

    this.repositionTelemetry();
  }

  private hideHint(): void {
    if (this.hintText?.active) {
      this.tweens.add({
        targets: this.hintText,
        alpha: 0,
        duration: 400,
        onComplete: () => this.hintText?.destroy(),
      });
    }
  }

  private repositionHud(): void {
    if (!this.hudContainer) return;
    this.hudContainer.setPosition(16, 16);

    if (this.hintText?.active) {
      this.hintText.setPosition(this.scale.width / 2, this.scale.height - 48);
    }
  }

  private repositionTelemetry(): void {
    if (!this.telemetryContainer) return;
    const vpW = this.scale.width;
    const vpH = this.scale.height;
    this.telemetryContainer.setPosition(vpW / 2, vpH - 18);
  }

  private createBuildingInteractives(): void {
    const buildings: {
      id: string;
      dossierId: string;
      name: string;
      badgeTitle: string;
      badgeSub: string;
      state: 'available' | 'locked';
      x: number;
      y: number;
      width: number;
      height: number;
      outlineKey: string;
      zoneX: number;
      zoneY: number;
      zoneWidth: number;
      zoneHeight: number;
      signX: number;
      signY: number;
      signWidth: number;
    }[] = [
      {
        id: 'hub.location.synoptic-center',
        dossierId: 'synoptic-center',
        name: 'Оперативный зал анализа',
        badgeTitle: '✦ ОПЕРАТИВНЫЙ ЗАЛ · КН-01',
        badgeSub: '● ДОСТУПНО · ДЕЖУРНАЯ СМЕНА',
        state: 'available',
        x: 335,
        y: 172,
        width: 287,
        height: 214,
        outlineKey: 'outline-synoptic',
        zoneX: 478,
        zoneY: 285,
        zoneWidth: 260,
        zoneHeight: 170,
        signX: 478,
        signY: 188,
        signWidth: 228,
      },
      {
        id: 'hub.location.cartography',
        dossierId: 'cartography',
        name: 'Картографический класс',
        badgeTitle: '🔒 КАРТОГРАФИЧЕСКИЙ КЛАСС',
        badgeSub: 'Требуется: сдать код КН-01',
        state: 'locked',
        x: 68,
        y: 195,
        width: 218,
        height: 158,
        outlineKey: 'outline-cartography',
        zoneX: 175,
        zoneY: 275,
        zoneWidth: 190,
        zoneHeight: 140,
        signX: 175,
        signY: 202,
        signWidth: 204,
      },
      {
        id: 'hub.location.radar',
        dossierId: 'radar',
        name: 'Радарный комплекс ДМРЛ-С',
        badgeTitle: '🔒 РАДАРНЫЙ КОМПЛЕКС ДМРЛ-С',
        badgeSub: 'Требуется: уровень 2 (Радар)',
        state: 'locked',
        x: 40,
        y: 80,
        width: 229,
        height: 170,
        outlineKey: 'outline-radar',
        zoneX: 150,
        zoneY: 165,
        zoneWidth: 200,
        zoneHeight: 150,
        signX: 150,
        signY: 96,
        signWidth: 204,
      },
      {
        id: 'hub.location.archive',
        dossierId: 'archive',
        name: 'Научно-исторический архив',
        badgeTitle: '🔒 НАУЧНЫЙ АРХИВ',
        badgeSub: 'Требуется: сдать код КН-01',
        state: 'locked',
        x: 551,
        y: 212,
        width: 212,
        height: 160,
        outlineKey: 'outline-archive',
        zoneX: 655,
        zoneY: 292,
        zoneWidth: 180,
        zoneHeight: 140,
        signX: 655,
        signY: 226,
        signWidth: 194,
      },
      {
        id: 'hub.location.aerology',
        dossierId: 'aerology',
        name: 'Аэрологический павильон',
        badgeTitle: '🔒 АЭРОЛОГИЧЕСКИЙ ПАВИЛЬОН',
        badgeSub: 'Требуется: уровень 3 (Зонд)',
        state: 'locked',
        x: 677,
        y: 97,
        width: 218,
        height: 162,
        outlineKey: 'outline-aerology',
        zoneX: 782,
        zoneY: 178,
        zoneWidth: 190,
        zoneHeight: 150,
        signX: 782,
        signY: 114,
        signWidth: 200,
      },
      {
        id: 'hub.location.tournament-hall',
        dossierId: 'tournament-hall',
        name: 'Турнирный зал дуэлей',
        badgeTitle: '🔒 ТУРНИРНЫЙ ЗАЛ ДУЭЛЕЙ',
        badgeSub: 'Требуется: зачёт по коду КН-01',
        state: 'locked',
        x: 729,
        y: 206,
        width: 223,
        height: 168,
        outlineKey: 'outline-tournament',
        zoneX: 840,
        zoneY: 290,
        zoneWidth: 190,
        zoneHeight: 150,
        signX: 840,
        signY: 226,
        signWidth: 204,
      },
    ];

    for (const bld of buildings) {
      this.createBuildingContour(bld);
    }
  }

  private createBuildingContour(bld: {
    id: string;
    dossierId: string;
    name: string;
    badgeTitle: string;
    badgeSub: string;
    state: 'available' | 'locked';
    x: number;
    y: number;
    width: number;
    height: number;
    outlineKey: string;
    zoneX: number;
    zoneY: number;
    zoneWidth: number;
    zoneHeight: number;
    signX: number;
    signY: number;
    signWidth: number;
  }): void {
    const isAvailable = bld.state === 'available';

    // 1. Golden contour outline sprite (starts hidden)
    const outline = this.add
      .image(bld.x, bld.y, bld.outlineKey)
      .setOrigin(0, 0)
      .setDepth(25)
      .setAlpha(0);

    // 2. Permanent architectural nameplate (always visible on campus)
    const sign = this.add.container(bld.signX, bld.signY).setDepth(45);
    const signW = bld.signWidth;
    const signH = 34;

    const signBg = this.add
      .rectangle(0, 0, signW, signH, isAvailable ? 0x07182cf8 : 0x061424ee, 0.95)
      .setStrokeStyle(isAvailable ? 1.5 : 1, isAvailable ? 0xf1c75b : 0x3d5c7c, 0.95);

    // Status pip
    const pipColor = isAvailable ? 0x5db489 : 0xe0a96d;
    const pip = this.add.circle(-signW / 2 + 13, 0, 3.5, pipColor, 1);

    if (isAvailable) {
      this.tweens.add({
        targets: pip,
        alpha: 0.35,
        scale: 0.75,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const titleText = this.add
      .text(-signW / 2 + 24, -7, bld.badgeTitle, {
        fontFamily: 'monospace, monospace',
        fontSize: isAvailable ? '10px' : '9px',
        fontStyle: 'bold',
        color: isAvailable ? '#ffd56a' : '#d2e2f0',
      })
      .setOrigin(0, 0.5);

    const subText = this.add
      .text(-signW / 2 + 24, 7, bld.badgeSub, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '8px',
        color: isAvailable ? '#75cbb0' : '#f5b665',
      })
      .setOrigin(0, 0.5);

    sign.add([signBg, pip, titleText, subText]);

    // Active facility breathing aura on border
    if (isAvailable) {
      this.tweens.add({
        targets: signBg,
        strokeAlpha: 0.5,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 3. Reliable, non-blocking Interactive Zone
    const zone = this.add
      .zone(bld.zoneX, bld.zoneY, bld.zoneWidth, bld.zoneHeight)
      .setOrigin(0.5, 0.5)
      .setDepth(50);

    zone.setData('semanticId', bld.id);
    zone.setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      worldAudio.play('audio.ui.hover-subtle');

      // 1. Organic glowing contour fade-in + gentle breathing pulse
      this.tweens.killTweensOf(outline);
      this.tweens.add({
        targets: outline,
        alpha: 1,
        duration: 160,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: outline,
            alpha: 0.82,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        },
      });

      // 2. Nameplate highlight scale and glow
      this.tweens.killTweensOf(sign);
      this.tweens.add({
        targets: sign,
        scale: 1.06,
        duration: 150,
        ease: 'Back.easeOut',
      });
      if (!isAvailable) {
        signBg.setStrokeStyle(1.5, 0xf1c75b, 1);
        signBg.setFillStyle(0x0a1e35, 0.98);
      }
    });

    zone.on('pointerout', () => {
      // Fade out outline contour
      this.tweens.killTweensOf(outline);
      this.tweens.add({
        targets: outline,
        alpha: 0,
        duration: 200,
        ease: 'Cubic.easeIn',
      });

      // Return nameplate to normal scale
      this.tweens.killTweensOf(sign);
      this.tweens.add({
        targets: sign,
        scale: 1.0,
        duration: 150,
        ease: 'Cubic.easeIn',
      });
      if (!isAvailable) {
        signBg.setStrokeStyle(1, 0x3d5c7c, 0.9);
        signBg.setFillStyle(0x061424ee, 0.95);
      }
    });

    zone.on('pointerup', () => {
      if (this.activeModal) return;

      if (bld.id.includes('radar')) {
        worldAudio.play('audio.interact.radar-pulse');
      } else if (bld.id.includes('aerology')) {
        worldAudio.play('audio.interact.balloon-release');
      } else if (bld.id.includes('archive')) {
        worldAudio.play('audio.interact.door-latch');
      } else {
        worldAudio.play('audio.ui.click-soft');
      }

      this.openFacilityDossier(bld.dossierId);
    });
  }

  public openFacilityDossier(facilityId: string): void {
    this.closeModal();

    const dossiers: Record<string, FacilityDossier> = {
      radar: {
        id: 'radar',
        title: 'РАДАРНЫЙ КОМПЛЕКС ДМРЛ-С',
        subtitle: 'Доплеровский двухполяризационный метеорологический радиолокатор',
        status: '🔒 ДОСТУП ЗАБЛОКИРОВАН · 2 УРОВЕНЬ',
        statusColor: '#e0a96d',
        isLocked: true,
        unlockRequirement: 'Доплеровский локатор C-диапазона доступен со 2-го уровня квалификации после завершения первой смены по коду КН-01.',
        textureKey: 'bld-radar',
        specs: [
          { label: 'Диапазон волн:', value: 'C-band (5.6 ГГц), двойная поляризация (Dual-Pol)' },
          { label: 'Радиус обзора:', value: '250 км (радиальная скорость до 125 км/ч)' },
          { label: 'Период сканирования:', value: '10 минут (14 углов места 0.5°–30°)' },
          { label: 'Измеряемые поля:', value: 'Z (отражаемость), V (скорость), W (турбулентность), ZDR, KDP' },
          { label: 'Назначение:', value: 'Обнаружение конвективных шквалов, града, гроз и интенсивных ливней' },
        ],
        primaryActionLabel: 'НАЧАТЬ С ДЕШИФРОВКИ КН-01 →',
        onPrimaryAction: () => this.startShift(),
      },
      cartography: {
        id: 'cartography',
        title: 'КАРТОГРАФИЧЕСКИЙ КЛАСС И АНАЛИЗ ПОГОДЫ',
        subtitle: 'Учебный полигон синоптической картографии и нанесения метеорологических планшетов',
        status: '🔒 ДОСТУП ЗАБЛОКИРОВАН · ТРЕБУЕТСЯ КН-01',
        statusColor: '#e0a96d',
        isLocked: true,
        unlockRequirement: 'Для работы с кольцевыми картами погоды и нанесения планшетов необходимо подтвердить навык базовой дешифровки сводок КН-01.',
        textureKey: 'bld-cartography',
        specs: [
          { label: 'Картографическая проекция:', value: 'Полярная стереографическая проекция (М 1:2 500 000, 1:5 000 000)' },
          { label: 'Станционные модели:', value: 'Кольцевая синоптическая схема КН-01 SYNOP (РД 52.27.759-2011)' },
          { label: 'Аналитические дисциплины:', value: 'Барический анализ, поле давления, приведение изобар, фронтогенез' },
          { label: 'Оперативный статус:', value: 'Аттестационный тренажер наблюдателей и дежурных инженеров-синоптиков' },
        ],
        primaryActionLabel: 'НАЧАТЬ С ДЕШИФРОВКИ КН-01 →',
        onPrimaryAction: () => this.startShift(),
      },
      'synoptic-center': {
        id: 'synoptic-center',
        title: 'ОПЕРАТИВНЫЙ ЗАЛ СИНОПТИЧЕСКОГО АНАЛИЗА',
        subtitle: 'Центральный рабочий терминал дежурной смены станции 26063',
        status: '● ДЕЖУРНАЯ СМЕНА ОТКРЫТА · ДОСТУП РАЗРЕШЁН',
        statusColor: '#5db489',
        isLocked: false,
        textureKey: 'bld-synoptic',
        specs: [
          { label: 'Телеграфная сеть:', value: 'Приём сводок КН-01 SYNOP каждые 3 ч (00, 03, 06… UTC)' },
          { label: 'Учебная задача:', value: 'Первичная дешифровка сводки КН-01 (температура, точка росы, давление станции, барическая тенденция)' },
          { label: 'Методический профиль:', value: 'Российская синоптическая школа (РД 52.27.759-2011)' },
          { label: 'Оперативные задачи:', value: 'Дешифровка КН-01, барический анализ, проведение изобар, фронтогенез' },
        ],
        primaryActionLabel: 'ПРИСТУПИТЬ К СМЕНЕ КН-01 →',
        onPrimaryAction: () => this.startShift(),
      },
      aerology: {
        id: 'aerology',
        title: 'АЭРОЛОГИЧЕСКИЙ ПАВИЛЬОН',
        subtitle: 'Лаборатория зондирования свободной атмосферы',
        status: '🔒 ДОСТУП ЗАБЛОКИРОВАН · 3 УРОВЕНЬ',
        statusColor: '#e0a96d',
        isLocked: true,
        unlockRequirement: 'Лаборатория зондирования свободной атмосферы доступна с 3-го уровня допуска после освоения приземного синоптического анализа.',
        textureKey: 'bld-aerology',
        specs: [
          { label: 'Комплекс аппаратуры:', value: 'Радиозонд АК-2, водородная газогенераторная станция' },
          { label: 'Телеметрия слоёв:', value: 'Давление (1050–5 гПа), Температура (-90…+50°C), Влажность' },
          { label: 'Высота подъёма:', value: 'до 32 000 м (нижняя и средняя стратосфера)' },
          { label: 'Аэрологическая диаграмма:', value: 'Расчёт уровней конденсации, конвекции и энергии неустойчивости' },
        ],
        primaryActionLabel: 'НАЧАТЬ С ДЕШИФРОВКИ КН-01 →',
        onPrimaryAction: () => this.startShift(),
      },
      archive: {
        id: 'archive',
        title: 'НАУЧНО-ИСТОРИЧЕСКИЙ АРХИВ',
        subtitle: 'Хранилище приземных журналов и исторических синоптических планшетов',
        status: '🔒 ДОСТУП ЗАБЛОКИРОВАН · ТРЕБУЕТСЯ КН-01',
        statusColor: '#e0a96d',
        isLocked: true,
        unlockRequirement: 'Доступ к научно-историческим фондам и журналам наблюдений открывается после завершения первой дежурной смены по коду КН-01.',
        textureKey: 'bld-archive',
        specs: [
          { label: 'Фонд наблюдений:', value: 'Журналы погоды КМ-1 с 1950 года, микрофиши, карты погоды' },
          { label: 'Эталонные архивы:', value: 'Исторические ураганы, наводнения Санкт-Петербурга, блокирующие антициклоны' },
          { label: 'Учебные планшеты:', value: 'Интерактивные тренировочные схемы нанесения станций' },
        ],
        primaryActionLabel: 'НАЧАТЬ С ДЕШИФРОВКИ КН-01 →',
        onPrimaryAction: () => this.startShift(),
      },
      'tournament-hall': {
        id: 'tournament-hall',
        title: 'ТУРНИРНЫЙ ЗАЛ СИНОПТИЧЕСКИХ ДУЭЛЕЙ',
        subtitle: 'Арена соревнований, квалификационных зачётов и блиц-дешифровки',
        status: '🔒 ДОСТУП ЗАБЛОКИРОВАН · ЗАЧЁТ КН-01',
        statusColor: '#e0a96d',
        isLocked: true,
        unlockRequirement: 'Арена турниров и синоптических дуэлей открывается для квалифицированных наблюдателей после сдачи стартового экзамена по коду КН-01.',
        textureKey: 'bld-tournament',
        specs: [
          { label: 'Дисциплины:', value: 'Синхронный блиц КН-01, поиск ошибок нанесения, барический анализ' },
          { label: 'Рейтинговая шкала:', value: 'Квалификация наблюдателя 1-3 класса, звание старшего синоптика' },
          { label: 'Проверка ответов:', value: 'Строгая серверная авторитетность без раскрытия эталона' },
        ],
        primaryActionLabel: 'НАЧАТЬ С ДЕШИФРОВКИ КН-01 →',
        onPrimaryAction: () => this.startShift(),
      },
    };

    const dossier = dossiers[facilityId];
    if (!dossier) return;

    this.renderDossierModal(dossier);
  }

  private renderDossierModal(dossier: FacilityDossier): void {
    const vpW = this.scale.width;
    const vpH = this.scale.height;

    const modal = this.add.container(vpW / 2, vpH / 2).setDepth(600).setScrollFactor(0);

    // Dim backdrop
    const backdrop = this.add
      .rectangle(0, 0, vpW * 2, vpH * 2, 0x020814, 0.85)
      .setInteractive();
    backdrop.on('pointerdown', () => this.closeModal());

    // Panel
    const cardW = Math.min(620, vpW - 40);
    const cardH = Math.min(480, vpH - 40);

    const cardBg = this.add
      .rectangle(0, 0, cardW, cardH, 0x08182b, 0.98)
      .setStrokeStyle(2, 0xf1c75b, 0.95);

    // Top ribbon
    const ribbon = this.add
      .rectangle(0, -cardH / 2 + 22, cardW - 4, 38, 0x0c223c, 1)
      .setStrokeStyle(1, 0x3d648c);

    const title = this.add
      .text(0, -cardH / 2 + 15, dossier.title, {
        fontFamily: 'monospace, monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f1c75b',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(0, -cardH / 2 + 32, dossier.subtitle, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '10px',
        color: '#bed1e3',
      })
      .setOrigin(0.5);

    // Close button [X]
    const closeBtn = this.add
      .text(cardW / 2 - 24, -cardH / 2 + 22, '✕', {
        fontFamily: 'monospace, monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#e6c875',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#e6c875'));
    closeBtn.on('pointerdown', () => this.closeModal());

    // Building image preview
    let spritePreview: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    if (this.textures.exists(dossier.textureKey)) {
      spritePreview = this.add
        .image(-cardW / 2 + 130, -cardH / 2 + 160, dossier.textureKey)
        .setDisplaySize(220, 165);
    } else {
      spritePreview = this.add
        .rectangle(-cardW / 2 + 130, -cardH / 2 + 160, 220, 165, 0x112b48);
    }

    // Status pill
    const statusPill = this.add
      .text(-cardW / 2 + 130, -cardH / 2 + 260, dossier.status, {
        fontFamily: 'monospace, monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: dossier.statusColor,
        backgroundColor: '#05111fe0',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);

    // Specifications list on the right
    const specsContainer = this.add.container(-cardW / 2 + 260, -cardH / 2 + 65);
    let specY = 0;
    for (const spec of dossier.specs) {
      const lbl = this.add.text(0, specY, spec.label, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#dfcf9d',
      });
      const val = this.add.text(0, specY + 14, spec.value, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '10px',
        color: '#e7f0fa',
        wordWrap: { width: cardW - 290 },
      });
      specsContainer.add([lbl, val]);
      specY += 14 + val.height + 8;
    }

    // Action button
    const elements: Phaser.GameObjects.GameObject[] = [
      backdrop,
      cardBg,
      ribbon,
      title,
      subtitle,
      closeBtn,
      spritePreview,
      statusPill,
      specsContainer,
    ];

    // Unlock requirement callout box if locked
    if (dossier.isLocked && dossier.unlockRequirement) {
      const lockBoxW = cardW - 280;
      const lockBoxBg = this.add
        .rectangle(cardW / 2 - lockBoxW / 2 - 20, cardH / 2 - 82, lockBoxW, 46, 0x221508, 0.96)
        .setStrokeStyle(1.5, 0xe0a96d, 0.95);

      const lockTitle = this.add
        .text(-cardW / 2 + 270, cardH / 2 - 99, '🔒 ТРЕБОВАНИЕ ДЛЯ РАЗБЛОКИРОВКИ:', {
          fontFamily: 'monospace, monospace',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#f1c75b',
        });

      const lockDesc = this.add
        .text(-cardW / 2 + 270, cardH / 2 - 84, dossier.unlockRequirement, {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '9px',
          color: '#f9ecd0',
          wordWrap: { width: lockBoxW - 20 },
        });

      elements.push(lockBoxBg, lockTitle, lockDesc);
    }

    if (dossier.primaryActionLabel && dossier.onPrimaryAction) {
      const isLocked = dossier.isLocked;
      const btnBgColor = isLocked ? 0x3d240d : 0x1c4d36;
      const btnHoverColor = isLocked ? 0x5a3514 : 0x276b4a;
      const btnStrokeColor = isLocked ? 0xf1a545 : 0x5db489;

      const btnBg = this.add
        .rectangle(0, cardH / 2 - 32, 270, 34, btnBgColor, 1)
        .setStrokeStyle(1.5, btnStrokeColor)
        .setInteractive({ useHandCursor: true });
      const btnText = this.add
        .text(0, cardH / 2 - 32, dossier.primaryActionLabel, {
          fontFamily: 'monospace, monospace',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#e6faef',
        })
        .setOrigin(0.5);

      btnBg.on('pointerover', () => btnBg.setFillStyle(btnHoverColor, 1));
      btnBg.on('pointerout', () => btnBg.setFillStyle(btnBgColor, 1));
      btnBg.on('pointerdown', () => {
        this.closeModal();
        dossier.onPrimaryAction?.();
      });

      elements.push(btnBg, btnText);
    }

    modal.add(elements);
    this.activeModal = modal;
    worldAudio.play('audio.ui.click-soft');
  }

  public closeModal(): void {
    if (this.activeModal) {
      this.activeModal.destroy(true);
      this.activeModal = undefined;
      worldAudio.play('audio.ui.click-soft');
    }
  }

  private startShift(): void {
    this.dispatchUiEvent('hub:start-shift');
    this.showNotice('Переход в оперативный зал синоптического анализа…');
  }

  private dispatchUiEvent(name: string): void {
    window.dispatchEvent(new CustomEvent(name));
  }

  private showNotice(message: string): void {
    this.notice?.destroy(true);

    const background = this.add
      .rectangle(HUB_MASTER_WIDTH / 2, 443, 560, 42, 0x07182c, 0.95)
      .setStrokeStyle(2, 0xf1c75b, 0.95);
    const text = this.add
      .text(HUB_MASTER_WIDTH / 2, 443, message, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: '600',
        color: '#fff4ce',
        align: 'center',
        wordWrap: { width: 530 },
      })
      .setOrigin(0.5);

    this.notice = this.add.container(0, 0, [background, text]).setDepth(100);
    this.time.delayedCall(3000, () => {
      if (this.notice?.active) {
        this.notice.destroy(true);
      }
    });
  }
}
