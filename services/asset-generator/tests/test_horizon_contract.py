from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.quality_review import evaluate_asset_candidate  # noqa: E402


class HorizonContractTests(unittest.TestCase):
    def test_thin_band_is_valid_but_outside_pixels_fail_technical_check(self):
        spec = {"id": "HUB-L2-HORIZON", "size": [480, 270], "alpha": "transparent"}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "horizon.png"
            image = Image.new("RGBA", (480, 270), (0, 0, 0, 0))
            ImageDraw.Draw(image).rectangle((0, 70, 479, 103), fill=(25, 55, 75, 255))
            image.save(path)
            valid = evaluate_asset_candidate(path, spec)
            self.assertEqual(valid["technical_status"]["value"], "pass")
            self.assertEqual(valid["metrics"]["outside_band_pixels"], 0)
            self.assertEqual(valid["art_status"]["value"], "pending")
            self.assertFalse(valid["art_status"]["reasons"])

            image.putpixel((100, 269), (20, 20, 20, 255))
            image.save(path)
            invalid = evaluate_asset_candidate(path, spec)
            self.assertEqual(invalid["technical_status"]["value"], "fail")
            self.assertEqual(invalid["metrics"]["outside_band_pixels"], 1)
            self.assertTrue(any("outside required vertical band" in reason
                                for reason in invalid["technical_status"]["reasons"]))

    def test_raw_band_wrong_position_is_diagnostic_not_technical_pass_as_art(self):
        spec = {"id": "HUB-L2-HORIZON", "size": [480, 270], "alpha": "transparent"}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "raw.png"
            image = Image.new("RGBA", (480, 270), (0, 0, 0, 0))
            ImageDraw.Draw(image).rectangle((0, 130, 479, 163), fill=(25, 55, 75, 255))
            image.save(path)
            report = evaluate_asset_candidate(path, spec, is_raw=True)
            self.assertEqual(report["art_status"]["value"], "pending")
            self.assertTrue(any("outside required vertical band" in reason
                                for reason in report["art_status"]["reasons"]))
