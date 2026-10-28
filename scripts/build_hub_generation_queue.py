#!/usr/bin/env python3
"""Build a backend-neutral JSONL generation queue for the hub LoRA dataset."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from validate_hub_lora_manifest import DEFAULT_MANIFEST, ManifestError, load_and_validate

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = REPO_ROOT / "artifacts/lora/hub_generation_queue.jsonl"


def deterministic_seed(sample_id: str, lineage_id: str) -> int:
    digest = hashlib.sha256(f"{sample_id}|{lineage_id}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def condition_clause(sample: dict[str, object]) -> str:
    return (
        "Condition tags for this independent render: "
        f"time_of_day={sample['time_of_day']}; "
        f"weather={sample['weather']}; "
        f"season={sample['season']}. "
        "Express all three visually without changing the scene's canonical function or architecture."
    )


def make_job(manifest: dict[str, object], sample: dict[str, object]) -> dict[str, object]:
    scenes = manifest["scenes"]
    assert isinstance(scenes, dict)
    scene_prompt = scenes[sample["scene_id"]]
    prompt = " ".join([
        str(manifest["prompt_prefix"]).strip(),
        str(scene_prompt).strip(),
        condition_clause(sample),
    ])
    return {
        "job_id": sample["id"],
        "adapter": manifest["dataset"],
        "trigger": manifest["trigger"],
        "prompt": prompt,
        "negative_prompt": manifest["negative_prompt"],
        "num_images": 1,
        "seed": deterministic_seed(str(sample["id"]), str(sample["lineage_id"])),
        "output_path": sample["output_path"],
        "metadata": {
            "scene_id": sample["scene_id"],
            "lineage_id": sample["lineage_id"],
            "split": sample["split"],
            "time_of_day": sample["time_of_day"],
            "weather": sample["weather"],
            "season": sample["season"],
            "logical_grid": manifest["logical_grid"],
            "min_long_edge": sample["min_long_edge"],
            "independent_render": True,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--split", choices=("all", "train", "validation"), default="all")
    parser.add_argument("--check-only", action="store_true", help="Validate and report queue size without writing JSONL.")
    args = parser.parse_args()

    manifest_path = args.manifest
    if not manifest_path.is_absolute():
        manifest_path = (REPO_ROOT / manifest_path).resolve()
    output_path = args.output
    if not output_path.is_absolute():
        output_path = (REPO_ROOT / output_path).resolve()

    try:
        manifest = load_and_validate(manifest_path)
    except (OSError, json.JSONDecodeError, ManifestError) as exc:
        print(f"ERROR: {exc}")
        return 1

    samples = [sample for sample in manifest["samples"] if args.split == "all" or sample["split"] == args.split]
    jobs = [make_job(manifest, sample) for sample in samples]

    if args.check_only:
        print(f"OK: queue would contain {len(jobs)} one-image jobs for split={args.split}")
        return 0

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for job in jobs:
            handle.write(json.dumps(job, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"WROTE: {len(jobs)} one-image jobs -> {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
