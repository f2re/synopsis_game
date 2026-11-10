/** One authored rig, shared by the wardrobe, world and learning UI. */
export const MODULAR_AVATAR_RIG = 'player.modular.r01.v1' as const;
export const MODULAR_AVATAR_URL = '/assets/avatar/modular-r01/manifest.json';
export const AVATAR_DIRECTIONS = ['down', 'left', 'up', 'right'] as const;
export const AVATAR_ACTIONS = ['idle', 'walk', 'inspect'] as const;
export type AvatarDirection = typeof AVATAR_DIRECTIONS[number];
export type AvatarAction = typeof AVATAR_ACTIONS[number];
export type AvatarPaletteRole = 'skin' | 'hair';
export type RGB = [number, number, number];
export type AvatarPaletteRamp = [RGB, RGB, RGB, RGB];

export const MODULAR_AVATAR_OPTIONS = {
  skinTone: ['skin.light', 'skin.warm', 'skin.medium', 'skin.deep'],
  hair: ['hair.short', 'hair.wave', 'hair.bob', 'hair.curl', 'hair.long'],
  hairColor: ['haircolor.brown', 'haircolor.black', 'haircolor.blond', 'haircolor.auburn'],
  headwear: ['headwear.none', 'headwear.cap', 'headwear.beanie', 'headwear.scarf', 'headwear.goggles'],
  top: ['top.center-jacket', 'top.field-jacket', 'top.hoodie', 'top.sweater', 'top.shirt'],
  bottom: ['bottom.dark-trousers', 'bottom.field-trousers', 'bottom.jeans'],
  footwear: ['footwear.sneakers', 'footwear.boots', 'footwear.shoes'],
  backpack: ['backpack.none', 'backpack.city', 'backpack.field'],
  heldItem: ['held.none', 'held.tablet', 'held.map-folder', 'held.pencil'],
  companion: ['companion.none', 'companion.tit', 'companion.squirrel'],
  badge: ['badge.none', 'badge.meteo', 'badge.aerology'],
} as const;
export type AvatarSlot = keyof typeof MODULAR_AVATAR_OPTIONS;
export type ModularAvatarProfile = Record<AvatarSlot, string>;

export interface AvatarCel {
  /** Integer source rectangle in the one compact atlas. */
  rect: [number, number, number, number];
  /** Integer destination in the logical frame; motion is authored in these offsets. */
  at: [number, number];
  /** Stable painter order, including front/back pieces of the same item. */
  z: number;
  paletteRole?: AvatarPaletteRole;
}
export interface AvatarFrame {
  cels: AvatarCel[];
  /** Explicit authored absence for optional accessories; never inferred from missing data. */
  hidden?: 'direction' | 'occlusion';
}
export type AvatarActionFrames = { idle: AvatarFrame[]; walk?: AvatarFrame[]; inspect?: AvatarFrame[] };
export type AvatarPartFrames = Record<AvatarDirection, AvatarActionFrames>;

export interface AvatarClip {
  durationsMs: number[];
  loop: boolean;
}
export interface AvatarFrameBox {
  width: number;
  height: number;
  pivot: [number, number];
}
export interface AvatarCompanion {
  frame: AvatarFrameBox;
  /** Child foot position relative to the player's foot, in native rig pixels. */
  anchor: [number, number];
  frames: AvatarPartFrames;
}

export interface ModularAvatarManifest {
  version: 1;
  rigId: typeof MODULAR_AVATAR_RIG;
  revision: string;
  /** Both gates are required before this family replaces the existing preview. */
  complete: true;
  artAcceptance: 'PASS';
  frame: AvatarFrameBox;
  atlas: { assetId: string; url: string; width: number; height: number };
  /** Only independently accepted movements are published; idle is mandatory. */
  clips: { idle: AvatarClip; walk?: AvatarClip; inspect?: AvatarClip };
  palettes: Record<AvatarPaletteRole, {
    source: AvatarPaletteRamp;
    variants: Record<string, AvatarPaletteRamp>;
  }>;
  /** Unclothed baseline, present in every pose; never selected as an outfit. */
  body: AvatarPartFrames;
  /** 31 visual option IDs. Each *.none explicitly contains empty cels. */
  parts: Record<string, AvatarPartFrames>;
  /** companion.none is null; the other two are independently positioned children. */
  companions: Record<string, AvatarCompanion | null>;
}

