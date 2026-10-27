from __future__ import annotations

import sys
import unittest
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.avatar_sheet import (  # noqa: E402
    FRAME_SIZE,
    PEOPLE_PALETTE,
    SHEET_SIZE,
    PoseSpec,
    animate,
    assemble_sheet,
    build_sheet,
    erase_regions,
    pose_to_frame,
    snap_to_palette,
)
from core.sheet_layouts import layout_for  # noqa: E402

SKIN = (242, 201, 168)
CHAIR = (200, 30, 30)


def synthetic_pose(with_chair: bool = False) -> Image.Image:
    """A 672x1024 slate backdrop with a blocky adult figure; optional red 'chair' at the left."""
    raw = Image.new("RGB", (672, 1024), (34, 38, 50))
    d = ImageDraw.Draw(raw)
    d.rectangle((250, 120, 420, 260), fill=SKIN)  # head
    d.rectangle((250, 100, 420, 150), fill=(43, 33, 28))  # hair
    d.rectangle((200, 260, 470, 560), fill=(180, 184, 192))  # shirt
    d.rectangle((250, 560, 420, 940), fill=(53, 56, 69))  # trousers
    d.rectangle((240, 930, 330, 970), fill=(24, 25, 32))  # shoe
    d.rectangle((340, 930, 430, 970), fill=(24, 25, 32))  # shoe
    if with_chair:
        d.rectangle((60, 700, 160, 900), fill=CHAIR)
    return raw


def opaque_colors(img: Image.Image) -> set[tuple[int, int, int]]:
    return {px[:3] for px in img.getdata() if px[3] == 255}


class PaletteTests(unittest.TestCase):
    def test_palette_is_small_and_locks_skin_and_hair(self):
        self.assertLessEqual(len(PEOPLE_PALETTE), 14)
        self.assertEqual(len(set(PEOPLE_PALETTE)), len(PEOPLE_PALETTE))
        for locked in ((242, 201, 168), (217, 160, 126), (43, 33, 28)):
            self.assertIn(locked, PEOPLE_PALETTE)

    def test_snap_uses_only_palette_and_binary_alpha(self):
        img = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
        img.putpixel((0, 0), (245, 205, 170, 255))
        img.putpixel((1, 0), (10, 10, 12, 200))
        img.putpixel((2, 0), (90, 90, 90, 40))
        snapped = snap_to_palette(img)
        self.assertEqual(snapped.getpixel((0, 0)), (*SKIN, 255))
        self.assertEqual(snapped.getpixel((1, 0))[3], 255)
        self.assertEqual(snapped.getpixel((2, 0))[3], 0)
        self.assertTrue(opaque_colors(snapped) <= set(PEOPLE_PALETTE))


