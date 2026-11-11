#!/usr/bin/env python3
"""Build the shared dressable player from editable parts and authored rig data.

No provider calls, no drawing of new clothes and no outfit permutations on disk.
--check validates all source hashes, coverage, alpha, palette isolation, geometry
and byte-for-byte reproduction of the compact atlas and public manifest.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

from build_characters_r01 import clean, png, read_aseprite, save
from modular_player_contract import acceptance_result, layer_offset, validate_rig
from modular_player_motion import append_motion, read_motion

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/source/characters/player-r01'
MANIFEST = ROOT / 'assets/manifests/player-modular-r01.json'
GENERATED = ROOT / 'assets/generated/characters/player-r01'
PUBLIC = ROOT / 'apps/web/public/assets/avatar/modular-r01'
RIG = validate_rig(json.loads((SOURCE / 'rig.json').read_text()))
DIRS = RIG['directions']
OPTIONS = {group: slot['values'] for group, slot in RIG['slots'].items()}
DEFAULT = {key: f'{key}.{values[0]}' for key, values in OPTIONS.items()}


def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()
def json_bytes(value: object) -> bytes: return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def frame_source(name: str, rig: dict = RIG) -> tuple[dict[str, Image.Image], dict]:
    path = SOURCE / 'editable' / f'{name}.aseprite'
    frames, durations, tags = read_aseprite(path)
    geometry = rig['companionFrame'] if name.startswith('companion.') else rig['frame']
    expected_size = (geometry['width'], geometry['height'])
    source = rig['sourceCels']
    if len(frames) != source['count'] or any(f.size != expected_size for f in frames) or durations != [source['durationMs']] * source['count']:
        raise ValueError(f'{name}: four 320ms editable directional source cels required')
    if tags != {f'{d}.{source["tagAction"]}': [i, i] for i, d in enumerate(rig['directions'])}:
        raise ValueError(f'{name}: direction tags differ')
    for frame in frames:
        box = frame.getbbox()
        if not box or box[0] < source['minimumMargin'][0] or box[1] < source['minimumMargin'][1] or box[2] >= frame.width or box[3] > geometry['pivot'][1]:
            raise ValueError(f'{name}: missing content or no safe frame margin: {box}')
    return dict(zip(rig['directions'], frames)), {'source': str(path.relative_to(ROOT)), 'sha256': sha(path.read_bytes()),
        'frameSize': list(expected_size), 'tags': tags}


def hands(frame: Image.Image, direction: str, rig: dict, masks: list[str]) -> tuple[Image.Image, list[Image.Image]]:
    """Extract authored wrist regions; never paste undersuit patches over clothes."""
    base = frame.copy()
    skin = {tuple(rgb) for rgb in rig['palettes']['skin']['source']}
    pose = rig['assembly']['poses'][direction]
    selection = rig['assembly']['skinMaskSelection']
    layers = []
    for name in masks:
        box = pose['masks'][name]['bounds']
        layer = Image.new('RGBA', frame.size)
        selected = set()
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                r, g, b, a = frame.getpixel((x, y))
                if a and (r, g, b) in skin: selected.add((x, y))
        # Only a one-pixel dark warm contour adjacent to a selected skin pixel.
        # Blue trouser pixels are excluded even if they are inside the rectangle.
        for x, y in list(selected):
            for dx, dy in selection['neighbours']:
                nx, ny = x + dx, y + dy
                if not (box[0] <= nx < box[2] and box[1] <= ny < box[3]): continue
                r, g, b, a = frame.getpixel((nx, ny))
                if a and max(r, g, b) < selection['contourMaxChannelExclusive'] and r >= b * selection['contourRedToBlueMinimum']: selected.add((nx, ny))
        if not selected: raise ValueError(f'Missing skin hand in {direction}/{box}')
        for x, y in selected:
            layer.putpixel((x, y), frame.getpixel((x, y)))
            base.putpixel((x, y), (0, 0, 0, 0))
        layers.append(layer)
    return base, layers


class Atlas:
    def __init__(self, maximum_bytes: int = 2097152, compact: bool = False) -> None:
        self.images: list[Image.Image] = []
        self.ids: dict[str, int] = {}
        self.maximum_bytes = maximum_bytes
        self.compact = compact

    def cel(self, layer: Image.Image, z: int, offset: tuple[int, int] = (0, 0), role: str | None = None) -> dict:
        bounds = layer.getbbox()
        if not bounds: raise ValueError('Empty cel')
        image = layer.crop(bounds).convert('RGBA')
        alpha = set(image.getchannel('A').tobytes())
        if not alpha <= {0, 255} or 255 not in alpha:
            raise ValueError('Atlas cels require visible binary-alpha pixels')
        # A lossless tile entirely inside a garment may be fully opaque. The
        # complete editable actor frame still requires a transparent margin.
        if 0 in alpha: image = clean(image)
        key = f'{image.width}:{image.height}:{sha(image.tobytes())}'
        if key not in self.ids:
            self.ids[key] = len(self.images)
            self.images.append(image)
        result = {'_image': self.ids[key], 'at': [bounds[0] + offset[0], bounds[1] + offset[1]], 'z': z}
        if result['at'][0] < 0 or result['at'][0] + image.width > layer.width or result['at'][1] < 1 or result['at'][1] + image.height > layer.height:
            raise ValueError('Authored motion clips a part')
        if role: result['paletteRole'] = role
        return result

    def pack(self) -> tuple[Image.Image, dict[int, list[int]]]:
        # Stable shelf packing with one empty pixel on every edge. No filtering
        # is used by the consumers, but the padding also prevents atlas bleed.
        width, x, y, shelf = 512, 1, 1, 0
        rects = {}
        if self.compact:
            shelves = []
            ordered = sorted(enumerate(self.images), key=lambda item: (-item[1].height, -item[1].width, item[0]))
            for index, image in ordered:
                candidates = [s for s in shelves if image.height <= s['height'] and s['x'] + image.width + 1 <= width]
                if candidates:
                    selected = min(candidates, key=lambda s: (width-s['x']-image.width, s['height']-image.height, s['y']))
                else:
                    selected = {'x': 1, 'y': 1 if not shelves else shelves[-1]['y']+shelves[-1]['height']+2, 'height': image.height}
                    shelves.append(selected)
                rects[index] = [selected['x'], selected['y'], image.width, image.height]
                selected['x'] += image.width+2
            used_height = shelves[-1]['y']+shelves[-1]['height']+2
        else:
            for index, image in enumerate(self.images):
                if x + image.width + 1 > width:
                    x, y, shelf = 1, y + shelf + 2, 0
                rects[index] = [x, y, image.width, image.height]
                x += image.width + 2
                shelf = max(shelf, image.height)
            used_height = y+shelf+2
        height = ((used_height+31)//32)*32
        if width * height * 4 > self.maximum_bytes: raise ValueError(f'Raw parts exceed the {self.maximum_bytes} byte decoded budget')
        result = Image.new('RGBA', (width, height))
        for index, image in enumerate(self.images): result.paste(image, tuple(rects[index][:2]))
        return clean(result), rects


def attached_cel(atlas: Atlas, image: Image.Image, rig: dict, direction: str,
                 layer_name: str, phase: int, attachment: str | None = None) -> dict:
    layer = rig['assembly']['layers'][layer_name]
    order = rig['assembly']['poses'][direction]['layerOrder'][layer_name]
    return atlas.cel(image, order, layer_offset(rig, direction, layer_name, phase, attachment), layer.get('paletteRole'))


def part_frames(source: dict[str, Image.Image], part_id: str, atlas: Atlas, rig: dict, body_source: dict | None = None) -> dict:
    result = {}
    group = part_id.split('.')[0]
    layer_name = rig['slots'][group]['layer'] if group in rig['slots'] else 'companion'
    attachment = rig['assembly']['partAttachments'].get(part_id)
    for direction in rig['directions']:
        pose = rig['assembly']['poses'][direction]
        poses = []
        for phase in range(len(rig['clips']['idle']['durationsMs'])):
            hidden = pose['hiddenLayers'].get(layer_name)
            if hidden:
                poses.append({'cels': [], 'hidden': hidden}); continue
            cels = [attached_cel(atlas, source[direction], rig, direction, layer_name, phase, attachment)]
            for supplement in pose['extraBodyMasks'].get(part_id, []):
                assert body_source is not None
                _, arms = hands(body_source[direction], direction, rig, [supplement['mask']])
                mask_attachment = pose['masks'][supplement['mask']]['attachment']
                cels += [attached_cel(atlas, arm, rig, direction, supplement['layer'], phase, mask_attachment) for arm in arms]
            poses.append({'cels': cels})
        result[direction] = {'idle': poses}
    return result


def body_frames(source: dict[str, Image.Image], atlas: Atlas, rig: dict) -> dict:
    result = {}
    for direction, frame in source.items():
        pose = rig['assembly']['poses'][direction]
        masks = pose['handMasks']
        base, hand_layers = hands(frame, direction, rig, masks)
        split_y = pose['anchors'][pose['bodySplitAnchor']]['sourceAt'][1]
        upper, lower = base.copy(), base.copy()
        upper.paste((0, 0, 0, 0), (0, split_y, frame.width, frame.height))
        lower.paste((0, 0, 0, 0), (0, 0, frame.width, split_y))
        result[direction] = {'idle': [{'cels': [attached_cel(atlas, upper, rig, direction, 'bodyUpper', phase),
            attached_cel(atlas, lower, rig, direction, 'bodyLower', phase)]
            + [attached_cel(atlas, hand, rig, direction, 'hands', phase, pose['masks'][name]['attachment'])
               for name, hand in zip(masks, hand_layers)]} for phase in range(len(rig['clips']['idle']['durationsMs']))]}
    return result


def resolve_rects(value: object, rects: dict) -> None:
    if isinstance(value, dict):
        if '_image' in value: value['rect'] = rects[value.pop('_image')]
        for item in value.values(): resolve_rects(item, rects)
    elif isinstance(value, list):
        for item in value: resolve_rects(item, rects)


def render(runtime: dict, atlas: Image.Image, profile: dict, direction: str = 'down', phase: int = 0, action: str = 'idle') -> Image.Image:
    result = Image.new('RGBA', (96, 144))
    cels = runtime['body'][direction][action][phase]['cels'][:]
    for group in OPTIONS: cels += runtime['parts'][profile[group]][direction][action][phase]['cels']
    for cel in sorted(cels, key=lambda c: c['z']):
        x, y, w, h = cel['rect']; part = atlas.crop((x, y, x + w, y + h))
        if cel.get('paletteRole'):
            role = cel['paletteRole']; palette = runtime['palettes'][role]
            variant = profile.get('skinTone' if role == 'skin' else 'hairColor', 'skin.warm' if role == 'skin' else 'haircolor.brown')
            mapping = {tuple(a): tuple(b) for a, b in zip(palette['source'], palette['variants'][variant])}
            part.putdata([(*mapping.get(p[:3], p[:3]), p[3]) for p in part.get_flattened_data()])
        result.alpha_composite(part, tuple(cel['at']))
    return result


def contacts(runtime: dict, atlas: Image.Image, check: bool) -> None:
    rows = [('default', DEFAULT)]
    for group, ids in OPTIONS.items():
        for value in ids:
            profile = {**DEFAULT, group: f'{group}.{value}'}
            rows.append((f'{group}.{value}', profile))
    for skin in runtime['palettes']['skin']['variants']: rows.append((skin, {**DEFAULT, 'skinTone': skin}))
    for hair in runtime['palettes']['hair']['variants']: rows.append((hair, {**DEFAULT, 'hairColor': hair}))
    sheet = Image.new('RGBA', (4 * 96 + 160, len(rows) * 148), (225, 230, 221, 255))
    draw = ImageDraw.Draw(sheet)
    for row, (label, profile) in enumerate(rows):
        draw.text((4, row * 148 + 12), label, fill=(35, 45, 53))
        for i, direction in enumerate(DIRS): sheet.alpha_composite(render(runtime, atlas, profile, direction), (160 + i * 96, row * 148))
    save(GENERATED / 'catalog-contact.png', png(sheet), check)
    for direction in DIRS:
        hair_hat = Image.new('RGBA', (5 * 192, 5 * 288), (30, 43, 53, 255))
        for row, hair in enumerate(OPTIONS['hair']):
            for col, hat in enumerate(OPTIONS['headwear']):
                im = render(runtime, atlas, {**DEFAULT, 'hair': f'hair.{hair}', 'headwear': f'headwear.{hat}'}, direction)
                hair_hat.alpha_composite(im.resize((192, 288), Image.Resampling.NEAREST), (col * 192, row * 288))
        filename = 'hair-headwear-contact.png' if direction == 'down' else f'hair-headwear-{direction}.png'
        save(GENERATED / filename, png(hair_hat), check)
    default = Image.new('RGBA', (4 * 192, 2 * 288), (225, 230, 221, 255))
    for i, d in enumerate(DIRS):
        im = render(runtime, atlas, DEFAULT, d)
        save(SOURCE / 'prepared' / f'preview-default-{d}.png', png(im), check)
        default.alpha_composite(im.resize((192, 288), Image.Resampling.NEAREST), (i * 192, 0))
        dark = Image.new('RGBA', (96, 144), (30, 43, 53, 255)); dark.alpha_composite(im)
        default.alpha_composite(dark.resize((192, 288), Image.Resampling.NEAREST), (i * 192, 288))
    save(GENERATED / 'default-contact.png', png(default), check)
    outfits = [DEFAULT, {**DEFAULT, 'top':'top.field-jacket', 'bottom':'bottom.field-trousers',
        'footwear':'footwear.boots', 'headwear':'headwear.beanie', 'hair':'hair.long', 'backpack':'backpack.field',
        'held':'held.map-folder', 'badge':'badge.aerology'}, {**DEFAULT, 'top':'top.sweater', 'bottom':'bottom.jeans',
        'hair':'hair.bob', 'hairColor':'haircolor.auburn', 'skinTone':'skin.medium', 'backpack':'backpack.city',
        'held':'held.pencil', 'badge':'badge.meteo'}]
    outfit_sheet = Image.new('RGBA',(4*192,3*288),(225,230,221,255))
    for row, profile in enumerate(outfits):
        for col, direction in enumerate(DIRS):
            outfit_sheet.alpha_composite(render(runtime,atlas,profile,direction).resize((192,288),Image.Resampling.NEAREST),(col*192,row*288))
    save(GENERATED/'outfit-contact.png',png(outfit_sheet),check)


def compile_pack(rig: dict) -> tuple[dict, Image.Image, bytes, dict, int]:
    """Compile without writing files or changing the independent acceptance record."""
    validate_rig(rig)
    atlas = Atlas(rig.get('motion', {}).get('maximumDecodedAtlasBytes', 2097152), compact='motion' in rig); sources = {}
    body, sources['body'] = frame_source('body', rig)
    runtime = {'version': 1, 'rigId': rig['rigId'], 'revision': rig['runtimeRevision'], 'complete': True,
        'artAcceptance': 'PENDING', 'frame': rig['frame'], 'clips': rig['clips'], 'palettes': rig['palettes'],
        'body': body_frames(body, atlas, rig), 'parts': {}, 'companions': {'companion.none': None}}
    for group, slot in rig['slots'].items():
        for value in slot['values']:
            name = f'{group}.{value}'
            if value == 'none':
                runtime['parts'][name] = {d: {'idle': [{'cels': []} for _ in rig['clips']['idle']['durationsMs']]} for d in rig['directions']}
            else:
                frames, sources[name] = frame_source(name, rig)
                if group == 'hair':
                    colors = {pixel[:3] for frame in frames.values() for pixel in frame.get_flattened_data() if pixel[3]}
                    if not colors.issubset({tuple(p) for p in rig['palettes']['hair']['source']}): raise ValueError('Hair escapes exact ramp')
                runtime['parts'][name] = part_frames(frames, name, atlas, rig, body)
    for name in rig['companionIds']:
        frames, sources[name] = frame_source(name, rig)
        runtime['companions'][name] = {'frame': rig['companionFrame'],
            'anchor': rig['assembly']['companionOffset'], 'frames': part_frames(frames, name, atlas, rig)}
    if 'motion' in rig:
        motion_frames, motion_metadata = read_motion(rig, SOURCE, ROOT)
        append_motion(runtime, atlas, rig, motion_frames)
        sources['body']['motion'] = {plane: motion_metadata[f'body.{plane}'] for plane in ('base', 'hands', 'forearm')}
        for name in sources:
            if name != 'body': sources[name]['motion'] = motion_metadata[name]
    packed, rects = atlas.pack(); resolve_rects(runtime, rects)
    runtime['atlas'] = {'assetId': 'player.modular.r01.atlas', 'url': '/assets/avatar/modular-r01/atlas.png',
        'width': packed.width, 'height': packed.height}
    data = png(packed)
    return runtime, packed, data, sources, len(atlas.images)


def build(check: bool) -> None:
    rig = validate_rig(json.loads((SOURCE / 'rig.json').read_text()))
    source_manifest = json.loads(MANIFEST.read_text())
    prior = json_bytes(source_manifest)
    runtime, packed, data, sources, unique_cels = compile_pack(rig)
    admission = acceptance_result(source_manifest, rig, runtime, data, ROOT)
    runtime['artAcceptance'] = admission['status']
    source_manifest['currentAcceptance'] = admission
    source_manifest['sources'] = sources
    source_manifest['rigSha256'] = sha((SOURCE / 'rig.json').read_bytes())
    source_manifest['budget'] = {'compressedAtlasBytes': len(data), 'decodedAtlasBytes': packed.width * packed.height * 4,
        'atlasSize': list(packed.size), 'uniqueCels': unique_cels, 'sourceFamilies': len(sources),
        'catalogValues': 42, 'appearanceCombinations': 1944000, 'publishedDirections': DIRS,
        'publishedClips': list(runtime['clips']), 'playerCompositeRgbaBytesPerDirection': 96 * 144 * 4 * sum(len(c['durationsMs']) for c in runtime['clips'].values()),
        'companionCompositeRgbaBytesPerDirection': 64 * 64 * 4 * sum(len(c['durationsMs']) for c in runtime['clips'].values()),
        'maximumDecodedAtlasBytes': rig.get('motion', {}).get('maximumDecodedAtlasBytes', 2097152)}
    source_manifest['outputs'] = {'atlasSha256': sha(data), 'manifestSha256': sha(json_bytes(runtime))}
    if check and json_bytes(source_manifest) != prior: raise ValueError('Source manifest hashes or budgets are stale')
    for directory in [GENERATED, PUBLIC]:
        save(directory / 'atlas.png', data, check); save(directory / 'manifest.json', json_bytes(runtime), check)
    contacts(runtime, packed, check)
    if not check: MANIFEST.write_bytes(json_bytes(source_manifest))
    clips = ', '.join(f'{name}{len(clip["durationsMs"])}' for name, clip in runtime['clips'].items())
    print(f"Modular player: {len(sources)} families, 42 values, {clips} × 4 directions; {len(data)} PNG bytes, {packed.width * packed.height * 4} decoded; art={runtime['artAcceptance']}; {'verified' if check else 'built'}")
    if admission['reasons']:
        print('Admission pending: ' + '; '.join(admission['reasons']))
        if check:
            raise ValueError('The published modular pack does not have matching independent acceptance')


def build_candidate(rig_path: Path, output: Path, check: bool) -> None:
    """Produce reviewable artifacts without publishing or editing acceptance."""
    if not output.resolve().is_relative_to((ROOT/'artifacts').resolve()):
        raise ValueError('Candidate output must stay under artifacts/, outside public/generated assets')
    rig = validate_rig(json.loads(rig_path.read_text()))
    runtime, packed, data, sources, unique_cels = compile_pack(rig)
    admission = acceptance_result(json.loads(MANIFEST.read_text()), rig, runtime, data, ROOT)
    runtime['artAcceptance'] = admission['status']
    evidence = {'status': 'CANDIDATE_NOT_ADMITTED', 'fingerprints': admission['fingerprints'],
        'sourceFamilies': len(sources), 'uniqueCels': unique_cels, 'atlasSize': list(packed.size),
        'compressedAtlasBytes': len(data), 'decodedAtlasBytes': packed.width*packed.height*4,
        'clips': runtime['clips'], 'currentAcceptance': admission}
    save(output/'atlas.png', data, check)
    save(output/'manifest.json', json_bytes(runtime), check)
    save(output/'candidate-evidence.json', json_bytes(evidence), check)
    print(f"Motion candidate: {unique_cels} cels, {packed.width}×{packed.height}, {len(data)} PNG bytes; {'verified' if check else 'written'} outside production")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--rig', type=Path, help='Explicit source contract for an artifacts-only candidate')
    parser.add_argument('--candidate', type=Path, help='Write review outputs under artifacts/, without publishing')
    args = parser.parse_args()
    if args.candidate:
        build_candidate(args.rig or SOURCE/'rig.json', args.candidate, args.check)
    elif args.rig:
        parser.error('--rig is only available with --candidate')
    else:
        build(args.check)
