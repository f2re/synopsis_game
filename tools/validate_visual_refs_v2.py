#!/usr/bin/env python3
"""Validate V2 user-supplied visual screen references without Pillow.

Run after importing the exact six user-provided PNGs:
    python tools/validate_visual_refs_v2.py
"""
from __future__ import annotations

import hashlib
import pathlib
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REFERENCES = {
    "01_hub.png": "c4c5958ac0948cf4213d9259b9c9952fd73ec77d68832e374f361389b917353c",
    "02_blitz.png": "4a6427dbf5d543af93565fb8f4aef994578273c6ba554d9177826c0186f73610",
    "03_duel.png": "8297be67708e938c4d6b7a86db7a2dbb956c00b3b839ee1328a34af300dd2fb1",
    "04_inventory.png": "a5602a500c17ce7bdb82333c0df7d34f0cf9d79db4e48b634d6e616f9a9668a6",
    "05_tournament.png": "515f2104b054ba32ad83ca7c05beb031879189ec22c726d8e5a3653e15b866b1",
    "06_progression.png": "76568db9bafac4801138ffa70f7603f8c4c14a149fe4e387757e574a92937cfe",
}


def validate(path: pathlib.Path, expected_hash: str) -> list[str]:
    errors = []
    if not path.is_file():
        return ["missing"]
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected_hash:
        errors.append("sha256 mismatch (source modified or wrong file)")
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        errors.append("not a PNG/IHDR stream")
    elif len(data) < 24 or struct.unpack(">II", data[16:24]) != (1672, 941):
        errors.append("unexpected dimensions (must be 1672x941)")
    return errors


def main() -> int:
    errors = 0
    for name, expected_hash in REFERENCES.items():
        path = ROOT / "design" / "pixel-art" / "v2" / name
        messages = validate(path, expected_hash)
        if messages:
            errors += 1
            print(f"FAIL {path.relative_to(ROOT)}: {', '.join(messages)}")
        else:
            print(f"PASS {path.relative_to(ROOT)}")
    if errors:
        print(f"{errors}/6 references failed. Import original PNGs before art review.")
        return 1
    print("PASS: all 6 unchanged V2 screen references available")
    return 0


if __name__ == "__main__":
    sys.exit(main())
