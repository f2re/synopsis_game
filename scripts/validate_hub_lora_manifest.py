#!/usr/bin/env python3
"""Validate the canonical 30-image hub LoRA source-generation manifest."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = REPO_ROOT / "training/lora/hub/manifest.v1.json"
EXPECTED_SCENES = {
    "map_pavilion", "archive", "aerology_balloon", "radar_hill", "tournament_hall",
    "main_building_fountain", "terraces_cat", "river_valley_bridge", "full_diorama", "hero_workroom",
}
EXPECTED_ENUMS = {
    "time_of_day": {"dawn", "day", "golden_hour", "civil_twilight", "night"},
    "weather": {"clear", "overcast", "rain", "thunderstorm", "snow", "windy"},
    "season": {"spring", "summer", "autumn", "winter"},
    "split": {"train", "validation"},
}
BANNED_NAMED_STYLE_REFERENCES = {"eastward", "sea of stars", "celeste", "owlboy"}


class ManifestError(ValueError):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ManifestError(message)


def _duplicates(values: list[str]) -> set[str]:
    counts = Counter(values)
    return {value for value, count in counts.items() if count > 1}


def load_and_validate(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    _require(data.get("schema_version") == 1, "schema_version must be 1")
    _require(data.get("dataset") == "synopsis_hub_diorama", "unexpected dataset")
    _require(data.get("adapter") == "hub", "adapter must be hub")
    _require(data.get("trigger") == "synopsis_hub_diorama", "unexpected trigger")
    _require(data.get("logical_grid") == [480, 270], "logical_grid must be [480, 270]")

    target = data.get("target_render", {})
    _require(target.get("min_long_edge", 0) >= 1024, "target min_long_edge must be >= 1024")
    _require(target.get("scaling") == "native_or_integer_nearest", "target scaling must be native_or_integer_nearest")

    contract = data.get("generation_contract", {})
    _require(contract.get("images_per_job") == 1, "images_per_job must be 1")
    _require(contract.get("collage") is False, "collage must be false")
    _require(contract.get("allow_flip") is False, "allow_flip must be false")
    _require(contract.get("allow_recolour_clone") is False, "allow_recolour_clone must be false")
    _require(contract.get("allow_smooth_upscale") is False, "allow_smooth_upscale must be false")
    _require(contract.get("no_text") is True, "no_text must be true")
    _require(contract.get("no_ui") is True, "no_ui must be true")

    enums = data.get("enums", {})
    for key, expected in EXPECTED_ENUMS.items():
        _require(set(enums.get(key, [])) == expected, f"enum {key} is incomplete or changed")

    style = data.get("style_contract", {})
    _require(style.get("pixel_scale") == "fixed_logical_pixel_size", "pixel scale contract changed")
    _require(style.get("presentation") == "nearest_neighbour", "presentation must be nearest_neighbour")
    _require(style.get("composition") == "60/30/10", "composition must be 60/30/10")
    _require(style.get("local_surface_shades") == [3, 5], "local surface shades must be [3, 5]")
    _require(style.get("min_human_traces", 0) >= 3, "min_human_traces must be >= 3")

    scenes = data.get("scenes", {})
    _require(set(scenes) == EXPECTED_SCENES, "scene set must contain exactly the 10 canonical hub scenes")
    for scene_id, scene_prompt in scenes.items():
        _require(isinstance(scene_prompt, str) and len(scene_prompt.strip()) >= 30, f"{scene_id}: scene prompt too short")

    samples = data.get("samples", [])
    _require(len(samples) == 30, f"expected exactly 30 samples, got {len(samples)}")
    ids = [sample.get("id", "") for sample in samples]
    lineages = [sample.get("lineage_id", "") for sample in samples]
    outputs = [sample.get("output_path", "") for sample in samples]
    _require(not _duplicates(ids), f"duplicate sample ids: {sorted(_duplicates(ids))}")
    _require(not _duplicates(lineages), f"duplicate lineage ids: {sorted(_duplicates(lineages))}")
    _require(not _duplicates(outputs), f"duplicate output paths: {sorted(_duplicates(outputs))}")

    per_scene: dict[str, list[dict[str, Any]]] = defaultdict(list)
    lineage_splits: dict[str, set[str]] = defaultdict(set)
    for sample in samples:
        sample_id = sample.get("id", "<missing>")
        scene_id = sample.get("scene_id")
        split = sample.get("split")
        _require(scene_id in EXPECTED_SCENES, f"{sample_id}: unknown scene_id {scene_id!r}")
        _require(split in EXPECTED_ENUMS["split"], f"{sample_id}: invalid split {split!r}")
        for key in ("time_of_day", "weather", "season"):
            _require(sample.get(key) in EXPECTED_ENUMS[key], f"{sample_id}: invalid {key}={sample.get(key)!r}")
        _require(sample.get("independent_render") is True, f"{sample_id}: independent_render must be true")
        _require(sample.get("num_images") == 1, f"{sample_id}: num_images must be 1")
        _require(sample.get("min_long_edge", 0) >= 1024, f"{sample_id}: min_long_edge must be >= 1024")
        output_path = sample.get("output_path", "")
        _require(output_path.startswith("datasets/lora/hub/source/") and output_path.endswith(".png"), f"{sample_id}: output_path must be a PNG under datasets/lora/hub/source/")
        lineage = sample.get("lineage_id", "")
        _require(lineage.startswith("hub-src-"), f"{sample_id}: invalid lineage_id")
        per_scene[scene_id].append(sample)
        lineage_splits[lineage].add(split)

    for scene_id in sorted(EXPECTED_SCENES):
        scene_samples = per_scene[scene_id]
        _require(len(scene_samples) == 3, f"{scene_id}: expected 3 samples, got {len(scene_samples)}")
        split_counts = Counter(sample["split"] for sample in scene_samples)
        _require(split_counts == Counter({"train": 2, "validation": 1}), f"{scene_id}: expected 2 train + 1 validation, got {dict(split_counts)}")

    leaked = {lineage: splits for lineage, splits in lineage_splits.items() if len(splits) > 1}
    _require(not leaked, f"source-lineage leakage across splits: {leaked}")

    all_prompt_text = "\n".join([str(data.get("prompt_prefix", "")), str(data.get("negative_prompt", "")), *[str(value) for value in scenes.values()]]).lower()
    named_refs = sorted(token for token in BANNED_NAMED_STYLE_REFERENCES if token in all_prompt_text)
    _require(not named_refs, f"named commercial style references are forbidden: {named_refs}")

    prefix = str(data.get("prompt_prefix", "")).lower()
    _require("no collage" in prefix, "prompt_prefix must explicitly forbid collage")
    _require("no text" in prefix, "prompt_prefix must explicitly forbid text")
    _require("480x270" in prefix, "prompt_prefix must name the 480x270 logical grid")
    _require("consistent display size" in prefix, "prompt_prefix must lock a consistent logical pixel size")

    counts = Counter(sample["split"] for sample in samples)
    _require(counts == Counter({"train": 20, "validation": 10}), f"unexpected split totals: {dict(counts)}")
    return data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST, help="Path to manifest.v1.json")
    args = parser.parse_args()
    manifest_path = args.manifest
    if not manifest_path.is_absolute():
        manifest_path = (REPO_ROOT / manifest_path).resolve()
    try:
        data = load_and_validate(manifest_path)
    except (OSError, json.JSONDecodeError, ManifestError) as exc:
        print(f"ERROR: {exc}")
        return 1
    counts = Counter(sample["split"] for sample in data["samples"])
    print("OK: synopsis_hub_diorama manifest — " f"{len(data['samples'])} independent samples, " f"{counts['train']} train, {counts['validation']} validation, " "1 prompt -> 1 image")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
