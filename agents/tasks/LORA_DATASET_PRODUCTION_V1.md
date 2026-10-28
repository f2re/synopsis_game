# LORA_DATASET_PRODUCTION_V1 — agent delegation and execution order

Status: active  
Parent contract: `docs/lora/DATASET_PROMPTS_AND_GAPS.md`

This packet records implementation ownership for the first production pass of the three LoRA datasets. It does not replace `agents/registry.yaml`; it instantiates that registry for the current work.

| Work packet | GitHub issue | Implementation owner | Preferred provider | Required independent gates |
|---|---:|---|---|---|
| Character reference art | #57 `LORA-CHAR-001` | `pixel-asset-designer` | Antigravity/Gemini | `pixel-art-quality-reviewer`, `art-director`, pipeline/release checks |
| Props reference art | #59 `LORA-PROP-001` | `pixel-asset-designer` | Antigravity/Gemini | `pixel-art-quality-reviewer`, `art-director`, pipeline/release checks |
| Character/props manifests and queues | #60 `LORA-PIPE-001` | `pixel-asset-pipeline-engineer` | Codex | `pixel-asset-designer`, `art-director`, `integration-release-engineer` |
| Execute 30 hub jobs | #61 `LORA-HUB-EXEC-001` | `pixel-asset-pipeline-engineer` | Codex + Antigravity/Gemini art contributor | `pixel-art-quality-reviewer`, `art-director`, `integration-release-engineer` |

## Branches

- `agent/pixel-asset-designer/lora-character-references-v1`
- `agent/pixel-asset-designer/lora-props-references-v1`
- `agent/pixel-asset-pipeline/lora-dataset-tooling-v1`
- `agent/pixel-asset-pipeline/hub-generation-batch-v1`

## Execution order

1. Merge #60 tooling so queues and validation contracts are reproducible.
2. Character and props art agents generate against the merged manifests, one job at a time.
3. Hub execution agent builds the existing hub queue and records generation/provenance state without auto-acceptance.
4. `pixel-art-quality-reviewer` performs the first independent gate.
5. `art-director` performs the LOR/composition gate.
6. Only accepted images enter training-run manifests.
7. `integration-release-engineer` verifies deterministic job-to-output mapping and dataset reproducibility before training.

## Non-negotiable rules

- one prompt = one image;
- one implementation owner per work packet;
- no self-approval;
- no collage/contact sheet as a training source;
- no named commercial game style references;
- no smooth upscale or mixed logical pixel size;
- no silent overwrite of rejected generation: regenerate under new lineage;
- generated output is candidate material, not source-of-truth, until acceptance gates pass.
