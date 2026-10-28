#!/usr/bin/env python3
"""Validate the canonical characters LoRA source-generation manifest."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = REPO_ROOT / "training/lora/characters/manifest.v1.json"
BANNED_NAMED_STYLE_REFERENCES = {"eastward", "sea of stars", "celeste", "owlboy"}
REQUIRED_HUMAN_SUBJECTS = {
    "hero", "heroine", "vera_ladozhskaya", "semyon_kruglov", "georgy_korf",
    "kira_vyazemskaya", "pavel_morozov", "polina_sinitsyna", "artem_volkov",
    "trainee_a", "trainee_b", "trainee_c",
}
REQUIRED_FAUNA_SUBJECTS = {
    "pascal_cat", "corgi_blue_bandana", "great_tit", "gull", "mallard",
    "pigeon", "bullfinch", "bird_flock",
}
EXPECTED_ENUMS = {
    "subject_kind": {"human", "fauna"},
    "render_type": {"character_reference"},
    "view": {"near_front", "three_quarter_left", "three_quarter_right", "profile_left", "profile_right"},
    "background": {"neutral_light_gray"},
    "split": {"train", "validation"},
}
REQUIRED_HERO_POSES = {"standing_neutral", "walking", "pointing", "cheering", "thinking"}


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
    _require(data.get("dataset") == "synopsis_pixel_char", "unexpected dataset")
    _require(data.get("adapter") == "characters", "adapter must be characters")
    _require(data.get("trigger") == "synopsis_pixel_char", "unexpected trigger")

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
    _require(contract.get("background") == "neutral_light_gray", "background contract must be neutral_light_gray")

    enums = data.get("enums", {})
    for key, expected in EXPECTED_ENUMS.items():
        _require(set(enums.get(key, [])) == expected, f"enum {key} is incomplete or changed")

    style = data.get("style_contract", {})
    _require(style.get("pixel_scale") == "fixed_logical_pixel_size", "pixel scale contract changed")
    _require(style.get("presentation") == "nearest_neighbour", "presentation must be nearest_neighbour")
    _require(style.get("local_surface_shades") == [3, 5], "local surface shades must be [3, 5]")

    identities = data.get("identities", {})
    required_subjects = REQUIRED_HUMAN_SUBJECTS | REQUIRED_FAUNA_SUBJECTS
    _require(required_subjects.issubset(identities), f"missing identity prompts: {sorted(required_subjects - set(identities))}")
    for subject_id in required_subjects:
        text = identities.get(subject_id, "")
        _require(isinstance(text, str) and len(text.strip()) >= 20, f"{subject_id}: identity prompt too short")

    samples = data.get("samples", [])
    _require(len(samples) == 30, f"expected exactly 30 samples, got {len(samples)}")
    ids = [sample.get("id", "") for sample in samples]
    lineages = [sample.get("lineage_id", "") for sample in samples]
    outputs = [sample.get("output_path", "") for sample in samples]
    _require(not _duplicates(ids), f"duplicate sample ids: {sorted(_duplicates(ids))}")
    _require(not _duplicates(lineages), f"duplicate lineage ids: {sorted(_duplicates(lineages))}")
    _require(not _duplicates(outputs), f"duplicate output paths: {sorted(_duplicates(outputs))}")

    lineage_splits: dict[str, set[str]] = defaultdict(set)
    by_subject: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for sample in samples:
        sample_id = sample.get("id", "<missing>")
        subject_id = sample.get("subject_id")
        kind = sample.get("subject_kind")
        _require(subject_id in identities, f"{sample_id}: unknown subject_id {subject_id!r}")
        _require(kind in EXPECTED_ENUMS["subject_kind"], f"{sample_id}: invalid subject_kind")
        _require(sample.get("split") in EXPECTED_ENUMS["split"], f"{sample_id}: invalid split")
        _require(sample.get("render_type") == "character_reference", f"{sample_id}: render_type must be character_reference")
        _require(sample.get("view") in EXPECTED_ENUMS["view"], f"{sample_id}: invalid view")
        _require(sample.get("background") == "neutral_light_gray", f"{sample_id}: background must be neutral_light_gray")
        _require(isinstance(sample.get("pose"), str) and sample["pose"], f"{sample_id}: pose is required")
        _require(sample.get("independent_render") is True, f"{sample_id}: independent_render must be true")
        _require(sample.get("num_images") == 1, f"{sample_id}: num_images must be 1")
        _require(sample.get("min_long_edge", 0) >= 1024, f"{sample_id}: min_long_edge must be >= 1024")
        output_path = sample.get("output_path", "")
        _require(output_path.startswith("datasets/lora/characters/source/") and output_path.endswith(".png"),
                 f"{sample_id}: output_path must be a PNG under datasets/lora/characters/source/")
        lineage = sample.get("lineage_id", "")
        _require(lineage.startswith("char-src-"), f"{sample_id}: invalid lineage_id")
        lineage_splits[lineage].add(sample["split"])
        by_subject[subject_id].append(sample)

    counts_kind = Counter(sample["subject_kind"] for sample in samples)
    _require(counts_kind == Counter({"human": 20, "fauna": 10}), f"unexpected subject-kind totals: {dict(counts_kind)}")
    counts_split = Counter(sample["split"] for sample in samples)
    _require(counts_split == Counter({"train": 23, "validation": 7}), f"unexpected split totals: {dict(counts_split)}")

    hero = by_subject["hero"]
    _require({sample["pose"] for sample in hero} == REQUIRED_HERO_POSES, "hero must cover the five required poses exactly")
    hero_views = {sample["view"] for sample in hero}
    _require({"near_front", "three_quarter_left", "three_quarter_right", "profile_left"}.issubset(hero_views),
             "hero must cover near-front, both 3/4 directions and a profile")
    _require(any(sample["split"] == "validation" and sample["view"].startswith("profile") for sample in hero),
             "hero validation must include a profile")
    _require(any(sample["split"] == "validation" for sample in by_subject["pascal_cat"]),
             "Pascal must have a validation reference")
    pascal_text = identities["pascal_cat"].lower()
    for token in ("ginger-white", "green eyes", "left ear"):
        _require(token in pascal_text, f"Pascal identity must explicitly include {token!r}")

    leaked = {lineage: splits for lineage, splits in lineage_splits.items() if len(splits) > 1}
    _require(not leaked, f"source-lineage leakage across splits: {leaked}")

    all_prompt_text = "\n".join([
        str(data.get("prompt_prefix", "")), str(data.get("negative_prompt", "")),
        *[str(value) for value in identities.values()]
    ]).lower()
    named_refs = sorted(token for token in BANNED_NAMED_STYLE_REFERENCES if token in all_prompt_text)
    _require(not named_refs, f"named commercial style references are forbidden: {named_refs}")

    prefix = str(data.get("prompt_prefix", "")).lower()
    _require("no collage" in prefix, "prompt_prefix must explicitly forbid collage")
    _require("neutral light-gray background" in prefix, "prompt_prefix must lock the neutral light-gray background")
    _require("consistent logical pixel size" in prefix, "prompt_prefix must lock a consistent logical pixel size")
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
        "OK: synopsis_pixel_char manifest — "
        f"{len(data['samples'])} samples, {counts['train']} train, {counts['validation']} validation, "
        "20 human + 10 fauna, 1 prompt -> 1 image"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
