# Workflow — Art / Living World Acceptance

1. Load fixed references from `design/pixel-art/`, `docs/design/PIXEL_ART_STYLE_GUIDE.md`, `docs/design/COZY_METEO_VIBE_BIBLE.md`, `docs/design/LOCAL_AI_ASSET_PIPELINE_V2.md` and the relevant lore/spec.
2. For portraits also load `docs/design/PORTRAIT_ART_DIRECTION.md` and `config/art-generation-profiles.json`.
3. `art-director` defines/validates composition, palette role, asset class, world-location/solar phase mapping and scene density.
4. For generated assets, produce 4 candidates by default; for key dialogue portraits produce 6. Select by semantic and artistic quality before refinement.
5. Review selected raw and refined side by side. If refinement destroys face, age, expression, glasses, prop, architecture silhouette or another semantic landmark, mark `REFINEMENT_REJECTED`.
6. Review final candidate at native `1×`; `2×`/`4×` are supplementary previews only.
7. For full scenes, recompose static layers and compare with the approved master at the same resolution; unmasked structural differences are blocking.
8. `web-performance-engineer` checks runtime budget/fullscreen behavior; `ux-accessibility-reviewer` checks hierarchy, responsive/projector behavior and reduced motion.
9. Record `ART_ACCEPTED` only when all blocking findings are resolved.

Technical validity is not artistic acceptance. Width/height, alpha, frame-grid, palette size or a successful `tools/assets/check_asset_contract.py` result cannot produce `ART_ACCEPTED`.

## Portrait acceptance

A dialogue portrait is a separate high-detail illustration class, not a large world sprite.

Canonical profile:

```text
256×320 logical px
minimum 192×240
fine pixel clusters
48–96 target colors
strict quantization: off
majority downsampling: forbidden
```

Required portrait review:

- adult proportions for adult NPCs;
- readable age;
- readable eyes, nose and mouth;
- actual facial expression, not symbolic two-pixel emotion;
- stable individual face identity;
- professional rather than toy/mascot appearance;
- fine enough pixel scale to preserve facial planes;
- no oversized round eyes/glasses/head unless character canon explicitly requires it.

The portrait should read first as a living person and second as pixel art.

## Palette policy

Do not reject a portrait merely because it uses more than 16 colors. Current profiles:

- dialogue portrait: 48–96 colors typical, soft ceiling 128;
- profile portrait: 36–72;
- world character: 16–32;
- architecture: 48–96;
- 480×270 scene: 96–192.

These ranges detect likely noise; they are not substitutes for art direction.

## Blocking conditions

`ART_ACCEPTED` MUST NOT be issued when any of the following is true:

- a major adult NPC reads as chibi/kawaii/toy-like;
- dialogue portrait is routed through a 128×128 coarse sprite workflow;
- facial expression is lost after pixel refinement;
- the face is constructed from oversized coarse blocks despite a high-detail portrait spec;
- required semantic features of a building/prop are missing;
- asset is readable only in enlarged preview but not in native `1×`;
- refined output is visibly worse than selected raw;
- the Hub is rendered primarily with schematic placeholders;
- the composed scene no longer matches the approved main-screen reference;
- location labels/debug overlays obscure architecture more than in the approved composition;
- generated result was auto-approved only by technical metrics.
