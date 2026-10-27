#!/usr/bin/env python3
"""Builds an avatar sprite sheet from the pose references in the asset's work dir.

Usage (from the repo root):
    python3 services/asset-generator/scripts/build_avatar_sheet.py --asset AVATAR-HERO-M2
    python3 services/asset-generator/scripts/build_avatar_sheet.py --asset AVATAR-BASE-M2

Each asset has a config in services/asset-generator/config (poses, animation kinds, sizes) whose
"mode" picks the builder: "pixel" (locked 14-colour 32x48) or "hires" (shared adaptive palette, 96x144).
Writes <asset>.png, a 4x preview with the cell grid and a JSON report to <work dir>/sheet. It never
promotes anything into assets/source: that stays a reviewed, manual step.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SERVICE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_DIR.parents[1]
sys.path.insert(0, str(SERVICE_DIR))

from core.avatar_sheet import PEOPLE_PALETTE, PoseSpec, build_sheet  # noqa: E402
from core.avatar_sheet_hires import HIRES_COLORS, HIRES_FRAME_SIZE, HIRES_SHEET_SIZE, build_hires_sheet  # noqa: E402
from core.avatar_sheet import FRAME_SIZE, SHEET_SIZE  # noqa: E402
from core.sheet_layouts import layout_for  # noqa: E402

CONFIGS = {
    "AVATAR-BASE-M2": SERVICE_DIR / "config" / "avatar_base_m2_poses.json",
    "AVATAR-HERO-M2": SERVICE_DIR / "config" / "avatar_hero_m2_poses.json",
}
PREVIEW_SCALE = 4


def load_config(path: Path) -> tuple[str, dict[str, str], dict[str, PoseSpec]]:
    """Reads the mode, row -> source file and row -> PoseSpec maps, validating the row keys."""
    data = json.loads(path.read_text(encoding="utf-8"))
    expected = [row.key for row in layout_for(data["asset"])]
    missing = [key for key in expected if key not in data["rows"]]
    if missing:
        raise SystemExit(f"config misses rows: {missing}")
    sources = {key: data["rows"][key]["source"] for key in expected}
    specs = {
        key: PoseSpec(
            kind=data["rows"][key]["kind"],
            target_height=int(data["rows"][key]["target_height"]),
            erase=tuple(tuple(box) for box in data["rows"][key].get("erase", [])),
        )
        for key in expected
    }
    return data.get("mode", "pixel"), sources, specs


def preview(sheet: Image.Image, frame: tuple[int, int]) -> Image.Image:
    """Nearest-neighbour preview on a dark slate with the cell grid drawn on top."""
    big = sheet.resize((sheet.width * PREVIEW_SCALE, sheet.height * PREVIEW_SCALE), Image.NEAREST)
    canvas = Image.new("RGBA", big.size, (60, 70, 90, 255))
    canvas.alpha_composite(big)
    draw = ImageDraw.Draw(canvas)
    for x in range(0, big.width + 1, frame[0] * PREVIEW_SCALE):
        draw.line((x, 0, x, big.height), fill=(255, 255, 255, 60))
    for y in range(0, big.height + 1, frame[1] * PREVIEW_SCALE):
        draw.line((0, y, big.width, y), fill=(255, 255, 255, 60))
    return canvas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--asset", choices=sorted(CONFIGS), default="AVATAR-HERO-M2")
    parser.add_argument("--work-dir", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()

    work_dir = args.work_dir or REPO_ROOT / "assets" / "work" / args.asset
    out_dir = args.out or work_dir / "sheet"
    mode, sources, specs = load_config(CONFIGS[args.asset])
    poses = {key: Image.open(work_dir / "raw" / name) for key, name in sources.items()}

    if mode == "hires":
        sheet, frame, expected, limit = build_hires_sheet(poses, specs, args.asset), HIRES_FRAME_SIZE, HIRES_SHEET_SIZE, HIRES_COLORS
    else:
        sheet, frame, expected, limit = build_sheet(poses, specs, args.asset), FRAME_SIZE, SHEET_SIZE, len(PEOPLE_PALETTE)

    colors = sorted({px[:3] for px in sheet.getdata() if px[3] == 255})
    report = {
        "asset": args.asset,
        "mode": mode,
        "size": list(sheet.size),
        "expected_size": list(expected),
        "opaque_colors": len(colors),
        "color_limit": limit,
        "off_palette": [list(c) for c in colors if mode == "pixel" and c not in PEOPLE_PALETTE],
        "alphas": sorted({px[3] for px in sheet.getdata()}),
        "rows": {row.key: row.frames for row in layout_for(args.asset)},
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = args.asset.lower().replace("-", "_")
    sheet.save(out_dir / f"{stem}.png")
    preview(sheet, frame).save(out_dir / f"{stem}_preview.png")
    (out_dir / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))
    ok = report["size"] == report["expected_size"] and not report["off_palette"] and len(colors) <= limit
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
