/** Public, semantic contract for the authored R01 character pack.
 * R01 uses its own presentation scale; this is not the four-direction modular
 * 32×48 avatar family specified for the later character production milestone.
 */
export interface WorldCharacterClip {
  assetId: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  durationsMs: number[];
  /** Optional authored facing for fixed NPC movement. No mirroring is inferred. */
  facing?: 'left' | 'right' | 'front' | 'back';
}

export interface WorldCharacterDefinition {
  id: string;
  label: string;
  role: 'player' | 'npc' | 'companion';
  displayHeight: number;
  pivot: [number, number];
  positions: { landscape: [number, number]; portrait: [number, number] };
  clips: { idle: WorldCharacterClip; walk?: WorldCharacterClip };
  /** A fixed-facing employee crosses the viewport and wraps only out of sight. */
  motion?: { type: 'walk-across'; direction: 'left' | 'right'; speed: number };
}

export interface WorldEquipmentDefinition {
  id: string;
  assetId: string;
  url: string;
  displayHeight: number;
  /** Offset from the player's foot in multiples of the player's displayHeight. */
  anchor: [number, number];
}

export interface WorldCharacterManifest {
  version: 1;
  artAcceptance: 'PASS';
  actors: WorldCharacterDefinition[];
  equipment: WorldEquipmentDefinition[];
}

const HELD_ITEMS = new Set(['held.none', 'held.tablet', 'held.map-folder', 'held.pencil']);

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value);
}
function localAsset(value: unknown): value is string {
  // No external requests, path traversal, credentials or runtime-generated data URLs.
  return typeof value === 'string' && /^\/(hub\/characters|assets)\/[a-zA-Z0-9/_-]+\.png$/.test(value);
}
function finite(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}
function pair(value: unknown, minimum: number, maximum: number): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((v) => finite(v, minimum, maximum));
}

function parseClip(value: unknown): WorldCharacterClip {
  const clip = record(value);
  if (!clip || !identifier(clip.assetId) || !localAsset(clip.url) ||
      !finite(clip.frameWidth, 1, 512) || !Number.isInteger(clip.frameWidth) ||
      !finite(clip.frameHeight, 1, 512) || !Number.isInteger(clip.frameHeight) ||
      !finite(clip.frameCount, 1, 64) || !Number.isInteger(clip.frameCount) ||
      !Array.isArray(clip.durationsMs) || clip.durationsMs.length !== clip.frameCount ||
      !clip.durationsMs.every((duration) => finite(duration, 60, 60_000))) {
    throw new Error('Invalid character clip dimensions, duration or local asset path');
  }
  return {
    assetId: clip.assetId, url: clip.url,
    frameWidth: clip.frameWidth, frameHeight: clip.frameHeight, frameCount: clip.frameCount,
    durationsMs: [...clip.durationsMs] as number[],
    ...(['left', 'right', 'front', 'back'].includes(String(clip.facing)) ? { facing: clip.facing as WorldCharacterClip['facing'] } : {}),
  };
}

/** Fail closed: only an independently accepted, bounded pack enters the loader. */
export function parseCharacterManifest(value: unknown): WorldCharacterManifest {
  const manifest = record(value);
  if (!manifest || manifest.version !== 1 || manifest.artAcceptance !== 'PASS' ||
      !Array.isArray(manifest.actors) || manifest.actors.length > 12 ||
      (manifest.equipment !== undefined && !Array.isArray(manifest.equipment))) {
    throw new Error('Character manifest is unaccepted or malformed');
  }
  const actors = manifest.actors.map((value): WorldCharacterDefinition => {
    const actor = record(value);
    const positions = record(actor?.positions);
    const clips = record(actor?.clips);
    if (!actor || !identifier(actor.id) || typeof actor.label !== 'string' || actor.label.length > 100 ||
        !['player', 'npc', 'companion'].includes(String(actor.role)) ||
        !finite(actor.displayHeight, 8, 128) || !pair(actor.pivot, 0, 1) ||
        !pair(positions?.landscape, 0, 960) || !pair(positions?.portrait, 0, 780) || !clips) {
      throw new Error('Invalid character definition');
    }
    const idle = parseClip(clips.idle);
    const walk = clips.walk ? parseClip(clips.walk) : undefined;
    if (walk && (walk.frameWidth !== idle.frameWidth || walk.frameHeight !== idle.frameHeight)) {
      throw new Error('All actor clips must share one frame box and foot pivot');
    }
    const motion = record(actor.motion);
    if (actor.motion !== undefined && (!motion || actor.role !== 'npc' || motion.type !== 'walk-across' ||
        !['left', 'right'].includes(String(motion.direction)) || !finite(motion.speed, 4, 60) || !walk ||
        (walk.facing !== undefined && walk.facing !== motion.direction))) {
      throw new Error('Ambient walk needs an NPC, authored facing and a bounded speed');
    }
    return {
      id: actor.id, label: actor.label, role: actor.role as WorldCharacterDefinition['role'],
      displayHeight: actor.displayHeight, pivot: [...actor.pivot],
      positions: { landscape: [...positions!.landscape as [number, number]], portrait: [...positions!.portrait as [number, number]] },
      clips: { idle, ...(walk ? { walk } : {}) },
      ...(motion ? { motion: { type: 'walk-across' as const, direction: motion.direction as 'left' | 'right', speed: motion.speed as number } } : {}),
    };
  });
  const equipment = (manifest.equipment ?? [] as unknown[]) as unknown[];
  if (equipment.length > 16) throw new Error('Equipment pack exceeds its bounded presentation budget');
  const items = equipment.map((value): WorldEquipmentDefinition => {
    const item = record(value);
    if (!item || typeof item.id !== 'string' || !HELD_ITEMS.has(item.id) || item.id === 'held.none' ||
        !identifier(item.assetId) || !localAsset(item.url) || !finite(item.displayHeight, 4, 64) || !pair(item.anchor, -2, 2)) {
      throw new Error('Invalid world equipment definition');
    }
    return { id: item.id, assetId: item.assetId, url: item.url, displayHeight: item.displayHeight, anchor: [...item.anchor] };
  });
  if (new Set(actors.map((actor) => actor.id)).size !== actors.length ||
      new Set(items.map((item) => item.id)).size !== items.length ||
      actors.filter((actor) => actor.role === 'player').length > 1) {
    throw new Error('Duplicate actor, player or equipment identity');
  }
  const clips = actors.flatMap((actor) => Object.values(actor.clips));
  const texturePixels = clips.reduce((total, clip) => total + clip.frameWidth * clip.frameHeight * clip.frameCount, 0);
  if (texturePixels > 4_194_304) throw new Error('Character pack exceeds the 16 MiB decoded animation texture budget');
  const assetIds = [...clips.map((clip) => clip.assetId), ...items.map((item) => item.assetId)];
  if (new Set(assetIds).size !== assetIds.length) throw new Error('Duplicate character texture identity');
  return { version: 1, artAcceptance: 'PASS', actors, equipment: items };
}

/** Authored frame duration is independent of display refresh and low-power sampling. */
export function characterFrameAtTime(clip: WorldCharacterClip, elapsedMs: number): number {
  const cycle = clip.durationsMs.reduce((sum, duration) => sum + duration, 0);
  let remaining = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) % cycle;
  for (let index = 0; index < clip.frameCount; index++) {
    if (remaining < clip.durationsMs[index]) return index;
    remaining -= clip.durationsMs[index];
  }
  return 0;
}

export function characterTextureKey(assetId: string): string { return `character:${assetId}`; }
