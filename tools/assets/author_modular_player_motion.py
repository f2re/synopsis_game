#!/usr/bin/env python3
"""Author R03 editable motion from the accepted directional material and joint rig.

This is an explicit source authoring step, never a browser/runtime deformation.
The source masks separate torso, upper/lower arms, thighs, shins and footwear.
Every view uses its own accepted pixels; no asymmetric artwork is mirrored.
"""
from __future__ import annotations

import argparse
import copy
import json
import math
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from build_characters_r01 import png, write_aseprite
import build_modular_player_r01 as base

ROOT = base.ROOT
SOURCE = base.SOURCE
MOTION = json.loads((SOURCE / 'motion-rig.json').read_text())
SIZE = (96, 144)
EMPTY = (0, 0, 0, 0)


def masked(image: Image.Image, polygon: list) -> Image.Image:
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in polygon], fill=255)
    out = image.copy()
    out.putalpha(Image.composite(image.getchannel('A'), Image.new('L', image.size), mask))
    return base.clean(out) if out.getbbox() else out


def erase(image: Image.Image, mask: Image.Image) -> Image.Image:
    arr = np.asarray(image).copy()
    arr[np.asarray(mask)[:, :, 3] > 0] = 0
    return Image.fromarray(arr)


def translate(image: Image.Image, offset: tuple | list) -> Image.Image:
    result = Image.new('RGBA', image.size)
    result.alpha_composite(image, (int(offset[0]), int(offset[1])))
    return result


def mesh_points(joints: list, width: float) -> list:
    points = np.asarray(joints, dtype=float)
    tangents = []
    for i in range(len(points)):
        tangent = points[min(i + 1, 2)] - points[max(i - 1, 0)]
        tangent /= np.linalg.norm(tangent)
        tangents.append(tangent)
    # Extend the chain past shoulder and wrist to preserve edge/hand pixels.
    points = np.vstack((points[0] - tangents[0] * 12, points, points[-1] + tangents[-1] * 18))
    tangents = [tangents[0], *tangents, tangents[-1]]
    result = []
    for point, tangent in zip(points, tangents):
        normal = np.array([-tangent[1], tangent[0]]) * width
        result.append((point - normal, point + normal))
    return result


def triangle(source: np.ndarray, target: np.ndarray, before: list, after: list) -> None:
    a, b, c = np.asarray(after, dtype=float)
    x0 = max(0, math.floor(min(a[0], b[0], c[0])))
    x1 = min(target.shape[1], math.ceil(max(a[0], b[0], c[0])) + 1)
    y0 = max(0, math.floor(min(a[1], b[1], c[1])))
    y1 = min(target.shape[0], math.ceil(max(a[1], b[1], c[1])) + 1)
    if x0 >= x1 or y0 >= y1:
        return
    xx, yy = np.meshgrid(np.arange(x0, x1), np.arange(y0, y1))
    denominator = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
    if abs(denominator) < 1e-5:
        raise ValueError('Degenerate authored mesh')
    aa = ((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1])) / denominator
    bb = ((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1])) / denominator
    cc = 1-aa-bb
    inside = (aa >= -1e-7) & (bb >= -1e-7) & (cc >= -1e-7)
    sa, sb, sc = np.asarray(before, dtype=float)
    sx = np.rint(aa*sa[0]+bb*sb[0]+cc*sc[0]).astype(int)
    sy = np.rint(aa*sa[1]+bb*sb[1]+cc*sc[1]).astype(int)
    inside &= (sx >= 0) & (sx < source.shape[1]) & (sy >= 0) & (sy < source.shape[0])
    safe_x = np.clip(sx, 0, source.shape[1]-1)
    safe_y = np.clip(sy, 0, source.shape[0]-1)
    sampled = source[safe_y, safe_x]
    inside &= sampled[:, :, 3] > 0
    target[y0:y1, x0:x1][inside] = sampled[inside]


