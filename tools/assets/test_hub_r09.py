#!/usr/bin/env python3
"""Exercise the R09 source boundary and deterministic layer export without I/O writes."""
from __future__ import annotations

import copy
import io
import json
import unittest
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

import build_hub_r09 as exporter


class StationExportContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = json.loads(exporter.SPEC_PATH.read_text(encoding="utf-8"))

    def reject(self, mutate, message: str) -> None:
        spec = copy.deepcopy(self.source)
        mutate(spec)
        with self.assertRaisesRegex(ValueError, message):
            exporter.build_outputs(spec)

    def test_native_source_roundtrip_and_deterministic_bytes(self):
        first, manifest = exporter.build_outputs(copy.deepcopy(self.source))
        second, repeated = exporter.build_outputs(copy.deepcopy(self.source))
        self.assertEqual(first, second)
        self.assertEqual(manifest, repeated)
        self.assertEqual(manifest["sourceCanvas"], [512, 288])
        self.assertEqual(manifest["worldCanvas"], [512, 288])
        self.assertTrue(manifest["validation"]["restRoundtripRgbaExact"])
        self.assertEqual(manifest["validation"]["outsideMovingMaskChangedPixels"], 0)
        self.assertFalse(manifest["validation"]["artAcceptanceImplied"])
        self.assertEqual(manifest["validation"]["vegetationPieces"], 9)
        foliage = [asset for asset in manifest["assets"] if asset["role"] == "vegetation"]
        self.assertEqual(
            [asset["id"] for asset in foliage if asset["foregroundOccludesActors"]],
            ["hub.r09.foliage.foreground-right"],
        )
        for asset in manifest["assets"]:
            self.assertNotIn("sourceRect", asset, "A world-space box must not be confused with texture crop coordinates")
            density = asset.get("density", 1)
            self.assertEqual(asset["anchorScenePx"], [
                asset["originalSceneXY"][0] + asset["width"] / (2 * density),
                asset["originalSceneXY"][1] + asset["height"] / density,
            ])
        detail = next(asset for asset in manifest["assets"] if asset["role"] == "architecture-ground")
        self.assertEqual(detail["density"], 2)
        self.assertEqual([detail["width"], detail["height"]], [2 * n for n in detail["sourceBounds"][2:]])
        self.assertEqual(detail["sourceBounds"], [0, 10, 512, 278])

    def test_changed_provider_source_requires_new_pin(self):
        self.reject(lambda s: s["sources"]["master"].update(sha256="0" * 64), "checksum changed")

    def test_aerology_equipment_cannot_cover_water_or_sky(self):
        self.reject(lambda s: s["aerologyEquipment"].update(sourceBounds=[377, 0, 8, 22]), "stationary architecture")

    def test_provider_path_cannot_escape_selected_project_source(self):
        self.reject(lambda s: s["sources"]["hiddenPlate"].update(source="README.md"), "must stay inside")

    def test_wrong_provider_size_does_not_get_rescaled(self):
        self.reject(lambda s: s["sources"]["hiddenPlate"].update(size=[1024, 576]), "dimensions changed")

    def test_scene_transform_cannot_silently_change_grid(self):
        self.reject(lambda s: s.update(sourceScale=2, worldCanvas=[1024, 576]), "native 512x288")

    def test_leaf_selection_outside_source_fails(self):
        self.reject(lambda s: s["vegetation"][0].update(selection={"rowSpans": [[288, 0, 10]]}), "invalid source row span")

    def test_two_moving_layers_cannot_own_same_pixel(self):
        self.reject(lambda s: s["vegetation"][1].update(selection=copy.deepcopy(s["vegetation"][0]["selection"])), "selections overlap")

    def test_sky_water_partition_cannot_overlap(self):
        self.reject(lambda s: s["domains"].update(water=copy.deepcopy(s["domains"]["sky"])), "must not overlap")

    def test_unreviewed_displacement_cap_fails(self):
        self.reject(lambda s: s["vegetation"][0].update(maximumSourceDisplacement=2), "one-source-pixel hard cap")

    def test_unbounded_gain_fails(self):
        self.reject(lambda s: s["vegetation"][0].update(gain=50), "gain <= 1.5")

    def test_cloud_selector_is_versioned(self):
        self.reject(lambda s: s["cloudSelection"].update(kind="guess"), "Unknown cloud selection")

    def test_cloud_source_cannot_include_a_foreground_silhouette(self):
        self.reject(lambda s: s["cloudSelection"]["islands"][0].update(selection={"rowSegments": [[105, [[464, 464]]]]}), "silhouette")

    def test_native_sky_patch_preserves_the_vertical_colour_ramp(self):
        self.reject(lambda s: s["skyPatch"].update(destination=[354, 38]), "vertical colour ramp")

    def test_sky_texture_and_scanlines_follow_the_western_silhouette(self):
        files, manifest = exporter.build_outputs(copy.deepcopy(self.source))
        asset = next(a for a in manifest["assets"] if a["role"] == "sky")
        alpha = Image.new("L", (512, 288))
        with Image.open(io.BytesIO(files["sky.png"])) as image:
            alpha.paste(image.getchannel("A"), tuple(asset["originalSceneXY"]))
        trace = Image.new("L", (512, 288))
        pen = ImageDraw.Draw(trace)
        for y, left, right in manifest["domains"]["sky"]["rowSpans"]:
            pen.line((left, y, right - 1, y), fill=255)
        for x, y in ((2, 11), (23, 14), (34, 24), (96, 28), (124, 54), (128, 49), (144, 58)):
            self.assertEqual(trace.getpixel((x, y)), 255, "Open sky keeps its own tint")
        for x, y in ((40, 29), (47, 34), (55, 42), (58, 38), (65, 28)):
            self.assertEqual(trace.getpixel((x, y)), 0, "Forest and radome keep their terrain tint")
        self.assertEqual(alpha.tobytes(), trace.filter(ImageFilter.MaxFilter(3)).tobytes())

    def test_cloud_drift_cannot_change_y_or_wrap_onscreen(self):
        self.reject(lambda s: s["cloudSelection"]["islands"][0]["motion"].update(constantSourceY=40), "fixed-y integer-x")
        self.reject(lambda s: s["cloudSelection"]["islands"][0]["motion"].update(wrapOnlyWhenFullyOffscreen=False), "fixed-y integer-x")

    def test_cloud_clip_excludes_forest_tree_tips_and_mast(self):
        _, manifest = exporter.build_outputs(copy.deepcopy(self.source))
        geometry = Image.new("L", (512, 288))
        draw = ImageDraw.Draw(geometry)
        for y, start, end_exclusive in manifest["domains"]["cloudClip"]["rowSpans"]:
            draw.line((start, y, end_exclusive - 1, y), fill=255)
        for point in ((50, 39), (59, 39), (105, 41), (111, 43), (112, 44), (135, 40), (138, 40), (140, 44)):
            self.assertEqual(geometry.getpixel(point), 0, f"A tree or mast pixel entered cloud motion: {point}")
        for point in ((104, 39), (110, 43), (113, 44), (141, 39), (370, 40), (511, 44)):
            self.assertEqual(geometry.getpixel(point), 255)
        for y in (38, 45):
            self.assertIsNone(geometry.crop((0, y, 512, y + 1)).getbbox())
        cloud = next(a for a in manifest["assets"] if a["role"] == "clouds")
        self.assertEqual(cloud["clipDomain"], "cloudClip")
        self.assertNotIn("maximumHorizontalDisplacement", cloud)
        self.assertEqual(cloud["motion"]["constantSourceY"], cloud["originalSceneXY"][1])

    def test_water_effect_excludes_fir_and_shore_and_plane_bleeds_under_adjacent_terrain(self):
        files, manifest = exporter.build_outputs(copy.deepcopy(self.source))
        asset = next(a for a in manifest["assets"] if a["role"] == "water")
        actual = Image.new("L", (512, 288))
        with Image.open(io.BytesIO(files[Path(asset["url"]).name])) as image:
            actual.paste(image.getchannel("A"), tuple(asset["originalSceneXY"]))
        geometry = Image.new("L", (512, 288))
        draw = ImageDraw.Draw(geometry)
        for y, start, end_exclusive in manifest["domains"]["water"]["rowSpans"]:
            draw.line((start, y, end_exclusive - 1, y), fill=255)
        sky = exporter.polygon_mask(self.source["domains"]["sky"])
        bleed = ImageChops.subtract(geometry.filter(ImageFilter.MaxFilter(3)), sky)
        self.assertEqual(actual.tobytes(), bleed.tobytes())
        for point in ((464, 108), (460, 114), (466, 115), (478, 101), (319, 77)):
            self.assertEqual(geometry.getpixel(point), 0, f"A tree or shoreline pixel entered the water effect: {point}")
        self.assertEqual(geometry.getpixel((450, 102)), 255)

    def test_cloud_uses_only_selected_source_pixels_and_unchanged_sky_crop(self):
        files, manifest = exporter.build_outputs(copy.deepcopy(self.source))
        base = Image.new("RGBA", (512, 288))
        mask = Image.new("L", (512, 288))
        for asset in manifest["assets"]:
            if asset["role"] not in {"sky", "water", "architecture-ground", "foreground-occluder", "clouds"}:
                continue
            with Image.open(io.BytesIO(files[Path(asset["url"]).name])) as image:
                if asset["role"] == "clouds":
                    mask.paste(image.getchannel("A"), tuple(asset["originalSceneXY"]))
                else:
                    logical = image.resize(tuple(asset["sourceBounds"][2:]), Image.Resampling.NEAREST)
                    base.alpha_composite(logical, tuple(asset["originalSceneXY"]))
        self.assertEqual(mask.getpixel((250, 20)), 0)
        self.assertEqual(mask.getpixel((300, 20)), 0)
        self.assertEqual(mask.getpixel((370, 40)), 255)
        with Image.open(exporter.ROOT / self.source["sources"]["master"]["source"]) as master:
            for y in range(288):
                for x in range(512):
                    if mask.getpixel((x, y)):
                        self.assertEqual(base.getpixel((x, y)), master.getpixel((x + 31, y)))

    def test_image_cannot_be_used_as_white_receiver_mask(self):
        def replace_receiver(spec):
            spec["receivers"][0].update(copy.deepcopy(spec["sources"]["master"]))
        self.reject(replace_receiver, "white selected pixels")

    def test_receiver_edits_preserve_all_pixels_outside_explicit_ownership(self):
        files, _ = exporter.build_outputs(copy.deepcopy(self.source))
        for receiver in self.source["receivers"]:
            if not receiver.get("edits"):
                continue
            permitted = Image.new("L", (512, 288))
            draw = ImageDraw.Draw(permitted)
            for edit in receiver["edits"]:
                if "clearBounds" in edit:
                    x, y, width, height = edit["clearBounds"]
                    draw.rectangle((x, y, x + width - 1, y + height - 1), fill=255)
                for y, segments in edit["selection"]["rowSegments"]:
                    for left, right in segments:
                        draw.line((left, y, right, y), fill=255)
            with Image.open(exporter.ROOT / receiver["source"]) as original, Image.open(io.BytesIO(files[receiver["file"]])) as actual:
                before, after, allowed = original.tobytes(), actual.tobytes(), permitted.tobytes()
                outside_changed = sum(before[i * 4:i * 4 + 4] != after[i * 4:i * 4 + 4]
                                      for i, owned in enumerate(allowed) if not owned)
                self.assertEqual(outside_changed, 0, receiver["id"])

    def test_entry_receiver_selects_glass_and_excludes_pier_and_frames(self):
        files, manifest = exporter.build_outputs(copy.deepcopy(self.source))
        with Image.open(io.BytesIO(files["window-light-mask.png"])) as actual:
            alpha = actual.getchannel("A")
            self.assertEqual(alpha.crop((227, 155, 240, 170)).histogram()[255], 150)
            for point in ((229, 155), (237, 169)):
                self.assertEqual(alpha.getpixel(point), 255)
            for point in ((218, 160), (220, 160), (233, 162), (234, 162), (229, 154), (229, 170)):
                self.assertEqual(alpha.getpixel(point), 0, f"A pier or frame entered entry emission: {point}")
        region = next(region for region in manifest["lightRegions"] if region["role"] == "central-entry")
        self.assertEqual(region["sourceBounds"], [227, 155, 13, 15])

    def test_step_receiver_excludes_glass_instrument_and_lower_fountain(self):
        files, manifest = exporter.build_outputs(copy.deepcopy(self.source))
        with Image.open(io.BytesIO(files["ground-light-mask.png"])) as actual:
            alpha = actual.getchannel("A")
            self.assertEqual(alpha.crop((214, 172, 245, 181)).histogram()[255], 119)
            for point in ((223, 172), (241, 176), (222, 179)):
                self.assertEqual(alpha.getpixel(point), 255)
            for point in ((227, 173), (228, 176), (236, 179), (239, 180), (225, 170), (225, 181)):
                self.assertEqual(alpha.getpixel(point), 0, f"Non-stone material entered the step reflection: {point}")
        region = next(region for region in manifest["lightRegions"] if region["role"] == "central-steps")
        self.assertEqual(region["sourceBounds"], [214, 172, 31, 9])
        self.assertLessEqual(region["suggestedAlpha"], 0.12)

    def test_archive_receiver_preserves_wood_posts_shelves_and_door_front(self):
        files, manifest = exporter.build_outputs(copy.deepcopy(self.source))
        with Image.open(io.BytesIO(files["window-light-mask.png"])) as actual:
            alpha = actual.getchannel("A")
            self.assertEqual(alpha.crop((300, 172, 314, 188)).histogram()[255], 99)
            for point in ((302, 174), (311, 180), (312, 186)):
                self.assertEqual(alpha.getpixel(point), 255)
            for point in ((306, 174), (307, 180), (316, 185), (317, 185), (302, 177), (311, 183), (328, 198)):
                self.assertEqual(alpha.getpixel(point), 0, f"Wood entered archive interior emission: {point}")
        region = next(region for region in manifest["lightRegions"] if region["role"] == "archive-interior")
        self.assertEqual(region["sourceBounds"], [300, 172, 14, 16])

    def test_reflected_light_cannot_strengthen_toward_the_fountain(self):
        def reverse_falloff(spec):
            region = next(region for region in spec["lightRegions"] if region["role"] == "central-steps")
            region["verticalFalloff"] = [0.25, 1]
        self.reject(reverse_falloff, "bounded descending source-row factors")

    def test_receiver_replacement_cannot_overwrite_unrelated_source_selection(self):
        def move_clear(spec):
            receiver = next(entry for entry in spec["receivers"] if entry["role"] == "window-light-mask")
            receiver["edits"][0]["clearBounds"] = [0, 0, 1, 1]
        self.reject(move_clear, "unrelated source-mask pixels")

    def test_light_region_cannot_point_to_unknown_mask(self):
        self.reject(lambda s: s["lightRegions"][0].update(maskRole="missing"), "missing receiver")

    def test_export_filename_is_not_a_path(self):
        self.reject(lambda s: s["vegetation"][0].update(file="../outside.png"), "plain PNG names")


if __name__ == "__main__":
    unittest.main(verbosity=2)
