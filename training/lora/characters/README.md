# Characters LoRA v1 — `synopsis_pixel_char`

Issue: #57 (`LORA-CHAR-001`)  
Implementation owner for artwork: `pixel-asset-designer`  
Tooling owner: `pixel-asset-pipeline-engineer`

This directory defines the first controlled source-generation batch for the characters adapter. The first batch intentionally uses only `render_type=character_reference`; production `portrait_64x64` and `world_sprite_32x48` are not mixed into this training distribution.

## Batch

- 30 independent jobs;
- 20 human references;
- 10 fauna references;
- 23 train / 7 validation;
- exactly one image per job;
- minimum physical long edge: 1024 px;
- no smooth upscale;
- neutral light-gray background only;
- no collage, text, UI or named-game style reference;
- no flip/recolour/resize clones.

The player hero covers the five required poses: `standing_neutral`, `walking`, `pointing`, `cheering`, `thinking`, including front/3/4/profile coverage. Named NPC identity descriptions live in `manifest.v1.json` and must stay aligned with `docs/lore/03_CHARACTERS.md`.

Pascal is explicitly locked as a fluffy ginger-white cat with green eyes and a visible notch at the tip of the left ear.

## Commands

```bash
python scripts/validate_character_lora_manifest.py
python scripts/build_character_generation_queue.py --check-only
python scripts/build_character_generation_queue.py --split validation --check-only
python scripts/build_character_generation_queue.py --kind fauna --check-only
```

To write a backend-neutral JSONL queue:

```bash
python scripts/build_character_generation_queue.py \
  --output artifacts/lora/character_generation_queue.jsonl
```

Every queue row has `num_images: 1`, deterministic seed, output path and lineage metadata.

## Acceptance

A generated image is not a training sample until it has:

1. `PIXEL_ACCEPTED` from `pixel-art-quality-reviewer`;
2. `ART_ACCEPTED` from `art-director`;
3. recorded lineage, checksum and provenance by `pixel-asset-pipeline-engineer`;
4. reproducibility acceptance by `integration-release-engineer`.

Rejected generations are regenerated under a new lineage ID. They are never silently overwritten.
