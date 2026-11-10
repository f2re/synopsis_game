#!/usr/bin/env python3
"""Reproduce equipment art from editable sources; no network or AI calls.

The explicit --import-source operation extracts four reviewed sheet quadrants
once and wraps them in Aseprite. Later builds read the editable sources only.
The large interior has its own opaque, full-resolution source and class.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image
from build_characters_r01 import write_aseprite, read_aseprite, png, sha
from build_hub_r01 import import_source, read_layers

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/ui.equipment-r01.json'


def save(path: Path, data: bytes, check: bool) -> None:
    if check:
        if not path.exists() or path.read_bytes() != data:
            raise ValueError(f'Missing or stale output: {path.relative_to(ROOT)}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or path.read_bytes() != data:
            path.write_bytes(data)


def build(check: bool, import_sources: bool) -> None:
    manifest = json.loads(MANIFEST.read_text())
    if check and (manifest.get('art_status') != 'pass' or not (ROOT / manifest['art_review']).is_file()):
        raise ValueError('Equipment art needs recorded independent acceptance')
    previous = json.dumps(manifest, sort_keys=True)
    for provider in manifest['providers']:
        provider['sha256'] = sha((ROOT / provider['source']).read_bytes())
    total_bytes = decoded_bytes = 0
    for item in manifest['assets']:
        source = ROOT / item['source']
        if item['class'] == 'large_scene':
            if import_sources and not source.exists():
                import_source({'source': item['source'], 'assets': [{
                    'source_png': item['providerSource'], 'source_rect': {'x': 0, 'y': 0}, 'layer': 'room'
                }]})
            image = read_layers(source)['room']
            if image.size != tuple(item['size']) or set(image.getchannel('A').tobytes()) != {255}:
                raise ValueError('Interior must remain opaque at its authored size')
            frames, durations = [image], [1000]
        else:
            if import_sources and not source.exists():
                image = Image.open(ROOT / item['providerSource']).convert('RGBA').crop(tuple(item['providerCrop']))
                alpha = image.getchannel('A').point(lambda value: 255 if value >= item['alphaCutoff'] else 0)
                image.putalpha(alpha)
                bounds = alpha.getbbox()
                if not bounds:
                    raise ValueError('Empty badge cell')
                subject = image.crop(bounds)
                inner = item['size'][0] - item['padding'] * 2
                scale = min(inner / subject.width, inner / subject.height)
                subject = subject.resize((round(subject.width * scale), round(subject.height * scale)), Image.Resampling.NEAREST)
                canvas = Image.new('RGBA', tuple(item['size']))
                canvas.paste(subject, ((canvas.width - subject.width) // 2, (canvas.height - subject.height) // 2))
                write_aseprite(source, [canvas], 1000, {'idle': [0, 0]})
            frames, durations, tags = read_aseprite(source)
            if len(frames) != item.get('frames', 1) or frames[0].size != tuple(item['size']):
                raise ValueError('Badge source dimensions/frame count mismatch')
            for frame in frames:
                alpha = frame.getchannel('A')
                bounds = alpha.getbbox()
                if set(alpha.tobytes()) != {0, 255} or not bounds:
                    raise ValueError('Badges require binary transparency')
                if min(bounds[0], bounds[1], frame.width - bounds[2], frame.height - bounds[3]) < item['padding']:
                    raise ValueError('Clipped badge or missing transparent safe margin')
            if tags != item.get('tags', {'idle': [0, 0]}):
                raise ValueError('Badge animation tags mismatch')
            image = Image.new('RGBA', (frames[0].width * len(frames), frames[0].height))
            for index, frame in enumerate(frames):
                image.paste(frame, (index * frame.width, 0))
        data = png(image)
        save(ROOT / item['generated'], data, check)
        save(ROOT / 'apps/web/public' / item['url'].lstrip('/'), data, check)
        item['sourceSha256'] = sha(source.read_bytes())
        item['output'] = {'sha256': sha(data), 'bytes': len(data), 'dimensions': list(image.size),
                          'frames': len(frames), 'durationsMs': durations,
                          'decodedBytes': image.width * image.height * 4}
        total_bytes += len(data)
        decoded_bytes += item['output']['decodedBytes']
    if total_bytes > manifest['budgets']['pngBytes'] or decoded_bytes > manifest['budgets']['decodedBytes']:
        raise ValueError('Equipment art exceeds its route budget')
    manifest['totals'] = {'pngBytes': total_bytes, 'decodedBytes': decoded_bytes}
    if check and previous != json.dumps(manifest, sort_keys=True):
        raise ValueError('Stale equipment source/output metadata')
    if not check:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"Equipment R01: {len(manifest['assets'])} assets; {total_bytes:,} PNG bytes; {decoded_bytes:,} decoded; {'verified' if check else 'built'}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--import-source', action='store_true')
    args = parser.parse_args()
    if args.check and args.import_source:
        parser.error('Source import and read-only verification are separate')
    build(args.check, args.import_source)
