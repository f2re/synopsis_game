#!/usr/bin/env python3
"""Build native/campus review evidence from the exact packed modular manifest.

These are developer contact sheets, not simulated screenshots or art approval.
Every tile is composed from the same atlas rectangles used by the application.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

import build_modular_player_r01 as builder
from modular_player_contract import fingerprints

LIGHT = (225, 230, 221, 255)
DARK = (30, 43, 53, 255)
INK = (35, 45, 53)


def companion(runtime: dict, atlas: Image.Image, name: str, direction: str, action: str, phase: int) -> Image.Image:
    result = Image.new('RGBA', (64, 64))
    for cel in runtime['companions'][name]['frames'][direction][action][phase]['cels']:
        x, y, w, h = cel['rect']
        result.alpha_composite(atlas.crop((x, y, x+w, y+h)), tuple(cel['at']))
    return result


def sheet(runtime: dict, atlas: Image.Image, rows: list, direction: str, action: str, destination: Path, pets=False) -> None:
    cell_width = 160 if pets else 96
    canvas = Image.new('RGBA', (144+6*cell_width, len(rows)*160), LIGHT)
    draw = ImageDraw.Draw(canvas)
    for row, (label, profile) in enumerate(rows):
        draw.text((4, row*160+8), label, fill=INK)
        for phase in range(6):
            x = 144+phase*cell_width
            y = row*160+16
            draw.text((x+3, row*160+2), f'{direction} {phase}', fill=INK)
            draw.line((x+3, y+136, x+cell_width-3, y+136), fill=(192, 204, 190, 255))
            if pets:
                pet = profile.get('companion')
                if pet and pet != 'companion.none':
                    canvas.alpha_composite(companion(runtime, atlas, pet, direction, action, phase), (x+24, y+76))
                x += 48
            canvas.alpha_composite(builder.render(runtime, atlas, profile, direction, phase, action), (x, y))
    canvas.save(destination)


def make_review(runtime: dict, atlas: Image.Image, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    default = {**builder.DEFAULT, 'held': 'held.tablet'}
    stress = [
        ('center / tit', {**default, 'companion': 'companion.tit'}),
        ('field / squirrel', {**default, 'hair': 'hair.long', 'headwear': 'headwear.scarf', 'top': 'top.field-jacket',
            'bottom': 'bottom.field-trousers', 'footwear': 'footwear.boots', 'backpack': 'backpack.field',
            'held': 'held.map-folder', 'badge': 'badge.aerology', 'skinTone': 'skin.deep', 'companion': 'companion.squirrel'}),
        ('shirt / pencil', {**default, 'hair': 'hair.bob', 'hairColor': 'haircolor.blond', 'headwear': 'headwear.goggles',
            'top': 'top.shirt', 'bottom': 'bottom.jeans', 'footwear': 'footwear.shoes', 'backpack': 'backpack.city',
            'held': 'held.pencil', 'badge': 'badge.meteo', 'skinTone': 'skin.light', 'companion': 'companion.tit'}),
        ('hoodie / cap', {**default, 'hair': 'hair.curl', 'hairColor': 'haircolor.auburn', 'headwear': 'headwear.cap',
            'top': 'top.hoodie', 'bottom': 'bottom.jeans', 'backpack': 'backpack.field', 'held': 'held.tablet',
            'skinTone': 'skin.medium', 'companion': 'companion.squirrel'})]
    for action in ('walk', 'inspect'):
        native = Image.new('RGBA', (6*96, 4*160), LIGHT)
        draw = ImageDraw.Draw(native)
        loops = []
        for phase in range(6):
            loop = Image.new('RGBA', (4*96, 160), LIGHT)
            for row, direction in enumerate(builder.DIRS):
                im = builder.render(runtime, atlas, default, direction, phase, action)
                native.alpha_composite(im, (phase*96, row*160+16))
                draw.text((phase*96+3, row*160+2), f'{direction} {phase}', fill=INK)
                loop.alpha_composite(im, (row*96, 16))
            loops.append(loop.convert('RGB'))
        native.save(output/f'{action}-default-native.png')
        native.resize((native.width*2, native.height*2), Image.Resampling.NEAREST).save(output/f'{action}-default-2x.png')
        native.resize((native.width//2, native.height//2), Image.Resampling.NEAREST).save(output/f'{action}-default-campus.png')
        for scale, label in ((1, 'native'), (.5, 'campus'), (2, '2x')):
            frames = [im.resize((round(im.width*scale), round(im.height*scale)), Image.Resampling.NEAREST) for im in loops]
            frames[0].save(output/f'{action}-default-{label}.gif', save_all=True, append_images=frames[1:],
                duration=runtime['clips'][action]['durationsMs'], loop=0, disposal=2)
        for direction in builder.DIRS:
            sheet(runtime, atlas, [(name, {**default, 'top': f'top.{name}'}) for name in builder.OPTIONS['top']],
                direction, action, output/f'{action}-tops-{direction}.png')
            sheet(runtime, atlas, [(f'{bottom}\n{shoe}', {**default, 'bottom': f'bottom.{bottom}', 'footwear': f'footwear.{shoe}'})
                for bottom in builder.OPTIONS['bottom'] for shoe in builder.OPTIONS['footwear']],
                direction, action, output/f'{action}-legs-{direction}.png')
            sheet(runtime, atlas, [(name, {**default, 'held': f'held.{name}'}) for name in builder.OPTIONS['held']],
                direction, action, output/f'{action}-held-{direction}.png')
            sheet(runtime, atlas, stress, direction, action, output/f'{action}-stress-{direction}.png', pets=True)
        # Dark-background gait and object contrast check from the same atlas.
        dark = Image.new('RGBA', (6*96, 4*144), DARK)
        for row, direction in enumerate(builder.DIRS):
            for phase in range(6):
                dark.alpha_composite(builder.render(runtime, atlas, stress[1][1], direction, phase, action), (phase*96, row*144))
        dark.save(output/f'{action}-dark-stress.png')
    for direction in builder.DIRS:
        hats = builder.OPTIONS['headwear']
        hair = builder.OPTIONS['hair']
        result = Image.new('RGBA', (96*len(hats), 160*len(hair)), DARK)
        draw = ImageDraw.Draw(result)
        for row, hairstyle in enumerate(hair):
            for col, hat in enumerate(hats):
                draw.text((col*96+3, row*160+2), f'{hairstyle}/{hat}', fill=(225, 230, 221))
                result.alpha_composite(builder.render(runtime, atlas, {**default, 'hair': f'hair.{hairstyle}',
                    'headwear': f'headwear.{hat}'}, direction, 2, 'inspect'), (col*96, row*160+16))
        result.save(output/f'inspect-hair-headwear-{direction}.png')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--atlas', type=Path, required=True)
    parser.add_argument('--rig', type=Path, help='Bind the review evidence to the complete source contract')
    parser.add_argument('--output', type=Path, default=builder.ROOT/'artifacts/player-r03-motion/full-candidate/review')
    args = parser.parse_args()
    runtime = json.loads(args.manifest.read_text())
    atlas = Image.open(args.atlas).convert('RGBA')
    make_review(runtime, atlas, args.output)
    produced = {f'{action}-default-{scale}.{extension}' for action in ('walk', 'inspect')
        for scale in ('native', 'campus', '2x') for extension in ('png', 'gif')}
    produced |= {f'{action}-{group}-{direction}.png' for action in ('walk', 'inspect')
        for group in ('tops', 'legs', 'held', 'stress') for direction in builder.DIRS}
    produced |= {f'{action}-dark-stress.png' for action in ('walk', 'inspect')}
    produced |= {f'inspect-hair-headwear-{direction}.png' for direction in builder.DIRS}
    index = {'status': 'REVIEW_EVIDENCE_NOT_APPROVAL', 'manifestSha256': builder.sha(args.manifest.read_bytes()),
        'atlasSha256': builder.sha(args.atlas.read_bytes()),
        'files': {name: builder.sha((args.output/name).read_bytes()) for name in sorted(produced)}}
    if args.rig:
        index['fingerprints'] = fingerprints(builder.validate_rig(json.loads(args.rig.read_text())), runtime, args.atlas.read_bytes())
    (args.output/'review-assets.json').write_bytes(builder.json_bytes(index))
    print(f'{len(index["files"])} atlas-derived native/campus/stress review artifacts: {args.output}')


if __name__ == '__main__':
    main()
