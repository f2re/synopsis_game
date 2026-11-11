import {
  AVATAR_ACTIONS, MODULAR_AVATAR_URL, avatarPoseCels, avatarProfileKey, parseModularAvatarManifest, parseModularAvatarProfile, resolveAvatarAction,
  type AvatarAction, type AvatarCel, type AvatarClip, type AvatarDirection, type AvatarFrameBox,
  type AvatarPaletteRamp, type ModularAvatarManifest, type ModularAvatarProfile,
} from './modularAvatarManifest.ts';
import { resolveAvatarPresentation, type AvatarPresentation, type AvatarPresentationOptions } from './modularAvatarPresentation.ts';

/** Shared CPU budgets. Phaser uploads only the currently leased body/child sheets. */
export const AVATAR_CACHE_BUDGET = { composites: 12 * 1024 * 1024, paletteCels: 4 * 1024 * 1024 } as const;

interface CacheEntry<T> { value: T; bytes: number; references: number; }
export interface AvatarLease<T> { value: T; release: () => void; }

/** A leased sheet cannot be evicted while a Canvas or Phaser consumer uses it. */
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

/** Change only four exact RGB keys; authored alpha and every other pixel survive. */
export function remapAvatarPalette(pixels: Uint8ClampedArray, source: AvatarPaletteRamp, target: AvatarPaletteRamp): void {
  const colors = new Map(source.map((rgb, index) => [rgb[0] * 65536 + rgb[1] * 256 + rgb[2], target[index]]));
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) continue;
    const color = colors.get(pixels[offset] * 65536 + pixels[offset + 1] * 256 + pixels[offset + 2]);
    if (color) { pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2]; }
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
  const context = result.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Modular avatar: Canvas 2D unavailable');
  context.imageSmoothingEnabled = false;
  return { canvas: result, context };
}
function releaseCanvas(value: HTMLCanvasElement): void { value.width = 0; value.height = 0; }

class ModularAvatarCompositor {
  private packPromise?: Promise<{ manifest: ModularAvatarManifest; atlas: HTMLImageElement }>;
  private failureAt = 0;
  private cels = new AvatarResourceCache<HTMLCanvasElement>(AVATAR_CACHE_BUDGET.paletteCels, releaseCanvas);
  private composites = new AvatarResourceCache<AvatarComposite>(AVATAR_CACHE_BUDGET.composites, (value) => {
    releaseCanvas(value.body.canvas); if (value.companion) releaseCanvas(value.companion.canvas);
  });

