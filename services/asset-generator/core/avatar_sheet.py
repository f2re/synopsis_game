"""Builds the AVATAR-BASE-M2 sprite sheet from one reference pose per row.

Pipeline per row: cut the backdrop, erase leftovers (chairs), scale to 32x48 with a flat
vote, snap to the locked people palette, then derive the row's frames procedurally.
All functions are pure: they return new images and never touch their inputs.
"""
from __future__ import annotations

from collections import Counter, deque
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass

from PIL import Image, ImageDraw

from core.pixel_refiner import nearest_palette_color
from core.sheet_layouts import layout_for

FRAME_SIZE = (32, 48)
COLUMNS = 6
SHEET_SIZE = (FRAME_SIZE[0] * COLUMNS, FRAME_SIZE[1] * 6)

# 14 colours: skin and hair are locked because game code recolours them at runtime.
# Ramps: shirt 3, trousers 2, skin 2, hair 2; the last three serve the typing machine.
PEOPLE_PALETTE: tuple[tuple[int, int, int], ...] = (
    (242, 201, 168),  # skin
    (217, 160, 126),  # skin shadow
    (43, 33, 28),  # hair
    (74, 58, 50),  # hair light
    (22, 20, 28),  # outline, eyes, shoes
    (200, 204, 212),  # shirt light
    (158, 162, 174),  # shirt mid
    (112, 116, 130),  # shirt shadow
    (74, 78, 96),  # trousers
    (46, 48, 64),  # trousers dark
    (181, 112, 92),  # mouth, blush
    (138, 148, 160),  # machine light
    (84, 92, 104),  # machine dark
    (150, 215, 240),  # screen
)
OUTLINE_COLOR = (22, 20, 28)
# Colours that may legitimately be single pixels (eyes, mouth) and so skip speckle smoothing.
DETAIL_COLORS = frozenset({OUTLINE_COLOR, (181, 112, 92)})
SUPERSAMPLE = 4
EYE_DARK_SHARE = 0.2
# Eyes come out dark brown, nearest to the hair colour, so both count as eye samples.
EYE_COLORS = (OUTLINE_COLOR, PEOPLE_PALETTE[2])
OUTLINE_WIDTH = 1

BACKDROP_TOLERANCE = 40
BACKDROP_STEP = 10
# Pixels this close to the backdrop colour are backdrop even when enclosed (gap between legs).
BACKDROP_HOLE_TOLERANCE = 8
MASK_DOWNSCALE = 4
# Magenta chroma backdrop: a gradient and a darker floor shadow still read as magenta because
# green is far below both red and blue, which no skin, cloth or outline colour of the sheet is.
CHROMA_MIN_CHANNEL = 90
CHROMA_GREEN_RATIO = 0.62
CHROMA_BORDER_SHARE = 0.6
MIN_SPECK_PIXELS = 4


@dataclass(frozen=True)
class PoseSpec:
    """How to turn a raw pose reference into one sheet row."""

    kind: str
    target_height: int
    erase: tuple[tuple[float, float, float, float], ...] = ()


def snap_to_palette(img: Image.Image, palette: Sequence[tuple[int, int, int]] = PEOPLE_PALETTE) -> Image.Image:
    """Maps every opaque pixel to the nearest palette colour and makes alpha binary."""
    src = img.convert("RGBA")
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    cache: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    pixels = [
        (*cache.setdefault(px[:3], nearest_palette_color(px[:3], list(palette))), 255) if px[3] >= 128 else (0, 0, 0, 0)
        for px in src.getdata()
    ]
    out.putdata(pixels)
    return out


def erase_regions(img: Image.Image, boxes: Sequence[tuple[float, float, float, float]]) -> Image.Image:
    """Returns a copy with fractional (x0, y0, x1, y1) boxes made fully transparent."""
    w, h = img.size
    alpha = img.getchannel("A").copy()
    draw = ImageDraw.Draw(alpha)
    for x0, y0, x1, y1 in boxes:
        draw.rectangle((round(x0 * w), round(y0 * h), round(x1 * w) - 1, round(y1 * h) - 1), fill=0)
    out = img.copy()
    out.putalpha(alpha)
    return out


