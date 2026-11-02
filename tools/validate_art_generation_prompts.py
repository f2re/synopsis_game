#!/usr/bin/env python3
"""Validate non-degrading image-generation prompt contracts.

Two tiers exist intentionally:
1. v2 batches opt into PROMPT-AUTHORING-STANDARD.md and must satisfy the full
   self-contained JOB contract.
2. a small fixed allow-list of original high-detail legacy batches is protected
   against prompt shrinkage until they are migrated. No new legacy batch is allowed.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH_DIR = ROOT / "docs" / "art-generation" / "batches"
OPT_IN_MARKER = "PROMPT-AUTHORING-STANDARD.md"
ORCHESTRATION_MARKER = "TYPE: QA/ORCHESTRATION — NOT AN IMAGE GENERATION PROMPT"
JOB_RE = re.compile(r"^## JOB\s+([0-9]{2}-[0-9]{2})\s+—\s+`([^`]+)`\s*$", re.MULTILINE)
BATCH_NUMBER_RE = re.compile(r"BATCH-(\d{2})-")

REQUIRED_SECTIONS = (
    "### References",
    "### Output contract",
    "### Generation prompt",
    "### Hard negatives",
    "### PASS / FAIL",
)
ANTI_COLLAGE_TERMS = ("contact sheet", "sprite sheet", "grid", "collage")
ONE_IMAGE_TERMS = (
    "exactly one",
    "one image",
    "one object",
    "one person",
    "one bird",
    "one animal",
    "один image",
    "один png",
    "ровно один",
)

# These are the original detailed batches that predate the v2 sectioned format.
# They are allowed to remain legacy temporarily, but cannot be shortened below
# the floor below. Every new batch number must opt into v2.
ALLOWED_LEGACY_BATCHES = {0, 1, 2, 3, 4, 6, 7}
LEGACY_MIN_JOB_CHARS = 320
LEGACY_MIN_FILE_CHARS = 4000
V2_MIN_JOB_CHARS = 700


def _job_blocks(text: str) -> list[tuple[str, str, str]]:
    matches = list(JOB_RE.finditer(text))
    blocks: list[tuple[str, str, str]] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((match.group(1), match.group(2), text[start:end]))
    return blocks


def _contains_any(text: str, terms: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in terms)


def _batch_number(path: Path) -> int | None:
    match = BATCH_NUMBER_RE.search(path.name)
    return int(match.group(1)) if match else None


def validate_v2_file(path: Path, text: str) -> list[str]:
    errors: list[str] = []

    if ORCHESTRATION_MARKER in text:
        return errors

    jobs = _job_blocks(text)
    if not jobs:
        return [f"{path.relative_to(ROOT)}: v2 batch has no numbered JOB blocks"]

    if len(jobs) != 10:
        errors.append(
            f"{path.relative_to(ROOT)}: expected exactly 10 JOB blocks, found {len(jobs)}"
        )

    seen_ids: set[str] = set()
    seen_semantic_ids: set[str] = set()

    for job_id, semantic_id, block in jobs:
        prefix = f"{path.relative_to(ROOT)}:{job_id}"

        if job_id in seen_ids:
            errors.append(f"{prefix}: duplicate job id")
        seen_ids.add(job_id)

        if semantic_id in seen_semantic_ids:
            errors.append(f"{prefix}: duplicate semantic id {semantic_id}")
        seen_semantic_ids.add(semantic_id)

        for section in REQUIRED_SECTIONS:
            if section not in block:
                errors.append(f"{prefix}: missing mandatory section {section!r}")

        meaningful = re.sub(r"\s+", " ", block).strip()
        if len(meaningful) < V2_MIN_JOB_CHARS:
            errors.append(
                f"{prefix}: prompt contract too short "
                f"({len(meaningful)} chars; minimum {V2_MIN_JOB_CHARS})"
            )

        lowered = block.lower()
        if "reference" not in lowered and "image a" not in lowered:
            errors.append(f"{prefix}: no explicit reference/identity/geometry authority")

        if not _contains_any(block, ONE_IMAGE_TERMS):
            errors.append(f"{prefix}: missing explicit one-image-only instruction")

        if not any(term in lowered for term in ANTI_COLLAGE_TERMS):
            errors.append(f"{prefix}: missing anti-contact-sheet/collage instruction")

        if "fail" not in lowered:
            errors.append(f"{prefix}: missing measurable FAIL criteria")

        output_section = block.split("### Output contract", 1)[-1]
        output_section = output_section.split("### Generation prompt", 1)[0]
        output_lower = output_section.lower()
        if not any(token in output_lower for token in ("transparent", "opaque", "qa", "composite")):
            errors.append(f"{prefix}: output contract does not state alpha/composite policy")

        # Production full-scene overlays must declare fixed origin. QA composites/crops
        # are derived views and do not need an alpha-layer origin contract.
        is_qa = semantic_id.startswith("hub.qa.") or "qa/reference" in lowered
        if not is_qa and ("640×360" in block or "640x360" in block):
            if "(0,0)" not in block and "origin" not in lowered:
                errors.append(f"{prefix}: full-scene production job lacks explicit origin/alignment rule")

    return errors


def validate_legacy_file(path: Path, text: str) -> list[str]:
    errors: list[str] = []
    number = _batch_number(path)
    rel = path.relative_to(ROOT)

    if number not in ALLOWED_LEGACY_BATCHES:
        return [
            f"{rel}: legacy prompt format is forbidden for BATCH-{number:02d}; "
            f"migrate it to {OPT_IN_MARKER}"
            if number is not None
            else f"{rel}: unrecognized legacy batch name"
        ]

    jobs = _job_blocks(text)
    if len(jobs) != 10:
        errors.append(f"{rel}: protected legacy batch must keep exactly 10 jobs, found {len(jobs)}")

    meaningful_file = re.sub(r"\s+", " ", text).strip()
    if len(meaningful_file) < LEGACY_MIN_FILE_CHARS:
        errors.append(
            f"{rel}: protected legacy file shrank below {LEGACY_MIN_FILE_CHARS} meaningful chars"
        )

    for job_id, semantic_id, block in jobs:
        prefix = f"{rel}:{job_id}"
        meaningful = re.sub(r"\s+", " ", block).strip()
        if len(meaningful) < LEGACY_MIN_JOB_CHARS:
            errors.append(
                f"{prefix}: protected legacy prompt too short "
                f"({len(meaningful)} chars; minimum {LEGACY_MIN_JOB_CHARS}); migrate to v2 instead of shortening"
            )
        if not _contains_any(block, ONE_IMAGE_TERMS):
            errors.append(f"{prefix}: protected legacy prompt lost explicit single-asset/image wording")

        lowered = block.lower()
        if not any(term in lowered for term in ("sheet", "variant", "duplicate", "second", "contact")):
            errors.append(
                f"{prefix}: protected legacy prompt lacks a local anti-multiple-output constraint"
            )

    return errors


def main() -> int:
    if not BATCH_DIR.exists():
        print(f"missing batch directory: {BATCH_DIR}", file=sys.stderr)
        return 1

    errors: list[str] = []
    v2_checked = 0
    legacy_checked = 0

    for path in sorted(BATCH_DIR.glob("BATCH-*.md")):
        text = path.read_text(encoding="utf-8")
        if OPT_IN_MARKER in text:
            v2_checked += 1
            errors.extend(validate_v2_file(path, text))
        else:
            legacy_checked += 1
            errors.extend(validate_legacy_file(path, text))

    if errors:
        print("Art-generation prompt validation FAILED:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "Art-generation prompt validation passed "
        f"({v2_checked} v2 batch files + {legacy_checked} protected legacy files checked)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