def deform(image: Image.Image, limb: dict, joints: list, sleeve=False) -> Image.Image:
    before = mesh_points(limb['joints'], limb['width'])
    after = mesh_points(joints, limb['width'])
    if joints == limb['joints']:
        return image.copy()
    output = np.zeros((image.height, image.width, 4), dtype=np.uint8)
    pixels = np.asarray(image)
    for i in range(len(before)-1):
        for indices in (((i, 0), (i, 1), (i+1, 0)), ((i, 1), (i+1, 1), (i+1, 0))):
            triangle(pixels, output, [before[a][b] for a, b in indices], [after[a][b] for a, b in indices])
    result = Image.fromarray(output)
    first = np.asarray(joints[1], dtype=float)-np.asarray(joints[0], dtype=float)
    second = np.asarray(joints[2], dtype=float)-np.asarray(joints[1], dtype=float)
    cosine = float(np.dot(first, second)/(np.linalg.norm(first)*np.linalg.norm(second)))
    if sleeve and cosine < .7:
        # A tight elbow cannot retain the outside corner of a straight cuff.
        # Authored rounded joint envelopes trim that folded triangular excess.
        contour = Image.new('L', image.size)
        draw = ImageDraw.Draw(contour)
        radii = [9, 6, 7]
        for i in range(2):
            aa, bb = np.asarray(joints[i], dtype=float), np.asarray(joints[i+1], dtype=float)
            tangent = bb-aa; tangent /= np.linalg.norm(tangent)
            normal = np.array([-tangent[1], tangent[0]])
            points = [aa+normal*radii[i], aa-normal*radii[i], bb-normal*radii[i+1], bb+normal*radii[i+1]]
            draw.polygon([tuple(round(v) for v in point) for point in points], fill=255)
        for (x, y), radius in zip(joints, radii):
            draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=255)
        result.putalpha(Image.composite(result.getchannel('A'), Image.new('L', image.size), contour))
    return result


def point_on_arm(point: list, limb: dict, target: list) -> tuple[int, int]:
    """Follow the forearm's wrist/fist attachment, including its rotation."""
    src = np.asarray(limb['joints'], dtype=float)
    dst = np.asarray(target, dtype=float)
    a = src[-1]-src[-2]; b = dst[-1]-dst[-2]
    theta = math.atan2(b[1], b[0])-math.atan2(a[1], a[0])
    co, si = math.cos(theta), math.sin(theta)
    delta = np.asarray(point)-src[-1]
    rotated = np.array([co*delta[0]-si*delta[1], si*delta[0]+co*delta[1]])
    value = dst[-1]+rotated-np.asarray(point)
    return tuple(round(v) for v in value)


def rotate_at(image: Image.Image, pivot: list, degrees: float) -> Image.Image:
    if not degrees:
        return image.copy()
    theta = math.radians(degrees)
    co, si = math.cos(theta), math.sin(theta)
    x, y = pivot
    return image.transform(image.size, Image.Transform.AFFINE,
        (co, si, x-co*x-si*y, -si, co, y+si*x-co*y), Image.Resampling.NEAREST)


def head_pose(frame: Image.Image, target: dict, direction: str, body=False) -> Image.Image:
    degrees = target.get('headAngle', 0)
    if not degrees:
        return frame
    if not body:
        return rotate_at(frame, [48, 37], degrees)
    head = frame.copy(); head.paste(EMPTY, (0, 39, 96, 144))
    out = frame.copy(); out.paste(EMPTY, (0, 0, 96, 39))
    out.alpha_composite(rotate_at(head, [48, 37], degrees))
    return out


def skin_hands(frame: Image.Image, direction: str) -> tuple[Image.Image, Image.Image, Image.Image]:
    pose = base.RIG['assembly']['poses'][direction]
    skinless, hand_list = base.hands(frame, direction, base.RIG, pose['handMasks'])
    hands = Image.new('RGBA', SIZE)
    for part in hand_list:
        hands.alpha_composite(part)
    forearm = Image.new('RGBA', SIZE)
    if 'shirtForearm' in pose['masks']:
        _, parts = base.hands(frame, direction, base.RIG, ['shirtForearm'])
        for part in parts:
            forearm.alpha_composite(part)
    else:
        rig = copy.deepcopy(base.RIG)
        rig['assembly']['poses'][direction]['masks']['exposedForearms'] = {'bounds': [17, 60, 80, 81], 'attachment': 'handRight'}
        _, parts = base.hands(frame, direction, rig, ['exposedForearms'])
        for part in parts:
            forearm.alpha_composite(part)
    return skinless, hands, forearm


