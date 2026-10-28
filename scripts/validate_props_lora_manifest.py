#!/usr/bin/env python3
"""Validate the canonical props LoRA source-generation manifest."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = REPO_ROOT / "training/lora/props/manifest.v1.json"
BANNED_NAMED_STYLE_REFERENCES = {"eastward", "sea of stars", "celeste", "owlboy"}
EXPECTED_ENUMS = {
    "asset_type": {"physical_prop", "icon", "frame"},
    "view": {"front", "three_quarter", "side", "top"},
    "background": {"neutral_light_gray"},
    "split": {"train", "validation"},
}


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
    _require(data.get("dataset") == "synopsis_pixel_prop", "unexpected dataset")
    _require(data.get("adapter") == "props", "adapter must be props")
    _require(data.get("trigger") == "synopsis_pixel_prop", "unexpected trigger")

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
    _require(contract.get("one_object_per_image") is True, "one_object_per_image must be true")
    _require(contract.get("background") == "neutral_light_gray", "background contract must be neutral_light_gray")

    enums = data.get("enums", {})
    for key, expected in EXPECTED_ENUMS.items():
        _require(set(enums.get(key, [])) == expected, f"enum {key} is incomplete or changed")

    style = data.get("style_contract", {})
    _require(style.get("pixel_scale") == "fixed_logical_pixel_size", "pixel scale contract changed")
    _require(style.get("presentation") == "nearest_neighbour", "presentation must be nearest_neighbour")
    _require(style.get("local_surface_shades") == [3, 5], "local surface shades must be [3, 5]")
    _require(style.get("margin_policy") == "stable_clear_margin", "margin policy changed")

    subjects = data.get("subjects", {})
    _require(len(subjects) == 36, f"expected 36 subject definitions, got {len(subjects)}")
    for subject_id, text in subjects.items():
        _require(isinstance(text, str) and len(text.strip()) >= 20, f"{subject_id}: subject prompt too short")

    samples = data.get("samples", [])
    _require(len(samples) == 36, f"expected exactly 36 samples, got {len(samples)}")
    ids = [sample.get("id", "") for sample in samples]
    lineages = [sample.get("lineage_id", "") for sample in samples]
    outputs = [sample.get("output_path", "") for sample in samples]
    _require(not _duplicates(ids), f"duplicate sample ids: {sorted(_duplicates(ids))}")
    _require(not _duplicates(lineages), f"duplicate lineage ids: {sorted(_duplicates(lineages))}")
    _require(not _duplicates(outputs), f"duplicate output paths: {sorted(_duplicates(outputs))}")

    lineage_splits: dict[str, set[str]] = defaultdict(set)
    for sample in samples:
        sample_id = sample.get("id", "<missing>")
        subject_id = sample.get("subject_id")
        _require(subject_id in subjects, f"{sample_id}: unknown subject_id {subject_id!r}")
        _require(sample.get("asset_type") in EXPECTED_ENUMS["asset_type"], f"{sample_id}: invalid asset_type")
        _require(sample.get("split") in EXPECTED_ENUMS["split"], f"{sample_id}: invalid split")
        _require(sample.get("view") in EXPECTED_ENUMS["view"], f"{sample_id}: invalid view")
        _require(sample.get("background") == "neutral_light_gray", f"{sample_id}: background must be neutral_light_gray")
        _require(sample.get("independent_render") is True, f"{sample_id}: independent_render must be true")
        _require(sample.get("num_images") == 1, f"{sample_id}: num_images must be 1")
        _require(sample.get("min_long_edge", 0) >= 1024, f"{sample_id}: min_long_edge must be >= 1024")
        output_path = sample.get("output_path", "")
        _require(output_path.startswith("datasets/lora/props/source/") and output_path.endswith(".png"),
                 f"{sample_id}: output_path must be a PNG under datasets/lora/props/source/")
        lineage = sample.get("lineage_id", "")
        _require(lineage.startswith("prop-src-"), f"{sample_id}: invalid lineage_id")
        lineage_splits[lineage].add(sample["split"])

    counts_type = Counter(sample["asset_type"] for sample in samples)
    _require(counts_type == Counter({"physical_prop": 24, "icon": 8, "frame": 4}),
             f"unexpected asset-type totals: {dict(counts_type)}")
    counts_split = Counter(sample["split"] for sample in samples)
    _require(counts_split == Counter({"train": 28, "validation": 8}), f"unexpected split totals: {dict(counts_split)}")
    val_counts = Counter(sample["asset_type"] for sample in samples if sample["split"] == "validation")
    _require(val_counts["physical_prop"] >= 6, "validation must contain at least 6 physical props")
    _require(val_counts["icon"] >= 1, "validation must contain at least 1 icon")
    _require(val_counts["frame"] >= 1, "validation must contain at least 1 frame")

    leaked = {lineage: splits for lineage, splits in lineage_splits.items() if len(splits) > 1}
    _require(not leaked, f"source-lineage leakage across splits: {leaked}")

    all_prompt_text = "\n".join([
        str(data.get("prompt_prefix", "")), str(data.get("negative_prompt", "")),
        *[str(value) for value in subjects.values()]
    ]).lower()
    named_refs = sorted(token for token in BANNED_NAMED_STYLE_REFERENCES if token in all_prompt_text)
    _require(not named_refs, f"named commercial style references are forbidden: {named_refs}")

    prefix = str(data.get("prompt_prefix", "")).lower()
    _require("no collage" in prefix, "prompt_prefix must explicitly forbid collage")
    _require("no readable text" in prefix, "prompt_prefix must explicitly forbid readable text")
    _require("consistent logical pixel size" in prefix, "prompt_prefix must lock a consistent logical pixel size")
    _require("neutral light-gray background" in prefix, "prompt_prefix must lock the neutral light-gray background")
    return data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
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
    print(
        "OK: synopsis_pixel_prop manifest — "
        f"{len(data['samples'])} samples, {counts['train']} train, {counts['validation']} validation, "
        "24 physical + 8 icons + 4 frames, 1 prompt -> 1 image"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
