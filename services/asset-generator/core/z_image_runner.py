from __future__ import annotations

import argparse
import os
import subprocess
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

MODEL_DIR = Path("/home/user/synopsis-ai/models/diffusers/Z-Image-Turbo")
STYLE_BASE_DIR = Path("/home/user/synopsis-ai/models/diffusers/Z-Image")
STYLE_LORA_DIR = Path("/home/user/synopsis-ai/models/loras/synopsis_26063_style_v1_candidate")
STYLE_TRIGGER = "synopsis_pixel_art"
COMFY_PYTHON = Path("/home/user/synopsis-ai/comfy-venv/bin/python3")

_pipeline = None  # Turbo
_style_pipeline = None  # Base + style LoRA

BACKEND_NAMES = {"turbo": "z_image_turbo", "style": "z_image_style"}


@dataclass(frozen=True)
class ModeSpec:
    """One way of running Z-Image: model, optional style LoRA and sampler settings."""

    model_dir: Path
    lora_dir: Path | None
    steps: int
    guidance: float
    trigger: str


# Turbo is distilled without classifier-free guidance, so it ignores negative prompts and the style
# LoRA barely moves it. The style mode runs the Base model the LoRA was trained on, with real CFG.
MODES: dict[str, ModeSpec] = {
    "turbo": ModeSpec(MODEL_DIR, None, 9, 0.0, ""),
    "style": ModeSpec(STYLE_BASE_DIR, STYLE_LORA_DIR, 30, 4.0, STYLE_TRIGGER),
}


def is_z_image_available(mode: str = "turbo") -> bool:
    """Checks whether the weights a mode needs (model and, for style, the LoRA) are on disk."""
    spec = MODES[mode]
    transformer_dir = spec.model_dir / "transformer"
    if not (transformer_dir.is_dir() and any(transformer_dir.glob("*.safetensors"))):
        return False
    return spec.lora_dir is None or (spec.lora_dir / "pytorch_lora_weights.safetensors").is_file()


def resolve_mode(backend: str) -> str | None:
    """Maps a requested backend to a runnable mode; explicit backends never switch silently."""
    if backend == "auto":
        return next((m for m in ("style", "turbo") if is_z_image_available(m)), None)
    wanted = {"z_image_style": "style", "z_image": "turbo", "z_image_turbo": "turbo"}.get(backend)
    return wanted if wanted and is_z_image_available(wanted) else None


def _comfy_command(
    prompt: str,
    output_paths: Sequence[Path],
    width: int,
    height: int,
    seeds: Sequence[int],
    steps: int,
    negative_prompt: str,
    mode: str,
) -> list[str]:
    """Command line for a comfy-venv worker that generates every output in one process."""
    return [
        str(COMFY_PYTHON),
        str(Path(__file__).resolve()),
        "--prompt", prompt,
        "--negative-prompt", negative_prompt,
        "--outputs", *map(str, output_paths),
        "--seeds", *map(str, seeds),
        "--width", str(width),
        "--height", str(height),
        "--steps", str(steps),
        "--mode", mode,
    ]


def _run_in_comfy_env(
    prompt: str,
    output_paths: Sequence[Path],
    width: int,
    height: int,
    seeds: Sequence[int],
    steps: int,
    negative_prompt: str,
    mode: str,
) -> int:
    """Delegates inference to comfy-venv (PyTorch CUDA and diffusers); returns how many files exist."""
    cmd = _comfy_command(prompt, output_paths, width, height, seeds, steps, negative_prompt, mode)
    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as err:
        print(f"Subprocess generation failed: {err.stderr}", file=sys.stderr)
    return sum(1 for path in output_paths if path.is_file())


def _get_pipeline(mode: str) -> Any:
    """Builds (once per process) the diffusers pipeline for a mode, with the style LoRA if it has one."""
    import torch
    from diffusers import ZImagePipeline

    global _pipeline, _style_pipeline
    current = _style_pipeline if mode == "style" else _pipeline
    if current is not None:
        return current
    spec = MODES[mode]
    pipe = ZImagePipeline.from_pretrained(str(spec.model_dir), torch_dtype=torch.bfloat16)
    if spec.lora_dir is not None:
        pipe.load_lora_weights(str(spec.lora_dir))
    if os.environ.get("Z_IMAGE_CPU_OFFLOAD", "1") == "1":
        pipe.enable_model_cpu_offload(gpu_id=0)
    else:
        pipe.to("cuda:0")
    if mode == "style":
        _style_pipeline = pipe
    else:
        _pipeline = pipe
    return pipe


