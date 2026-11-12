#!/usr/bin/env python3
"""Independent pixel proof from packed cels. Does not set acceptance or modify art.

The baseline comes from the immutable v0.4.1 git tree, not a mutable new export.
Run from any working directory with --pack pointing at the candidate directory.
"""
from __future__ import annotations

import argparse
from collections import deque
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'assets/manifests/player-modular-r01.json').exists())
DEFAULT_PACK = ROOT/'artifacts/player-r03-motion/full-candidate'
if not (DEFAULT_PACK/'manifest.json').exists():
    DEFAULT_PACK = ROOT/'apps/web/public/assets/avatar/modular-r01'
BASE = '64b19acb7f8d1facdb49f880be8a21282dbdccbc'
DIRS = ('down', 'left', 'up', 'right')
SLOTS = ('hair', 'headwear', 'top', 'bottom', 'footwear', 'backpack', 'heldItem', 'badge')
DEFAULT = {'skinTone': 'skin.warm', 'hair': 'hair.short', 'hairColor': 'haircolor.brown', 'headwear': 'headwear.none',
           'top': 'top.center-jacket', 'bottom': 'bottom.dark-trousers', 'footwear': 'footwear.sneakers',
           'backpack': 'backpack.none', 'heldItem': 'held.none', 'badge': 'badge.none', 'companion': 'companion.none'}


def baseline(path):
    return subprocess.check_output(['git', 'show', f'{BASE}:{path}'], cwd=ROOT)


def raster(cels, atlas, size=(96, 144), palette=None, profile=DEFAULT):
    out = np.zeros((size[1], size[0], 4), dtype=np.uint8)
    for cel in sorted(cels, key=lambda c: c['z']):
        x, y, w, h = cel['rect']; left, top = cel['at']
        image = atlas[y:y+h, x:x+w].copy()
        if palette and cel.get('paletteRole'):
            role = cel['paletteRole']; definition = palette[role]
            target = definition['variants'][profile['skinTone' if role == 'skin' else 'hairColor']]
            source = image[:, :, :3].copy()
            for before, after in zip(definition['source'], target):
                image[:, :, :3][np.all(source == before, axis=2)] = after
        opaque = image[:, :, 3] == 255
        out[top:top+h, left:left+w][opaque] = image[opaque]
    return out


def composed(pack, atlas, profile, direction, action, phase, trace=False):
    tagged = [(cel, 0 if cel['z'] < 70 else 1) for cel in pack['body'][direction][action][phase]['cels']]
    for slot in SLOTS:
        tagged.extend((cel, 2 if cel.get('paletteRole') == 'skin' else 3) for cel in pack['parts'][profile[slot]][direction][action][phase]['cels'])
    tagged.sort(key=lambda pair: pair[0]['z'])
    image = raster([cel for cel, _ in tagged], atlas, palette=pack['palettes'], profile=profile)
    if not trace:
        return image
    owner = np.full((144, 96), -1, dtype=np.int8)
    for cel, tag in tagged:
        x, y, w, h = cel['rect']; left, top = cel['at']
        owner[top:top+h, left:left+w][atlas[y:y+h, x:x+w, 3] == 255] = tag
    return image, owner


def components(mask):
    unseen = set(zip(*np.nonzero(mask)))
    result = []
    while unseen:
        first = unseen.pop(); group = [first]; queue = deque([first])
        while queue:
            y, x = queue.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    other = (y+dy, x+dx)
                    if other in unseen:
                        unseen.remove(other); group.append(other); queue.append(other)
        if len(group) >= 5:
            result.append(np.array(group))
    return result


def separation(one, two):
    a = np.argwhere(one); b = np.argwhere(two)
    if not len(a) or not len(b):
        return None
    return int(min(np.max(np.abs(b-point), axis=1).min() for point in a))


def maximum_separation(one, two):
    a = np.argwhere(one); b = np.argwhere(two)
    if not len(a):
        return 0
    if not len(b):
        return 144
    return int(max(np.max(np.abs(b-point), axis=1).min() for point in a))


