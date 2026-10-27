from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core import z_image_runner  # noqa: E402
from core.lora_trainer import build_lora_dataset  # noqa: E402
from core.pixel_refiner import refine_pixel_candidate  # noqa: E402
from core.prompt_compiler import compile_generation_prompts  # noqa: E402
from core.quality_review import evaluate_asset_candidate  # noqa: E402
from core.work_storage import WorkStorage  # noqa: E402


class PipelineContractTests(unittest.TestCase):
    def test_semantic_icons_and_sky_phases(self):
        spec = {"size": [32, 32], "alpha": "transparent"}
        unlock, _, _ = compile_generation_prompts("ICON-UNLOCK", spec)
        clock, _, _ = compile_generation_prompts("ICON-CLOCK", spec)
        self.assertIn("open brass padlock", unlock)
        self.assertIn("clock face", clock)
        sky, _, meta = compile_generation_prompts("HUB-L0-SKY-NIGHT", {"size": [480, 270]})
        self.assertIn("night sky", sky)
        self.assertNotIn("26063", sky)
        self.assertNotIn("STYLE LOCK", sky)
        self.assertIn("Blank sky only", sky)
        self.assertNotIn("amber windows", sky)
        self.assertEqual(meta["framing"], "isolated_sky_layer")

    def test_raw_matte_and_no_automatic_art_pass(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "raw.png"
            img = Image.new("RGB", (256, 256), (30, 36, 48))
            ImageDraw.Draw(img).rectangle((64, 64, 191, 191), fill=(240, 230, 210))
            img.save(path)
            spec = {"id": "ICON-JOURNAL", "size": [32, 32], "alpha": "transparent"}
            report = evaluate_asset_candidate(path, spec, is_raw=True)
            self.assertAlmostEqual(report["metrics"]["occupancy_x"], 0.5, delta=0.02)
            self.assertEqual(report["art_status"]["value"], "pending")
            empty = Path(tmp) / "empty.png"
            Image.new("RGBA", (32, 32)).save(empty)
            report = evaluate_asset_candidate(empty, spec, art_verdict_override={"status": "pass"})
            self.assertEqual(report["technical_status"]["value"], "fail")

    def test_refinement_keeps_icon_shape_and_binary_alpha(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Image.new("RGB", (256, 256), (30, 36, 48))
            draw = ImageDraw.Draw(source)
            draw.rectangle((48, 56, 207, 200), fill=(238, 224, 190))
            draw.rectangle((122, 56, 132, 200), fill=(65, 45, 30))
            output = Path(tmp) / "icon.png"
            result = refine_pixel_candidate(source, {"id": "ICON-JOURNAL", "size": [32, 32],
                                                       "alpha": "transparent"}, [(0, 0, 0)], output)
            image = Image.open(output).convert("RGBA")
            self.assertEqual(image.size, (32, 32))
            self.assertEqual(result["alphas"], [0, 255])
            self.assertGreater(sum(pixel[3] == 255 for pixel in image.getdata()), 150)
            self.assertGreater(result["colors_used"], 1)

    def test_storage_keeps_runs_and_rejects_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            storage = WorkStorage("ICON-JOURNAL", Path(tmp))
            with self.assertRaises(ValueError):
                WorkStorage("../escape", Path(tmp))
            with self.assertRaises(ValueError):
                storage.resolve_candidate("../../other.png")
            first = storage.get_raw_path(storage.next_candidate_index())
            first.write_bytes(b"first")
            storage.record_generation({}, "prompt", "", {}, [first], [0], "test", "generated_raw")
            self.assertEqual(storage.next_candidate_index(), 2)
            self.assertEqual(storage.latest_raw_candidates(), [first])
            storage.record_generation({}, "failed", "", {}, [], [], "test", "failed")
            self.assertEqual(storage.latest_raw_candidates(), [])
            self.assertEqual(first.read_bytes(), b"first")

    def test_real_turbo_options(self):
        class Generator:
            def __init__(self, **_kwargs): pass
            def manual_seed(self, _seed): return self

        class Pipeline:
            def enable_model_cpu_offload(self, **_kwargs): pass
            def __call__(self, **kwargs):
                self.kwargs = kwargs
                return types.SimpleNamespace(images=[Image.new("RGB", (kwargs["width"], kwargs["height"]))])

        pipeline = Pipeline()
        fake_torch = types.SimpleNamespace(bfloat16="bf16", Generator=Generator)
        fake_diffusers = types.SimpleNamespace(ZImagePipeline=types.SimpleNamespace(from_pretrained=lambda *_a, **_k: pipeline))
        with tempfile.TemporaryDirectory() as tmp, patch.dict(sys.modules, {"torch": fake_torch, "diffusers": fake_diffusers}), \
                patch.object(z_image_runner, "is_z_image_available", return_value=True), \
                patch.object(z_image_runner, "_pipeline", None):
            self.assertTrue(z_image_runner.generate_z_image_candidate("book", Path(tmp) / "out.png", 32, 32,
                                                                      seed=0, negative_prompt="text"))
        self.assertEqual(pipeline.kwargs["guidance_scale"], 0.0)
        self.assertEqual(pipeline.kwargs["num_inference_steps"], 9)
        self.assertEqual((pipeline.kwargs["width"], pipeline.kwargs["height"]), (1024, 1024))
        self.assertNotIn("negative_prompt", pipeline.kwargs)

    def test_training_manifest_requires_evidence_and_preserves_captions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "assets/source/ui"
            source.mkdir(parents=True)
            evidence = root / "assets/reviews"
            evidence.mkdir(parents=True)
            entries = []
            for index in range(3):
                asset_id = f"icon-{index}"
                image = source / f"{asset_id}.png"
                Image.new("RGB", (16, 16), (index * 20, 20, 30)).save(image)
                digest = hashlib.sha256(image.read_bytes()).hexdigest()
                rights = {"asset_id": asset_id, "sha256": digest, "license": "CC0-1.0", "origin": "test"}
                (evidence / f"{asset_id}-rights.json").write_text(json.dumps(rights))
                reviews = []
                for role in ("pixel-art-quality-reviewer", "art-director"):
                    review = {"asset_id": asset_id, "sha256": digest, "role": role,
                              "reviewer_id": role, "status": "pass"}
                    name = f"{asset_id}-{role}.json"
                    (evidence / name).write_text(json.dumps(review))
                    reviews.append({**review, "evidence": f"assets/reviews/{name}"})
                entries.append({"id": asset_id, "path": f"assets/source/ui/{asset_id}.png", "sha256": digest,
                                "license": "CC0-1.0", "origin": "test", "author_id": "artist",
                                "rights_evidence": f"assets/reviews/{asset_id}-rights.json",
                                "caption": "weather instrument icon", "reviews": reviews})
            manifest = root / "training.json"
            manifest.write_text(json.dumps({"assets": entries}))
            stats = build_lora_dataset(root, manifest, root / "dataset")
            self.assertEqual(stats["total_images"], 3)
            self.assertEqual(len((root / "dataset/metadata.jsonl").read_text().splitlines()), 3)
            entries[0]["path"] = "assets/source/../../assets/work/rejected.png"
            manifest.write_text(json.dumps({"assets": entries}))
            with self.assertRaises((ValueError, FileNotFoundError)):
                build_lora_dataset(root, manifest, root / "another-dataset")


if __name__ == "__main__":
    unittest.main()
