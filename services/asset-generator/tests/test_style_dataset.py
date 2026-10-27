from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.style_dataset import (  # noqa: E402
    STYLE_TAIL,
    TRIGGER_WORD,
    CropSpec,
    build_style_dataset,
    caption_for,
    square_crops,
)


class SquareCropTests(unittest.TestCase):
    def test_wide_image_gives_evenly_spaced_full_height_squares(self):
        boxes = square_crops((1672, 941), 3)
        self.assertEqual(boxes[0], (0, 0, 941, 941))
        self.assertEqual(boxes[-1], (731, 0, 1672, 941))
        self.assertEqual(len(boxes), 3)
        for x0, y0, x1, y1 in boxes:
            self.assertEqual((x1 - x0, y1 - y0), (941, 941))
        steps = [boxes[i + 1][0] - boxes[i][0] for i in range(2)]
        self.assertLessEqual(max(steps) - min(steps), 1)  # integer offsets differ by at most a pixel

    def test_square_image_gives_a_single_crop_whatever_is_asked(self):
        self.assertEqual(square_crops((1254, 1254), 3), [(0, 0, 1254, 1254)])

    def test_tall_image_crops_along_the_height(self):
        boxes = square_crops((800, 1200), 2)
        self.assertEqual(boxes, [(0, 0, 800, 800), (0, 400, 800, 1200)])

    def test_one_crop_is_centred(self):
        self.assertEqual(square_crops((1672, 941), 1), [(365, 0, 1306, 941)])


class CaptionTests(unittest.TestCase):
    def test_caption_starts_with_the_trigger_and_ends_with_the_style_tail_once(self):
        text = caption_for("a lit hub at dusk")
        self.assertTrue(text.startswith(f"{TRIGGER_WORD}, a lit hub at dusk"))
        self.assertTrue(text.endswith(STYLE_TAIL))
        self.assertEqual(caption_for(text.removeprefix(f"{TRIGGER_WORD}, ")).count(STYLE_TAIL), 1)


class BuildDatasetTests(unittest.TestCase):
    def test_keeps_whole_images_and_rectangles_and_only_squares_when_asked(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (1672, 941), (90, 60, 120)).save(root / "wide.png")
            Image.new("RGB", (1254, 1254), (200, 190, 180)).save(root / "square.png")
            out = root / "dataset"
            specs = [
                CropSpec("whole_scene", root / "wide.png", "a wide scene"),
                CropSpec("square_item", root / "square.png", "an item"),
                CropSpec("ui_region", root / "wide.png", "a cut region", box=(100, 100, 900, 700)),
                CropSpec("three_squares", root / "wide.png", "three views", crops=3),
            ]
            report = build_style_dataset(specs, out)
            rows = [json.loads(line) for line in (out / "metadata.jsonl").read_text().splitlines()]
            self.assertEqual(report["images"], 6)
            self.assertTrue(all(row["text"].startswith(TRIGGER_WORD) for row in rows))
            sizes = {row["file_name"]: Image.open(out / row["file_name"]).size for row in rows}
            self.assertEqual(sizes["whole_scene.png"], (1672, 941))  # composition kept for the caption
            self.assertEqual(sizes["square_item.png"], (1254, 1254))
            self.assertEqual(sizes["ui_region.png"], (800, 600))  # a rectangle stays a rectangle
            self.assertEqual({sizes[f"three_squares_c{i}.png"] for i in range(3)}, {(941, 941)})
            self.assertEqual(len(set(sizes)), 6)

    def test_very_large_images_are_capped_on_the_long_side(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (4000, 2000), (1, 2, 3)).save(root / "huge.png")
            build_style_dataset([CropSpec("huge", root / "huge.png", "c")], root / "out", max_side=2048)
            self.assertEqual(Image.open(root / "out" / "huge.png").size, (2048, 1024))

    def test_refuses_a_missing_source_and_a_non_empty_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(FileNotFoundError):
                build_style_dataset([CropSpec("x", root / "none.png", "c")], root / "out")
            (root / "full").mkdir()
            (root / "full" / "f.txt").write_text("x")
            Image.new("RGB", (64, 64)).save(root / "a.png")
            with self.assertRaises(ValueError):
                build_style_dataset([CropSpec("a", root / "a.png", "c")], root / "full")


if __name__ == "__main__":
    unittest.main()
