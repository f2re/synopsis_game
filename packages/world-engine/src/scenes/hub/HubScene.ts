import Phaser from 'phaser';
import { drawArchiveFacade } from '../archive/archivePixelObjects';
import { createLocationMarker } from '../ui/createLocationMarker';
import { createPixelButton } from '../ui/createPixelButton';
import { HUB_LOCATIONS, type HubLocationDefinition } from './locationRegistry';

const W = 480;
const H = 270;

export class HubScene extends Phaser.Scene {
  private notice?: Phaser.GameObjects.Container;

  constructor() {
    super('hub');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#8ec9e5');
    this.drawWorld();
    this.drawLocations();
    this.drawBottomNavigation();
  }

  private drawWorld(): void {
    const g = this.add.graphics();

    // Sky and distant water.
    g.fillStyle(0x8ec9e5, 1).fillRect(0, 0, W, 116);
    g.fillStyle(0xf6f0e6, 1).fillCircle(410, 31, 9);
    g.fillStyle(0x78b7c9, 1).fillRect(0, 94, W, 42);

    // Chunky mountains: large forms, few shades.
    g.fillStyle(0x9eb1cf, 1).fillTriangle(25, 105, 125, 30, 212, 105);
    g.fillStyle(0x7f9abc, 1).fillTriangle(138, 105, 242, 40, 330, 105);
    g.fillStyle(0x91a6c8, 1).fillTriangle(275, 105, 370, 35, 468, 105);
    g.fillStyle(0xf4efe6, 1).fillTriangle(97, 51, 125, 30, 151, 51);
    g.fillTriangle(218, 55, 242, 40, 268, 57);
    g.fillTriangle(344, 54, 370, 35, 394, 55);

    // Ground and paths.
    g.fillStyle(0x5f8d5e, 1).fillRect(0, 112, W, 126);
    g.fillStyle(0x86aa6e, 1).fillRect(0, 132, W, 106);
    g.fillStyle(0xd9cdb3, 1);
    g.fillTriangle(240, 132, 197, 238, 284, 238);
    g.fillTriangle(238, 165, 64, 238, 220, 238);
    g.fillTriangle(246, 165, 418, 238, 262, 238);

    // River / channel on the right.
    g.fillStyle(0x6fb5c6, 1).fillRect(328, 158, 36, 80);
    g.fillStyle(0xa8d9dc, 1).fillRect(335, 164, 4, 65);
    g.fillRect(351, 170, 3, 56);

    // Trees as deliberately chunky pixel masses.
    const treeXs = [14, 33, 57, 111, 136, 357, 381, 425, 455];
    for (const x of treeXs) {
      const y = 132 + ((x * 7) % 38);
      g.fillStyle(0x365f4a, 1).fillRect(x, y - 28, 5, 31);
      g.fillStyle(0x426f50, 1).fillTriangle(x - 9, y - 8, x + 14, y - 8, x + 2, y - 33);
      g.fillStyle(0x5e8959, 1).fillTriangle(x - 7, y - 17, x + 12, y - 17, x + 2, y - 39);
    }

    // Main scientific building: low, readable and non-palatial.
    g.fillStyle(0xd7cdb5, 1).fillRect(192, 104, 96, 67);
    g.fillStyle(0xc0b49d, 1).fillRect(185, 158, 110, 8);
    g.fillStyle(0x6c5a47, 1).fillRect(189, 99, 102, 8);
    g.fillStyle(0x7eb4b0, 1).fillRect(218, 89, 44, 20);
    g.fillStyle(0xb9ddd7, 1).fillRect(222, 91, 36, 16);
    g.fillStyle(0x3f5964, 1).fillRect(239, 91, 2, 16);
    g.fillStyle(0x3f5964, 1).fillRect(222, 99, 36, 2);

    // Entrance and windows.
    g.fillStyle(0x5a4636, 1).fillRect(232, 137, 18, 34);
    g.fillStyle(0xf1c46c, 1).fillRect(235, 140, 12, 17);
    for (const wx of [200, 213, 265, 278]) {
      g.fillStyle(0x5a4636, 1).fillRect(wx, 123, 9, 15);
      g.fillStyle(0xf1c46c, 1).fillRect(wx + 2, 125, 5, 10);
    }

    // Weather instruments on the roof.
    g.fillStyle(0x33434d, 1).fillRect(238, 78, 2, 12);
    g.fillRect(233, 78, 12, 2);
    g.fillCircle(233, 79, 3);
    g.fillCircle(245, 79, 3);
    g.fillCircle(239, 74, 3);

    // Small bridges across the channel.
    g.fillStyle(0xc8baa0, 1).fillRect(316, 183, 60, 6);
    g.fillRect(316, 215, 60, 6);

    // Ambient flowers: clusters, not single-pixel noise.
    const flowerSpots = [
      [153, 180], [173, 193], [306, 190], [294, 213], [77, 205], [399, 198],
    ];
    for (const [x, y] of flowerSpots) {
      g.fillStyle(0xe7a4b5, 1).fillRect(x, y, 4, 3);
      g.fillStyle(0xf1d06f, 1).fillRect(x + 5, y + 1, 3, 3);
      g.fillStyle(0x6f985e, 1).fillRect(x + 2, y + 4, 4, 3);
    }

    // Archive facade is the first authored location object.
    drawArchiveFacade(this, 91, 206);

    // Other location silhouettes are deliberately simple until their sprite families are authored.
    this.drawLockedBuilding(g, 82, 131, 55, 27);
    this.drawLockedBuilding(g, 390, 167, 58, 28);
    this.drawLockedBuilding(g, 397, 98, 44, 31);
    this.drawLockedBuilding(g, 86, 72, 50, 27);
    this.drawLockedBuilding(g, 397, 220, 50, 28);

    // A quiet armillary/fountain in the central plaza.
    g.lineStyle(2, 0xb9904c, 1).strokeCircle(240, 203, 12);
    g.strokeEllipse(240, 203, 23, 8);
    g.strokeEllipse(240, 203, 8, 23);
    g.fillStyle(0x6da8b9, 1).fillCircle(240, 203, 4);
  }

