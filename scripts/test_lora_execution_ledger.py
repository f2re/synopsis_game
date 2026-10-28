#!/usr/bin/env python3
"""Self-contained semantic tests for the LoRA execution ledger."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from init_lora_execution_ledger import build_ledger
from validate_lora_execution_ledger import LedgerError, validate


def expect_error(fn, contains: str) -> None:
    try:
        fn()
    except LedgerError as exc:
        if contains not in str(exc):
            raise AssertionError(f"expected error containing {contains!r}, got {exc!r}") from exc
        return
    raise AssertionError(f"expected LedgerError containing {contains!r}")


def attempt(lineage: str, output_path: str, seed: int) -> dict[str, object]:
    return {
        "attempt_id": 1,
        "lineage_id": lineage,
        "output_path": output_path,
        "seed": seed,
        "prompt_sha256": "1" * 64,
        "negative_prompt_sha256": "2" * 64,
        "state": "candidate",
        "generator": {"provider": "test-provider", "model": "test-model", "version": "v1"},
        "sha256": "3" * 64,
        "generated_at": "2026-10-28T00:00:00Z",
        "gates": {"pixel_art": "pending", "art_direction": "pending", "integration": "pending"},
        "reject_reasons": [],
    }


def main() -> int:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        manifest_path = root / "manifest.json"
        builder_path = root / "builder.py"
        ledger_path = root / "ledger.json"
        manifest = {
            "dataset": "test_dataset",
            "adapter": "test_adapter",
            "trigger": "test_trigger",
            "samples": [
                {
                    "id": "job-a",
                    "lineage_id": "src-a",
                    "split": "train",
                    "output_path": "datasets/test/job-a.png",
                    "num_images": 1,
                },
                {
                    "id": "job-b",
                    "lineage_id": "src-b",
                    "split": "validation",
                    "output_path": "datasets/test/job-b.png",
                    "num_images": 1,
                },
            ],
        }
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        builder_path.write_text("# deterministic test builder\n", encoding="utf-8")

        ledger = build_ledger(manifest_path, builder_path)
        assert len(ledger["jobs"]) == 2
        assert all(job["status"] == "pending" for job in ledger["jobs"])
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        result = validate(ledger_path)
        assert result["counts"] == {"pending": 2, "candidate": 0, "rejected": 0, "accepted": 0}

        original_manifest_hash = ledger["manifest_sha256"]
        ledger["manifest_sha256"] = "0" * 64
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        expect_error(lambda: validate(ledger_path), "manifest SHA-256 mismatch")
        ledger["manifest_sha256"] = original_manifest_hash

        first = ledger["jobs"][0]
        first_attempt = attempt(first["base_lineage_id"], first["planned_output_path"], first["seed"])
        first["attempts"] = [first_attempt]
        first["status"] = "candidate"
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        result = validate(ledger_path)
        assert result["counts"]["candidate"] == 1

        first["status"] = "accepted"
        first_attempt["state"] = "accepted"
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        expect_error(lambda: validate(ledger_path), "requires all three gates accepted")
        first_attempt["gates"] = {"pixel_art": "accepted", "art_direction": "accepted", "integration": "accepted"}
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        result = validate(ledger_path)
        assert result["counts"]["accepted"] == 1

        second = ledger["jobs"][1]
        second_attempt = attempt(second["base_lineage_id"], second["planned_output_path"], second["seed"])
        second_attempt["state"] = "rejected"
        second_attempt["gates"]["pixel_art"] = "rejected"
        second_attempt["reject_reasons"] = ["mixed pixel scale"]
        second["attempts"] = [second_attempt]
        second["status"] = "rejected"
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        result = validate(ledger_path)
        assert result["counts"] == {"pending": 0, "candidate": 0, "rejected": 1, "accepted": 1}

        duplicate_regen = dict(second_attempt)
        duplicate_regen["attempt_id"] = 2
        duplicate_regen["output_path"] = "datasets/test/job-b-r2.png"
        second["attempts"].append(duplicate_regen)
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        expect_error(lambda: validate(ledger_path), "regeneration must use a new lineage")

    print("OK: LoRA execution ledger semantic tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
