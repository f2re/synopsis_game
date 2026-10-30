from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.prompt_compiler import compile_generation_prompts  # noqa: E402


class PropPromptIsolationTests(unittest.TestCase):
    def test_prop_keeps_subject_without_campus_scenery(self):
        spec = {"size": [24, 16], "prompt": "White louvered meteorological shelter"}
        positive, negative, metadata = compile_generation_prompts(
            "PROP-STEVENSON", spec, correction="raised on four legs"
        )
        self.assertIn("White louvered meteorological shelter", positive)
        self.assertIn("raised on four legs", positive)
        self.assertIn("no buildings, trees, landscape", positive)
        self.assertNotIn("terracotta brick facades", positive)
        self.assertIn("building", negative)
        self.assertEqual(metadata["framing"], "prop_centered")

    def test_known_props_retain_distinct_subjects_without_correction(self):
        spec = {"size": [24, 16]}
        shelter, _, _ = compile_generation_prompts("PROP-STEVENSON", spec)
        bench, _, _ = compile_generation_prompts("PROP-BENCH", spec)
        self.assertIn("louvered meteorological instrument shelter", shelter)
        self.assertIn("wooden park bench", bench)
        self.assertNotEqual(shelter, bench)
