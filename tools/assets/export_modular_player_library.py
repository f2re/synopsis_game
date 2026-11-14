#!/usr/bin/env python3
"""Export the accepted wearable sources for reuse in SpriteCook, without generation.

Each PNG is a 2x2 contact sheet of exact source pixels: down/right, up/left.
The full logical frame is preserved in each cell. These are reference sheets,
not game atlases or animations. Importing them never changes the runtime pack.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image

from build_characters_r01 import read_aseprite, save
from build_modular_player_r01 import pack_png

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/player-modular-r01.json'
OUTPUT = ROOT / 'assets/generated/characters/player-r01/library'
REGISTRY = ROOT / 'assets/source/characters/player-r01/spritecook-family-library.json'
DIRECTIONS = ('down', 'right', 'up', 'left')


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def export(check: bool, require_registry: bool = False) -> None:
    manifest = json.loads(MANIFEST.read_text())
    index = {'version': 1, 'rigId': manifest['id'], 'layout': '2x2',
             'purpose': 'Exact directional reference sheets, not animation inputs', 'families': []}
    for family, source in manifest['sources'].items():
        if not re.fullmatch(r'[a-z][a-z0-9.-]*', family):
            raise ValueError('Unsafe family identifier')
        path = ROOT / source['source']
        if path.resolve().parent != ROOT / 'assets/source/characters/player-r01/editable':
            raise ValueError(f'{family}: unexpected source directory')
        if digest(path.read_bytes()) != source['sha256']:
            raise ValueError(f'{family}: changed source; rebuild and review the pack first')
        frames, durations, tags = read_aseprite(path)
        expected = {f'{direction}.idle': [i, i] for i, direction in enumerate(DIRECTIONS)}
        if len(frames) != 4 or tags != expected or durations != [320] * 4:
            raise ValueError(f'{family}: unsupported directional source')
        width, height = source['frameSize']
        if any(frame.size != (width, height) for frame in frames):
            raise ValueError(f'{family}: inconsistent logical frames')
        sheet = Image.new('RGBA', (width * 2, height * 2))
        cells = []
        for i, (direction, frame) in enumerate(zip(DIRECTIONS, frames)):
            x, y = (i % 2) * width, (i // 2) * height
            sheet.paste(frame, (x, y))
            cells.append({'direction': direction, 'rect': [x, y, width, height]})
        data = pack_png(sheet)
        target = OUTPUT / f'{family}.png'
        save(target, data, check)
        index['families'].append({'id': family, 'source': source['source'],
            'sourceSha256': source['sha256'], 'file': str(target.relative_to(ROOT)),
            'sha256': digest(data), 'sha12': digest(data)[:12], 'bytes': len(data),
            'frameSize': [width, height], 'cells': cells})
    encoded = (json.dumps(index, ensure_ascii=False, indent=2) + '\n').encode()
    save(OUTPUT / 'index.json', encoded, check)
    if require_registry:
        registry = json.loads(REGISTRY.read_text())
        registered = {entry['id']: entry for entry in registry['families']}
        if set(registered) != {entry['id'] for entry in index['families']}:
            raise ValueError('SpriteCook registry must cover every source family exactly once')
        if len(registry['families']) != len(registered):
            raise ValueError('Duplicate source families in SpriteCook registry')
        if len({entry['asset_id'] for entry in registered.values()}) != len(registered):
            raise ValueError('Each directional family must have its own SpriteCook asset id')
        for family in index['families']:
            remote = registered[family['id']]
            if remote['sha12'] != family['sha12'] or remote['file'] != family['file']:
                raise ValueError(f"{family['id']}: stale SpriteCook reference hash")
            if not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', remote['asset_id']):
                raise ValueError(f"{family['id']}: missing SpriteCook asset id")
    print(f"SpriteCook reusable library: {len(index['families'])} families, "
          f"{len(index['families']) * 4} exact directional cells; "
          f"{'verified' if check else 'exported'}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--require-registry', action='store_true')
    args = parser.parse_args()
    export(args.check, args.require_registry)