export const DEFAULT_MODULAR_AVATAR: ModularAvatarProfile = {
  skinTone: 'skin.warm', hair: 'hair.short', hairColor: 'haircolor.brown',
  headwear: 'headwear.none', top: 'top.center-jacket', bottom: 'bottom.dark-trousers',
  footwear: 'footwear.sneakers', backpack: 'backpack.none', heldItem: 'held.none',
  companion: 'companion.none', badge: 'badge.none',
};

export const AVATAR_PART_SLOTS = ['hair', 'headwear', 'top', 'bottom', 'footwear', 'backpack', 'heldItem', 'badge'] as const;

const CLIP_SPEC = { idle: [4, 320], walk: [6, 140], inspect: [6, 240] } as const;
const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const tuple = (value: unknown, length: number, min: number, max: number): value is number[] =>
  Array.isArray(value) && value.length === length && value.every((v) => integer(v, min, max));
function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Modular avatar: ${message}`);
}

/** Invalid or absent identity is absent, never replaced by another person's body. */
export function parseModularAvatarProfile(value: unknown): ModularAvatarProfile | null {
  const profile = object(value);
  if (!profile) return null;
  const result = {} as ModularAvatarProfile;
  for (const slot of Object.keys(MODULAR_AVATAR_OPTIONS) as AvatarSlot[]) {
    const id = profile[slot];
    if (typeof id !== 'string' || !(MODULAR_AVATAR_OPTIONS[slot] as readonly string[]).includes(id)) return null;
    result[slot] = id;
  }
  return result;
}

/** Bounded local assets and complete direction/action coverage; no inferred mirroring. */
export function parseModularAvatarManifest(value: unknown): ModularAvatarManifest {
  const data = object(value);
  requireThat(data?.version === 1 && data.rigId === MODULAR_AVATAR_RIG && data.complete === true && data.artAcceptance === 'PASS', 'pack is incomplete or unaccepted');
  requireThat(typeof data.revision === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(data.revision), 'invalid revision');
  const frame = object(data.frame);
  requireThat(frame?.width === 96 && frame.height === 144 && tuple(frame.pivot, 2, 0, 144) && frame.pivot[0] === 48 && frame.pivot[1] === 136, 'wrong frame or foot pivot');
  const atlas = object(data.atlas);
  requireThat(atlas && typeof atlas.assetId === 'string' && /^[a-zA-Z0-9._-]{1,128}$/.test(atlas.assetId) &&
    typeof atlas.url === 'string' && /^\/assets\/avatar\/modular-r01\/[a-zA-Z0-9_-]+\.png$/.test(atlas.url) &&
    integer(atlas.width, 1, 4096) && integer(atlas.height, 1, 4096) && atlas.width * atlas.height <= 4_194_304, 'invalid atlas or decoded budget exceeded');
  const clips = {} as ModularAvatarManifest['clips'];
  const rawClips = object(data.clips);
  for (const action of AVATAR_ACTIONS) {
    if (action !== 'idle' && rawClips?.[action] === undefined) continue;
    const clip = object(rawClips?.[action]);
    const [count, duration] = CLIP_SPEC[action];
    requireThat(clip && Array.isArray(clip.durationsMs) && clip.durationsMs.length === count &&
      clip.durationsMs.every((ms) => ms === duration) && clip.loop === (action !== 'inspect'), `invalid ${action} timing`);
    clips[action] = { durationsMs: [...clip.durationsMs] as number[], loop: clip.loop as boolean };
  }
  const parseFrames = (raw: unknown, box: AvatarFrameBox, label: string, visibility: 'required' | 'optional' | 'none' = 'required'): AvatarPartFrames => {
    const dirs = object(raw);
    const result = {} as AvatarPartFrames;
    for (const direction of AVATAR_DIRECTIONS) {
      const actions = object(dirs?.[direction]);
      result[direction] = {} as AvatarPartFrames[AvatarDirection];
      for (const action of AVATAR_ACTIONS) {
        if (!clips[action]) continue;
        const frames = actions?.[action];
        requireThat(Array.isArray(frames) && frames.length === CLIP_SPEC[action][0], `missing ${label}/${direction}/${action} frames`);
        result[direction][action] = frames.map((rawFrame) => {
          const item = object(rawFrame);
          const cels = item?.cels;
          const hidden = item?.hidden;
          requireThat(Array.isArray(cels) && cels.length <= 16 && (hidden === undefined || hidden === 'direction' || hidden === 'occlusion'), `invalid ${label} cels`);
          requireThat(visibility === 'none' ? cels.length === 0 && hidden === undefined :
            cels.length > 0 ? hidden === undefined : visibility === 'optional' && hidden !== undefined,
            `unexplained empty or hidden ${label}/${direction}/${action} frame`);
          return { ...(hidden ? { hidden: hidden as 'direction' | 'occlusion' } : {}), cels: cels.map((rawCel): AvatarCel => {
            const cel = object(rawCel);
            requireThat(cel && tuple(cel.rect, 4, 0, 4096) && cel.rect[2] > 0 && cel.rect[3] > 0 &&
              cel.rect[0] + cel.rect[2] <= (atlas.width as number) && cel.rect[1] + cel.rect[3] <= (atlas.height as number) &&
              tuple(cel.at, 2, 0, 192) && cel.at[0] + cel.rect[2] <= box.width && cel.at[1] + cel.rect[3] <= box.height &&
              integer(cel.z, -1000, 1000) && (cel.paletteRole === undefined || cel.paletteRole === 'skin' || cel.paletteRole === 'hair'), `out of bounds ${label} cel`);
            return { rect: [...cel.rect] as AvatarCel['rect'], at: [...cel.at] as AvatarCel['at'], z: cel.z,
              ...(cel.paletteRole ? { paletteRole: cel.paletteRole as AvatarPaletteRole } : {}) };
          }) };
        });
      }
    }
    return result;
  };
  const box: AvatarFrameBox = { width: 96, height: 144, pivot: [48, 136] };
  const body = parseFrames(data.body, box, 'body');
  requireThat(AVATAR_DIRECTIONS.every((direction) => AVATAR_ACTIONS.every((action) => !clips[action] || body[direction][action]!.every((f) => f.cels.length > 0))), 'body is missing in a pose');
  const parts = {} as Record<string, AvatarPartFrames>;
  const rawParts = object(data.parts);
  const partIds = AVATAR_PART_SLOTS.flatMap((slot) => [...MODULAR_AVATAR_OPTIONS[slot]]);
  requireThat(rawParts && Object.keys(rawParts).length === partIds.length, 'visual option coverage differs');
  const hasPixels = (part: AvatarPartFrames) => AVATAR_DIRECTIONS.some((direction) => AVATAR_ACTIONS.some((action) => part[direction][action]?.some((f) => f.cels.length > 0)));
  for (const id of partIds) {
    const required = /^(hair|top|bottom|footwear)\./.test(id);
    parts[id] = parseFrames(rawParts[id], box, id, id.endsWith('.none') ? 'none' : required ? 'required' : 'optional');
    requireThat(id.endsWith('.none') || hasPixels(parts[id]), `${id} has no authored pixels`);
  }
  const rawPalettes = object(data.palettes);
  const palettes = {} as ModularAvatarManifest['palettes'];
  const parseRamp = (raw: unknown): AvatarPaletteRamp => {
    requireThat(Array.isArray(raw) && raw.length === 4 && raw.every((rgb) => tuple(rgb, 3, 0, 255)) &&
      new Set(raw.map((rgb) => String(rgb))).size === 4, 'palette must contain four distinct exact RGB colors');
    return raw.map((rgb) => [...rgb as RGB]) as AvatarPaletteRamp;
  };
  for (const role of ['skin', 'hair'] as const) {
    const palette = object(rawPalettes?.[role]);
    const variants = object(palette?.variants);
    const ids = MODULAR_AVATAR_OPTIONS[role === 'skin' ? 'skinTone' : 'hairColor'];
    requireThat(variants && Object.keys(variants).length === ids.length, `invalid ${role} palette variants`);
    palettes[role] = { source: parseRamp(palette?.source), variants: {} };
    for (const id of ids) palettes[role].variants[id] = parseRamp(variants[id]);
  }
  const rawCompanions = object(data.companions);
  requireThat(rawCompanions && Object.keys(rawCompanions).length === 3 && rawCompanions['companion.none'] === null, 'invalid companion coverage');
  const companions: ModularAvatarManifest['companions'] = { 'companion.none': null };
  for (const id of ['companion.tit', 'companion.squirrel']) {
    const companion = object(rawCompanions[id]);
    const child = object(companion?.frame);
    requireThat(companion && child && integer(child.width, 1, 192) && integer(child.height, 1, 192) &&
      tuple(child.pivot, 2, 0, 192) && child.pivot[0] <= child.width && child.pivot[1] <= child.height &&
      tuple(companion.anchor, 2, -96, 96), `invalid ${id} foot origin`);
    const childBox: AvatarFrameBox = { width: child.width, height: child.height, pivot: [...child.pivot] as [number, number] };
    companions[id] = { frame: childBox, anchor: [...companion.anchor] as [number, number], frames: parseFrames(companion.frames, childBox, id) };
    requireThat(hasPixels(companions[id]!.frames), `${id} has no authored pixels`);
  }
  return { version: 1, rigId: MODULAR_AVATAR_RIG, revision: data.revision, complete: true, artAcceptance: 'PASS',
    frame: box, atlas: { assetId: atlas.assetId, url: atlas.url, width: atlas.width, height: atlas.height }, clips, palettes, body, parts, companions };
}

/** Canonical ordering makes wardrobe and world reuse exactly the same composition. */
export function avatarProfileKey(profile: ModularAvatarProfile): string {
  return (Object.keys(MODULAR_AVATAR_OPTIONS) as AvatarSlot[]).map((slot) => profile[slot]).join('|');
}

export function avatarFrameAtTime(clip: AvatarClip, elapsedMs: number, reducedMotion = false): { frame: number; complete: boolean } {
  if (reducedMotion) return { frame: 0, complete: !clip.loop };
  const total = clip.durationsMs.reduce((sum, ms) => sum + ms, 0);
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  if (!clip.loop && elapsed >= total) return { frame: clip.durationsMs.length - 1, complete: true };
  let remaining = elapsed % total;
  for (let frame = 0; frame < clip.durationsMs.length; frame++) {
    if (remaining < clip.durationsMs[frame]) return { frame, complete: false };
    remaining -= clip.durationsMs[frame];
  }
  return { frame: 0, complete: false };
}

export function avatarPoseCels(manifest: ModularAvatarManifest, profile: ModularAvatarProfile, direction: AvatarDirection, action: AvatarAction, frame: number): AvatarCel[] {
  return [manifest.body, ...AVATAR_PART_SLOTS.map((slot) => manifest.parts[profile[slot]])]
    .flatMap((part) => part[direction][action]![frame].cels).sort((a, b) => a.z - b.z);
}

export function resolveAvatarAction(manifest: ModularAvatarManifest, action: AvatarAction): AvatarAction {
  return manifest.clips[action] ? action : 'idle';
}

/** Pure adapter; blitz-preview is presentation only and does not create a game mode. */
export type AvatarContext = 'wardrobe' | 'campus' | 'shift' | 'blitz-preview';
export function avatarForContext(profile: ModularAvatarProfile, context: AvatarContext, equipment?: { heldItem: string } | null): ModularAvatarProfile {
  if (context !== 'shift' || !equipment) return { ...profile };
  const heldItem = (MODULAR_AVATAR_OPTIONS.heldItem as readonly string[]).includes(equipment.heldItem) ? equipment.heldItem : 'held.none';
  return { ...profile, heldItem };
}
