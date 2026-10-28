#!/usr/bin/env python3
"""Generates the fixed world-style acceptance set for every LoRA checkpoint plus a no-LoRA baseline.

Run on the GPU server (comfy-venv) after training, with the generation service stopped:
    python3 eval_world_checkpoints.py --lora-dir .../synopsis_26063_world_v4_B_candidate --out-dir /path/to/eval
Writes <out>/<name>/<prompt>_s<seed>.png and one contact sheet per seed, rows = prompts, columns = checkpoints.
"""
from __future__ import annotations

import argparse
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

    _contact_sheets(eval_set, args.out_dir, [BASELINE, *(name for name, _ in checkpoints)])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
