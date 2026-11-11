"""Validated authoring geometry and content-bound admission for modular player.

The idle attachment contract remains unchanged. R03 separately binds editable
motion frames and the authored segment rig through their complete source index.
Only explicit review records can admit a changed composition; builds never update
the expected fingerprints or create their own acceptance evidence.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_digest(value: object) -> str:
    return digest(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode())


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(f'Modular player source contract: {message}')


def ints(value: object, count: int, lower: int, upper: int) -> bool:
    return isinstance(value, list) and len(value) == count and all(
        type(v) is int and lower <= v <= upper for v in value)


def validate_rig(rig: dict) -> dict:
    """Fail before reading/packing art when authored source geometry is invalid."""
    require(rig.get('version') in (2, 3) and rig.get('rigId') == 'player.modular.r01.v1', 'wrong schema or family')
    require(rig.get('directions') == ['down', 'right', 'up', 'left'], 'direction identity/order changed')
    require(isinstance(rig.get('runtimeRevision'), str) and bool(re.fullmatch(r'[A-Za-z0-9._-]{1,100}', rig['runtimeRevision'])), 'invalid revision')
    require(rig.get('frame') == {'width': 96, 'height': 144, 'pivot': [48, 136]}, 'human frame requires a new family')
    require(rig.get('companionFrame') == {'width': 64, 'height': 64, 'pivot': [32, 60]}, 'companion frame changed')
    source = rig.get('sourceCels', {})
    require(source == {'count': 4, 'durationMs': 320, 'tagAction': 'idle', 'minimumMargin': [1, 2]}, 'unsupported source layout')
    expected_clips = {'idle': {'durationsMs': [320] * 4, 'loop': True}}
    if rig['version'] == 3:
        expected_clips.update({'walk': {'durationsMs': [140]*6, 'loop': True},
                              'inspect': {'durationsMs': [240]*6, 'loop': False}})
        motion = rig.get('motion', {})
        require(set(motion) == {'rig', 'rigSha256', 'sourceIndex', 'sourceIndexSha256', 'maximumDecodedAtlasBytes'}, 'incomplete motion descriptor')
        require(motion.get('rig') == 'motion-rig.json' and motion.get('sourceIndex') == 'motion/source-index.json', 'unexpected motion source path')
        require(all(isinstance(motion.get(key), str) and bool(re.fullmatch(r'[0-9a-f]{64}', motion[key]))
            for key in ('rigSha256', 'sourceIndexSha256')), 'invalid motion source fingerprint')
        require(motion.get('maximumDecodedAtlasBytes') in (2097152, 4194304, 8388608), 'invalid explicit motion atlas budget')
    else:
        require('motion' not in rig, 'legacy idle schema cannot silently publish motion')
    require(rig.get('clips') == expected_clips, 'unsupported clip timing or coverage')
    tracks = rig.get('tracks', {})
    require(set(tracks) == {'upper', 'planted'} and all(isinstance(v, list) and len(v) == 4 and all(ints(p, 2, -12, 12) for p in v) for v in tracks.values()), 'invalid motion tracks')
    require(tracks['planted'] == [[0, 0]] * 4, 'idle feet must remain planted')
    require(rig.get('idleUpperDy') == [v[1] for v in tracks['upper']], 'legacy idle timing description differs')

    slots = rig.get('slots', {})
    require(list(slots) == ['hair', 'headwear', 'top', 'bottom', 'footwear', 'backpack', 'held', 'badge'], 'slot identity/order changed')
    for group, slot in slots.items():
        values = slot.get('values', [])
        require(isinstance(values, list) and 1 <= len(values) <= 16 and len(set(values)) == len(values) and all(isinstance(v, str) and re.fullmatch(r'[a-z][a-z0-9-]*', v) for v in values), f'invalid {group} values')
        require(slot.get('profileField') == ('heldItem' if group == 'held' else group) and slot.get('layer') == group, f'invalid {group} semantic relation')
        require(type(slot.get('optional')) is bool and slot['optional'] == ('none' in values), f'invalid {group} empty value')
    require(rig.get('companionIds') == ['companion.tit', 'companion.squirrel'], 'companion identity/order changed')

    assembly = rig.get('assembly', {})
    layers = assembly.get('layers', {})
    require(set(layers) == set(slots) | {'bodyUpper', 'bodyLower', 'hands', 'forearm', 'companion'}, 'layer coverage differs')
    for name, layer in layers.items():
        require(isinstance(layer.get('attachment'), str) and layer.get('paletteRole') in (None, 'skin', 'hair'), f'invalid {name} layer')
    selection = assembly.get('skinMaskSelection', {})
    require(type(selection.get('contourMaxChannelExclusive')) is int and 1 <= selection['contourMaxChannelExclusive'] <= 255, 'invalid contour threshold')
    require(type(selection.get('contourRedToBlueMinimum')) in (int, float) and 0 <= selection['contourRedToBlueMinimum'] <= 2, 'invalid contour ratio')
    require(selection.get('neighbours') == [[0, -1], [0, 1], [-1, 0], [1, 0]], 'unsupported contour connectivity')
    require(ints(assembly.get('companionOffset'), 2, -96, 96), 'invalid companion placement')
    part_ids = {f'{group}.{value}' for group, slot in slots.items() for value in slot['values'] if value != 'none'}
    overrides = assembly.get('partAttachments', {})
    require(isinstance(overrides, dict) and set(overrides) <= part_ids, 'unknown part attachment override')
    poses = assembly.get('poses', {})
    require(set(poses) == set(rig['directions']), 'missing source pose')
    for direction, pose in poses.items():
        anchors = pose.get('anchors', {})
        require(isinstance(anchors, dict) and 1 <= len(anchors) <= 32, f'invalid {direction} attachments')
        for name, anchor in anchors.items():
            require(all(ints(anchor.get(key), 2, 0, 144) and anchor[key][0] <= 96 for key in ('sourceAt', 'at')) and anchor.get('track') in tracks, f'invalid {direction}/{name} attachment')
        require(all(layer['attachment'] == 'mask' or layer['attachment'] in anchors for layer in layers.values()), f'missing {direction} layer attachment')
        require(all(a in anchors for a in overrides.values()), f'missing {direction} override attachment')
        split_anchor = pose.get('bodySplitAnchor')
        require(split_anchor in anchors and 1 < anchors[split_anchor]['sourceAt'][1] < rig['frame']['pivot'][1], f'invalid {direction} body split')
        masks = pose.get('masks', {})
        require(isinstance(masks, dict) and 1 <= len(masks) <= 16, f'invalid {direction} masks')
        for name, mask in masks.items():
            bounds = mask.get('bounds')
            require(ints(bounds, 4, 0, 144) and 0 <= bounds[0] < bounds[2] <= 96 and 0 <= bounds[1] < bounds[3] <= 136 and mask.get('attachment') in anchors, f'invalid {direction}/{name} mask')
        hand_masks = pose.get('handMasks', [])
        require(isinstance(hand_masks, list) and 1 <= len(hand_masks) <= 2 and len(set(hand_masks)) == len(hand_masks) and all(m in masks for m in hand_masks), f'invalid {direction} hand masks')
        order = pose.get('layerOrder', {})
        require(set(order) == set(layers) and all(type(v) is int and -1000 <= v <= 1000 for v in order.values()), f'invalid {direction} layer order')
        hidden = pose.get('hiddenLayers', {})
        require(isinstance(hidden, dict) and all(name in slots and slots[name]['optional'] and reason in ('direction', 'occlusion') for name, reason in hidden.items()), f'invalid {direction} hidden layer')
        extras = pose.get('extraBodyMasks', {})
        require(isinstance(extras, dict) and set(extras) <= part_ids, f'unknown {direction} body supplement')
        for part_id, records in extras.items():
            require(isinstance(records, list) and len(records) <= 8 and all(isinstance(r, dict) and r.get('mask') in masks and r.get('layer') in layers for r in records), f'invalid {direction}/{part_id} body supplement')
    return rig


def layer_offset(rig: dict, direction: str, layer: str, phase: int,
                 attachment: str | None = None) -> tuple[int, int]:
    """Translate an authored absolute-grid cel by its selected idle attachment."""
    name = attachment or rig['assembly']['layers'][layer]['attachment']
    anchor = rig['assembly']['poses'][direction]['anchors'][name]
    dx, dy = rig['tracks'][anchor['track']][phase]
    return (anchor['at'][0] - anchor['sourceAt'][0] + dx,
            anchor['at'][1] - anchor['sourceAt'][1] + dy)


def composition_digest(runtime: dict) -> str:
    """Hash every published rendering input, excluding status/revision labels."""
    return canonical_digest({key: value for key, value in runtime.items()
        if key not in ('artAcceptance', 'revision')})


def source_contract_digest(rig: dict) -> str:
    """Include attachment/mask semantics even when an occlusion hides their pixels."""
    return canonical_digest({key: value for key, value in rig.items()
        if key not in ('description', 'runtimeRevision')})


def fingerprints(rig: dict, runtime: dict, atlas_bytes: bytes) -> dict:
    return {'atlasSha256': digest(atlas_bytes), 'compositionSha256': composition_digest(runtime),
            'sourceContractSha256': source_contract_digest(rig)}


def acceptance_result(source_manifest: dict, rig: dict, runtime: dict,
                      atlas_bytes: bytes, root: Path) -> dict:
    """Return PENDING for altered or unreviewed content; never modify review pins."""
    current = fingerprints(rig, runtime, atlas_bytes)
    record = source_manifest.get('acceptedFingerprint', {})
    reasons = []
    if source_manifest.get('art_status') != 'pass' or source_manifest.get('technical_status') != 'pass':
        reasons.append('review status is not pass')
    if record.get('version') != 1:
        reasons.append('missing accepted fingerprint')
    expected = record.get('fingerprints', {})
    for key, actual in current.items():
        if expected.get(key) != actual:
            reasons.append(f'changed or unreviewed {key}')
    evidence = record.get('reviews', {})
    for role in ('pixelArt', 'artDirection', 'sourceContract'):
        relative = evidence.get(role)
        if not isinstance(relative, str) or not relative.startswith('docs/') or Path(relative).is_absolute() or '..' in Path(relative).parts:
            reasons.append(f'missing {role} evidence')
            continue
        path = root / relative
        if not path.is_file():
            reasons.append(f'missing {role} evidence')
            continue
        text = path.read_text(encoding='utf-8')
        if role == 'sourceContract':
            if '<!-- modular-player-source-contract: PASS -->' not in text or not all(expected.get(key) and expected[key] in text for key in current):
                reasons.append('sourceContract evidence does not accept these fingerprints')
        elif expected.get('atlasSha256', '') not in text:
            reasons.append(f'{role} evidence does not identify the accepted atlas')
    return {'status': 'PENDING' if reasons else 'PASS', 'fingerprints': current, 'reasons': reasons}
