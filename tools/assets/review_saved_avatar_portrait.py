#!/usr/bin/env python3
"""Compare actual server portraits with the independently accepted R02 renderer.

Run after building apps/server. This review does not create or redraw artwork.
It saves contact sheets, two real server PNGs, source comparisons and exact pins.
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from build_modular_player_r01 import RIG, render

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/testing/evidence/saved-portrait-r04/art'
ASSETS = ROOT / 'apps/web/public/assets/avatar/modular-r01'
CROP = (8, 0, 88, 80)
DEFAULT = {
    'skinTone': 'skin.warm', 'hair': 'hair.short', 'hairColor': 'haircolor.brown',
    'headwear': 'headwear.none', 'top': 'top.center-jacket', 'bottom': 'bottom.dark-trousers',
    'footwear': 'footwear.sneakers', 'backpack': 'backpack.none', 'heldItem': 'held.none',
    'companion': 'companion.none', 'badge': 'badge.none',
}
NODE = """
import { composeAvatarPortrait, portraitToPngBytes } from './apps/server/dist/modules/identity/avatarPortrait.js';
let input = ''; for await (const chunk of process.stdin) input += chunk;
const result = [];
for (const item of JSON.parse(input)) {
  const portrait = await composeAvatarPortrait(item.profile);
  portraitToPngBytes(portrait);
  result.push({id: item.id, portrait});
}
process.stdout.write(JSON.stringify(result));
"""


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def values(group: str) -> list[str]:
    if group == 'companion':
        return ['companion.none', *RIG['companionIds']]
    return [f'{group}.{value}' for value in RIG['slots'][group]['values']]


def fixture_cases() -> list[dict]:
    cases = []
    for top in values('top'):
        for headwear in values('headwear'):
            for hair in values('hair'):
                cases.append({'id': f'head-{top}-{headwear}-{hair}', 'group': 'head',
                              'profile': {**DEFAULT, 'top': top, 'headwear': headwear, 'hair': hair}})
    for skin in RIG['palettes']['skin']['variants']:
        for color in RIG['palettes']['hair']['variants']:
            cases.append({'id': f'palette-{skin}-{color}', 'group': 'palette',
                          'profile': {**DEFAULT, 'skinTone': skin, 'hairColor': color}})
    for backpack in values('backpack'):
        for held in values('held'):
            for badge in values('badge'):
                cases.append({'id': f'accessory-{backpack}-{held}-{badge}', 'group': 'accessory',
                              'profile': {**DEFAULT, 'backpack': backpack, 'heldItem': held, 'badge': badge}})
    for bottom in values('bottom'):
        for footwear in values('footwear'):
            cases.append({'id': f'lower-{bottom}-{footwear}', 'group': 'lower',
                          'profile': {**DEFAULT, 'bottom': bottom, 'footwear': footwear}})
    for companion in values('companion'):
        cases.append({'id': f'companion-{companion}', 'group': 'companion',
                      'profile': {**DEFAULT, 'companion': companion}})
    cases += [
        {'id': 'default', 'group': 'sample', 'profile': DEFAULT},
        {'id': 'field-kit', 'group': 'sample', 'profile': {
            **DEFAULT, 'skinTone': 'skin.deep', 'hair': 'hair.long', 'hairColor': 'haircolor.blond',
            'headwear': 'headwear.beanie', 'top': 'top.field-jacket', 'bottom': 'bottom.field-trousers',
            'footwear': 'footwear.boots', 'backpack': 'backpack.field', 'heldItem': 'held.map-folder',
            'companion': 'companion.squirrel', 'badge': 'badge.aerology'}},
    ]
    return cases


def source_frame(manifest: dict, atlas: Image.Image, profile: dict) -> Image.Image:
    editor_profile = {slot: profile[spec['profileField']] for slot, spec in RIG['slots'].items()}
    # The accepted human renderer excludes the separate companion frame.
    editor_profile.update(skinTone=profile['skinTone'], hairColor=profile['hairColor'])
    return render(manifest, atlas, editor_profile, 'down', 0)


def checker(size: tuple[int, int]) -> Image.Image:
    image = Image.new('RGBA', size, (236, 239, 232, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], 8):
        for x in range(0, size[0], 8):
            if (x // 8 + y // 8) % 2:
                draw.rectangle((x, y, x + 7, y + 7), fill=(221, 227, 219, 255))
    return image


FONT = ImageFont.load_default(size=14)


def contact(name: str, title: str, cases: list[dict], images: dict[str, Image.Image], columns: int) -> None:
    width, height = columns * 180 + 20, ((len(cases) + columns - 1) // columns) * 198 + 44
    sheet = Image.new('RGBA', (width, height), (247, 248, 244, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 10), title, fill=(27, 40, 46, 255), font=FONT)
    for index, case in enumerate(cases):
        x, y = 20 + index % columns * 180, 44 + index // columns * 198
        tile = checker((160, 160))
        tile.alpha_composite(images[case['id']])
        sheet.alpha_composite(tile, (x, y))
        profile = case['profile']
        if case['group'] == 'head':
            label = profile['hair'].split('.')[1] + ' / ' + profile['headwear'].split('.')[1]
        elif case['group'] == 'palette':
            label = profile['skinTone'].split('.')[1] + ' / ' + profile['hairColor'].split('.')[1]
        else:
            label = profile['backpack'].split('.')[1] + ' / ' + profile['heldItem'].split('.')[1]
        draw.text((x, y + 164), label, fill=(27, 40, 46, 255), font=FONT)
        if case['group'] == 'accessory':
            draw.text((x, y + 180), profile['badge'], fill=(27, 40, 46, 255), font=FONT)
    sheet.save(OUT / name)


def source_comparison(name: str, frame: Image.Image, portrait: Image.Image) -> None:
    # All artwork uses integer scaling; a rectangle is an external QA annotation.
    sheet = Image.new('RGBA', (1090, 720), (247, 248, 244, 255))
    draw = ImageDraw.Draw(sheet)
    for text, point in [('Editor 96x144 at 2x', (12, 10)), ('Saved PNG 160x160 at 1x', (220, 10)),
                        ('Saved PNG at 2x', (220, 210)), ('Saved PNG at 4x', (560, 10))]:
        draw.text(point, text, fill=(27, 40, 46, 255), font=FONT)
    panel = checker((192, 288))
    panel.alpha_composite(frame.resize((192, 288), Image.Resampling.NEAREST))
    sheet.alpha_composite(panel, (12, 40))
    draw.rectangle((12 + 16, 40, 12 + 175, 40 + 159), outline=(195, 72, 52, 255), width=2)
    for scale, point in [(1, (220, 40)), (2, (220, 240)), (4, (560, 40))]:
        panel = checker((160 * scale, 160 * scale))
        panel.alpha_composite(portrait.resize(panel.size, Image.Resampling.NEAREST))
        # The final comparison is 1200px wide at 4x, including clear side margins.
        if point[0] + panel.width > sheet.width:
            expanded = Image.new('RGBA', (point[0] + panel.width + 20, sheet.height), (247, 248, 244, 255))
            expanded.alpha_composite(sheet)
            sheet = expanded
        sheet.alpha_composite(panel, point)
    sheet.save(OUT / name)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ASSETS / 'manifest.json').read_text())
    atlas = Image.open(ASSETS / 'atlas.png').convert('RGBA')
    cases = fixture_cases()
    result = subprocess.run(['node', '--input-type=module', '-e', NODE], input=json.dumps(cases),
                            capture_output=True, text=True, cwd=ROOT, check=True)
    actual = {item['id']: item['portrait'] for item in json.loads(result.stdout)}
    assert len(actual) == len(cases)
    metrics, images = [], {}
    for case in cases:
        portrait = actual[case['id']]
        png_bytes = base64.b64decode(portrait['pngDataUrl'].split(',', 1)[1], validate=True)
        image = Image.open(io.BytesIO(png_bytes)).convert('RGBA')
        expected = source_frame(manifest, atlas, case['profile']).crop(CROP).resize((160, 160), Image.Resampling.NEAREST)
        assert portrait['version'] == 1 and portrait['width'] == 160 and portrait['height'] == 160, case['id']
        assert image.size == (160, 160), case['id']
        assert image.tobytes() == expected.tobytes(), f'Pixel mismatch: {case["id"]}'
        assert set(image.getchannel('A').get_flattened_data()) == {0, 255}, case['id']
        assert portrait['sha256'] == sha(png_bytes), case['id']
        logical = image.resize((80, 80), Image.Resampling.NEAREST)
        assert logical.resize((160, 160), Image.Resampling.NEAREST).tobytes() == image.tobytes(), case['id']
        colors = {pixel[:3] for pixel in image.get_flattened_data() if pixel[3]}
        metrics.append({'id': case['id'], 'group': case['group'], 'profile': case['profile'],
                        'pngBytes': len(png_bytes), 'sha256': portrait['sha256'], 'rgbaSha256': sha(image.tobytes()),
                        'appearanceKey': portrait['appearanceKey'], 'sourceRevision': portrait['sourceRevision'],
                        'opaqueColors': len(colors), 'bounds': image.getbbox(), 'pixelEquality': True})
        images[case['id']] = image
        if case['group'] == 'sample':
            (OUT / f'{case["id"]}-server.png').write_bytes(png_bytes)
            source_comparison(f'{case["id"]}-source-comparison.png', source_frame(manifest, atlas, case['profile']), image)
    head_bounds = {}
    for part_id in values('hair') + values('headwear'):
        layer = Image.new('RGBA', (96, 144))
        for cel in manifest['parts'][part_id]['down']['idle'][0]['cels']:
            x, y, width, height = cel['rect']
            layer.alpha_composite(atlas.crop((x, y, x + width, y + height)), tuple(cel['at']))
        bounds = layer.getbbox()
        if bounds:
            assert bounds[0] > CROP[0] and bounds[1] > CROP[1] and bounds[2] < CROP[2] and bounds[3] < CROP[3], (part_id, bounds)
        head_bounds[part_id] = bounds
    for top in values('top'):
        selected = [case for case in cases if case['group'] == 'head' and case['profile']['top'] == top]
        contact(f'heads-{top}.png', f'{top}: 5 hair x 5 headwear; actual server PNG at native size', selected, images, 5)
    contact('palettes.png', '4 skin tones x 4 hair colors; actual server PNG at native size',
            [case for case in cases if case['group'] == 'palette'], images, 4)
    contact('accessories.png', '3 backpacks x 4 held items x 3 badges; actual server PNG at native size',
            [case for case in cases if case['group'] == 'accessory'], images, 6)
    # Slots outside the crop remain saved in appearanceKey, without inventing visual changes.
    for group in ('lower', 'companion'):
        selected = [metric for metric in metrics if metric['group'] == group]
        assert len({metric['rgbaSha256'] for metric in selected}) == 1, group
        assert len({metric['appearanceKey'] for metric in selected}) == len(selected), group
    source_paths = [ASSETS / 'atlas.png', ASSETS / 'manifest.json',
                    ROOT / 'tools/assets/build_modular_player_r01.py', Path(__file__).resolve(),
                    ROOT / 'apps/server/src/modules/identity/avatarPortrait.ts',
                    ROOT / 'apps/server/src/modules/identity/portraitPng.ts',
                    ROOT / 'apps/server/dist/modules/identity/avatarPortrait.js',
                    ROOT / 'apps/server/dist/modules/identity/portraitPng.js']
    report = {
        'review': 'saved-portrait-r04', 'date': '2026-11-12', 'sourceRevision': manifest['revision'],
        'crop': {'x': 8, 'y': 0, 'width': 80, 'height': 80}, 'output': [160, 160],
        'independentOracle': 'accepted R02 Python renderer; no server rendering code used for expected pixels',
        'sourceSha256': {str(path.relative_to(ROOT)): sha(path.read_bytes()) for path in source_paths},
        'cases': len(cases), 'groups': {group: sum(case['group'] == group for case in cases) for group in sorted({case['group'] for case in cases})},
        'rgbaEqualityCases': len(metrics), 'alphaValues': [0, 255], 'nearest2xCases': len(metrics),
        'headFamilyBoundsIn96x144': head_bounds,
        'opaqueColorRange': [min(metric['opaqueColors'] for metric in metrics), max(metric['opaqueColors'] for metric in metrics)],
        'pngByteRange': [min(metric['pngBytes'] for metric in metrics), max(metric['pngBytes'] for metric in metrics)],
        'allHeadFamiliesInsideCropWithPositiveMargin': True,
        'lowerAndCompanionChangeSavedKeyWithoutChangingCroppedPixels': True,
        'technicalPixelStatus': 'PASS', 'visualArtStatus': 'REQUIRES_HUMAN_OR_AGENT_IMAGE_INSPECTION',
        'browserUiAcceptance': 'NOT_EVALUATED', 'results': metrics,
    }
    (OUT / 'portrait-pixel-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key not in ('results', 'sourceSha256')}, indent=2))


if __name__ == '__main__':
    main()
