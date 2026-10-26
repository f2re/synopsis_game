import Phaser from 'phaser';
import { createPixelButton } from '../ui/createPixelButton';
import {
  drawArchiveBox,
  drawArchiveLamp,
  drawArchiveTable,
  drawBookshelf,
  drawCatalogCabinet,
  drawFolderStack,
} from './archivePixelObjects';

export class ArchiveScene extends Phaser.Scene {
  private notice?: Phaser.GameObjects.Container;

  constructor() {
    super('archive');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#d9ceb5');
    this.drawRoom();
    this.drawActions();
  }

  private drawRoom(): void {
    const g = this.add.graphics();

    // Warm plaster wall and darker floor.
    g.fillStyle(0xd9ceb5, 1).fillRect(0, 0, 480, 205);
    g.fillStyle(0xc3b499, 1).fillRect(0, 205, 480, 65);
    g.fillStyle(0xb5a386, 1).fillRect(0, 203, 480, 4);

    // Ceiling beam and trim.
    g.fillStyle(0x654a36, 1).fillRect(0, 0, 480, 8);
    g.fillStyle(0x806044, 1).fillRect(0, 8, 480, 4);

    // Window with mountain daylight.
    g.fillStyle(0x5b4939, 1).fillRect(201, 34, 78, 58);
    g.fillStyle(0xa6d7e5, 1).fillRect(205, 38, 70, 50);
    g.fillStyle(0x8aa6c8, 1).fillTriangle(206, 88, 236, 56, 260, 88);
    g.fillStyle(0x718bb0, 1).fillTriangle(235, 88, 263, 52, 275, 88);
    g.fillStyle(0x6d9c6a, 1).fillRect(205, 76, 70, 12);
    g.fillStyle(0x5b4939, 1).fillRect(238, 38, 3, 50);
    g.fillRect(205, 61, 70, 3);

    // First reusable archive object family.
    drawBookshelf(this, 28, 48);
    drawBookshelf(this, 72, 48);
    drawBookshelf(this, 382, 48);
    drawBookshelf(this, 424, 48);
    drawCatalogCabinet(this, 330, 93);

    drawArchiveTable(this, 211, 142);
    drawArchiveLamp(this, 225, 132, true);
    drawFolderStack(this, 244, 140);

    drawArchiveBox(this, 123, 165, false);
    drawArchiveBox(this, 145, 162, true);
    drawArchiveBox(this, 352, 168, false);

    // Simple empty frame: no professional meteorological symbols inside.
    g.fillStyle(0x66503d, 1).fillRect(310, 42, 46, 34);
    g.fillStyle(0xe5dcc6, 1).fillRect(314, 46, 38, 26);
    g.fillStyle(0x8b9e87, 1).fillRect(318, 50, 9, 5);
    g.fillStyle(0xa9b6c8, 1).fillRect(333, 55, 13, 7);

    // Header uses ordinary UI text, not baked into the art.
    this.add.text(16, 17, 'Архив', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#263640',
    });

    this.add.text(16, 31, 'Тихое рабочее помещение: каталоги, карты и архивные ситуации', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#5b655f',
    });
  }

  private drawActions(): void {
    createPixelButton(this, {
      x: 96,
      y: 223,
      width: 124,
      height: 24,
      label: 'Архивные ситуации',
      state: 'locked',
      onUnavailable: () => this.showNotice('Появятся после подключения пакетов ситуаций'),
    });

    createPixelButton(this, {
      x: 240,
      y: 223,
      width: 116,
      height: 24,
      label: 'Старые карты',
      state: 'locked',
      onUnavailable: () => this.showNotice('Откроется после первой завершённой смены'),
    });

    createPixelButton(this, {
      x: 373,
      y: 223,
      width: 108,
      height: 24,
      label: 'Коллекции',
      state: 'disabled',
      onUnavailable: () => this.showNotice('Коллекции — в разработке'),
    });

    createPixelButton(this, {
      x: 240,
      y: 254,
      width: 132,
      height: 24,
      label: 'Вернуться в центр',
      state: 'secondary',
      onClick: () => this.scene.start('hub'),
    });
  }

  private showNotice(message: string): void {
    this.notice?.destroy(true);

    const background = this.add
      .rectangle(240, 191, 286, 26, 0x263e4f, 0.97)
      .setStrokeStyle(1, 0xe1c86b);
    const text = this.add
      .text(240, 191, message, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#f6f1e5',
        align: 'center',
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
