import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AVATAR_OPTIONS, validateAvatar, type AvatarPortrait, type AvatarProfile } from './model.js';
import { decodeRgbaPng, encodeRgbaPng, type RgbaImage } from './portraitPng.js';

export const AVATAR_PORTRAIT_SIZE = 160;
export const AVATAR_PORTRAIT_CROP = { x: 8, y: 0, size: 80 } as const;
const DEFAULT_ASSETS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../web/public/assets/avatar/modular-r01');
const DATA_PREFIX = 'data:image/png;base64,';
const MAX_PORTRAIT_BYTES = 128 * 1024;
const PART_SLOTS = ['hair', 'headwear', 'top', 'bottom', 'footwear', 'backpack', 'heldItem', 'badge'] as const;
type Rgb = [number, number, number];
interface Cel { at: [number, number]; rect: [number, number, number, number]; z: number; paletteRole?: 'skin' | 'hair' }
interface Palette { source: Rgb[]; variants: Record<string, Rgb[]> }
interface PortraitSource { revision: string; image: RgbaImage; body: Cel[]; parts: Record<string, Cel[]>; palettes: { skin: Palette; hair: Palette } }
export interface AvatarPortraitOptions { assetsRoot?: string }
const sourceCache = new Map<string, Promise<PortraitSource>>();

