from __future__ import annotations

import sys
import unittest
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.avatar_sheet import PoseSpec, _is_chroma, animate  # noqa: E402
from core.avatar_sheet_hires import (  # noqa: E402
    HIRES_COLORS,
    HIRES_FRAME_SIZE,
    HIRES_SHEET_SIZE,
    build_hires_sheet,
    pose_to_hires_frame,
)
from core.sheet_layouts import layout_for  # noqa: E402


def shaded_pose(width: int = 672, height: int = 1024) -> Image.Image:
    """A shaded adult figure on a purple-to-pink chroma backdrop, softened like generator output."""
    raw = Image.new("RGB", (width, height))
    d = ImageDraw.Draw(raw)
    for x in range(width):
        t = x / (width - 1)
        d.line((x, 0, x, height - 1), fill=(round(195 + 30 * t), round(75 - 20 * t), round(212 - 50 * t)))
    d.ellipse((250, 110, 420, 290), fill=(242, 201, 168))  # head
    d.pieslice((245, 95, 425, 260), 180, 360, fill=(74, 52, 40))  # hair
    d.rectangle((300, 190, 318, 206), fill=(40, 30, 32))  # eyes
    d.rectangle((356, 190, 374, 206), fill=(40, 30, 32))
    for y in range(290, 600):  # shirt with a vertical shading ramp: many distinct shades
        k = (y - 290) / 310
        d.line((200, y, 470, y), fill=(round(212 - 90 * k), round(216 - 90 * k), round(226 - 80 * k)))
    for y in range(600, 960):  # trousers ramp
        k = (y - 600) / 360
        d.line((250, y, 420, y), fill=(round(70 - 30 * k), round(76 - 30 * k), round(98 - 34 * k)))
    d.line((335, 600, 335, 960), fill=(20, 22, 32), width=6)  # leg gap line
    d.rectangle((240, 950, 330, 990), fill=(30, 30, 40))
    d.rectangle((340, 950, 430, 990), fill=(30, 30, 40))
    return raw.filter(ImageFilter.GaussianBlur(1.2))


def opaque_colors(img: Image.Image) -> set[tuple[int, int, int]]:
    return {px[:3] for px in img.getdata() if px[3] == 255}


class HiresFrameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.frame = pose_to_hires_frame(shaded_pose(), target_height=130)

    def test_frame_is_96x144_with_binary_alpha(self):
        self.assertEqual(self.frame.size, HIRES_FRAME_SIZE)
        self.assertEqual(HIRES_FRAME_SIZE, (96, 144))
        self.assertTrue({px[3] for px in self.frame.getdata()} <= {0, 255})

    def test_palette_is_rich_but_capped(self):
        colors = opaque_colors(self.frame)
        self.assertGreater(len(colors), 30)  # shaded ramps survive, unlike the 14-colour sheet
        self.assertLessEqual(len(colors), HIRES_COLORS)
        self.assertEqual(HIRES_COLORS, 96)

    def test_figure_fills_the_frame_and_stands_on_the_bottom_margin(self):
        box = self.frame.getchannel("A").getbbox()
        self.assertIsNotNone(box)
        self.assertAlmostEqual(box[3] - box[1], 130, delta=4)
        self.assertGreaterEqual(box[1], 2)
        self.assertGreaterEqual(HIRES_FRAME_SIZE[1] - box[3], 1)

    def test_backdrop_fringe_does_not_leak_magenta_pixels(self):
        leaked = [c for c in opaque_colors(self.frame) if _is_chroma(c)]
        self.assertEqual(leaked, [])

    def test_silhouette_has_no_spurs_or_isolated_pixels(self):
        w, h = self.frame.size
        opaque = {(x, y) for y in range(h) for x in range(w) if self.frame.getpixel((x, y))[3] == 255}
        weak = [p for p in opaque if sum((p[0] + dx, p[1] + dy) in opaque
                                         for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) <= 1]
        self.assertEqual(weak, [])

    def test_dark_eyes_are_kept(self):
        # Eyes are about 18 source pixels wide, a bit over two frame pixels.
        head = self.frame.crop((30, 14, 66, 40))
        dark = [px for px in head.getdata() if px[3] == 255 and sum(px[:3]) < 200]
        self.assertGreaterEqual(len(dark), 4)


class ScaledAnimationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = pose_to_hires_frame(shaded_pose(), target_height=130)

    def test_idle_bob_scales_with_the_frame(self):
        frames = animate("idle", self.base, 4, scale=3)
        tops = [f.getchannel("A").getbbox()[1] for f in frames]
        self.assertEqual(tops[1] - tops[0], 3)
        self.assertEqual(len({f.tobytes() for f in frames}) > 1, True)

    def test_every_kind_runs_at_hires_size(self):
        counts = {"idle": 4, "walk": 6, "typing": 6, "thinking": 4, "celebrate": 6, "disappointed": 4}
        for kind, count in counts.items():
            frames = animate(kind, self.base, count, scale=3)
            self.assertEqual(len(frames), count, kind)
            self.assertTrue(all(f.size == HIRES_FRAME_SIZE for f in frames), kind)
            self.assertTrue(all(opaque_colors(f) <= opaque_colors(self.base) for f in frames), kind)

    def test_walk_keeps_legs_at_full_width_with_scaled_gaps(self):
        frame = Image.new("RGBA", HIRES_FRAME_SIZE, (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        d.rectangle((30, 10, 62, 80), fill=(200, 204, 212, 255))
        d.polygon([(34, 82), (46, 82), (22, 138), (10, 138)], fill=(60, 64, 80, 255))  # back leg
        d.polygon([(48, 82), (60, 82), (86, 138), (74, 138)], fill=(40, 42, 56, 255))  # front leg
        d.rectangle((16, 62, 26, 86), fill=(236, 170, 140, 255))  # a swinging hand beside the hip
        legs = lambda img: sum(1 for y in range(90, 144) for x in range(96) if img.getpixel((x, y))[3] == 255)  # noqa: E731
        base_legs = legs(frame)
        hand_box = (12, 60, 30, 88)
        for index, shifted in enumerate(animate("walk", frame, 6, scale=3)):
            self.assertGreaterEqual(legs(shifted) / base_legs, 0.9, f"frame {index}")
            if index in (0, 1, 3, 4):  # the other frames bob the whole figure instead
                self.assertEqual(shifted.crop(hand_box).tobytes(), frame.crop(hand_box).tobytes(),
                                 f"frame {index} dragged the hand along with the legs")

    def test_walk_legs_close_gradually_without_a_tear_at_the_hip(self):
        frame = Image.new("RGBA", HIRES_FRAME_SIZE, (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        d.rectangle((30, 10, 62, 80), fill=(200, 204, 212, 255))
        d.polygon([(34, 82), (46, 82), (22, 138), (10, 138)], fill=(60, 64, 80, 255))
        d.polygon([(48, 82), (60, 82), (86, 138), (74, 138)], fill=(40, 42, 56, 255))
        for frame_out in animate("walk", frame, 6, scale=3)[1:3]:
            edges = []
            for y in range(90, 130):
                xs = [x for x in range(96) if frame_out.getpixel((x, y))[3] == 255]
                edges.append((min(xs), max(xs)))
            jumps = [max(abs(a[0] - b[0]), abs(a[1] - b[1])) for a, b in zip(edges, edges[1:])]
            self.assertLessEqual(max(jumps), 6, "leg outline jumps between rows")


class HiresSheetTests(unittest.TestCase):
    def test_sheet_is_576x864_follows_the_layout_and_shares_one_palette(self):
        rows = layout_for("AVATAR-HERO-M2")
        kinds = ("idle", "walk", "typing", "thinking", "celebrate", "disappointed")
        specs = {row.key: PoseSpec(kind=kind, target_height=120) for row, kind in zip(rows, kinds)}
        sheet = build_hires_sheet({row.key: shaded_pose() for row in rows}, specs)
        self.assertEqual(sheet.size, HIRES_SHEET_SIZE)
        self.assertEqual(HIRES_SHEET_SIZE, (576, 864))
        for r, row in enumerate(rows):
            for c in range(6):
                cell = sheet.crop((c * 96, r * 144, (c + 1) * 96, (r + 1) * 144))
                self.assertEqual(cell.getchannel("A").getbbox() is not None, c < row.frames, f"{row.key} {c}")
        self.assertLessEqual(len(opaque_colors(sheet)), HIRES_COLORS)

    def test_missing_pose_is_reported(self):
        rows = layout_for("AVATAR-HERO-M2")
        specs = {row.key: PoseSpec(kind="idle", target_height=120) for row in rows}
        with self.assertRaises(KeyError):
            build_hires_sheet({}, specs)


if __name__ == "__main__":
    unittest.main()
