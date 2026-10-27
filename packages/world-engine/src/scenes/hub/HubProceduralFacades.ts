import type Phaser from 'phaser';

export type FacadeVariant = 'school' | 'dome' | 'hall' | 'stevenson' | 'canteen';

export interface FacadeSpec {
  variant: FacadeVariant;
  wall: number;
  roof: number;
  trim: number;
}

const DOOR = 0x5a3a28;
const GLASS = 0xf2c75c;
const SNOW = 0xf4f7fa;

function rect(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w: number, h: number): void {
  g.fillStyle(color, 1);
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function roofWithSnow(
  g: Phaser.GameObjects.Graphics,
  spec: FacadeSpec,
  x: number,
  y: number,
  w: number,
  h: number,
  snow: boolean,
): void {
  rect(g, spec.roof, x - 3, y, w + 6, h);
  rect(g, spec.trim, x - 3, y + h - 1, w + 6, 1);
  if (snow) rect(g, SNOW, x - 3, y, w + 6, Math.max(2, Math.floor(h / 2)));
}

/**
 * Запасной фасад на 1×-сетке для зданий, которых нет в растре L5.
 * Рисуется в абсолютных координатах сцены; заменяется растром после приёмки арта.
 */
export function drawProceduralFacade(
  g: Phaser.GameObjects.Graphics,
  bounds: { x: number; y: number; width: number; height: number },
  spec: FacadeSpec,
  roofSnow: boolean,
): void {
  const { x, y, width: w, height: h } = bounds;
  const doorW = 8;
  const doorX = x + Math.floor(w / 2) - doorW / 2;

  switch (spec.variant) {
    case 'stevenson': {
      // Метеобудка Стивенсона на ножках + мачта флюгера
      rect(g, 0x6b5a48, x + 6, y + h - 14, 2, 14);
      rect(g, 0x6b5a48, x + w - 8, y + h - 14, 2, 14);
      rect(g, 0xf4f7fa, x + 2, y + h - 30, w - 4, 16);
      for (let i = 0; i < 4; i++) rect(g, 0xb9b2a0, x + 3, y + h - 28 + i * 4, w - 6, 1);
      roofWithSnow(g, spec, x + 2, y + h - 33, w - 4, 3, roofSnow);
      rect(g, 0x4a4740, x + w - 3, y, 1, h - 14);
      rect(g, spec.trim, x + w - 6, y + 2, 7, 2);
      return;
    }
    case 'dome': {
      const bodyY = y + 14;
      rect(g, spec.wall, x, bodyY, w, h - 14);
      rect(g, spec.trim, x, bodyY, w, 2);
      g.fillStyle(spec.roof, 1);
      g.fillCircle(x + w / 2, bodyY, Math.floor(w / 3));
      if (roofSnow) {
        g.fillStyle(SNOW, 1);
        g.fillCircle(x + w / 2, bodyY - 2, Math.floor(w / 3) - 2);
      }
      rect(g, DOOR, doorX, y + h - 14, doorW, 14);
      rect(g, GLASS, x + 6, bodyY + 10, 8, 10);
      rect(g, GLASS, x + w - 14, bodyY + 10, 8, 10);
      return;
    }
    case 'hall': {
      rect(g, spec.wall, x, y + 12, w, h - 12);
      for (let i = 0; i < 4; i++) rect(g, spec.trim, x + 6 + i * Math.floor((w - 16) / 3), y + 12, 3, h - 12);
      roofWithSnow(g, spec, x, y, w, 12, roofSnow);
      rect(g, DOOR, doorX, y + h - 16, doorW + 2, 16);
      rect(g, GLASS, x + 12, y + 24, 8, 10);
      rect(g, GLASS, x + w - 20, y + 24, 8, 10);
      return;
    }
    case 'canteen': {
      rect(g, spec.wall, x, y + 10, w, h - 10);
      roofWithSnow(g, spec, x, y + 2, w, 8, roofSnow);
      rect(g, 0x7a6a5a, x + w - 10, y - 4, 5, 10); // труба
      rect(g, DOOR, doorX, y + h - 12, doorW, 12);
      rect(g, GLASS, x + 4, y + 18, 7, 7);
      rect(g, GLASS, x + w - 11, y + 18, 7, 7);
      return;
    }
    case 'school':
    default: {
      rect(g, spec.wall, x, y + 12, w, h - 12);
      roofWithSnow(g, spec, x, y, w, 12, roofSnow);
      rect(g, DOOR, doorX, y + h - 14, doorW, 14);
      rect(g, GLASS, x + 5, y + 20, 7, 8);
      rect(g, GLASS, x + w - 12, y + 20, 7, 8);
    }
  }
}
