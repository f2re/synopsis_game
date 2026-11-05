#!/usr/bin/env python3
"""Самопроверка безопасности импортёра референсного архива."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zipfile

from import_visual_refs_v2 import import_archive

NAMES = ["01_hub", "02_blitz", "03_duel", "04_inventory", "05_tournament", "06_progression"]


def sample_png(marker: int) -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + struct.pack(">II", 1672, 941) + bytes([marker]) * 11


class ImportReferenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        folder = self.root / "design/pixel-art/v2"
        folder.mkdir(parents=True)
        images = []
        self.blobs = {}
        for i, name in enumerate(NAMES):
            path = f"design/pixel-art/v2/{name}.png"
            data = sample_png(i)
            images.append({"id": name, "path": path, "size_bytes": len(data),
                           "sha256": hashlib.sha256(data).hexdigest(),
                           "width": 1672, "height": 941})
            self.blobs[path] = data
        (folder / "manifest.json").write_text(json.dumps({"images": images}), encoding="utf-8")
        self.archive = self.root / "refs.zip"
        self.rebuild_archive()

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def rebuild_archive(self) -> None:
        with zipfile.ZipFile(self.archive, "w") as z:
            for path, data in self.blobs.items():
                z.writestr(path, data)

    def test_valid_import_is_idempotent(self) -> None:
        self.assertEqual(import_archive(self.archive, self.root), 6)
        self.assertEqual(import_archive(self.archive, self.root), 0)

    def test_mismatch_blocks_all_writes(self) -> None:
        self.blobs["design/pixel-art/v2/03_duel.png"] += b"corruption"
        self.rebuild_archive()
        with self.assertRaisesRegex(ValueError, "Неверный размер"):
            import_archive(self.archive, self.root)
        self.assertFalse((self.root / "design/pixel-art/v2/01_hub.png").exists())

    def test_does_not_overwrite_modified_target(self) -> None:
        target = self.root / "design/pixel-art/v2/01_hub.png"
        target.write_bytes(b"not the source")
        with self.assertRaisesRegex(ValueError, "существует и отличается"):
            import_archive(self.archive, self.root)
        self.assertEqual(target.read_bytes(), b"not the source")


if __name__ == "__main__":
    unittest.main()
