#!/usr/bin/env python3
"""Builds the v2 style-LoRA dataset (1024px squares) from the owner's references.

Why v2: v1 trained at 512px with a random square window of every wide scene (the caption no longer matched
the pixels), on a set where 17 of 45 images were clothing and items on white backgrounds, with 18-word
captions and no dusk or night looks. v2 keeps whole images (train with aspect-ratio buckets), drops most
white-background items, adds the owner's newer game screens (hub at sunset, hero room, arenas) and richer
captions.

Usage (from the repo root):
    python3 services/asset-generator/scripts/build_style_dataset_v2.py [--out DIR]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_DIR.parents[1]
sys.path.insert(0, str(SERVICE_DIR))

from core.style_dataset import CropSpec, build_style_dataset  # noqa: E402

V1_MANIFEST = REPO_ROOT / "assets" / "manifests" / "style_lora_dataset.json"
NEW_REFS = REPO_ROOT / "assets" / "work" / "style_refs_v2"
DEFAULT_OUT = REPO_ROOT / "assets" / "work" / "style_dataset_v2"

# v1 reference ids kept in v2 (whole images; the trainer buckets them by aspect ratio).
V1_SELECTION: dict[str, int] = {
    "synopsis_ref_campus_courtyard_overview": 1,
    "synopsis_ref_scene_campus_sunset": 1,
    "synopsis_ref_scene_campus_dawn_morning": 1,
    "synopsis_ref_scene_campus_night_twilight": 1,
    "synopsis_ref_scene_autumn_seaside_observatory": 1,
    "synopsis_ref_scene_coastal_weather_campus": 1,
    "synopsis_ref_scene_autumn_waterside_observatory": 1,
    "synopsis_ref_scene_campus_day_clear": 1,
    "synopsis_ref_scene_campus_overcast_stratus": 1,
    "synopsis_ref_scene_campus_meteo_garden": 1,
    "synopsis_ref_bld_weather_station_lab": 1,
    "synopsis_ref_bld_doppler_radar_dome": 1,
    "synopsis_ref_bld_wind_mast_anemometer": 1,
    "synopsis_ref_bld_main_observatory": 1,
    "synopsis_ref_bld_stevenson_screen_shelter": 1,
    "synopsis_ref_bld_aerological_pavilion": 1,
    "synopsis_ref_portrait_vera_pavlovna": 1,
    "synopsis_ref_portrait_semen_petrovich": 1,
    "synopsis_ref_portrait_technician_observer": 1,
    "synopsis_ref_portrait_distinguished_meteorologist": 1,
    "synopsis_ref_portrait_campus_cat": 1,
    "synopsis_ref_fauna_hooded_crow": 1,
    "synopsis_ref_fauna_red_squirrel": 1,
    "synopsis_ref_fauna_sparrow_perched": 1,
    "synopsis_ref_fauna_hedgehog_autumn": 1,
    "synopsis_ref_item_uniform_jacket_dark": 1,
    "synopsis_ref_item_synoptic_wooden_pointer": 1,
    "synopsis_ref_item_radiosonde_transmitter": 1,
    "synopsis_ref_item_anemometer_handheld": 1,
}

# Richer captions for the strongest v1 scenes (lighting, colour, atmosphere, concrete objects).
V1_CAPTION_OVERRIDES: dict[str, str] = {
    "synopsis_ref_scene_campus_sunset": (
        "meteorological campus at sunset, orange and violet sky with layered clouds, many warm glowing windows, "
        "a radar dome silhouette, long reflections in the calm bay, cool deep shadows on the grass"
    ),
    "synopsis_ref_scene_campus_night_twilight": (
        "meteorological campus at deep twilight, dark indigo sky with stars, warm amber light pouring from the "
        "windows, glowing street lamps, cool blue shadows on the paths, a lit radar dome"
    ),
    "synopsis_ref_scene_autumn_seaside_observatory": (
        "autumn seaside observatory campus, golden and orange birch and maple trees, a cream-yellow main building "
        "with a green roof and a small dome, dark green spruces, a blue bay with a granite pier and a boat, a "
        "city skyline with a spire across the water, bright blue sky with white cumulus clouds, weather masts"
    ),
    "synopsis_ref_scene_coastal_weather_campus": (
        "coastal weather campus in autumn, a radar dome on a lattice tower, cream station pavilions with green "
        "roofs, orange foliage, a stone embankment reflected in calm blue water, white instrument shelters"
    ),
    "synopsis_ref_scene_autumn_waterside_observatory": (
        "waterside observatory campus in autumn, a long granite embankment with a wooden pier and a red-white "
        "boat, rows of weather instruments on a lawn, orange and yellow trees, clouds reflected in the water"
    ),
}

# Crops of the owner's game screens: (id, file, box in the 1672x941 image, caption).
SCREEN_CROPS: list[tuple[str, str, tuple[int, int, int, int], str]] = [
    ("screen_hub_left", "ref_11.png", (0, 60, 760, 820),
     "campus hub at sunset, a white radar dome on a lattice tower, a glass pavilion with wall maps and staff at "
     "desks, dark green spruces, glowing lamps, a purple and orange sunset sky with distant blue mountains, "
     "small dark label plates"),
    ("screen_hub_centre", "ref_11.png", (480, 290, 1180, 800),
     "the cream-yellow main building with a green dome and warm lit windows at dusk, wide stairs down to a "
     "stone globe fountain in a paved plaza, students with backpacks walking, street lamps, spruces"),
    ("screen_hub_right", "ref_11.png", (940, 200, 1672, 780),
     "right side of the campus at dusk, a glass aerology pavilion with a white weather balloon, a red brick "
     "archive with bookshelves visible inside, a tournament hall with red and blue banners, ivy on the walls, "
     "city lights across the bay"),
    ("screen_hero_room", "ref_08.png", (0, 130, 760, 941),
     "cosy cluttered meteorologist workroom with warm lamp light, a boy hero with brown hair, a blue hoodie and "
     "a backpack holding a tablet, a corgi with a blue bandana, a blue tit on the shelf, stacks of books, wall "
     "maps, plants, small interface slots"),
    ("screen_arena", "ref_09.png", (380, 60, 1290, 700),
     "grand arena at sunset with a central stage and a glowing globe emblem, a weather map table with fronts "
     "and isobars, spectators with glow sticks, hanging banners, mountains and a lake in the background"),
    ("screen_desk_girl", "ref_10.png", (0, 380, 560, 941),
     "a cheerful girl with a ponytail in a blue hoodie cheering at a desk with a laptop, a coffee mug with a "
     "cloud logo, pencils, stacked books, an orange cat sleeping, warm cosy evening light"),
    ("screen_desk_lamp", "ref_10.png", (1200, 560, 1672, 941),
     "a cosy evening desk with a warm lamp, monitors showing a radar map, potted plants and books in a "
     "golden glow"),
    ("screen_stage", "ref_07.png", (300, 480, 1100, 941),
     "tournament hall stage with a golden trophy on a podium, a cheering crowd in silhouette with team flags, "
     "stage lights, cameras, blue and red banners"),
]


def collect_specs() -> list[CropSpec]:
    manifest = json.loads(V1_MANIFEST.read_text(encoding="utf-8"))
    by_id = {entry["id"]: entry for entry in manifest["assets"]}
    specs: list[CropSpec] = []
    for asset_id, crops in V1_SELECTION.items():
        entry = by_id[asset_id]
        caption = V1_CAPTION_OVERRIDES.get(asset_id, entry["caption"])
        specs.append(CropSpec(asset_id.removeprefix("synopsis_ref_"), REPO_ROOT / entry["path"], caption, crops=crops))
    for name, file, box, caption in SCREEN_CROPS:
        specs.append(CropSpec(name, NEW_REFS / file, caption, box=box))
    return specs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    report = build_style_dataset(collect_specs(), args.out)
    (args.out / "dataset-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "sources"}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
