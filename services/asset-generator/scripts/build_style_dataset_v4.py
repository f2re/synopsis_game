#!/usr/bin/env python3
"""Build the clean environment-only 26063 world-style v4 seed dataset.

v4 intentionally does not inherit v2/v3. It selects only complete environment
scenes and a small number of contextual hub crops, uses a scoped trigger word,
adds no global colour/lighting tail, performs no flips/recolouring and uses
nearest-neighbour only when a source must be downscaled.

The checked-in references currently form a small seed set. The report marks it
as such until at least 80 genuinely distinct compositions are present.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_DIR.parents[1]
sys.path.insert(0, str(SERVICE_DIR))

from core.world_style_dataset import (  # noqa: E402
    WorldSpec,
    build_world_style_dataset,
    inspect_world_specs,
)

MANIFEST = REPO_ROOT / "assets" / "manifests" / "style_lora_dataset.json"
V2_REFS = REPO_ROOT / "assets" / "work" / "style_refs_v2"
MASTER = REPO_ROOT / "design" / "pixel-art" / "references" / "master_26063"
DEFAULT_OUT = REPO_ROOT / "assets" / "work" / "style_dataset_v4_world"

# Only full world/environment assets from the reviewed v1 manifest. Isolated
# buildings, portraits, fauna and items are excluded even if they are approved.
MANIFEST_WORLD: dict[str, dict[str, str]] = {
    "synopsis_ref_campus_courtyard_overview": {
        "caption": "daytime campus courtyard, compact scientific pavilions, gravel paths, lawn and meteorological observation masts under a low cloudy north-west sky",
        "category": "exterior",
        "lighting": "day",
        "season": "summer",
        "weather": "cloudy",
    },
    "synopsis_ref_scene_campus_sunset": {
        "caption": "wide meteorological campus beside the Gulf of Finland at sunset, orange-violet layered sky, cool shadows, warm occupied windows and a radar dome in the distance",
        "category": "exterior",
        "lighting": "golden_hour",
        "season": "summer",
        "weather": "partly_cloudy",
    },
    "synopsis_ref_scene_campus_dawn_morning": {
        "caption": "wide meteorological research campus at early morning, low Baltic horizon, cool blue ambient light, soft low sun, compact buildings and quiet paths",
        "category": "exterior",
        "lighting": "dawn",
        "season": "summer",
        "weather": "fair",
    },
    "synopsis_ref_scene_campus_night_twilight": {
        "caption": "meteorological campus at deep civil twilight, indigo sky, cool paths and vegetation, restrained amber windows and street lamps, radar dome visible against the sky",
        "category": "exterior",
        "lighting": "night",
        "season": "summer",
        "weather": "fair",
    },
    "synopsis_ref_scene_autumn_seaside_observatory": {
        "caption": "autumn seaside meteorological campus, compact cream building with green roof, birch and rowan in orange foliage, granite shore, blue bay and low city skyline across the water",
        "category": "exterior",
        "lighting": "day",
        "season": "autumn",
        "weather": "fair",
    },
    "synopsis_ref_scene_coastal_weather_campus": {
        "caption": "coastal weather campus in autumn, practical station pavilions and radar tower, orange foliage, granite embankment, calm blue water and white observation instruments",
        "category": "exterior",
        "lighting": "day",
        "season": "autumn",
        "weather": "fair",
    },
    "synopsis_ref_scene_autumn_waterside_observatory": {
        "caption": "waterside observatory campus in autumn, granite embankment and wooden pier, meteorological instruments on a lawn, yellow-orange birches and layered clouds reflected in the bay",
        "category": "exterior",
        "lighting": "day",
        "season": "autumn",
        "weather": "partly_cloudy",
    },
    "synopsis_ref_scene_campus_day_clear": {
        "caption": "wide daytime meteorological campus under a clear northern sky, compact research buildings, paths, lawn, birch and pine, low horizon and restrained natural daylight",
        "category": "exterior",
        "lighting": "day",
        "season": "summer",
        "weather": "clear",
    },
    "synopsis_ref_scene_campus_overcast_stratus": {
        "caption": "wide meteorological campus under uniform low stratus, soft flat overcast daylight, subdued cool shadows, compact buildings, wet-looking paths and north-west vegetation",
        "category": "exterior",
        "lighting": "day",
        "season": "autumn",
        "weather": "overcast_stratus",
    },
    "synopsis_ref_scene_campus_meteo_garden": {
        "caption": "meteorological observation garden integrated into the campus, instrument shelters and masts on grass, practical paths and fence, birch and pine, ordinary daylight",
        "category": "observation_field",
        "lighting": "day",
        "season": "summer",
        "weather": "fair",
    },
}

MASTER_SPECS: list[WorldSpec] = [
    WorldSpec(
        "master_campus_exterior_radar_summer",
        MASTER / "ref_campus_exterior_radar_summer.jpg",
        "wide summer exterior of a compact meteorological research campus on granite terrain near the Gulf of Finland, radar building, stairs, birch and pine, blue sky and working scientific atmosphere",
        "master/ref_campus_exterior_radar_summer.jpg",
        "exterior",
        "day",
        "summer",
        "fair",
    ),
    WorldSpec(
        "master_meteo_playground_summer",
        MASTER / "ref_meteo_playground_summer.jpg",
        "wide Russian meteorological observation field inside the campus, louvered shelter, precipitation gauge and wind mast, grass, low fence, compact campus buildings and trees in the background",
        "master/ref_meteo_playground_summer.jpg",
        "observation_field",
        "day",
        "summer",
        "fair",
    ),
    WorldSpec(
        "master_office_interior_panoramic",
        MASTER / "ref_office_interior_panoramic.jpg",
        "panoramic working synoptic office, wooden desks and monitors, scientific instruments, books and papers, large window toward the Gulf of Finland, lived-in professional interior with restrained warm task lighting",
        "master/ref_office_interior_panoramic.jpg",
        "interior",
        "day",
        "summer",
        "fair",
    ),
]

# At most three samples from one screenshot lineage. These retain environment
# context; no isolated facade/object-sheet crops are admitted.
HUB_SOURCE = V2_REFS / "ref_11.png"
HUB_SPECS: list[WorldSpec] = [
    WorldSpec(
        "hub_context_full",
        HUB_SOURCE,
        "wide 2.5d campus hub at sunset, tiered granite plaza, several compact scientific buildings and open working pavilions, staff traces, spruces, globe fountain and one coherent dusk light",
        "style_refs_v2/ref_11.png",
        "exterior",
        "golden_hour",
        "autumn",
        "partly_cloudy",
        box=(0, 75, 1672, 805),
    ),
    WorldSpec(
        "hub_context_maps_pavilion",
        HUB_SOURCE,
        "medium contextual view of a glass-sided maps pavilion inside the campus, staff desks and wall charts visible through the open front, granite terrace, vegetation and the surrounding hub still visible",
        "style_refs_v2/ref_11.png",
        "interior_in_context",
        "golden_hour",
        "autumn",
        "partly_cloudy",
        box=(0, 370, 560, 700),
    ),
    WorldSpec(
        "hub_context_archive",
        HUB_SOURCE,
        "medium contextual view of the campus archive room with bookshelves, globe and working materials visible through an open front, ivy and stone exterior tied to the surrounding dusk campus",
        "style_refs_v2/ref_11.png",
        "interior_in_context",
        "golden_hour",
        "autumn",
        "partly_cloudy",
        box=(930, 460, 1200, 690),
    ),
]


def collect_specs() -> list[WorldSpec]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_id = {entry["id"]: entry for entry in manifest["assets"]}
    specs: list[WorldSpec] = []
    for asset_id, tags in MANIFEST_WORLD.items():
        entry = by_id.get(asset_id)
        if entry is None:
            raise KeyError(f"missing reviewed manifest entry: {asset_id}")
        specs.append(
            WorldSpec(
                id=asset_id.removeprefix("synopsis_ref_"),
                path=REPO_ROOT / entry["path"],
                caption=tags["caption"],
                lineage=entry["path"],
                category=tags["category"],
                lighting=tags["lighting"],
                season=tags["season"],
                weather=tags["weather"],
            )
        )
    return specs + MASTER_SPECS + HUB_SPECS


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--max-side", type=int, default=2048)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    specs = collect_specs()
    if args.validate_only:
        coverage = inspect_world_specs(specs)
        print(json.dumps({"status": "valid", "images": len(specs), "coverage": coverage}, indent=2, ensure_ascii=False))
        return 0

    report = build_world_style_dataset(specs, args.out, max_side=args.max_side)
    print(
        json.dumps(
            {k: v for k, v in report.items() if k not in {"sources", "coverage"}},
            indent=2,
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
