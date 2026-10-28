#!/usr/bin/env python3
"""Build the clean environment-only 26063 world-style v4 seed dataset.

v4 intentionally does not inherit v2/v3. It selects only complete environment
scenes, uses a scoped trigger word, adds no global colour/lighting tail,
performs no flips/recolouring and uses nearest-neighbour only when a source
must be downscaled.

The reproducible Git seed contains only checked-in references. A server-local
hub screenshot from the older v2/v3 workflow can be added explicitly with
--include-local-hub, but is never an implicit dependency.
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
LOCAL_V2_REFS = REPO_ROOT / "assets" / "work" / "style_refs_v2"
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

# Optional server-local source inherited from the v2/v3 experiment. It is not
# checked into Git. At most three contextual crops are accepted from it.
LOCAL_HUB_SOURCE = LOCAL_V2_REFS / "ref_11.png"
LOCAL_HUB_SPECS: list[WorldSpec] = [
    WorldSpec(
        "hub_context_full",
        LOCAL_HUB_SOURCE,
        "wide 2.5d campus hub at sunset, tiered granite plaza, several compact scientific buildings and open working pavilions, staff traces, spruces, globe fountain and one coherent dusk light",
        "local/style_refs_v2/ref_11.png",
        "exterior",
        "golden_hour",
        "autumn",
        "partly_cloudy",
        box=(0, 75, 1672, 805),
    ),
    WorldSpec(
        "hub_context_maps_pavilion",
        LOCAL_HUB_SOURCE,
        "medium contextual view of a glass-sided maps pavilion inside the campus, staff desks and wall charts visible through the open front, granite terrace, vegetation and the surrounding hub still visible",
        "local/style_refs_v2/ref_11.png",
        "interior_in_context",
        "golden_hour",
        "autumn",
        "partly_cloudy",
        box=(0, 370, 560, 700),
    ),
    WorldSpec(
        "hub_context_archive",
        LOCAL_HUB_SOURCE,
        "medium contextual view of the campus archive room with bookshelves, globe and working materials visible through an open front, ivy and stone exterior tied to the surrounding dusk campus",
        "local/style_refs_v2/ref_11.png",
        "interior_in_context",
        "golden_hour",
        "autumn",
        "partly_cloudy",
        box=(930, 460, 1200, 690),
    ),
]


# Owner-supplied full frames dropped into the local v3 folder (not checked into Git). Each is one source lineage.
USER_BATCH_DIR = REPO_ROOT / "assets" / "work" / "style_dataset_v3"
USER_BATCH_SPECS: list[WorldSpec] = [
    WorldSpec(
        "user_campus_golden_autumn",
        USER_BATCH_DIR / "Golden-Hour Seaside Synoptic Campus-3.png",
        "wide autumn exterior of a meteorological campus on the Gulf of Finland at golden hour, cream classical main building with a green roof and a white radar dome, lattice mast with red beacons, orange maples and dark spruces, an instrument field with shelters, wet reflective stone paving, a wide bay with a distant city skyline and a spire, layered orange and violet clouds, warm lit windows and street lamps",
        "local/style_dataset_v3/Golden-Hour Seaside Synoptic Campus-3.png",
        "exterior",
        "golden_hour",
        "autumn",
        "partly_cloudy",
    ),
    WorldSpec(
        "user_rooftop_balloon_night_snow",
        USER_BATCH_DIR / "Snowy Rooftop Balloon Launch-2.png",
        "winter night on the snowy roof terrace of a weather station, a staff member releasing a large pale weather balloon, a louvered instrument shelter on a tripod, equipment cases and a laptop, a lit cabin interior with monitors, a small orange cat, a frozen river with a bridge and a lit city skyline with domes under a starry sky with a moon and thin clouds",
        "local/style_dataset_v3/Snowy Rooftop Balloon Launch-2.png",
        "exterior",
        "night",
        "winter",
        "partly_cloudy",
    ),
    WorldSpec(
        "user_winter_station_dawn_balloon",
        USER_BATCH_DIR / "Winter Weather Station at Dawn-1.png",
        "winter dawn on a weather station rooftop, a staff member in a dark jacket holding a large weather balloon, a louvered shelter and mast instruments, snow-covered equipment cases, a lit wooden cabin with a window sign, an orange cat in the doorway, a river bridge and a city skyline with domes under a violet and pink sky",
        "local/style_dataset_v3/Winter Weather Station at Dawn-1.png",
        "exterior",
        "dawn",
        "winter",
        "partly_cloudy",
    ),
]


FRAMES_DIR = REPO_ROOT / "assets" / "work" / "world_frames"
_ALLEY = "autumn campus alley with white birches and orange maples, black iron street lamps, wooden benches, a stone balustrade and stairs, dark spruces, a cream building with a green roof and a white radar dome behind the trees, a bay with a distant city skyline and a dome, wet reflective stone paving with fallen leaves, no people"
_SHORE = "rocky Gulf of Finland shore in autumn, mossy granite boulders and orange heather, pines and birches, a lone instrument mast with anemometer and sensor boxes on a stone base, breaking waves and spray, a low city skyline with a dome and spires on the horizon, no people"
FRAME_SPECS: list[WorldSpec] = [
    WorldSpec("world_21_alley_sunset", FRAMES_DIR / "world_21_alley_sunset.png",
              f"{_ALLEY}, low sun at the horizon, orange and violet layered clouds, lit lamps and warm windows",
              "local/world_frames/world_21_alley_sunset.png", "exterior", "golden_hour", "autumn", "partly_cloudy"),
    WorldSpec("world_21_alley_afternoon", FRAMES_DIR / "world_21_alley_afternoon.png",
              f"{_ALLEY}, late afternoon warm sunlight through the foliage, blue sky with pink and gold clouds",
              "local/world_frames/world_21_alley_afternoon.png", "exterior", "late_afternoon", "autumn", "partly_cloudy"),
    WorldSpec("world_21_alley_day", FRAMES_DIR / "world_21_alley_day.png",
              f"{_ALLEY}, bright daylight, deep blue sky with white cumulus clouds",
              "local/world_frames/world_21_alley_day.png", "exterior", "day", "autumn", "partly_cloudy"),
    WorldSpec("world_22_shore_storm", FRAMES_DIR / "world_22_shore_storm.png",
              f"{_SHORE}, heavy dark storm clouds with a bright gap of low sun on the right, rough dark water",
              "local/world_frames/world_22_shore_storm.png", "exterior", "late_afternoon", "autumn", "storm_clouds"),
    WorldSpec("world_22_shore_golden", FRAMES_DIR / "world_22_shore_golden.png",
              f"{_SHORE}, large sunlit cumulus clouds with golden edges, warm low light on the rocks, wind-driven waves",
              "local/world_frames/world_22_shore_golden.png", "exterior", "golden_hour", "autumn", "windy_cumulus"),
    WorldSpec("world_22_shore_skyline", FRAMES_DIR / "world_22_shore_skyline.png",
              f"{_SHORE}, dark clouds with crepuscular rays over the city, a gull above the mast, a detailed skyline across the water",
              "local/world_frames/world_22_shore_skyline.png", "exterior", "late_afternoon", "autumn", "storm_clouds"),
]
USER_BATCH_SPECS.extend(FRAME_SPECS)
_WINTER = "snow-covered meteorological campus on the Gulf of Finland, cream classical main building with a snowy green roof, a white radar dome and a red-and-white lattice mast behind it, snowy spruces and bare white birches, stone stairs and balustrades with snow caps, iron lamps, a wooden bench, an observation field with white louvered shelters and a wind mast behind a fence, a frozen bay with ice floes and a distant city skyline with spires, no people"
FRAME_SPECS.extend([
    WorldSpec("world_04_winter_sunset", FRAMES_DIR / "world_04_winter_sunset.png",
              f"{_WINTER}, low orange sun on the horizon, pink and violet snow shadows, warm lit windows and lit lamps",
              "local/world_frames/world_04_winter_sunset.png", "exterior", "golden_hour", "winter", "clear"),
    WorldSpec("world_04_winter_day", FRAMES_DIR / "world_04_winter_day.png",
              f"{_WINTER}, bright clear daylight, deep blue sky with a few thin clouds, crisp cool shadows on the snow",
              "local/world_frames/world_04_winter_day.png", "exterior", "day", "winter", "clear"),
    WorldSpec("world_04_winter_afternoon", FRAMES_DIR / "world_04_winter_afternoon.png",
              f"{_WINTER}, soft late afternoon light, peach and gold clouds in a pale blue sky, warm light on the facade",
              "local/world_frames/world_04_winter_afternoon.png", "exterior", "late_afternoon", "winter", "partly_cloudy"),
])
USER_BATCH_SPECS.extend(FRAME_SPECS[-3:])
_RAIN = "campus after rain on the Gulf of Finland, cream classical main building with a green roof, a white radar dome and a red-and-white lattice mast behind it, birches and dark spruces, stone stairs and balustrades, iron lamps, a wooden bench, an observation field with white louvered shelters and a wind mast, a grey bay with a distant city skyline and spires, glossy wet stone paving with reflections and puddles, falling rain streaks, no people"
FRAME_SPECS.extend([
    WorldSpec("world_02_rain_day", FRAMES_DIR / "world_02_rain_day.png",
              f"{_RAIN}, flat grey overcast daylight, green summer foliage, lit lamps already on, heavy rain clouds",
              "local/world_frames/world_02_rain_day.png", "exterior", "day", "summer", "rain"),
    WorldSpec("world_02_rain_autumn_evening", FRAMES_DIR / "world_02_rain_autumn_evening.png",
              f"{_RAIN}, dark evening, orange and red autumn foliage, warm glowing windows and lamps, a thin pale band of light on the horizon",
              "local/world_frames/world_02_rain_autumn_evening.png", "exterior", "dusk", "autumn", "rain"),
    WorldSpec("world_02_rain_spring_dusk", FRAMES_DIR / "world_02_rain_spring_dusk.png",
              f"{_RAIN}, dusk with a glow under the clouds, fresh green birch leaves, white and lilac blossoms in the beds, lit windows, city lights reflected in the water",
              "local/world_frames/world_02_rain_spring_dusk.png", "exterior", "dusk", "spring", "rain"),
])
USER_BATCH_SPECS.extend(FRAME_SPECS[-3:])


def collect_specs(*, include_local_hub: bool = False, include_user_batch: bool = False) -> list[WorldSpec]:
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
    specs.extend(MASTER_SPECS)
    if include_local_hub:
        if not LOCAL_HUB_SOURCE.is_file():
            raise FileNotFoundError(
                f"--include-local-hub requested, but server-local source is missing: {LOCAL_HUB_SOURCE}"
            )
        specs.extend(LOCAL_HUB_SPECS)
    if include_user_batch:
        missing = [str(spec.path) for spec in USER_BATCH_SPECS if not spec.path.is_file()]
        if missing:
            raise FileNotFoundError(f"--include-user-batch requested, but local frames are missing: {missing}")
        specs.extend(USER_BATCH_SPECS)
    return specs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--max-side", type=int, default=2048)
    parser.add_argument("--include-local-hub", action="store_true",
                        help="Add up to three crops from local assets/work/style_refs_v2/ref_11.png")
    parser.add_argument("--include-user-batch", action="store_true",
                        help="Add the owner's full frames from local assets/work/style_dataset_v3 and assets/work/world_frames")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    specs = collect_specs(include_local_hub=args.include_local_hub, include_user_batch=args.include_user_batch)
    if args.validate_only:
        coverage = inspect_world_specs(specs)
        print(json.dumps({"status": "valid", "images": len(specs), "coverage": coverage}, indent=2, ensure_ascii=False))
        return 0

    report = build_world_style_dataset(specs, args.out, max_side=args.max_side)
    report["includes_server_local_hub"] = args.include_local_hub
    report["includes_user_batch"] = args.include_user_batch
    (args.out / "dataset-report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
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