function hash(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function integers(value: unknown, count: number): value is number[] { return Array.isArray(value) && value.length === count && value.every(Number.isSafeInteger); }

export function avatarAppearanceKey(profile: AvatarProfile): string {
  return hash(JSON.stringify(validateAvatar(profile)));
}

function palette(input: unknown, ids: readonly string[]): Palette {
  if (!record(input) || !Array.isArray(input.source) || input.source.length !== 4 || !record(input.variants)) throw new Error('Invalid avatar portrait palette');
  const colors = (value: unknown): Rgb[] => {
    if (!Array.isArray(value) || value.length !== 4 || !value.every((rgb) => integers(rgb, 3) && rgb.every((v) => v >= 0 && v <= 255))) throw new Error('Invalid avatar portrait palette colors');
    return value as Rgb[];
  };
  const source = colors(input.source);
  if (new Set(source.map((rgb) => rgb.join(','))).size !== 4) throw new Error('Duplicate avatar portrait source colors');
  return { source, variants: Object.fromEntries(ids.map((id) => [id, colors((input.variants as Record<string, unknown>)[id])])) };
}

function idleCels(input: unknown, image: RgbaImage, allowEmpty: boolean): Cel[] {
  if (!record(input) || !record(input.down) || !Array.isArray(input.down.idle) || !record(input.down.idle[0])) throw new Error('Missing down.idle[0] in avatar portrait part');
  const cels = input.down.idle[0].cels;
  if (!Array.isArray(cels) || cels.length > 32 || (!allowEmpty && cels.length === 0)) throw new Error('Invalid avatar portrait part cels');
  return cels.map((cel) => {
    if (!record(cel) || !integers(cel.at, 2) || !integers(cel.rect, 4) || !Number.isSafeInteger(cel.z) || (cel.z as number) < -1000 || (cel.z as number) > 1000
      || (cel.paletteRole !== undefined && cel.paletteRole !== 'skin' && cel.paletteRole !== 'hair')) throw new Error('Invalid avatar portrait cel');
    const [x, y] = cel.at, [sx, sy, width, height] = cel.rect;
    if (x < 0 || y < 0 || width < 1 || height < 1 || x + width > 96 || y + height > 144 || sx < 0 || sy < 0 || sx + width > image.width || sy + height > image.height) throw new Error('Out-of-bounds avatar portrait cel');
    let visible = false;
    for (let row = sy; row < sy + height && !visible; row += 1) for (let column = sx; column < sx + width; column += 1) if (image.pixels[(row * image.width + column) * 4 + 3]) { visible = true; break; }
    if (!visible) throw new Error('Empty avatar portrait cel');
    return { at: [x, y], rect: [sx, sy, width, height], z: cel.z as number, ...(cel.paletteRole ? { paletteRole: cel.paletteRole } : {}) };
  });
}

async function loadSource(root: string): Promise<PortraitSource> {
  const [manifestBytes, imageBytes] = await Promise.all([readFile(resolve(root, 'manifest.json')), readFile(resolve(root, 'atlas.png'))]);
  if (manifestBytes.length > 2 * 1024 * 1024) throw new Error('Avatar portrait manifest is too large');
  const manifest: unknown = JSON.parse(manifestBytes.toString('utf8'));
  if (!record(manifest) || manifest.version !== 1 || manifest.complete !== true || manifest.artAcceptance !== 'PASS' || manifest.rigId !== 'player.modular.r01.v1'
    || typeof manifest.revision !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(manifest.revision)
    || !record(manifest.frame) || manifest.frame.width !== 96 || manifest.frame.height !== 144 || !record(manifest.atlas)
    || manifest.atlas.url !== '/assets/avatar/modular-r01/atlas.png' || !record(manifest.parts) || !record(manifest.palettes)) throw new Error('Avatar portrait source is not an accepted static rig');
  const image = decodeRgbaPng(imageBytes);
  if (image.width !== manifest.atlas.width || image.height !== manifest.atlas.height) throw new Error('Avatar portrait atlas size does not match manifest');
  let opaque = 0, transparent = 0;
  for (let at = 3; at < image.pixels.length; at += 4) {
    if (image.pixels[at] === 255) opaque += 1;
    else if (image.pixels[at] === 0) transparent += 1;
    else throw new Error('Avatar portrait atlas must have binary alpha');
  }
  if (!opaque || !transparent) throw new Error('Avatar portrait atlas must contain cutout artwork');
  const parts: Record<string, Cel[]> = {};
  for (const slot of PART_SLOTS) for (const id of AVATAR_OPTIONS[slot]) parts[id] = idleCels(manifest.parts[id], image, id.endsWith('.none'));
  return { revision: `portrait-v1:${manifest.revision}:${hash(Buffer.concat([manifestBytes, imageBytes])).slice(0, 16)}`,
    image, body: idleCels(manifest.body, image, false), parts,
    palettes: { skin: palette(manifest.palettes.skin, AVATAR_OPTIONS.skinTone), hair: palette(manifest.palettes.hair, AVATAR_OPTIONS.hairColor) } };
}

async function source(options: AvatarPortraitOptions): Promise<PortraitSource> {
  const root = resolve(options.assetsRoot ?? DEFAULT_ASSETS_ROOT);
  let pending = sourceCache.get(root);
  if (!pending) {
    pending = loadSource(root);
    sourceCache.set(root, pending);
    pending.catch(() => { sourceCache.delete(root); });
  }
  return pending;
}

export async function currentAvatarPortraitRevision(options: AvatarPortraitOptions): Promise<string | undefined> {
  try {
    return (await source(options)).revision;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Compose once on save/migration, using only accepted down.idle[0] dressed layers. */
export async function composeAvatarPortrait(input: AvatarProfile, options: AvatarPortraitOptions = {}): Promise<AvatarPortrait> {
  const profile = validateAvatar(input);
  const rig = await source(options);
  const output = Buffer.alloc(AVATAR_PORTRAIT_SIZE * AVATAR_PORTRAIT_SIZE * 4);
  const cels = [...rig.body, ...PART_SLOTS.flatMap((slot) => rig.parts[profile[slot]])].sort((a, b) => a.z - b.z);
  for (const cel of cels) {
    const [sx, sy, width, height] = cel.rect;
    const selectedPalette = cel.paletteRole ? rig.palettes[cel.paletteRole] : undefined;
    const replacement = selectedPalette?.variants[profile[cel.paletteRole === 'skin' ? 'skinTone' : 'hairColor']];
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const dx = cel.at[0] + x - AVATAR_PORTRAIT_CROP.x, dy = cel.at[1] + y - AVATAR_PORTRAIT_CROP.y;
      if (dx < 0 || dy < 0 || dx >= AVATAR_PORTRAIT_CROP.size || dy >= AVATAR_PORTRAIT_CROP.size) continue;
      const at = ((sy + y) * rig.image.width + sx + x) * 4;
      if (rig.image.pixels[at + 3] === 0) continue;
      let rgb = [rig.image.pixels[at], rig.image.pixels[at + 1], rig.image.pixels[at + 2]];
      const color = selectedPalette?.source.findIndex((candidate) => candidate.every((component, i) => component === rgb[i])) ?? -1;
      if (color >= 0) rgb = replacement![color];
      for (let yy = 0; yy < 2; yy += 1) for (let xx = 0; xx < 2; xx += 1) {
        const target = ((dy * 2 + yy) * AVATAR_PORTRAIT_SIZE + dx * 2 + xx) * 4;
        output[target] = rgb[0]; output[target + 1] = rgb[1]; output[target + 2] = rgb[2]; output[target + 3] = 255;
      }
    }
  }
  const bytes = encodeRgbaPng({ width: AVATAR_PORTRAIT_SIZE, height: AVATAR_PORTRAIT_SIZE, pixels: output });
  return { version: 1, sourceRevision: rig.revision, appearanceKey: avatarAppearanceKey(profile), sha256: hash(bytes), width: 160, height: 160, pngDataUrl: DATA_PREFIX + bytes.toString('base64') };
}

export function portraitToPngBytes(portrait: AvatarPortrait): Buffer {
  if (typeof portrait.pngDataUrl !== 'string' || portrait.pngDataUrl.length > MAX_PORTRAIT_BYTES * 4 / 3 + DATA_PREFIX.length + 4 || !portrait.pngDataUrl.startsWith(DATA_PREFIX)) throw new Error('Invalid saved avatar portrait data URL');
  const encoded = portrait.pngDataUrl.slice(DATA_PREFIX.length);
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('Invalid saved avatar portrait encoding');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length > MAX_PORTRAIT_BYTES || bytes.toString('base64') !== encoded || hash(bytes) !== portrait.sha256) throw new Error('Invalid saved avatar portrait checksum');
  const image = decodeRgbaPng(bytes, 160, MAX_PORTRAIT_BYTES);
  if (image.width !== 160 || image.height !== 160) throw new Error('Invalid saved avatar portrait dimensions');
  let opaque = 0;
  for (let at = 3; at < image.pixels.length; at += 4) {
    if (image.pixels[at] === 255) opaque += 1;
    else if (image.pixels[at] !== 0) throw new Error('Invalid saved avatar portrait alpha');
  }
  if (!opaque) throw new Error('Empty saved avatar portrait');
  return bytes;
}

/** Valid old portraits survive art updates; only their stored outfit/hash is checked. */
export function validateAvatarPortrait(value: unknown, profile: AvatarProfile): AvatarPortrait {
  if (!record(value) || value.version !== 1 || value.width !== 160 || value.height !== 160
    || typeof value.sourceRevision !== 'string' || !/^[A-Za-z0-9:._-]{1,160}$/.test(value.sourceRevision)
    || value.appearanceKey !== avatarAppearanceKey(profile) || typeof value.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(value.sha256)) throw new Error('Saved avatar portrait does not match its profile');
  const portrait: AvatarPortrait = { version: 1, sourceRevision: value.sourceRevision, appearanceKey: value.appearanceKey as string, sha256: value.sha256, width: 160, height: 160, pngDataUrl: value.pngDataUrl as string };
  portraitToPngBytes(portrait);
  return portrait;
}
