#!/usr/bin/env python3
"""Regression tests for the accepted R01 migration and changed-content rejection."""
from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_modular_player_r01 as builder
from modular_player_contract import acceptance_result, digest, fingerprints, validate_rig


class ModularPlayerContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.rig = copy.deepcopy(builder.RIG)
        cls.source = json.loads(builder.MANIFEST.read_text())
        cls.runtime, cls.atlas, cls.png, cls.sources, cls.cel_count = builder.compile_pack(cls.rig)

    def admit(self, rig=None, runtime=None, data=None, source=None, root=None):
        return acceptance_result(source or self.source, rig or self.rig, runtime or self.runtime,
                                 data or self.png, root or builder.ROOT)

    def test_build_reproduces_the_reviewed_atlas_and_composition(self):
        self.assertEqual(digest(self.png), self.source['outputs']['atlasSha256'])
        runtime = copy.deepcopy(self.runtime)
        runtime['artAcceptance'] = 'PASS'
        self.assertEqual(builder.json_bytes(runtime), (builder.PUBLIC / 'manifest.json').read_bytes())
        self.assertEqual(self.cel_count, self.source['budget']['uniqueCels'])
        self.assertEqual(len(self.sources), 30)
        self.assertEqual(fingerprints(self.rig, self.runtime, self.png), self.source['acceptedFingerprint']['fingerprints'])

    def test_current_output_requires_matching_independent_evidence(self):
        result = self.admit()
        self.assertEqual(result['status'], 'PASS', result['reasons'])

    def test_actual_pixel_change_cannot_inherit_pass(self):
        load = builder.frame_source

        def altered(name, rig):
            frames, metadata = load(name, rig)
            if name == 'top.center-jacket':
                image = frames['down']
                for y in range(48, image.height):
                    for x in range(image.width):
                        r, g, b, a = image.getpixel((x, y))
                        if a:
                            image.putpixel((x, y), ((r + 1) % 256, g, b, a))
                            return frames, metadata
            return frames, metadata

        with patch.object(builder, 'frame_source', altered):
            runtime, _, data, _, _ = builder.compile_pack(copy.deepcopy(self.rig))
        self.assertNotEqual(digest(data), digest(self.png))
        result = self.admit(runtime=runtime, data=data)
        self.assertEqual(result['status'], 'PENDING')
        self.assertIn('changed or unreviewed atlasSha256', result['reasons'])

    def test_attachment_move_repositions_both_the_hand_and_held_item(self):
        rig = copy.deepcopy(self.rig)
        rig['assembly']['poses']['down']['anchors']['handRight']['at'][0] += 1
        runtime, _, data, _, _ = builder.compile_pack(rig)
        self.assertEqual(data, self.png, 'moving an attachment must reuse the same artwork')
        for before, after in [
            (self.runtime['body']['down']['idle'][0]['cels'][2], runtime['body']['down']['idle'][0]['cels'][2]),
            (self.runtime['parts']['held.tablet']['down']['idle'][0]['cels'][0], runtime['parts']['held.tablet']['down']['idle'][0]['cels'][0]),
        ]:
            self.assertEqual(after['at'], [before['at'][0] + 1, before['at'][1]])
        result = self.admit(rig=rig, runtime=runtime, data=data)
        self.assertEqual(result['status'], 'PENDING')
        self.assertIn('changed or unreviewed compositionSha256', result['reasons'])
        self.assertIn('changed or unreviewed sourceContractSha256', result['reasons'])

    def test_hidden_attachment_change_is_not_silently_accepted(self):
        rig = copy.deepcopy(self.rig)
        # The right hand is occluded in the left view. Its contract still matters
        # for the next authored pose even though no current cel uses this point.
        rig['assembly']['poses']['left']['anchors']['handRight']['at'][0] += 1
        runtime, _, data, _, _ = builder.compile_pack(rig)
        self.assertEqual(builder.json_bytes(runtime), builder.json_bytes(self.runtime))
        result = self.admit(rig=rig, runtime=runtime, data=data)
        self.assertEqual(result['status'], 'PENDING')
        self.assertEqual([v for v in result['reasons'] if v.startswith('changed')], ['changed or unreviewed sourceContractSha256'])

    def test_mask_change_requires_new_admission(self):
        rig = copy.deepcopy(self.rig)
        rig['assembly']['poses']['down']['masks']['handRight']['bounds'][0] -= 1
        runtime, _, data, _, _ = builder.compile_pack(rig)
        result = self.admit(rig=rig, runtime=runtime, data=data)
        self.assertEqual(result['status'], 'PENDING')
        self.assertIn('changed or unreviewed sourceContractSha256', result['reasons'])

    def test_layer_order_change_reuses_pixels_but_requires_new_admission(self):
        rig = copy.deepcopy(self.rig)
        rig['assembly']['poses']['up']['layerOrder']['backpack'] += 1
        runtime, _, data, _, _ = builder.compile_pack(rig)
        self.assertEqual(data, self.png)
        self.assertIn('changed or unreviewed compositionSha256', self.admit(rig=rig, runtime=runtime, data=data)['reasons'])

    def test_palette_change_cannot_inherit_pass(self):
        runtime = copy.deepcopy(self.runtime)
        runtime['palettes']['skin']['variants']['skin.light'][0][0] += 1
        self.assertIn('changed or unreviewed compositionSha256', self.admit(runtime=runtime)['reasons'])

    def test_missing_false_or_mismatched_evidence_is_pending(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            result = self.admit(root=root)
            self.assertEqual(result['status'], 'PENDING')
            for role in ('pixelArt', 'artDirection', 'sourceContract'):
                self.assertIn(f'missing {role} evidence', result['reasons'])
            # A document that merely mentions PASS is not an acceptance record.
            for role, path in self.source['acceptedFingerprint']['reviews'].items():
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text('PASS is still pending. ' + self.source['acceptedFingerprint']['fingerprints']['atlasSha256'])
            result = self.admit(root=root)
            self.assertIn('sourceContract evidence does not accept these fingerprints', result['reasons'])
            target = root / self.source['acceptedFingerprint']['reviews']['sourceContract']
            target.write_text('<!-- modular-player-source-contract: PASS -->\nwrong fingerprints')
            self.assertIn('sourceContract evidence does not accept these fingerprints', self.admit(root=root)['reasons'])

    def test_build_does_not_change_or_create_acceptance_pins(self):
        original = copy.deepcopy(self.source)
        self.admit()
        self.assertEqual(self.source, original)
        missing = copy.deepcopy(self.source)
        del missing['acceptedFingerprint']
        result = self.admit(source=missing)
        self.assertEqual(result['status'], 'PENDING')
        self.assertNotIn('acceptedFingerprint', missing)

    def test_unbounded_masks_unknown_attachments_and_required_hidden_layers_are_rejected(self):
        cases = []
        rig = copy.deepcopy(self.rig)
        rig['assembly']['poses']['down']['masks']['handRight']['bounds'][2] = 97
        cases.append(rig)
        rig = copy.deepcopy(self.rig)
        rig['assembly']['layers']['held']['attachment'] = 'missingJoint'
        cases.append(rig)
        rig = copy.deepcopy(self.rig)
        rig['assembly']['poses']['down']['hiddenLayers']['top'] = 'occlusion'
        cases.append(rig)
        rig = copy.deepcopy(self.rig)
        rig['slots']['held']['values'] = ['none', '../outside']
        cases.append(rig)
        rig = copy.deepcopy(self.rig)
        rig['assembly']['poses']['down']['fitting']['neckOpening'] = [[36, 60, 42]]
        cases.append(rig)
        rig = copy.deepcopy(self.rig)
        rig['assembly']['poses']['up']['layerOrder']['hairBack'] = 60
        cases.append(rig)
        for rig in cases:
            with self.subTest(rig=rig):
                with self.assertRaises(ValueError):
                    validate_rig(rig)


if __name__ == '__main__':
    unittest.main(verbosity=2)
