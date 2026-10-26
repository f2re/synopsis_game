import Phaser from 'phaser';

const CREAM = 0xd9ceb5;
const STONE = 0xb7aa90;
const WOOD_DARK = 0x5e4634;
const WOOD = 0x8b6446;
const PAPER = 0xe8ddbd;
const GOLD = 0xd6a84e;
const WINDOW = 0xf4c56a;
const SHADOW = 0x2f3f49;
const GREEN = 0x55785a;

export function drawArchiveFacade(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(CREAM, 1).fillRect(-34, -31, 68, 45);
  g.fillStyle(WOOD_DARK, 1).fillRect(-38, -35, 76, 7);
  g.fillStyle(WOOD, 1).fillTriangle(-42, -35, 42, -35, 0, -51);
  g.fillStyle(STONE, 1).fillRect(-36, 14, 72, 5);

  g.fillStyle(WOOD_DARK, 1).fillRect(-8, -10, 16, 24);
  g.fillStyle(WINDOW, 1).fillRect(-5, -7, 10, 13);
  g.fillStyle(0x3b3028, 1).fillRect(-5, 7, 10, 7);

  for (const wx of [-25, 18]) {
    g.fillStyle(WOOD_DARK, 1).fillRect(wx, -19, 15, 16);
    g.fillStyle(WINDOW, 1).fillRect(wx + 2, -17, 11, 12);
    g.fillStyle(WOOD_DARK, 1).fillRect(wx + 7, -17, 1, 12);
    g.fillRect(wx + 2, -12, 11, 1);
  }

  g.fillStyle(GREEN, 1).fillRect(-34, -27, 3, 18);
  g.fillRect(31, -23, 3, 15);
  g.fillRect(-29, -31, 4, 4);
  g.fillRect(26, -28, 4, 4);

  const container = scene.add.container(x, y, [g]);
  container.setName('archive.facade.base');
  return container;
}

export function drawBookshelf(scene: Phaser.Scene, x: number, y: number, low = false): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const width = low ? 34 : 28;
  const height = low ? 31 : 58;
  g.fillStyle(WOOD_DARK, 1).fillRect(x, y, width, height);
  g.fillStyle(WOOD, 1).fillRect(x + 2, y + 2, width - 4, height - 4);

  const shelfY = low ? [y + 14, y + 27] : [y + 15, y + 30, y + 45];
  shelfY.forEach((sy) => g.fillStyle(WOOD_DARK, 1).fillRect(x + 2, sy, width - 4, 2));

  const colors = [0x8d5544, 0x58708c, 0x6f7f54, 0xc19752, 0x765a7d];
  for (let row = 0; row < (low ? 2 : 3); row += 1) {
    const baseY = y + 5 + row * 15;
    for (let i = 0; i < 5; i += 1) {
      g.fillStyle(colors[(row + i) % colors.length], 1).fillRect(x + 4 + i * 4, baseY, 3, 8 + ((row + i) % 3));
    }
  }

  g.setName(low ? 'archive.bookshelf.low' : 'archive.bookshelf.tall');
  return g;
}

export function drawArchiveBox(scene: Phaser.Scene, x: number, y: number, open = false): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0xb58a56, 1).fillRect(x, y, 18, 11);
  g.fillStyle(0x8d673f, 1).fillRect(x, y + 8, 18, 3);
  g.fillStyle(PAPER, 1).fillRect(x + 6, y + 3, 6, 3);
  if (open) {
    g.fillStyle(0x8d673f, 1).fillRect(x - 1, y - 4, 20, 4);
    g.fillStyle(PAPER, 1).fillRect(x + 4, y - 6, 2, 5);
    g.fillRect(x + 9, y - 5, 2, 5);
  }
  g.setName(open ? 'archive.box.open' : 'archive.box.closed');
  return g;
}

export function drawCatalogCabinet(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(WOOD_DARK, 1).fillRect(x, y, 32, 30);
  g.fillStyle(WOOD, 1).fillRect(x + 2, y + 2, 28, 26);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const dx = x + 4 + col * 7;
      const dy = y + 4 + row * 8;
      g.fillStyle(0x75533d, 1).fillRect(dx, dy, 5, 6);
      g.fillStyle(GOLD, 1).fillRect(dx + 2, dy + 2, 1, 1);
    }
  }
  g.setName('archive.catalog.cabinet');
  return g;
}

export function drawArchiveTable(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(WOOD_DARK, 1).fillRect(x, y, 56, 6);
  g.fillStyle(WOOD, 1).fillRect(x + 2, y + 1, 52, 3);
  g.fillStyle(WOOD_DARK, 1).fillRect(x + 5, y + 6, 4, 22);
  g.fillRect(x + 47, y + 6, 4, 22);
  g.setName('archive.table');
  return g;
}

export function drawArchiveLamp(scene: Phaser.Scene, x: number, y: number, on = true): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  if (on) {
    g.fillStyle(WINDOW, 0.16).fillCircle(x, y + 2, 17);
  }
  g.fillStyle(SHADOW, 1).fillRect(x - 1, y, 2, 13);
  g.fillRect(x - 6, y + 12, 12, 2);
  g.fillStyle(on ? WINDOW : 0x78818b, 1).fillTriangle(x - 7, y, x + 7, y, x, y - 7);
  g.setName(on ? 'archive.lamp.on' : 'archive.lamp.off');
  return g;
}

export function drawFolderStack(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x637d98, 1).fillRect(x, y, 18, 3);
  g.fillStyle(0x9b6d58, 1).fillRect(x + 2, y - 4, 17, 3);
  g.fillStyle(0x6f815b, 1).fillRect(x + 1, y - 8, 18, 3);
  g.setName('archive.folder.stack');
  return g;
}
