#!/usr/bin/env python3
"""Собрать рабочие комнаты из редактируемых слоёв Aseprite.

Слои окна и интерьера взаимно дополняют исходный рисунок без изменения
пикселей. Дождь ограничен маской стекла; научные схемы остаются в интерфейсе.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops

from build_hub_r01 import digest, read_layers
from build_station_room_r01 import clean_alpha, import_source, save
from build_modular_player_r01 import pack_png as encode

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/environment.workrooms-r01.json'


def build(check: bool, import_sources: bool, require_approved: bool) -> None:
    manifest = json.loads(MANIFEST.read_text())
    before = json.dumps(manifest, sort_keys=True)
    png_bytes = decoded_bytes = 0
    for room in manifest['rooms']:
        if import_sources:
            import_source(room)
        layers = read_layers(ROOT / room['source'])
        if set(layers) != {'window-view', 'room-front'}:
            raise ValueError(f"{room['id']}: неверные слои комнаты")
        for name, layer in layers.items():
            if layer.size != tuple(room['logicalSize']) or set(layer.getchannel('A').tobytes()) != {0, 255}:
                raise ValueError(f"{room['id']} / {name}: неверный размер или альфа-канал")
        glass = layers['window-view'].getchannel('A')
        front = layers['room-front'].getchannel('A')
        if ImageChops.add(glass, front).getextrema() != (255, 255) or ImageChops.multiply(glass, front).getextrema() != (0, 0):
            raise ValueError(f"{room['id']}: слои перекрываются либо оставляют отверстия")
        original = Image.open(ROOT / room['provider']['source']).convert('RGBA')
        combined = Image.alpha_composite(layers['window-view'], layers['room-front'])
        if original.tobytes() != combined.tobytes():
            raise ValueError(f"{room['id']}: разложение изменило исходный рисунок")
        mask = Image.new('RGBA', original.size, (255, 255, 255, 0))
        mask.putalpha(glass)
        outputs = {**layers, 'window-mask': clean_alpha(mask)}
        for item in room['assets']:
            data = encode(clean_alpha(outputs[item['layer']]))
            save(ROOT / item['generated'], data, check)
            save(ROOT / 'apps/web/public' / item['url'].lstrip('/'), data, check)
            item['sha256'], item['bytes'] = digest(data), len(data)
            png_bytes += len(data)
            decoded_bytes += original.width * original.height * 4
        room['sourceSha256'] = digest((ROOT / room['source']).read_bytes())
        room['provider']['sha256'] = digest((ROOT / room['provider']['source']).read_bytes())
        if require_approved:
            approval = room.get('approval', {})
            if room.get('art_status') != 'pass' or not (ROOT / room.get('art_review', 'missing')).is_file():
                raise ValueError(f"{room['id']}: требуется независимая приёмка")
            if approval.get('sourceSha256') != room['sourceSha256'] or approval.get('outputs') != {a['id']: a['sha256'] for a in room['assets']}:
                raise ValueError(f"{room['id']}: приёмка не относится к этим файлам")
    manifest['totals'] = {'pngBytes': png_bytes, 'decodedBytes': decoded_bytes}
    if png_bytes > manifest['budgets']['pngBytes'] or decoded_bytes > manifest['budgets']['decodedBytes']:
        raise ValueError('Превышен бюджет изображений рабочих комнат')
    if check and json.dumps(manifest, sort_keys=True) != before:
        raise ValueError('Манифест рабочих комнат устарел')
    if not check:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"Рабочие комнаты R01: {len(manifest['rooms'])}, {png_bytes:,} байт PNG; {'проверены' if check else 'собраны'}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--import-source', action='store_true')
    parser.add_argument('--require-approved', action='store_true')
    args = parser.parse_args()
    if args.check and args.import_source:
        parser.error('Импорт исходников и проверка выполняются раздельно')
    build(args.check, args.import_source, args.require_approved)
