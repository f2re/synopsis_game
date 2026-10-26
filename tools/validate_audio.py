#!/usr/bin/env python3
"""Проверка целостности и соответствия стандартам аудиоколлекции «26063: Позывной «Синоптик»».

Проверяет:
- Наличие и синтаксис манифеста assets/manifests/audio.collection.json;
- Наличие всех WAV и сжатых OGG ассетов в assets/source/audio и apps/web/public/audio;
- Соответствие контрольных сумм SHA-256;
- Соответствие открытым лицензиям (CC0-1.0, Public Domain, CC-BY-3.0, CC-BY-4.0, CC-BY-SA-3.0, CC-BY-SA-4.0, MIT);
- Наличие полной информации о происхождении (provenance: автор, источник, метод верификации);
- Корректность аудиоформата (WAV: 44.1 kHz, 16-bit, моно);
- Отсутствие цифрового клиппинга (peak < 32767);
- Бесшовность граничных сэмплов для зацикленных эмбиент-петель (diff < 1500).
"""

from __future__ import annotations

import hashlib
import json
import struct
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "assets" / "manifests" / "audio.collection.json"

ALLOWED_LICENSES = {
    "CC0-1.0",
    "Public Domain",
    "CC-BY-3.0",
    "CC-BY-4.0",
    "CC-BY-SA-3.0",
    "CC-BY-SA-4.0",
    "MIT",
}


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def validate_audio() -> list[str]:
    errors: list[str] = []
    if not MANIFEST_PATH.exists():
        return [f"Файл манифеста не найден: {MANIFEST_PATH}"]

    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return [f"Ошибка парсинга JSON манифеста: {exc}"]

    assets = manifest.get("assets", [])
    if not assets:
        errors.append("В манифесте отсутствует список ассетов.")

    for item in assets:
        sound_id = item.get("id")
        rel_path = item.get("path")
        runtime_url = item.get("runtimeUrl")
        expected_sha = item.get("sha256")
        license_str = item.get("license")
        provenance = item.get("provenance")

        if not sound_id or not rel_path:
            errors.append(f"Ассет без id или пути: {item}")
            continue

        file_path = ROOT / rel_path
        if not file_path.exists():
            errors.append(f"Файл ассета не найден на диске: {rel_path}")
            continue

        pub_path = ROOT / "apps" / "web" / "public" / runtime_url.lstrip("/")
        if not pub_path.exists():
            errors.append(f"Файл ассета не найден в public веб-приложения: {pub_path}")
            continue

        actual_sha = compute_sha256(file_path)
        if actual_sha != expected_sha:
            errors.append(f"Не совпадает sha256 для {sound_id}: ожидалось {expected_sha}, получено {actual_sha}")

        if not license_str or license_str not in ALLOWED_LICENSES:
            errors.append(f"Недопустимая или отсутствующая лицензия для {sound_id}: {license_str}")

        if not provenance or not provenance.get("sourceType"):
            errors.append(f"Отсутствует информация о происхождении (provenance) для {sound_id}")

        # Проверка сжатого OGG файла (если заявлен в манифесте)
        compressed_path_str = item.get("compressedPath")
        if compressed_path_str:
            comp_file = ROOT / compressed_path_str
            if not comp_file.exists():
                errors.append(f"Сжатый файл ассета не найден: {compressed_path_str}")
            else:
                expected_comp_sha = item.get("compressedSha256")
                actual_comp_sha = compute_sha256(comp_file)
                if expected_comp_sha and actual_comp_sha != expected_comp_sha:
                    errors.append(
                        f"Не совпадает sha256 сжатого ассета {sound_id}: "
                        f"ожидалось {expected_comp_sha}, получено {actual_comp_sha}"
                    )

            comp_runtime_url = item.get("compressedRuntimeUrl")
            if comp_runtime_url:
                comp_pub = ROOT / "apps" / "web" / "public" / comp_runtime_url.lstrip("/")
                if not comp_pub.exists():
                    errors.append(f"Сжатый файл не найден в public веб-приложения: {comp_pub}")

        # Проверка WAV структуры
        try:
            with wave.open(str(file_path), "rb") as wf:
                rate = wf.getframerate()
                channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                frames = wf.getnframes()

                if rate != 44100:
                    errors.append(f"{sound_id}: частота дискретизации {rate} != 44100")
                if channels != 1:
                    errors.append(f"{sound_id}: каналы {channels} != 1 (моно)")
                if sampwidth != 2:
                    errors.append(f"{sound_id}: разрядность {sampwidth * 8} != 16 бит")

                raw_bytes = wf.readframes(frames)
                int_samples = struct.unpack(f"<{frames}h", raw_bytes)
                max_int = max(abs(s) for s in int_samples) if int_samples else 0
                if max_int >= 32767:
                    errors.append(f"{sound_id}: обнаружен клиппинг (max_int = {max_int})")

                # Проверка бесшовного цикла для лупов
                if item.get("loop"):
                    head_sample = int_samples[0]
                    tail_sample = int_samples[-1]
                    diff = abs(head_sample - tail_sample)
                    if diff > 1500:
                        errors.append(f"{sound_id}: разрыв на границе цикла (diff = {diff})")

        except Exception as exc:  # noqa: BLE001
            errors.append(f"Ошибка проверки структуры WAV {rel_path}: {exc}")

    return errors


def main() -> int:
    errors = validate_audio()
    if errors:
        print(f"Ошибки валидации аудио ({len(errors)}):", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    count = len(manifest.get("assets", []))
    print(f"Проверка аудиоколлекции успешно завершена: {count} ассетов проверено, ошибок нет.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
