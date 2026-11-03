# Handoff: LORA-HUB-EXEC-001 — execute 30 hub reference jobs

Issue: #61  
Implementation owner: `pixel-asset-pipeline-engineer`  
Art contributor: `pixel-asset-designer`  
Preferred providers: Codex for queue/provenance; Antigravity/Gemini for image generation  
Working branch: `agent/pixel-asset-pipeline/hub-generation-batch-v1`

## Read before execution

1. `training/lora/hub/manifest.v1.json`
2. `training/lora/hub/README.md`
3. `training/lora/execution.schema.json`
4. `docs/lora/DATASET_PROMPTS_AND_GAPS.md`
5. `docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md`
6. `docs/BRAND_AND_LORE_26063.md`
7. `agents/roles/pixel-asset-pipeline-engineer.md`
8. `agents/roles/pixel-asset-designer.md`
9. `agents/roles/art-director.md`

## Build the canonical queue and ledger

```bash
python scripts/validate_hub_lora_manifest.py
python scripts/build_hub_generation_queue.py --check-only
python scripts/build_hub_generation_queue.py \
  --output artifacts/lora/hub_generation_queue.jsonl
python scripts/init_lora_execution_ledger.py --check-only
python scripts/init_lora_execution_ledger.py \
  --output artifacts/lora/hub_execution_ledger.json
python scripts/validate_lora_execution_ledger.py \
  artifacts/lora/hub_execution_ledger.json
```

Expected: exactly 30 independent one-image jobs, 20 train and 10 validation. The initialized ledger has 30 `pending` jobs and pins both the source manifest and queue-builder SHA-256.

## Generation rule

**One queue row = one generation call = one image.**

Never request a contact sheet, collage, multi-candidate grid or `n>1`. A failed image is recorded as rejected and a replacement uses a new lineage and output path rather than overwriting the candidate.

## Mandatory visual invariants

- logical world contract 480×270 with one consistent logical pixel size;
- physical long edge >= 1024 for new renders;
- hard square pixel clusters and nearest-neighbour appearance;
- no smooth upscale, antialiasing or mixed pixel scale;
- compact practical Northwestern meteorological campus;
- low Gulf/Baltic horizon; granite, birch, pine, rowan where applicable;
- no palace architecture, ceremonial domes, colonnades, military styling, alpine mountains or repeated title signage;
- no text, logo or UI;
- weather/time/season must be visually expressed as independent variables, not simple recolour copies.

## Provenance ledger

For every generated attempt append to the matching job:

- attempt ID and a unique lineage ID;
- seed and unique output path;
- SHA-256 of the exact prompt and negative prompt used;
- generator provider/model/version;
- PNG SHA-256;
- generation timestamp;
- gate states and explicit reject reasons when applicable.

The ledger validator enforces:

- first attempt uses canonical manifest lineage/output/seed;
- regenerations use a new lineage and output path;
- no duplicate attempt lineage/output anywhere in the ledger;
- `accepted` is impossible without PNG checksum and all three gates accepted;
- rejected attempts retain reasons instead of being erased;
- manifest and queue-builder hashes still match the files used to plan the batch.

## Gates

1. `pixel-art-quality-reviewer` → `PIXEL_ACCEPTED` or explicit reject reasons;
2. `art-director` → `ART_ACCEPTED` or explicit LOR/composition reject reasons;
3. pipeline owner records final checksum/provenance only after both art gates;
4. `integration-release-engineer` verifies deterministic job/output mapping.

Do not create a training-run manifest from unaccepted candidates.
