#!/usr/bin/env python3
"""Generates the fixed world-style acceptance set for every LoRA checkpoint plus a no-LoRA baseline.

Run on the GPU server (comfy-venv) after training, with the generation service stopped:
    python3 eval_world_checkpoints.py --lora-dir .../synopsis_26063_world_v4_B_candidate --out-dir /path/to/eval
Writes <out>/<name>/<prompt>_s<seed>.png, one contact sheet per seed (rows = prompts, columns = checkpoints) and
scorecard.csv with the automatic metrics; the 0-5 manual columns are for the art director.
"""
from __future__ import annotations

import argparse
import csv
import itertools
import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

TRIGGER = "synopsis_world_style"
BASELINE = "baseline"
DEFAULT_PROMPTS = Path(__file__).resolve().parents[1] / "config" / "world_eval_prompts.json"
CHECKPOINT_PATTERN = re.compile(r"^checkpoint-(\d+)$")
STEPS = 30
GUIDANCE = 4.0

log = logging.getLogger("world-eval")


@dataclass(frozen=True)
class EvalSet:
    prompts: tuple[tuple[str, str], ...]  # (id, text)
    seeds: tuple[int, ...]
    negative_prompt: str
    width: int
    height: int


def load_eval_set(path: Path) -> EvalSet:
    data = json.loads(path.read_text(encoding="utf-8"))
    prompts = tuple((item["id"], item["text"]) for item in data["prompts"])
    if len({prompt_id for prompt_id, _ in prompts}) != len(prompts):
        raise ValueError("duplicate prompt id in the eval set")
    if data["width"] % 16 or data["height"] % 16:
        raise ValueError("width and height must be multiples of 16")
    return EvalSet(prompts, tuple(data["seeds"]), data["negative_prompt"], data["width"], data["height"])


def find_checkpoints(lora_dir: Path) -> list[tuple[str, Path]]:
    """Checkpoint folders sorted by step, then the final weights; each must hold pytorch_lora_weights.safetensors."""
    found: list[tuple[int, str, Path]] = []
    for child in lora_dir.iterdir():
        match = CHECKPOINT_PATTERN.match(child.name)
        if match and (child / "pytorch_lora_weights.safetensors").is_file():
            found.append((int(match.group(1)), child.name, child))
    result = [(name, path) for _, name, path in sorted(found)]
    if (lora_dir / "pytorch_lora_weights.safetensors").is_file():
        result.append(("final", lora_dir))
    return result


def _generate(pipe: Any, eval_set: EvalSet, out_dir: Path, *, with_trigger: bool) -> None:
    import torch

    out_dir.mkdir(parents=True, exist_ok=True)
    for prompt_id, text in eval_set.prompts:
        for seed in eval_set.seeds:
            target = out_dir / f"{prompt_id}_s{seed}.png"
            if target.is_file():
                continue
            image = pipe(
                prompt=f"{TRIGGER}, {text}" if with_trigger else text,
                negative_prompt=eval_set.negative_prompt,
                num_inference_steps=STEPS,
                guidance_scale=GUIDANCE,
                width=eval_set.width,
                height=eval_set.height,
                generator=torch.Generator(device="cuda:0").manual_seed(seed),
            ).images[0]
            image.save(target)
            log.info("wrote %s", target)


MANUAL_CRITERIA = ("style_fidelity", "prompt_adherence", "composition_novelty", "weather_transfer", "interior_leakage")
THUMB_SIZE = (32, 18)


def _thumb(path: Path) -> Any:
    """Zero-mean, unit-variance grayscale thumbnail used for a cheap composition similarity."""
    import numpy as np
    from PIL import Image

    arr = np.asarray(Image.open(path).convert("L").resize(THUMB_SIZE), dtype=float).ravel()
    return (arr - arr.mean()) / (arr.std() or 1.0)


def composition_similarity(a: Path, b: Path) -> float:
    """Correlation of two coarse luminance layouts: 1.0 is the same composition, near 0 unrelated."""
    return float((_thumb(a) * _thumb(b)).mean())


