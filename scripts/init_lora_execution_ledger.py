#!/usr/bin/env python3
"""Initialize a deterministic execution ledger from a LoRA generation manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = REPO_ROOT / "training/lora/hub/manifest.v1.json"
DEFAULT_BUILDER = REPO_ROOT / "scripts/build_hub_generation_queue.py"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def deterministic_seed(sample_id: str, lineage_id: str) -> int:
    digest = hashlib.sha256(f"{sample_id}|{lineage_id}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def repo_relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return str(path.resolve())


def build_ledger(manifest_path: Path, builder_path: Path) -> dict[str, Any]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    samples = manifest.get("samples")
    if not isinstance(samples, list) or not samples:
        raise ValueError("manifest samples must be a non-empty list")

    jobs: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_lineages: set[str] = set()
    seen_outputs: set[str] = set()
    for sample in samples:
        sample_id = sample.get("id")
        lineage_id = sample.get("lineage_id")
        output_path = sample.get("output_path")
        split = sample.get("split")
        if not all(isinstance(value, str) and value for value in (sample_id, lineage_id, output_path, split)):
            raise ValueError("every sample must contain id, lineage_id, output_path and split")
        if split not in {"train", "validation"}:
            raise ValueError(f"{sample_id}: invalid split {split!r}")
        if sample.get("num_images", 1) != 1:
            raise ValueError(f"{sample_id}: execution ledger only supports one-image jobs")
        if sample_id in seen_ids:
            raise ValueError(f"duplicate sample id: {sample_id}")
        if lineage_id in seen_lineages:
            raise ValueError(f"duplicate lineage id: {lineage_id}")
        if output_path in seen_outputs:
            raise ValueError(f"duplicate output path: {output_path}")
        seen_ids.add(sample_id)
        seen_lineages.add(lineage_id)
        seen_outputs.add(output_path)
        jobs.append(
            {
                "job_id": sample_id,
                "base_lineage_id": lineage_id,
                "split": split,
                "planned_output_path": output_path,
                "seed": deterministic_seed(sample_id, lineage_id),
                "status": "pending",
                "attempts": [],
            }
        )

    for required in ("dataset", "adapter", "trigger"):
        if not isinstance(manifest.get(required), str) or not manifest[required]:
            raise ValueError(f"manifest is missing non-empty {required}")

    return {
        "schema_version": 1,
        "dataset": manifest["dataset"],
        "adapter": manifest["adapter"],
        "trigger": manifest["trigger"],
        "source_manifest": repo_relative(manifest_path),
        "manifest_sha256": sha256_file(manifest_path),
        "queue_builder": repo_relative(builder_path),
        "queue_builder_sha256": sha256_file(builder_path),
        "jobs": jobs,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--builder", type=Path, default=DEFAULT_BUILDER)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()

    manifest_path = args.manifest if args.manifest.is_absolute() else (REPO_ROOT / args.manifest).resolve()
    builder_path = args.builder if args.builder.is_absolute() else (REPO_ROOT / args.builder).resolve()
    try:
        ledger = build_ledger(manifest_path, builder_path)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"ERROR: {exc}")
        return 1

    if args.check_only:
        print(
            f"OK: {ledger['dataset']} execution ledger would contain "
            f"{len(ledger['jobs'])} pending one-image jobs; manifest/builder hashes pinned"
        )
        return 0

    output_path = args.output
    if output_path is None:
        output_path = REPO_ROOT / f"artifacts/lora/{ledger['adapter']}_execution_ledger.json"
    elif not output_path.is_absolute():
        output_path = (REPO_ROOT / output_path).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"WROTE: {len(ledger['jobs'])} pending jobs -> {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