def patch_occlusion(frame: Image.Image, pose: dict, arm: Image.Image, part_id: str | None = None) -> Image.Image:
    result = erase(frame, arm)
    patch = pose.get('occlusionPatch')
    if patch:
        # A hidden torso strip is reconstructed only from this view/garment's
        # own adjacent torso pixel. This is an authored occlusion fill, never
        # a copied opposite-facing arm or arbitrary palette colour.
        x0, y0, x1, y1 = patch['bounds']
        sx = patch.get('sampleOverrides', {}).get(part_id, patch['sampleX'])
        for y in range(y0, y1):
            pixel = frame.getpixel((sx, y))
            if not pixel[3]:
                continue
            for x in range(x0, x1):
                if arm.getpixel((x, y))[3]:
                    result.putpixel((x, y), pixel)
    return result


def animate_upper(frame: Image.Image, direction: str, target: dict, body=False, part_id: str | None = None) -> Image.Image:
    pose = MOTION['poses'][direction]
    static = frame.copy()
    arms = []
    for name in pose['handNames']:
        limb = pose[name]
        arm = masked(frame, limb['mask'])
        if arm.getbbox():
            static = patch_occlusion(static, pose, arm, part_id)
            arms.append(deform(arm, limb, target['joints'][name], sleeve=not body))
    static = translate(static, target['upperOffset'])
    for arm in arms:
        static.alpha_composite(arm)
    return static


def animate_lower(frame: Image.Image, direction: str, target: dict, footwear=False) -> Image.Image:
    pose = MOTION['poses'][direction]
    static = frame.copy()
    side = direction in ('right', 'left')
    if side:
        near = 'rightLeg' if direction == 'right' else 'leftLeg'
        far = 'leftLeg' if direction == 'right' else 'rightLeg'
        if footwear:
            box = pose['nearShoe']
            material = Image.new('RGBA', SIZE)
            material.paste(frame.crop(box), (box[0], box[1]))
            static = Image.new('RGBA', SIZE)
        else:
            material = masked(frame, pose[near]['mask'])
            static = erase(frame, material)
        for name in (far, near):
            if footwear:
                src = pose[name]['joints'][-1]
                dest = target['joints'][name][-1]
                part = translate(material, [dest[0]-src[0], dest[1]-src[1]])
            else:
                part = deform(material, pose[name], target['joints'][name])
            static.alpha_composite(part)
        return static
    parts = []
    for name in ('rightLeg', 'leftLeg'):
        limb = pose[name]
        material = masked(frame, limb['mask'])
        static = erase(static, material)
        if footwear:
            src, dest = limb['joints'][-1], target['joints'][name][-1]
            parts.append(translate(material, [dest[0]-src[0], dest[1]-src[1]]))
        else:
            parts.append(deform(material, limb, target['joints'][name]))
    for part in parts:
        static.alpha_composite(part)
    return static


