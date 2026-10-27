#!/usr/bin/env python3
"""Проверка технического контракта графических asset manifests.

Этот checker намеренно НЕ оценивает художественное качество, число цветов,
пиксельные кластеры или стиль. Эти свойства относятся к art review.
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


def check_manifest(path: Path, errors: list[str], warnings: list[str]) -> None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        fail(errors, path, f"не удалось прочитать JSON: {exc}")
        return

    if not isinstance(data, dict):
        fail(errors, path, "корень manifest должен быть объектом")
        return

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
        # Репозиторий исторически содержит manifests для ещё не произведённых
        # кандидатов. Это не ломает общую сборку, но остаётся диагностикой.
        warnings.append(f"{path.relative_to(ROOT)}: source пока отсутствует: {source}")

    kind = data.get("kind")
    if kind not in ALLOWED_KINDS:
        fail(errors, path, f"неизвестный kind: {kind!r}")

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
    manifests = [p for p in sorted(MANIFEST_DIR.glob("*.json")) if p.name not in SKIP]

    if not manifests:
        print("Нет графических manifests для проверки.")
        return 0

    for path in manifests:
        check_manifest(path, errors, warnings)

    for warning in warnings:
        print(f"WARNING: {warning}")

    if errors:
        print("Технический контракт assets нарушен:")
        for error in errors:
            print(f" - {error}")
        return 1

    print(f"Технический контракт assets: PASS ({len(manifests)} manifests).")
    print("Художественное качество этим checker не оценивается.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
