import {
  AVATAR_DIRECTIONS, MODULAR_AVATAR_URL, avatarPoseCels, avatarProfileKey, parseModularAvatarManifest, parseModularAvatarProfile,
  type AvatarAction, type AvatarCel, type AvatarClip, type AvatarDirection, type AvatarFrameBox,
  type ModularAvatarManifest, type ModularAvatarProfile,
} from './modularAvatarManifest.ts';
import stationFauna from '../assets/hub/station-fauna.json';

/** Bounded CPU resources for the static fitting room only. */
export const AVATAR_CACHE_BUDGET = { composites: 12 * 1024 * 1024 } as const;

interface CacheEntry<T> { value: T; bytes: number; references: number; }
export interface AvatarLease<T> { value: T; release: () => void; }

/** A leased frame cannot be evicted while the fitting preview uses it. */
export class AvatarResourceCache<T> {
  private entries = new Map<string, CacheEntry<T>>();
  private usedBytes = 0;
  readonly budget: number;
  private readonly dispose: (value: T) => void;
  constructor(budget: number, dispose: (value: T) => void) { this.budget = budget; this.dispose = dispose; }
  acquire(key: string, create: () => { value: T; bytes: number }): AvatarLease<T> {
    let entry = this.entries.get(key);
    if (entry) { this.entries.delete(key); this.entries.set(key, entry); }
    else {
      const created = create();
      if (!Number.isFinite(created.bytes) || created.bytes < 0 || created.bytes > this.budget) {
        this.dispose(created.value);
        throw new Error('Modular avatar: composition exceeds cache budget');
      }
      for (const [oldKey, old] of this.entries) {
        if (this.usedBytes + created.bytes <= this.budget) break;
        if (old.references !== 0) continue;
        this.entries.delete(oldKey);
        this.usedBytes -= old.bytes;
        this.dispose(old.value);
      }
      if (this.usedBytes + created.bytes > this.budget) {
        this.dispose(created.value);
        throw new Error('Modular avatar: active composition budget exhausted');
      }
      entry = { ...created, references: 0 };
      this.entries.set(key, entry);
      this.usedBytes += entry.bytes;
    }
    entry.references++;
    let released = false;
    return { value: entry.value, release: () => { if (!released) { released = true; entry!.references--; } } };
  }
  stats(): { bytes: number; entries: number; leased: number; budget: number } {
    return { bytes: this.usedBytes, entries: this.entries.size, leased: [...this.entries.values()].filter((entry) => entry.references > 0).length, budget: this.budget };
  }
}

export interface AvatarSheet { canvas: HTMLCanvasElement; frame: AvatarFrameBox; }
export interface AvatarComposite {
  key: string;
  manifest: ModularAvatarManifest;
  action: AvatarAction;
  direction: AvatarDirection;
  clip: AvatarClip;
  body: AvatarSheet;
  companion: (AvatarSheet & { anchor: [number, number] }) | null;
}

function canvas(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const result = document.createElement('canvas');
  result.width = width; result.height = height;
  const context = result.getContext('2d');
  if (!context) throw new Error('Modular avatar: Canvas 2D unavailable');
  context.imageSmoothingEnabled = false;
  return { canvas: result, context };
}
function releaseCanvas(value: HTMLCanvasElement): void { value.width = 0; value.height = 0; }

type PaletteRect = AvatarCel['rect'];
interface FittingPalettes {
  revision: string;
  image: string;
  size: [number, number];
  variants: Record<string, Record<string, PaletteRect>>;
}
const FITTING_DIRECTORY = MODULAR_AVATAR_URL.slice(0, MODULAR_AVATAR_URL.lastIndexOf('/') + 1);

async function fetchJson(url: string): Promise<unknown> {
  const abort = new AbortController();
  const timeout = window.setTimeout(() => abort.abort(), 20_000);
  try {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', signal: abort.signal });
    if (!response.ok) throw new Error(`Modular avatar: HTTP ${response.status}`);
    return await response.json();
  } finally { window.clearTimeout(timeout); }
}

async function loadAtlas(url: string, width: number, height: number): Promise<HTMLImageElement> {
  const atlas = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.onload = image.onerror = null;
      image.src = '';
      reject(new Error('Modular avatar: atlas timed out'));
    }, 20_000);
    image.onload = () => { window.clearTimeout(timeout); image.onload = image.onerror = null; resolve(image); };
    image.onerror = () => { window.clearTimeout(timeout); image.onload = image.onerror = null; reject(new Error('Modular avatar: atlas unavailable')); };
    image.src = url;
  });
  if (atlas.naturalWidth !== width || atlas.naturalHeight !== height) throw new Error('Modular avatar: atlas dimensions differ from manifest');
  return atlas;
}

