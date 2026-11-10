#!/usr/bin/env python3
"""Deterministic R01 actor export from editable RGBA Aseprite animation sources.

The explicit one-time --import-source step wraps inspected provider PNG strips
in real Aseprite frames, tags and durations. Normal builds use only .aseprite
sources. No paid call, image interpolation or synthesized animation occurs here.
Only the documented subset of Aseprite is accepted; unsupported cels/blends fail.
Specification: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import struct
import zlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/characters.r01.json'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def chunk(kind: int, payload: bytes) -> bytes:
    return struct.pack('<IH', len(payload) + 6, kind) + payload


def string(value: str) -> bytes:
    raw = value.encode('utf-8')
    return struct.pack('<H', len(raw)) + raw


def read_string(data: bytes, pos: int) -> tuple[str, int]:
    length = struct.unpack_from('<H', data, pos)[0]
    return data[pos + 2:pos + 2 + length].decode('utf-8'), pos + 2 + length


def clean(image: Image.Image) -> Image.Image:
    image = image.convert('RGBA')
    levels = set(image.getchannel('A').tobytes())
    if not levels.issubset({0, 255}) or not {0, 255}.issubset(levels):
        raise ValueError('Actor frames require reviewed binary transparency and visible pixels')
    raw = bytearray(image.tobytes())
    for offset in range(0, len(raw), 4):
        if raw[offset + 3] == 0:
            raw[offset:offset + 3] = b'\x00\x00\x00'
    return Image.frombytes('RGBA', image.size, bytes(raw))


def write_aseprite(path: Path, frames: list[Image.Image], duration: int, tags: dict) -> None:
    if path.exists():
        raise ValueError(f'Refusing to overwrite editable source: {path}')
    width, height = frames[0].size
    encoded = []
    for index, image in enumerate(frames):
        if image.size != (width, height):
            raise ValueError('Inconsistent source frame boxes')
        chunks = []
        if index == 0:
            chunks += [chunk(0x2007, struct.pack('<HHI8x', 1, 0, 0)),
                       chunk(0x2004, struct.pack('<6HB3x', 3, 0, 0, 0, 0, 0, 255) + string('actor'))]
            payload = struct.pack('<H8x', len(tags))
            for name, bounds in tags.items():
                payload += struct.pack('<HHBH6x3BB', bounds[0], bounds[1], 0, 0, 85, 156, 191, 0) + string(name)
            chunks.append(chunk(0x2018, payload))
        cel = struct.pack('<HhhBHh5xHH', 0, 0, 0, 255, 2, 0, width, height)
        chunks.append(chunk(0x2005, cel + zlib.compress(clean(image).tobytes(), 9)))
        body = b''.join(chunks)
        encoded.append(struct.pack('<IHHH2xI', len(body) + 16, 0xF1FA, len(chunks), duration, 0) + body)
    payload = b''.join(encoded)
    header = bytearray(128)
    struct.pack_into('<IHHHHHIH', header, 0, 128 + len(payload), 0xA5E0, len(frames), width, height, 32, 1, duration)
    header[34:36] = bytes((1, 1))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(bytes(header) + payload)


def read_aseprite(path: Path) -> tuple[list[Image.Image], list[int], dict]:
    data = path.read_bytes()
    length, magic, count, width, height, depth = struct.unpack_from('<I5H', data)
    if length != len(data) or magic != 0xA5E0 or depth != 32 or not 1 <= count <= 64:
        raise ValueError(f'Expected bounded RGBA Aseprite animation: {path}')
    frames, durations, tags = [], [], {}
    pos, layers = 128, 0
    for _ in range(count):
        frame_size, frame_magic, old_chunks, duration = struct.unpack_from('<IHHH', data, pos)
        n = struct.unpack_from('<I', data, pos + 12)[0] or old_chunks
        end = pos + frame_size
        if frame_magic != 0xF1FA or end > len(data) or not 60 <= duration <= 60_000:
            raise ValueError('Invalid frame length or duration')
        pos += 16
        image = None
        for _ in range(n):
            size, kind = struct.unpack_from('<IH', data, pos)
            if size < 6 or pos + size > end:
                raise ValueError('Invalid Aseprite chunk')
            payload = data[pos + 6:pos + size]
            if kind == 0x2004:
                flags, layer_type, child, _w, _h, blend, opacity = struct.unpack_from('<6HB', payload)
                if layers or layer_type or child or blend or opacity != 255 or not flags & 1:
                    raise ValueError('Export expects one visible, ordinary, opaque actor layer')
                layers += 1
            elif kind == 0x2005:
                layer, x, y, opacity, cel_type = struct.unpack_from('<HhhBH', payload)
                if image is not None or layer or opacity != 255 or cel_type not in (0, 2):
                    raise ValueError('Unsupported actor cel or opacity')
                w, h = struct.unpack_from('<HH', payload, 16)
                if x < 0 or y < 0 or x + w > width or y + h > height:
                    raise ValueError('Cel outside source frame')
                raw = payload[20:] if cel_type == 0 else zlib.decompress(payload[20:])
                if len(raw) != w * h * 4:
                    raise ValueError('Invalid cel pixel data')
                image = Image.new('RGBA', (width, height))
                image.paste(Image.frombytes('RGBA', (w, h), raw), (x, y))
            elif kind == 0x2018:
                num = struct.unpack_from('<H', payload)[0]
                cursor = 10
                for _ in range(num):
                    start, stop, direction = struct.unpack_from('<HHB', payload, cursor)
                    repeat = struct.unpack_from('<H', payload, cursor + 5)[0]
                    name, cursor = read_string(payload, cursor + 17)
                    if name in tags or direction or repeat or not 0 <= start <= stop < count:
                        raise ValueError('Unsupported or invalid animation tag')
                    tags[name] = [start, stop]
            elif kind not in (0x2007, 0x2020):
                raise ValueError(f'Unsupported Aseprite chunk {kind:#x}; export in the documented source subset')
            pos += size
        if pos != end or image is None:
            raise ValueError('Missing actor frame or trailing frame bytes')
        frames.append(clean(image))
        durations.append(duration)
    if pos != len(data) or layers != 1 or not tags:
        raise ValueError('Incomplete editable animation source')
    return frames, durations, tags


def png(image: Image.Image) -> bytes:
    stream = io.BytesIO()
    image.save(stream, format='PNG', optimize=False, compress_level=9)
    return stream.getvalue()


def save(path: Path, data: bytes, check: bool) -> None:
    if check:
        if not path.exists() or path.read_bytes() != data:
            raise ValueError(f'Missing or stale generated output: {path.relative_to(ROOT)}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or path.read_bytes() != data:
            path.write_bytes(data)


def build(check: bool, import_sources: bool) -> None:
    manifest = json.loads(MANIFEST.read_text())
    before = json.dumps(manifest, sort_keys=True)
    runtime = {'version': 1, 'artAcceptance': 'PASS' if manifest['art_status'] == 'pass' else 'PENDING', 'actors': [], 'equipment': []}
    total_bytes, decoded = 0, 0
    for actor in manifest['actors']:
        source = ROOT / actor['source']
        if import_sources and not source.exists():
            strip = Image.open(ROOT / actor['provider_sheet']).convert('RGBA')
            w, h = actor['provider_frame_size']
            count = actor['provider_frame_count']
            if strip.size != (w * count, h):
                raise ValueError('Provider strip does not match recorded frame metadata')
            frames = [strip.crop((i * w, 0, (i + 1) * w, h)) for i in range(count)]
            # Reviewed source normalization: add breathing room around the actor
            # and align the support foot, without rescaling/redrawing any pixel.
            padding = actor['normalization']['padding']
            normalized = []
            for frame in frames:
                box = frame.getbbox()
                if not box:
                    raise ValueError('Empty provider frame')
                canvas = Image.new('RGBA', (w + padding * 2, h + padding * 2))
                canvas.paste(frame, (padding, h + padding - box[3]))
                normalized.append(canvas)
            frames = normalized
            write_aseprite(source, frames, actor['frame_duration_ms'], actor['tags'])
        frames, durations, tags = read_aseprite(source)
        w, h = frames[0].size
        definition = {k: actor[k] for k in ('id', 'label', 'role', 'displayHeight', 'pivot', 'positions')}
        if actor.get('motion'):
            definition['motion'] = actor['motion']
        definition['clips'] = {}
        outputs = {}
        for tag, bounds in tags.items():
            selected = frames[bounds[0]:bounds[1] + 1]
            sheet = Image.new('RGBA', (w * len(selected), h))
            for index, frame in enumerate(selected):
                sheet.paste(frame, (index * w, 0))
            data = png(sheet)
            filename = f"{actor['name']}-{tag}.png"
            public_path = '/hub/characters/' + filename
            save(ROOT / 'assets/generated/characters/r01' / filename, data, check)
            save(ROOT / 'apps/web/public' / public_path.lstrip('/'), data, check)
            definition['clips'][tag] = {'assetId': actor['id'] + '.' + tag, 'url': public_path,
                'frameWidth': w, 'frameHeight': h, 'frameCount': len(selected), 'durationsMs': durations[bounds[0]:bounds[1] + 1]}
            if tag == 'walk':
                definition['clips'][tag]['facing'] = actor['motion']['direction']
            outputs[tag] = {'sha256': sha(data), 'bytes': len(data), 'frameSize': [w, h],
                'frameCount': len(selected), 'durationsMs': durations[bounds[0]:bounds[1] + 1],
                'frameBounds': [list(frame.getbbox()) for frame in selected]}
            total_bytes += len(data)
            decoded += sheet.width * sheet.height * 4
        if 'idle' not in definition['clips']:
            raise ValueError('Every actor needs a reduced-motion still/idle tag')
        actor['outputs'] = outputs
        actor['sourceSha256'] = sha(source.read_bytes())
        actor['providerSha256'] = sha((ROOT / actor['provider_sheet']).read_bytes())
        runtime['actors'].append(definition)
    manifest['budget'] = {'compressedPngBytes': total_bytes, 'decodedRgbaBytes': decoded, 'animatedActors': 3,
        'maximumDecodedRgbaBytes': 4_194_304}
    if decoded > manifest['budget']['maximumDecodedRgbaBytes']:
        raise ValueError('Character pack exceeds the 4 MiB decoded budget')
    if check and before != json.dumps(manifest, sort_keys=True):
        raise ValueError('Stale source checksum, frames, timings or byte budget in manifest')
    runtime_bytes = (json.dumps(runtime, ensure_ascii=False, indent=2) + '\n').encode()
    save(ROOT / 'apps/web/public/hub/characters/manifest.json', runtime_bytes, check)
    if not check:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"R01 characters: {len(runtime['actors'])} actors, {total_bytes} PNG bytes, {decoded} decoded RGBA bytes; {'verified' if check else 'built'}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--import-source', action='store_true')
    args = parser.parse_args()
    if args.check and args.import_source:
        parser.error('Source import and read-only check are separate operations')
    build(args.check, args.import_source)
