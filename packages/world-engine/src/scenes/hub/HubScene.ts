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

interface HubHotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: () => void;
}

export class HubScene extends Phaser.Scene {
  private hubBg!: Phaser.GameObjects.Image;
  private isNightMode = true; // Night mode by default
  private baseZoom = 1;
  private notice?: Phaser.GameObjects.Container;
  private hudContainer?: Phaser.GameObjects.Container;
  private hintText?: Phaser.GameObjects.Text;
  private timeButtonText?: Phaser.GameObjects.Text;

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
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#030914');

    // Create background with initial night texture
    const initialTexture = this.textures.exists(HUB_MASTER_NIGHT_TEXTURE_KEY)
      ? HUB_MASTER_NIGHT_TEXTURE_KEY
      : HUB_MASTER_TEXTURE_KEY;

    this.hubBg = this.add
      .image(0, 0, initialTexture)
      .setOrigin(0, 0)
      .setDisplaySize(HUB_MASTER_WIDTH, HUB_MASTER_HEIGHT);

    // Fallback if textures are still decoding
    if (!this.textures.exists(initialTexture) || this.textures.get(initialTexture).key === '__MISSING') {
      const img = new Image();
      img.onload = () => {
        if (!this.textures.exists(initialTexture) || this.textures.get(initialTexture).key === '__MISSING') {
          this.textures.addImage(initialTexture, img);
          this.hubBg.setTexture(initialTexture);
        }
      };
      img.src = HUB_MASTER_RUNTIME_DATA_URI;
    }

    this.createSemanticHotspots();
    this.setupInteractiveCamera();
    this.setupHud();
    this.fitViewport();

