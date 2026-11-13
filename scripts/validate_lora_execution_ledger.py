#!/usr/bin/env python3
"""Validate a LoRA execution ledger against its pinned manifest and queue builder."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class LedgerError(ValueError):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise LedgerError(message)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def deterministic_seed(sample_id: str, lineage_id: str) -> int:
    digest = hashlib.sha256(f"{sample_id}|{lineage_id}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def resolve_repo_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def validate(ledger_path: Path) -> dict[str, Any]:
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    _require(ledger.get("schema_version") == 1, "schema_version must be 1")

    manifest_path = resolve_repo_path(str(ledger.get("source_manifest", "")))
    builder_path = resolve_repo_path(str(ledger.get("queue_builder", "")))
    _require(manifest_path.is_file(), f"source manifest does not exist: {manifest_path}")
    _require(builder_path.is_file(), f"queue builder does not exist: {builder_path}")
    _require(ledger.get("manifest_sha256") == sha256_file(manifest_path), "manifest SHA-256 mismatch")
    _require(ledger.get("queue_builder_sha256") == sha256_file(builder_path), "queue-builder SHA-256 mismatch")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for key in ("dataset", "adapter", "trigger"):
        _require(ledger.get(key) == manifest.get(key), f"ledger {key} does not match manifest")

    samples = manifest.get("samples", [])
    jobs = ledger.get("jobs", [])
    _require(isinstance(samples, list) and isinstance(jobs, list), "samples/jobs must be lists")
    _require(len(jobs) == len(samples), f"ledger has {len(jobs)} jobs but manifest has {len(samples)} samples")
    by_id = {sample.get("id"): sample for sample in samples}
    _require(len(by_id) == len(samples), "manifest sample ids are not unique")

    seen_job_ids: set[str] = set()
    seen_attempt_lineages: set[str] = set()
    seen_attempt_outputs: set[str] = set()
    accepted = rejected = candidates = pending = 0

    for job in jobs:
        job_id = job.get("job_id")
        _require(job_id in by_id, f"unknown job_id {job_id!r}")
        _require(job_id not in seen_job_ids, f"duplicate job_id {job_id!r}")
        seen_job_ids.add(job_id)
        sample = by_id[job_id]
        _require(job.get("base_lineage_id") == sample.get("lineage_id"), f"{job_id}: base lineage mismatch")
        _require(job.get("split") == sample.get("split"), f"{job_id}: split mismatch")
        _require(job.get("planned_output_path") == sample.get("output_path"), f"{job_id}: planned output mismatch")
        expected_seed = deterministic_seed(str(job_id), str(sample.get("lineage_id")))
        _require(job.get("seed") == expected_seed, f"{job_id}: deterministic seed mismatch")

        status = job.get("status")
        _require(status in {"pending", "candidate", "rejected", "pixel_accepted", "art_accepted", "accepted"},
                 f"{job_id}: invalid status {status!r}")
        attempts = job.get("attempts")
        _require(isinstance(attempts, list), f"{job_id}: attempts must be a list")
        if status == "pending":
            _require(not attempts, f"{job_id}: pending job must have no attempts")
            pending += 1
            continue
        _require(attempts, f"{job_id}: non-pending job must have at least one attempt")

        previous_lineage = None
        previous_output = None
        for index, attempt in enumerate(attempts, start=1):
            _require(attempt.get("attempt_id") == index, f"{job_id}: attempt ids must be sequential starting at 1")
            lineage = attempt.get("lineage_id")
            output_path = attempt.get("output_path")
            _require(isinstance(lineage, str) and lineage, f"{job_id}: attempt {index} lineage is required")
            _require(isinstance(output_path, str) and output_path.endswith(".png"), f"{job_id}: attempt {index} output must be a PNG")
            _require(lineage not in seen_attempt_lineages, f"duplicate attempt lineage across ledger: {lineage}")
            _require(output_path not in seen_attempt_outputs, f"duplicate attempt output across ledger: {output_path}")
            seen_attempt_lineages.add(lineage)
            seen_attempt_outputs.add(output_path)
            if index == 1:
                _require(lineage == job.get("base_lineage_id"), f"{job_id}: first attempt must use base lineage")
                _require(output_path == job.get("planned_output_path"), f"{job_id}: first attempt must use planned output path")
                _require(attempt.get("seed") == job.get("seed"), f"{job_id}: first attempt seed mismatch")
            else:
                _require(lineage != previous_lineage, f"{job_id}: regeneration must use a new lineage")
                _require(output_path != previous_output, f"{job_id}: regeneration must use a new output path")
            previous_lineage = lineage
            previous_output = output_path

            for field in ("prompt_sha256", "negative_prompt_sha256", "sha256"):
                value = attempt.get(field)
                _require(isinstance(value, str) and SHA256_RE.fullmatch(value) is not None,
                         f"{job_id}: attempt {index} requires valid {field}")
            _require(isinstance(attempt.get("generated_at"), str) and attempt["generated_at"],
                     f"{job_id}: attempt {index} generated_at is required")
            generator = attempt.get("generator")
            _require(isinstance(generator, dict), f"{job_id}: attempt {index} generator is required")
            for field in ("provider", "model", "version"):
                _require(isinstance(generator.get(field), str) and generator[field],
                         f"{job_id}: attempt {index} generator.{field} is required")
            gates = attempt.get("gates")
            _require(isinstance(gates, dict), f"{job_id}: attempt {index} gates are required")
            for gate in ("pixel_art", "art_direction", "integration"):
                _require(gates.get(gate) in {"pending", "accepted", "rejected"},
                         f"{job_id}: attempt {index} invalid {gate} gate")
            reasons = attempt.get("reject_reasons")
            _require(isinstance(reasons, list), f"{job_id}: attempt {index} reject_reasons must be a list")
            state = attempt.get("state")
            _require(state in {"candidate", "rejected", "accepted"}, f"{job_id}: attempt {index} invalid state")
            if state == "rejected":
                _require(bool(reasons), f"{job_id}: rejected attempt must record reject reasons")
                _require("rejected" in set(gates.values()) or bool(reasons),
                         f"{job_id}: rejected attempt must show gate/reason evidence")
            if state == "accepted":
                _require(not reasons, f"{job_id}: accepted attempt cannot keep reject reasons")
                _require(all(gates.get(gate) == "accepted" for gate in ("pixel_art", "art_direction", "integration")),
                         f"{job_id}: accepted attempt requires all three gates accepted")

        last = attempts[-1]
        last_gates = last["gates"]
        if status == "candidate":
            _require(last["state"] == "candidate", f"{job_id}: candidate status requires candidate last attempt")
            candidates += 1
        elif status == "rejected":
            _require(last["state"] == "rejected", f"{job_id}: rejected status requires rejected last attempt")
            rejected += 1
        elif status == "pixel_accepted":
            _require(last["state"] == "candidate", f"{job_id}: pixel_accepted remains a candidate until all gates pass")
            _require(last_gates["pixel_art"] == "accepted", f"{job_id}: pixel gate must be accepted")
            _require(last_gates["art_direction"] == "pending" and last_gates["integration"] == "pending",
                     f"{job_id}: pixel_accepted must precede art/integration gates")
            candidates += 1
        elif status == "art_accepted":
            _require(last["state"] == "candidate", f"{job_id}: art_accepted remains a candidate until integration passes")
            _require(last_gates["pixel_art"] == "accepted" and last_gates["art_direction"] == "accepted",
                     f"{job_id}: art_accepted requires pixel and art gates")
            _require(last_gates["integration"] == "pending", f"{job_id}: integration must still be pending")
            candidates += 1
        elif status == "accepted":
            _require(last["state"] == "accepted", f"{job_id}: accepted status requires accepted last attempt")
            accepted += 1

    _require(seen_job_ids == set(by_id), "ledger does not cover every manifest sample exactly once")
    return {
        "ledger": ledger,
        "counts": {"pending": pending, "candidate": candidates, "rejected": rejected, "accepted": accepted},
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("ledger", type=Path)
    args = parser.parse_args()
    ledger_path = args.ledger if args.ledger.is_absolute() else (REPO_ROOT / args.ledger).resolve()
    try:
        result = validate(ledger_path)
    except (OSError, json.JSONDecodeError, LedgerError) as exc:
        print(f"ERROR: {exc}")
        return 1
    counts = result["counts"]
    print(
        "OK: execution ledger — "
        f"pending={counts['pending']}, candidate={counts['candidate']}, "
        f"rejected={counts['rejected']}, accepted={counts['accepted']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
