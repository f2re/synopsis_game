#!/usr/bin/env python3
"""Export reviewed inventory icons from editable Aseprite sources.

--import-source performs the explicit one-time extraction from the preserved
imagegen sheet. Regular builds read only the editable sources. No paid service,
art redraw, color quantization or generated-runtime hand edit is involved.
"""
import argparse
import json
from pathlib import Path
from PIL import Image
from build_characters_r01 import write_aseprite, read_aseprite, png, sha

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/ui.inventory-r01.json'


def save(path, data, check):
    if check:
        if not path.exists() or path.read_bytes() != data:
            raise ValueError(f'Missing or stale output: {path.relative_to(ROOT)}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or path.read_bytes() != data:
            path.write_bytes(data)


def build(check, import_sources):
    manifest = json.loads(MANIFEST.read_text())
    if check and (manifest.get('art_status') != 'pass' or not (ROOT / manifest['art_review']).is_file()):
        raise ValueError('Inventory icons require recorded independent art acceptance before CI/release')
    before = json.dumps(manifest, sort_keys=True)
    provider = ROOT / manifest['provider']['source']
    manifest['provider']['sha256'] = sha(provider.read_bytes())
    for item in manifest['items']:
        source = ROOT / item['source']
        if import_sources and not source.exists():
            cell = Image.open(provider).convert('RGBA').crop(tuple(item['providerCrop']))
            alpha = cell.getchannel('A').point(lambda a: 255 if a >= item['alphaCutoff'] else 0)
            cell.putalpha(alpha)
            bounds = alpha.getbbox()
            if not bounds:
                raise ValueError('Empty inventory icon')
            subject = cell.crop(bounds)
            inner = item['size'] - item['padding'] * 2
            scale = min(inner / subject.width, inner / subject.height)
            # Nearest-neighbour asset normalization; the original remains intact.
            subject = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
            canvas = Image.new('RGBA', (item['size'], item['size']))
            canvas.paste(subject, ((item['size'] - subject.width) // 2, (item['size'] - subject.height) // 2))
            write_aseprite(source, [canvas], 1000, {'idle': [0, 0]})
        frames, durations, tags = read_aseprite(source)
        if len(frames) != 1 or tags != {'idle': [0, 0]} or frames[0].size != (item['size'], item['size']):
            raise ValueError('Inventory icons require one canonical editable frame')
        image = frames[0]
        bounds = image.getchannel('A').getbbox()
        if not bounds or min(bounds[0], bounds[1], item['size'] - bounds[2], item['size'] - bounds[3]) < item['padding']:
            raise ValueError('Inventory icon is clipped or lacks its safe margin')
        data = png(image)
        save(ROOT / item['generated'], data, check)
        save(ROOT / 'apps/web/public' / item['url'].lstrip('/'), data, check)
        item['sourceSha256'] = sha(source.read_bytes())
        item['output'] = {'sha256': sha(data), 'bytes': len(data), 'dimensions': list(image.size), 'alpha': 'binary', 'bounds': list(bounds)}
    if check and before != json.dumps(manifest, sort_keys=True):
        raise ValueError('Stale source or output metadata')
    if not check:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"R01 inventory icons: {len(manifest['items'])} transparent assets; {'verified' if check else 'built'}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--import-source', action='store_true')
    args = parser.parse_args()
    if args.check and args.import_source:
        parser.error('Read-only verification and source import are separate operations')
    build(args.check, args.import_source)
