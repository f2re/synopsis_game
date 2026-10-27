#!/usr/bin/env python3
"""Builds the AVATAR-BASE-M2 192x288 sprite sheet from the pose references in the work dir.

Usage (from the repo root):
    python3 services/asset-generator/scripts/build_avatar_base_m2.py [--out DIR]

Writes avatar_base_m2.png, a 4x preview with the cell grid and a JSON report. It never
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

from core.avatar_sheet import FRAME_SIZE, PEOPLE_PALETTE, SHEET_SIZE, PoseSpec, build_sheet  # noqa: E402
from core.sheet_layouts import layout_for  # noqa: E402

CONFIG_PATH = SERVICE_DIR / "config" / "avatar_base_m2_poses.json"
WORK_DIR = REPO_ROOT / "assets" / "work" / "AVATAR-BASE-M2"
PREVIEW_SCALE = 4


def load_config(path: Path) -> tuple[dict[str, str], dict[str, PoseSpec]]:
    """Reads the row -> source file and row -> PoseSpec maps, validating the row keys."""
    data = json.loads(path.read_text(encoding="utf-8"))
    expected = [row.key for row in layout_for(data["asset"])]
    missing = [key for key in expected if key not in data["rows"]]
    if missing:
        raise SystemExit(f"config misses rows: {missing}")
    sources = {key: data["rows"][key]["source"] for key in expected}
    specs = {
        key: PoseSpec(
            kind=cfg["kind"],
            target_height=int(cfg["target_height"]),
            erase=tuple(tuple(box) for box in cfg.get("erase", [])),
        )
        for key, cfg in ((key, data["rows"][key]) for key in expected)
    }
    return sources, specs


def preview(sheet: Image.Image) -> Image.Image:
    """Nearest-neighbour preview on a dark slate with the 32x48 cell grid drawn on top."""
    big = sheet.resize((sheet.width * PREVIEW_SCALE, sheet.height * PREVIEW_SCALE), Image.NEAREST)
    canvas = Image.new("RGBA", big.size, (60, 70, 90, 255))
    canvas.alpha_composite(big)
    draw = ImageDraw.Draw(canvas)
    for x in range(0, big.width + 1, FRAME_SIZE[0] * PREVIEW_SCALE):
        draw.line((x, 0, x, big.height), fill=(255, 255, 255, 60))
    for y in range(0, big.height + 1, FRAME_SIZE[1] * PREVIEW_SCALE):
        draw.line((0, y, big.width, y), fill=(255, 255, 255, 60))
    return canvas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir", type=Path, default=WORK_DIR)
    parser.add_argument("--out", type=Path, default=WORK_DIR / "sheet")
    args = parser.parse_args()

    sources, specs = load_config(CONFIG_PATH)
    poses = {key: Image.open(args.work_dir / "raw" / name) for key, name in sources.items()}
    sheet = build_sheet(poses, specs)

    colors = sorted({px[:3] for px in sheet.getdata() if px[3] == 255})
    report = {
        "size": list(sheet.size),
        "expected_size": list(SHEET_SIZE),
        "opaque_colors": len(colors),
        "off_palette": [list(c) for c in colors if c not in PEOPLE_PALETTE],
        "alphas": sorted({px[3] for px in sheet.getdata()}),
        "rows": {row.key: row.frames for row in layout_for("AVATAR-BASE-M2")},
    }
    args.out.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out / "avatar_base_m2.png")
    preview(sheet).save(args.out / "avatar_base_m2_preview.png")
    (args.out / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))
    return 0 if report["size"] == report["expected_size"] and not report["off_palette"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