  private load(): Promise<{ manifest: ModularAvatarManifest; atlas: HTMLImageElement }> {
    if (this.failureAt && Date.now() - this.failureAt > 30_000) this.packPromise = undefined;
    if (!this.packPromise) {
      this.failureAt = 0;
      this.packPromise = (async () => {
        const abort = new AbortController();
        const manifestTimeout = window.setTimeout(() => abort.abort(), 20_000);
        let manifest: ModularAvatarManifest;
        try {
          const response = await fetch(MODULAR_AVATAR_URL, { credentials: 'same-origin', signal: abort.signal });
          if (!response.ok) throw new Error(`Modular avatar: manifest HTTP ${response.status}`);
          manifest = parseModularAvatarManifest(await response.json());
        } finally { window.clearTimeout(manifestTimeout); }
        const atlas = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          const timeout = window.setTimeout(() => { image.onload = image.onerror = null; image.src = ''; reject(new Error('Modular avatar: atlas timed out')); }, 20_000);
          image.onload = () => { window.clearTimeout(timeout); image.onload = image.onerror = null; resolve(image); };
          image.onerror = () => { window.clearTimeout(timeout); image.onload = image.onerror = null; reject(new Error('Modular avatar: atlas unavailable')); };
          image.src = manifest.atlas.url;
        });
        if (atlas.naturalWidth !== manifest.atlas.width || atlas.naturalHeight !== manifest.atlas.height) throw new Error('Modular avatar: atlas dimensions differ from manifest');
        return { manifest, atlas };
      })().catch((error: unknown) => { this.failureAt = Date.now(); throw error; });
    }
    return this.packPromise;
  }

  async acquirePresentation(profile: ModularAvatarProfile, options: AvatarPresentationOptions = {}): Promise<{
    presentation: AvatarPresentation; lease: AvatarLease<AvatarComposite>;
  }> {
    const { manifest } = await this.load();
    const presentation = resolveAvatarPresentation(profile, options, AVATAR_ACTIONS.filter((action) => Boolean(manifest.clips[action])));
    const lease = await this.acquire(presentation.profile, presentation.direction, presentation.action, { companionVisible: presentation.companionVisible });
    return { presentation, lease };
  }

  async acquire(profileValue: ModularAvatarProfile, direction: AvatarDirection, requestedAction: AvatarAction,
    display: { companionVisible?: boolean } = {}): Promise<AvatarLease<AvatarComposite>> {
    const profile = parseModularAvatarProfile(profileValue);
    if (!profile) throw new Error('Modular avatar: invalid saved profile');
    const { manifest, atlas } = await this.load();
    const action = resolveAvatarAction(manifest, requestedAction);
    const companionVisible = display.companionVisible !== false;
    const key = `${manifest.rigId}:${manifest.revision}:${avatarProfileKey(profile)}:${direction}:${action}${companionVisible ? '' : ':companion-hidden'}`;
    return this.composites.acquire(key, () => {
      const clip = manifest.clips[action]!;
      const count = clip.durationsMs.length;
      const body = canvas(manifest.frame.width * count, manifest.frame.height);
      const selectedCompanion = companionVisible ? manifest.companions[profile.companion] : null;
      const child = selectedCompanion ? canvas(selectedCompanion.frame.width * count, selectedCompanion.frame.height) : null;
      try {
        const draw = (context: CanvasRenderingContext2D, cel: AvatarCel, frameOffset: number) => {
          const [sx, sy, w, h] = cel.rect;
          if (!cel.paletteRole) { context.drawImage(atlas, sx, sy, w, h, frameOffset + cel.at[0], cel.at[1], w, h); return; }
          const palette = manifest.palettes[cel.paletteRole];
          const selected = profile[cel.paletteRole === 'skin' ? 'skinTone' : 'hairColor'];
          const paletteKey = `${manifest.revision}:${cel.rect.join(',')}:${cel.paletteRole}:${selected}`;
          const lease = this.cels.acquire(paletteKey, () => {
            const tint = canvas(w, h);
            tint.context.drawImage(atlas, sx, sy, w, h, 0, 0, w, h);
            const pixels = tint.context.getImageData(0, 0, w, h);
            remapAvatarPalette(pixels.data, palette.source, palette.variants[selected]);
            tint.context.putImageData(pixels, 0, 0);
            return { value: tint.canvas, bytes: w * h * 4 };
          });
          try { context.drawImage(lease.value, frameOffset + cel.at[0], cel.at[1]); } finally { lease.release(); }
        };
        for (let index = 0; index < count; index++) {
          for (const cel of avatarPoseCels(manifest, profile, direction, action, index)) draw(body.context, cel, index * manifest.frame.width);
          if (selectedCompanion && child) {
            const cels = [...selectedCompanion.frames[direction][action]![index].cels].sort((a, b) => a.z - b.z);
            for (const cel of cels) draw(child.context, cel, index * selectedCompanion.frame.width);
          }
        }
        const value: AvatarComposite = { key, manifest, action, direction, clip,
          body: { canvas: body.canvas, frame: manifest.frame },
          companion: selectedCompanion && child ? { canvas: child.canvas, frame: selectedCompanion.frame, anchor: selectedCompanion.anchor } : null };
        return { value, bytes: (body.canvas.width * body.canvas.height + (child ? child.canvas.width * child.canvas.height : 0)) * 4 };
      } catch (error) { releaseCanvas(body.canvas); if (child) releaseCanvas(child.canvas); throw error; }
    });
  }

  diagnostics() { return { composites: this.composites.stats(), paletteCels: this.cels.stats() }; }
}

/** One shared loader/cache for all React and Phaser consumers in this document. */
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

/** Draw precomposed sheets only; shared with QA to compare both rendering adapters. */
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
