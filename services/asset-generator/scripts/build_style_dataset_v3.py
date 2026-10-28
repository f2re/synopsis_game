#!/usr/bin/env python3
"""Builds the v3 style-LoRA dataset: v2 plus cutaway-hub crops with explicit lighting tags.

Why v3: the final concept is a cutaway diorama (open pavilions with visible interiors, ivy over stone, one
global light), while v2 captions never said the light was dusk, so the trigger word absorbed the sunset.
Every dusk caption now names its lighting and colours, so the trigger word carries drawing manner,
architecture and detail only and the time of day stays in the tags. Images are never recoloured.

Usage (from the repo root):
    python3 services/asset-generator/scripts/build_style_dataset_v3.py [--out DIR]
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import replace
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_style_dataset_v2 import NEW_REFS, REPO_ROOT, collect_specs  # noqa: E402
from core.style_dataset import CropSpec, build_style_dataset  # noqa: E402

DEFAULT_OUT = REPO_ROOT / "assets" / "work" / "style_dataset_v3"
HUB = "ref_11.png"
CUTAWAY = "2.5d game hub diorama, architectural cutaway view with open glass walls and visible detailed interior"
DUSK = "sunset lighting, dusk atmosphere, purple and dark blue shadows, orange sky, glowing warm windows"

# (id, box in the 1672x941 hub screen, subject); the top and bottom UI bars are always cropped away.
HUB_CROPS: list[tuple[str, tuple[int, int, int, int], str]] = [
    ("hub_full", (0, 75, 1672, 805),
     f"sprawling meteorological campus, {CUTAWAY}, tiered stone plaza with a globe fountain, staff and students"),
    ("hub_maps_pavilion", (0, 370, 560, 700),
     f"glass pavilion with weather map screens, cyclones on a wall display, staff at desks, {CUTAWAY}"),
    ("hub_archive", (930, 460, 1200, 690),
     f"archive room with bookshelves, a globe and wall maps seen through the open front, ivy on stone, {CUTAWAY}"),
    ("hub_aerology", (1060, 200, 1440, 450),
     f"aerology station with a weather balloon in a glass bay, instruments and staff, {CUTAWAY}"),
    ("hub_radar", (150, 80, 560, 330),
     "white radar dome on a stone hill among dark spruces, a lattice tower with red beacons, ivy on the walls"),
    ("hub_tournament", (1250, 430, 1672, 700),
     f"tournament hall with a golden trophy, red and blue weather banners and a seated crowd, {CUTAWAY}"),
    ("hub_main_building", (480, 290, 1180, 800),
     "cream stone main building with a dome, balcony and warm lit windows, wide stairs to a globe fountain, ivy"),
]


def collect_v3() -> list[CropSpec]:
    dusk_ids = {"screen_hub_left", "screen_hub_centre", "screen_hub_right"}
    specs = [replace(s, caption=f"{s.caption}, {DUSK}") if s.id in dusk_ids else s for s in collect_specs()]
    for name, box, subject in HUB_CROPS:
        specs.append(CropSpec(name, NEW_REFS / HUB, f"{subject}, {DUSK}", box=box))
    return specs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    report = build_style_dataset(collect_v3(), args.out)
    (args.out / "dataset-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "sources"}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