  private drawLockedBuilding(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    g.fillStyle(0x8d9b8d, 1).fillRect(x - width / 2, y - height / 2, width, height);
    g.fillStyle(0x6f7b72, 1).fillTriangle(
      x - width / 2 - 4,
      y - height / 2,
      x + width / 2 + 4,
      y - height / 2,
      x,
      y - height / 2 - 12,
    );
    g.fillStyle(0x52625d, 1).fillRect(x - 5, y, 10, height / 2);
  }

  private drawLocations(): void {
    for (const location of HUB_LOCATIONS) {
      createLocationMarker(this, {
        location,
        onOpen: (selected) => this.openLocation(selected),
        onBlocked: (selected) => this.showNotice(selected.unlockHint ?? 'Локация пока закрыта'),
      });
    }
  }

  private drawBottomNavigation(): void {
    this.add.rectangle(240, 254, 480, 32, 0x113f43, 0.97).setStrokeStyle(1, 0x326d68);

    createPixelButton(this, {
      x: 52,
      y: 254,
      width: 74,
      height: 22,
      label: 'Профиль',
      state: 'disabled',
      onUnavailable: () => this.showNotice('Профиль — в разработке'),
    });

    createPixelButton(this, {
      x: 131,
      y: 254,
      width: 74,
      height: 22,
      label: 'Инвентарь',
      state: 'disabled',
      onUnavailable: () => this.showNotice('Инвентарь — в разработке'),
    });

    createPixelButton(this, {
      x: 240,
      y: 254,
      width: 126,
      height: 26,
      label: 'Начать смену',
      state: 'primary',
      onClick: () => this.showNotice('Экран смены ещё не подключён'),
    });

    createPixelButton(this, {
      x: 348,
      y: 254,
      width: 68,
      height: 22,
      label: 'Лига',
      state: 'disabled',
      onUnavailable: () => this.showNotice('Лига — в разработке'),
    });

    createPixelButton(this, {
      x: 425,
      y: 254,
      width: 72,
      height: 22,
      label: 'Архив',
      state: 'secondary',
      onClick: () => this.scene.start('archive'),
    });
  }

  private openLocation(location: HubLocationDefinition): void {
    if (location.sceneKey) {
      this.scene.start(location.sceneKey);
      return;
    }
    this.showNotice('Экран этой локации ещё не подключён');
  }

  private showNotice(message: string): void {
    this.notice?.destroy(true);

    const background = this.add
      .rectangle(240, 224, 250, 24, 0x20384d, 0.97)
      .setStrokeStyle(1, 0xf0d476);
    const text = this.add
      .text(240, 224, message, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#f7f2df',
        align: 'center',
      })
      .setOrigin(0.5);

    this.notice = this.add.container(0, 0, [background, text]).setDepth(100);
    this.time.delayedCall(2200, () => {
      if (this.notice?.active) {
        this.notice.destroy(true);
      }
    });
  }
}
