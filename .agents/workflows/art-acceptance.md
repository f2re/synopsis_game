# Workflow — Art / Living World Acceptance

1. Load fixed references from `design/pixel-art/`, `docs/design/PIXEL_ART_STYLE_GUIDE.md`, `docs/design/COZY_METEO_VIBE_BIBLE.md`, `docs/design/LOCAL_AI_ASSET_PIPELINE_V2.md` and the relevant lore/spec.
2. `art-director` defines/validates composition, palette role, sprite scale, world-location/solar phase mapping and scene density.
3. For generated assets, produce 4 candidates by default (6 for major characters), then select one by semantic/artistic quality before pixel refinement.
4. Review selected/raw and refined result side by side. If refinement destroys face, age, glasses, prop, architecture silhouette or another semantic landmark, mark `REFINEMENT_REJECTED`.
5. Review final candidate at `1×`; `2×`/`4×` are supplementary previews only.
6. For full scenes, recompose static layers and compare with the approved master at the same resolution; unmasked structural differences are blocking.
7. `web-performance-engineer` checks runtime budget/fullscreen behavior; `ux-accessibility-reviewer` checks hierarchy, responsive/projector behavior and reduced motion.
8. Record `ART_ACCEPTED` only when all blocking findings are resolved.

Technical validity is not artistic acceptance. Width/height, alpha, frame-grid, palette size or a successful `tools/assets/check_asset_contract.py` result cannot produce `ART_ACCEPTED`.

## Palette policy

Do not reject a portrait merely because it uses more than 16 colors. Use class-specific palette families and working ranges from `LOCAL_AI_ASSET_PIPELINE_V2.md`:

- portrait: 24–40 colors typical;
- world character: 16–28;
- architecture: 32–56;
- 480×270 scene: 48–96.

These ranges detect likely noise; they are not a substitute for art direction.

## Blocking conditions

`ART_ACCEPTED` MUST NOT be issued when any of the following is true:

- a major NPC reads as chibi/kawaii/toy-like instead of the intended adult professional;
- required semantic features of a building/prop are missing;
- asset is readable only in enlarged preview but not in `1×`;
- refined output is visibly worse than selected raw;
- the Hub is rendered primarily with schematic placeholders;
- the composed scene no longer matches the approved main-screen reference;
- location labels/debug overlays obscure architecture more than in the approved composition;
- generated result was auto-approved only by technical metrics.
