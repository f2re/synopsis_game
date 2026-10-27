#!/usr/bin/env python3
"""Проверка манифестов ассетов (assets/manifests/*.json).

Проверяет синтаксическую валидность JSON и базовые поля схемы манифеста.
Используется в основном CI для проверки структуры без блокировки на кандидатах графики.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFESTS_DIR = ROOT / "assets/manifests"


def validate_manifest(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"{path.name}: невалидный JSON — {exc}"]

    if not isinstance(data, dict):
        return [f"{path.name}: корневой элемент должен быть JSON-объектом"]

    # Manifests can be single-asset manifests, scene manifests, or collection manifests
    if "assets" in data and isinstance(data["assets"], list):
        # Scene or collection manifest
        for i, item in enumerate(data["assets"]):
            if isinstance(item, dict) and "id" not in item:
                errors.append(f"{path.name}: assets[{i}] не содержит 'id'")
    elif "characters" in data and isinstance(data["characters"], list):
        # NPC collection manifest
        if "id" not in data:
            errors.append(f"{path.name}: отсутствует 'id'")
    elif "$schema" in data and "audio" in data["$schema"]:
        # Audio collection manifest
        if "title" not in data or "version" not in data:
            errors.append(f"{path.name}: аудиоманифест должен содержать 'title' и 'version'")
    elif "layers" in data or "buildings" in data:
        # Layer or building states manifest
        if "id" not in data:
            errors.append(f"{path.name}: отсутствует 'id'")
    else:
        # Standard single-asset manifest
        if "id" not in data:
            errors.append(f"{path.name}: отсутствует обязательное поле 'id'")

    return errors


def main() -> int:
    if not MANIFESTS_DIR.is_dir():
        print(f"Каталог манифестов не найден: {MANIFESTS_DIR}", file=sys.stderr)
        return 1

    all_errors: list[str] = []
    manifests = sorted(MANIFESTS_DIR.glob("*.json"))
    manifests = [m for m in manifests if m.name != "asset-manifest.schema.json"]

    if not manifests:
        print("Предупреждение: манифесты ассетов не найдены.")
        return 0

    for manifest_path in manifests:
        errors = validate_manifest(manifest_path)
        all_errors.extend(errors)

    if all_errors:
        print("Ошибки в манифестах ассетов:", file=sys.stderr)
        for err in all_errors:
            print(f"  • {err}", file=sys.stderr)
        return 1

    print(f"✓ Проверено манифестов ассетов: {len(manifests)}. Все структуры корректны.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