    // Scale resize event
    const onResize = () => {
      this.fitViewport();
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    // Initial ambient sound
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

  private fitViewport(): void {
    const camera = this.cameras.main;
    const vpW = Math.max(this.scale.width, 1);
    const vpH = Math.max(this.scale.height, 1);

    this.baseZoom = Math.max(vpW / HUB_MASTER_WIDTH, vpH / HUB_MASTER_HEIGHT);

    camera.setViewport(0, 0, vpW, vpH);
    camera.setZoom(this.baseZoom);
    camera.centerOn(HUB_MASTER_WIDTH / 2, HUB_MASTER_HEIGHT / 2);

    this.repositionHud();
  }

  private setupInteractiveCamera(): void {
    const camera = this.cameras.main;
    const canvas = this.game.canvas;

    let isPointerDown = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let camStartX = 0;
    let camStartY = 0;
    let isDragging = false;

    // Bounds margin: allows panning with edge margin
    const marginX = 140;
    const marginY = 90;
    camera.setBounds(-marginX, -marginY, HUB_MASTER_WIDTH + marginX * 2, HUB_MASTER_HEIGHT + marginY * 2);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) {
        isPointerDown = true;
        isDragging = false;
        dragStartX = pointer.x;
        dragStartY = pointer.y;
        camStartX = camera.scrollX;
        camStartY = camera.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!isPointerDown) return;
      const dx = (pointer.x - dragStartX) / camera.zoom;
      const dy = (pointer.y - dragStartY) / camera.zoom;
      if (!isDragging && Math.hypot(pointer.x - dragStartX, pointer.y - dragStartY) > 5) {
        isDragging = true;
        if (canvas) canvas.style.cursor = 'grabbing';
        this.hideHint();
      }
      if (isDragging) {
        camera.scrollX = camStartX - dx;
        camera.scrollY = camStartY - dy;
      }
    });

    const endDrag = () => {
      if (isPointerDown) {
        isPointerDown = false;
        isDragging = false;
        if (canvas) canvas.style.cursor = 'default';
      }
    };

    this.input.on('pointerup', endDrag);
    this.input.on('pointerupoutside', endDrag);

    // Mouse wheel zoom focused on center
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoomFactor = deltaY > 0 ? 0.92 : 1.08;
      const minZoom = this.baseZoom * 0.75;
      const maxZoom = this.baseZoom * 2.8;
      const newZoom = Phaser.Math.Clamp(camera.zoom * zoomFactor, minZoom, maxZoom);

      if (Math.abs(newZoom - camera.zoom) > 0.001) {
        camera.setZoom(newZoom);
        this.hideHint();
      }
    });
  }

  private resetCameraView(): void {
    const camera = this.cameras.main;
    this.tweens.add({
      targets: camera,
      zoom: this.baseZoom,
      duration: 350,
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
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * 1.2, this.baseZoom * 0.75, this.baseZoom * 2.8));
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
      camera.setZoom(Phaser.Math.Clamp(camera.zoom / 1.2, this.baseZoom * 0.75, this.baseZoom * 2.8));
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

    // 5. Hint banner at the bottom
    this.hintText = this.add
      .text(0, 0, '✢ Перетаскивание — зажмите ЛКМ • ⚲ Масштаб — колёсико мыши', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        color: '#dfcf9d',
        backgroundColor: '#07162cee',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(450);

    hud.add([timePill, zoomInBg, zoomInText, zoomOutBg, zoomOutText, centerBg, centerText]);
    this.hudContainer = hud;

    this.repositionHud();

    // Auto-fade hint after 5 seconds
    this.time.delayedCall(5000, () => this.hideHint());
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
    const vpW = this.scale.width;
    const vpH = this.scale.height;

    // Position HUD at top-left
    this.hudContainer.setPosition(16, 16);

    if (this.hintText?.active) {
      this.hintText.setPosition(vpW / 2, vpH - 22);
    }
  }

  private createSemanticHotspots(): void {
    const hotspots: HubHotspot[] = [
      {
        id: 'hub.profile',
        x: 40,
        y: 27,
        width: 54,
        height: 48,
        action: () => this.dispatchUiEvent('hub:session-menu'),
      },
      {
        id: 'hub.settings',
        x: 927,
        y: 27,
        width: 44,
        height: 44,
        action: () => this.dispatchUiEvent('hub:session-menu'),
      },
      {
        id: 'hub.location.radar',
        x: 164,
        y: 136,
        width: 126,
        height: 43,
        action: () => this.showNotice('Радар откроется на уровне 2.'),
      },
      {
        id: 'hub.location.maps-analysis',
        x: 150,
        y: 232,
        width: 150,
        height: 43,
        action: () => this.showNotice('Карты и анализ откроются на уровне 3.'),
      },
      {
        id: 'hub.location.aerology',
        x: 742,
        y: 169,
        width: 146,
        height: 44,
        action: () => this.showNotice('Аэрология откроется на уровне 3.'),
      },
      {
        id: 'hub.location.archive',
        x: 620,
        y: 284,
        width: 132,
        height: 43,
        action: () => this.scene.start('archive'),
      },
      {
        id: 'hub.location.tournament-hall',
        x: 826,
        y: 289,
        width: 154,
        height: 43,
        action: () => this.showNotice('Турнирный зал откроется на уровне 2.'),
      },
      {
        id: 'hub.location.synoptic-center',
        x: 445,
        y: 198,
        width: 198,
        height: 42,
        action: () => this.startShift(),
      },
      {
        id: 'hub.nav.blitz',
        x: 67,
        y: 501,
        width: 108,
        height: 56,
        action: () => this.showNotice('Блиц будет подключён следующим игровым срезом.'),
      },
      {
        id: 'hub.nav.duel',
        x: 178,
        y: 501,
        width: 108,
        height: 56,
        action: () => this.showNotice('Дуэль будет подключена следующим игровым срезом.'),
      },
      {
        id: 'hub.nav.start-shift',
        x: 427,
        y: 500,
        width: 275,
        height: 70,
        action: () => this.startShift(),
      },
      {
        id: 'hub.nav.inventory',
        x: 602,
        y: 501,
        width: 98,
        height: 56,
        action: () => this.showNotice('Инвентарь уже спроектирован и подключается следующим срезом.'),
      },
      {
        id: 'hub.nav.tournament',
        x: 705,
        y: 501,
        width: 98,
        height: 56,
        action: () => this.showNotice('Турнир откроется после разблокировки турнирного зала.'),
      },
      {
        id: 'hub.nav.archive',
        x: 807,
        y: 501,
        width: 96,
        height: 56,
        action: () => this.scene.start('archive'),
      },
      {
        id: 'hub.nav.tasks',
        x: 910,
        y: 501,
        width: 92,
        height: 56,
        action: () => this.showNotice('Задания будут доступны в рабочей смене.'),
      },
    ];

    for (const hotspot of hotspots) {
      this.createHotspot(hotspot);
    }
  }

  private createHotspot(hotspot: HubHotspot): void {
    let downX = 0;
    let downY = 0;

    const hitArea = this.add
      .rectangle(hotspot.x, hotspot.y, hotspot.width, hotspot.height, 0xffffff, 0.001)
      .setDepth(50)
      .setStrokeStyle(2, 0xffd56a, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.setData('semanticId', hotspot.id);

    hitArea.on('pointerover', () => {
      worldAudio.play('audio.ui.hover-subtle');
      hitArea.setFillStyle(0xffd56a, 0.04).setStrokeStyle(2, 0xffd56a, 0.95);
    });

    hitArea.on('pointerout', () => {
      hitArea.setFillStyle(0xffffff, 0.001).setStrokeStyle(2, 0xffd56a, 0);
    });

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      downX = pointer.x;
      downY = pointer.y;
    });

    hitArea.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Ignore if user was dragging camera
      if (Math.hypot(pointer.x - downX, pointer.y - downY) > 6) {
        return;
      }
      if (hotspot.id.includes('radar')) {
        worldAudio.play('audio.interact.radar-pulse');
      } else if (hotspot.id.includes('aerology')) {
        worldAudio.play('audio.interact.balloon-release');
      } else if (hotspot.id.includes('archive')) {
        worldAudio.play('audio.interact.door-latch');
      } else {
        worldAudio.play('audio.ui.click-soft');
      }
      hotspot.action();
    });
  }

  private startShift(): void {
    this.dispatchUiEvent('hub:start-shift');
    this.showNotice('Рабочая смена — следующий игровой срез. Главный Hub уже работает на production-арте.');
  }

  private dispatchUiEvent(name: string): void {
    window.dispatchEvent(new CustomEvent(name));
  }

  private showNotice(message: string): void {
    this.notice?.destroy(true);

    const background = this.add
      .rectangle(HUB_MASTER_WIDTH / 2, 443, 520, 38, 0x07182c, 0.94)
      .setStrokeStyle(2, 0xf1c75b, 0.95);
    const text = this.add
      .text(HUB_MASTER_WIDTH / 2, 443, message, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: '600',
        color: '#fff4ce',
        align: 'center',
        wordWrap: { width: 490 },
      })
      .setOrigin(0.5);

    this.notice = this.add.container(0, 0, [background, text]).setDepth(100);
    this.time.delayedCall(2400, () => {
      if (this.notice?.active) {
        this.notice.destroy(true);
      }
    });
  }
}
