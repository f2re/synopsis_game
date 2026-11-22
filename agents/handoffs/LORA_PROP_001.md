# Handoff: LORA-PROP-001 — props reference production v1

Issue: #59  
Implementation owner: `pixel-asset-designer`  
Preferred provider: Antigravity/Gemini  
Fallback provider: Codex  
Working branch: `agent/pixel-asset-designer/lora-props-references-v1`

## Read before execution

1. `agents/roles/pixel-asset-designer.md`
2. `docs/lora/DATASET_PROMPTS_AND_GAPS.md`
3. `training/lora/props/manifest.v1.json`
4. `training/lora/props/README.md`
5. `docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md`
6. `docs/design/sprites/SPRITE_MASTER_CATALOG.md`
7. `docs/design/sprites/GENERATION_AND_ARTWORK_RULES.md`

## Execute

```bash
python scripts/validate_props_lora_manifest.py
python scripts/build_props_generation_queue.py --check-only
python scripts/build_props_generation_queue.py \
  --output artifacts/lora/props_generation_queue.jsonl
```

Process jobs sequentially. **One queue row = one generation = one image.** Never combine props into a sheet or generate multiple candidates in one call.

## Type separation

Respect `asset_type` exactly:

- `physical_prop`: real physical object, never a button/badge/frame;
- `icon`: compact icon only, not a physical object and not a framed button;
- `frame`: empty frame only, no icon, label or text inside.

If validation reveals UI geometry leaking into physical props, stop mixed training and split icons/frames into a separate UI adapter.

## Visual invariants

- one consistent logical pixel size;
- hard pixel clusters, nearest-neighbour appearance;
- no antialiasing, smooth gradients or one-pixel noise;
- neutral light-gray background and stable margins;
- no readable text or logo;
- no flip/recolour/resize clones;
- meteorological instruments remain scientifically plausible civilian equipment.

## Candidate output and provenance

Use exact queue `output_path`/`lineage_id`. Record job ID, seed, prompts, model/version, SHA-256, path, lineage, timestamp and status.

Rejected candidate is not overwritten; regeneration gets new lineage/output suffix.

## Acceptance

1. `pixel-art-quality-reviewer` → technical pixel-art gate;
2. `art-director` → object-language/style gate;
3. `pixel-asset-pipeline-engineer` → provenance and manifest gate;
4. `integration-release-engineer` → reproducibility gate.

Only fully accepted candidates may enter a training-run manifest.
