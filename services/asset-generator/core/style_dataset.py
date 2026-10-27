"""Builds a style-LoRA imagefolder dataset from owner-supplied references.

Images are kept whole (or cut to a given rectangle) so that a caption keeps describing what the model
sees; train with ``--use_aspect_ratio_buckets``. Without buckets the official trainer resizes to a
square and takes a RANDOM square window of a wide scene, so the caption no longer matches the pixels
and fine detail is lost. ``crops > 1`` still cuts full-height squares for trainers without buckets.
This is the owner's exploratory dataset: it does not replace the reviewed-manifest path in
``lora_trainer`` and states so in its report.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

TRIGGER_WORD = "synopsis_pixel_art"
STYLE_TAIL = "detailed high-resolution pixel art, rich saturated colours, warm glowing light"


@dataclass(frozen=True)
class CropSpec:
    """One source image: whole by default, a fixed pixel box, or ``crops`` > 1 squares across it."""

    id: str
    path: Path
    caption: str
    crops: int = 1
    box: tuple[int, int, int, int] | None = None


def square_crops(size: tuple[int, int], count: int) -> list[tuple[int, int, int, int]]:
    """Evenly spaced squares along the long side; a square image yields a single full crop."""
    w, h = size
    side = min(w, h)
    long_side = max(w, h)
    count = 1 if long_side == side else max(count, 1)
    if count == 1 and long_side != side:
        offset = (long_side - side) // 2
        return [(offset, 0, offset + side, side)] if w >= h else [(0, offset, side, offset + side)]
    if count == 1:
        return [(0, 0, w, h)]
    step = (long_side - side) / (count - 1)
    offsets = [round(i * step) for i in range(count)]
    if w >= h:
        return [(o, 0, o + side, side) for o in offsets]
    return [(0, o, side, o + side) for o in offsets]


def caption_for(text: str) -> str:
    """Trigger word first, the shared style tail last (added once)."""
    body = text.strip().removeprefix(f"{TRIGGER_WORD}, ")
    if not body.endswith(STYLE_TAIL):
        body = f"{body}, {STYLE_TAIL}"
    return f"{TRIGGER_WORD}, {body}"


def _cap_long_side(image: Image.Image, max_side: int) -> Image.Image:
    """Downscales only when the long side exceeds ``max_side``."""
    long_side = max(image.size)
    if long_side <= max_side:
        return image
    scale = max_side / long_side
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)


def build_style_dataset(specs: list[CropSpec], out_dir: Path, max_side: int = 2048) -> dict:
    """Writes the images and metadata.jsonl; returns a report with source checksums."""
    for spec in specs:
        if not spec.path.is_file():
            raise FileNotFoundError(f"Missing reference image: {spec.path}")
    if out_dir.exists() and any(out_dir.iterdir()):
        raise ValueError(f"Dataset directory must be empty: {out_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    sources: dict[str, str] = {}
    for spec in specs:
        image = Image.open(spec.path).convert("RGBA")
        backdrop = Image.new("RGBA", image.size, (255, 255, 255, 255))
        backdrop.alpha_composite(image)
        image = backdrop.convert("RGB")
        sources[spec.id] = hashlib.sha256(spec.path.read_bytes()).hexdigest()
        if spec.box:
            boxes = [spec.box]
        elif spec.crops > 1:
            boxes = square_crops(image.size, spec.crops)
        else:
            boxes = [(0, 0, *image.size)]
        for index, box in enumerate(boxes):
            name = f"{spec.id}.png" if len(boxes) == 1 else f"{spec.id}_c{index}.png"
            _cap_long_side(image.crop(box), max_side).save(out_dir / name)
            rows.append({"file_name": name, "text": caption_for(spec.caption)})
    (out_dir / "metadata.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    return {
        "dataset_path": str(out_dir),
        "images": len(rows),
        "sources": sources,
        "trigger_word": TRIGGER_WORD,
        "note": "owner-supplied references; the reviewed-manifest gates of lora_trainer were not run",
    }
