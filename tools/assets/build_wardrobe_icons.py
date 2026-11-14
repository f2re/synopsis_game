#!/usr/bin/env python3
"""Publish reviewed SpriteCook icon sources without resampling their pixels."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image
from build_characters_r01 import png

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/wardrobe-icons.json'
SOURCE = ROOT / 'assets/source/ui/wardrobe-icons'
PUBLIC = ROOT / 'apps/web/public/assets/items/wardrobe'


def build(check: bool) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for item in manifest['icons']:
        name = item['id']
        if not re.fullmatch(r'[a-z][a-z-]*\.[a-z][a-z_-]*', name):
            raise ValueError(f'Invalid icon ID: {name}')
        path = SOURCE / f'{name}.png'
        if hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
            raise ValueError(f'Source checksum mismatch: {path}')
        with Image.open(path) as source:
            image = source.convert('RGBA')
        alpha = image.getchannel('A')
        if image.size != (48, 48) or set(alpha.tobytes()) != {0, 255}:
            raise ValueError(f'{name}: expected 48×48 pixel art with binary alpha')
        subject = image.crop(alpha.getbbox())
        output = Image.new('RGBA', (64, 64))
        output.paste(subject, ((64 - subject.width) // 2, (64 - subject.height) // 2), subject)
        target = PUBLIC / f'{name}.png'
        if check:
            with Image.open(target) as current:
                if current.mode != 'RGBA' or current.size != output.size or current.tobytes() != output.tobytes():
                    raise ValueError(f'Published icon differs: {target}')
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(png(output))
    print(f'Wardrobe icons: {len(manifest["icons"])} native pixel assets')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
