import Phaser from 'phaser';
import { worldAudio } from '../../audio/WorldAudioManager';
import {
  HUB_MASTER_HEIGHT,
  HUB_MASTER_RUNTIME_DATA_URI,
  HUB_MASTER_TEXTURE_KEY,
  HUB_MASTER_WIDTH,
} from '../../assets/hub/masterAsset';
import { bindLogicalViewport } from '../../runtime/fitLogicalViewport';

interface HubHotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: () => void;
}

export class HubScene extends Phaser.Scene {
  private notice?: Phaser.GameObjects.Container;

  constructor() {
    super('hub');
  }

  preload(): void {
    if (!this.textures.exists(HUB_MASTER_TEXTURE_KEY)) {
      this.load.image(HUB_MASTER_TEXTURE_KEY, HUB_MASTER_RUNTIME_DATA_URI);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#07162c');

    this.add
      .image(0, 0, HUB_MASTER_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setDisplaySize(HUB_MASTER_WIDTH, HUB_MASTER_HEIGHT);

    this.createSemanticHotspots();
    bindLogicalViewport(this, HUB_MASTER_WIDTH, HUB_MASTER_HEIGHT);

    worldAudio.playAmbientBed('audio.ambient.wind-trees');
    worldAudio.startFaunaSchedule();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      worldAudio.stopFaunaSchedule();
    });
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
    const hitArea = this.add
      .rectangle(hotspot.x, hotspot.y, hotspot.width, hotspot.height, 0xffffff, 0.001)
      .setDepth(50)
      .setStrokeStyle(2, 0xffd56a, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.setData('semanticId', hotspot.id);

    hitArea.on('pointerover', () => {
      worldAudio.play('audio.ui.hover-subtle');
      hitArea.setFillStyle(0xffd56a, 0.035).setStrokeStyle(2, 0xffd56a, 0.9);
    });

    hitArea.on('pointerout', () => {
      hitArea.setFillStyle(0xffffff, 0.001).setStrokeStyle(2, 0xffd56a, 0);
    });

    hitArea.on('pointerdown', () => {
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
