from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.prompt_compiler import compile_generation_prompts  # noqa: E402


class SkyLayerPromptTests(unittest.TestCase):
    def test_all_sky_phases_keep_clouds_in_their_own_layer(self):
        ramps = {
            "DAY": ("#5E8FC4", "#C4DDF0"),
            "DAWN": ("#263B66", "#7A4C80", "#E08A7A", "#F4B98A"),
            "GOLDEN": ("#8DB7DE", "#F4B98A", "#E6C07A"),
            "DUSK": ("#18284D", "#4B3A6E", "#B2607F"),
            "NIGHT": ("#070D1E", "#263B66"),
            "WHITENIGHT": ("#3A5383", "#C4DDF0", "#F4B98A"),
        }
        for phase, colors in ramps.items():
            with self.subTest(phase=phase):
                positive, negative, metadata = compile_generation_prompts(
                    f"HUB-L0-SKY-{phase}", {"size": [480, 270], "alpha": "opaque"}
                )
                self.assertIn("no clouds, sun, moon, stars", positive)
                self.assertNotIn("stratocumulus", positive)
                self.assertNotIn("foliage", positive)
                self.assertNotIn("simple shapes", negative)
                self.assertIn("2x2 ordered dithering", positive)
                self.assertIn("y=96 of 270", positive)
                for color in colors:
                    self.assertIn(color, positive)
                self.assertEqual(metadata["framing"], "isolated_sky_layer")
