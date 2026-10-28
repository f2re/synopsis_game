"""Build a clean environment-only dataset for the 26063 world-style LoRA.

Unlike the legacy exploratory dataset this module deliberately does not add a
shared colour/lighting tail, does not mirror images and never uses a smoothing
resampler. A source lineage is capped so that crops of one screenshot cannot
outvote genuinely different scenes.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

WORLD_TRIGGER = "synopsis_world_style"
MAX_PER_LINEAGE = 3
BANNED_ID_PARTS = (
    "_flip",
    "icon_",
    "btn_",
    "badge_",
    "panel_",
    "slot_",
    "portrait_",
    "avatar_",
    "character_",
    "char_",
    "item_",
    "fauna_",
    "clothing_",
    "hair_",
)
LEGACY_STYLE_TAIL = "detailed high-resolution pixel art, rich saturated colours, warm glowing light"


@dataclass(frozen=True)
class WorldSpec:
    id: str
    path: Path
    caption: str
    lineage: str
    category: str
    lighting: str
    season: str
    weather: str
    box: tuple[int, int, int, int] | None = None


def caption_for(text: str) -> str:
    """Prefix one scoped token; everything else remains an independent variable."""
    body = text.strip()
    if body.startswith(f"{WORLD_TRIGGER},"):
        body = body.split(",", 1)[1].strip()
    if "synopsis_pixel_art" in body or LEGACY_STYLE_TAIL in body:
        raise ValueError("world caption contains the legacy mixed-style trigger/tail")
    return f"{WORLD_TRIGGER}, {body}"


def validate_specs(specs: list[WorldSpec], max_per_lineage: int = MAX_PER_LINEAGE) -> None:
    if not specs:
        raise ValueError("world-style dataset must not be empty")
    ids: set[str] = set()
    lineages: Counter[str] = Counter()
    for spec in specs:
        if spec.id in ids:
            raise ValueError(f"duplicate world-style id: {spec.id}")
        ids.add(spec.id)
        lowered = spec.id.lower()
        if any(part in lowered for part in BANNED_ID_PARTS):
            raise ValueError(f"non-world asset is forbidden in world-style dataset: {spec.id}")
        if not spec.caption.strip():
            raise ValueError(f"empty caption: {spec.id}")
        caption_for(spec.caption)
        if not spec.lineage.strip():
            raise ValueError(f"missing source lineage: {spec.id}")
        lineages[spec.lineage] += 1
        if lineages[spec.lineage] > max_per_lineage:
            raise ValueError(
                f"source lineage '{spec.lineage}' has more than {max_per_lineage} samples; "
                "add genuinely different source scenes instead of more crops"
            )
        if spec.box is not None:
            x0, y0, x1, y1 = spec.box
            if x0 < 0 or y0 < 0 or x1 <= x0 or y1 <= y0:
                raise ValueError(f"invalid crop box for {spec.id}: {spec.box}")


def _load_opaque_crop(spec: WorldSpec) -> Image.Image:
    if not spec.path.is_file():
        raise FileNotFoundError(f"missing world-style reference: {spec.path}")
    image = Image.open(spec.path).convert("RGBA")
    if spec.box is not None:
        x0, y0, x1, y1 = spec.box
        if x1 > image.width or y1 > image.height:
            raise ValueError(f"crop box exceeds source image for {spec.id}: {spec.box} > {image.size}")
        image = image.crop(spec.box)
    alpha_min, alpha_max = image.getchannel("A").getextrema()
    if alpha_min != 255 or alpha_max != 255:
        raise ValueError(
            f"transparent/object-sheet source is forbidden in world-style dataset: {spec.id}; "
            "place isolated assets in an architecture/prop adapter instead"
        )
    return image.convert("RGB")


def _nearest_cap(image: Image.Image, max_side: int) -> Image.Image:
    """Cap resolution without inventing blended pixels."""
    long_side = max(image.size)
    if long_side <= max_side:
        return image
    scale = max_side / long_side
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.NEAREST)


def inspect_world_specs(specs: list[WorldSpec], max_per_lineage: int = MAX_PER_LINEAGE) -> dict:
    """Validate all source files/crops and return coverage without writing a dataset."""
    validate_specs(specs, max_per_lineage=max_per_lineage)
    for spec in specs:
        _load_opaque_crop(spec)
    return _coverage(specs)


def _coverage(specs: list[WorldSpec]) -> dict:
    def counts(field: str) -> dict[str, int]:
        return dict(sorted(Counter(getattr(s, field) for s in specs).items()))

    return {
        "categories": counts("category"),
        "lighting": counts("lighting"),
        "seasons": counts("season"),
        "weather": counts("weather"),
        "lineages": counts("lineage"),
    }


def build_world_style_dataset(
    specs: list[WorldSpec],
    out_dir: Path,
    *,
    max_side: int = 2048,
    max_per_lineage: int = MAX_PER_LINEAGE,
) -> dict:
    """Write a Diffusers imagefolder dataset plus an inspectable lineage report."""
    if max_side < 256:
        raise ValueError("max_side must be at least 256")
    validate_specs(specs, max_per_lineage=max_per_lineage)
    if out_dir.exists() and any(out_dir.iterdir()):
        raise ValueError(f"dataset directory must be empty: {out_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, str]] = []
    sources: list[dict[str, object]] = []
    for spec in specs:
        image = _load_opaque_crop(spec)
        original_size = image.size
        image = _nearest_cap(image, max_side)
        name = f"{spec.id}.png"
        image.save(out_dir / name)
        rows.append({"file_name": name, "text": caption_for(spec.caption)})
        sources.append(
            {
                "id": spec.id,
                "file_name": name,
                "source": str(spec.path),
                "source_sha256": hashlib.sha256(spec.path.read_bytes()).hexdigest(),
                "lineage": spec.lineage,
                "crop": list(spec.box) if spec.box else None,
                "source_crop_size": list(original_size),
                "training_size": list(image.size),
                "category": spec.category,
                "lighting": spec.lighting,
                "season": spec.season,
                "weather": spec.weather,
            }
        )

    (out_dir / "metadata.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8"
    )
    report = {
        "dataset_version": "world-style-v4",
        "status": "seed" if len(rows) < 80 else "training_candidate",
        "trigger_word": WORLD_TRIGGER,
        "images": len(rows),
        "unique_source_lineages": len({s.lineage for s in specs}),
        "max_samples_per_lineage": max_per_lineage,
        "resampling": "nearest-only",
        "augmentation": "none",
        "recommended_min_images": 80,
        "target_images": "120-180 genuinely distinct compositions",
        "coverage": _coverage(specs),
        "sources": sources,
    }
    (out_dir / "dataset-report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return report
