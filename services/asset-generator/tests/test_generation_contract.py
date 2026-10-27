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

    def test_ui_icon_refinement_is_flat_and_within_palette_range(self):
        from PIL import ImageFilter

        with tempfile.TemporaryDirectory() as tmp:
            # Soft-edged 1024px source, like a real generator output.
            source = Image.new("RGB", (1024, 1024), (40, 42, 52))
            draw = ImageDraw.Draw(source)
            draw.ellipse((260, 300, 760, 800), fill=(250, 250, 250), outline=(8, 8, 8), width=40)
            draw.rectangle((488, 360, 512, 560), fill=(8, 8, 8))
            draw.polygon([(600, 220), (760, 220), (680, 420), (740, 420), (560, 640), (620, 440), (560, 440)],
                         fill=(250, 190, 20))
            source = source.filter(ImageFilter.GaussianBlur(3))
            output = Path(tmp) / "icon.png"
            result = refine_pixel_candidate(source, {"id": "ICON-MODE-BLITZ", "size": [32, 32],
                                                       "alpha": "transparent"}, [], output)
            image = Image.open(output).convert("RGBA")
            opaque = [p[:3] for p in image.getdata() if p[3] == 255]
            colors = set(opaque)
            self.assertLessEqual(len(colors), 32)
            self.assertTrue(result["within_color_limit"])
            self.assertTrue(result["is_binary_alpha"])
            # Flat fills: no mid-grey blend between the white face and black outline.
            greys = [c for c in colors if max(c) - min(c) < 16 and 60 < c[0] < 200]
            self.assertEqual(greys, [])
            # The accent colour must survive quantisation.
            self.assertTrue(any(c[0] > 200 and c[1] > 140 and c[2] < 90 for c in colors))

    def test_large_scene_refinement_caps_palette_and_keeps_gradient(self):
        with tempfile.TemporaryDirectory() as tmp:
            # Smooth vertical sky gradient with a bright cloud: thousands of source colours.
            source = Image.new("RGB", (1024, 576))
            draw = ImageDraw.Draw(source)
            for y in range(576):
                draw.line((0, y, 1024, y), fill=(110 + y // 8, 150 + y // 9, 190 + y // 20))
            draw.ellipse((300, 250, 700, 420), fill=(250, 246, 230))
            output = Path(tmp) / "sky.png"
            result = refine_pixel_candidate(source, {"id": "HUB-L0-SKY-DAY", "size": [480, 270],
                                                       "alpha": "opaque"}, [], output)
            image = Image.open(output).convert("RGB")
            colors = set(image.getdata())
            self.assertEqual(image.size, (480, 270))
            self.assertLessEqual(len(colors), 192)
            self.assertGreaterEqual(len(colors), 32)  # still a gradient, not crushed to flat bands
            self.assertTrue(result["within_color_limit"])
            self.assertGreater(image.getpixel((240, 160))[0], 235)  # cloud survives

    def test_avatar_base_sheets_are_world_characters_with_documented_layout(self):
        from core.asset_classes import CLASS_WORLD_CHARACTER, classify_asset
        from core.sheet_layouts import layout_for

        m2 = {"size": [192, 288], "frame": [32, 48], "alpha": "transparent", "people": True}
        m1 = {"size": [72, 96], "frame": [12, 24], "alpha": "transparent", "people": True}
        self.assertEqual(classify_asset("AVATAR-BASE-M2", m2), CLASS_WORLD_CHARACTER)
        self.assertEqual(classify_asset("AVATAR-BASE-M1", m1), CLASS_WORLD_CHARACTER)

        rows = layout_for("AVATAR-BASE-M2")
        self.assertEqual([row.frames for row in rows], [4, 6, 6, 4, 6, 4])
        self.assertEqual(len(rows), 288 // 48)
        self.assertTrue(all(row.frames <= 192 // 32 for row in rows))
        self.assertEqual([row.frames for row in layout_for("AVATAR-BASE-M1")], [6, 6, 6, 4])
        self.assertEqual(layout_for("PORTRAIT-UNKNOWN"), ())

    def test_avatar_base_prompt_is_a_frame_prompt_not_a_portrait(self):
        spec = {"size": [192, 288], "frame": [32, 48], "alpha": "transparent", "people": True}
        row = "seated typing at a machine, side view facing right"
        pos, neg, meta = compile_generation_prompts("AVATAR-BASE-M2", spec, correction=row)
        self.assertEqual(meta["asset_class"], "world_character")
        self.assertEqual(meta["framing"], "sprite_sheet_frame")
        self.assertEqual(meta["frame_size"], [32, 48])
        self.assertIn("32x48", pos)
        self.assertIn("grey t-shirt", pos)
        self.assertIn(row, pos)
        self.assertNotIn("bust", pos)
        self.assertNotIn("dialogue portrait", pos.lower())
        # Scene lore leaks a building vignette into a single-character frame.
        for word in ("campus", "facade", "brick", "Gulf of Finland", "embankment"):
            self.assertNotIn(word, pos)
        for word in ("building", "landscape", "scenery"):
            self.assertIn(word, neg)
        # A flat chroma backdrop and no floor shadow keep the cut-out reliable: dark legs
        # on a dark slate backdrop cannot be separated by colour.
        self.assertIn("#FF00FF", pos)
        self.assertNotIn("#1E2430", pos)
        for word in ("shadow", "floor", "gradient"):
            self.assertIn(word, neg)

    def test_illustrated_avatar_prompt_is_full_colour_not_pixel_art(self):
        from core.sheet_layouts import layout_for

        spec = {"size": [768, 1152], "frame": [128, 192], "alpha": "transparent", "people": True,
                "render": "illustrated"}
        pose = "walking sideways, side view facing right, mid-stride"
        pos, neg, meta = compile_generation_prompts("AVATAR-HERO-M2", spec, correction=pose)
        self.assertEqual(meta["asset_class"], "world_character")
        self.assertEqual(meta["framing"], "illustrated_sheet_frame")
        self.assertEqual(meta["frame_size"], [128, 192])
        self.assertIn(pose, pos)
        self.assertIn("full colour", pos)
        self.assertIn("#FF00FF", pos)
        for banned in ("Pixel-art", "square pixels", "pixel grid", "pixel clusters", "campus"):
            self.assertNotIn(banned, pos)
        for word in ("pixel art", "pixelated", "shadow", "chair"):
            self.assertIn(word, neg)
        self.assertEqual([r.frames for r in layout_for("AVATAR-HERO-M2")], [4, 6, 6, 4, 6, 4])

    def test_hires_pixel_avatar_prompt_keeps_pixel_art_with_fine_detail_and_rich_colour(self):
        spec = {"size": [576, 864], "frame": [96, 144], "alpha": "transparent", "people": True,
                "render": "hires_pixel"}
        pose = "standing idle, front view, relaxed arms"
        pos, neg, meta = compile_generation_prompts("AVATAR-HERO-M2", spec, correction=pose)
        self.assertEqual(meta["asset_class"], "world_character")
        self.assertEqual(meta["framing"], "hires_pixel_sheet_frame")
        self.assertEqual(meta["frame_size"], [96, 144])
        self.assertIn(pose, pos)
        self.assertIn("pixel-art", pos)
        self.assertIn("high-resolution", pos)
        self.assertIn("96x144", pos)
        self.assertIn("#FF00FF", pos)
        for word in ("full colour", "shading"):
            self.assertIn(word, pos)
        for banned in ("campus", "strict logical pixel grid", "square pixels"):
            self.assertNotIn(banned, pos)
        for word in ("blocky", "low resolution", "chunky pixels", "shadow", "chair", "3d render"):
            self.assertIn(word, neg)
        # Smooth ramps are wanted here, so the base negatives against gradients must not be inherited.
        self.assertNotIn("smooth airbrushed gradient", neg)

    def test_environment_layers_and_trees_do_not_inherit_the_campus_scene(self):
        # The campus lore makes the model paint a building into layers that must stay empty.
        layer_words = ("campus", "facade", "brick", "meteorological")
        ground, ground_neg, meta = compile_generation_prompts(
            "HUB-L6-GROUND", {"size": [480, 270]}, correction="Granite terraces and a paved plaza.")
        self.assertEqual(meta["framing"], "environment_layer")
        self.assertIn("Granite terraces and a paved plaza.", ground)
        for word in layer_words:
            self.assertNotIn(word, ground)
        for word in ("building", "house", "facade"):
            self.assertIn(word, ground_neg)

        horizon, horizon_neg, _ = compile_generation_prompts(
            "HUB-L2-HORIZON", {"size": [480, 270]}, correction="Distant low city skyline across a bay.")
        for word in layer_words:
            self.assertNotIn(word, horizon)
        self.assertIn("foreground building", horizon_neg)

        tree, tree_neg, tree_meta = compile_generation_prompts(
            "HUB-L9-FG-BIRCH", {"size": [144, 200]}, correction="A birch tree on a magenta backdrop.")
        self.assertEqual(tree_meta["framing"], "isolated_sprite")
        self.assertIn("A birch tree on a magenta backdrop.", tree)
        for word in layer_words:
            self.assertNotIn(word, tree)
        for word in ("building", "house", "water", "landscape"):
            self.assertIn(word, tree_neg)

    def test_magenta_gradient_backdrop_is_cut_out_and_sprite_palette_is_capped(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Image.new("RGB", (576, 800))
            draw = ImageDraw.Draw(source)
            for x in range(576):  # purple-to-pink backdrop, like the generator's chroma matte
                t = x / 575
                draw.line((x, 0, x, 799), fill=(round(195 + 40 * t), round(10 + 40 * t), round(215 - 70 * t)))
            draw.rectangle((250, 100, 330, 760), fill=(235, 228, 214))  # birch-like trunk
            for k in range(60):  # many leaf shades
                shade = (30 + 3 * k, 110 + 2 * k, 40 + k)
                draw.ellipse((150 + 4 * k, 120 + 6 * k, 260 + 4 * k, 200 + 6 * k), fill=shade)
            output = Path(tmp) / "tree.png"
            result = refine_pixel_candidate(
                source, {"id": "HUB-L9-FG-BIRCH", "size": [144, 200], "alpha": "transparent"}, [], output)
            image = Image.open(output).convert("RGBA")
            self.assertEqual(image.size, (144, 200))
            self.assertEqual(image.getpixel((0, 0))[3], 0)
            self.assertEqual(image.getpixel((143, 199))[3], 0)
            opaque = [p[:3] for p in image.getdata() if p[3] == 255]
            self.assertGreater(len(opaque), 400)
            self.assertTrue(result["is_binary_alpha"])
            self.assertLessEqual(len(set(opaque)), 80)  # vegetation soft max
            magenta = [c for c in set(opaque) if min(c[0], c[2]) >= 90 and c[1] <= 0.62 * min(c[0], c[2])]
            self.assertEqual(magenta, [])

    def test_chroma_cutout_works_when_only_the_top_edge_is_backdrop(self):
        with tempfile.TemporaryDirectory() as tmp:
            # A ground layer: magenta above, terrain filling the sides and the bottom of the frame.
            source = Image.new("RGB", (640, 360), (110, 120, 100))
            draw = ImageDraw.Draw(source)
            for x in range(640):
                draw.line((x, 0, x, 160), fill=(round(200 + 30 * x / 639), 20, round(210 - 60 * x / 639)))
            for y in range(161, 360):
                draw.line((0, y, 639, y), fill=(90 + y // 5, 100 + y // 6, 80 + y // 9))
            output = Path(tmp) / "ground.png"
            refine_pixel_candidate(
                source, {"id": "HUB-L6-GROUND", "size": [480, 270], "alpha": "transparent"}, [], output)
            image = Image.open(output).convert("RGBA")
            self.assertEqual(image.getpixel((240, 4))[3], 0)
            self.assertEqual(image.getpixel((240, 260))[3], 255)
            self.assertEqual(image.getpixel((4, 260))[3], 255)

    def test_building_sprite_palette_is_capped_to_the_profile(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Image.new("RGB", (512, 384), (30, 36, 48))
            draw = ImageDraw.Draw(source)
            for y in range(120, 340):  # a brick wall with a vertical shading ramp: hundreds of colours
                draw.line((80, y, 430, y), fill=(120 + (y - 120) // 3, 60 + (y - 120) // 5, 40 + (y - 120) // 9))
            draw.polygon([(60, 120), (450, 120), (400, 50), (110, 50)], fill=(70, 60, 66))
            output = Path(tmp) / "building.png"
            result = refine_pixel_candidate(
                source, {"id": "BLD-ARCHIVE-DAY", "size": [88, 64], "alpha": "transparent"}, [], output)
            image = Image.open(output).convert("RGBA")
            opaque = {p[:3] for p in image.getdata() if p[3] == 255}
            self.assertLessEqual(len(opaque), 96)
            self.assertGreater(len(opaque), 12)
            self.assertTrue(result["within_color_limit"])

    def test_default_prompts_ask_for_rich_hi_res_pixel_art_not_a_coarse_grid(self):
        # A/B on the style LoRA: the old "strict logical pixel grid / no anti-aliasing" lock and the negatives
        # against smooth gradients pulled results toward flat, low-detail art.
        pos, neg, _ = compile_generation_prompts("BLD-ARCHIVE-DAY", {"size": [88, 64]})
        for phrase in ("high-resolution pixel art", "glowing", "saturated"):
            self.assertIn(phrase, pos)
        for phrase in ("strict logical pixel grid", "no anti-aliasing", "Sea of Stars", "no alpine mountains"):
            self.assertNotIn(phrase, pos)
        for phrase in ("anti-aliased", "smooth airbrushed gradient", "painterly"):
            self.assertNotIn(phrase, neg)
        for phrase in ("flat vector", "low detail"):
            self.assertIn(phrase, neg)
        for phrase in ("glowing windows", "green copper roofs"):
            self.assertIn(phrase, pos)
        # Scenes keep the full lore: the references show a lit dusk campus with autumn trees and a city across the bay.
        scene, _, _ = compile_generation_prompts("SCR-WARDROBE-BG", {"size": [480, 270]})
        for phrase in ("glowing windows", "autumn", "spruces", "green copper roofs", "city skyline"):
            self.assertIn(phrase, scene)

    def test_buildings_and_ground_do_not_inherit_the_whole_campus_lore(self):
        # The full campus lore (radar dome, pavilions, balloons, city skyline) made the model paint a diorama
        # of the whole campus instead of one building, and forests into the empty ground layer.
        building, building_neg, _ = compile_generation_prompts(
            "BLD-TOURNAMENT-DAY", {"size": [112, 64]}, correction="A one-storey hall with a barrel-vault roof.")
        self.assertIn("A one-storey hall with a barrel-vault roof.", building)
        for word in ("radar dome", "glass pavilions", "weather balloons", "city skyline", "red brick archive"):
            self.assertNotIn(word, building)
        for word in ("high-resolution pixel art", "glowing windows"):
            self.assertIn(word, building)
        for word in ("diorama", "multiple buildings", "island"):
            self.assertIn(word, building_neg)

        ground, _, _ = compile_generation_prompts("HUB-L6-GROUND", {"size": [480, 270]}, correction="Terraces.")
        for word in ("spruces", "maples", "birch", "forest"):
            self.assertNotIn(word, ground)

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
