from __future__ import annotations

import sys
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.horizon_strip import place_horizon_strip  # noqa: E402
from core.z_image_runner import _generation_size  # noqa: E402


class HorizonStripTests(unittest.TestCase):
    def test_strip_is_placed_on_transparent_canvas_with_no_cropping(self):
        self.assertEqual(_generation_size(480, 34), (1808, 128))
        image = Image.new("RGB", (1808, 128), (22, 66, 88))
        ImageDraw.Draw(image).rectangle((0, 0, 6, 6), fill=(255, 0, 0))
        result = place_horizon_strip(image)
        self.assertEqual(result.size, (480, 270))
        self.assertEqual(result.getchannel("A").getbbox(), (0, 70, 480, 104))
        self.assertEqual(result.getpixel((0, 70)), (255, 0, 0, 255))
        self.assertEqual(result.getpixel((479, 103)), (22, 66, 88, 255))

    def test_rejects_wrong_aspect_and_transparent_strips(self):
        with self.assertRaises(ValueError):
            place_horizon_strip(Image.new("RGB", (1024, 128)))
        with self.assertRaises(ValueError):
            place_horizon_strip(Image.new("RGBA", (480, 34)))