class PoseFrameTests(unittest.TestCase):
    def test_erase_regions_clears_fractional_box_only(self):
        img = Image.new("RGBA", (100, 100), (10, 20, 30, 255))
        out = erase_regions(img, ((0.0, 0.5, 0.5, 1.0),))
        self.assertEqual(out.getpixel((10, 80))[3], 0)
        self.assertEqual(out.getpixel((80, 80))[3], 255)
        self.assertEqual(img.getpixel((10, 80))[3], 255)  # input untouched

    def test_pose_to_frame_fits_palette_and_grid(self):
        frame = pose_to_frame(synthetic_pose(), target_height=44)
        self.assertEqual(frame.size, FRAME_SIZE)
        alphas = {px[3] for px in frame.getdata()}
        self.assertTrue(alphas <= {0, 255})
        self.assertLessEqual(len(opaque_colors(frame)), 14)
        self.assertTrue(opaque_colors(frame) <= set(PEOPLE_PALETTE))
        box = frame.getchannel("A").getbbox()
        self.assertIsNotNone(box)
        self.assertGreaterEqual(box[1], 1)  # headroom
        self.assertEqual(box[3], FRAME_SIZE[1] - 1)  # feet on the bottom margin
        self.assertAlmostEqual(box[3] - box[1], 44, delta=3)

    def test_enclosed_backdrop_gap_between_legs_stays_transparent(self):
        raw = synthetic_pose()
        d = ImageDraw.Draw(raw)
        # A gap of pure backdrop colour fully enclosed by trousers, like the V between walking legs.
        d.rectangle((310, 640, 360, 900), fill=(34, 38, 50))
        frame = pose_to_frame(raw, 44)
        solid = pose_to_frame(synthetic_pose(), 44)
        # Cells 15-16 lie fully inside the 50px-wide gap; 14 and 17 are only partly covered.
        gap_pixels = [(x, y) for x in (15, 16) for y in range(32, 38)]
        self.assertTrue(any(solid.getpixel(p)[3] == 255 for p in gap_pixels))
        self.assertTrue(all(frame.getpixel(p)[3] == 0 for p in gap_pixels))

    def test_chroma_gradient_backdrop_and_floor_shadow_are_removed(self):
        raw = Image.new("RGB", (672, 1024))
        d = ImageDraw.Draw(raw)
        for x in range(672):  # purple-to-pink gradient like the generator's chroma backdrop
            t = x / 671
            d.line((x, 0, x, 1023), fill=(round(185 + 40 * t), round(7 + 33 * t), round(229 - 79 * t)))
        d.ellipse((150, 940, 520, 1000), fill=(118, 0, 150))  # darker magenta floor shadow
        figure = synthetic_pose()
        backdrop = Image.new("RGB", figure.size, (34, 38, 50))
        mask = ImageChops.difference(figure, backdrop).convert("L").point(lambda v: 255 if v > 6 else 0)
        raw.paste(figure, (0, 0), mask)
        frame = pose_to_frame(raw, 44)
        reference = pose_to_frame(synthetic_pose(), 44)
        self.assertEqual(frame.getchannel("A").getbbox(), reference.getchannel("A").getbbox())
        mass = sum(1 for px in frame.getdata() if px[3] == 255)
        ref_mass = sum(1 for px in reference.getdata() if px[3] == 255)
        self.assertAlmostEqual(mass / ref_mass, 1.0, delta=0.05)
        self.assertTrue(opaque_colors(frame) <= set(PEOPLE_PALETTE))

    def test_pose_to_frame_removes_chair_region(self):
        spec_erase = ((0.0, 0.65, 0.3, 0.9),)
        with_chair = pose_to_frame(synthetic_pose(with_chair=True), 44)
        without = pose_to_frame(synthetic_pose(with_chair=True), 44, erase=spec_erase)
        reference = pose_to_frame(synthetic_pose(), 44)
        self.assertNotEqual(with_chair.tobytes(), reference.tobytes())
        self.assertEqual(without.tobytes(), reference.tobytes())


