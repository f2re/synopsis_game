from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.world_style_dataset import (  # noqa: E402
    LEGACY_STYLE_TAIL,
    WORLD_TRIGGER,
    WorldSpec,
    build_world_style_dataset,
    caption_for,
    validate_specs,
)


def spec(path: Path, *, asset_id: str = "world_a", lineage: str = "source-a") -> WorldSpec:
    return WorldSpec(
        id=asset_id,
        path=path,
        caption="wide campus exterior, daylight, low cloudy sky",
        lineage=lineage,
        category="exterior",
        lighting="day",
        season="summer",
        weather="cloudy",
    )


class WorldCaptionTests(unittest.TestCase):
    def test_uses_scoped_trigger_without_legacy_tail(self):
        text = caption_for("wide campus exterior, daylight")
        self.assertEqual(text, f"{WORLD_TRIGGER}, wide campus exterior, daylight")
        self.assertNotIn("synopsis_pixel_art", text)
        self.assertNotIn(LEGACY_STYLE_TAIL, text)

    def test_rejects_legacy_mixed_trigger(self):
        with self.assertRaises(ValueError):
            caption_for("synopsis_pixel_art, a campus")


class WorldSpecTests(unittest.TestCase):
    def test_rejects_non_world_ids_and_more_than_three_crops_per_lineage(self):
        dummy = Path("unused.png")
        with self.assertRaises(ValueError):
            validate_specs([spec(dummy, asset_id="icon_weather_32")])
        with self.assertRaises(ValueError):
            validate_specs([spec(dummy, asset_id=f"scene_{i}", lineage="same") for i in range(4)])

    def test_rejects_flip_assets(self):
        with self.assertRaises(ValueError):
            validate_specs([spec(Path("unused.png"), asset_id="campus_flip")])


class WorldBuildTests(unittest.TestCase):
    def test_nearest_only_downscale_preserves_source_colours(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            image = Image.new("RGB", (1024, 512))
            pixels = image.load()
            for x in range(image.width):
                colour = (255, 0, 0) if x < image.width // 2 else (0, 0, 255)
                for y in range(image.height):
                    pixels[x, y] = colour
            source = root / "source.png"
            image.save(source)
            report = build_world_style_dataset([spec(source)], root / "out", max_side=512)
            trained = Image.open(root / "out" / "world_a.png").convert("RGB")
            self.assertEqual(trained.size, (512, 256))
            self.assertLessEqual(set(trained.getdata()), {(255, 0, 0), (0, 0, 255)})
            self.assertEqual(report["resampling"], "nearest-only")
            self.assertEqual(report["augmentation"], "none")
            row = json.loads((root / "out" / "metadata.jsonl").read_text().strip())
            self.assertTrue(row["text"].startswith(f"{WORLD_TRIGGER}, "))

    def test_rejects_transparent_object_sheet(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "transparent.png"
            Image.new("RGBA", (256, 256), (255, 0, 0, 0)).save(source)
            with self.assertRaises(ValueError):
                build_world_style_dataset([spec(source)], root / "out")

    def test_report_marks_small_dataset_as_seed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source.png"
            Image.new("RGB", (480, 270), (20, 40, 60)).save(source)
            report = build_world_style_dataset([spec(source)], root / "out")
            self.assertEqual(report["dataset_version"], "world-style-v4")
            self.assertEqual(report["status"], "seed")
            self.assertEqual(report["recommended_min_images"], 80)


if __name__ == "__main__":
    unittest.main()
