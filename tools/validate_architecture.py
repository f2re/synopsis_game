#!/usr/bin/env python3
"""Проверяет каноническую топологию первого рабочего среза."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "apps/web/README.md",
    "apps/server/README.md",
    "apps/web/src/routes/arena-tv/README.md",
    "apps/web/src/features/map/README.md",
    "packages/kn01-codec/README.md",
    "packages/content-engine/README.md",
    "packages/game-rules/README.md",
    "packages/world-engine/README.md",
    "packages/contracts/README.md",
    "docs/decisions/ADR-0004-phaser-webgl-pixel-asset-pipeline.md",
    "docs/decisions/ADR-0005-mvp-modular-monolith-boundaries.md",
    "config/art-toolchain.yaml",
]

ALLOWED_APPS = {"web", "server"}
ALLOWED_PACKAGES = {"kn01-codec", "content-engine", "game-rules", "world-engine", "contracts"}


def child_dirs(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {p.name for p in path.iterdir() if p.is_dir() and not p.name.startswith(".")}


def main() -> int:
    errors: list[str] = []

    for name in REQUIRED_FILES:
        if not (ROOT / name).exists():
            errors.append(f"missing canonical architecture file: {name}")

    apps = child_dirs(ROOT / "apps")
    packages = child_dirs(ROOT / "packages")

    extra_apps = sorted(apps - ALLOWED_APPS)
    extra_packages = sorted(packages - ALLOWED_PACKAGES)

    if extra_apps:
        errors.append(f"unexpected MVP app directories: {', '.join(extra_apps)}")
    if extra_packages:
        errors.append(f"unexpected MVP package directories: {', '.join(extra_packages)}")

    architecture = (ROOT / "docs/architecture/README.md").read_text(encoding="utf-8")
    technical = (ROOT / "docs/06_TECHNICAL_REQUIREMENTS.md").read_text(encoding="utf-8")
    schema = (ROOT / "docs/05_CONTENT_SCHEMA.md").read_text(encoding="utf-8")

    for required in ("/arena-tv", "kn01-codec", "content-engine", "game-rules", "world-engine", "contracts"):
        if required not in architecture or required not in technical:
            errors.append(f"canonical architecture token missing from core docs: {required}")

    if "tolerance_px" in schema:
        errors.append("screen-pixel geometry tolerance is forbidden in canonical task schema")
    if '"extent": [0, 0, 1000, 1000]' not in schema:
        errors.append("normalized [0..1000] geometry extent is missing from task schema")

    if errors:
        print("Проверка архитектуры завершилась с ошибками:")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Проверка архитектуры успешно завершена.")
    print("Apps: web, server; packages: kn01-codec, content-engine, game-rules, world-engine, contracts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