class AnimationTests(unittest.TestCase):
    KINDS = {"idle": 4, "walk": 6, "typing": 6, "thinking": 4, "celebrate": 6, "disappointed": 4}

    def setUp(self):
        self.base = pose_to_frame(synthetic_pose(), 44)

    def test_each_kind_returns_requested_frame_count_and_size(self):
        for kind, count in self.KINDS.items():
            frames = animate(kind, self.base, count)
            self.assertEqual(len(frames), count, kind)
            self.assertTrue(all(f.size == FRAME_SIZE for f in frames), kind)

    def test_frames_move_but_add_no_new_colours(self):
        base_colors = opaque_colors(self.base)
        for kind, count in self.KINDS.items():
            frames = animate(kind, self.base, count)
            self.assertGreater(len({f.tobytes() for f in frames}), 1, f"{kind} is static")
            for frame in frames:
                self.assertTrue(opaque_colors(frame) <= base_colors, kind)
                self.assertTrue({px[3] for px in frame.getdata()} <= {0, 255}, kind)

    def test_frames_keep_the_body_mass(self):
        base_mass = sum(1 for px in self.base.getdata() if px[3] == 255)
        for kind, count in self.KINDS.items():
            for frame in animate(kind, self.base, count):
                mass = sum(1 for px in frame.getdata() if px[3] == 255)
                self.assertAlmostEqual(mass / base_mass, 1.0, delta=0.35, msg=kind)

    def test_walk_keeps_both_legs_at_full_width(self):
        # V-shaped legs, like a mid-stride side view: passing frames must close the V by
        # moving the legs, not by squeezing them thin.
        frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        d.rectangle((10, 4, 20, 26), fill=(190, 194, 202, 255))  # torso
        d.polygon([(11, 27), (15, 27), (8, 46), (4, 46)], fill=(58, 62, 78, 255))  # back leg
        d.polygon([(16, 27), (20, 27), (27, 46), (23, 46)], fill=(38, 40, 52, 255))  # front leg
        base_legs = sum(1 for y in range(28, 48) for x in range(32) if frame.getpixel((x, y))[3] == 255)
        for index, shifted in enumerate(animate("walk", frame, 6)):
            legs = sum(1 for y in range(28, 48) for x in range(32) if shifted.getpixel((x, y))[3] == 255)
            # Passing frames (2, 5) overlap the legs on purpose, so they may lose some mass.
            floor = 0.65 if index in (2, 5) else 0.85
            self.assertGreaterEqual(legs / base_legs, floor, f"frame {index} squeezed the legs")
        passing = animate("walk", frame, 6)[2]
        spread = [
            max(x for x in range(32) if passing.getpixel((x, 45))[3] == 255)
            - min(x for x in range(32) if passing.getpixel((x, 45))[3] == 255)
        ]
        original = max(x for x in range(32) if frame.getpixel((x, 45))[3] == 255) - min(
            x for x in range(32) if frame.getpixel((x, 45))[3] == 255
        )
        self.assertLess(spread[0], original * 0.6)

    def test_unknown_kind_is_rejected(self):
        with self.assertRaises(ValueError):
            animate("moonwalk", self.base, 4)


class SheetTests(unittest.TestCase):
    def test_assemble_places_frames_and_leaves_spare_cells_empty(self):
        frame = Image.new("RGBA", FRAME_SIZE, (242, 201, 168, 255))
        sheet = assemble_sheet([[frame] * 4, [frame] * 6])
        self.assertEqual(sheet.size, (FRAME_SIZE[0] * 6, FRAME_SIZE[1] * 2))
        self.assertEqual(sheet.getpixel((3 * 32 + 5, 5))[3], 255)
        self.assertEqual(sheet.getpixel((4 * 32 + 5, 5))[3], 0)
        self.assertEqual(sheet.getpixel((5 * 32 + 5, 48 + 5))[3], 255)

    def test_assemble_rejects_rows_wider_than_the_sheet(self):
        frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        with self.assertRaises(ValueError):
            assemble_sheet([[frame] * 7])

    def test_build_sheet_follows_documented_layout(self):
        rows = layout_for("AVATAR-BASE-M2")
        poses = {row.key: synthetic_pose() for row in rows}
        specs = {row.key: PoseSpec(kind=kind, target_height=44) for row, kind in zip(
            rows, ("idle", "walk", "typing", "thinking", "celebrate", "disappointed"))}
        sheet = build_sheet(poses, specs)
        self.assertEqual(sheet.size, SHEET_SIZE)
        self.assertEqual(SHEET_SIZE, (192, 288))
        for r, row in enumerate(rows):
            for c in range(6):
                cell = sheet.crop((c * 32, r * 48, (c + 1) * 32, (r + 1) * 48))
                filled = cell.getchannel("A").getbbox() is not None
                self.assertEqual(filled, c < row.frames, f"row {row.key} col {c}")
        self.assertLessEqual(len(opaque_colors(sheet)), 14)

    def test_build_sheet_reports_missing_pose(self):
        rows = layout_for("AVATAR-BASE-M2")
        with self.assertRaises(KeyError):
            build_sheet({}, {row.key: PoseSpec(kind="idle", target_height=44) for row in rows})


if __name__ == "__main__":
    unittest.main()