def family_frame(frame: Image.Image, name: str, direction: str, action: str, phase: int) -> Image.Image:
    target = MOTION['targets'][direction][action][phase]
    pose = MOTION['poses'][direction]
    group = name.split('.')[0]
    if name.startswith('body'):
        if name == 'body.base':
            upper = frame.copy(); upper.paste(EMPTY, (0, 88, 96, 144))
            lower = frame.copy(); lower.paste(EMPTY, (0, 0, 96, 88))
            out = animate_upper(upper, direction, target, True)
            if action == 'walk':
                # Footwear is mandatory. Its independently translated sole is
                # authoritative; do not rotate the hidden undersuit foot out
                # of the shoe when the shin bends.
                lower.paste(EMPTY, (0, 124, 96, 144))
                out.alpha_composite(animate_lower(lower, direction, target))
            else:
                out.alpha_composite(lower)
            return base.clean(head_pose(out, target, direction, True))
        return base.clean(animate_upper(frame, direction, target, True))
    if group == 'top':
        return base.clean(animate_upper(frame, direction, target, part_id=name))
    if group == 'bottom':
        if action == 'inspect':
            return frame.copy()
        return base.clean(animate_lower(frame, direction, target))
    if group == 'footwear':
        if action == 'inspect':
            return frame.copy()
        return base.clean(animate_lower(frame, direction, target, True))
    if group == 'held':
        limb = pose.get('rightArm')
        if limb:
            grip = base.RIG['assembly']['poses'][direction]['anchors']['handRight']['sourceAt']
            offset = point_on_arm(grip, limb, target['joints']['rightArm'])
            frame = rotate_at(frame, grip, target.get('heldAngle', 0))
        else:
            offset = [0, 0]
        return base.clean(translate(frame, offset))
    if group == 'companion':
        # The companion stays an independent actor; no human stride is applied.
        return frame.copy()
    out = translate(frame, target['upperOffset'])
    if group == 'hair' or (group == 'headwear' and name != 'headwear.scarf'):
        out = head_pose(out, target, direction)
    return base.clean(out)


def source_frames() -> dict:
    result = {}
    body, _ = base.frame_source('body')
    for key in ('body.base', 'body.hands', 'body.forearm'):
        result[key] = {}
    for direction, frame in body.items():
        for key, value in zip(('body.base', 'body.hands', 'body.forearm'), skin_hands(frame, direction)):
            result[key][direction] = value
    for group, slot in base.RIG['slots'].items():
        for value in slot['values']:
            if value != 'none':
                name = f'{group}.{value}'
                result[name], _ = base.frame_source(name)
    for name in base.RIG['companionIds']:
        result[name], _ = base.frame_source(name)
    return result


def author_frames(sources: dict) -> dict:
    result = {}
    for name, directions in sources.items():
        result[name] = {d: {a: [family_frame(frame, name, d, a, i) for i in range(6)]
                               for a in MOTION['clips']} for d, frame in directions.items()}
    return result


def composite(frames: dict, profile: dict, direction: str, action: str, phase: int) -> Image.Image:
    out = Image.new('RGBA', SIZE)
    pose = base.RIG['assembly']['poses'][direction]
    layers = [(0, frames['body.base'][direction][action][phase]), (70, frames['body.hands'][direction][action][phase])]
    for group in base.OPTIONS:
        name = profile[group]
        if name.endswith('.none') or group in pose['hiddenLayers']:
            continue
        layers.append((pose['layerOrder'][group], frames[name][direction][action][phase]))
        if name == 'top.shirt' and direction in ('right', 'left'):
            layers.append((35, frames['body.forearm'][direction][action][phase]))
    for _, im in sorted(layers, key=lambda x: x[0]):
        out.alpha_composite(im)
    return out


