#!/usr/bin/env python3
"""Pack R08-only gait cels with untouched R02 costume art and authored foot contacts."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

from build_characters_r01 import ROOT, canonical_png, read_aseprite, save, versioned_png_url, write_aseprite

SOURCE = ROOT / 'assets/source/characters/station-r08'
RUNTIME_MANIFEST = ROOT / 'packages/world-engine/src/assets/characters/r08-walk.json'
PUBLIC = Path('apps/web/public/hub/characters/r08')
GENERATED = Path('assets/generated/characters/station-r08')


def draw_leg(draw, hip, waist, foot, ink, cloth, boot, near):
    x, sole = foot
    knee_y = waist + 7
    knee_x = round((hip + x) / 2) + (1 if sole < 45 else 0)
    draw.polygon([
        (hip - 2, waist), (hip + 2, waist), (knee_x + 2, knee_y),
        (x + 1, sole - 2), (x - 2, sole - 2), (knee_x - 2, knee_y),
    ], fill=ink)
    draw.line([(hip, waist), (knee_x, knee_y), (x, sole - 3)], fill=cloth, width=2)
    # Both shoes point in the facing direction. The planted shoe retains its
    # native silhouette and the same sole line throughout its support phase.
    draw.polygon([
        (x - 2, sole - 3), (x + 1, sole - 3), (x + 2, sole - 2),
        (x + 3, sole - 1), (x + 3, sole), (x - 2, sole),
    ], fill=ink)
    draw.line([(x - 1, sole - 2), (x + (2 if near else 1), sole - 1)], fill=boot, width=1)


def author(actor, source, spec):
    frames, _, tags = read_aseprite(ROOT / source['source'])
    width, height = spec['frameSize']
    # Only the lower legs are redrawn. Keep the original walking torso,
    # including the coat hem and held objects, on its existing native grid.
    original = frames[tags['walk'][0]]
    if original.size != (width, height):
        original = original.resize((width, height), Image.Resampling.NEAREST)
    waist = actor['waistY']
    native_size = (width // spec['artPixelSize'], height // spec['artPixelSize'])
    torso = original.crop((0, 0, width, waist + 1))
    output = []
    for near, far in spec['steps']:
        frame = Image.new('RGBA', (width, height))
        draw = ImageDraw.Draw(frame)
        for is_near, (hip, foot) in enumerate(zip(reversed(actor['hips']), (far, near))):
            offset, sole = foot
            draw_leg(
                draw, hip, waist, (spec['pivot'][0] + offset, sole),
                actor['ink'], actor['trousers'][is_near], actor['boots'][is_near], bool(is_near),
            )
        frame.alpha_composite(torso)
        output.append(frame.resize(native_size, Image.Resampling.NEAREST))
    return output


def export_clip(source, action, frames, durations, spec, check):
    width, height = (dimension * spec['artPixelSize'] for dimension in frames[0].size)
    name = source['name']
    native_size = (width // spec['artPixelSize'], height // spec['artPixelSize'])
    packed = Image.new('RGBA', (width * len(frames), height))
    for index, native in enumerate(frames):
        if native.size != native_size:
            raise ValueError(f'{name}/{action}: expected native grid source dimensions')
        frame = native.resize((width, height), Image.Resampling.NEAREST)
        box = frame.getbbox()
        if box is None or box[3] != spec['pivot'][1]:
            raise ValueError(f'{name}/{action}, frame {index}: changed sole line')
        packed.paste(frame, (width * index, 0))
    filename = f'{name}-{action}.png'
    data = canonical_png(packed)
    save(ROOT / PUBLIC / filename, data, check)
    save(ROOT / GENERATED / filename, data, check)
    return {
        'assetId': f'character.r08.{name}.{action}',
        'url': versioned_png_url(f'/hub/characters/r08/{filename}', packed),
        'frameWidth': width,
        'frameHeight': height,
        'frameCount': len(frames),
        'durationsMs': durations,
        **({'facing': 'right'} if action == 'walk' else {}),
    }


def build(check, author_sources):
    spec = json.loads((SOURCE / 'walk-poses.json').read_text(encoding='utf-8'))
    source_actors = {actor['name']: actor for actor in json.loads((ROOT / spec['sourceManifest']).read_text())['actors']}
    clips = {}
    for name in spec['stationaryActors']:
        source = source_actors[name]
        source_frames, source_durations, tags = read_aseprite(ROOT / source['source'])
        source_width, source_height = source_frames[0].size
        height = source.get('export_height', source_height)
        width = round(source_width * height / source_height)
        native_size = (width // spec['artPixelSize'], height // spec['artPixelSize'])
        for action in spec['stationaryActions']:
            if action not in tags:
                continue
            start, end = tags[action]
            frames = [
                frame.resize((width, height), Image.Resampling.NEAREST).resize(native_size, Image.Resampling.NEAREST)
                for frame in source_frames[start:end + 1]
            ]
            clips[f"{source['id']}.{action}"] = export_clip(
                source, action, frames, source_durations[start:end + 1], spec, check,
            )
    for actor in spec['actors']:
        name = actor['name']
        source = source_actors[name]
        editable = SOURCE / 'editable' / f'{name}-walk.aseprite'
        if author_sources:
            frames = author(actor, source, spec)
            write_aseprite(editable, frames, spec['durationMs'], {'walk': [0, len(frames) - 1]})
        frames, durations, tags = read_aseprite(editable)
        if tags != {'walk': [0, 7]} or len(frames) != len(spec['steps']):
            raise ValueError(f'{name}: expected the authored eight-frame walk tag')
        clips[f"{source['id']}.walk"] = export_clip(source, 'walk', frames, durations, spec, check)
    manifest = {'cycleDistancePx': spec['cycleDistancePx'], 'clips': clips}
    save(RUNTIME_MANIFEST, (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode(), check)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--author-source', action='store_true')
    args = parser.parse_args()
    build(args.check, args.author_source)
