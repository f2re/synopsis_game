from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from eval_world_checkpoints import DEFAULT_PROMPTS, find_checkpoints, load_eval_set  # noqa: E402


class EvalSetTests(unittest.TestCase):
    def test_default_set_is_valid_and_covers_the_acceptance_groups(self):
        eval_set = load_eval_set(DEFAULT_PROMPTS)
        ids = {prompt_id for prompt_id, _ in eval_set.prompts}
        self.assertTrue({"known_context", "new_composition", "novel_workshop", "interior_archive",
                         "weather_snow", "time_day", "time_twilight"} <= ids)
        self.assertGreaterEqual(len(eval_set.seeds), 2)
        for _, text in eval_set.prompts:
            self.assertNotIn("synopsis_", text)  # the script adds the trigger itself

    def test_interior_prompts_keep_the_main_building_out(self):
        texts = dict(load_eval_set(DEFAULT_PROMPTS).prompts)
        self.assertIn("no radar dome", texts["interior_archive"])


class CheckpointDiscoveryTests(unittest.TestCase):
    def test_checkpoints_are_sorted_numerically_and_final_comes_last(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for step in (500, 100, 200):
                (root / f"checkpoint-{step}").mkdir()
                (root / f"checkpoint-{step}" / "pytorch_lora_weights.safetensors").write_bytes(b"x")
            (root / "checkpoint-300").mkdir()  # no weights inside: skipped
            (root / "pytorch_lora_weights.safetensors").write_bytes(b"x")
            names = [name for name, _ in find_checkpoints(root)]
            self.assertEqual(names, ["checkpoint-100", "checkpoint-200", "checkpoint-500", "final"])


if __name__ == "__main__":
    unittest.main()
