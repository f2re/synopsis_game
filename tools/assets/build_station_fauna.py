#!/usr/bin/env python3
"""Build SpriteCook fitting poses and station fauna from editable source cels."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps
from build_characters_r01 import clean, png, read_aseprite, sha, write_aseprite

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/station.fauna.json'
SOURCE = ROOT / 'assets/source/animals/station'
GENERATED = ROOT / 'assets/generated/animals/station'
PUBLIC = ROOT / 'apps/web/public/assets/fauna/station'
RUNTIME = ROOT / 'packages/world-engine/src/assets/hub/station-fauna.json'
DIRECTIONS = ('down', 'left', 'up', 'right')


def load_provider(item: dict) -> Image.Image:
    path = SOURCE / item['file']
    if sha(path.read_bytes()) != item['sha256']:
        raise ValueError(f'Provider checksum mismatch: {path}')
    with Image.open(path) as source:
        return clean(source)


def normalized(image: Image.Image, size: tuple[int, int], source_x: int, pivot: tuple[int, int]) -> Image.Image:
    x0, y0, x1, y1 = image.getbbox()
    output = Image.new('RGBA', size)
    output.paste(image.crop((x0, y0, x1, y1)), (pivot[0] + x0 - source_x, pivot[1] + y0 - y1))
    if output.getbbox() != (pivot[0] + x0 - source_x, pivot[1] + y0 - y1, pivot[0] + x1 - source_x, pivot[1]):
        raise ValueError('Fauna frame clips around its foot pivot')
    return clean(output)


def import_sources(actor: dict) -> None:
    sheet = load_provider(actor['provider']['fitting'])
    guides = actor['guides']
    color = tuple(guides['rgba'])
    for y in range(sheet.height):
        for x in range(sheet.width):
            if (x in guides['columns'] or y in guides['rows']) and sheet.getpixel((x, y)) == color:
                sheet.putpixel((x, y), (0, 0, 0, 0))
    poses = []
    for pose in actor['poses']:
        cel = sheet.crop(tuple(pose['crop']))
        if pose.get('mirror'):
            cel = ImageOps.mirror(cel)
        support_x = pose['supportX']
        if 'fittingScale' in actor:
            scale = actor['fittingScale']
            cel = cel.resize((round(cel.width * scale), round(cel.height * scale)), Image.Resampling.NEAREST)
            support_x = round(support_x * scale)
        poses.append(normalized(cel, (64, 64), support_x, (32, 60)))
    directory = SOURCE / 'editable'
    directory.mkdir(parents=True, exist_ok=True)
    write_aseprite(directory / f"{actor['name']}-fitting.aseprite", poses, 320,
                   {direction: [index, index] for index, direction in enumerate(DIRECTIONS)})
    still = load_provider(actor['provider']['campus'])
    size = (still.width + 8, still.height + 8)
    pivot = tuple(actor['campusPivot'])
    grounded = normalized(still, size, actor['campusSupportX'], pivot)
    write_aseprite(directory / f"{actor['name']}-campus.aseprite", [grounded], 1000, {'idle': [0, 0]})


def publish(name: str, image: Image.Image, check: bool) -> None:
    for directory in (GENERATED, PUBLIC):
        target = directory / name
        if check:
            with Image.open(target) as existing:
                if existing.mode != 'RGBA' or existing.size != image.size or existing.tobytes() != image.tobytes():
                    raise ValueError(f'Stale fauna PNG: {target}')
        else:
            directory.mkdir(parents=True, exist_ok=True)
            target.write_bytes(png(image))


def motion_clip(actor: dict, motion: dict, size: tuple[int, int], check: bool, importing: bool) -> dict:
    name = f"{actor['name']}-{motion['action']}"
    path = SOURCE / 'editable' / f'{name}.aseprite'
    strip = load_provider(motion)
    frame_width = motion['sourceFrameWidth']
    if frame_width < 1 or strip.width % frame_width:
        raise ValueError(f'{name}: incomplete provider frame grid')
    if importing and not path.exists():
        frames = []
        for index, x, y in motion['frames']:
            if not 0 <= index < strip.width // frame_width:
                raise ValueError(f'{name}: frame {index} outside provider strip')
            frame = strip.crop((index * frame_width, 0, (index + 1) * frame_width, strip.height))
            canvas = Image.new('RGBA', size)
            box = frame.getbbox()
            if (not box or x + box[0] < 1 or y + box[1] < 1
                    or x + box[2] >= size[0] or y + box[3] >= size[1]):
                raise ValueError(f'{name}: frame {index} clips')
            canvas.paste(frame, (x, y))
            for pixel in motion.get('removePixels', {}).get(str(index), []):
                canvas.putpixel(tuple(pixel), (0, 0, 0, 0))
            frames.append(clean(canvas))
        write_aseprite(path, frames, motion['frameMs'], {motion['action']: [0, len(frames) - 1]})
    frames, durations, tags = read_aseprite(path)
    if tags != {motion['action']: [0, len(frames) - 1]} or len(set(frame.tobytes() for frame in frames)) < 3:
        raise ValueError(f'{name}: incomplete authored action')
    output = Image.new('RGBA', (size[0] * len(frames), size[1]))
    for index, frame in enumerate(frames):
        if frame.size != size:
            raise ValueError(f'{name}: frame box mismatch')
        output.paste(clean(frame), (index * size[0], 0))
    publish(f'{name}.png', output, check)
    return {'assetId': f"{actor['worldId']}.{motion['action']}", 'url': f'/assets/fauna/station/{name}.png',
            'frameWidth': size[0], 'frameHeight': size[1], 'frameCount': len(frames), 'durationsMs': durations}


def build(check: bool, importing: bool) -> None:
    manifest = json.loads(MANIFEST.read_text())
    runtime = {'fitting': {}, 'station': []}
    for actor in manifest['actors']:
        name = actor['name']
        for provider in actor['provider'].values():
            load_provider(provider)
        editable = SOURCE / 'editable'
        if importing and not (editable / f'{name}-fitting.aseprite').exists():
            import_sources(actor)
        fitting, durations, tags = read_aseprite(editable / f'{name}-fitting.aseprite')
        if len(fitting) != len(DIRECTIONS) or tags != {direction: [i, i] for i, direction in enumerate(DIRECTIONS)} or durations != [320] * 4:
            raise ValueError(f'{name}: missing fitting directions')
        strip = Image.new('RGBA', (256, 64))
        for index, frame in enumerate(fitting):
            if frame.size != (64, 64) or frame.getbbox()[3] != 60:
                raise ValueError(f'{name}: fitting frame lost its pivot')
            strip.paste(clean(frame), (index * 64, 0))
        fitting_file = f'{name}-fitting.png'
        publish(fitting_file, strip, check)
        runtime['fitting'][actor['companionId']] = f'/assets/fauna/station/{fitting_file}'
        campus, durations, tags = read_aseprite(editable / f'{name}-campus.aseprite')
        if tags != {'idle': [0, 0]} or durations != [1000] or len(campus) != 1:
            raise ValueError(f'{name}: missing campus still')
        image = clean(campus[0])
        pivot_x, pivot_y = actor['campusPivot']
        if image.getbbox()[3] != pivot_y:
            raise ValueError(f'{name}: campus frame lost its pivot')
        campus_file = f'{name}-campus.png'
        # Centre the origin horizontally so mirrored fauna keep their foot anchor.
        animation_size = (48, 48)
        animation_pivot = (24, 38)
        image = normalized(image, animation_size, pivot_x, animation_pivot)
        pivot_x, pivot_y = animation_pivot
        publish(campus_file, image, check)
        clips = {'idle': {'assetId': actor['worldId'] + '.idle', 'url': f'/assets/fauna/station/{campus_file}',
                          'frameWidth': image.width, 'frameHeight': image.height, 'frameCount': 1, 'durationsMs': durations}}
        for motion in actor.get('motions', []):
            clips[motion['action']] = motion_clip(actor, motion, animation_size, check, importing)
        runtime['station'].append({
            'id': actor['worldId'], 'label': actor['label'], 'role': 'npc',
            'positions': actor['positions'], 'displayHeight': actor['displayHeight'] * image.height / campus[0].height,
            'pivot': [pivot_x / image.width, pivot_y / image.height],
            'clips': clips,
        })
    content = json.dumps(runtime, ensure_ascii=False, indent=2) + '\n'
    if check:
        if RUNTIME.read_text() != content:
            raise ValueError('Stale station fauna runtime data')
    else:
        RUNTIME.write_text(content)
    print('Station fauna: two species, eight fitting poses and campus clips')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--import-source', action='store_true')
    args = parser.parse_args()
    build(args.check, args.import_source)
