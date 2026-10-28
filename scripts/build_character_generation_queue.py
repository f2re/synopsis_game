#!/usr/bin/env python3
"""Build a backend-neutral JSONL generation queue for the characters LoRA dataset."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from validate_character_lora_manifest import DEFAULT_MANIFEST, ManifestError, load_and_validate

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = REPO_ROOT / "artifacts/lora/character_generation_queue.jsonl"


def deterministic_seed(sample_id: str, lineage_id: str) -> int:
    digest = hashlib.sha256(f"{sample_id}|{lineage_id}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def make_job(manifest: dict[str, object], sample: dict[str, object]) -> dict[str, object]:
    identities = manifest["identities"]
    assert isinstance(identities, dict)
    identity_prompt = identities[sample["subject_id"]]
    prompt = " ".join([
        str(manifest["prompt_prefix"]).strip(),
        str(identity_prompt).strip(),
        f"subject_kind={sample['subject_kind']}; render_type={sample['render_type']}; "
        f"pose={sample['pose']}; view={sample['view']}; background={sample['background']}. "
        "Preserve subject identity and asymmetric details; do not mirror another reference to fake the requested direction."
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
            "subject_id": sample["subject_id"],
            "subject_kind": sample["subject_kind"],
            "lineage_id": sample["lineage_id"],
            "split": sample["split"],
            "render_type": sample["render_type"],
            "pose": sample["pose"],
            "view": sample["view"],
            "background": sample["background"],
            "min_long_edge": sample["min_long_edge"],
            "independent_render": True,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--split", choices=("all", "train", "validation"), default="all")
    parser.add_argument("--kind", choices=("all", "human", "fauna"), default="all")
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()

    manifest_path = args.manifest if args.manifest.is_absolute() else (REPO_ROOT / args.manifest).resolve()
    output_path = args.output if args.output.is_absolute() else (REPO_ROOT / args.output).resolve()
    try:
        manifest = load_and_validate(manifest_path)
    except (OSError, json.JSONDecodeError, ManifestError) as exc:
        print(f"ERROR: {exc}")
        return 1

    samples = [
        sample for sample in manifest["samples"]
        if (args.split == "all" or sample["split"] == args.split)
        and (args.kind == "all" or sample["subject_kind"] == args.kind)
    ]
    jobs = [make_job(manifest, sample) for sample in samples]
    if any(job["num_images"] != 1 for job in jobs):
        print("ERROR: queue contains a multi-image job")
        return 1

    if args.check_only:
        print(f"OK: queue would contain {len(jobs)} one-image jobs for split={args.split}, kind={args.kind}")
        return 0

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for job in jobs:
            handle.write(json.dumps(job, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"WROTE: {len(jobs)} one-image jobs -> {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
