import { useEffect, useRef } from 'react';
import type { AvatarProfile } from '../../api';

const COLORS: Record<string, string> = {
  'skin.light': '#f3c9a5',
  'skin.warm': '#dca57c',
  'skin.medium': '#ae7654',
  'skin.deep': '#744a38',
  'haircolor.brown': '#6b4637',
  'haircolor.black': '#292b34',
  'haircolor.blond': '#d7b766',
  'haircolor.auburn': '#9a4f36',
  'top.center-jacket': '#3577a7',
  'top.field-jacket': '#53775b',
  'top.hoodie': '#7d6593',
  'top.sweater': '#b26868',
  'top.shirt': '#e2ddd0',
  'bottom.dark-trousers': '#3a4655',
  'bottom.field-trousers': '#5c654e',
  'bottom.jeans': '#49647b',
  'footwear.sneakers': '#e8dfd1',
  'footwear.boots': '#5f493a',
  'footwear.shoes': '#33343a',
  'backpack.city': '#9f6d52',
  'backpack.field': '#566a4c',
};

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function AvatarPreview({ avatar, size = 224 }: { avatar: AvatarProfile; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 48);

    const skin = COLORS[avatar.skinTone] ?? COLORS['skin.warm'];
    const hair = COLORS[avatar.hairColor] ?? COLORS['haircolor.brown'];
    const top = COLORS[avatar.top] ?? COLORS['top.center-jacket'];
    const bottom = COLORS[avatar.bottom] ?? COLORS['bottom.dark-trousers'];
    const footwear = COLORS[avatar.footwear] ?? COLORS['footwear.sneakers'];

    if (avatar.backpack !== 'backpack.none') {
      fill(ctx, COLORS[avatar.backpack] ?? '#795d49', 7, 21, 18, 17);
      fill(ctx, '#3e493c', 5, 24, 3, 11);
    }

    fill(ctx, bottom, 10, 34, 5, 9);
    fill(ctx, bottom, 17, 34, 5, 9);
    fill(ctx, footwear, 9, 42, 7, 3);
    fill(ctx, footwear, 17, 42, 7, 3);

    fill(ctx, top, 8, 21, 16, 14);
    fill(ctx, top, 5, 23, 4, 10);
    fill(ctx, top, 23, 23, 4, 10);
    fill(ctx, skin, 5, 32, 4, 3);
    fill(ctx, skin, 23, 32, 4, 3);

    fill(ctx, skin, 11, 11, 10, 10);
    fill(ctx, skin, 10, 14, 12, 7);
    fill(ctx, '#2f3036', 13, 16, 2, 2);
    fill(ctx, '#2f3036', 18, 16, 2, 2);

    if (avatar.hair === 'hair.short') {
      fill(ctx, hair, 10, 9, 12, 5);
      fill(ctx, hair, 9, 12, 3, 5);
    } else if (avatar.hair === 'hair.wave') {
      fill(ctx, hair, 9, 8, 14, 5);
      fill(ctx, hair, 8, 11, 4, 8);
      fill(ctx, hair, 21, 11, 3, 7);
    } else if (avatar.hair === 'hair.bob') {
      fill(ctx, hair, 8, 9, 16, 6);
      fill(ctx, hair, 8, 13, 4, 10);
      fill(ctx, hair, 21, 13, 3, 10);
    } else if (avatar.hair === 'hair.curl') {
      fill(ctx, hair, 9, 8, 14, 4);
      fill(ctx, hair, 7, 11, 5, 7);
      fill(ctx, hair, 21, 10, 5, 8);
      fill(ctx, hair, 10, 7, 4, 3);
      fill(ctx, hair, 18, 7, 4, 3);
    } else {
      fill(ctx, hair, 9, 8, 14, 5);
      fill(ctx, hair, 8, 11, 4, 15);
      fill(ctx, hair, 21, 11, 4, 15);
    }

    if (avatar.headwear === 'headwear.cap') {
      fill(ctx, '#315e83', 9, 6, 14, 4);
      fill(ctx, '#315e83', 21, 9, 5, 2);
    } else if (avatar.headwear === 'headwear.beanie') {
      fill(ctx, '#7d6593', 10, 5, 12, 6);
      fill(ctx, '#624f75', 9, 9, 14, 3);
    }

    if (avatar.badge !== 'badge.none') {
      fill(ctx, avatar.badge === 'badge.aerology' ? '#79c1d2' : '#f2c75c', 18, 25, 2, 2);
    }

    if (avatar.heldItem === 'held.tablet') {
      fill(ctx, '#34465c', 24, 29, 5, 7);
      fill(ctx, '#8ec9e5', 25, 30, 3, 4);
    } else if (avatar.heldItem === 'held.map-folder') {
      fill(ctx, '#cf9d55', 23, 30, 6, 5);
    } else if (avatar.heldItem === 'held.pencil') {
      fill(ctx, '#d85757', 25, 27, 1, 8);
      fill(ctx, '#2878d8', 26, 27, 1, 8);
    }

    if (avatar.companion === 'companion.tit') {
      fill(ctx, '#e7cf57', 26, 37, 4, 4);
      fill(ctx, '#33434d', 27, 36, 3, 2);
      fill(ctx, '#577e9a', 25, 39, 3, 2);
    } else if (avatar.companion === 'companion.squirrel') {
      fill(ctx, '#b76d36', 25, 37, 4, 6);
      fill(ctx, '#d58b4d', 27, 34, 4, 5);
      fill(ctx, '#b76d36', 29, 36, 3, 3);
    }
  }, [avatar]);

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={48}
      className="avatar-preview"
      style={{ width: size, height: Math.round(size * 1.5) }}
      aria-label="Предварительный просмотр пиксельного персонажа"
    />
  );
}
