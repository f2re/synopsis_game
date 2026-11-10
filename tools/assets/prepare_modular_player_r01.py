#!/usr/bin/env python3
"""One-time, explicit source preparation for the reviewed modular-player family.

Provider sheets remain unchanged. The resulting four-frame .aseprite files are
editable sources, not build output. This tool refuses to overwrite them unless
--replace-source is explicitly selected during authoring. Runtime builds never
invoke this preparation step or call an image provider.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from build_characters_r01 import clean, write_aseprite

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/source/characters/player-r01'
DIRECTIONS = ['down', 'right', 'up', 'left']
SKIN = [(112, 69, 48), (174, 112, 74), (225, 159, 105), (255, 205, 154)]
HAIR = [(35, 27, 31), (66, 46, 44), (103, 72, 57), (147, 107, 78)]
FACE_NEUTRAL = [(29, 24, 30), (60, 44, 43), (102, 78, 68), (153, 151, 151), (217, 215, 209), (255, 250, 239)]


def binary(image: Image.Image) -> Image.Image:
    image = image.convert('RGBA')
    image.putalpha(image.getchannel('A').point(lambda a: 255 if a >= 96 else 0))
    return clean(image)


def reduce_material(image: Image.Image, count: int) -> Image.Image:
    """Merge near-duplicate provider RGB within ONE material, never a whole scene."""
    alpha = image.getchannel('A')
    reduced = image.convert('RGB').quantize(colors=count, method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE).convert('RGBA')
    reduced.putalpha(alpha)
    return clean(reduced)


def nearest(color: tuple, palette: list[tuple]) -> tuple:
    return min(palette, key=lambda p: sum((a - b) ** 2 for a, b in zip(color[:3], p)))


def palette_role(image: Image.Image, role: str) -> Image.Image:
    raw = list(image.get_flattened_data())
    if role == 'hair':
        image.putdata([(*nearest(c, HAIR), c[3]) if c[3] else (0, 0, 0, 0) for c in raw])
        return image
    # Keep eyes, outlines and undersuit out of the skin ramp. The four exact
    # source RGBs are only written to the explicitly selected warm skin region.
    other = reduce_material(image, 16)
    colors = list(other.get_flattened_data())
    for index, (r, g, b, a) in enumerate(raw):
        if a and r >= 85 and r > g * 1.10 and r > b * 1.35:
            colors[index] = (*nearest((r, g, b), SKIN), 255)
        elif a and index // image.width < 39:
            # The head has its own neutral detail ramp. In particular the white
            # of an eye must never be merged into a frequent warm skin colour.
            colors[index] = (*nearest((r, g, b), FACE_NEUTRAL), 255)
    other.putdata(colors)
    return other


def target_boxes(kind: str, direction: str) -> tuple[int, int, int, int]:
    front = direction in ('down', 'up')
    if kind == 'top': return (17, 36, 62, 48) if front else ((33 if direction == 'right' else 32), 36, 31, 48)
    if kind == 'shirt': return (23, 36, 50, 43) if front else ((34 if direction == 'right' else 33), 36, 29, 43)
    if kind == 'bottom': return (30, 78, 36, 52) if front else ((36 if direction == 'right' else 35), 78, 25, 52)
    if kind == 'sneakers': return (25, 123, 46, 13) if front else ((34 if direction == 'right' else 30), 123, 32, 13)
    if kind == 'boots': return (25, 118, 46, 18) if front else ((33 if direction == 'right' else 30), 118, 33, 18)
    if kind == 'shoes': return (26, 124, 44, 12) if front else ((34 if direction == 'right' else 30), 124, 32, 12)
    if kind == 'short':
        return {'down': (33, 6, 30, 24), 'right': (35, 6, 29, 26), 'up': (33, 6, 30, 32), 'left': (32, 6, 29, 26)}[direction]
    if kind == 'wave': return (32, 6, 32, 28 if direction != 'up' else 33) if front else ((34 if direction == 'right' else 31), 6, 31, 29)
    if kind == 'bob': return (32, 6, 32, 35) if front else ((33 if direction == 'right' else 30), 6, 32, 35)
    if kind == 'curl': return (31, 5, 34, 28 if direction != 'up' else 33) if front else ((33 if direction == 'right' else 30), 5, 33, 29)
    if kind == 'long': return (31, 6, 34, 43) if front else ((33 if direction == 'right' else 30), 6, 33, 43)
    if kind == 'cap': return (31, 3, 34, 18 if direction == 'down' else 22) if front else ((31 if direction == 'right' else 28), 3, 37, 19)
    if kind == 'beanie': return (31, 3, 34, 18 if direction == 'down' else 23) if front else ((33 if direction == 'right' else 30), 3, 33, 19)
    if kind == 'scarf': return (34, 34, 28, 23) if front else ((35 if direction == 'right' else 32), 34, 28, 23)
    if kind == 'goggles': return (35, 20, 26, 8 if direction == 'down' else 6) if front else ((36 if direction == 'right' else 32), 20, 26, 8)
    if kind in ('city', 'field'):
        if direction == 'down': return (33, 39, 30, 38)
        if direction == 'up': return (31, 38, 34, 43 if kind == 'field' else 39)
        return ((25 if direction == 'right' else 45), 38, 30, 43 if kind == 'field' else 39)
    if kind in ('tablet', 'folder'):
        # The same anatomical RIGHT hand: screen-left when facing the viewer,
        # screen-right from behind, near on the right-facing profile, far on left.
        if direction == 'down': return (17, 79, 16, 23)
        if direction == 'up': return (64, 79, 16, 23)
        if direction == 'right': return (43, 80, 6, 23)
        return (45, 80, 6, 23)
    if kind == 'pencil':
        return {'down':(22, 82, 5, 17), 'right':(43, 82, 4, 17), 'up':(68, 82, 5, 17), 'left':(46, 82, 4, 17)}[direction]
    if kind == 'badge':
        return {'down':(54, 49, 7, 7), 'right':(59, 48, 4, 7), 'up':(34, 49, 7, 7), 'left':(32, 48, 4, 7)}[direction]
    raise ValueError(f'No authored placement for {kind}/{direction}')


SHEETS = [
    ('default-kit.png', [0, 255, 595, 1020, 1280], [('hair.short', 'short'), ('top.center-jacket', 'top'), ('bottom.dark-trousers', 'bottom'), ('footwear.sneakers', 'sneakers')]),
    ('tops-kit.png', [0, 330, 640, 960, 1280], [('top.field-jacket', 'top'), ('top.hoodie', 'top'), ('top.sweater', 'top'), ('top.shirt', 'shirt')]),
    ('hair-kit.png', [0, 320, 640, 960, 1280], [('hair.wave', 'wave'), ('hair.bob', 'bob'), ('hair.curl', 'curl'), ('hair.long', 'long')]),
    ('legs-kit.png', [0, 405, 810, 1030, 1280], [('bottom.field-trousers', 'bottom'), ('bottom.jeans', 'bottom'), ('footwear.boots', 'boots'), ('footwear.shoes', 'shoes')]),
    ('headwear-kit.png', [0, 320, 640, 960, 1280], [('headwear.cap', 'cap'), ('headwear.beanie', 'beanie'), ('headwear.scarf', 'scarf'), ('headwear.goggles', 'goggles')]),
    ('gear-kit.png', [0, 320, 640, 960, 1280], [('backpack.city', 'city'), ('backpack.field', 'field'), ('held.tablet', 'tablet'), ('held.map-folder', 'folder')]),
    ('small-kit.png', [0, 440, 850, 1280], [('held.pencil', 'pencil'), ('badge.meteo', 'badge'), ('badge.aerology', 'badge')]),
]


def save_source(name: str, frames: list[Image.Image], replace: bool) -> None:
    path = SOURCE / 'editable' / f'{name}.aseprite'
    if path.exists() and not replace:
        raise ValueError(f'{path} already exists: edit it in Aseprite, or explicitly re-import')
    if replace and path.exists(): path.unlink()
    write_aseprite(path, frames, 320, {f'{d}.idle': [i, i] for i, d in enumerate(DIRECTIONS)})
    for direction, frame in zip(DIRECTIONS, frames):
        frame.save(SOURCE / 'prepared' / f'{name}-{direction}.png')


def prepare(replace: bool) -> None:
    (SOURCE / 'prepared').mkdir(parents=True, exist_ok=True)
    body = binary(Image.open(SOURCE / 'provider/base-turnaround.png'))
    frames = []
    for i, direction in enumerate(DIRECTIONS):
        part = body.crop((i * body.width // 4, 0, (i + 1) * body.width // 4, body.height))
        part = part.crop(part.getbbox())
        part = part.resize((round(part.width * 126 / part.height), 126), Image.Resampling.NEAREST)
        canvas = Image.new('RGBA', (96, 144))
        canvas.alpha_composite(part, ((96 - part.width) // 2, 10))
        frames.append(palette_role(canvas, 'skin'))
    save_source('body', frames, replace)
    for file, row_cuts, rows in SHEETS:
        if not (SOURCE / 'provider' / file).exists(): continue
        sheet = binary(Image.open(SOURCE / 'provider' / file))
        for row, (name, kind) in enumerate(rows):
            frames = []
            for i, direction in enumerate(DIRECTIONS):
                part = sheet.crop((i * sheet.width // 4, round(row_cuts[row] * sheet.height / 1280),
                    (i + 1) * sheet.width // 4, round(row_cuts[row + 1] * sheet.height / 1280)))
                part = part.crop(part.getbbox())
                x, y, w, h = target_boxes(kind, direction)
                part = part.resize((w, h), Image.Resampling.NEAREST)
                part = palette_role(part, 'hair') if name.startswith('hair.') else reduce_material(part, 20)
                frame = Image.new('RGBA', (96, 144))
                frame.alpha_composite(part, (x, y))
                frames.append(frame)
            save_source(name, frames, replace)
    companion_sheet = SOURCE / 'provider/companions-kit.png'
    if companion_sheet.exists():
        sheet = binary(Image.open(companion_sheet))
        for row, name in enumerate(['companion.tit', 'companion.squirrel']):
            frames = []
            for i, direction in enumerate(DIRECTIONS):
                part = sheet.crop((i * sheet.width // 4, row * sheet.height // 2,
                    (i + 1) * sheet.width // 4, (row + 1) * sheet.height // 2))
                part = part.crop(part.getbbox())
                # Different physical sizes; a tit must not be as tall as a squirrel.
                maximum = (29, 28) if row == 0 else (42, 46)
                scale = min(maximum[0] / part.width, maximum[1] / part.height)
                part = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.NEAREST)
                part = reduce_material(part, 28)
                frame = Image.new('RGBA', (64, 64))
                frame.alpha_composite(part, ((64 - part.width) // 2, 60 - part.height))
                frames.append(frame)
            save_source(name, frames, replace)
    print('Prepared editable four-view candidate sources; independent technical/art acceptance is still required.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--replace-source', action='store_true', help='Explicit authoring-only replacement; never used in builds/CI')
    prepare(parser.parse_args().replace_source)
