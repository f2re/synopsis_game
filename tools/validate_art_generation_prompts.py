#!/usr/bin/env python3
"""Validate non-degrading image-generation prompt contracts.

The validator intentionally checks structure and minimum actionable depth rather than
subjective prompt quality. It applies to batch files that opt into the v2 contract by
referencing PROMPT-AUTHORING-STANDARD.md.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH_DIR = ROOT / "docs" / "art-generation" / "batches"
OPT_IN_MARKER = "PROMPT-AUTHORING-STANDARD.md"
JOB_RE = re.compile(r"^## JOB\s+([0-9]{2}-[0-9]{2})\s+—\s+`([^`]+)`\s*$", re.MULTILINE)
REQUIRED_SECTIONS = (
    "### References",
    "### Output contract",
    "### Generation prompt",
    "### Hard negatives",
    "### PASS / FAIL",
)
ANTI_COLLAGE_TERMS = ("contact sheet", "sprite sheet", "grid", "collage")
ONE_IMAGE_TERMS = ("exactly one", "one image", "один image", "один png")


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


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")

    if OPT_IN_MARKER not in text:
        return errors

    # Orchestration documents may opt into the standard but explicitly declare
    # that they are not image-generation prompt files.
    if "TYPE: QA/ORCHESTRATION — NOT AN IMAGE GENERATION PROMPT" in text:
        return errors

    jobs = _job_blocks(text)
    if not jobs:
        errors.append(f"{path.relative_to(ROOT)}: v2 batch has no numbered JOB blocks")
        return errors

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
        if len(meaningful) < 700:
            errors.append(
                f"{prefix}: prompt contract too short ({len(meaningful)} chars; minimum 700)"
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


def main() -> int:
    if not BATCH_DIR.exists():
        print(f"missing batch directory: {BATCH_DIR}", file=sys.stderr)
        return 1

    errors: list[str] = []
    checked = 0
    for path in sorted(BATCH_DIR.glob("BATCH-*.md")):
        text = path.read_text(encoding="utf-8")
        if OPT_IN_MARKER in text:
            checked += 1
            errors.extend(validate_file(path))

    if errors:
        print("Art-generation prompt validation FAILED:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Art-generation prompt validation passed ({checked} v2 batch files checked).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