interface FittingPack {
  manifest: ModularAvatarManifest;
  atlas: HTMLImageElement;
  paletteAtlas: HTMLImageElement;
  variants: FittingPalettes['variants'];
}

class ModularAvatarCompositor {
  private packPromise?: Promise<FittingPack>;
  private companionImages = new Map<string, Promise<HTMLImageElement>>();
  private failureAt = 0;
  private composites = new AvatarResourceCache<AvatarComposite>(AVATAR_CACHE_BUDGET.composites, (value) => {
    releaseCanvas(value.body.canvas); if (value.companion) releaseCanvas(value.companion.canvas);
  });

  private load(): Promise<FittingPack> {
    if (this.failureAt && Date.now() - this.failureAt > 30_000) this.packPromise = undefined;
    if (!this.packPromise) {
      this.failureAt = 0;
      this.packPromise = (async () => {
        const [rig, paletteData] = await Promise.all([
          fetchJson(MODULAR_AVATAR_URL), fetchJson(FITTING_DIRECTORY + 'fitting-palettes.json'),
        ]);
        const manifest = parseModularAvatarManifest(rig);
        const palettes = paletteData as FittingPalettes;
        if (!palettes || palettes.revision !== manifest.revision || typeof palettes.image !== 'string'
          || !/^fitting-palettes-[a-f0-9]{16}\.png$/.test(palettes.image)
          || !Array.isArray(palettes.size) || palettes.size.length !== 2
          || !palettes.size.every((size) => Number.isInteger(size) && size > 0 && size <= 1024)
          || palettes.size[0] * palettes.size[1] * 4 > 2 * 1024 * 1024
          || !palettes.variants || typeof palettes.variants !== 'object') {
          throw new Error('Modular avatar: invalid fitting palettes');
        }
        const [atlas, paletteAtlas] = await Promise.all([
          // The deployment serves PNGs as immutable. A new rig must use its
          // own cache entry even though the server reads from a fixed path.
          loadAtlas(`${manifest.atlas.url}?v=${manifest.revision}`, manifest.atlas.width, manifest.atlas.height),
          loadAtlas(FITTING_DIRECTORY + palettes.image, ...palettes.size),
        ]);
        return { manifest, atlas, paletteAtlas, variants: palettes.variants };
      })().catch((error: unknown) => { this.failureAt = Date.now(); throw error; });
    }
    return this.packPromise;
  }

