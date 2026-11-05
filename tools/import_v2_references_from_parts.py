#!/usr/bin/env python3
"""Reconstitute source PNGs from transport-only Git blobs (runs once in GitHub Actions)."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "design" / "pixel-art" / "v2"
STAGING = BASE / "_transfer"
MANIFEST = BASE / "manifest.json"


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    images: dict[Path, bytes] = {}
    for entry in data["images"]:
        target = ROOT / entry["path"]
        if target.parent != BASE:
            raise RuntimeError(f"Unsafe destination: {target}")
        parts = sorted(STAGING.glob(f"{target.name}.part*"))
        if len(parts) not in (3, 4):
            raise RuntimeError(f"Expected 3-4 parts for {target.name}; found {len(parts)}")
        if [p.name for p in parts] != [f"{target.name}.part{i:02}" for i in range(len(parts))]:
            raise RuntimeError(f"Non-contiguous part set: {target.name}")
        raw = b"".join(p.read_bytes() for p in parts)
        digest = hashlib.sha256(raw).hexdigest()
        dimensions = struct.unpack(">II", raw[16:24]) if len(raw) >= 24 else None
        if digest != entry["sha256"] or len(raw) != entry["size_bytes"]:
            raise RuntimeError(f"Source bytes mismatch for {target.name}")
        if raw[:8] != b"\x89PNG\r\n\x1a\n" or raw[12:16] != b"IHDR" or dimensions != (1672, 941):
            raise RuntimeError(f"Invalid PNG structure for {target.name}")
        images[target] = raw
    for dest, raw in images.items():
        dest.write_bytes(raw)
        print(f"PASS {dest.relative_to(ROOT)} ({len(raw)} bytes)")
    for part in STAGING.glob("*.part*"):
        part.unlink()
    STAGING.rmdir()
    print("PASS: all six exact PNGs materialized; transport files removed")


if __name__ == "__main__":
    main()
