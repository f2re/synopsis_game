from __future__ import annotations

import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core import z_image_runner  # noqa: E402


class FakeGenerator:
    def __init__(self, **_kwargs):
        pass

    def manual_seed(self, seed):
        self.seed = seed
        return self


class FakePipeline:
    def __init__(self):
        self.calls: list[dict] = []
        self.lora: str | None = None

    def enable_model_cpu_offload(self, **_kwargs):
        pass

    def load_lora_weights(self, path, **_kwargs):
        self.lora = str(path)

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        return types.SimpleNamespace(images=[Image.new("RGB", (kwargs["width"], kwargs["height"]))])


def fake_modules(pipeline: FakePipeline, loads: list[str]):
    def from_pretrained(path, *_args, **_kwargs):
        loads.append(str(path))
        return pipeline

    torch = types.SimpleNamespace(bfloat16="bf16", Generator=FakeGenerator)
    diffusers = types.SimpleNamespace(ZImagePipeline=types.SimpleNamespace(from_pretrained=from_pretrained))
    return {"torch": torch, "diffusers": diffusers}


class ModeResolutionTests(unittest.TestCase):
    def resolve(self, backend: str, available: set[str]) -> str | None:
        with patch.object(z_image_runner, "is_z_image_available", side_effect=lambda mode="turbo": mode in available):
            return z_image_runner.resolve_mode(backend)

    def test_auto_prefers_the_style_model_and_falls_back_to_turbo(self):
        self.assertEqual(self.resolve("auto", {"turbo", "style"}), "style")
        self.assertEqual(self.resolve("auto", {"turbo"}), "turbo")
        self.assertIsNone(self.resolve("auto", set()))

    def test_explicit_backends_never_switch_silently(self):
        self.assertEqual(self.resolve("z_image_turbo", {"turbo", "style"}), "turbo")
        self.assertEqual(self.resolve("z_image_style", {"turbo", "style"}), "style")
        self.assertIsNone(self.resolve("z_image_style", {"turbo"}))
        self.assertIsNone(self.resolve("procedural", {"turbo", "style"}))


class StyleModeTests(unittest.TestCase):
    def run_batch(self, count: int, **kwargs):
        pipeline, loads = FakePipeline(), []
        with tempfile.TemporaryDirectory() as tmp, \
                patch.dict(sys.modules, fake_modules(pipeline, loads)), \
                patch.object(z_image_runner, "is_z_image_available", return_value=True), \
                patch.object(z_image_runner, "_pipeline", None), \
                patch.object(z_image_runner, "_style_pipeline", None):
            paths = [Path(tmp) / f"c{i}.png" for i in range(count)]
            done = z_image_runner.generate_z_image_batch(
                "a campus", paths, 480, 270, [1, 2, 3][:count], "cartoon, flat", mode="style", **kwargs)
            written = [p.is_file() for p in paths]
        return pipeline, loads, done, written

    def test_style_mode_uses_base_model_lora_trigger_cfg_and_real_negatives(self):
        pipeline, loads, done, _ = self.run_batch(1)
        self.assertEqual(done, 1)
        self.assertEqual(loads, [str(z_image_runner.STYLE_BASE_DIR)])
        self.assertEqual(pipeline.lora, str(z_image_runner.STYLE_LORA_DIR))
        call = pipeline.calls[0]
        self.assertTrue(call["prompt"].startswith("synopsis_pixel_art, "))
        self.assertEqual(call["guidance_scale"], 4.0)
        self.assertEqual(call["num_inference_steps"], 30)
        self.assertEqual(call["negative_prompt"], "cartoon, flat")
        self.assertEqual((call["width"], call["height"]), (1024, 576))

    def test_one_call_loads_the_model_once_for_all_candidates(self):
        pipeline, loads, done, written = self.run_batch(3)
        self.assertEqual(done, 3)
        self.assertEqual(len(loads), 1)
        self.assertEqual(len(pipeline.calls), 3)
        self.assertTrue(all(written))

    def test_turbo_stays_the_default_and_ignores_negatives(self):
        pipeline, loads = FakePipeline(), []
        with tempfile.TemporaryDirectory() as tmp, \
                patch.dict(sys.modules, fake_modules(pipeline, loads)), \
                patch.object(z_image_runner, "is_z_image_available", return_value=True), \
                patch.object(z_image_runner, "_pipeline", None):
            self.assertTrue(z_image_runner.generate_z_image_candidate(
                "book", Path(tmp) / "out.png", 32, 32, seed=0, negative_prompt="text"))
        call = pipeline.calls[0]
        self.assertEqual(call["guidance_scale"], 0.0)
        self.assertEqual(call["num_inference_steps"], 9)
        self.assertNotIn("negative_prompt", call)
        self.assertFalse(call["prompt"].startswith("synopsis_pixel_art"))
        self.assertIsNone(pipeline.lora)


class SubprocessCommandTests(unittest.TestCase):
    def test_comfy_command_carries_mode_outputs_and_seeds(self):
        command = z_image_runner._comfy_command(
            "a campus", [Path("/o/a.png"), Path("/o/b.png")], 480, 270, [7, 24], 30, "cartoon", "style")
        joined = " ".join(command)
        self.assertIn("--mode style", joined)
        self.assertIn("--outputs /o/a.png /o/b.png", joined)
        self.assertIn("--seeds 7 24", joined)
        self.assertIn("--steps 30", joined)


if __name__ == "__main__":
    unittest.main()
