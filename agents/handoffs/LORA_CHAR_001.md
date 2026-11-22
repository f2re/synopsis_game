# Handoff: LORA-CHAR-001 — character reference production v1

Issue: #57  
Implementation owner: `pixel-asset-designer`  
Preferred provider: Antigravity/Gemini  
Fallback provider: Codex  
Working branch: `agent/pixel-asset-designer/lora-character-references-v1`

## Read before execution

1. `agents/roles/pixel-asset-designer.md`
2. `docs/lora/DATASET_PROMPTS_AND_GAPS.md`
3. `training/lora/characters/manifest.v1.json`
4. `training/lora/characters/README.md`
5. `docs/lore/03_CHARACTERS.md`
6. `docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md`
7. `docs/design/sprites/AVATAR_CHARACTER_SYSTEM.md`
8. `docs/design/sprites/GENERATION_AND_ARTWORK_RULES.md`

## Execute

Validate first:

```bash
python scripts/validate_character_lora_manifest.py
python scripts/build_character_generation_queue.py --check-only
```

Build the queue when the generation backend is ready:

```bash
python scripts/build_character_generation_queue.py \
  --output artifacts/lora/character_generation_queue.jsonl
```

Process jobs sequentially. **One queue row = one generation = one image.** Never combine rows into a collage/contact sheet or request multiple candidates in a single generation call.

## Visual invariants

- one consistent logical pixel size in the whole image;
- hard square clusters, nearest-neighbour appearance;
- no antialiasing, painterly gradients or random one-pixel noise;
- neutral light-gray background;
- no text, logo, UI or decorative studio set;
- preserve asymmetric hair/clothing/markings; do not mirror to fake opposite direction;
- named NPCs must match `docs/lore/03_CHARACTERS.md`;
- Pascal must remain ginger-white with green eyes and a clearly visible notch on the LEFT ear.

## Candidate output

Use the exact `output_path` and `lineage_id` from the queue. Record for every generated candidate:

- job ID;
- seed;
- prompt and negative prompt;
- generator/model/version;
- output path;
- SHA-256;
- source lineage;
- generation timestamp;
- status: `candidate`, `rejected`, or `accepted`.

A rejected candidate is never overwritten. Regeneration receives a new lineage ID and new output path suffix.

## Handoff to gates

Do not mark a file as training data. Submit candidates to:

1. `pixel-art-quality-reviewer` → `PIXEL_ACCEPTED` / reject with defects;
2. `art-director` → `ART_ACCEPTED` / reject with LOR/style defects;
3. `pixel-asset-pipeline-engineer` → provenance/checksum/manifest verification;
4. `integration-release-engineer` → reproducibility verification.

Only candidates passing all required gates can be referenced by a training-run manifest.
