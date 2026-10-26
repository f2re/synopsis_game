import { useEffect, useRef, useState } from 'react';
import type { AvatarProfile } from '../../api';

export type AvatarDirection = 'down' | 'left' | 'right' | 'up';
export type AvatarAnimation = 'idle' | 'walk' | 'inspect';

export interface AvatarPreviewProps {
  avatar: AvatarProfile;
  size?: number;
  direction?: AvatarDirection;
  animation?: AvatarAnimation;
  showBackdrop?: boolean;
}

interface PaletteRamp {
  highlight: string;
  base: string;
  shadow: string;
  line: string;
}

const SKIN_PALETTES: Record<string, PaletteRamp> = {
  'skin.light': { highlight: '#fdf4ee', base: '#f4c8ab', shadow: '#d69d79', line: '#8f5b40' },
  'skin.warm': { highlight: '#fae2ce', base: '#dea17b', shadow: '#b8744d', line: '#7a4428' },
  'skin.medium': { highlight: '#dcb190', base: '#ab7552', shadow: '#855234', line: '#56311d' },
  'skin.deep': { highlight: '#ab7d63', base: '#764936', shadow: '#542f20', line: '#331a10' },
};

const HAIR_PALETTES: Record<string, PaletteRamp> = {
  'haircolor.brown': { highlight: '#8f614a', base: '#684332', shadow: '#472a1e', line: '#2e1910' },
  'haircolor.black': { highlight: '#4b5063', base: '#2b2f3d', shadow: '#191b24', line: '#0f1017' },
  'haircolor.blond': { highlight: '#fae5a0', base: '#d8b95f', shadow: '#a68835', line: '#6e561e' },
  'haircolor.auburn': { highlight: '#cc6f4e', base: '#a1482d', shadow: '#752d18', line: '#4a1809' },
};

const TOP_PALETTES: Record<string, PaletteRamp> = {
  'top.center-jacket': { highlight: '#448cbe', base: '#296894', shadow: '#1a496b', line: '#103047' },
  'top.field-jacket': { highlight: '#688c64', base: '#4a6e46', shadow: '#324f30', line: '#20331e' },
  'top.hoodie': { highlight: '#8e77a8', base: '#6d5585', shadow: '#4d3961', line: '#332342' },
  'top.sweater': { highlight: '#c46262', base: '#9c4444', shadow: '#702b2b', line: '#4a1717' },
  'top.shirt': { highlight: '#faf7ee', base: '#ded7c6', shadow: '#b5ac98', line: '#756e5e' },
};

const BOTTOM_PALETTES: Record<string, PaletteRamp> = {
  'bottom.dark-trousers': { highlight: '#4f5c70', base: '#364152', shadow: '#242d3b', line: '#161d26' },
  'bottom.field-trousers': { highlight: '#737e67', base: '#57624c', shadow: '#3e4735', line: '#272e21' },
  'bottom.jeans': { highlight: '#587a9e', base: '#3d5978', shadow: '#273e57', line: '#172738' },
};

