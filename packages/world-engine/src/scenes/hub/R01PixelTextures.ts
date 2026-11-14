import Phaser from 'phaser';

const MAX_RASTER_WIDTH = 2048;
const MAX_RASTER_PIXELS = 2_500_000;

/** Rasterize each layered source onto the station's one-texel world grid.
 * The camera then projects the same grid for architecture, fixtures and actors.
 * Upload only on layout changes, and share identical placements of props.
 */
export class R01PixelTextures {
  private readonly keys = new Set<string>();
  private readonly inUse = new Set<string>();

  constructor(private readonly textures: Phaser.Textures.TextureManager) {}

  fit(image: Phaser.GameObjects.Image, sourceKey: string, scale: number, x: number, y: number, feet: boolean, trimTop = 0): void {
    const source = this.textures.get(sourceKey).getSourceImage();
    if (!(source instanceof HTMLImageElement) && !(source instanceof HTMLCanvasElement)) {
      throw new Error(`Station asset ${sourceKey} must be an image or canvas`);
    }
    const height = source.height - trimTop;
    const widthOnGrid = Math.max(1, Math.round(source.width * scale));
    const heightOnGrid = Math.max(1, Math.round(height * scale));
    if (Math.max(widthOnGrid, heightOnGrid) > MAX_RASTER_WIDTH || widthOnGrid * heightOnGrid > MAX_RASTER_PIXELS) {
      // Very shallow windows can expose a much wider world than the design
      // viewport. Project the native texture there instead of allocating a
      // viewport-sized overscan raster.
      image.setTexture(sourceKey).setScale(scale).setPosition(Math.round(x), Math.round(y))
        .setDisplayOrigin(Math.floor(source.width / 2), feet ? source.height : trimTop)
        .setCrop(0, trimTop, source.width, height);
      return;
    }
    const key = `${sourceKey}:world-grid:${widthOnGrid}x${heightOnGrid}:${trimTop}`;
    if (!this.keys.has(key)) {
      const texture = this.textures.createCanvas(key, widthOnGrid, heightOnGrid);
      if (!texture) throw new Error(`Unable to allocate station texture ${key}`);
      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      context.drawImage(source, 0, trimTop, source.width, height, 0, 0, widthOnGrid, heightOnGrid);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
      this.keys.add(key);
    }
    this.inUse.add(key);
    image.setTexture(key).setScale(1).setPosition(Math.round(x), Math.round(y))
      .setDisplayOrigin(Math.floor(widthOnGrid / 2), feet ? heightOnGrid : 0).setCrop();
  }

  finishLayout(): void {
    for (const key of this.keys) {
      if (this.inUse.has(key)) continue;
      this.textures.remove(key);
      this.keys.delete(key);
    }
    this.inUse.clear();
  }

  destroy(): void {
    for (const key of this.keys) this.textures.remove(key);
    this.keys.clear();
    this.inUse.clear();
  }
}