  /** Compose only the first authored standing frame, never an animation sheet. */
  async acquireStatic(profileValue: ModularAvatarProfile, direction: AvatarDirection): Promise<AvatarLease<AvatarComposite>> {
    const profile = parseModularAvatarProfile(profileValue);
    if (!profile) throw new Error('Modular avatar: invalid saved profile');
    const { manifest, atlas, paletteAtlas, variants } = await this.load();
    const companionId = profile.companion;
    const companion = manifest.companions[companionId];
    const url = stationFauna.fitting[companionId as keyof typeof stationFauna.fitting];
    let companionImage: HTMLImageElement | undefined;
    if (companion && url) {
      let pending = this.companionImages.get(url);
      if (!pending) {
        pending = loadAtlas(url, companion.frame.width * AVATAR_DIRECTIONS.length, companion.frame.height);
        this.companionImages.set(url, pending);
        pending.catch(() => this.companionImages.delete(url));
      }
      companionImage = await pending.catch(() => undefined);
    }
    const action = 'idle';
    const key = `${manifest.rigId}:${manifest.revision}:${avatarProfileKey(profile)}:${direction}:static0:${companionImage ? 'station-fauna' : 'base'}`;
    return this.composites.acquire(key, () => {
      const clip = { durationsMs: [manifest.clips.idle.durationsMs[0]], loop: false };
      const count = 1;
      const body = canvas(manifest.frame.width * count, manifest.frame.height);
      const selectedCompanion = companion;
      const child = selectedCompanion ? canvas(selectedCompanion.frame.width * count, selectedCompanion.frame.height) : null;
      try {
        const draw = (context: CanvasRenderingContext2D, cel: AvatarCel, frameOffset: number) => {
          let rect = cel.rect;
          let image = atlas;
          if (cel.paletteRole) {
            const selected = profile[cel.paletteRole === 'skin' ? 'skinTone' : 'hairColor'];
            const palette = manifest.palettes[cel.paletteRole];
            const variant = variants[`${cel.rect.join(',')}:${cel.paletteRole}`]?.[selected];
            if (variant) {
              if (!Array.isArray(variant) || variant.length !== 4 || !variant.every(Number.isInteger)
                || variant[0] < 0 || variant[1] < 0 || variant[2] !== cel.rect[2] || variant[3] !== cel.rect[3]
                || variant[0] + variant[2] > paletteAtlas.naturalWidth
                || variant[1] + variant[3] > paletteAtlas.naturalHeight) {
                throw new Error('Modular avatar: invalid fitting palette rectangle');
              }
              rect = variant;
              image = paletteAtlas;
            } else if (palette.variants[selected].some((rgb, index) => rgb.some((channel, axis) => channel !== palette.source[index][axis]))) {
              throw new Error('Modular avatar: missing fitting palette');
            }
          }
          const [sx, sy, w, h] = rect;
          context.drawImage(image, sx, sy, w, h, frameOffset + cel.at[0], cel.at[1], w, h);
        };
        for (let index = 0; index < count; index++) {
          for (const cel of avatarPoseCels(manifest, profile, direction, action, index)) draw(body.context, cel, index * manifest.frame.width);
          if (selectedCompanion && child) {
            if (companionImage) {
              const { width, height } = selectedCompanion.frame;
              child.context.drawImage(companionImage, AVATAR_DIRECTIONS.indexOf(direction) * width, 0, width, height, 0, 0, width, height);
            } else {
              const cels = [...selectedCompanion.frames[direction][action]![index].cels].sort((a, b) => a.z - b.z);
              for (const cel of cels) draw(child.context, cel, index * selectedCompanion.frame.width);
            }
          }
        }
        const value: AvatarComposite = { key, manifest, action, direction, clip,
          body: { canvas: body.canvas, frame: manifest.frame },
          companion: selectedCompanion && child ? { canvas: child.canvas, frame: selectedCompanion.frame, anchor: selectedCompanion.anchor } : null };
        return { value, bytes: (body.canvas.width * body.canvas.height + (child ? child.canvas.width * child.canvas.height : 0)) * 4 };
      } catch (error) { releaseCanvas(body.canvas); if (child) releaseCanvas(child.canvas); throw error; }
    });
  }

  diagnostics() { return { composites: this.composites.stats() }; }
}

/** Loaded only by the wardrobe. Saved portraits never call this compositor. */
export const modularAvatarCompositor = new ModularAvatarCompositor();

export function avatarPreviewBounds(composite: AvatarComposite): { width: number; height: number; bodyAt: [number, number]; childAt: [number, number] } {
  const { frame } = composite.body;
  const child = composite.companion;
  const cx = child ? frame.pivot[0] + child.anchor[0] - child.frame.pivot[0] : 0;
  const cy = child ? frame.pivot[1] + child.anchor[1] - child.frame.pivot[1] : 0;
  // Reserve the family's complete child envelope even when companion.none is
  // selected. Equipping a pet must never shrink, stretch or move the person.
  const children = Object.values(composite.manifest.companions).flatMap((item) => item ? [{
    x: frame.pivot[0] + item.anchor[0] - item.frame.pivot[0], y: frame.pivot[1] + item.anchor[1] - item.frame.pivot[1],
    width: item.frame.width, height: item.frame.height,
  }] : []);
  const left = Math.min(0, ...children.map((item) => item.x)), top = Math.min(0, ...children.map((item) => item.y));
  return { width: Math.max(frame.width, ...children.map((item) => item.x + item.width)) - left,
    height: Math.max(frame.height, ...children.map((item) => item.y + item.height)) - top,
    bodyAt: [0 - left, 0 - top], childAt: [cx - left, cy - top] };
}

/** Draw the precomposed fitting frame without scheduling any further work. */
export function drawAvatarComposite(context: CanvasRenderingContext2D, composite: AvatarComposite, frame: number): void {
  const bounds = avatarPreviewBounds(composite);
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.imageSmoothingEnabled = false;
  const draw = (sheet: AvatarSheet, at: [number, number]) => context.drawImage(sheet.canvas,
    frame * sheet.frame.width, 0, sheet.frame.width, sheet.frame.height, at[0], at[1], sheet.frame.width, sheet.frame.height);
  if (composite.companion && composite.companion.anchor[1] < 0) draw(composite.companion, bounds.childAt);
  draw(composite.body, bounds.bodyAt);
  if (composite.companion && composite.companion.anchor[1] >= 0) draw(composite.companion, bounds.childAt);
}
