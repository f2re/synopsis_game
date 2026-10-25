#!/usr/bin/env python3
"""Lightweight repository validation with no third-party dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
ID_PATTERNS = [
    re.compile(r"\b(M-\d{3})\b"),
    re.compile(r"\b(IDEA-\d{3})\b"),
    re.compile(r"\b(ADR-\d{4})\b"),
]


def check_json() -> list[str]:
    errors: list[str] = []
    for path in ROOT.rglob("*.json"):
        if ".git" in path.parts:
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"invalid JSON: {path.relative_to(ROOT)}: {exc}")
    return errors


def check_markdown_links() -> list[str]:
    errors: list[str] = []
    for path in ROOT.rglob("*.md"):
        if ".git" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        for target in MARKDOWN_LINK.findall(text):
            target = target.strip()
            if not target or target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            target = target.split("#", 1)[0]
            if not target:
                continue
            resolved = (path.parent / unquote(target)).resolve()
            try:
                resolved.relative_to(ROOT)
            except ValueError:
                errors.append(f"link escapes repository: {path.relative_to(ROOT)} -> {target}")
                continue
            if not resolved.exists():
                errors.append(f"broken local link: {path.relative_to(ROOT)} -> {target}")
    return errors


def check_duplicate_catalog_ids() -> list[str]:
    errors: list[str] = []
    seen: dict[str, Path] = {}
    roots = [ROOT / "docs" / "game-design", ROOT / "docs" / "ideas", ROOT / "docs" / "decisions"]
    for base in roots:
        if not base.exists():
            continue
        for path in base.rglob("*.md"):
            text = path.read_text(encoding="utf-8")
            for pattern in ID_PATTERNS:
                for identifier in pattern.findall(text):
                    previous = seen.get(identifier)
                    if previous and previous != path:
                        errors.append(
                            f"duplicate catalog id {identifier}: "
                            f"{previous.relative_to(ROOT)} and {path.relative_to(ROOT)}"
                        )
                    else:
                        seen[identifier] = path
    return errors


def check_required_files() -> list[str]:
    required = [
        "README.md",
        "CONTRIBUTING.md",
        "SECURITY.md",
        "CHANGELOG.md",
        "docs/README.md",
        "docs/00_VISION_GDD.md",
        "docs/01_RUSSIAN_SYNOPIC_SCHOOL.md",
        "docs/09_SOURCE_POLICY.md",
        "docs/testing/QUALITY_GATES.md",
    ]
    return [f"missing required file: {name}" for name in required if not (ROOT / name).exists()]


def main() -> int:
    errors = []
    errors.extend(check_required_files())
    errors.extend(check_json())
    errors.extend(check_markdown_links())
    errors.extend(check_duplicate_catalog_ids())

    if errors:
        print("Repository validation failed:")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Repository validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
