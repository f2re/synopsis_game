#!/usr/bin/env python3
"""Выделить свет окон из редактируемых R01-слоёв без перерисовки и масштабирования.

Маска сохраняет исходные RGB только в ограниченных областях окон и фонарей.
Она накладывается поверх затемнённого фасада; геометрия здания не дублируется.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image
from build_hub_r01 import read_layers

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "assets/manifests/hub.r07-lighting.json"


def build(check: bool) -> None:
    manifest = json.loads(MANIFEST.read_text())
    for entry in manifest["assets"]:
        rule = {**manifest["selection"], **entry.get("selection", {})}
        source_manifest = json.loads((ROOT / entry["sourceManifest"]).read_text())
        source_entry = next(a for a in source_manifest["assets"] if a["id"] == entry["sourceAsset"])
        source_path = ROOT / source_manifest["source"]
        source = read_layers(source_path)[source_entry["layer"]]
        width, height = source.size
        selected = []
        count = 0
        for index, (r, g, b, a) in enumerate(source.getdata()):
            x, y = (index % width) / width, (index // width) / height
            in_region = any(left <= x < right and top <= y < bottom for left, top, right, bottom in entry["regions"])
            warm = r >= rule["redMin"] and g >= rule["greenMin"] and b <= rule["blueMax"] and r >= g * rule["redGreenRatio"] and g >= b * rule["greenBlueRatio"]
            core = "brightCoreMin" in rule and min(r, g, b) >= rule["brightCoreMin"] and max(r, g, b) - min(r, g, b) <= rule["brightCoreMaxSpread"]
            lit = in_region and a >= rule["alphaMin"] and (warm or core)
            selected.append((r, g, b, 255) if lit else (0, 0, 0, 0))
            count += int(lit)
        if not 0 < count < width * height * .35:
            raise ValueError(f"Unexpected lighting coverage: {entry['id']} {count}")
        output = Image.new("RGBA", source.size)
        output.putdata(selected)
        buffer = io.BytesIO()
        output.save(buffer, format="PNG", compress_level=9)
        data = buffer.getvalue()
        metadata = {
            "sha256": hashlib.sha256(data).hexdigest(),
            "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
            "logicalSize": {"width": width, "height": height},
            "litPixels": count,
            "bytes": len(data),
        }
        for path in (ROOT / entry["generated"], ROOT / "apps/web/public" / entry["publicPath"].lstrip("/")):
            if check:
                if not path.exists() or path.read_bytes() != data:
                    raise ValueError(f"Stale generated light: {path}")
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
        if check and any(entry.get(key) != value for key, value in metadata.items()):
            raise ValueError(f"Stale lighting manifest: {entry['id']}")
        entry.update(metadata)
        print(f"{'CHECK' if check else 'BUILT'} {entry['id']}: {count} lit pixels")
    if not check:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    build(parser.parse_args().check)
