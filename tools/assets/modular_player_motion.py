"""Read and pack independently authored motion without changing its pixels.

The editable Aseprite files, not the authoring mesh or a generated PNG, are the
production pixel source. The source index binds every plane including occluded
parts, so an unreviewed change cannot reuse the accepted source fingerprint.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from build_characters_r01 import read_aseprite
from modular_player_contract import digest, ints, require

EXPECTED_CLIPS = {'walk': {'durationsMs': [140]*6, 'loop': True},
                  'inspect': {'durationsMs': [240]*6, 'loop': False}}


def validate_motion_rig(motion: dict, rig: dict) -> dict:
    require(motion.get('version') == 1 and motion.get('rigId') == rig['rigId'], 'invalid authored motion schema/family')
    require(motion.get('revision') == rig['runtimeRevision'], 'motion revision differs')
    require(motion.get('frame') == rig['frame'] and motion.get('directions') == rig['directions'], 'motion frame/directions differ')
    require(motion.get('clips') == EXPECTED_CLIPS, 'motion requires synchronized walk6/inspect6 timing')
    require(motion.get('sampling') == 'nearest-pixel-centre', 'motion sampling may not interpolate pixels')
    require(motion.get('segmentOverlap') == 2, 'unsupported authored segment overlap')
    poses, targets = motion.get('poses', {}), motion.get('targets', {})
    require(set(poses) == set(rig['directions']) and set(targets) == set(poses), 'missing authored motion direction')
    for direction, pose in poses.items():
        arms = pose.get('handNames', [])
        require(isinstance(arms, list) and 1 <= len(arms) <= 2 and len(set(arms)) == len(arms)
            and set(arms) <= {'rightArm', 'leftArm'} and pose.get('nearArm') in arms, 'invalid authored arm identity')
        limbs = arms+['rightLeg', 'leftLeg']
        for limb in limbs:
            segment = pose.get(limb, {})
            joints, polygon = segment.get('joints', []), segment.get('mask', [])
            require(isinstance(joints, list) and len(joints) == 3 and all(ints(p, 2, 0, 144) and p[0] <= 96 for p in joints), 'invalid source joint chain')
            require(type(segment.get('width')) is int and 1 <= segment['width'] <= 24, 'invalid authored mesh width')
            require(isinstance(polygon, list) and 4 <= len(polygon) <= 16 and all(ints(p, 2, 0, 144) and p[0] <= 96 for p in polygon), 'invalid authored segment mask')
        if 'occlusionPatch' in pose:
            patch = pose['occlusionPatch']
            bounds = patch.get('bounds')
            require(ints(bounds, 4, 0, 144) and 0 <= bounds[0] < bounds[2] <= 96
                and 0 <= bounds[1] < bounds[3] <= 136 and type(patch.get('sampleX')) is int
                and 0 <= patch['sampleX'] < 96, 'invalid authored torso occlusion patch')
            overrides = patch.get('sampleOverrides', {})
            require(isinstance(overrides, dict) and set(overrides) <= {f'top.{v}' for v in rig['slots']['top']['values']}
                and all(type(value) is int and 0 <= value < 96 for value in overrides.values()), 'invalid fabric sample override')
            shoe = pose.get('nearShoe')
            require(ints(shoe, 4, 0, 144) and 0 <= shoe[0] < shoe[2] <= 96
                and 0 <= shoe[1] < shoe[3] <= 144, 'invalid directional footwear material')
        require(set(targets[direction]) == set(EXPECTED_CLIPS), 'missing authored motion action')
        for action, phases in targets[direction].items():
            require(isinstance(phases, list) and len(phases) == 6, 'authored motion phase count differs')
            for phase in phases:
                require(set(phase.get('joints', {})) == set(limbs), 'authored motion limb coverage differs')
                for chain in phase['joints'].values():
                    require(isinstance(chain, list) and len(chain) == 3 and all(ints(p, 2, 1, 136) and p[0] < 96 for p in chain), 'authored target chain escapes frame')
                    require(chain[0] != chain[1] and chain[1] != chain[2], 'collapsed authored bone')
                require(ints(phase.get('upperOffset'), 2, -2, 2), 'invalid torso motion amplitude')
                require(isinstance(phase.get('contact'), list) and phase['contact'] and set(phase['contact']) <= {'right', 'left'}, 'missing ground contact')
                require(all(type(phase.get(field, 0)) is int and -20 <= phase.get(field, 0) <= 20 for field in ('headAngle', 'heldAngle')), 'invalid local rotation')
            if action == 'inspect':
                require(phases[0]['joints'] == phases[5]['joints'], 'inspect must return to its first pose')
                for phase in phases:
                    require(all(phase['joints'][name] == pose[name]['joints'] for name in ('rightLeg', 'leftLeg')), 'inspect feet must stay planted')
    return motion


def read_motion(rig: dict, source: Path, root: Path) -> tuple[dict, dict]:
    descriptor = rig['motion']
    motion_path = source/descriptor['rig']
    index_path = source/descriptor['sourceIndex']
    require(digest(motion_path.read_bytes()) == descriptor['rigSha256'], 'authored motion rig hash differs')
    require(digest(index_path.read_bytes()) == descriptor['sourceIndexSha256'], 'editable motion index hash differs')
    motion = validate_motion_rig(json.loads(motion_path.read_text()), rig)
    index = json.loads(index_path.read_text())
    require(index.get('version') == 1 and index.get('rigId') == rig['rigId'] and index.get('revision') == rig['runtimeRevision'], 'invalid editable motion index')
    require(index.get('motionRigSha256') == descriptor['rigSha256'], 'editable motion belongs to another source rig')
    expected = {'body.base', 'body.hands', 'body.forearm'} | set(rig['companionIds']) | {
        f'{group}.{value}' for group, slot in rig['slots'].items() for value in slot['values'] if value != 'none'}
    require(set(index.get('families', {})) == expected, 'editable motion family coverage differs')
    frames, metadata = {}, {}
    for name, actions in index['families'].items():
        require(set(actions) == set(EXPECTED_CLIPS), f'{name}: missing editable action')
        frames[name] = {d: {} for d in rig['directions']}
        metadata[name] = {}
        geometry = rig['companionFrame'] if name.startswith('companion.') else rig['frame']
        size = [geometry['width'], geometry['height']]
        for action, entry in actions.items():
            filename = f'{name}.{action}.aseprite'
            require(entry.get('source') == filename, f'{name}: unexpected editable source path')
            path = index_path.parent/filename
            require(digest(path.read_bytes()) == entry.get('sha256'), f'{name}/{action}: editable source hash differs')
            cels, durations, tags = read_aseprite(path)
            expected_tags = {f'{d}.{action}': [i*6, i*6+5] for i, d in enumerate(rig['directions'])}
            expected_duration = EXPECTED_CLIPS[action]['durationsMs'][0]
            require(entry.get('frameSize') == size and entry.get('count') == 24 and entry.get('durationMs') == expected_duration
                and entry.get('tags') == expected_tags, f'{name}/{action}: index geometry/timing differs')
            require(len(cels) == 24 and durations == [expected_duration]*24 and tags == expected_tags
                and all(list(cel.size) == size for cel in cels), f'{name}/{action}: editable geometry/timing differs')
            for cel in cels:
                bounds = cel.getbbox()
                require(bool(bounds) and bounds[0] >= 1 and bounds[1] >= 2 and bounds[2] < geometry['width']
                    and bounds[3] <= geometry['pivot'][1], f'{name}/{action}: unsafe source margin')
                if name.startswith('hair.'):
                    require(all(pixel[:3] in {tuple(p) for p in rig['palettes']['hair']['source']}
                        for pixel in cel.get_flattened_data() if pixel[3]), f'{name}: motion escapes hair ramp')
            for i, direction in enumerate(rig['directions']):
                frames[name][direction][action] = cels[i*6:i*6+6]
            metadata[name][action] = {**entry, 'source': str(path.relative_to(root))}
    return frames, metadata


def tiles(image: Image.Image, atlas, z: int, role: str | None = None) -> list[dict]:
    """Lossless 32×36 cel subdivision; at most twelve cels per human plane."""
    cels = []
    for y in range(0, image.height, 36):
        for x in range(0, image.width, 32):
            crop = image.crop((x, y, min(x+32, image.width), min(y+36, image.height)))
            if crop.getbbox():
                plane = Image.new('RGBA', image.size)
                plane.paste(crop, (x, y))
                cels.append(atlas.cel(plane, z, role=role))
    return cels


def append_motion(runtime: dict, atlas, rig: dict, frames: dict) -> None:
    for direction in rig['directions']:
        pose = rig['assembly']['poses'][direction]
        for action in EXPECTED_CLIPS:
            runtime['body'][direction][action] = []
            for phase in range(6):
                body = tiles(frames['body.base'][direction][action][phase], atlas, pose['layerOrder']['bodyUpper'], 'skin')
                body.append(atlas.cel(frames['body.hands'][direction][action][phase], pose['layerOrder']['hands'], role='skin'))
                require(len(body) <= 16, 'body motion exceeds runtime cel limit')
                runtime['body'][direction][action].append({'cels': body})
            for group, slot in rig['slots'].items():
                layer = slot['layer']
                role = rig['assembly']['layers'][layer].get('paletteRole')
                for value in slot['values']:
                    name = f'{group}.{value}'
                    output = []
                    hidden = pose['hiddenLayers'].get(layer)
                    for phase in range(6):
                        if value == 'none':
                            output.append({'cels': []}); continue
                        if hidden:
                            output.append({'cels': [], 'hidden': hidden}); continue
                        cels = tiles(frames[name][direction][action][phase], atlas, pose['layerOrder'][layer], role)
                        for supplement in pose['extraBodyMasks'].get(name, []):
                            cels.append(atlas.cel(frames['body.forearm'][direction][action][phase],
                                pose['layerOrder'][supplement['layer']], role='skin'))
                        require(len(cels) <= 16, f'{name}: motion exceeds runtime cel limit')
                        output.append({'cels': cels})
                    runtime['parts'][name][direction][action] = output
            for name in rig['companionIds']:
                # Companion poses stay independent and static; no animal walk
                # is inferred from the player's six-frame action clock.
                runtime['companions'][name]['frames'][direction][action] = [
                    {'cels': [atlas.cel(frames[name][direction][action][i], pose['layerOrder']['companion'])]} for i in range(6)]
