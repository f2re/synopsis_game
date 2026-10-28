# Props LoRA v1 — `synopsis_pixel_prop`

Issue: #59 (`LORA-PROP-001`)  
Implementation owner for artwork: `pixel-asset-designer`  
Tooling owner: `pixel-asset-pipeline-engineer`

This directory defines the first controlled source-generation batch for the props adapter.

## Batch

- 36 independent jobs;
- 24 physical props;
- 8 icons;
- 4 frames;
- 28 train / 8 validation;
- one object or one empty UI element per image;
- exactly one image per job;
- minimum physical long edge: 1024 px;
- neutral light-gray background;
- no smooth upscale, text, logo, collage, flip/recolour/resize clones.

`asset_type` is mandatory on every sample: `physical_prop`, `icon`, or `frame`.

The icon/frame subset is diagnostic. If validation shows UI geometry leaking into generated physical props, icons and frames must be split into a dedicated UI adapter instead of forcing a mixed distribution.

## Commands

```bash
python scripts/validate_props_lora_manifest.py
python scripts/build_props_generation_queue.py --check-only
python scripts/build_props_generation_queue.py --split validation --check-only
python scripts/build_props_generation_queue.py --asset-type physical_prop --check-only
```

To write a backend-neutral JSONL queue:

```bash
python scripts/build_props_generation_queue.py \
  --output artifacts/lora/props_generation_queue.jsonl
```

Every queue row has `num_images: 1`, deterministic seed, output path and lineage metadata.

## Acceptance

A generated image is not a training sample until it has passed independent pixel-quality and art-direction review and has recorded provenance/checksum. Physical meteorological instruments must remain scientifically plausible and must not be converted into decorative UI symbols.