def _generation_size(width: int, height: int) -> tuple[int, int]:
    """High-res generation size with the target aspect ratio, aligned to 16px multiples."""
    raw_w = raw_h = 1024
    aspect = width / float(height)
    if aspect > 1.0:
        raw_h = max(128, int(raw_w / aspect))
    elif aspect < 1.0:
        raw_w = max(128, int(raw_h * aspect))
    return max(128, (raw_w // 16) * 16), max(128, (raw_h // 16) * 16)


def generate_z_image_batch(
    prompt: str,
    output_paths: Sequence[Path],
    width: int,
    height: int,
    seeds: Sequence[int],
    negative_prompt: str = "",
    mode: str = "turbo",
    steps: int | None = None,
) -> int:
    """Generates one image per output path with a single model load; returns how many were written."""
    if not output_paths or not is_z_image_available(mode):
        return 0
    spec = MODES[mode]
    steps = steps if steps is not None else spec.steps
    try:
        import torch  # noqa: F401
        from diffusers import ZImagePipeline  # noqa: F401
    except ImportError:
        # mcp-venv has no torch: delegate the whole batch to comfy-venv.
        return _run_in_comfy_env(prompt, output_paths, width, height, seeds, steps, negative_prompt, mode)

    import torch

    pipe = _get_pipeline(mode)
    gen_w, gen_h = _generation_size(width, height)
    text = f"{spec.trigger}, {prompt}" if spec.trigger else prompt
    written = 0
    for path, seed in zip(output_paths, seeds):
        kwargs: dict[str, Any] = {
            "prompt": text,
            "num_inference_steps": steps,
            "generator": torch.Generator(device="cuda:0").manual_seed(seed),
            "height": gen_h,
            "width": gen_w,
            "guidance_scale": spec.guidance,
        }
        if spec.guidance > 1.0 and negative_prompt:
            kwargs["negative_prompt"] = negative_prompt
        try:
            image = pipe(**kwargs).images[0]
            if image.size != (gen_w, gen_h):
                from PIL import Image
                image = image.resize((gen_w, gen_h), Image.LANCZOS)
            path.parent.mkdir(parents=True, exist_ok=True)
            image.save(path)
            written += 1
        except Exception as exc:
            print(f"Error during Z-Image generation ({mode}): {exc}", file=sys.stderr)
            break
    return written


def generate_z_image_candidate(
    prompt: str,
    output_path: Path,
    width: int = 256,
    height: int = 256,
    seed: int | None = None,
    steps: int | None = None,
    negative_prompt: str = "",
    mode: str = "turbo",
) -> bool:
    """Generates a single candidate; Turbo unless ``mode='style'`` asks for Base + LoRA."""
    seed_val = seed if seed is not None else 26063
    return generate_z_image_batch(
        prompt, [output_path], width, height, [seed_val], negative_prompt, mode, steps) == 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Z-Image inference worker")
    parser.add_argument("--prompt", required=True, help="Generation prompt")
    parser.add_argument("--negative-prompt", default="", help="Negative prompt")
    parser.add_argument("--outputs", nargs="+", required=True, help="Output PNG paths")
    parser.add_argument("--seeds", nargs="+", type=int, required=True, help="One seed per output")
    parser.add_argument("--width", type=int, default=256, help="Logical width")
    parser.add_argument("--height", type=int, default=256, help="Logical height")
    parser.add_argument("--steps", type=int, default=None, help="Inference scheduler steps")
    parser.add_argument("--mode", choices=sorted(MODES), default="turbo")
    args = parser.parse_args()
    if len(args.outputs) != len(args.seeds):
        parser.error("--outputs and --seeds must have the same length")

    done = generate_z_image_batch(
        args.prompt, [Path(p) for p in args.outputs], args.width, args.height, args.seeds,
        args.negative_prompt, args.mode, args.steps)
    return 0 if done == len(args.outputs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
