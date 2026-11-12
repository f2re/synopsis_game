#!/usr/bin/env python3
"""Build the quiet reading-room vignette from its editable Aseprite layers.

The explicit source-refinement step removes the accidental decorative caption
and merges only near-identical RGB values, without a palette-count target.
Regular builds read Aseprite, preserve binary alpha, and export room, exterior
and glass mask. The original provider PNG remains immutable.
Independent art acceptance is separate from the reproducibility check.
"""
from __future__ import annotations

import argparse
import io
import json
import struct
import zlib
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

from build_hub_r01 import chunk, digest, read_layers, string

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/ui.station-room-r01.json'


def pixels(image: Image.Image):
    channels = iter(image.tobytes())
    return zip(*[channels] * len(image.getbands()))


def encode(image: Image.Image) -> bytes:
    target = io.BytesIO()
    image.save(target, format='PNG', optimize=False, compress_level=9)
    return target.getvalue()


def clean_alpha(image: Image.Image) -> Image.Image:
    result = image.convert('RGBA')
    raw = bytearray(result.tobytes())
    for offset in range(0, len(raw), 4):
        if raw[offset + 3] == 0:
            raw[offset:offset + 3] = b'\0\0\0'
    return Image.frombytes('RGBA', result.size, bytes(raw))


def refine_pixels(manifest: dict) -> tuple[Image.Image, dict]:
    """Deterministic small repair; no resize, dithering or hard posterization."""
    provider = Image.open(ROOT / manifest['provider']['source']).convert('RGBA')
    source = provider.copy()
    recipe = manifest['refinement']
    for repair in recipe['paperRepairs']:
        donor = tuple(repair['donorRect'])
        destination = tuple(repair['destinationRect'])
        if (donor[2] - donor[0], donor[3] - donor[1]) != (destination[2] - destination[0], destination[3] - destination[1]):
            raise ValueError('Paper repair cannot resize its donor pixels')
        source.paste(provider.crop(donor), destination)
    counts = Counter(pixels(source.convert('RGB')))
    radius = recipe['maxRgbEuclideanDistance']
    if not 0 < radius <= 3:
        raise ValueError('Near-duplicate cleanup must stay within RGB distance 3')
    buckets: dict[tuple, list] = defaultdict(list)
    replacements = {}
    for colour, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        bucket = tuple(channel // radius for channel in colour)
        candidates = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for candidate in buckets.get((bucket[0] + dx, bucket[1] + dy, bucket[2] + dz), ()):
                        distance = sum((left - right) ** 2 for left, right in zip(colour, candidate))
                        if distance <= radius ** 2:
                            candidates.append((distance, -counts[candidate], candidate))
        if candidates:
            replacements[colour] = min(candidates)[2]
        else:
            replacements[colour] = colour
            buckets[bucket].append(colour)
    normalized = Image.new('RGBA', source.size)
    normalized.putdata([(*replacements[pixel[:3]], pixel[3]) for pixel in pixels(source)])
    stats = {
        'providerColours': len(set(pixels(provider.convert('RGB')))),
        'canonicalColours': len(set(pixels(normalized.convert('RGB')))),
        'maxRgbDistanceSquaredOutsideRepair': max(sum((left - right) ** 2 for left, right in zip(pixel, replacements[pixel])) for pixel in counts),
        'targetPaletteCount': None,
        'resampledPixels': 0,
    }
    return normalized, stats


def import_source(manifest: dict, replace: bool = False) -> None:
    """Separate the canonical source into two complementary editable layers."""
    target = ROOT / manifest['source']
    if target.exists() and not replace:
        raise ValueError('Refusing to overwrite the editable room source')
    canonical_path = manifest.get('refinement', {}).get('canonicalSource', manifest['provider']['source'])
    source = Image.open(ROOT / canonical_path).convert('RGBA')
    if source.size != tuple(manifest['logicalSize']) or source.getchannel('A').getextrema() != (255, 255):
        raise ValueError('The provider scene must be opaque at its native size')
    mask = Image.new('L', source.size)
    draw = ImageDraw.Draw(mask)
    for polygon in manifest['glassPolygons']:
        draw.polygon([tuple(point) for point in polygon], fill=255)
    for polygon in manifest['occluderPolygons']:
        draw.polygon([tuple(point) for point in polygon], fill=0)
    exterior, interior = source.copy(), source.copy()
    exterior.putalpha(mask)
    interior.putalpha(ImageChops.invert(mask))
    layers = [('window-view', clean_alpha(exterior)), ('room-front', clean_alpha(interior))]
    chunks = [chunk(0x2007, struct.pack('<HHI8x', 1, 0, 0))]
    for index, (name, image) in enumerate(layers):
        chunks.append(chunk(0x2004, struct.pack('<6HB3x', 3, 0, 0, 0, 0, 0, 255) + string(name)))
        cel = struct.pack('<HhhBHh5xHH', index, 0, 0, 255, 2, 0, image.width, image.height)
        chunks.append(chunk(0x2005, cel + zlib.compress(image.tobytes(), 9)))
    body = b''.join(chunks)
    frame = struct.pack('<IHHH2xI', len(body) + 16, 0xF1FA, len(chunks), 1000, 0) + body
    header = bytearray(128)
    struct.pack_into('<IHHHHHIH', header, 0, len(frame) + 128, 0xA5E0, 1, source.width, source.height, 32, 1, 1000)
    header[34:36] = bytes((1, 1))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(bytes(header) + frame)


def save(path: Path, data: bytes, check: bool) -> None:
    if check:
        if not path.is_file() or path.read_bytes() != data:
            raise ValueError(f'Stale output: {path.relative_to(ROOT)}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.is_file() or path.read_bytes() != data:
            path.write_bytes(data)


def build(check: bool, import_sources: bool, require_approved: bool, refine_source: bool) -> None:
    manifest = json.loads(MANIFEST.read_text())
    previous = json.dumps(manifest, sort_keys=True)
    if refine_source and manifest.get('art_status') == 'pass':
        raise ValueError('Invalidate the independent approval before refining source art')
    if require_approved:
        review = manifest.get('art_review')
        if manifest.get('art_status') != 'pass' or not review or not (ROOT / review).is_file():
            raise ValueError('Independent pixel-art and Art Director acceptance is required')
    if manifest.get('refinement'):
        canonical, stats = refine_pixels(manifest)
        canonical_data = encode(canonical)
        save(ROOT / manifest['refinement']['canonicalSource'], canonical_data, not refine_source)
        manifest['refinement']['canonicalSha256'] = digest(canonical_data)
        manifest['refinement']['diagnostics'] = stats
    if refine_source:
        import_source(manifest, replace=True)
    if import_sources:
        import_source(manifest)
    layers = read_layers(ROOT / manifest['source'])
    if set(layers) != {'window-view', 'room-front'}:
        raise ValueError('The room source must keep exactly the two named layers')
    width, height = manifest['logicalSize']
    for name, layer in layers.items():
        if layer.size != (width, height) or set(layer.getchannel('A').tobytes()) != {0, 255}:
            raise ValueError(f'Invalid dimensions or alpha in {name}')
    window_alpha = layers['window-view'].getchannel('A')
    if ImageChops.add(window_alpha, layers['room-front'].getchannel('A')).getextrema() != (255, 255):
        raise ValueError('The scene layers leave holes')
    if ImageChops.multiply(window_alpha, layers['room-front'].getchannel('A')).getextrema() != (0, 0):
        raise ValueError('The scene layers overlap')
    mask = Image.new('RGBA', (width, height), (255, 255, 255, 0))
    mask.putalpha(window_alpha)
    outputs = {**layers, 'window-mask': clean_alpha(mask)}
    combined = Image.alpha_composite(layers['window-view'], layers['room-front'])
    canonical_path = manifest.get('refinement', {}).get('canonicalSource', manifest['provider']['source'])
    canonical = Image.open(ROOT / canonical_path).convert('RGBA')
    if combined.tobytes() != canonical.tobytes():
        raise ValueError('Room decomposition changed visible canonical pixels')
    total_bytes = 0
    for item in manifest['assets']:
        image = clean_alpha(outputs[item['layer']])
        data = encode(image)
        save(ROOT / item['generated'], data, check)
        save(ROOT / 'apps/web/public' / item['url'].lstrip('/'), data, check)
        item['sha256'] = digest(data)
        item['bytes'] = len(data)
        total_bytes += len(data)
    manifest['sourceSha256'] = digest((ROOT / manifest['source']).read_bytes())
    manifest['provider']['sha256'] = digest((ROOT / manifest['provider']['source']).read_bytes())
    manifest['totals'] = {'pngBytes': total_bytes, 'decodedBytes': width * height * 4 * len(outputs)}
    if total_bytes > manifest['budgets']['pngBytes'] or manifest['totals']['decodedBytes'] > manifest['budgets']['decodedBytes']:
        raise ValueError('Reading-room resource budget exceeded')
    if require_approved:
        approval = manifest.get('approval', {})
        if approval.get('sourceSha256') != manifest['sourceSha256']:
            raise ValueError('The independent acceptance is not bound to this exact source')
        if approval.get('outputs') != {item['id']: item['sha256'] for item in manifest['assets']}:
            raise ValueError('The independent acceptance does not match the exported layers')
    if check and json.dumps(manifest, sort_keys=True) != previous:
        raise ValueError('Stale scene manifest hashes or dimensions')
    if not check:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        registry_path = ROOT / 'assets/manifests/spritecook-assets.json'
        registry = json.loads(registry_path.read_text())
        entry = {'id': manifest['provider']['source'], 'asset_id': manifest['provider']['asset_id'],
                 'sha12': manifest['provider']['sha256'][:12], 'label': '26063 — тихая читальня R01'}
        registry['assets'] = [a for a in registry['assets'] if a.get('id') != entry['id']] + [entry]
        registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n')
    print(f"Station room R01: {width}×{height}, two complementary layers + glass mask; {total_bytes:,} bytes; {'verified' if check else 'built'}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--import-source', action='store_true')
    parser.add_argument('--require-approved', action='store_true')
    parser.add_argument('--refine-source', action='store_true', help='Rebuild canonical PNG and Aseprite from the preserved provider using the explicit refinement recipe')
    args = parser.parse_args()
    if args.check and (args.import_source or args.refine_source):
        parser.error('Source import/refinement and read-only verification are separate')
    if args.import_source and args.refine_source:
        parser.error('Choose source import or explicit refinement')
    build(args.check, args.import_source, args.require_approved, args.refine_source)