def preview(frames: dict, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    profile = {**base.DEFAULT, 'held': 'held.tablet'}
    for action in MOTION['clips']:
        sheet = Image.new('RGBA', (6*192, 4*304), (225, 230, 221, 255))
        draw = ImageDraw.Draw(sheet)
        loops = []
        for i in range(6):
            loop = Image.new('RGBA', (4*192, 304), (225, 230, 221, 255))
            for row, direction in enumerate(base.DIRS):
                frame = composite(frames, profile, direction, action, i).resize((192, 288), Image.Resampling.NEAREST)
                sheet.alpha_composite(frame, (i*192, row*304+16))
                draw.text((i*192+8, row*304+2), f'{direction} {action} {i}', fill=(32, 43, 53))
                loop.alpha_composite(frame, (row*192, 16))
            loops.append(loop.convert('RGB'))
        sheet.save(output/f'{action}-candidate.png')
        sheet.resize((6*96, 4*152), Image.Resampling.NEAREST).save(output/f'{action}-native.png')
        sheet.resize((6*48, 4*76), Image.Resampling.NEAREST).save(output/f'{action}-campus.png')
        loops[0].save(output/f'{action}-candidate.gif', save_all=True, append_images=loops[1:], duration=MOTION['clips'][action]['durationsMs'], loop=0, disposal=2)
        for scale, label in ((1, 'native'), (.5, 'campus')):
            scaled = [im.resize((round(im.width*scale/2), round(im.height*scale/2)), Image.Resampling.NEAREST) for im in loops]
            scaled[0].save(output/f'{action}-{label}.gif', save_all=True, append_images=scaled[1:], duration=MOTION['clips'][action]['durationsMs'], loop=0, disposal=2)
    print(output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export', action='store_true', help='Create new editable sources; refuses overwriting them.')
    parser.add_argument('--refresh-source', action='store_true', help='Explicitly re-author recorded source files after review fixes; preserves prior bytes in artifacts.')
    args = parser.parse_args()
    if args.refresh_source and not args.export:
        parser.error('--refresh-source requires --export')
    old_index = None
    archive = None
    if args.refresh_source:
        index_path = SOURCE/'motion/source-index.json'
        old_index = json.loads(index_path.read_text())
        for actions in old_index['families'].values():
            for entry in actions.values():
                path = SOURCE/'motion'/entry['source']
                if base.sha(path.read_bytes()) != entry['sha256']:
                    raise ValueError(f'{path.name}: unrecorded manual edit; review it before re-authoring')
        archive = ROOT/'artifacts/player-r03-motion'/f'source-before-{base.sha(index_path.read_bytes())[:12]}'
        archive.mkdir(exist_ok=True)
        (archive/'source-index.json').write_bytes(index_path.read_bytes())
    frames = author_frames(source_frames())
    preview(frames, ROOT/'artifacts/player-r03-motion/candidate')
    if args.export:
        target = SOURCE/'motion'
        target.mkdir(exist_ok=True)
        index = {'version': 1, 'rigId': MOTION['rigId'], 'revision': MOTION['revision'],
            'motionRigSha256': base.sha((SOURCE/'motion-rig.json').read_bytes()),
            'authoring': {'script': str(Path(__file__).relative_to(ROOT)), 'sha256': base.sha(Path(__file__).read_bytes()),
                'method': 'authored directional segment meshes; no mirrored or generated outfit combinations',
                'referenceOnly': ['motion-guide-right.aseprite', 'motion-reference/inspect-right-guide.png', 'motion-reference/walk-down-guide.png']},
            'companionPolicy': 'Independent static companions retain their accepted directional pixels; shared player phases do not claim animal locomotion.',
            'families': {}}
        if old_index:
            index['authoring']['previousSourceIndexSha256'] = base.sha((SOURCE/'motion/source-index.json').read_bytes())
        for name, directions in frames.items():
            index['families'][name] = {}
            for action, clip in MOTION['clips'].items():
                cels = [frame for d in base.DIRS for frame in directions[d][action]]
                tags = {f'{d}.{action}': [i*6, i*6+5] for i, d in enumerate(base.DIRS)}
                path = target/f'{name}.{action}.aseprite'
                for i, frame in enumerate(cels):
                    box = frame.getbbox()
                    ground = 60 if name.startswith('companion.') else 136
                    if not box or box[0] < 1 or box[1] < 2 or box[2] >= frame.width or box[3] > ground:
                        raise ValueError(f'{name}/{action}/{i}: unsafe authored bounds {box}')
                if args.refresh_source:
                    with tempfile.TemporaryDirectory(prefix='modular-motion-source-') as temporary:
                        fresh = Path(temporary)/path.name
                        write_aseprite(fresh, cels, clip['durationsMs'][0], tags)
                        data = fresh.read_bytes()
                    if data != path.read_bytes():
                        assert archive is not None
                        (archive/path.name).write_bytes(path.read_bytes())
                        path.write_bytes(data)
                else:
                    write_aseprite(path, cels, clip['durationsMs'][0], tags)
                index['families'][name][action] = {'source': path.name, 'sha256': base.sha(path.read_bytes()),
                    'frameSize': list(cels[0].size), 'count': len(cels), 'durationMs': clip['durationsMs'][0], 'tags': tags}
        (target/'source-index.json').write_bytes(base.json_bytes(index))
        print(f'Exported {len(frames)} editable planes × two clips; accepted R01 sources unchanged.')


if __name__ == '__main__':
    main()