def enclosed_transparency(alpha):
    outside = np.zeros_like(alpha, dtype=bool)
    queue = deque([(0, 0)]); outside[0, 0] = True
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            yy, xx = y+dy, x+dx
            if 0 <= yy < alpha.shape[0] and 0 <= xx < alpha.shape[1] and not alpha[yy, xx] and not outside[yy, xx]:
                outside[yy, xx] = True; queue.append((yy, xx))
    return ~alpha & ~outside


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pack', type=Path, default=DEFAULT_PACK)
    parser.add_argument('--output', type=Path, default=Path(__file__).parent/'pixel-proof.json')
    args = parser.parse_args()
    manifest_data = (args.pack/'manifest.json').read_bytes(); atlas_data = (args.pack/'atlas.png').read_bytes()
    pack = json.loads(manifest_data); atlas = np.asarray(Image.open(BytesIO(atlas_data)).convert('RGBA'))
    old_data = baseline('apps/web/public/assets/avatar/modular-r01/manifest.json')
    old_atlas_data = baseline('apps/web/public/assets/avatar/modular-r01/atlas.png')
    old = json.loads(old_data); old_atlas = np.asarray(Image.open(BytesIO(old_atlas_data)).convert('RGBA'))
    failures = []; measurements = {}; counts = {}
    def require(condition, label, details=None):
        if not condition:
            failures.append({'check': label, 'details': details})
    require(pack['frame'] == {'width': 96, 'height': 144, 'pivot': [48, 136]}, 'human-frame-pivot')
    require(set(pack['clips']) == {'idle', 'walk', 'inspect'}, 'complete-clips')
    require(pack['clips']['walk'] == {'durationsMs': [140]*6, 'loop': True}, 'walk-cadence')
    require(pack['clips']['inspect'] == {'durationsMs': [240]*6, 'loop': False}, 'inspect-cadence')
    require(set(np.unique(atlas[:, :, 3])) <= {0, 255}, 'binary-alpha')
    measurements['decodedAtlasBytes'] = int(atlas.size)
    measurements['compressedAtlasBytes'] = len(atlas_data)
    require(atlas.size <= 4*1024*1024, 'decoded-atlas-budget')
    all_parts = [pack['body'], *pack['parts'].values(), *(entry['frames'] for entry in pack['companions'].values() if entry)]
    maximum_cels = 0
    for part in all_parts:
        for direction in DIRS:
            for action, clip in pack['clips'].items():
                require(len(part[direction][action]) == len(clip['durationsMs']), 'frame-coverage')
                maximum_cels = max(maximum_cels, *(len(frame['cels']) for frame in part[direction][action]))
    require(maximum_cels <= 16, 'cel-cap', maximum_cels)
    measurements['maximumCelsPerPlane'] = maximum_cels
    profiles = [('default', DEFAULT)]
    for slot in SLOTS:
        prefix = 'held.' if slot == 'heldItem' else slot+'.'
        profiles.extend((name, {**DEFAULT, slot: name}) for name in pack['parts'] if name.startswith(prefix))
    profiles.extend((name, {**DEFAULT, 'skinTone': name}) for name in pack['palettes']['skin']['variants'])
    profiles.extend((name, {**DEFAULT, 'hairColor': name}) for name in pack['palettes']['hair']['variants'])
    endpoints = 0; old_idle = 0
    for label, profile in profiles:
        for direction in DIRS:
            before = composed(old, old_atlas, profile, direction, 'idle', 0)
            for phase in range(4):
                require(np.array_equal(composed(old, old_atlas, profile, direction, 'idle', phase), composed(pack, atlas, profile, direction, 'idle', phase)), 'unchanged-accepted-idle', [label, direction, phase]); old_idle += 1
            for phase in (0, 5):
                after = composed(pack, atlas, profile, direction, 'inspect', phase)
                require(np.array_equal(before, after), 'inspect-endpoint-equals-idle', [label, direction, phase, int(np.any(before != after, axis=2).sum())]); endpoints += 1
    counts['unchangedIdleCompositions'] = old_idle; counts['inspectEndpointCompositions'] = endpoints
    skin_ramp = np.array(pack['palettes']['skin']['variants'][DEFAULT['skinTone']])
    skin_cases = []; underlay_cases = []; footwear_cases = []; foot_underlay_cases = []; torso_holes = []
    # The accepted body keeps a few cuff/knuckle pixels outside its extracted
    # hands and tiny dark garment-edge pixels. They are not new R03 defects.
    # Compare skin distance with that exact baseline (+1 for nearest sampling),
    # and reject detached lower underlay instead of erasing accepted pixels.
    for top in [name for name in pack['parts'] if name.startswith('top.') and name != 'top.shirt']:
        for direction in DIRS:
            before, previous_owner = composed(old, old_atlas, {**DEFAULT, 'top': top}, direction, 'idle', 0, trace=True)
            previous_skin = np.any(np.all(before[:, :, None, :3] == skin_ramp, axis=3), axis=2) & (previous_owner == 0)
            previous_skin[:48] = False
            previous_hands = raster([cel for cel in old['body'][direction]['idle'][0]['cels'] if cel['z'] >= 70], old_atlas)[:, :, 3] == 255
            allowed = max(3, maximum_separation(previous_skin, previous_hands)+1)
            previous_holes = int(enclosed_transparency(before[:, :, 3] == 255)[48:82].sum())
            for action in ('walk', 'inspect'):
                for phase in range(6):
                    image, owner = composed(pack, atlas, {**DEFAULT, 'top': top}, direction, action, phase, trace=True)
                    skin = np.any(np.all(image[:, :, None, :3] == skin_ramp, axis=3), axis=2)
                    skin[:48] = False
                    hands = raster([cel for cel in pack['body'][direction][action][phase]['cels'] if cel['z'] >= 70], atlas)[:, :, 3] == 255
                    gap = maximum_separation(skin & (owner == 0), hands)
                    if gap > allowed:
                        skin_cases.append([top, direction, action, phase, gap, allowed])
                    if action == 'walk':
                        holes = int(enclosed_transparency(image[:, :, 3] == 255)[48:82].sum())
                        if holes > previous_holes:
                            torso_holes.append([top, direction, phase, holes, previous_holes])
    require(not skin_cases, 'new-skin-separated-from-cuff-hands', skin_cases)
    # Negative spaces between an arm and the torso legitimately open/close.
    # Their count is a visual-review aid, not an automatic zero-hole rule.
    measurements['armTorsoNegativeSpaceChanges'] = len(torso_holes)
    for bottom in [name for name in pack['parts'] if name.startswith('bottom.')]:
        for footwear in [name for name in pack['parts'] if name.startswith('footwear.')]:
            for direction in DIRS:
                for action in ('walk', 'inspect'):
                    for phase in range(6):
                        profile = {**DEFAULT, 'bottom': bottom, 'footwear': footwear}
                        image, owner = composed(pack, atlas, profile, direction, action, phase, trace=True)
                        exposed = int((owner[96:] == 0).sum())
                        if exposed:
                            underlay_cases.append([bottom, footwear, direction, action, phase, exposed])
                        shoe = raster(pack['parts'][footwear][direction][action][phase]['cels'], atlas)[:, :, 3] == 255
                        trousers = raster(pack['parts'][bottom][direction][action][phase]['cels'], atlas)[:, :, 3] == 255
                        if action == 'walk':
                            lower_underlay = owner == 0; lower_underlay[:124] = False
                            gap = maximum_separation(lower_underlay, trousers)
                            if gap > 2:
                                foot_underlay_cases.append([bottom, footwear, direction, phase, gap])
                        for group in components(shoe):
                            mask = np.zeros_like(shoe); mask[group[:, 0], group[:, 1]] = True
                            gap = separation(mask, trousers)
                            if gap is None or gap > 2:
                                footwear_cases.append([bottom, footwear, direction, action, phase, gap])
    counts['bottomFootwearPoses'] = 3*3*4*2*6
    measurements['posesWithAcceptedStyleUnderlayEdgePixels'] = len(underlay_cases)
    measurements['maxUnderlayEdgePixelsPerPose'] = max((entry[-1] for entry in underlay_cases), default=0)
    require(not foot_underlay_cases, 'detached-underlay-foot-below-trousers', foot_underlay_cases)
    require(not footwear_cases, 'shoe-trouser-contact', footwear_cases)
    grip_cases = []; hidden_cases = 0; contact_cases = 0
    for held in ('held.tablet', 'held.map-folder', 'held.pencil'):
        for direction in DIRS:
            for action in ('walk', 'inspect'):
                for phase in range(6):
                    item = pack['parts'][held][direction][action][phase]
                    if not item['cels']:
                        require(item.get('hidden') in ('direction', 'occlusion'), 'explicit-held-occlusion', [held, direction, action, phase]); hidden_cases += 1; continue
                    hand_cels = [cel for cel in pack['body'][direction][action][phase]['cels'] if cel['z'] >= 70]
                    hand = raster(hand_cels, atlas)[:, :, 3] == 255
                    tool = raster(item['cels'], atlas)[:, :, 3] == 255
                    gap = separation(hand, tool); contact_cases += 1
                    if gap is None or gap > 2:
                        grip_cases.append([held, direction, action, phase, gap])
    require(not grip_cases, 'held-item-hand-contact', grip_cases)
    counts['visibleHandheldPoses'] = contact_cases; counts['explicitlyOccludedHandheldPoses'] = hidden_cases
    companion_frames = 0
    for name, child in pack['companions'].items():
        if not child:
            continue
        require(child['frame'] == old['companions'][name]['frame'] and child['anchor'] == old['companions'][name]['anchor'], 'companion-frame-anchor', name)
        for direction in DIRS:
            before = raster(old['companions'][name]['frames'][direction]['idle'][0]['cels'], old_atlas, (64, 64))
            for action in ('walk', 'inspect'):
                for phase in range(6):
                    after = raster(child['frames'][direction][action][phase]['cels'], atlas, (64, 64))
                    require(np.array_equal(before, after), 'independent-static-companion', [name, direction, action, phase]); companion_frames += 1
    counts['independentCompanionFrames'] = companion_frames
    result = {'status': 'PASS' if not failures else 'REQUEST_CHANGES', 'reviewer': 'runtime_motion', 'method': 'independent packed-cel compositor and pixel ownership/contact checks',
              'baselineCommit': BASE, 'candidate': str(args.pack.relative_to(ROOT)), 'candidateRevision': pack['revision'],
              'sha256': {'manifest': sha256(manifest_data).hexdigest(), 'atlas': sha256(atlas_data).hexdigest(), 'baselineManifest': sha256(old_data).hexdigest(), 'baselineAtlas': sha256(old_atlas_data).hexdigest()},
              'measurements': measurements, 'counts': counts, 'failures': failures,
              'limits': ['Pixel checks do not grant visual composition approval or measure browser/GPU performance.', 'Cuff-edge skin is compared to accepted R02 with at least a three-pixel hand envelope; pre-existing dark underlay edges and changing arm/torso negative spaces require visual review.', 'Explicit left-view occlusion preserves the anatomical right hand; no mirrored view is inferred.']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({key:result[key] for key in ('status', 'measurements', 'counts')}, ensure_ascii=False))
    print(json.dumps({'failures': [{'check': item['check'], 'count': len(item['details']) if isinstance(item['details'], list) else 1, 'examples': item['details'][:3] if isinstance(item['details'], list) else item['details']} for item in failures[:12]]}, ensure_ascii=False))
    raise SystemExit(bool(failures))


if __name__ == '__main__':
    main()
