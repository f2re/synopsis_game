#!/usr/bin/env python3
"""Render review contacts from packed cels without the author's compositor.

These images expose the cuff/hand and torso without a tablet concealing them.
They are evidence only: no source, production asset, or acceptance is changed.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from verify_motion_pixels import DEFAULT_PACK, DEFAULT, composed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pack', type=Path, default=DEFAULT_PACK)
    args = parser.parse_args()
    directory = Path(__file__).parent
    candidate = args.pack
    manifest_data = (candidate/'manifest.json').read_bytes()
    atlas_data = (candidate/'atlas.png').read_bytes()
    pack = json.loads(manifest_data)
    atlas = np.asarray(Image.open(candidate/'atlas.png').convert('RGBA'))
    tops = [name for name in pack['parts'] if name.startswith('top.')]
    inspections = [
        ('inspect-empty-hand', [('down', 'inspect', 2), ('left', 'inspect', 2), ('up', 'inspect', 2), ('right', 'inspect', 2)]),
        ('walk-side-empty-hand', [('left', 'walk', 0), ('left', 'walk', 3), ('right', 'walk', 0), ('right', 'walk', 3)]),
    ]
    files = {}
    for label, poses in inspections:
        contact = Image.new('RGBA', (140+104*len(poses), 24+160*len(tops)), '#e1e6dd')
        draw = ImageDraw.Draw(contact)
        for col, (direction, action, phase) in enumerate(poses):
            draw.text((144+104*col, 5), f'{direction} {action}{phase}', fill='#1e2931')
        for row, top in enumerate(tops):
            draw.text((5, 34+160*row), top, fill='#1e2931')
            for col, (direction, action, phase) in enumerate(poses):
                actor = Image.fromarray(composed(pack, atlas, {**DEFAULT, 'top': top}, direction, action, phase))
                contact.alpha_composite(actor, (144+104*col, 24+160*row))
        for suffix, scale in [('native', 1), ('2x', 2)]:
            path = directory/f'{label}-{suffix}.png'
            result = contact if scale == 1 else contact.resize((contact.width*scale, contact.height*scale), Image.Resampling.NEAREST)
            result.save(path)
            files[path.name] = sha256(path.read_bytes()).hexdigest()
    (directory/'independent-diagnostics.json').write_text(json.dumps({
        'status': 'REVIEW_EVIDENCE_NOT_APPROVAL',
        'manifestSha256': sha256(manifest_data).hexdigest(),
        'atlasSha256': sha256(atlas_data).hexdigest(),
        'method': 'Independent packed-cel compositor; all five tops; held.none; unchanged nearest pixel sampling',
        'files': files,
    }, indent=2)+'\n')
    print(json.dumps({'images': len(files), 'atlasSha256': sha256(atlas_data).hexdigest()}))


if __name__ == '__main__':
    main()
