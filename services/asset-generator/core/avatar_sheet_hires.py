"""Hi-res pixel-art variant of the avatar sheet builder (AVATAR-HERO-M2: 96x144 frames, 96 colours).

Unlike the locked 14-colour 32x48 builder, the palette is adaptive and shared by the whole
sheet: it is fitted to all pose references together, so every row uses the same colours.
The generator's own outlines are kept, no extra outline ring is added.
"""
from __future__ import annotations

from collections import Counter
from collections.abc import Mapping, Sequence

from PIL import Image, ImageFilter, features

from core.avatar_sheet import (
    FRAME_SIZE,
    PoseSpec,
    _backdrop_mask,
    _drop_specks,
    _smooth_silhouette,
    animate,
    assemble_sheet,
    erase_regions,
)
from core.sheet_layouts import layout_for

HIRES_FRAME_SIZE = (96, 144)
HIRES_COLORS = 96
HIRES_COLUMNS = 6
HIRES_SHEET_SIZE = (HIRES_FRAME_SIZE[0] * HIRES_COLUMNS, HIRES_FRAME_SIZE[1] * 6)
HIRES_SUPERSAMPLE = 3
# The generator blends the backdrop into edges; eroding the cut-out hides that pink fringe.
FRINGE_ERODE_KERNEL = 5
SIDE_MARGIN = 4
BOTTOM_MARGIN = 2
MIN_SPECK_PIXELS = 6


def _render_canvas(
    raw: Image.Image,
    target_height: int,
    erase: Sequence[tuple[float, float, float, float]],
    frame: tuple[int, int],
) -> Image.Image:
    """Cuts a pose out of its backdrop and places it on a supersampled, frame-sized canvas."""
    rgb = raw.convert("RGB")
    alpha = _backdrop_mask(rgb, full_res=True).point(lambda v: 0 if v else 255)
    alpha = alpha.filter(ImageFilter.MinFilter(FRINGE_ERODE_KERNEL))
    cutout = rgb.convert("RGBA")
    cutout.putalpha(alpha)
    cutout = erase_regions(cutout, erase)
    box = cutout.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
    if box is None:
        raise ValueError("pose has no foreground after backdrop removal")
    content = cutout.crop(box)
    fw, fh = frame
    scale = min(target_height / content.height, (fw - SIDE_MARGIN) / content.width)
    size = (max(round(content.width * scale * HIRES_SUPERSAMPLE), 1), max(round(content.height * scale * HIRES_SUPERSAMPLE), 1))
    colour = content.convert("RGB").resize(size, Image.BOX)
    shape = content.getchannel("A").resize(size, Image.NEAREST)
    placed = colour.convert("RGBA")
    placed.putalpha(shape)
    canvas = Image.new("RGBA", (fw * HIRES_SUPERSAMPLE, fh * HIRES_SUPERSAMPLE), (0, 0, 0, 0))
    canvas.paste(placed, ((canvas.width - size[0]) // 2, (fh - BOTTOM_MARGIN) * HIRES_SUPERSAMPLE - size[1]))
    return canvas


def _adaptive_palette(canvases: Sequence[Image.Image], colors: int) -> Image.Image:
    """Fits one palette to the foreground pixels of every canvas together."""
    pixels = [px[:3] for canvas in canvases for px in canvas.getdata() if px[3] == 255]
    strip = Image.new("RGB", (len(pixels), 1))
    strip.putdata(pixels)
    method = Image.Quantize.LIBIMAGEQUANT if features.check("libimagequant") else Image.Quantize.MEDIANCUT
    return strip.quantize(colors=colors, method=method, dither=Image.Dither.NONE)


def _vote_to_frame(canvas: Image.Image, palette: Image.Image, frame: tuple[int, int]) -> Image.Image:
    """Maps the canvas to the shared palette and votes each supersampled cell down to one pixel."""
    fw, fh = frame
    flat = canvas.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
    indices = list(flat.getdata())
    colours = palette.getpalette() or []
    alpha = list(canvas.getchannel("A").getdata())
    width = canvas.width
    s = HIRES_SUPERSAMPLE
    out = Image.new("RGBA", frame, (0, 0, 0, 0))
    opx = out.load()
    for cy in range(fh):
        for cx in range(fw):
            votes = Counter(
                indices[(cy * s + dy) * width + cx * s + dx]
                for dy in range(s)
                for dx in range(s)
                if alpha[(cy * s + dy) * width + cx * s + dx] == 255
            )
            if sum(votes.values()) * 2 < s * s:
                continue
            best = max(votes.values())
            index = min((i for i, n in votes.items() if n == best), key=lambda i: sum(colours[3 * i:3 * i + 3]))
            opx[cx, cy] = (colours[3 * index], colours[3 * index + 1], colours[3 * index + 2], 255)
    return _smooth_silhouette(out)


def pose_to_hires_frame(
    raw: Image.Image,
    target_height: int,
    erase: Sequence[tuple[float, float, float, float]] = (),
    frame: tuple[int, int] = HIRES_FRAME_SIZE,
    colors: int = HIRES_COLORS,
) -> Image.Image:
    """Renders one pose as a hi-res frame with a palette fitted to that pose alone."""
    canvas = _render_canvas(raw, target_height, erase, frame)
    return _vote_to_frame(canvas, _adaptive_palette([canvas], colors), frame)


def build_hires_sheet(
    poses: Mapping[str, Image.Image],
    specs: Mapping[str, PoseSpec],
    asset_id: str = "AVATAR-HERO-M2",
    frame: tuple[int, int] = HIRES_FRAME_SIZE,
    colors: int = HIRES_COLORS,
) -> Image.Image:
    """Builds the hi-res sheet: one shared palette, rows animated from one pose each."""
    rows = layout_for(asset_id)
    canvases = {
        row.key: _render_canvas(poses[row.key], specs[row.key].target_height, specs[row.key].erase, frame)
        for row in rows
    }
    palette = _adaptive_palette(list(canvases.values()), colors)
    scale = max(frame[1] // FRAME_SIZE[1], 1)
    cells = []
    for row in rows:
        base = _vote_to_frame(canvases[row.key], palette, frame)
        frames = animate(specs[row.key].kind, base, row.frames, scale)
        cells.append([_drop_specks(f, MIN_SPECK_PIXELS) for f in frames])
    return assemble_sheet(cells, frame, HIRES_COLUMNS)
