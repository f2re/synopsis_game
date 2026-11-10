#!/usr/bin/env python3
"""Rebuild the R01 SpriteCook assets from editable RGBA Aseprite layers.

No AI call, interpolation, colour quantization or background reconstruction occurs
in this build. The one-time --import-source command wraps the reviewed downloaded
PNGs in editable layers. Normal builds read those .aseprite files, never the PNG
previews. The small reader deliberately rejects animation/group/blend features it
does not implement instead of silently flattening them incorrectly.

Format: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import struct
import zlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFESTS = ("ui.hub-r01.json", "hub.r01-buildings.json", "hub.r01-landscape.json", "hub.r01-ground.json", "hub.r01-props.json")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def chunk(kind: int, payload: bytes) -> bytes:
    return struct.pack("<IH", len(payload) + 6, kind) + payload


def string(value: str) -> bytes:
    data = value.encode("utf-8")
    return struct.pack("<H", len(data)) + data


def import_source(manifest: dict) -> None:
    """Create a real one-frame editable Aseprite document, one layer per part."""
    source = ROOT / manifest["source"]
    if source.exists():
        raise ValueError(f"Refusing to overwrite editable source: {source}")
    parts = []
    width = height = 1
    for entry in manifest["assets"]:
        image = Image.open(ROOT / entry["source_png"]).convert("RGBA")
        rect = entry["source_rect"]
        x, y = rect["x"], rect["y"]
        width, height = max(width, x + image.width), max(height, y + image.height)
        parts.append((entry["layer"], x, y, image))
    chunks = []
    # sRGB colour profile, no special fixed gamma.
    chunks.append(chunk(0x2007, struct.pack("<HHI8x", 1, 0, 0)))
    for index, (name, x, y, image) in enumerate(parts):
        # Visible + editable normal image layer, normal blend mode, full opacity.
        chunks.append(chunk(0x2004, struct.pack("<6HB3x", 3, 0, 0, 0, 0, 0, 255) + string(name)))
        cel = struct.pack("<HhhBHh5xHH", index, x, y, 255, 2, 0, image.width, image.height)
        chunks.append(chunk(0x2005, cel + zlib.compress(image.tobytes(), 9)))
    body = b"".join(chunks)
    frame = struct.pack("<IHHH2xI", len(body) + 16, 0xF1FA, len(chunks), 100, 0) + body
    header = bytearray(128)
    struct.pack_into("<IHHHHHIH", header, 0, 128 + len(frame), 0xA5E0, 1, width, height, 32, 1, 100)
    header[34:36] = bytes((1, 1))
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_bytes(bytes(header) + frame)


def read_layers(path: Path) -> dict[str, Image.Image]:
    data = path.read_bytes()
    size, magic, frames, _w, _h, depth = struct.unpack_from("<I5H", data)
    if size != len(data) or magic != 0xA5E0 or frames != 1 or depth != 32:
        raise ValueError(f"Expected a valid one-frame RGBA Aseprite file: {path}")
    frame_size, frame_magic, old_count = struct.unpack_from("<IHH", data, 128)
    count = struct.unpack_from("<I", data, 140)[0] or old_count
    if frame_magic != 0xF1FA or frame_size + 128 != len(data):
        raise ValueError(f"Invalid frame: {path}")
    layers: list[str] = []
    result = {}
    pos = 144
    for _ in range(count):
        length, kind = struct.unpack_from("<IH", data, pos)
        if length < 6 or pos + length > len(data):
            raise ValueError("Invalid Aseprite chunk length")
        payload = data[pos + 6:pos + length]
        if kind == 0x2004:
            _flags, layer_type, child_level, _lw, _lh, blend, opacity = struct.unpack_from("<6HB", payload)
            if layer_type != 0 or child_level != 0 or blend != 0 or opacity != 255:
                raise ValueError("Export supports only ordinary full-opacity image layers")
            name_length = struct.unpack_from("<H", payload, 16)[0]
            name = payload[18:18 + name_length].decode("utf-8")
            if name in layers:
                raise ValueError(f"Duplicate source layer {name}")
            layers.append(name)
        elif kind == 0x2005:
            index, _x, _y, opacity, cel_type = struct.unpack_from("<HhhBH", payload)
            if cel_type not in (0, 2) or opacity != 255 or index >= len(layers):
                raise ValueError("Export supports full-opacity raw/compressed image cels only")
            width, height = struct.unpack_from("<HH", payload, 16)
            raw = payload[20:] if cel_type == 0 else zlib.decompress(payload[20:])
            if len(raw) != width * height * 4 or layers[index] in result:
                raise ValueError("Invalid or duplicate image cel")
            result[layers[index]] = Image.frombytes("RGBA", (width, height), raw)
        pos += length
    if pos != len(data):
        raise ValueError("Unexpected trailing Aseprite data")
    return result


def build(manifest_path: Path, check: bool) -> tuple[int, list[dict]]:
    manifest = json.loads(manifest_path.read_text())
    layers = read_layers(ROOT / manifest["source"])
    entries = []
    for asset in manifest["assets"]:
        image = layers[asset["layer"]].copy()
        size = asset["logicalSize"]
        if image.size != (size["width"], size["height"]):
            raise ValueError(f"Update manifest dimensions after resizing source: {asset['id']}")
        cutoff = asset.get("alphaCutoff")
        if cutoff is not None:
            image.putalpha(image.getchannel("A").point(lambda value: 255 if value >= cutoff else 0))
        # Clear RGB only where alpha is zero; visible colours stay byte-identical.
        raw = bytearray(image.tobytes())
        for offset in range(0, len(raw), 4):
            if raw[offset + 3] == 0:
                raw[offset:offset + 3] = b"\x00\x00\x00"
        image = Image.frombytes("RGBA", image.size, bytes(raw))
        output = io.BytesIO()
        image.save(output, format="PNG", optimize=False, compress_level=9)
        data = output.getvalue()
        sha = digest(data)
        paths = (ROOT / asset["generated"], ROOT / "apps/web/public" / asset["publicPath"].lstrip("/"))
        for path in paths:
            if check:
                if not path.exists() or path.read_bytes() != data:
                    raise ValueError(f"Stale or missing generated asset: {path.relative_to(ROOT)}")
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                if not path.exists() or path.read_bytes() != data:
                    path.write_bytes(data)
        if check and asset.get("sha256") != sha:
            raise ValueError(f"Manifest checksum mismatch: {asset['id']}")
        asset["sha256"], asset["sha12"], asset["bytes"] = sha, sha[:12], len(data)
        original = ROOT / asset["source_png"]
        original_sha = digest(original.read_bytes())
        if check and asset.get("sourceSha256") != original_sha:
            raise ValueError(f"Provider-source checksum mismatch: {asset['id']}")
        asset["sourceSha256"] = original_sha
        entries.append({"asset_id": asset["asset_id"], "sha12": asset["sourceSha256"][:12], "label": asset["source_png"]})
    source_sha = digest((ROOT / manifest["source"]).read_bytes())
    if check and manifest.get("sourceSha256") != source_sha:
        raise ValueError(f"Source checksum changed: {manifest_path.name}")
    manifest["sourceSha256"] = source_sha
    if not check:
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"{'CHECK' if check else 'BUILT'} {manifest['id']}: {len(manifest['assets'])} assets")
    return len(manifest["assets"]), entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify byte-identical committed outputs without writing")
    parser.add_argument("--import-source", action="store_true", help="One-time PNG import; never overwrites an editable source")
    args = parser.parse_args()
    if args.check and args.import_source:
        parser.error("--check and --import-source cannot be combined")
    entries = []
    for name in MANIFESTS:
        path = ROOT / "assets/manifests" / name
        if not path.exists():
            continue
        manifest = json.loads(path.read_text())
        if args.import_source and not (ROOT / manifest["source"]).exists():
            import_source(manifest)
        _, found = build(path, args.check)
        entries.extend(found)
    if not entries:
        raise ValueError("No R01 assets were built")
    approval_path = ROOT / "packages/world-engine/src/assets/hub/r01-approval.json"
    if args.check and approval_path.exists():
        approval = json.loads(approval_path.read_text())
        if approval.get("artAcceptance") == "PASS":
            for asset in approval["assets"] + approval.get("optionalAssets", []):
                if asset.get("enabled", True) is False:
                    continue
                public = ROOT / "apps/web/public" / asset["url"].lstrip("/")
                if asset.get("status") != "approved" or digest(public.read_bytes()) != asset.get("sha256"):
                    raise ValueError(f"Approved-image checksum mismatch: {asset['id']}")
            review = approval.get("review")
            if not isinstance(review, str) or not (ROOT / review).is_file():
                raise ValueError("Approved R01 collection must cite an independent review file")
    if not args.check:
        path = ROOT / "assets/manifests/spritecook-assets.json"
        current = json.loads(path.read_text()) if path.exists() else {"id": "spritecook.assets", "assets": []}
        # Stable asset ID + local hash, no expiring URLs, auth or account details.
        indexed = {(a["asset_id"], a.get("label", "")): a for a in current["assets"]}
        for entry in entries:
            indexed[(entry["asset_id"], entry["label"])] = {"id": entry["label"], **entry}
        current["assets"] = list(indexed.values())
        path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
