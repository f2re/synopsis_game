#!/usr/bin/env python3
"""Render review-only contact sheets from the current public cel contract.

Does not edit sources, generated assets, acceptance flags or product code.
Run after the independent technical review names the candidate being reviewed.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
PACK = ROOT / 'assets/generated/characters/player-r01'
DIRS = ('down', 'right', 'up', 'left')
DEFAULT = {
    'skinTone': 'skin.warm', 'hairColor': 'haircolor.brown',
    'hair': 'hair.short', 'headwear': 'headwear.none',
    'top': 'top.center-jacket', 'bottom': 'bottom.dark-trousers',
    'footwear': 'footwear.sneakers', 'backpack': 'backpack.none',
    'heldItem': 'held.none', 'badge': 'badge.none', 'companion': 'companion.none',
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    paths = [PACK / 'atlas.png', PACK / 'manifest.json',
             ROOT / 'assets/manifests/player-modular-r01.json',
             ROOT / 'assets/source/characters/player-r01/rig.json']
    hashes = {str(path.relative_to(ROOT)): digest(path) for path in paths}
    manifest = json.loads((PACK / 'manifest.json').read_text())
    atlas = Image.open(PACK / 'atlas.png').convert('RGBA')
    source = json.loads((ROOT / 'assets/manifests/player-modular-r01.json').read_text())
    assert source['outputs']['atlasSha256'] == hashes[str((PACK / 'atlas.png').relative_to(ROOT))]
    assert source['outputs']['manifestSha256'] == hashes[str((PACK / 'manifest.json').relative_to(ROOT))]
    assert manifest['frame'] == {'width': 96, 'height': 144, 'pivot': [48, 136]}

    def cels_image(cels: list[dict], profile: dict, size: tuple[int, int]) -> Image.Image:
        image = Image.new('RGBA', size)
        for cel in sorted(cels, key=lambda item: item['z']):
            x, y, w, h = cel['rect']
            part = atlas.crop((x, y, x + w, y + h))
            role = cel.get('paletteRole')
            if role:
                palettes = manifest['palettes'][role]
                selected = profile['skinTone' if role == 'skin' else 'hairColor']
                colors = dict(zip(map(tuple, palettes['source']), map(tuple, palettes['variants'][selected])))
                part.putdata([(*colors.get(pixel[:3], pixel[:3]), pixel[3]) for pixel in part.get_flattened_data()])
            image.alpha_composite(part, tuple(cel['at']))
        return image

    def render(profile: dict, direction: str, phase: int) -> Image.Image:
        cels = list(manifest['body'][direction]['idle'][phase]['cels'])
        for field, identifier in profile.items():
            if field not in ('skinTone', 'hairColor', 'companion'):
                cels.extend(manifest['parts'][identifier][direction]['idle'][phase]['cels'])
        image = Image.new('RGBA', (128, 160))
        image.alpha_composite(cels_image(cels, profile, (96, 144)), (24, 8))
        companion = manifest['companions'][profile['companion']]
        if companion is not None:
            frame = companion['frame']
            child = cels_image(companion['frames'][direction]['idle'][phase]['cels'], profile, (frame['width'], frame['height']))
            origin = (24 + 48 + companion['anchor'][0] - frame['pivot'][0],
                      8 + 136 + companion['anchor'][1] - frame['pivot'][1])
            image.alpha_composite(child, origin)
        return image

    center = {**DEFAULT, 'footwear': 'footwear.shoes', 'heldItem': 'held.map-folder', 'badge': 'badge.meteo'}
    field = {**DEFAULT, 'headwear': 'headwear.cap', 'top': 'top.field-jacket',
             'bottom': 'bottom.field-trousers', 'footwear': 'footwear.boots',
             'backpack': 'backpack.field', 'heldItem': 'held.pencil', 'badge': 'badge.meteo'}
    rest = {**DEFAULT, 'headwear': 'headwear.beanie', 'top': 'top.sweater',
            'bottom': 'bottom.jeans', 'backpack': 'backpack.city', 'companion': 'companion.tit'}
    sets = [('default', DEFAULT), ('preset.center', center), ('preset.field', field), ('preset.rest', rest)]
    stress = [
        ('long / goggles / field / folder', {**field, 'hair': 'hair.long', 'headwear': 'headwear.goggles', 'heldItem': 'held.map-folder'}),
        ('long / scarf / city / tablet', {**center, 'hair': 'hair.long', 'headwear': 'headwear.scarf', 'backpack': 'backpack.city', 'heldItem': 'held.tablet'}),
        ('curl / cap / shirt / pencil', {**field, 'hair': 'hair.curl', 'top': 'top.shirt', 'skinTone': 'skin.deep'}),
        ('long / beanie / hoodie / field', {**field, 'hair': 'hair.long', 'hairColor': 'haircolor.blond', 'headwear': 'headwear.beanie', 'top': 'top.hoodie'}),
    ]
    companions = [(identifier, {**DEFAULT, 'companion': identifier}) for identifier in ('companion.tit', 'companion.squirrel')]
    sheets: dict[str, dict] = {}

    def sheet(name: str, rows: list[tuple[str, dict]], background: tuple[int, int, int, int]) -> None:
        image = Image.new('RGBA', (1024, 348 * len(rows)), background)
        draw = ImageDraw.Draw(image)
        ink = (233, 239, 244) if background[0] < 100 else (25, 36, 44)
        for row, (label, profile) in enumerate(rows):
            for column, direction in enumerate(DIRS):
                draw.text((column * 256 + 4, row * 348 + 4), f'{label} | {direction}', fill=ink)
                image.alpha_composite(render(profile, direction, 0).resize((256, 320), Image.Resampling.NEAREST), (column * 256, row * 348 + 24))
        path = OUT / name
        image.save(path)
        sheets[name] = {'sha256': digest(path), 'profiles': {label: profile for label, profile in rows}, 'directions': DIRS, 'phase': 0}

    sheet('actual-presets.png', sets, (225, 230, 221, 255))
    sheet('stress-combinations.png', stress, (30, 43, 53, 255))
    sheet('companions.png', companions, (225, 230, 221, 255))

    phases = Image.new('RGBA', (1024, 1392), (225, 230, 221, 255))
    draw = ImageDraw.Draw(phases)
    for row, direction in enumerate(DIRS):
        for phase in range(4):
            draw.text((phase * 256 + 4, row * 348 + 4), f'preset.field | {direction} | idle {phase}', fill=(25, 36, 44))
            phases.alpha_composite(render(field, direction, phase).resize((256, 320), Image.Resampling.NEAREST), (phase * 256, row * 348 + 24))
    phases.save(OUT / 'idle-phases.png')
    sheets['idle-phases.png'] = {'sha256': digest(OUT / 'idle-phases.png'), 'profile': field, 'directions': DIRS, 'phases': [0, 1, 2, 3]}

    palettes = Image.new('RGBA', (1024, 1392), (30, 43, 53, 255))
    draw = ImageDraw.Draw(palettes)
    skins = list(manifest['palettes']['skin']['variants'])
    hairs = list(manifest['palettes']['hair']['variants'])
    for row, skin in enumerate(skins):
        for column, hair in enumerate(hairs):
            profile = {**DEFAULT, 'skinTone': skin, 'hairColor': hair}
            draw.text((column * 256 + 4, row * 348 + 4), f'{skin} | {hair}', fill=(233, 239, 244))
            palettes.alpha_composite(render(profile, 'down', 0).resize((256, 320), Image.Resampling.NEAREST), (column * 256, row * 348 + 24))
    palettes.save(OUT / 'palette-combinations.png')
    sheets['palette-combinations.png'] = {'sha256': digest(OUT / 'palette-combinations.png'), 'skinTone': skins, 'hairColor': hairs, 'direction': 'down', 'phase': 0}

    # Paginate the author's unmodified native-size catalog for readable review.
    catalog = Image.open(PACK / 'catalog-contact.png')
    for page, y in enumerate(range(0, catalog.height, 1480), start=1):
        name = f'catalog-page-{page}.png'
        catalog.crop((0, y, catalog.width, min(y + 1480, catalog.height))).save(OUT / name)
        sheets[name] = {'sha256': digest(OUT / name), 'source': 'assets/generated/characters/player-r01/catalog-contact.png', 'sourceY': [y, min(y + 1480, catalog.height)], 'scale': 1}

    for path in paths:
        assert digest(path) == hashes[str(path.relative_to(ROOT))], f'Input changed during render: {path}'
    for path in sorted(PACK.glob('*contact.png')) + sorted(PACK.glob('hair-headwear-*.png')):
        hashes[str(path.relative_to(ROOT))] = digest(path)
    evidence = {'rigId': manifest['rigId'], 'revision': manifest['revision'],
                'inputArtAcceptance': manifest['artAcceptance'], 'inputs': hashes, 'sheets': sheets,
                'scope': 'Offline visual review evidence only; no product acceptance or browser verification implied.'}
    (OUT / 'review-inputs.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'sheets': list(sheets), 'atlasSha256': hashes[str((PACK / 'atlas.png').relative_to(ROOT))], 'sourceArtAcceptance': manifest['artAcceptance']}))


if __name__ == '__main__':
    main()
