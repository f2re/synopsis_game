#!/usr/bin/env python3
"""Train the clean 26063 world-style v4 dataset with controlled Z-Image LoRA presets.

The script refuses to silently treat the small checked-in seed set as a mature
training corpus. Use --allow-seed-dataset only for diagnostic A/B/C runs; expand
the dataset to at least 80 distinct compositions before selecting a production
adapter.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

TRIGGER_WORD = "synopsis_world_style"
TRAINER_SHA256 = "a3c801c3586983f41262253185f78c95d84791759f5faf4160a85738497bd042"
MIN_TRAINING_IMAGES = 80

PRESETS = {
    "A": {"rank": 8, "lora_alpha": 4, "learning_rate": 5e-5},
    "B": {"rank": 16, "lora_alpha": 8, "learning_rate": 5e-5},
    "C": {"rank": 16, "lora_alpha": 16, "learning_rate": 1e-4},
}

DEFAULT_VALIDATION = (
    "synopsis_world_style, medium exterior view of a small practical meteorological instrument workshop "
    "inside the Gulf of Finland research campus, granite path, birch and pine, overcast daylight, no text"
)


def _load_dataset(dataset_dir: Path) -> tuple[dict, list[dict]]:
    report_path = dataset_dir / "dataset-report.json"
    metadata_path = dataset_dir / "metadata.jsonl"
    if not report_path.is_file() or not metadata_path.is_file():
        raise ValueError("dataset must contain dataset-report.json and metadata.jsonl from build_style_dataset_v4.py")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report.get("dataset_version") != "world-style-v4" or report.get("trigger_word") != TRIGGER_WORD:
        raise ValueError("not a world-style-v4 dataset")
    rows = [json.loads(line) for line in metadata_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if len(rows) != report.get("images"):
        raise ValueError("metadata row count does not match dataset report")
    if not rows or any(not row.get("text", "").startswith(f"{TRIGGER_WORD}, ") for row in rows):
        raise ValueError("every caption must use only the scoped synopsis_world_style trigger")
    if any("synopsis_pixel_art" in row.get("text", "") for row in rows):
        raise ValueError("legacy mixed trigger leaked into world-style-v4 metadata")
    for row in rows:
        if not (dataset_dir / row["file_name"]).is_file():
            raise ValueError(f"missing training image: {row['file_name']}")
    return report, rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--base-model", type=Path, required=True, help="Complete local Tongyi-MAI/Z-Image base model")
    parser.add_argument("--trainer", type=Path, required=True, help="Pinned official Diffusers v0.41.0 Z-Image trainer")
    parser.add_argument("--preset", choices=sorted(PRESETS), default="B")
    parser.add_argument("--steps", type=int, default=500)
    parser.add_argument("--resolution", type=int, default=1024)
    parser.add_argument("--checkpointing-steps", type=int, default=100)
    parser.add_argument("--validation-prompt", default=DEFAULT_VALIDATION)
    parser.add_argument("--validation-epochs", type=int, default=25)
    parser.add_argument("--seed", type=int, default=26063)
    parser.add_argument("--aspect-ratio-buckets", default=None,
                        help="Optional semicolon-separated height,width buckets; automatic buckets are preferred")
    parser.add_argument("--allow-seed-dataset", action="store_true",
                        help="Permit a diagnostic run with fewer than 80 images")
    args = parser.parse_args()

    if args.steps < 100 or args.resolution < 256 or args.resolution % 16:
        parser.error("steps must be >=100; resolution must be >=256 and divisible by 16")
    if args.checkpointing_steps < 1:
        parser.error("checkpointing-steps must be positive")
    if "turbo" in args.base_model.name.lower() or not (args.base_model / "model_index.json").is_file():
        parser.error("a complete local Z-Image base model, not Turbo, is required")
    if not args.trainer.is_file() or hashlib.sha256(args.trainer.read_bytes()).hexdigest() != TRAINER_SHA256:
        parser.error("trainer must match the pinned official Diffusers v0.41.0 Z-Image script")
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        parser.error("output directory must be empty")

    report, rows = _load_dataset(args.dataset_dir)
    if len(rows) < MIN_TRAINING_IMAGES and not args.allow_seed_dataset:
        parser.error(
            f"world-style-v4 contains only {len(rows)} images; expand to at least {MIN_TRAINING_IMAGES} "
            "distinct compositions or explicitly use --allow-seed-dataset for diagnostics"
        )

    preset = PRESETS[args.preset]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable, "-m", "accelerate.commands.launch", str(args.trainer),
        "--pretrained_model_name_or_path", str(args.base_model),
        "--dataset_name", str(args.dataset_dir.resolve()),
        "--caption_column", "text",
        "--instance_prompt", TRIGGER_WORD,
        "--output_dir", str(args.output_dir),
        "--mixed_precision", "bf16",
        "--gradient_checkpointing",
        "--cache_latents",
        "--offload",
        "--resolution", str(args.resolution),
        "--train_batch_size", "1",
        "--gradient_accumulation_steps", "4",
        "--guidance_scale", "5.0",
        "--learning_rate", str(preset["learning_rate"]),
        "--lr_scheduler", "constant",
        "--lr_warmup_steps", "100",
        "--max_train_steps", str(args.steps),
        "--rank", str(preset["rank"]),
        "--lora_alpha", str(preset["lora_alpha"]),
        "--use_aspect_ratio_buckets",
        "--checkpointing_steps", str(args.checkpointing_steps),
        "--validation_prompt", args.validation_prompt,
        "--validation_epochs", str(args.validation_epochs),
        "--seed", str(args.seed),
        "--report_to", "tensorboard",
    ]
    if args.aspect_ratio_buckets:
        command.extend(["--aspect_ratio_buckets", args.aspect_ratio_buckets])

    run = {
        "status": "running",
        "dataset_version": report["dataset_version"],
        "dataset_images": len(rows),
        "dataset_report_sha256": hashlib.sha256((args.dataset_dir / "dataset-report.json").read_bytes()).hexdigest(),
        "base_model": str(args.base_model),
        "trainer_sha256": TRAINER_SHA256,
        "trigger_word": TRIGGER_WORD,
        "preset": args.preset,
        **preset,
        "steps": args.steps,
        "resolution": args.resolution,
        "checkpointing_steps": args.checkpointing_steps,
        "aspect_ratio_buckets": args.aspect_ratio_buckets or "automatic",
        "validation_prompt": args.validation_prompt,
        "validation_epochs": args.validation_epochs,
        "seed": args.seed,
        "diagnostic_seed_dataset": len(rows) < MIN_TRAINING_IMAGES,
    }
    run_path = args.output_dir / "training-run.json"
    run_path.write_text(json.dumps(run, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    result = subprocess.run(command, check=False)
    weights = args.output_dir / "pytorch_lora_weights.safetensors"
    run["exit_code"] = result.returncode
    run["status"] = "trained_candidate" if result.returncode == 0 and weights.is_file() else "failed"
    if weights.is_file():
        run["weights_sha256"] = hashlib.sha256(weights.read_bytes()).hexdigest()
    run_path.write_text(json.dumps(run, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return 0 if run["status"] == "trained_candidate" else (result.returncode or 1)


if __name__ == "__main__":
    raise SystemExit(main())
