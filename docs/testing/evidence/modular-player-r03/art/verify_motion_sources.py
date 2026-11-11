#!/usr/bin/env python3
"""Independent source-to-packed-pixel check; never mutates source or admission."""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

from verify_motion_pixels import ROOT, DEFAULT_PACK, raster

sys.path.insert(0, str(ROOT/'tools/assets'))
from build_characters_r01 import read_aseprite


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pack', type=Path, default=DEFAULT_PACK)
    parser.add_argument('--rig', type=Path, help='Defaults to candidate rig, or the admitted source rig in a clean checkout')
    parser.add_argument('--output', type=Path, default=Path(__file__).parent/'source-proof.json')
    args = parser.parse_args()
    pack_data = (args.pack/'manifest.json').read_bytes()
    atlas_data = (args.pack/'atlas.png').read_bytes()
    pack = json.loads(pack_data)
    rig_path = args.rig or (args.pack/'rig-candidate.json')
    if not args.rig and not rig_path.exists():
        rig_path = ROOT/'assets/source/characters/player-r01/rig.json'
    rig = json.loads(rig_path.read_text())
    atlas = np.asarray(Image.open(args.pack/'atlas.png').convert('RGBA'))
    source = ROOT/'assets/source/characters/player-r01'
    index_path = source/'motion/source-index.json'
    index = json.loads(index_path.read_text())
    failures = []
    def require(condition, check, detail):
        if not condition:
            failures.append({'check': check, 'detail': detail})
    require(sha256(index_path.read_bytes()).hexdigest() == rig['motion']['sourceIndexSha256'], 'index-fingerprint', str(index_path.relative_to(ROOT)))
    require(sha256((source/'motion-rig.json').read_bytes()).hexdigest() == rig['motion']['rigSha256'] == index['motionRigSha256'], 'motion-fingerprint', None)
    author = ROOT/index['authoring']['script']
    require(sha256(author.read_bytes()).hexdigest() == index['authoring']['sha256'], 'author-script-fingerprint', str(author.relative_to(ROOT)))
    expected = {'body.base', 'body.hands', 'body.forearm', *rig['companionIds']}
    expected.update(f'{slot}.{value}' for slot, options in rig['slots'].items() for value in options['values'] if value != 'none')
    require(set(index['families']) == expected, 'family-coverage', sorted(expected-set(index['families'])))
    files = {}; published = 0; unpublished = 0; total = 0
    for name, actions in index['families'].items():
        require(set(actions) == {'walk', 'inspect'}, 'source-actions', name)
        for action, metadata in actions.items():
            path = index_path.parent/metadata['source']
            digest = sha256(path.read_bytes()).hexdigest()
            files[str(path.relative_to(ROOT))] = digest
            require(digest == metadata['sha256'], 'source-checksum', str(path.relative_to(ROOT)))
            frames, durations, tags = read_aseprite(path)
            size = (64, 64) if name.startswith('companion.') else (96, 144)
            expected_tags = {f'{direction}.{action}': [i*6, i*6+5] for i, direction in enumerate(rig['directions'])}
            require(len(frames) == 24 and durations == [140 if action == 'walk' else 240]*24 and tags == expected_tags, 'editable-frame-count-tags-timing', str(path.relative_to(ROOT)))
            for number, frame in enumerate(frames):
                direction = rig['directions'][number//6]; phase = number%6
                require(frame.size == size, 'editable-frame-size', [name, action, number])
                pixels = np.asarray(frame.convert('RGBA'))
                require(set(np.unique(pixels[:, :, 3])) <= {0, 255}, 'editable-binary-alpha', [name, action, number])
                total += 1
                pose = rig['assembly']['poses'][direction]
                if name == 'body.base':
                    cels = [cel for cel in pack['body'][direction][action][phase]['cels'] if cel['z'] == 0]
                elif name == 'body.hands':
                    cels = [cel for cel in pack['body'][direction][action][phase]['cels'] if cel['z'] == 70]
                elif name == 'body.forearm':
                    if not pose['extraBodyMasks'].get('top.shirt'):
                        unpublished += 1; continue
                    cels = [cel for cel in pack['parts']['top.shirt'][direction][action][phase]['cels'] if cel.get('paletteRole') == 'skin']
                elif name.startswith('companion.'):
                    cels = pack['companions'][name]['frames'][direction][action][phase]['cels']
                else:
                    selected = pack['parts'][name][direction][action][phase]
                    if selected.get('hidden'):
                        require(not selected['cels'], 'explicit-hidden-source', [name, direction, action, phase])
                        unpublished += 1; continue
                    cels = [cel for cel in selected['cels'] if cel['z'] == pose['layerOrder'][name.split('.')[0]]]
                packed = raster(cels, atlas, size)
                require(np.array_equal(pixels, packed), 'packed-pixels-equal-editable-source', [name, direction, action, phase, int(np.any(pixels != packed, axis=2).sum())])
                published += 1
    result = {'status': 'PASS' if not failures else 'REQUEST_CHANGES', 'reviewer': 'runtime_motion',
              'method': 'Accepted R02 Aseprite reader plus independent atlas rasterizer; exact RGBA comparisons',
              'candidateRevision': pack['revision'], 'sourceFiles': len(files), 'sourceFrames': total,
              'publishedSourceFramesCompared': published, 'explicitlyOccludedOrUnusedFramesStillHashed': unpublished,
              'sha256': {'manifest': sha256(pack_data).hexdigest(), 'atlas': sha256(atlas_data).hexdigest(), 'sourceIndex': sha256(index_path.read_bytes()).hexdigest()},
              'editableSources': files, 'failures': failures,
              'limits': ['No automatic art approval. Unused/occluded source planes remain checksum-bound even where they do not draw a runtime cel.']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({key:result[key] for key in ['status', 'sourceFiles', 'sourceFrames', 'publishedSourceFramesCompared', 'explicitlyOccludedOrUnusedFramesStillHashed']}, ensure_ascii=False))
    if failures:
        print(json.dumps(failures[:8], ensure_ascii=False))
    raise SystemExit(bool(failures))


if __name__ == '__main__':
    main()