const FOOTWEAR_PALETTES: Record<string, PaletteRamp> = {
  'footwear.sneakers': { highlight: '#faf6ee', base: '#ded7c8', shadow: '#a6a092', line: '#525a66' },
  'footwear.boots': { highlight: '#7e573e', base: '#573824', shadow: '#382215', line: '#211209' },
  'footwear.shoes': { highlight: '#525769', base: '#323642', shadow: '#1c1e26', line: '#0f1014' },
};

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function AvatarPreview({
  avatar,
  size = 224,
  direction = 'down',
  animation = 'idle',
  showBackdrop = true,
}: AvatarPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animFrame, setAnimFrame] = useState(0);

  useEffect(() => {
    // 320ms frame step for intentional retro cadence
    const interval = window.setInterval(() => {
      setAnimFrame((prev) => (prev + 1) % 4);
    }, 320);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 48);

    const skin = SKIN_PALETTES[avatar.skinTone] ?? SKIN_PALETTES['skin.warm'];
    const hair = HAIR_PALETTES[avatar.hairColor] ?? HAIR_PALETTES['haircolor.brown'];
    const top = TOP_PALETTES[avatar.top] ?? TOP_PALETTES['top.center-jacket'];
    const bottom = BOTTOM_PALETTES[avatar.bottom] ?? BOTTOM_PALETTES['bottom.dark-trousers'];
    const foot = FOOTWEAR_PALETTES[avatar.footwear] ?? FOOTWEAR_PALETTES['footwear.sneakers'];

    // Vertical bounce offset for idle breathing & walk
    let bounceY = 0;
    let walkPhase = 0; // -1: left leg, 0: neutral, 1: right leg

    if (animation === 'idle') {
      bounceY = animFrame === 1 || animFrame === 2 ? -1 : 0;
    } else if (animation === 'walk') {
      walkPhase = animFrame === 1 ? -1 : animFrame === 3 ? 1 : 0;
      bounceY = animFrame % 2 === 1 ? -1 : 0;
    } else if (animation === 'inspect') {
      bounceY = -1;
    }

    // 1. Cozy Baltic Station Diorama Backdrop (Wardrobe Corner at 26063)
    if (showBackdrop && size >= 96) {
      // Deep naval paneled wall
      fill(ctx, '#122534', 0, 0, 32, 38);
      fill(ctx, '#0e1d29', 0, 0, 32, 6); // upper shadow
      fill(ctx, '#1f3d52', 0, 16, 32, 1); // wainscot rail highlight
      fill(ctx, '#0d1a24', 0, 17, 32, 1); // rail shadow

      // Arched Baltic Observation Window on Right (x=19..30, y=3..26)
      fill(ctx, '#3b2516', 19, 3, 12, 24); // wooden casing
      // Sky gradient
      fill(ctx, '#2c4b6c', 20, 4, 10, 6); // dusk blue
      fill(ctx, '#42688f', 20, 10, 10, 5); // azure
      fill(ctx, '#d49863', 20, 15, 10, 5); // golden twilight glow
      fill(ctx, '#eed09f', 20, 20, 10, 4); // horizon pale amber
      // Distant Karelian pines on coast
      fill(ctx, '#162b20', 20, 21, 4, 3);
      fill(ctx, '#162b20', 26, 20, 4, 4);
      // Drifting clouds
      const cloudShift = (animFrame % 4) >= 2 ? 1 : 0;
      fill(ctx, 'rgba(255, 255, 255, 0.45)', 21 + cloudShift, 6, 7, 2);
      fill(ctx, 'rgba(255, 255, 255, 0.65)', 23 + cloudShift, 7, 5, 2);
      // Window mullions (crossbars)
      fill(ctx, '#4a2f1b', 24, 4, 1, 21); // vertical
      fill(ctx, '#4a2f1b', 20, 14, 10, 1); // horizontal
      fill(ctx, '#2a180d', 18, 25, 14, 2); // deep sill

      // Left Wall: Meteorological Observation Corner
      // Brass Aneroid Barometer
      fill(ctx, '#bfa054', 1, 6, 4, 6);
      fill(ctx, '#82692d', 1, 6, 4, 1);
      fill(ctx, '#faf5ea', 2, 7, 2, 4); // dial
      fill(ctx, '#1b1e28', 2, 8, 2, 1); // needle indicator

      // Mercury Thermometer
      fill(ctx, '#857560', 2, 14, 2, 10);
      fill(ctx, '#e6e6e6', 2, 15, 2, 7);
      fill(ctx, '#dc3232', 2, 18, 2, 5); // spirit column & reservoir

      // Warm Amber Wall Lamp light cone
      fill(ctx, 'rgba(255, 225, 140, 0.08)', 0, 0, 16, 22);

      // Parquet Oak Floor (y=38..47)
      fill(ctx, '#54371f', 0, 38, 32, 10);
      fill(ctx, '#664327', 0, 38, 32, 3);
      fill(ctx, '#3d2514', 0, 41, 32, 1); // plank joint
      fill(ctx, '#5e3e24', 0, 42, 32, 4);
      fill(ctx, '#331e0f', 0, 46, 32, 1); // plank joint
      for (let px = 1; px < 32; px += 5) {
        fill(ctx, '#3d2514', px, 38, 1, 3);
        fill(ctx, '#3d2514', (px + 3) % 32, 42, 1, 4);
      }
    }

    // 2. Grounding Contact Shadow Underfoot
    fill(ctx, 'rgba(8, 16, 24, 0.40)', 8, 43, 15, 3);
    fill(ctx, 'rgba(8, 16, 24, 0.70)', 10, 44, 11, 2);

    // 3. BACKPACK (drawn behind character when facing down/sides, or prominent in rear)
    if (avatar.backpack !== 'backpack.none') {
      const isField = avatar.backpack === 'backpack.field';
      const bpBase = isField ? '#46593b' : '#8a5229';
      const bpDark = isField ? '#2f3d27' : '#5c3519';

      if (direction === 'down') {
        fill(ctx, bpDark, 8, 20 + bounceY, 2, 10);
        fill(ctx, bpDark, 22, 20 + bounceY, 2, 10);
        if (isField) {
          fill(ctx, '#d8c29d', 9, 18 + bounceY, 14, 2); // rolled map bedroll peeking top
        }
      } else if (direction === 'left') {
        fill(ctx, bpDark, 20, 19 + bounceY, 5, 13);
        fill(ctx, bpBase, 21, 20 + bounceY, 3, 11);
        if (isField) fill(ctx, '#d8c29d', 20, 18 + bounceY, 4, 2);
      } else if (direction === 'right') {
        fill(ctx, bpDark, 7, 19 + bounceY, 5, 13);
        fill(ctx, bpBase, 8, 20 + bounceY, 3, 11);
        if (isField) fill(ctx, '#d8c29d', 8, 18 + bounceY, 4, 2);
      } else if (direction === 'up') {
        fill(ctx, bpDark, 9, 19 + bounceY, 14, 13);
        fill(ctx, bpBase, 11, 21 + bounceY, 10, 10);
        fill(ctx, '#f2c75c', 14, 25 + bounceY, 4, 2); // brass buckle
        if (isField) fill(ctx, '#d8c29d', 9, 17 + bounceY, 14, 3);
      }
    }

    // 4. LEGS & TROUSERS (Zero-gap waistline at y=31)
    const legLeftY = walkPhase === -1 ? 32 + bounceY : 33 + bounceY;
    const legRightY = walkPhase === 1 ? 32 + bounceY : 33 + bounceY;

    if (direction === 'down' || direction === 'up') {
      // Pelvis waistband (meets torso cleanly at y=31)
      fill(ctx, bottom.line, 10, 31 + bounceY, 12, 3);
      fill(ctx, bottom.base, 11, 31 + bounceY, 10, 3);
      if (direction === 'down') {
        fill(ctx, '#c8c8d0', 15, 31 + bounceY, 2, 2); // belt buckle
      }

      // Left leg
      fill(ctx, bottom.line, 10, legLeftY, 5, 9);
      fill(ctx, bottom.base, 11, legLeftY, 3, 8);
      fill(ctx, bottom.highlight, 11, legLeftY + 1, 1, 6);

      // Right leg
      fill(ctx, bottom.line, 17, legRightY, 5, 9);
      fill(ctx, bottom.base, 18, legRightY, 3, 8);
      fill(ctx, bottom.shadow, 20, legRightY + 1, 1, 7);

      if (avatar.bottom === 'bottom.field-trousers') {
        fill(ctx, bottom.shadow, 9, legLeftY + 3, 2, 4);
        fill(ctx, bottom.shadow, 21, legRightY + 3, 2, 4);
        fill(ctx, '#232a1e', 11, legLeftY + 3, 3, 3); // reinforced knee patches
        fill(ctx, '#232a1e', 18, legRightY + 3, 3, 3);
      } else if (avatar.bottom === 'bottom.jeans') {
        fill(ctx, '#c87832', 10, 31 + bounceY, 12, 1); // copper stitch
        fill(ctx, '#c87832', 11, legLeftY + 1, 1, 6);
        fill(ctx, '#c87832', 18, legRightY + 1, 1, 6);
      }
    } else {
      // Side profile legs
      const frontLegX = direction === 'right' ? 14 : 12;
      const backLegX = direction === 'right' ? 18 : 8;
      fill(ctx, bottom.shadow, backLegX, 33 + bounceY + (walkPhase === 1 ? -1 : 1), 5, 9);
      fill(ctx, bottom.line, frontLegX, 32 + bounceY + (walkPhase === -1 ? -1 : 0), 6, 10);
      fill(ctx, bottom.base, frontLegX + 1, 32 + bounceY + (walkPhase === -1 ? -1 : 0), 4, 9);
    }

    // 5. FOOTWEAR (Seamless connection to trousers)
    const footLeftY = legLeftY + 7;
    const footRightY = legRightY + 7;

    if (direction === 'down') {
      fill(ctx, foot.line, 9, footLeftY, 6, 4);
      fill(ctx, foot.base, 10, footLeftY + 1, 4, 2);
      fill(ctx, foot.line, 17, footRightY, 6, 4);
      fill(ctx, foot.base, 18, footRightY + 1, 4, 2);

      if (avatar.footwear === 'footwear.sneakers') {
        fill(ctx, '#4dd0e1', 11, footLeftY + 1, 2, 1); // teal side flash
        fill(ctx, '#4dd0e1', 19, footRightY + 1, 2, 1);
        fill(ctx, '#b48250', 9, footLeftY + 3, 6, 1); // gum rubber sole
        fill(ctx, '#b48250', 17, footRightY + 3, 6, 1);
      } else if (avatar.footwear === 'footwear.boots') {
        fill(ctx, '#c8aa50', 12, footLeftY, 1, 2); // brass lace eyelets
        fill(ctx, '#c8aa50', 19, footRightY, 1, 2);
        fill(ctx, '#140f0a', 9, footLeftY + 3, 6, 1); // heavy cleated tread
        fill(ctx, '#140f0a', 17, footRightY + 3, 6, 1);
      } else {
        fill(ctx, foot.highlight, 10, footLeftY + 1, 3, 1);
        fill(ctx, foot.highlight, 18, footRightY + 1, 3, 1);
        fill(ctx, '#0f1014', 9, footLeftY + 3, 6, 1);
        fill(ctx, '#0f1014', 17, footRightY + 3, 6, 1);
      }
    } else if (direction === 'up') {
      fill(ctx, foot.line, 10, footLeftY, 5, 4);
      fill(ctx, foot.shadow, 11, footLeftY + 1, 3, 2);
      fill(ctx, foot.line, 17, footRightY, 5, 4);
      fill(ctx, foot.shadow, 18, footRightY + 1, 3, 2);
    } else {
      const shoeX = direction === 'right' ? 14 : 10;
      fill(ctx, foot.line, shoeX, footLeftY, 8, 4);
      fill(ctx, foot.base, shoeX + 1, footLeftY + 1, 6, 2);
      fill(ctx, foot.line, shoeX, footLeftY + 3, 8, 1);
    }

    // 6. TORSO & UPPER BODY (Top)
    const torsoY = 18 + bounceY;

    if (direction === 'down') {
      fill(ctx, top.line, 9, torsoY, 14, 14);
      fill(ctx, top.base, 10, torsoY + 1, 12, 12);
      fill(ctx, top.highlight, 11, torsoY + 2, 3, 9);
      fill(ctx, top.shadow, 18, torsoY + 2, 3, 10);

      // Top specific details matching imported pixel art
      if (avatar.top === 'top.center-jacket') {
        fill(ctx, '#f2c75c', 10, torsoY + 1, 2, 2); // gold shoulder rank
        fill(ctx, '#f2c75c', 20, torsoY + 1, 2, 2);
        fill(ctx, '#e8dfd1', 15, torsoY + 2, 2, 11); // silver zipper
        fill(ctx, '#f2c75c', 11, torsoY + 5, 3, 2); // gold chest patch
      } else if (avatar.top === 'top.field-jacket') {
        fill(ctx, top.shadow, 11, torsoY + 4, 4, 3); // chest pockets
        fill(ctx, top.shadow, 17, torsoY + 4, 4, 3);
        fill(ctx, '#f2c75c', 15, torsoY + 2, 2, 2); // collar snap
      } else if (avatar.top === 'top.sweater') {
        // Authentic Nordic jacquard band
        fill(ctx, '#f7f4ec', 10, torsoY + 4, 12, 3);
        fill(ctx, top.line, 11, torsoY + 4, 2, 1);
        fill(ctx, top.line, 15, torsoY + 5, 2, 1);
        fill(ctx, top.line, 19, torsoY + 4, 2, 1);
      } else if (avatar.top === 'top.hoodie') {
        fill(ctx, top.shadow, 12, torsoY + 7, 8, 4); // kangaroo pocket
        fill(ctx, '#e8dfd1', 14, torsoY + 2, 1, 4); // drawstring cords
        fill(ctx, '#e8dfd1', 17, torsoY + 2, 1, 4);
      } else if (avatar.top === 'top.shirt') {
        fill(ctx, '#23384d', 15, torsoY + 2, 2, 9); // dark tie
        fill(ctx, '#f2c75c', 15, torsoY + 6, 2, 1); // gold tie clip
        fill(ctx, '#142878', 18, torsoY + 4, 1, 2); // pen in pocket
      }

      // Arms & Hands
      fill(ctx, top.line, 6, torsoY + 2, 4, 11);
      fill(ctx, top.base, 7, torsoY + 3, 2, 9);
      fill(ctx, skin.base, 7, torsoY + 12, 2, 3); // left hand

      fill(ctx, top.line, 22, torsoY + 2, 4, 11);
      fill(ctx, top.base, 23, torsoY + 3, 2, 9);
      fill(ctx, skin.base, 23, torsoY + 12, 2, 3); // right hand

      // Badge on lapel
      if (avatar.badge !== 'badge.none') {
        const badgeColor = avatar.badge === 'badge.aerology' ? '#7ae3ea' : '#f5d061';
        fill(ctx, badgeColor, 12, torsoY + 3, 2, 2);
      }
    } else if (direction === 'up') {
      fill(ctx, top.line, 9, torsoY, 14, 14);
      fill(ctx, top.base, 10, torsoY + 1, 12, 12);
      fill(ctx, top.shadow, 10, torsoY + 11, 12, 2);
      fill(ctx, top.line, 6, torsoY + 2, 4, 11);
      fill(ctx, top.shadow, 7, torsoY + 3, 2, 9);
      fill(ctx, top.line, 22, torsoY + 2, 4, 11);
      fill(ctx, top.shadow, 23, torsoY + 3, 2, 9);
    } else {
      const isRight = direction === 'right';
      const armBackX = isRight ? 10 : 18;
      const armFrontX = isRight ? 18 : 10;
      fill(ctx, top.line, 11, torsoY, 10, 14);
      fill(ctx, top.base, 12, torsoY + 1, 8, 12);
      fill(ctx, top.shadow, armBackX, torsoY + 3, 3, 10);
      fill(ctx, top.line, armFrontX - 1, torsoY + 2, 4, 11);
      fill(ctx, top.base, armFrontX, torsoY + 3, 2, 9);
      fill(ctx, skin.base, armFrontX, torsoY + 12, 2, 3);
    }

    // 7. NECK & HEAD
    const headY = 6 + bounceY;

    // Neck seamlessly bridging head and torso
    fill(ctx, skin.line, 14, 16 + bounceY, 4, 3);
    fill(ctx, skin.base, 14, 16 + bounceY, 4, 2);

    // Cranial Head Base
    fill(ctx, skin.line, 10, headY, 12, 11);
    fill(ctx, skin.base, 11, headY + 1, 10, 9);

    if (direction === 'down') {
      // Cheeks blush
      fill(ctx, '#e89476', 11, headY + 7, 2, 1);
      fill(ctx, '#e89476', 19, headY + 7, 2, 1);

      // Interactive / Inspect Wink Expression
      if (animation === 'inspect' && (animFrame === 1 || animFrame === 2)) {
        // Confident wink
        fill(ctx, '#1f2230', 13, headY + 5, 2, 1); // closed wink eye
        fill(ctx, '#1f2230', 17, headY + 4, 2, 2); // open eye
        fill(ctx, '#fdfdfd', 17, headY + 4, 1, 1);
        fill(ctx, skin.line, 15, headY + 8, 3, 1); // slight smile
      } else {
        // Focused Observant Gaze
        fill(ctx, '#1f2230', 13, headY + 4, 2, 2);
        fill(ctx, '#fdfdfd', 13, headY + 4, 1, 1);
        fill(ctx, '#1f2230', 17, headY + 4, 2, 2);
        fill(ctx, '#fdfdfd', 17, headY + 4, 1, 1);
        fill(ctx, skin.line, 15, headY + 8, 2, 1); // mouth
      }

      // Eyebrows
      fill(ctx, hair.line, 13, headY + 3, 2, 1);
      fill(ctx, hair.line, 17, headY + 3, 2, 1);

      // Shaded nose bridge
      fill(ctx, skin.shadow, 15, headY + 6, 2, 1);
    } else if (direction === 'left' || direction === 'right') {
      const eyeX = direction === 'right' ? 18 : 13;
      fill(ctx, '#1f2230', eyeX, headY + 4, 2, 2);
      fill(ctx, '#fdfdfd', eyeX, headY + 4, 1, 1);
      fill(ctx, hair.line, eyeX, headY + 3, 2, 1);
      fill(ctx, skin.shadow, eyeX, headY + 6, 1, 1);
      fill(ctx, skin.line, eyeX, headY + 8, 2, 1);
    }

    // 8. HAIR (Seamlessly fitted to skull dome)
    if (direction !== 'up') {
      if (avatar.hair === 'hair.short') {
        fill(ctx, hair.line, 9, headY - 2, 14, 6);
        fill(ctx, hair.base, 10, headY - 1, 12, 4);
        fill(ctx, hair.highlight, 11, headY - 1, 6, 2);
        fill(ctx, hair.line, 9, headY + 3, 2, 4);
        fill(ctx, hair.line, 21, headY + 3, 2, 4);
      } else if (avatar.hair === 'hair.wave') {
        fill(ctx, hair.line, 8, headY - 3, 16, 7);
        fill(ctx, hair.base, 9, headY - 2, 14, 5);
        fill(ctx, hair.highlight, 10, headY - 2, 7, 2);
        fill(ctx, hair.base, 8, headY + 2, 3, 7);
        fill(ctx, hair.base, 21, headY + 2, 3, 7);
      } else if (avatar.hair === 'hair.bob') {
        fill(ctx, hair.line, 8, headY - 2, 16, 7);
        fill(ctx, hair.base, 9, headY - 1, 14, 5);
        fill(ctx, hair.highlight, 10, headY - 1, 8, 2);
        fill(ctx, hair.line, 8, headY + 3, 3, 9);
        fill(ctx, hair.base, 9, headY + 4, 2, 7);
        fill(ctx, hair.line, 21, headY + 3, 3, 9);
        fill(ctx, hair.base, 21, headY + 4, 2, 7);
      } else if (avatar.hair === 'hair.curl') {
        fill(ctx, hair.line, 8, headY - 3, 16, 7);
        fill(ctx, hair.base, 9, headY - 2, 14, 5);
        fill(ctx, hair.highlight, 11, headY - 2, 4, 3);
        fill(ctx, hair.highlight, 17, headY - 2, 4, 3);
        fill(ctx, hair.base, 7, headY + 1, 4, 7);
        fill(ctx, hair.base, 21, headY + 1, 4, 7);
      } else {
        // hair.long
        fill(ctx, hair.line, 8, headY - 2, 16, 6);
        fill(ctx, hair.base, 9, headY - 1, 14, 4);
        fill(ctx, hair.highlight, 10, headY - 1, 7, 2);
        fill(ctx, hair.line, 7, headY + 2, 4, 15);
        fill(ctx, hair.base, 8, headY + 3, 2, 13);
        fill(ctx, hair.line, 21, headY + 2, 4, 15);
        fill(ctx, hair.base, 22, headY + 3, 2, 13);
      }
    } else {
      fill(ctx, hair.line, 9, headY - 2, 14, 13);
      fill(ctx, hair.base, 10, headY - 1, 12, 11);
      fill(ctx, hair.highlight, 12, headY, 5, 4);
      if (avatar.hair === 'hair.long') {
        fill(ctx, hair.line, 8, headY + 8, 16, 9);
        fill(ctx, hair.base, 9, headY + 9, 14, 7);
      }
    }

    // 9. HEADWEAR
    if (avatar.headwear === 'headwear.cap') {
      const capBase = '#244769';
      const capLine = '#142c44';
      fill(ctx, capLine, 8, headY - 3, 16, 6);
      fill(ctx, capBase, 9, headY - 2, 14, 4);
      fill(ctx, '#f2c75c', 15, headY - 1, 2, 2); // gold station crest dot
      if (direction === 'down') {
        fill(ctx, capLine, 8, headY + 2, 16, 2); // visor
        fill(ctx, capBase, 9, headY + 2, 14, 1);
      } else if (direction === 'right') {
        fill(ctx, capLine, 18, headY + 1, 6, 2);
      } else if (direction === 'left') {
        fill(ctx, capLine, 8, headY + 1, 6, 2);
      }
    } else if (avatar.headwear === 'headwear.beanie') {
      const beanBase = '#6b5380';
      const beanLine = '#473557';
      fill(ctx, beanLine, 8, headY - 4, 16, 8);
      fill(ctx, beanBase, 9, headY - 3, 14, 6);
      fill(ctx, beanLine, 8, headY + 1, 16, 3); // rolled rim
      fill(ctx, '#8b70a3', 9, headY + 2, 14, 1);
    }

    // 10. HELD ITEM
    if (avatar.heldItem !== 'held.none') {
      const itemHandX = direction === 'left' ? 8 : 23;
      const itemHandY = 26 + bounceY;

      if (avatar.heldItem === 'held.pencil') {
        fill(ctx, '#d64545', itemHandX + 1, itemHandY - 4, 2, 4); // red top
        fill(ctx, '#ffffff', itemHandX + 1, itemHandY, 2, 1); // white stripe
        fill(ctx, '#2878d8', itemHandX + 1, itemHandY + 1, 2, 4); // blue bottom
        fill(ctx, '#1f2230', itemHandX + 1, itemHandY - 5, 1, 1); // graphite tip
      } else if (avatar.heldItem === 'held.tablet') {
        fill(ctx, '#242b38', itemHandX, itemHandY - 2, 6, 9);
        fill(ctx, '#4dd0e1', itemHandX + 1, itemHandY - 1, 4, 7); // glowing radar
        fill(ctx, '#ffffff', itemHandX + 2, itemHandY, 2, 2); // radar blip
      } else if (avatar.heldItem === 'held.map-folder') {
        fill(ctx, '#a8783d', itemHandX - 1, itemHandY - 2, 7, 8);
        fill(ctx, '#faf7ee', itemHandX, itemHandY - 3, 5, 2); // charts peeking
        fill(ctx, '#3d6387', itemHandX + 1, itemHandY - 2, 3, 1); // isobar lines
      }
    }

    // 11. COMPANIONS (Living fauna of Station 26063)
    if (avatar.companion === 'companion.tit') {
      // Perched on the window sill if facing front/right, or perched on floor
      const titX = direction === 'left' ? 24 : 21;
      const titY = 22;
      fill(ctx, '#f7d045', titX, titY + 1, 4, 3); // yellow breast
      fill(ctx, '#2b313d', titX + 1, titY, 3, 2); // black cap
      fill(ctx, '#ffffff', titX + 1, titY + 1, 2, 1); // white cheek
      fill(ctx, '#4a78a6', titX + 3, titY + 2, 2, 2); // blue wing
      fill(ctx, '#d97d29', titX, titY + 1, 1, 1); // beak
      fill(ctx, '#1f2230', titX + 1, titY + 4, 2, 1); // feet on sill
    } else if (avatar.companion === 'companion.squirrel') {
      const sqX = direction === 'left' ? 24 : 3;
      const sqY = 35;
      fill(ctx, '#cc6829', sqX + 1, sqY + 2, 5, 5); // body
      fill(ctx, '#fae0cd', sqX + 1, sqY + 4, 3, 3); // belly
      fill(ctx, '#cc6829', sqX + 2, sqY, 4, 3); // head
      fill(ctx, '#1f2230', sqX + 2, sqY + 1, 1, 1); // eye
      // Bushy tail with animated twitch
      const tailWiggle = animFrame % 2 === 1 ? -1 : 0;
      fill(ctx, '#e87c38', sqX + 5, sqY - 1 + tailWiggle, 3, 7);
      fill(ctx, '#b5561b', sqX + 6, sqY + 1 + tailWiggle, 2, 4);
    }
  }, [avatar, size, direction, animation, animFrame, showBackdrop]);

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={48}
      className="avatar-preview"
      style={{
        width: size,
        height: Math.round(size * 1.5),
        imageRendering: 'pixelated',
      }}
      aria-label="Пиксельный образ синоптика Станции 26063"
    />
  );
}
