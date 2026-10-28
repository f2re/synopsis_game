from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from rank_world_checkpoints import Row, rank  # noqa: E402


def row(name: str, *, iso: float = 5, adh: float = 5, sim: float = 0.3, style: float = 3, weather: float = 3, div: float = 0.4) -> Row:
    return Row(name, {"interior_isolation_archive": iso, "interior_isolation_hall": iso,
                      "prompt_adherence_workshop": adh, "prompt_adherence_radar_low_angle": adh,
                      "cross_prompt_similarity": sim, "style_fidelity": style, "weather_transfer": weather,
                      "seed_diversity": div})


class RankTests(unittest.TestCase):
    def test_prettier_checkpoint_with_a_leaking_interior_is_vetoed(self):
        rows = [row("baseline", style=1), row("checkpoint-200", style=3), row("checkpoint-300", style=3),
                row("checkpoint-500", style=5, iso=2)]
        passed, failures = rank(rows)
        self.assertEqual([r.name for r in passed][0], "checkpoint-200")
        self.assertIn("interior_isolation", failures["checkpoint-500"])

    def test_rising_cross_prompt_similarity_vetoes_late_checkpoints(self):
        rows = [row("checkpoint-200", sim=0.3), row("checkpoint-300", sim=0.3), row("checkpoint-500", sim=0.6, style=5)]
        passed, failures = rank(rows)
        self.assertEqual(failures["checkpoint-500"], ["cross_prompt_similarity"])
        self.assertNotIn("checkpoint-500", [r.name for r in passed])

    def test_ties_among_survivors_break_by_style_then_weather_then_diversity(self):
        rows = [row("checkpoint-200", style=3, weather=4), row("checkpoint-300", style=4, weather=2),
                row("checkpoint-400", style=4, weather=4, div=0.2), row("checkpoint-100", style=4, weather=4, div=0.5)]
        passed, _ = rank(rows)
        self.assertEqual([r.name for r in passed], ["checkpoint-100", "checkpoint-400", "checkpoint-300", "checkpoint-200"])

    def test_checkpoints_far_above_the_base_model_are_vetoed_even_if_200_and_300_agree(self):
        rows = [Row("baseline", {"cross_prompt_similarity": 0.2}), row("checkpoint-200", sim=0.6),
                row("checkpoint-300", sim=0.6), row("checkpoint-400", sim=0.62)]
        passed, failures = rank(rows)
        self.assertEqual(passed, [])
        self.assertIn("cross_prompt_similarity", failures["checkpoint-200"])

    def test_missing_manual_scores_fail_instead_of_passing(self):
        passed, failures = rank([Row("checkpoint-100", {"cross_prompt_similarity": 0.2})])
        self.assertEqual(passed, [])
        self.assertEqual(sorted(failures["checkpoint-100"]), ["interior_isolation", "prompt_adherence"])


if __name__ == "__main__":
    unittest.main()
