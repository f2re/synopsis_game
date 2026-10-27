#!/usr/bin/env python3
"""Проверка технического контракта простых графических manifests.

Checker намеренно НЕ оценивает художественное качество, число цветов,
пиксельные кластеры или стиль. В `assets/manifests/` одновременно живут
несколько схем: простые manifests отдельных ресурсов, production manifests
сцен и коллекции UI/items. Этот checker относится только к первой группе.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_DIR = ROOT / "assets" / "manifests"
SKIP = {"asset-manifest.schema.json", "audio.collection.json"}
ALLOWED_KINDS = {"sprite", "tileset", "effect", "ui", "environment", "palette"}
ALLOWED_LAYERS = {"L0", "L1", "L2", "L3", "L4", "L5", "L6", "L8", "ui"}


def fail(errors: list[str], path: Path, message: str) -> None:
    errors.append(f"{path.relative_to(ROOT)}: {message}")


def load_json(path: Path, errors: list[str]) -> object | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        fail(errors, path, f"не удалось прочитать JSON: {exc}")
        return None


def is_simple_asset_manifest(data: object) -> bool:
    """Select only single-resource manifests governed by the legacy simple shape.

    Files with `schema`, `sourceSheet`, `items`, `assets` are collections or
    production manifests and have their own contracts/checkers.
    """
    if not isinstance(data, dict):
        return False
    if any(key in data for key in ("schema", "sourceSheet", "items", "assets")):
        return False
    return data.get("kind") in ALLOWED_KINDS


def check_manifest(path: Path, data: dict[str, object], errors: list[str], warnings: list[str]) -> None:
    required = ("id", "source", "kind", "logicalSize", "pivot", "layer", "provenance")
    for key in required:
        if key not in data:
            fail(errors, path, f"отсутствует обязательное поле {key!r}")

    asset_id = data.get("id")
    if not isinstance(asset_id, str) or not asset_id.strip():
        fail(errors, path, "id должен быть непустой строкой")

    source = data.get("source")
    if not isinstance(source, str) or not source.startswith("assets/source/"):
        fail(errors, path, "source должен указывать внутрь assets/source/")
    elif not (ROOT / source).exists():
        warnings.append(f"{path.relative_to(ROOT)}: source пока отсутствует: {source}")

    logical = data.get("logicalSize")
    if not isinstance(logical, dict):
        fail(errors, path, "logicalSize должен быть объектом")
    else:
        for key in ("width", "height"):
            value = logical.get(key)
            if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
                fail(errors, path, f"logicalSize.{key} должен быть положительным целым")

    pivot = data.get("pivot")
    if not isinstance(pivot, dict):
        fail(errors, path, "pivot должен быть объектом")
    else:
        for key in ("x", "y"):
            value = pivot.get(key)
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                fail(errors, path, f"pivot.{key} должен быть числом")

    layer = data.get("layer")
    if layer not in ALLOWED_LAYERS:
        fail(errors, path, f"неизвестный layer: {layer!r}")

    provenance = data.get("provenance")
    if not isinstance(provenance, dict):
        fail(errors, path, "provenance должен быть объектом")
    else:
        for key in ("origin", "license"):
            if not isinstance(provenance.get(key), str) or not provenance[key].strip():
                fail(errors, path, f"provenance.{key} должен быть непустой строкой")

    generated = data.get("generated", [])
    if not isinstance(generated, list):
        fail(errors, path, "generated должен быть массивом")
    else:
        for item in generated:
            if not isinstance(item, str) or not item.startswith("assets/generated/"):
                fail(errors, path, f"некорректный generated path: {item!r}")


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    candidates = [p for p in sorted(MANIFEST_DIR.glob("*.json")) if p.name not in SKIP]
    checked = 0
    skipped = 0

    for path in candidates:
        data = load_json(path, errors)
        if data is None:
            continue
        if not is_simple_asset_manifest(data):
            skipped += 1
            continue
        checked += 1
        check_manifest(path, data, errors, warnings)

    for warning in warnings:
        print(f"WARNING: {warning}")

    if errors:
        print("Технический контракт assets нарушен:")
        for error in errors:
            print(f" - {error}")
        return 1

    print(f"Технический контракт assets: PASS ({checked} simple manifests, {skipped} иных manifests пропущено).")
    print("Художественное качество этим checker не оценивается.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
