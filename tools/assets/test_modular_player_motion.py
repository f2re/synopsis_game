#!/usr/bin/env python3
"""Negative source/contract tests for the independently reviewed R03 motion."""
from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_modular_player_r01 as builder
import modular_player_motion as motion
from modular_player_contract import fingerprints, validate_rig


class ModularPlayerMotionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.rig = copy.deepcopy(builder.RIG)
        if cls.rig['version'] == 2:
            # Allows candidate-stage checks before the main contract is admitted.
            cls.rig['version'] = 3
            cls.rig['runtimeRevision'] = 'r03-motion6-20261111'
            cls.rig['clips'].update(copy.deepcopy(motion.EXPECTED_CLIPS))
            cls.rig['motion'] = {'rig': 'motion-rig.json', 'rigSha256': builder.sha((builder.SOURCE/'motion-rig.json').read_bytes()),
                'sourceIndex': 'motion/source-index.json', 'sourceIndexSha256': builder.sha((builder.SOURCE/'motion/source-index.json').read_bytes()),
                'maximumDecodedAtlasBytes': 4194304}
        cls.motion = json.loads((builder.SOURCE/'motion-rig.json').read_text())
        cls.index = json.loads((builder.SOURCE/'motion/source-index.json').read_text())
        cls.runtime, cls.atlas, cls.png, cls.sources, _ = builder.compile_pack(cls.rig)

    def test_all_families_share_the_frame_clock_and_fit_the_runtime_limit(self):
        self.assertEqual(len(self.sources), 30)
        self.assertEqual(len(self.index['families']), 32)
        self.assertLessEqual(self.atlas.width*self.atlas.height*4, 4194304)
        for direction in self.rig['directions']:
            layers = [self.runtime['body']] + list(self.runtime['parts'].values())
            layers += [value['frames'] for value in self.runtime['companions'].values() if value]
            for layer in layers:
                for action, clip in self.rig['clips'].items():
                    self.assertEqual(len(layer[direction][action]), len(clip['durationsMs']))
                    self.assertTrue(all(len(frame['cels']) <= 16 for frame in layer[direction][action]))

    def test_unsupported_clip_counts_timing_and_budget_are_rejected(self):
        for mutate in (
            lambda r: r['clips']['walk']['durationsMs'].pop(),
            lambda r: r['clips']['inspect']['durationsMs'].__setitem__(0, 140),
            lambda r: r['clips']['inspect'].__setitem__('loop', True),
            lambda r: r['motion'].__setitem__('maximumDecodedAtlasBytes', 16777216),
            lambda r: r['motion'].__setitem__('sourceIndex', '../outside.json'),
        ):
            rig = copy.deepcopy(self.rig); mutate(rig)
            with self.assertRaises(ValueError): validate_rig(rig)

    def test_planted_inspect_feet_and_noncollapsed_bones_are_required(self):
        for mutate in (
            lambda m: m['targets']['down']['inspect'][2]['joints']['rightLeg'][2].__setitem__(1, 127),
            lambda m: m['targets']['down']['walk'][0].__setitem__('contact', []),
            lambda m: m['targets']['right']['walk'][0]['joints']['rightLeg'].__setitem__(1,
                m['targets']['right']['walk'][0]['joints']['rightLeg'][0][:]),
            lambda m: m['poses']['right']['occlusionPatch']['sampleOverrides'].__setitem__('unknown.garment', 57),
        ):
            authored = copy.deepcopy(self.motion); mutate(authored)
            with self.assertRaises(ValueError): motion.validate_motion_rig(authored, self.rig)

    def test_changed_index_and_rig_bytes_cannot_use_stale_source_hashes(self):
        for field in ('rigSha256', 'sourceIndexSha256'):
            rig = copy.deepcopy(self.rig); rig['motion'][field] = '0'*64
            with self.assertRaises(ValueError): motion.read_motion(rig, builder.SOURCE, builder.ROOT)

    def test_even_the_occluded_item_source_is_checked_before_packing(self):
        original = Path.read_bytes
        target = builder.SOURCE/'motion/held.tablet.inspect.aseprite'
        def changed(path):
            value = original(path)
            return value[:-1]+bytes([value[-1]^1]) if path == target else value
        with patch.object(Path, 'read_bytes', changed):
            with self.assertRaisesRegex(ValueError, 'editable source hash differs'):
                motion.read_motion(self.rig, builder.SOURCE, builder.ROOT)

    def test_source_direction_tags_and_frame_durations_are_not_trusted_from_index_alone(self):
        original = motion.read_aseprite
        for field in ('duration', 'tag'):
            def altered(path):
                frames, durations, tags = original(path)
                if path.name == 'top.shirt.walk.aseprite':
                    if field == 'duration': durations[0] = 320
                    else: tags['left.walk'] = [12, 17]
                return frames, durations, tags
            with patch.object(motion, 'read_aseprite', altered):
                with self.assertRaisesRegex(ValueError, 'editable geometry/timing differs'):
                    motion.read_motion(self.rig, builder.SOURCE, builder.ROOT)

    def test_interpolated_alpha_and_unmapped_hair_colour_are_rejected(self):
        original = motion.read_aseprite
        for kind in ('alpha', 'hair'):
            target = 'body.base.walk.aseprite' if kind == 'alpha' else 'hair.short.walk.aseprite'
            def altered(path):
                frames, durations, tags = original(path)
                if path.name == target:
                    image = frames[0]
                    for y in range(image.height):
                        for x in range(image.width):
                            pixel = image.getpixel((x, y))
                            if pixel[3]:
                                image.putpixel((x, y), (*pixel[:3], 127) if kind == 'alpha' else (1, 2, 3, 255))
                                return frames, durations, tags
                return frames, durations, tags
            with patch.object(motion, 'read_aseprite', altered):
                with self.assertRaises(ValueError): builder.compile_pack(self.rig)

    def test_latent_geometry_change_is_bound_even_when_pixel_outputs_match(self):
        authored = copy.deepcopy(self.motion)
        authored['poses']['left']['rightLeg']['width'] -= 1
        authored_bytes = builder.json_bytes(authored)
        index = copy.deepcopy(self.index)
        index['motionRigSha256'] = builder.sha(authored_bytes)
        index_bytes = builder.json_bytes(index)
        rig = copy.deepcopy(self.rig)
        rig['motion']['rigSha256'] = builder.sha(authored_bytes)
        rig['motion']['sourceIndexSha256'] = builder.sha(index_bytes)
        before_read_bytes, before_read_text = Path.read_bytes, Path.read_text
        files = {builder.SOURCE/'motion-rig.json': authored_bytes, builder.SOURCE/'motion/source-index.json': index_bytes}
        def read_bytes(path): return files[path] if path in files else before_read_bytes(path)
        def read_text(path, *args, **kwargs): return files[path].decode() if path in files else before_read_text(path, *args, **kwargs)
        with patch.object(Path, 'read_bytes', read_bytes), patch.object(Path, 'read_text', read_text):
            runtime, _, data, _, _ = builder.compile_pack(rig)
        original = fingerprints(self.rig, self.runtime, self.png)
        changed = fingerprints(rig, runtime, data)
        self.assertEqual(changed['atlasSha256'], original['atlasSha256'])
        self.assertEqual(changed['compositionSha256'], original['compositionSha256'])
        self.assertNotEqual(changed['sourceContractSha256'], original['sourceContractSha256'])

    def test_candidate_output_cannot_publish_or_rewrite_acceptance(self):
        before = builder.MANIFEST.read_bytes()
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(ValueError, 'outside public/generated'):
                builder.build_candidate(builder.SOURCE/'rig.json', Path(temporary), False)
        self.assertEqual(builder.MANIFEST.read_bytes(), before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
