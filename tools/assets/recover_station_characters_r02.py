#!/usr/bin/env python3
"""Recover the retained SpriteCook source family into editable production cels.

This explicit authoring command is separate from normal export/CI.  It preserves
provider inputs and never calls a provider. Run with --replace-source to repeat
the recorded crops, pose registration and nearest-neighbour scale conversion.
Human clothing geometry, profile IDs and all saved appearance options stay fixed.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageOps

from build_characters_r01 import clean, png, sha, write_aseprite

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/source/characters/station-r02'
PLAYER = ROOT / 'assets/source/characters/player-r01'
FAUNA = ROOT / 'assets/source/animals/station'
DIRS = ['down', 'right', 'up', 'left']


def read(asset: str) -> Image.Image:
    record = next(r for r in RECORDS if r['asset_id'] == asset)
    path = ROOT / record['file']
    if sha(path.read_bytes()) != record['sha256']:
        raise ValueError(f'Provider checksum differs: {path}')
    return clean(Image.open(path))


def grid(image: Image.Image, cols: int, rows: int) -> list[Image.Image]:
    return [image.crop((round(x * image.width / cols), round(y * image.height / rows),
                        round((x + 1) * image.width / cols), round((y + 1) * image.height / rows)))
            for y in range(rows) for x in range(cols)]


def main_component(image: Image.Image) -> Image.Image:
    """Separate the cat from tiny neighbouring-cell feet at the grid border."""
    remaining = {(x, y) for y in range(image.height) for x in range(image.width)
                 if image.getpixel((x, y))[3]}
    parts = []
    while remaining:
        stack = [remaining.pop()]
        part = set(stack)
        while stack:
            x, y = stack.pop()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    point = (x + dx, y + dy)
                    if point in remaining:
                        remaining.remove(point)
                        part.add(point)
                        stack.append(point)
        parts.append(part)
    parts.sort(key=len, reverse=True)
    if not parts or any(len(part) > 9 for part in parts[1:]):
        raise ValueError('Unexpected disconnected anatomy in the cat sheet')
    result = image.copy()
    for part in parts[1:]:
        for point in part:
            result.putpixel(point, (0, 0, 0, 0))
    return result


def replace(path: Path, frames: list[Image.Image], durations: int | list[int], tags: dict) -> None:
    if path.exists() and not REPLACE:
        raise ValueError(f'Explicit --replace-source required: {path}')
    path.unlink(missing_ok=True)
    write_aseprite(path, frames, durations, tags)


def grounded(frame: Image.Image, scale: float, size: tuple[int, int], pivot: tuple[int, int],
             source_pivot: tuple[float, float] | None = None) -> Image.Image:
    box = frame.getbbox()
    if box is None:
        raise ValueError('Empty source pose')
    px, py = source_pivot or ((box[0] + box[2]) / 2, box[3])
    resized = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.NEAREST)
    result = Image.new('RGBA', size)
    if source_pivot is None:
        bounds = resized.getbbox()
        offset = (pivot[0] - (bounds[0] + bounds[2]) // 2, pivot[1] - bounds[3])
    else:
        offset = (pivot[0] - round(px * scale), pivot[1] - round(py * scale))
    result.paste(resized, offset)
    b = result.getbbox()
    if b is None or b[0] < 1 or b[1] < 1 or b[2] >= size[0] or b[3] > pivot[1]:
        raise ValueError(f'Pose leaves its reviewed box: {b} of {size}')
    return clean(result)


def normalized_sequence(frames: list[Image.Image], height: int, size=(32, 48), pivot=(16, 46)) -> list[Image.Image]:
    bounds = [frame.getbbox() for frame in frames]
    union = (min(b[0] for b in bounds), min(b[1] for b in bounds),
             max(b[2] for b in bounds), max(b[3] for b in bounds))
    scale = height / (union[3] - union[1])
    anchor = ((union[0] + union[2]) / 2, union[3])
    return [grounded(frame, scale, size, pivot, anchor) for frame in frames]


def harmonize_world(frames: list[Image.Image], count: int = 40,
                    reference: list[Image.Image] | None = None) -> list[Image.Image]:
    """Consolidate one world actor's material ramps across all of its poses.

    Walking sprites already have authored small palettes; their exact colours
    become the palette for matching seated poses. New still-image families use
    one shared ramp selection, never separate per-frame quantization/dithering.
    Alpha, silhouette, face positions and all frame geometry stay unchanged.
    The detailed modular fitting artwork never passes through this function.
    """
    samples = [pixel[:3] for frame in (reference or frames)
               for pixel in frame.get_flattened_data() if pixel[3]]
    palette = sorted(set(samples))
    if len(palette) > count:
        strip = Image.new('RGB', (len(samples), 1))
        strip.putdata(samples)
        indexed = strip.quantize(colors=count - 2, method=Image.Quantize.MEDIANCUT,
                                 dither=Image.Dither.NONE)
        colors = indexed.getpalette()
        palette = [tuple(colors[i * 3:i * 3 + 3]) for _, i in indexed.getcolors()]
        # Protect the very light eyes/cheeks and deepest coloured outline.
        by_lightness = sorted(set(samples), key=lambda rgb: sum(rgb))
        palette = sorted(set(palette + [by_lightness[0], by_lightness[-1]]))
    mapping = {}
    result = []
    for frame in frames:
        pixels = []
        for pixel in frame.get_flattened_data():
            if not pixel[3]:
                pixels.append((0, 0, 0, 0)); continue
            rgb = pixel[:3]
            if rgb not in mapping:
                mapping[rgb] = min(palette, key=lambda p: sum((a - b) ** 2 for a, b in zip(rgb, p)))
            pixels.append((*mapping[rgb], 255))
        image = Image.new('RGBA', frame.size)
        image.putdata(pixels)
        result.append(clean(image))
    return result


def modular_parts() -> None:
    for record in RECORDS:
        label = record['label']
        if 'four directions' not in label or 'R02' not in label:
            continue
        name = label.split(' · ')[1]
        frames = grid(read(record['asset_id']), 2, 2)
        replace(PLAYER / 'editable' / f'{name}.aseprite', frames, 320,
                {f'{d}.idle': [i, i] for i, d in enumerate(DIRS)})
    rig_path = PLAYER / 'rig.json'
    rig_path.write_text(re.sub(r'("runtimeRevision"\s*:\s*")[^"]+(")',
                              r'\g<1>station-r02-20261116\g<2>', rig_path.read_text()))
    provenance_path = PLAYER / 'provenance.json'
    provenance = json.loads(provenance_path.read_text())
    provenance['stationR02'] = {
        'recovered': '2026-11-16', 'providerIndex': str((SOURCE / 'recovery.json').relative_to(ROOT)),
        'method': 'Exact 2x2 source sheets recovered at their original 96x144/64x64 frame geometry. Palette harmonisation only for human parts; shared new fauna for companions.',
        'preserved': 'All profile option IDs, four-view pivots, skin/hair ramps and fitting geometry.',
    }
    provenance_path.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')


def vera_frames() -> list[Image.Image]:
    """Keep canonical full-length legs; attach the provider's upper-body poses.

    The first two generated rows stop at the thighs even in preserved alpha at
    cutoffs 48/72/96/130. The last row has shortened legs. These are source
    framing defects, not transparent-edge losses. No missing anatomy is drawn.
    """
    base = read('09306496-1cfd-4f2b-8ef7-2863c8dd9f16')
    poses = grid(read('eba57b9c-072c-445c-8063-764689be22cc'), 3, 3)
    # Crown and waist anchors measured in each provider cell. Original legs
    # occupy x18..34, y55..90 on the 50x102 canonical source.
    placements = [(5, 5), (0, 5), (-6, 5), (6, 9), (1, 9), (-5, 9), (6, 11), (0, 11), (-6, 11)]
    result = []
    for pose, (dx, dy) in zip(poses, placements):
        canvas = Image.new('RGBA', (64, 102))
        canvas.paste(base.crop((0, 55, 50, 102)), (7, 55))
        # Keep the coat and its hands; the existing leg layer owns navy cloth
        # below the waist. The clear side regions keep the small hand gestures.
        upper = pose.copy()
        for y in range(max(0, 55 - dy), upper.height):
            for x in range(upper.width):
                r, g, b, a = upper.getpixel((x, y))
                if a and (b > r * 1.05 or y + dy >= 66):
                    upper.putpixel((x, y), (0, 0, 0, 0))
        canvas.alpha_composite(upper, (7 + dx, dy))
        result.append(canvas)
    # All frames share the canonical feet and crown scale.
    return [grounded(frame, 44 / 78, (40, 48), (20, 46), (32, 90)) for frame in result]


def people() -> None:
    path = ROOT / 'assets/manifests/characters.r01.json'
    manifest = json.loads(path.read_text())
    actors = {a['name']: a for a in manifest['actors']}
    walkers = {
        'field-worker': ('874e7204-55a1-4125-8dce-0d6f1bf549cb', 0),
        'observer': ('d69e9a12-a300-4590-8a44-9984122fdb68', None),
        'map-worker': ('88163dc6-1867-413a-8734-efac1429eada', 1),
        'shift-worker': ('0305ab7f-6843-4cc7-aa51-59ee0885e7b3', 2),
    }
    seated = grid(read('b0724626-9479-42c6-86eb-64dd16306ecc'), 3, 1)
    for name, (asset, seat) in walkers.items():
        raw = grid(read(asset), 4, 1)
        walk = normalized_sequence(raw, 44)
        frames, durations = [walk[0], *walk], [1000, 125, 125, 125, 125]
        tags = {'idle': [0, 0], 'walk': [1, 4]}
        if seat is not None:
            # Seated sprites keep the standing human scale, not its height.
            frames.append(grounded(seated[seat], 0.52, (32, 48), (16, 46)))
            durations.append(1000)
            tags.update({'sit': [5, 5], 'talk': [0, 0]})
        frames = harmonize_world(frames, reference=walk)
        actor_source = SOURCE / 'editable' / f'{name}.aseprite'
        replace(actor_source, frames, durations, tags)
        actor = actors[name]
        for obsolete in ('export_height', 'provider_sheet', 'provider_frame_size', 'provider_frame_count',
                         'frame_duration_ms', 'normalization', 'asset_id', 'source_asset_id', 'job_id',
                         'credits_used', 'providerSha256', 'tags'):
            actor.pop(obsolete, None)
        actor.update(source=str(actor_source.relative_to(ROOT)), displayHeight=48, pivot=[0.5, 46 / 48],
                     source_credit='Recovered SpriteCook R02 walk and seated poses; shared stable foot anchor.',
                     provider_assets=[asset] + (['b0724626-9479-42c6-86eb-64dd16306ecc'] if seat is not None else []))
    frames = harmonize_world(vera_frames(), 40)
    actor_source = SOURCE / 'editable/vera.aseprite'
    replace(actor_source, frames, [1400, 100, 1300, 240, 320, 320, 240, 240, 400],
            {'idle': [0, 8], 'talk': [3, 8]})
    pascal = [main_component(frame) for frame in grid(read('c6867f7d-9525-4c7e-bf00-fc26f9df9585'), 3, 3)]
    pascal = normalized_sequence(pascal, 22, (40, 32), (20, 29))
    pascal = harmonize_world(pascal, 40)
    replace(SOURCE / 'editable/pascal.aseprite', pascal,
            [1800, 100, 1200, 220, 220, 400, 500, 600, 1200], {'idle': [0, 8]})
    for name, size, pivot, ids in [
        ('vera', (40, 48), (20, 46), ['09306496-1cfd-4f2b-8ef7-2863c8dd9f16', 'eba57b9c-072c-445c-8063-764689be22cc']),
        ('pascal', (40, 32), (20, 29), ['c6867f7d-9525-4c7e-bf00-fc26f9df9585']),
    ]:
        actor = actors[name]
        for obsolete in ('export_height', 'provider_sheet', 'provider_frame_size', 'provider_frame_count',
                         'frame_duration_ms', 'normalization', 'asset_id', 'source_asset_id', 'job_id',
                         'credits_used', 'providerSha256', 'tags'):
            actor.pop(obsolete, None)
        actor.update(source=str((SOURCE / 'editable' / f'{name}.aseprite').relative_to(ROOT)),
                     displayHeight=size[1], pivot=[pivot[0] / size[0], pivot[1] / size[1]],
                     provider_assets=ids, source_credit='SpriteCook R02 poses; editable source with registered support line.')
    manifest['art_status'] = 'pending'
    manifest['provenance_r02'] = str((SOURCE / 'recovery.json').relative_to(ROOT))
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


def fauna() -> None:
    path = ROOT / 'assets/manifests/station.fauna.json'
    manifest = json.loads(path.read_text())
    for actor in manifest['actors']:
        name = actor['name']
        sheet_id = '11d73992-b9e5-4469-80ed-dda15c12c254' if name == 'squirrel' else 'ccbd3324-8b16-4fc2-b37e-6ae2a1096490'
        poses = grid(read(sheet_id), 3, 3)
        # World fauna traditionally faces left. Both R02 source sheets visibly
        # face right, regardless of the bird prompt's requested direction.
        # Convert world poses together before runtime route mirroring; fitting
        # directions below keep their separately authored four-view identity.
        poses = [ImageOps.mirror(pose) for pose in poses]
        height = 23 if name == 'squirrel' else 15
        idle_index = 3 if name == 'squirrel' else 1
        idle = poses[idle_index]
        scale = height / (idle.getbbox()[3] - idle.getbbox()[1])
        fixed = harmonize_world([grounded(p, scale, (48, 48), (24, 38)) for p in poses],
                                40 if name == 'squirrel' else 32)
        replace(FAUNA / 'editable' / f'{name}-campus.aseprite', [fixed[idle_index]], 1000, {'idle': [0, 0]})
        motions = {'run': ([4, 5, 6, 7, 8], 95)} if name == 'squirrel' else {'hop': ([4, 5, 6], 150), 'flutter': ([4, 7, 8, 7, 6], 150)}
        for action, (indices, ms) in motions.items():
            replace(FAUNA / 'editable' / f'{name}-{action}.aseprite', [fixed[i] for i in indices], ms, {action: [0, len(indices) - 1]})
        # Share the exact companion sheet with the fitting room. Its order is
        # down/right/up/left; fauna fitting's historical order is down/left/up/right.
        asset = '1574919b-a8c1-46cf-869b-840cc7bdf2fc' if name == 'squirrel' else 'ecfda920-f974-4358-ad4a-ff3ea68ab740'
        fitted = grid(read(asset), 2, 2)
        replace(FAUNA / 'editable' / f'{name}-fitting.aseprite', [fitted[i] for i in [0, 3, 2, 1]], 320,
                {d: [i, i] for i, d in enumerate(['down', 'left', 'up', 'right'])})
        # Preserve provider provenance while replacing the active pose source.
        target = FAUNA / 'provider' / f'{name}-r02-sheet.png'
        target.write_bytes((ROOT / next(r['file'] for r in RECORDS if r['asset_id'] == sheet_id)).read_bytes())
        actor['provider'] = {'r02': {'file': str(target.relative_to(FAUNA)), 'assetId': sheet_id, 'sha256': sha(target.read_bytes())}}
        actor['campusPivot'] = [24, 38]
        actor['motions'] = [{'action': action, 'sourceAssetId': sheet_id} for action in motions]
        for obsolete in ('legacyWorldHeight', 'campusSource', 'guides', 'poses', 'fittingScale', 'campusSupportX'):
            actor.pop(obsolete, None)
    manifest['model'] = 'gemini-nano-banana-2.1'
    manifest['source_authoring'] = 'tools/assets/recover_station_characters_r02.py --replace-source'
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


def icons() -> None:
    path = ROOT / 'assets/manifests/wardrobe-icons.json'
    manifest = json.loads(path.read_text())
    for item in manifest['icons']:
        if item['id'] not in ('companion.tit', 'companion.squirrel'): continue
        asset = '69bab40b-cd8e-419c-890b-c581559188c0' if item['id'] == 'companion.squirrel' else '8f1b0e81-45a0-43a2-94f0-c27ed3d566e0'
        original = ROOT / next(r['file'] for r in RECORDS if r['asset_id'] == asset)
        dest = ROOT / 'assets/source/ui/wardrobe-icons' / f'{item["id"]}.png'
        dest.write_bytes(original.read_bytes())
        item.update(asset_id=asset, sha256=sha(dest.read_bytes()))
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--replace-source', action='store_true')
    REPLACE = parser.parse_args().replace_source
    RECORDS = json.loads((SOURCE / 'recovery.json').read_text())['records']
    modular_parts()
    people()
    fauna()
    icons()
    print('Recovered R02 sources. Build exports, then obtain independent artwork acceptance.')
