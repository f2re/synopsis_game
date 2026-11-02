# BATCH-29 — Hub production runbook

Purpose: единый порядок производства первого экрана. Это не один image prompt; это orchestration contract для batch-файлов 12–28.

## Stage 0 — geometry lock

1. Generate and accept `BATCH-12 / JOB 12-10` as the visual composite target.
2. Freeze camera/horizon/safe-zone as `hub.geometry.lock_v1`.
3. Reject any later asset that requires moving architecture or non-uniform X/Y scaling.

Gate: Art Director + pixel-art quality review.

## Stage 1 — static scene skeleton

Generate/accept:
- BATCH-12 background layers;
- BATCH-13 architecture full-canvas aligned layers;
- BATCH-23 core occlusion layers.

Required proof: all layers stack at `(0,0)` and reproduce the accepted master composition without CSS offsets.

## Stage 2 — foreground/gameplay readability

Generate/accept:
- BATCH-14 foreground/gameplay objects;
- BATCH-27 optional environmental props;
- BATCH-25 interaction states.

Gate: at least seven campus zones recognizable with labels hidden.

## Stage 3 — living world

Generate/accept:
- BATCH-08 ambient fauna/props;
- BATCH-09 character motion;
- BATCH-20 scientific instrument animation;
- BATCH-21 water/sky motion;
- BATCH-22 building activity.

Gate: idle Hub shows at least three independent calm motions and 2–4 living entities without distracting from CTA.

## Stage 4 — environment states

Generate/accept:
- BATCH-16 seasons;
- BATCH-17 weather;
- BATCH-18 day phases.

All are edits/overlays relative to `hub.geometry.lock_v1`. Never regenerate architecture for a season/weather/day state.

## Stage 5 — rare events

Generate BATCH-28 only after the base living Hub passes. Rare events must remain optional and suppressible.

## Stage 6 — UI and fullscreen

Use accepted BATCH-15 UI chrome. Verify BATCH-24 responsive crops. Runtime policy:
- scene fills `100vw × 100vh`;
- uniform `cover` scaling only;
- no independent X/Y stretch;
- critical architecture remains in central safe-zone;
- UI stays DOM/React unless explicitly assigned to Phaser.

## Stage 7 — final QA

Run:
- BATCH-19 state-combination QA;
- BATCH-26 final assembly QA.

PASS requires:
1. geometry drift <=2 logical px across all seasonal/weather/day composites;
2. no black/empty margins on supported viewports;
3. foreground occlusion works on at least three routes;
4. seven campus zones recognizable with text hidden;
5. no fake meteorological data baked into art;
6. reduced-motion remains complete and readable;
7. no runtime path references candidate/rejected assets;
8. all accepted assets have semantic ID, source path, logical size, anchor/pivot, provenance and acceptance status.

## Generation discipline

For every numbered image job:
- send only one job to the generator;
- request exactly one image;
- if the generator returns a collage/contact sheet/multiple variants, reject it immediately;
- never split a collage into production assets;
- image edits must use the accepted reference image for identity/geometry preservation;
- generated PNG is a candidate until pixel cleanup + independent review.

## Recommended immediate sequence

`12-10 -> 12-01..09 -> 13-01..10 -> 23-01..10 -> 14-01..10 -> 09-01..10 -> 20-01..10 -> 21-01..10 -> 22-01..10 -> 16/17/18 -> 24 -> 25 -> 19/26 -> 27/28`