def _is_chroma(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return min(r, b) >= CHROMA_MIN_CHANNEL and g <= CHROMA_GREEN_RATIO * min(r, b)


def _chroma_mask(small: Image.Image) -> Image.Image | None:
    """Mask of chroma pixels, or None when the borders are not a chroma backdrop."""
    w, h = small.size
    px = small.load()
    border = [px[x, y] for x in range(w) for y in (0, h - 1)] + [px[x, y] for y in range(h) for x in (0, w - 1)]
    if sum(_is_chroma(c) for c in border) < CHROMA_BORDER_SHARE * len(border):
        return None
    mask = Image.new("L", (w, h), 0)
    mask.putdata([255 if _is_chroma(c) else 0 for c in small.getdata()])
    return mask


def _backdrop_mask(rgb: Image.Image, full_res: bool = False) -> Image.Image:
    """255 where the backdrop is: chroma key when there is one, else a border flood fill.

    ``full_res`` keys the chroma per source pixel instead of on a reduced copy, which the
    hi-res sheet needs: its outlines are thinner than a reduced mask cell.
    """
    small = rgb.resize((max(rgb.width // MASK_DOWNSCALE, 1), max(rgb.height // MASK_DOWNSCALE, 1)), Image.NEAREST)
    chroma = _chroma_mask(small)
    if chroma is not None and full_res:
        mask = Image.new("L", rgb.size, 0)
        mask.putdata([255 if _is_chroma(c) else 0 for c in rgb.getdata()])
        return mask
    if chroma is not None:
        return chroma.resize(rgb.size, Image.NEAREST)
    w, h = small.size
    px = small.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    border = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    seen = set(border)
    queue = deque(border)
    mask = Image.new("L", (w, h), 0)
    mpx = mask.load()
    while queue:
        x, y = queue.popleft()
        cur = px[x, y]
        if sum(abs(a - b) for a, b in zip(cur, bg)) > BACKDROP_TOLERANCE:
            continue
        mpx[x, y] = 255
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen:
                if sum(abs(a - b) for a, b in zip(px[nx, ny], cur)) <= BACKDROP_STEP:
                    seen.add((nx, ny))
                    queue.append((nx, ny))
    for y in range(h):
        for x in range(w):
            if sum(abs(a - b) for a, b in zip(px[x, y], bg)) <= BACKDROP_HOLE_TOLERANCE:
                mpx[x, y] = 255
    return mask.resize(rgb.size, Image.NEAREST)


def _drop_specks(img: Image.Image, min_pixels: int = MIN_SPECK_PIXELS) -> Image.Image:
    """Removes opaque 8-connected components smaller than ``min_pixels``."""
    w, h = img.size
    alpha = img.getchannel("A").load()
    seen: set[tuple[int, int]] = set()
    out = img.copy()
    opx = out.load()
    for sy in range(h):
        for sx in range(w):
            if alpha[sx, sy] < 128 or (sx, sy) in seen:
                continue
            comp, queue = [], deque([(sx, sy)])
            seen.add((sx, sy))
            while queue:
                x, y = queue.popleft()
                comp.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        n = (x + dx, y + dy)
                        if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen and alpha[n] >= 128:
                            seen.add(n)
                            queue.append(n)
            if len(comp) < min_pixels:
                for x, y in comp:
                    opx[x, y] = (0, 0, 0, 0)
    return out


def _cell_vote(sample: Image.Image, frame: tuple[int, int]) -> tuple[Image.Image, dict[tuple[int, int], float]]:
    """Collapses each SUPERSAMPLE x SUPERSAMPLE cell to its most common palette colour.

    Also returns, per cell, the share of eye-coloured (outline or hair) samples: small dark details such
    as eyes rarely win a cell vote and are restored from this afterwards.
    """
    fw, fh = frame
    pixels = sample.load()
    out = Image.new("RGBA", frame, (0, 0, 0, 0))
    opx = out.load()
    dark_share: dict[tuple[int, int], float] = {}
    for cy in range(fh):
        for cx in range(fw):
            cell = [
                pixels[cx * SUPERSAMPLE + dx, cy * SUPERSAMPLE + dy]
                for dx in range(SUPERSAMPLE)
                for dy in range(SUPERSAMPLE)
            ]
            solid = [c[:3] for c in cell if c[3] == 255]
            if len(solid) * 2 < len(cell):
                continue
            counts = Counter(solid)
            best = max(counts.values())
            top = [c for c, n in counts.items() if n == best]
            opx[cx, cy] = (*min(top, key=sum), 255)
            dark_share[(cx, cy)] = sum(counts.get(c, 0) for c in EYE_COLORS) / len(solid)
    return out, dark_share


def _restore_eyes(img: Image.Image, dark_share: dict[tuple[int, int], float]) -> Image.Image:
    """Turns a skin cell into an eye pixel when it holds enough dark samples and sits among skin."""
    skin = {PEOPLE_PALETTE[0], PEOPLE_PALETTE[1]}
    out = img.copy()
    for (x, y), share in dark_share.items():
        if share < EYE_DARK_SHARE or img.getpixel((x, y))[:3] not in skin:
            continue
        around = _neighbours(img, x, y)
        if all(n and n[3] == 255 and n[:3] in skin for n in around):
            out.putpixel((x, y), (*OUTLINE_COLOR, 255))
    return out


def _neighbours(img: Image.Image, x: int, y: int) -> list[tuple[int, int, int, int] | None]:
    """The four edge neighbours of a pixel, None where they fall outside the image."""
    w, h = img.size
    return [
        img.getpixel((x + dx, y + dy)) if 0 <= x + dx < w and 0 <= y + dy < h else None
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
    ]


def _smooth_silhouette(img: Image.Image) -> Image.Image:
    """Trims one-pixel spurs and fills one-pixel notches so the outline reads as a clean shape."""
    w, h = img.size
    trimmed = img.copy()
    for y in range(h):
        for x in range(w):
            if img.getpixel((x, y))[3] == 255:
                solid = sum(1 for n in _neighbours(img, x, y) if n and n[3] == 255)
                if solid <= 1:
                    trimmed.putpixel((x, y), (0, 0, 0, 0))
    filled = trimmed.copy()
    for y in range(h):
        for x in range(w):
            if trimmed.getpixel((x, y))[3] == 0:
                solid = [n[:3] for n in _neighbours(trimmed, x, y) if n and n[3] == 255]
                if len(solid) >= 3:
                    filled.putpixel((x, y), (*Counter(solid).most_common(1)[0][0], 255))
    return filled


def _smooth_colors(img: Image.Image) -> Image.Image:
    """Replaces speckle: a colour pixel none of whose neighbours share its colour."""
    w, h = img.size
    out = img.copy()
    for y in range(h):
        for x in range(w):
            cur = img.getpixel((x, y))
            if cur[3] == 0 or cur[:3] in DETAIL_COLORS:
                continue
            around = [n[:3] for n in _neighbours(img, x, y) if n and n[3] == 255]
            if len(around) >= 3 and cur[:3] not in around:
                out.putpixel((x, y), (*Counter(around).most_common(1)[0][0], 255))
    return out


def _add_outline(img: Image.Image) -> Image.Image:
    """Wraps the silhouette in a one-pixel outline ring, growing it outward."""
    w, h = img.size
    out = img.copy()
    for y in range(h):
        for x in range(w):
            if img.getpixel((x, y))[3] == 0 and any(n and n[3] == 255 for n in _neighbours(img, x, y)):
                out.putpixel((x, y), (*OUTLINE_COLOR, 255))
    return out


def pose_to_frame(
    raw: Image.Image,
    target_height: int,
    erase: Sequence[tuple[float, float, float, float]] = (),
    frame: tuple[int, int] = FRAME_SIZE,
    outline: bool = True,
) -> Image.Image:
    """Cuts one raw pose out of its backdrop and renders it as a clean frame.

    The pose is fitted inside the frame minus the outline ring, classified to the people
    palette at 4x supersampling, voted down to one colour per pixel, then cleaned. With
    ``outline=False`` the ring is left off so the sprite can be animated first and wrapped
    by ``finish_frame`` afterwards: moving pieces that already carry an outline tears it.
    """
    rgb = raw.convert("RGB")
    cutout = rgb.convert("RGBA")
    cutout.putalpha(_backdrop_mask(rgb).point(lambda v: 0 if v else 255))
    cutout = erase_regions(cutout, erase)
    box = cutout.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
    if box is None:
        raise ValueError("pose has no foreground after backdrop removal")
    content = cutout.crop(box)
    fw, fh = frame
    ring = 2 * OUTLINE_WIDTH
    scale = min((target_height - ring) / content.height, (fw - ring - 2) / content.width)
    size = (max(round(content.width * scale * SUPERSAMPLE), 1), max(round(content.height * scale * SUPERSAMPLE), 1))
    small = snap_to_palette(content.resize(size, Image.NEAREST))
    canvas = Image.new("RGBA", (fw * SUPERSAMPLE, fh * SUPERSAMPLE), (0, 0, 0, 0))
    bottom = (fh - 1 - OUTLINE_WIDTH) * SUPERSAMPLE
    canvas.paste(small, ((canvas.width - size[0]) // 2, bottom - size[1]))
    voted, dark_share = _cell_vote(canvas, frame)
    shape = _smooth_silhouette(voted)
    sprite = _restore_eyes(_smooth_colors(shape), dark_share)
    return finish_frame(sprite) if outline else sprite


def finish_frame(sprite: Image.Image) -> Image.Image:
    """Wraps a ring-less sprite in its outline and drops stray specks."""
    return _drop_specks(_add_outline(sprite))


def _bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    box = frame.getchannel("A").getbbox()
    if box is None:
        raise ValueError("frame is empty")
    return box


def _shift_band(
    frame: Image.Image, y0: int, y1: int, dx: int, dy: int, x0: int = 0, x1: int | None = None
) -> Image.Image:
    """Moves a rectangular band of pixels by (dx, dy), clearing where it was."""
    x1 = frame.width if x1 is None else x1
    out = frame.copy()
    band = frame.crop((x0, y0, x1, y1))
    out.paste((0, 0, 0, 0), (x0, y0, x1, y1))
    out.paste(band, (x0 + dx, y0 + dy), band)
    return out


def _cycle(pattern: Sequence, count: int) -> list:
    return [pattern[i % len(pattern)] for i in range(count)]


def _idle(frame: Image.Image, count: int, scale: int = 1) -> list[Image.Image]:
    top, bottom = _bbox(frame)[1], _bbox(frame)[3]
    body_end = top + int(0.6 * (bottom - top))
    return [_shift_band(frame, top, body_end, 0, dy * scale) for dy in _cycle([0, 1, 1, 0], count)]


def _mirror_columns(frame: Image.Image, y0: int, cx: float) -> Image.Image:
    """Mirrors the rows from ``y0`` down around the vertical axis ``cx``."""
    out = frame.copy()
    out.paste((0, 0, 0, 0), (0, y0, frame.width, frame.height))
    for x in range(frame.width):
        sx = round(2 * cx - x)
        if 0 <= sx < frame.width:
            out.paste(frame.crop((sx, y0, sx + 1, frame.height)), (x, y0))
    return out


def _row_runs(frame: Image.Image, y: int, gap: int = 1) -> list[tuple[int, int]]:
    """Opaque horizontal runs of one row as (x0, x1_exclusive), merging gaps up to ``gap`` px."""
    xs = [x for x in range(frame.width) if frame.getpixel((x, y))[3] == 255]
    runs: list[list[int]] = []
    for x in xs:
        if runs and x - runs[-1][1] <= gap:
            runs[-1][1] = x + 1
        else:
            runs.append([x, x + 1])
    return [(a, b) for a, b in runs]


def _close_legs(frame: Image.Image, hip: int, stride: float, gap: int = 1, ramp: int = 0) -> Image.Image:
    """Moves each leg run toward the hip axis (negative stride mirrors first), keeping widths.

    ``ramp`` rows below ``hip`` ease the movement in, so hi-res legs do not tear at the hip line.
    """
    box = frame.crop((0, hip, frame.width, frame.height)).getchannel("A").getbbox()
    if box is None:
        return frame
    cx = (box[0] + box[2] - 1) / 2
    source = _mirror_columns(frame, hip, cx) if stride < 0 else frame
    amount = abs(stride)
    out = frame.copy()
    out.paste((0, 0, 0, 0), (0, hip, frame.width, frame.height))
    for y in range(hip, frame.height):
        edge = 0
        ease = 1.0 if ramp <= 0 else min((y - hip + 1) / ramp, 1.0)
        for x0, x1 in _row_runs(source, y, gap):
            dx = round(((x0 + x1 - 1) / 2 - cx) * (amount - 1) * ease)
            left = max(x0 + dx, edge)  # legs close up side by side but never overlap
            run = source.crop((x0, y, x1, y + 1))
            out.paste(run, (left, y), run)
            edge = left + (x1 - x0)
    return out


def _walk(frame: Image.Image, count: int, scale: int = 1) -> list[Image.Image]:
    _, top, _, bottom = _bbox(frame)
    # Hi-res art swings the hands lower than 58% of the height: start the legs below them
    # and ease the movement in.
    hip = top + int((0.58 if scale == 1 else 0.64) * (bottom - top))
    ramp = (scale - 1) * 8
    frames = []
    for stride in _cycle([1.0, 0.55, 0.22, -1.0, -0.55, -0.22], count):
        moved = _close_legs(frame, hip, stride, gap=scale, ramp=ramp)
        passing = abs(stride) < 0.3
        frames.append(_shift_band(moved, 0, frame.height, 0, -scale) if passing else moved)
    return frames


def _typing(frame: Image.Image, count: int, scale: int = 1) -> list[Image.Image]:
    x0, top, x1, bottom = _bbox(frame)
    h, w = bottom - top, x1 - x0
    head_end = top + int(0.30 * h)
    hands = (top + int(0.40 * h), top + int(0.52 * h), x0 + int(0.30 * w), x0 + int(0.58 * w))
    frames = []
    for hand_dy, nod in zip(_cycle([0, 1, 0, 1, 0, 1], count), _cycle([0, 0, 0, 1, 0, 0], count)):
        moved = _shift_band(frame, hands[0], hands[1], 0, hand_dy * scale, hands[2], hands[3])
        frames.append(_shift_band(moved, top, head_end, 0, nod * scale))
    return frames


def _head_bob(
    frame: Image.Image, count: int, pattern: Sequence[int], head_ratio: float, scale: int = 1
) -> list[Image.Image]:
    top, bottom = _bbox(frame)[1], _bbox(frame)[3]
    head_end = top + int(head_ratio * (bottom - top))
    return [_shift_band(frame, top, head_end, 0, dy * scale) for dy in _cycle(pattern, count)]


def _thinking(frame: Image.Image, count: int, scale: int = 1) -> list[Image.Image]:
    return _head_bob(frame, count, [0, 1, 1, 0], 0.28, scale)


def _disappointed(frame: Image.Image, count: int, scale: int = 1) -> list[Image.Image]:
    return _head_bob(frame, count, [0, 1, 2, 1], 0.35, scale)


def _celebrate(frame: Image.Image, count: int, scale: int = 1) -> list[Image.Image]:
    return [_shift_band(frame, 0, frame.height, 0, dy * scale) for dy in _cycle([0, -1, -2, -1, 0, 0], count)]


ANIMATIONS: dict[str, Callable[[Image.Image, int, int], list[Image.Image]]] = {
    "idle": _idle,
    "walk": _walk,
    "typing": _typing,
    "thinking": _thinking,
    "celebrate": _celebrate,
    "disappointed": _disappointed,
}


def animate(kind: str, frame: Image.Image, count: int, scale: int = 1) -> list[Image.Image]:
    """Derives ``count`` frames of an animation kind from a single base frame.

    ``scale`` multiplies every pixel offset, so a 3x-resolution frame moves 3x as far.
    """
    if kind not in ANIMATIONS:
        raise ValueError(f"unknown animation kind: {kind}")
    return ANIMATIONS[kind](frame, count, scale)


def assemble_sheet(
    rows: Sequence[Sequence[Image.Image]], frame: tuple[int, int] = FRAME_SIZE, columns: int = COLUMNS
) -> Image.Image:
    """Lays frames out row by row; cells past a row's frame count stay transparent."""
    fw, fh = frame
    sheet = Image.new("RGBA", (fw * columns, fh * len(rows)), (0, 0, 0, 0))
    for r, frames in enumerate(rows):
        if len(frames) > columns:
            raise ValueError(f"row {r} has {len(frames)} frames, sheet holds {columns}")
        for c, cell in enumerate(frames):
            if cell.size != frame:
                raise ValueError(f"row {r} frame {c} is {cell.size}, expected {frame}")
            sheet.paste(cell, (c * fw, r * fh))
    return sheet


def build_sheet(
    poses: Mapping[str, Image.Image],
    specs: Mapping[str, PoseSpec],
    asset_id: str = "AVATAR-BASE-M2",
) -> Image.Image:
    """Builds the whole sheet following the documented row layout of ``asset_id``."""
    rows = []
    for row in layout_for(asset_id):
        spec = specs[row.key]
        base = pose_to_frame(poses[row.key], spec.target_height, spec.erase, outline=False)
        rows.append([finish_frame(frame) for frame in animate(spec.kind, base, row.frames)])
    return assemble_sheet(rows)
