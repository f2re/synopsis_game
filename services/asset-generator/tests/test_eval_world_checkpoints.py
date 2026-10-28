from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from PIL import Image  # noqa: E402

from eval_world_checkpoints import (  # noqa: E402
    DEFAULT_PROMPTS,
    EvalSet,
    automatic_metrics,
    composition_similarity,
    find_checkpoints,
    load_eval_set,
    write_scorecard,
)


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


def _stripes(path: Path, vertical: bool) -> None:
    image = Image.new("L", (64, 36))
    for x in range(64):
        for y in range(36):
            image.putpixel((x, y), 255 if ((x if vertical else y) // 8) % 2 else 0)
    image.save(path)


class MetricTests(unittest.TestCase):
    def test_same_layout_scores_one_and_different_layout_scores_low(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _stripes(root / "a.png", True)
            _stripes(root / "b.png", True)
            _stripes(root / "c.png", False)
            self.assertAlmostEqual(composition_similarity(root / "a.png", root / "b.png"), 1.0, places=3)
            self.assertLess(composition_similarity(root / "a.png", root / "c.png"), 0.5)

    def test_scorecard_reports_a_stock_composition_and_leaves_manual_columns_empty(self):
        eval_set = EvalSet((("p1", "x"), ("p2", "y")), (1, 2), "", 64, 32)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "ckpt").mkdir()
            for prompt in ("p1", "p2"):
                for seed in (1, 2):
                    _stripes(root / "ckpt" / f"{prompt}_s{seed}.png", True)  # identical everywhere = overfit
            auto = automatic_metrics(eval_set, root / "ckpt")
            self.assertAlmostEqual(auto["seed_diversity"], 0.0, places=3)
            self.assertAlmostEqual(auto["cross_prompt_similarity"], 1.0, places=3)
            lines = write_scorecard(eval_set, root, ["ckpt"]).read_text(encoding="utf-8").splitlines()
            self.assertEqual(lines[0].split(",")[0:3], ["checkpoint", "seed_diversity", "cross_prompt_similarity"])
            self.assertTrue(lines[1].startswith("ckpt,0.000,1.000,,,,,,"))


if __name__ == "__main__":
    unittest.main()
