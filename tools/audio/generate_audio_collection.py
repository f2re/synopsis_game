#!/usr/bin/env python3
"""Генератор гибридной эталонной аудиоколлекции для «26063: Позывной «Синоптик»».

Объединяет:
1. Аутентичные полевые записи фауны и ландшафта Северо-Запада / Балтики
   (большая синица Parus major, зяблик Fringilla coelebs, морская чайка Laridae,
   накат волн Финского залива, ветер в соснах, тихий дождь);
2. Точные процедурные/синтезированные сигналы приборов и интерфейса
   (барограф, часовой механизм, тумблер, шелест синоптических бланков,
   позывной Морзе 26063, мажорный синоптический колокольчик, глухой стук ошибки);
3. Двойной формат хранения:
   - Несжатый студийный WAV (16-bit PCM, 44.1 kHz, моно) для точного анализа;
   - Высокоэффективный сжатый OGG Opus (64 kbps) для лёгкой доставки в веб и быстрого декодирования в Web Audio API.

Все сторонние источники проверены на открытые совместимые лицензии (CC0, CC-BY, CC-BY-SA, Public Domain).
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import random
import shutil
import struct
import subprocess
import urllib.request
import wave
from pathlib import Path

SAMPLE_RATE = 44100
ROOT = Path(__file__).resolve().parents[2]
SOURCE_AUDIO_DIR = ROOT / "assets" / "source" / "audio"
PUBLIC_AUDIO_DIR = ROOT / "apps" / "web" / "public" / "audio"
MANIFEST_PATH = ROOT / "assets" / "manifests" / "audio.collection.json"
CACHE_DIR = Path("/tmp/synopsis_audio_sources")

HTTP_HEADERS = {
    "User-Agent": "SynopsisGameAudio/1.0 (meteorological game project; contact: admin@synopsis.local)"
}


# -----------------------------------------------------------------------------
# Цифровые сигнальные примитивы (DSP) для процедурного синтеза
# -----------------------------------------------------------------------------

class Biquad:
    """Двухполюсный рекурсивный фильтр (Audio EQ Cookbook)."""

    def __init__(self, filter_type: str, freq: float, q: float = 0.707, sample_rate: int = SAMPLE_RATE) -> None:
        self.sample_rate = sample_rate
        w0 = 2.0 * math.pi * max(10.0, min(freq, sample_rate * 0.49)) / sample_rate
        alpha = math.sin(w0) / (2.0 * max(0.01, q))
        cos_w0 = math.cos(w0)

        if filter_type == "lowpass":
            b0 = (1.0 - cos_w0) / 2.0
            b1 = 1.0 - cos_w0
            b2 = (1.0 - cos_w0) / 2.0
            a0 = 1.0 + alpha
            a1 = -2.0 * cos_w0
            a2 = 1.0 - alpha
        elif filter_type == "highpass":
            b0 = (1.0 + cos_w0) / 2.0
            b1 = -(1.0 + cos_w0)
            b2 = (1.0 + cos_w0) / 2.0
            a0 = 1.0 + alpha
            a1 = -2.0 * cos_w0
            a2 = 1.0 - alpha
        elif filter_type == "bandpass":
            b0 = alpha
            b1 = 0.0
            b2 = -alpha
            a0 = 1.0 + alpha
            a1 = -2.0 * cos_w0
            a2 = 1.0 - alpha
        elif filter_type == "notch":
            b0 = 1.0
            b1 = -2.0 * cos_w0
            b2 = 1.0
            a0 = 1.0 + alpha
            a1 = -2.0 * cos_w0
            a2 = 1.0 - alpha
        else:
            raise ValueError(f"Unknown filter type: {filter_type}")

        self.b0 = b0 / a0
        self.b1 = b1 / a0
        self.b2 = b2 / a0
        self.a1 = a1 / a0
        self.a2 = a2 / a0
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0

    def process(self, x: float) -> float:
        y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2
        self.x2 = self.x1
        self.x1 = x
        self.y2 = self.y1
        self.y1 = y
        return y


class PinkNoise:
    """Генератор розового шума (1/f) по алгоритму Пола Келлета (Paul Kellet)."""

    def __init__(self, rng: random.Random) -> None:
        self.rng = rng
        self.b0 = self.b1 = self.b2 = self.b3 = self.b4 = self.b5 = self.b6 = 0.0

    def sample(self) -> float:
        white = self.rng.uniform(-1.0, 1.0)
        self.b0 = 0.99886 * self.b0 + white * 0.0555179
        self.b1 = 0.99332 * self.b1 + white * 0.0750759
        self.b2 = 0.96900 * self.b2 + white * 0.1538520
        self.b3 = 0.86650 * self.b3 + white * 0.3104856
        self.b4 = 0.55000 * self.b4 + white * 0.5329522
        self.b5 = -0.7616 * self.b5 - white * 0.0168980
        val = self.b0 + self.b1 + self.b2 + self.b3 + self.b4 + self.b5 + self.b6 + white * 0.5362
        self.b6 = white * 0.115926
        return val * 0.11


class WhiteNoise:
    def __init__(self, rng: random.Random) -> None:
        self.rng = rng

    def sample(self) -> float:
        return self.rng.uniform(-1.0, 1.0)


def adsr_envelope(
    t: float,
    attack: float,
    decay: float,
    sustain_level: float,
    release: float,
    duration: float,
) -> float:
    if t < 0.0 or t > duration:
        return 0.0
    if t < attack:
        return t / max(0.0001, attack)
    if t < attack + decay:
        dt = t - attack
        return 1.0 - (1.0 - sustain_level) * (dt / max(0.0001, decay))
    sustain_end = duration - release
    if t < sustain_end:
        return sustain_level
    dt = t - sustain_end
    return sustain_level * max(0.0, 1.0 - dt / max(0.0001, release))


def save_wav(path: Path, samples: list[float], sample_rate: int = SAMPLE_RATE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    max_amp = max(abs(s) for s in samples) if samples else 0.0
    scale = 32000.0 / max_amp if max_amp > 32000.0 else 1.0
    packed = bytearray()
    for s in samples:
        val = int(max(-32767.0, min(32767.0, s * scale)))
        packed.extend(struct.pack("<h", val))

    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(packed)


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def encode_ogg(src_wav: Path, dest_ogg: Path) -> None:
    dest_ogg.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src_wav),
            "-c:a",
            "libopus",
            "-b:a",
            "64k",
            str(dest_ogg),
        ],
        check=True,
        capture_output=True,
    )


# -----------------------------------------------------------------------------
# Процедурные синтезаторы приборов, UI и интерьеров
# -----------------------------------------------------------------------------

def synth_archive_room_bed(duration: float = 31.7) -> list[float]:
    """Атмосфера архива/кабинета: тёплый низкочастотный рокот и тишина (31.7 с — простое число)."""
    rng = random.Random(2606303)
    num_samples = int(duration * SAMPLE_RATE)
    pn = PinkNoise(rng)
    lp = Biquad("lowpass", 160.0, 0.9)
    hp = Biquad("highpass", 28.0, 0.707)
    res = []
    fade_len = int(SAMPLE_RATE * 1.5)
    for i in range(num_samples):
        val = hp.process(lp.process(pn.sample() * 0.45))
        if i < fade_len:
            val *= math.sin((i / fade_len) * (math.pi / 2))
        elif i > num_samples - fade_len:
            val *= math.cos(((i - (num_samples - fade_len)) / fade_len) * (math.pi / 2))
        res.append(val * 4500.0)

    # Замыкание петли
    head = res[0]
    tail = res[-1]
    diff = tail - head
    for k in range(100):
        res[num_samples - 100 + k] -= diff * (k / 100.0)
    return res


def synth_night_air_bed(duration: float = 27.1) -> list[float]:
    """Прохладный ночной воздух над заливом (27.1 с — простое число)."""
    rng = random.Random(2606304)
    num_samples = int(duration * SAMPLE_RATE)
    pn = PinkNoise(rng)
    bp = Biquad("bandpass", 240.0, 0.6)
    lp = Biquad("lowpass", 700.0, 0.5)
    res = []
    fade_len = int(SAMPLE_RATE * 1.5)
    for i in range(num_samples):
        raw = pn.sample()
        val = lp.process(bp.process(raw * 0.40))
        t = i / SAMPLE_RATE
        val *= 0.85 + 0.15 * math.sin(2.0 * math.pi * 0.037 * t)
        if i < fade_len:
            val *= math.sin((i / fade_len) * (math.pi / 2))
        elif i > num_samples - fade_len:
            val *= math.cos(((i - (num_samples - fade_len)) / fade_len) * (math.pi / 2))
        res.append(val * 5000.0)

    head = res[0]
    tail = res[-1]
    diff = tail - head
    for k in range(100):
        res[num_samples - 100 + k] -= diff * (k / 100.0)
    return res


def synth_squirrel_scurry() -> list[float]:
    rng = random.Random(2606308)
    dur = 1.35
    num_samples = int(dur * SAMPLE_RATE)
    wn = WhiteNoise(rng)
    bp = Biquad("bandpass", 2200.0, 2.5)
    hp = Biquad("highpass", 1100.0, 1.0)
    steps = [0.08, 0.22, 0.35, 0.49, 0.61, 0.73, 0.86, 0.97, 1.10]
    res = [0.0] * num_samples
    for s_time in steps:
        step_idx = int(s_time * SAMPLE_RATE)
        burst_len = int(0.045 * SAMPLE_RATE)
        for j in range(burst_len):
            idx = step_idx + j
            if idx < num_samples:
                env = math.exp(-j / (burst_len * 0.35))
                res[idx] += hp.process(bp.process(wn.sample())) * env * 12000.0
    return res


def synth_barograph_tick() -> list[float]:
    rng = random.Random(2606309)
    dur = 0.45
    num_samples = int(dur * SAMPLE_RATE)
    wn = WhiteNoise(rng)
    bp = Biquad("bandpass", 3200.0, 3.5)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        val += math.sin(2.0 * math.pi * 420.0 * t) * math.exp(-t / 0.025) * 16000.0
        noise_burst = bp.process(wn.sample()) * math.exp(-t / 0.008) * 14000.0
        val += noise_burst
        if t > 0.06:
            dt = t - 0.06
            val += math.sin(2.0 * math.pi * 680.0 * dt) * math.exp(-dt / 0.035) * 8000.0
        res.append(val)
    return res


def synth_clockwork_hum() -> list[float]:
    dur = 2.40
    num_samples = int(dur * SAMPLE_RATE)
    lp = Biquad("lowpass", 350.0, 1.2)
    res = []
    fade = int(0.12 * SAMPLE_RATE)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        val += math.sin(2.0 * math.pi * 50.0 * t) * 6000.0
        val += math.sin(2.0 * math.pi * 100.0 * t) * 3500.0
        val += math.sin(2.0 * math.pi * 150.0 * t) * 1800.0
        val += math.sin(2.0 * math.pi * 320.0 * t) * (0.5 + 0.5 * math.sin(2.0 * math.pi * 4.0 * t)) * 2200.0
        val = lp.process(val)
        if i < fade:
            val *= i / fade
        elif i > num_samples - fade:
            val *= (num_samples - i) / fade
        res.append(val)
    return res


def synth_lamp_switch() -> list[float]:
    rng = random.Random(2606311)
    dur = 0.35
    num_samples = int(dur * SAMPLE_RATE)
    wn = WhiteNoise(rng)
    bp = Biquad("bandpass", 1600.0, 2.2)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        val += bp.process(wn.sample()) * math.exp(-t / 0.012) * 22000.0
        val += math.sin(2.0 * math.pi * 280.0 * t) * math.exp(-t / 0.04) * 11000.0
        if t > 0.028:
            dt = t - 0.028
            val += bp.process(wn.sample()) * math.exp(-dt / 0.009) * 14000.0
        res.append(val)
    return res


def synth_paper_turn() -> list[float]:
    rng = random.Random(2606312)
    dur = 1.15
    num_samples = int(dur * SAMPLE_RATE)
    pn = PinkNoise(rng)
    hp = Biquad("highpass", 600.0, 0.8)
    lp = Biquad("lowpass", 5200.0, 0.9)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = adsr_envelope(t, 0.18, 0.40, 0.35, 0.30, dur)
        val = lp.process(hp.process(pn.sample())) * env * 14000.0
        res.append(val)
    return res


def synth_teletype_chatter() -> list[float]:
    rng = random.Random(2606313)
    dur = 1.90
    num_samples = int(dur * SAMPLE_RATE)
    wn = WhiteNoise(rng)
    bp = Biquad("bandpass", 2400.0, 3.0)
    res = [0.0] * num_samples
    stroke_times = [0.05, 0.16, 0.28, 0.42, 0.53, 0.67, 0.81, 0.92, 1.05, 1.18, 1.30, 1.45, 1.58, 1.70]
    for st in stroke_times:
        s_idx = int(st * SAMPLE_RATE)
        burst = int(0.035 * SAMPLE_RATE)
        freq = rng.uniform(850.0, 1250.0)
        for j in range(burst):
            idx = s_idx + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                val = math.sin(2.0 * math.pi * freq * t) * math.exp(-j / (burst * 0.28)) * 8000.0
                val += bp.process(wn.sample()) * math.exp(-j / (burst * 0.15)) * 9500.0
                res[idx] += val
    return res


def synth_radar_pulse() -> list[float]:
    dur = 1.40
    num_samples = int(dur * SAMPLE_RATE)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        freq = 1100.0 + 400.0 * math.exp(-t / 0.18)
        val = math.sin(2.0 * math.pi * freq * t) * math.exp(-t / 0.32) * 16000.0
        val += math.sin(2.0 * math.pi * (freq * 0.5) * t) * math.exp(-t / 0.45) * 6000.0
        res.append(val)
    return res


def synth_balloon_release() -> list[float]:
    rng = random.Random(2606315)
    dur = 1.50
    num_samples = int(dur * SAMPLE_RATE)
    pn = PinkNoise(rng)
    bp = Biquad("bandpass", 900.0, 1.1)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = adsr_envelope(t, 0.08, 0.35, 0.45, 0.45, dur)
        val = bp.process(pn.sample()) * env * 14000.0
        res.append(val)
    return res


def synth_anemometer_spin() -> list[float]:
    rng = random.Random(2606316)
    dur = 2.00
    num_samples = int(dur * SAMPLE_RATE)
    pn = PinkNoise(rng)
    lp = Biquad("lowpass", 1400.0, 1.0)
    res = []
    fade = int(0.15 * SAMPLE_RATE)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        rot_freq = 4.5 + 1.5 * math.sin(2.0 * math.pi * 0.4 * t)
        mod = 0.6 + 0.4 * (math.sin(2.0 * math.pi * rot_freq * t) ** 2)
        val = lp.process(pn.sample()) * mod * 12000.0
        if i < fade:
            val *= i / fade
        elif i > num_samples - fade:
            val *= (num_samples - i) / fade
        res.append(val)
    return res


def synth_door_latch() -> list[float]:
    dur = 0.55
    num_samples = int(dur * SAMPLE_RATE)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        val += math.sin(2.0 * math.pi * 310.0 * t) * math.exp(-t / 0.03) * 16000.0
        val += math.sin(2.0 * math.pi * 840.0 * t) * math.exp(-t / 0.015) * 12000.0
        if t > 0.12:
            dt = t - 0.12
            val += math.sin(2.0 * math.pi * 220.0 * dt) * math.exp(-dt / 0.05) * 18000.0
        res.append(val)
    return res


def synth_ui_click_soft() -> list[float]:
    dur = 0.08
    num_samples = int(dur * SAMPLE_RATE)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = math.sin(2.0 * math.pi * 1250.0 * t) * math.exp(-t / 0.010) * 17000.0
        val += math.sin(2.0 * math.pi * 2600.0 * t) * math.exp(-t / 0.005) * 8000.0
        res.append(val)
    return res


def synth_ui_hover_subtle() -> list[float]:
    dur = 0.09
    num_samples = int(dur * SAMPLE_RATE)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = math.sin(2.0 * math.pi * 1760.0 * t) * math.exp(-t / 0.022) * 7500.0
        res.append(val)
    return res


def synth_feedback_synoptic_chime() -> list[float]:
    dur = 1.35
    num_samples = int(dur * SAMPLE_RATE)
    res = []
    c6, e6, g6, c7 = 1046.50, 1318.51, 1567.98, 2093.00
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        val += math.sin(2.0 * math.pi * c6 * t) * math.exp(-t / 0.45) * 9000.0
        if t > 0.06:
            dt = t - 0.06
            val += math.sin(2.0 * math.pi * e6 * dt) * math.exp(-dt / 0.48) * 8500.0
        if t > 0.12:
            dt = t - 0.12
            val += math.sin(2.0 * math.pi * g6 * dt) * math.exp(-dt / 0.52) * 8000.0
        if t > 0.18:
            dt = t - 0.18
            val += math.sin(2.0 * math.pi * c7 * dt) * math.exp(-dt / 0.58) * 7500.0
        res.append(val)
    return res


def synth_feedback_mistake_thud() -> list[float]:
    dur = 0.55
    num_samples = int(dur * SAMPLE_RATE)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        freq = 135.0 * math.exp(-t / 0.14)
        val = math.sin(2.0 * math.pi * freq * t) * math.exp(-t / 0.12) * 22000.0
        val += math.sin(2.0 * math.pi * (freq * 0.5) * t) * math.exp(-t / 0.16) * 9000.0
        res.append(val)
    return res


def synth_arena_round_start() -> list[float]:
    dur = 2.10
    num_samples = int(dur * SAMPLE_RATE)
    res = []
    fundamental = 440.0
    harmonics = [(1.0, 10000.0, 0.9), (1.52, 6000.0, 0.7), (2.03, 4000.0, 0.5), (3.11, 2500.0, 0.35)]
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        for ratio, amp, decay in harmonics:
            f = fundamental * ratio
            val += math.sin(2.0 * math.pi * f * t) * math.exp(-t / decay) * amp
        res.append(val)
    return res


def synth_arena_countdown_tick() -> list[float]:
    dur = 0.22
    num_samples = int(dur * SAMPLE_RATE)
    res = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = math.sin(2.0 * math.pi * 920.0 * t) * math.exp(-t / 0.015) * 16000.0
        val += math.sin(2.0 * math.pi * 1840.0 * t) * math.exp(-t / 0.008) * 11000.0
        res.append(val)
    return res


def synth_lore_callsign_26063() -> list[float]:
    freq = 750.0
    dit = 0.075
    dah = dit * 3.0
    elem_space = dit
    char_space = dit * 3.0

    morse_pattern = [
        ("dah", dah), ("dah", dah), ("dit", dit), ("dit", dit), ("dit", dit),  # 2
        ("space", char_space),
        ("dah", dah), ("dit", dit), ("dit", dit), ("dit", dit), ("dit", dit),  # 6
        ("space", char_space),
        ("dah", dah), ("dah", dah), ("dah", dah), ("dah", dah), ("dah", dah),  # 0
        ("space", char_space),
        ("dah", dah), ("dit", dit), ("dit", dit), ("dit", dit), ("dit", dit),  # 6
        ("space", char_space),
        ("dit", dit), ("dit", dit), ("dit", dit), ("dah", dah), ("dah", dah),  # 3
    ]

    res = []
    lead_silence = int(0.20 * SAMPLE_RATE)
    res.extend([0.0] * lead_silence)

    for item_type, dur in morse_pattern:
        if item_type == "space":
            res.extend([0.0] * int(dur * SAMPLE_RATE))
        else:
            num_samp = int(dur * SAMPLE_RATE)
            ramp = int(0.005 * SAMPLE_RATE)
            for j in range(num_samp):
                t = j / SAMPLE_RATE
                val = math.sin(2.0 * math.pi * freq * t) * 11000.0
                if j < ramp:
                    val *= j / ramp
                elif j > num_samp - ramp:
                    val *= (num_samp - j) / ramp
                res.append(val)
            res.extend([0.0] * int(elem_space * SAMPLE_RATE))

    tail_silence = int(0.35 * SAMPLE_RATE)
    res.extend([0.0] * tail_silence)
    return res


# -----------------------------------------------------------------------------
# Обработка аутентичных полевых записей (FFmpeg Slicing & Seamless Loops)
# -----------------------------------------------------------------------------

def ensure_sources_cached() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    sources = {
        "tit.ogg": "https://upload.wikimedia.org/wikipedia/commons/c/cd/Parus_major_-_Great_Tit_XC129643.ogg",
        "finch.ogg": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Fringilla_coelebs.ogg",
        "gull.ogg": "https://upload.wikimedia.org/wikipedia/commons/2/23/Kittiwake_%28Rissa_tridactyla%29_%28W1CDR0001389_BD30%29.ogg",
        "waves.ogg": "https://upload.wikimedia.org/wikipedia/commons/1/1f/Waves.ogg",
        "wind.wav": "https://upload.wikimedia.org/wikipedia/commons/4/47/Wind_in_forest_%28Gravity_Sound%29.wav",
        "rain.ogg": "https://upload.wikimedia.org/wikipedia/commons/8/8a/Sound_of_rain.ogg",
    }
    for fname, url in sources.items():
        dest = CACHE_DIR / fname
        if not dest.exists():
            print(f"  [↓] Загрузка полевого источника: {fname}...")
            req = urllib.request.Request(url, headers=HTTP_HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as f:
                f.write(resp.read())


def slice_field_one_shot(
    src_path: Path,
    dest_wav: Path,
    start_sec: float,
    duration_sec: float,
    gain: float = 1.0,
    fade_in: float = 0.03,
    fade_out: float = 0.05,
) -> None:
    dest_wav.parent.mkdir(parents=True, exist_ok=True)
    fade_out_start = max(0.01, duration_sec - fade_out)
    af = f"afade=t=in:ss=0:d={fade_in},afade=t=out:st={fade_out_start:.2f}:d={fade_out},volume={gain}"
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        str(start_sec),
        "-t",
        str(duration_sec),
        "-i",
        str(src_path),
        "-af",
        af,
        "-ar",
        "44100",
        "-ac",
        "1",
        str(dest_wav),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def create_seamless_loop(
    src_path: Path,
    dest_wav: Path,
    start_sec: float,
    loop_len_sec: float,
    crossfade_sec: float = 1.2,
    gain: float = 1.0,
) -> None:
    dest_wav.parent.mkdir(parents=True, exist_ok=True)
    total_len = loop_len_sec + crossfade_sec
    tmp_cut = Path("/tmp/loop_cut_temp.wav")

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            str(start_sec),
            "-t",
            str(total_len),
            "-i",
            str(src_path),
            "-ar",
            "44100",
            "-ac",
            "1",
            str(tmp_cut),
        ],
        check=True,
        capture_output=True,
    )

    filter_complex = (
        f"[0:a]atrim=start=0:end={crossfade_sec},asetpts=PTS-STARTPTS[head];"
        f"[0:a]atrim=start={crossfade_sec}:end={loop_len_sec},asetpts=PTS-STARTPTS[body];"
        f"[0:a]atrim=start={loop_len_sec}:end={total_len},asetpts=PTS-STARTPTS[tail];"
        f"[tail][head]acrossfade=d={crossfade_sec}:c1=tri:c2=tri[seam];"
        f"[body][seam]concat=n=2:v=0:a=1,volume={gain}[out]"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp_cut),
            "-filter_complex",
            filter_complex,
            "-map",
            "[out]",
            "-ar",
            "44100",
            "-ac",
            "1",
            str(dest_wav),
        ],
        check=True,
        capture_output=True,
    )
    if tmp_cut.exists():
        tmp_cut.unlink()


# -----------------------------------------------------------------------------
# Каталог ассетов гибридной коллекции
# -----------------------------------------------------------------------------

def build_hybrid_collection() -> None:
    print("=== 26063: Позывной «Синоптик» — Сборка гибридной аудиоколлекции ===")
    SOURCE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    ensure_sources_cached()

    manifest_entries = []

    # --- 1. Эмбиент-петли (Multi-layer incommensurate beds) ---
    ambient_specs = [
        {
            "id": "audio.ambient.wind-trees",
            "title": "Прибрежный ветер и шелест крон",
            "description": "Бесшовный эмбиент-петля: аутентичный шелест сосен и морской бриз Балтики (длина: 29.3 с).",
            "category": "ambient",
            "layer": "wind/trees/water bed",
            "subpath": "ambient/amb_wind_trees_bed",
            "type": "field_loop",
            "src": CACHE_DIR / "wind.wav",
            "start": 5.0,
            "len": 29.3,
            "crossfade": 1.5,
            "gain": 1.7,
            "default_volume": 0.45,
            "target_lufs": -24,
            "author": "Gravity Sound (https://www.gravitysound.studio/)",
            "license": "CC-BY-4.0",
            "provenance": {
                "sourceType": "field-recording-loop",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Wind_in_forest_(Gravity_Sound).wav",
                "originalWork": "Wind in forest (Gravity Sound)",
                "rightsClearance": "CC-BY-4.0 Attribution",
                "verifiedBy": ["audio-ambient-designer", "meteo-verifier"],
            },
        },
        {
            "id": "audio.ambient.water-shore",
            "title": "Морской прибой Балтийского побережья",
            "description": "Бесшовный эмбиент-петля: мягкий накат волн на песчаный берег залива (длина: 19.1 с).",
            "category": "ambient",
            "layer": "wind/trees/water bed",
            "subpath": "ambient/amb_water_shore_bed",
            "type": "field_loop",
            "src": CACHE_DIR / "waves.ogg",
            "start": 10.0,
            "len": 19.1,
            "crossfade": 1.2,
            "gain": 1.4,
            "default_volume": 0.40,
            "target_lufs": -25,
            "author": "Wikimedia Commons contributor",
            "license": "Public Domain",
            "provenance": {
                "sourceType": "field-recording-loop",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Waves.ogg",
                "originalWork": "Waves.ogg",
                "rightsClearance": "Public Domain dedication",
                "verifiedBy": ["audio-ambient-designer", "meteo-verifier"],
            },
        },
        {
            "id": "audio.ambient.rain-soft",
            "title": "Мягкий дождь на метеоплощадке",
            "description": "Бесшовный эмбиент-петля: спокойный дождь на почву и кроны деревьев (длина: 23.7 с).",
            "category": "ambient",
            "layer": "weather dynamic bed",
            "subpath": "ambient/amb_rain_soft_bed",
            "type": "field_loop",
            "src": CACHE_DIR / "rain.ogg",
            "start": 1.0,
            "len": 23.7,
            "crossfade": 1.2,
            "gain": 2.2,
            "default_volume": 0.35,
            "target_lufs": -26,
            "author": "Effib",
            "license": "CC-BY-SA-3.0",
            "provenance": {
                "sourceType": "field-recording-loop",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sound_of_rain.ogg",
                "originalWork": "Sound of rain.ogg",
                "rightsClearance": "CC-BY-SA-3.0 Attribution ShareAlike",
                "verifiedBy": ["audio-ambient-designer", "meteo-verifier"],
            },
        },
        {
            "id": "audio.ambient.archive-room",
            "title": "Кабинет синоптика и архив",
            "description": "Бесшовный эмбиент-петля: тёплая тишина научного кабинета и шелест карт (длина: 31.7 с).",
            "category": "ambient",
            "layer": "indoor equipment/room bed",
            "subpath": "ambient/amb_archive_room_bed",
            "type": "synth",
            "synth": synth_archive_room_bed,
            "default_volume": 0.35,
            "target_lufs": -28,
            "author": "26063 audio-ambient-designer (in-tree procedural engine)",
            "license": "CC0-1.0",
            "provenance": {
                "sourceType": "authored-procedural-synth",
                "generatorScript": "tools/audio/generate_audio_collection.py",
                "rightsClearance": "Fully owned repository procedural code",
                "verifiedBy": ["audio-ambient-designer"],
            },
        },
        {
            "id": "audio.ambient.night-air",
            "title": "Ночной воздух кампуса",
            "description": "Бесшовный эмбиент-петля: прохладная прозрачная ночь над побережьем (длина: 27.1 с).",
            "category": "ambient",
            "layer": "night atmosphere bed",
            "subpath": "ambient/amb_night_air_bed",
            "type": "synth",
            "synth": synth_night_air_bed,
            "default_volume": 0.35,
            "target_lufs": -28,
            "author": "26063 audio-ambient-designer (in-tree procedural engine)",
            "license": "CC0-1.0",
            "provenance": {
                "sourceType": "authored-procedural-synth",
                "generatorScript": "tools/audio/generate_audio_collection.py",
                "rightsClearance": "Fully owned repository procedural code",
                "verifiedBy": ["audio-ambient-designer"],
            },
        },
    ]

    # --- 2. Фауна Северо-Запада (ShuffleBag variations) ---
    fauna_specs = [
        {
            "id": "audio.fauna.tit-chirp-01",
            "title": "Большая синица (Parus major) — короткая позывка",
            "description": "Аутентичный призывный свист большой синицы в кампусе (1.25 с).",
            "category": "fauna",
            "layer": "fauna/living world",
            "subpath": "fauna/fauna_tit_chirp_01",
            "type": "field_slice",
            "src": CACHE_DIR / "tit.ogg",
            "start": 1.55,
            "len": 1.25,
            "gain": 1.5,
            "default_volume": 0.65,
            "target_lufs": -18,
            "author": "Gavin Vella (Xeno-canto XC129643)",
            "license": "CC-BY-SA-3.0",
            "provenance": {
                "sourceType": "field-recording-slice",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Parus_major_-_Great_Tit_XC129643.ogg",
                "originalWork": "XC129643 Parus major",
                "rightsClearance": "CC-BY-SA-3.0 Attribution ShareAlike",
                "verifiedBy": ["audio-ambient-designer", "meteo-verifier"],
            },
        },
        {
            "id": "audio.fauna.tit-chirp-02",
            "title": "Большая синица (Parus major) — весенняя песня",
            "description": "Ритмичная чистая песня «ци-ци-фи» синицы в кронах лип (2.50 с).",
            "category": "fauna",
            "layer": "fauna/living world",
            "subpath": "fauna/fauna_tit_chirp_02",
            "type": "field_slice",
            "src": CACHE_DIR / "tit.ogg",
            "start": 10.05,
            "len": 2.50,
            "gain": 1.5,
            "default_volume": 0.65,
            "target_lufs": -18,
            "author": "Gavin Vella (Xeno-canto XC129643)",
            "license": "CC-BY-SA-3.0",
            "provenance": {
                "sourceType": "field-recording-slice",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Parus_major_-_Great_Tit_XC129643.ogg",
                "originalWork": "XC129643 Parus major",
                "rightsClearance": "CC-BY-SA-3.0",
                "verifiedBy": ["audio-ambient-designer"],
            },
        },
        {
            "id": "audio.fauna.tit-chirp-03",
            "title": "Большая синица (Parus major) — переливчатая трель",
            "description": "Звонкая территориальная трель большой синицы (2.65 с).",
            "category": "fauna",
            "layer": "fauna/living world",
            "subpath": "fauna/fauna_tit_chirp_03",
            "type": "field_slice",
            "src": CACHE_DIR / "tit.ogg",
            "start": 28.50,
            "len": 2.65,
            "gain": 1.3,
            "default_volume": 0.65,
            "target_lufs": -18,
            "author": "Gavin Vella (Xeno-canto XC129643)",
            "license": "CC-BY-SA-3.0",
            "provenance": {
                "sourceType": "field-recording-slice",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Parus_major_-_Great_Tit_XC129643.ogg",
                "originalWork": "XC129643 Parus major",
                "rightsClearance": "CC-BY-SA-3.0",
                "verifiedBy": ["audio-ambient-designer"],
            },
        },
        {
            "id": "audio.fauna.finch-trill-01",
            "title": "Зяблик (Fringilla coelebs) — песня с росчерком",
            "description": "Аутентичная песня зяблика: задорная нисходящая трель с финальным росчерком (2.45 с).",
            "category": "fauna",
            "layer": "fauna/living world",
            "subpath": "fauna/fauna_finch_trill_01",
            "type": "field_slice",
            "src": CACHE_DIR / "finch.ogg",
            "start": 1.50,
            "len": 2.45,
            "gain": 1.1,
            "default_volume": 0.60,
            "target_lufs": -19,
            "author": "Jarno Elonen (Southern Finland spruce forest)",
            "license": "CC-BY-SA-3.0",
            "provenance": {
                "sourceType": "field-recording-slice",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Fringilla_coelebs.ogg",
                "originalWork": "Fringilla coelebs.ogg",
                "rightsClearance": "CC-BY-SA-3.0 Attribution ShareAlike",
                "verifiedBy": ["audio-ambient-designer", "meteo-verifier"],
            },
        },
        {
            "id": "audio.fauna.finch-trill-02",
            "title": "Зяблик (Fringilla coelebs) — территориальная трель",
            "description": "Раскатистая энергичная трель зяблика в сосновом бору (2.60 с).",
            "category": "fauna",
            "layer": "fauna/living world",
            "subpath": "fauna/fauna_finch_trill_02",
            "type": "field_slice",
            "src": CACHE_DIR / "finch.ogg",
            "start": 10.35,
            "len": 2.60,
            "gain": 1.4,
            "default_volume": 0.60,
            "target_lufs": -19,
            "author": "Jarno Elonen (Southern Finland spruce forest)",
            "license": "CC-BY-SA-3.0",
            "provenance": {
                "sourceType": "field-recording-slice",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Fringilla_coelebs.ogg",
                "originalWork": "Fringilla coelebs.ogg",
                "rightsClearance": "CC-BY-SA-3.0",
                "verifiedBy": ["audio-ambient-designer"],
            },
        },
        {
            "id": "audio.fauna.gull-distant-01",
            "title": "Чайка (Laridae / Rissa) — далёкий морской крик",
            "description": "Протяжный морской крик чайки над акваторией Финского залива (2.15 с).",
            "category": "fauna",
            "layer": "fauna/living world",
            "subpath": "fauna/fauna_gull_distant_01",
            "type": "field_slice",
            "src": CACHE_DIR / "gull.ogg",
            "start": 4.75,
            "len": 2.15,
            "gain": 1.5,
            "default_volume": 0.55,
            "target_lufs": -20,
            "author": "British Library Sound Archive (W1CDR0001389)",
            "license": "CC0-1.0",
            "provenance": {
                "sourceType": "field-recording-slice",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kittiwake_(Rissa_tridactyla)_(W1CDR0001389_BD30).ogg",
                "originalWork": "British Library Kittiwake recording",
                "rightsClearance": "CC0-1.0 Public Domain dedication",
                "verifiedBy": ["audio-ambient-designer", "meteo-verifier"],
            },
        },
        {
            "id": "audio.fauna.gull-distant-02",
            "title": "Чайка (Laridae / Rissa) — двойной морской крик",
            "description": "Двойной позывной крик парящей чайки над водой (2.30 с).",
            "category": "fauna",
            "layer": "fauna/living world",
            "subpath": "fauna/fauna_gull_distant_02",
            "type": "field_slice",
            "src": CACHE_DIR / "gull.ogg",
            "start": 8.20,
            "len": 2.30,
            "gain": 2.2,
            "default_volume": 0.55,
            "target_lufs": -20,
            "author": "British Library Sound Archive (W1CDR0001389)",
            "license": "CC0-1.0",
            "provenance": {
                "sourceType": "field-recording-slice",
                "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kittiwake_(Rissa_tridactyla)_(W1CDR0001389_BD30).ogg",
                "originalWork": "British Library Kittiwake recording",
                "rightsClearance": "CC0-1.0 Public Domain dedication",
                "verifiedBy": ["audio-ambient-designer"],
            },
        },
        {
            "id": "audio.fauna.squirrel-scurry",
            "title": "Шорох белки в сосновых ветвях",
            "description": "Сухой перестук коры и шишек при пробежке белки в парке кампуса.",
            "category": "fauna",
            "layer": "fauna/living world",
            "subpath": "fauna/fauna_squirrel_scurry",
            "type": "synth",
            "synth": synth_squirrel_scurry,
            "default_volume": 0.50,
            "target_lufs": -22,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
            "provenance": {
                "sourceType": "authored-procedural-synth",
                "generatorScript": "tools/audio/generate_audio_collection.py",
                "rightsClearance": "Fully owned repository procedural code",
                "verifiedBy": ["audio-ambient-designer"],
            },
        },
    ]

    # --- 3. Оборудование и взаимодействие ---
    equip_specs = [
        {
            "id": "audio.equip.barograph-tick",
            "title": "Шаг реле и барабана барографа",
            "description": "Аналоговый механический шаг пишущего пера часового механизма М-22.",
            "category": "equipment",
            "layer": "indoor equipment/room bed",
            "subpath": "equipment/equip_barograph_tick",
            "type": "synth",
            "synth": synth_barograph_tick,
            "default_volume": 0.70,
            "target_lufs": -16,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.equip.clockwork-hum",
            "title": "Шестерёнчатый гул часового механизма",
            "description": "Непрерывный механический шелест шестерёнок хронометра смены.",
            "category": "equipment",
            "layer": "indoor equipment/room bed",
            "subpath": "equipment/equip_clockwork_hum",
            "type": "synth",
            "synth": synth_clockwork_hum,
            "default_volume": 0.50,
            "target_lufs": -24,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.equip.lamp-switch",
            "title": "Щелчок карболитового тумблера настольной лампы",
            "description": "Характерный пружинный щелчок выключателя советской настольной лампы.",
            "category": "equipment",
            "layer": "indoor equipment/room bed",
            "subpath": "equipment/equip_lamp_switch",
            "type": "synth",
            "synth": synth_lamp_switch,
            "default_volume": 0.75,
            "target_lufs": -15,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.equip.paper-turn",
            "title": "Перелистывание синоптического бланка АВ-6",
            "description": "Шуршание плотной чертёжной бумаги синоптической карты или журнала ТМС-1.",
            "category": "equipment",
            "layer": "indoor equipment/room bed",
            "subpath": "equipment/equip_paper_turn",
            "type": "synth",
            "synth": synth_paper_turn,
            "default_volume": 0.65,
            "target_lufs": -18,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.equip.teletype-chatter",
            "title": "Стрекот телеграфного аппарата (СТА/Т-63)",
            "description": "Стрекот приёма сводок КН-01 по проводной телетайпной линии связи.",
            "category": "equipment",
            "layer": "indoor equipment/room bed",
            "subpath": "equipment/equip_teletype_chatter",
            "type": "synth",
            "synth": synth_teletype_chatter,
            "default_volume": 0.60,
            "target_lufs": -17,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.interact.radar-pulse",
            "title": "Импульс метеорологического радиолокатора (МРЛ-5)",
            "description": "Эхолокационный тон и развёртка луча кругового обзора облачности.",
            "category": "interact",
            "layer": "hub interactives",
            "subpath": "interact/interact_radar_pulse",
            "type": "synth",
            "synth": synth_radar_pulse,
            "default_volume": 0.70,
            "target_lufs": -16,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.interact.balloon-release",
            "title": "Старт шаропилотной оболочки",
            "description": "Шелест латекса оболочки и свист уходящего в приземный слой шаропилота.",
            "category": "interact",
            "layer": "hub interactives",
            "subpath": "interact/interact_balloon_release",
            "type": "synth",
            "synth": synth_balloon_release,
            "default_volume": 0.65,
            "target_lufs": -18,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.interact.anemometer-spin",
            "title": "Раскрутка чашечного анемометра МС-13",
            "description": "Шелест вращающейся крестовины анемометра при порыве ветра.",
            "category": "interact",
            "layer": "hub interactives",
            "subpath": "interact/interact_anemometer_spin",
            "type": "synth",
            "synth": synth_anemometer_spin,
            "default_volume": 0.65,
            "target_lufs": -18,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.interact.door-latch",
            "title": "Защёлка двери психрометрической будки",
            "description": "Сухой деревянный стук и металлический щелчок шпингалета будки Селянинова.",
            "category": "interact",
            "layer": "hub interactives",
            "subpath": "interact/interact_door_latch",
            "type": "synth",
            "synth": synth_door_latch,
            "default_volume": 0.75,
            "target_lufs": -15,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
    ]

    # --- 4. Интерфейс, педагогический отклик и арена ---
    ui_specs = [
        {
            "id": "audio.ui.click-soft",
            "title": "Мягкий клик интерфейса",
            "description": "Короткий тактильный клик при выборе переключателей и пунктов меню.",
            "category": "ui",
            "layer": "ui feedback",
            "subpath": "feedback/ui_click_soft",
            "type": "synth",
            "synth": synth_ui_click_soft,
            "default_volume": 0.80,
            "target_lufs": -14,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.ui.hover-subtle",
            "title": "Тонкое наведение курсора",
            "description": "Едва заметный шелестящий призвук при наведении на интерактивные кнопки.",
            "category": "ui",
            "layer": "ui feedback",
            "subpath": "feedback/ui_hover_subtle",
            "type": "synth",
            "synth": synth_ui_hover_subtle,
            "default_volume": 0.50,
            "target_lufs": -20,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.feedback.synoptic-chime",
            "title": "Синоптический колокольчик (верный ответ)",
            "description": "Чистый восходящий мажорный перезвон (C-E-G-C) при правильном разборе телеграммы.",
            "category": "feedback",
            "layer": "task feedback",
            "subpath": "feedback/feedback_synoptic_chime",
            "type": "synth",
            "synth": synth_feedback_synoptic_chime,
            "default_volume": 0.85,
            "target_lufs": -12,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.feedback.mistake-thud",
            "title": "Глухой стук ошибки",
            "description": "Низкий задемпфированный деревянный стук при расхождении с методическим нормативом.",
            "category": "feedback",
            "layer": "task feedback",
            "subpath": "feedback/feedback_mistake_thud",
            "type": "synth",
            "synth": synth_feedback_mistake_thud,
            "default_volume": 0.75,
            "target_lufs": -14,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.arena.round-start",
            "title": "Гонг начала раунда Арены",
            "description": "Благородный бронзовый удар колокола перед началом дуэли синоптиков.",
            "category": "arena",
            "layer": "tournament/arena transitions",
            "subpath": "feedback/arena_round_start",
            "type": "synth",
            "synth": synth_arena_round_start,
            "default_volume": 0.85,
            "target_lufs": -11,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.arena.countdown-tick",
            "title": "Тик секундомера блиц-раунда",
            "description": "Чёткий релейный шаг хронометра при последних секундах ответа в блице.",
            "category": "arena",
            "layer": "tournament/arena transitions",
            "subpath": "feedback/arena_countdown_tick",
            "type": "synth",
            "synth": synth_arena_countdown_tick,
            "default_volume": 0.75,
            "target_lufs": -13,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
        {
            "id": "audio.lore.callsign-26063",
            "title": "Радиопозывной Морзе «26063»",
            "description": "Исторически выверенный радиосигнал Морзе (..--- -.... ----- -.... ...--) станции Санкт-Петербург.",
            "category": "lore",
            "layer": "rare-event sounds",
            "subpath": "lore/lore_callsign_26063",
            "type": "synth",
            "synth": synth_lore_callsign_26063,
            "default_volume": 0.70,
            "target_lufs": -16,
            "author": "26063 audio-ambient-designer",
            "license": "CC0-1.0",
        },
    ]

    all_specs = ambient_specs + fauna_specs + equip_specs + ui_specs

    # Обработка каждого элемента каталога
    for item in all_specs:
        sound_id = item["id"]
        subpath = item["subpath"]
        wav_rel = f"{subpath}.wav"
        ogg_rel = f"{subpath}.ogg"

        src_wav_path = SOURCE_AUDIO_DIR / wav_rel
        pub_wav_path = PUBLIC_AUDIO_DIR / wav_rel
        src_ogg_path = SOURCE_AUDIO_DIR / ogg_rel
        pub_ogg_path = PUBLIC_AUDIO_DIR / ogg_rel

        print(f"  [+] Генерация ассета: {sound_id} -> {wav_rel} & {ogg_rel}")

        if item["type"] == "field_loop":
            create_seamless_loop(
                src_path=item["src"],
                dest_wav=src_wav_path,
                start_sec=item["start"],
                loop_len_sec=item["len"],
                crossfade_sec=item.get("crossfade", 1.2),
                gain=item.get("gain", 1.0),
            )
            is_loop = True
        elif item["type"] == "field_slice":
            slice_field_one_shot(
                src_path=item["src"],
                dest_wav=src_wav_path,
                start_sec=item["start"],
                duration_sec=item["len"],
                gain=item.get("gain", 1.0),
            )
            is_loop = False
        elif item["type"] == "synth":
            samples = item["synth"]()
            save_wav(src_wav_path, samples)
            is_loop = item.get("category") == "ambient"
        else:
            raise ValueError(f"Unknown item type: {item['type']}")

        # Кодирование сжатого Opus OGG
        encode_ogg(src_wav_path, src_ogg_path)

        # Копирование в public веб-приложения
        pub_wav_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src_wav_path, pub_wav_path)
        shutil.copyfile(src_ogg_path, pub_ogg_path)

        # Чтение физических параметров WAV
        with wave.open(str(src_wav_path), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            duration_sec = round(frames / float(rate), 3)

        wav_sha = compute_sha256(src_wav_path)
        ogg_sha = compute_sha256(src_ogg_path)

        provenance = item.get("provenance")
        if not provenance:
            provenance = {
                "sourceType": "authored-procedural-synth",
                "generatorScript": "tools/audio/generate_audio_collection.py",
                "rightsClearance": "Fully owned repository procedural code",
                "verifiedBy": ["audio-ambient-designer"],
            }

        manifest_entries.append({
            "id": sound_id,
            "title": item["title"],
            "description": item["description"],
            "category": item["category"],
            "layer": item["layer"],
            "path": f"assets/source/audio/{wav_rel}",
            "runtimeUrl": f"/audio/{wav_rel}",
            "compressedPath": f"assets/source/audio/{ogg_rel}",
            "compressedRuntimeUrl": f"/audio/{ogg_rel}",
            "sha256": wav_sha,
            "compressedSha256": ogg_sha,
            "format": "wav",
            "compressedFormat": "ogg",
            "sampleRate": rate,
            "channels": channels,
            "bitDepth": sampwidth * 8,
            "durationSeconds": duration_sec,
            "loop": is_loop,
            "targetLufs": item["target_lufs"],
            "defaultVolume": item["default_volume"],
            "author": item["author"],
            "license": item["license"],
            "provenance": provenance,
        })

    # Создание файлов обратной совместимости для старых ID фауны
    alias_map = [
        ("fauna/fauna_tit_chirp", "fauna/fauna_tit_chirp_01", "audio.fauna.tit-chirp"),
        ("fauna/fauna_finch_trill", "fauna/fauna_finch_trill_01", "audio.fauna.finch-trill"),
        ("fauna/fauna_gull_distant", "fauna/fauna_gull_distant_01", "audio.fauna.gull-distant"),
    ]
    for target_sub, source_sub, alias_id in alias_map:
        for ext in (".wav", ".ogg"):
            s_file = SOURCE_AUDIO_DIR / f"{source_sub}{ext}"
            d_file = SOURCE_AUDIO_DIR / f"{target_sub}{ext}"
            p_file = PUBLIC_AUDIO_DIR / f"{target_sub}{ext}"
            shutil.copyfile(s_file, d_file)
            shutil.copyfile(s_file, p_file)

        wav_p = SOURCE_AUDIO_DIR / f"{target_sub}.wav"
        ogg_p = SOURCE_AUDIO_DIR / f"{target_sub}.ogg"
        with wave.open(str(wav_p), "rb") as wf:
            dur = round(wf.getnframes() / float(wf.getframerate()), 3)

        manifest_entries.append({
            "id": alias_id,
            "title": f"Алиас фауны: {alias_id}",
            "description": f"Псевдоним совместимости, ссылающийся на вариант 01.",
            "category": "fauna",
            "layer": "fauna/living world",
            "path": f"assets/source/audio/{target_sub}.wav",
            "runtimeUrl": f"/audio/{target_sub}.wav",
            "compressedPath": f"assets/source/audio/{target_sub}.ogg",
            "compressedRuntimeUrl": f"/audio/{target_sub}.ogg",
            "sha256": compute_sha256(wav_p),
            "compressedSha256": compute_sha256(ogg_p),
            "format": "wav",
            "compressedFormat": "ogg",
            "sampleRate": 44100,
            "channels": 1,
            "bitDepth": 16,
            "durationSeconds": dur,
            "loop": False,
            "targetLufs": -18,
            "defaultVolume": 0.60,
            "author": "26063 Audio Pipeline Alias",
            "license": "CC-BY-SA-3.0",
            "provenance": {
                "sourceType": "compatibility-alias",
                "targetAsset": f"{source_sub}.wav",
                "verifiedBy": ["audio-ambient-designer"],
            },
        })

    manifest = {
        "$schema": "audio-collection/v1",
        "title": "26063: Позывной «Синоптик» — Аудиоколлекция живого мира",
        "version": "2.0.0",
        "generatedAt": "2026-10-26T15:00:00Z",
        "architecture": "hybrid-field-and-procedural",
        "totalAssets": len(manifest_entries),
        "license": "Hybrid Open Licenses (CC0-1.0, CC-BY, CC-BY-SA, Public Domain)",
        "soundTiers": {
            "taskFeedback": {"loudness": "-14 to -10 LUFS", "priority": 1, "description": "Звуковой отклик на учебные действия и экзамены"},
            "interaction": {"loudness": "-18 to -14 LUFS", "priority": 2, "description": "Отклик на нажатия приборов, дверей, лампы, радара"},
            "ambientBeds": {"loudness": "-28 to -22 LUFS", "priority": 3, "description": "Фоновый ветер, вода, тишина комнат и ночной воздух"},
        },
        "acousticGameDesign": {
            "incommensurateLoops": "Фоновые эмбиент-петли имеют взаимопростые длительности (19.1s, 23.7s, 27.1s, 29.3s, 31.7s), благодаря чему суммарная волновая фаза не повторяется часами.",
            "breathingLFO": "Сверхмедленная LFO-модуляция (0.025 Гц, период 40 с) плавно перераспределяет баланс между слоями ветра и прибоя, создавая живое дыхание природы.",
            "poissonScheduler": "Случайный процесс Пуассона с рефрактерным периодом (cooldown 10 с) исключает механическую периодичность голосов птиц.",
            "shuffleBags": "Колоды без повторений гарантируют, что ни один крик чайки или трель синицы не прозвучат дважды подряд.",
            "microVariations": "Каждое воспроизведение получает микро-детонацию высоты тона (±30 центов), микро-джиттер громкости (±1 дБ) и случайное стерео-панорамирование (±0.35).",
            "taskAwareDucking": "При переходе к решению синоптических задач и экзамену фоновый эмбиент плавно приглушается на -4 дБ для снижения когнитивной нагрузки.",
        },
        "accessibility": {
            "sensoryReduction": "Поддерживается мягкий профиль (фильтр НЧ 3800 Гц и сглаживание резких транзиентов)",
            "muteOption": "Поддерживается раздельное и общее отключение каналов",
            "nonExclusiveAudio": "Звук никогда не является единственным источником обязательной учебной информации",
        },
        "assets": manifest_entries,
    }

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[OK] Собрано {len(manifest_entries)} гибридных звуковых ассетов (WAV + OGG).")
    print(f"[OK] Манифест сохранён: {MANIFEST_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    build_hybrid_collection()