def automatic_metrics(eval_set: EvalSet, checkpoint_dir: Path) -> dict[str, float]:
    """seed_diversity: 1 - similarity of the two seeds of one prompt (higher is more varied);
    cross_prompt_similarity: similarity between different prompts at one seed (high means one stock composition)."""
    seed_pairs = []
    for prompt_id, _ in eval_set.prompts:
        for first, second in itertools.combinations(eval_set.seeds, 2):
            seed_pairs.append(1.0 - composition_similarity(
                checkpoint_dir / f"{prompt_id}_s{first}.png", checkpoint_dir / f"{prompt_id}_s{second}.png"))
    prompt_pairs = []
    for seed in eval_set.seeds:
        for (id_a, _), (id_b, _) in itertools.combinations(eval_set.prompts, 2):
            prompt_pairs.append(composition_similarity(
                checkpoint_dir / f"{id_a}_s{seed}.png", checkpoint_dir / f"{id_b}_s{seed}.png"))
    return {
        "seed_diversity": sum(seed_pairs) / len(seed_pairs) if seed_pairs else 0.0,
        "cross_prompt_similarity": sum(prompt_pairs) / len(prompt_pairs) if prompt_pairs else 0.0,
    }


def write_scorecard(eval_set: EvalSet, out_dir: Path, names: list[str]) -> Path:
    """scorecard.csv: automatic metrics filled in, manual 0-5 columns left empty for the art director."""
    path = out_dir / "scorecard.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["checkpoint", "seed_diversity", "cross_prompt_similarity", *MANUAL_CRITERIA, "notes"])
        for name in names:
            auto = automatic_metrics(eval_set, out_dir / name)
            writer.writerow([name, f"{auto['seed_diversity']:.3f}", f"{auto['cross_prompt_similarity']:.3f}",
                             *[""] * len(MANUAL_CRITERIA), ""])
    return path


def _contact_sheets(eval_set: EvalSet, out_dir: Path, names: list[str]) -> None:
    from PIL import Image, ImageDraw

    cell_w, cell_h = 480, 270
    for seed in eval_set.seeds:
        sheet = Image.new("RGB", (cell_w * len(names), (cell_h + 18) * len(eval_set.prompts)), (16, 16, 16))
        draw = ImageDraw.Draw(sheet)
        for row, (prompt_id, _) in enumerate(eval_set.prompts):
            for col, name in enumerate(names):
                path = out_dir / name / f"{prompt_id}_s{seed}.png"
                x, y = col * cell_w, row * (cell_h + 18)
                draw.text((x + 4, y + 3), f"{prompt_id} | {name}", fill=(255, 255, 0))
                if path.is_file():
                    sheet.paste(Image.open(path).convert("RGB").resize((cell_w, cell_h)), (x, y + 18))
        sheet.save(out_dir / f"sheet_seed{seed}.png")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lora-dir", type=Path, required=True)
    parser.add_argument("--base-model", type=Path, default=Path("/home/user/synopsis-ai/models/diffusers/Z-Image"))
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--prompts", type=Path, default=DEFAULT_PROMPTS)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    import torch
    from diffusers import ZImagePipeline

    eval_set = load_eval_set(args.prompts)
    checkpoints = find_checkpoints(args.lora_dir)
    if not checkpoints:
        parser.error(f"no checkpoints or final weights in {args.lora_dir}")

    pipe = ZImagePipeline.from_pretrained(str(args.base_model), torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload(gpu_id=0)

    _generate(pipe, eval_set, args.out_dir / BASELINE, with_trigger=False)
    for name, path in checkpoints:
        pipe.load_lora_weights(str(path), adapter_name="world")
        _generate(pipe, eval_set, args.out_dir / name, with_trigger=True)
        pipe.unload_lora_weights()

    names = [BASELINE, *(name for name, _ in checkpoints)]
    _contact_sheets(eval_set, args.out_dir, names)
    log.info("scorecard: %s", write_scorecard(eval_set, args.out_dir, names))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
