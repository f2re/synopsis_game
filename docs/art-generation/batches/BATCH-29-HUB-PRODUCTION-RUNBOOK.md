# BATCH-29 — Hub production runbook

**TYPE: QA/ORCHESTRATION — NOT AN IMAGE GENERATION PROMPT.**

Purpose: единый порядок производства первого экрана Hub. Этот файл не отправляется генератору изображений. Он определяет зависимости, последовательность, роли, доказательства приёмки и запреты для `BATCH-12…28`.

This runbook follows `PROMPT-AUTHORING-STANDARD.md` and exists specifically to prevent generation drift, accidental redesign and prompt degeneration.

## 0. Non-negotiable invariants

Before any generation starts, all operators and agents must accept these invariants:

1. `hub.geometry.lock_v1` is the sole authority for camera, horizon, waterline, architecture placement, path/plaza geometry and critical safe-zone.
2. Canonical logical scene canvas is `640×360`, origin `(0,0)`.
3. Full-scene edit/overlay layers are never trimmed.
4. Fullscreen runtime uses uniform `cover`; independent X/Y stretching is forbidden.
5. Season/weather/day-phase are edits/overlays, not new Hub redraws.
6. One image-generation JOB = one generation call = one image file.
7. Contact sheets, sprite sheets, grids, collages and multi-option boards are rejected immediately.
8. AI output is always a candidate until pixel cleanup + manifest registration + independent technical/art acceptance.
9. Runtime does not reference `candidate_*`, rejected or ad-hoc generated files.
10. No prompt may silently override an accepted pivot, scale, building footprint or safe-zone.

## 1. Required references before production

The production folder must contain or point to:

- accepted `hub.geometry.lock_v1` image;
- accepted Hub style reference;
- `PROMPT-AUTHORING-STANDARD.md`;
- BATCH-12…28 prompt files;
- current semantic asset manifest schema;
- approved logical canvas/pivot conventions;
- current Hub runtime layer order.

If `hub.geometry.lock_v1` is not yet accepted, **stop**. Do not mass-generate architecture, seasons or weather.

## 2. Roles and approval ownership

Implementation/generation owner: `pixel-asset-designer` unless a batch explicitly belongs to another role.

Independent checks:
- `pixel-art-quality-reviewer`: grid, clusters, alpha, pivot, frame consistency, anti-collage compliance;
- `art-director`: composition, atmosphere, palette, style coherence, building recognizability;
- `pixel-asset-pipeline-engineer`: full-canvas alignment, manifest, source/generated separation, deterministic build;
- `game-runtime-webgl-engineer`: layer order, depth, texture/pivot integration, nearest-neighbour rendering;
- `web-performance-engineer`: animation/state budget and degradation modes;
- `ux-accessibility-reviewer`: UI-safe composition, projector/mobile readability, reduced motion.

No generation owner self-approves a gated production asset.

## 3. Stage 0 — geometry lock

### Input
`BATCH-12 / JOB 12-10` composite target plus current approved Hub references.

### Procedure
1. Generate exactly one 12-10 candidate.
2. Review camera, horizon, architecture grouping, safe-zone, foreground depth and fullscreen suitability.
3. Reject and regenerate until one candidate is accepted.
4. Assign semantic authority name `hub.geometry.lock_v1`.
5. Record checksum/provenance and immutable geometry notes.

### Gate
Art Director + pixel-art quality reviewer.

### Evidence required
- accepted reference image;
- declared 640×360 canvas;
- documented horizon/safe-zone/building coordinates;
- no black margins in baseline 16:9;
- no UI/text baked into geometry master.

No later job may “fix” geometry independently.

## 4. Stage 1 — static scene skeleton

### Generate
- BATCH-12 background layers;
- BATCH-13 architecture aligned full-canvas layers;
- BATCH-23 depth/occlusion layers required by the static composition.

### Procedure
Every full-scene layer is generated/edited relative to `hub.geometry.lock_v1` and retained on 640×360 canvas at `(0,0)`. Architecture may not be generated as freely trimmed standalone art if exact alignment would be lost.

### Gate
Rebuild the scene from accepted layers only. The assembled result must visually reproduce the accepted geometry target without manually moving layers.

### FAIL conditions
- any layer requires CSS offset or hand nudging;
- building/horizon/path mismatch >2 logical px;
- opaque background appears where alpha is required;
- architecture includes labels/UI;
- scene reconstruction requires repainting seams into a flattened bitmap.

## 5. Stage 2 — foreground and gameplay readability

### Generate
- BATCH-14 foreground/gameplay objects;
- BATCH-27 optional environmental props;
- BATCH-25 interaction states.

### Procedure
Place props by semantic anchors, not by eyeballed CSS coordinates. Ensure foreground elements support depth rather than obscure navigation. Interaction overlays remain separate from labels/hit regions.

### Gate
With text labels hidden, at least seven major campus zones must remain visually distinguishable by architecture/landmark identity.

### FAIL conditions
- interaction state contains text/icon instead of scene-integrated cue;
- prop is required to patch missing base geometry;
- foreground element blocks critical CTA/hotspot;
- one prop uses incompatible camera/pixel scale.

## 6. Stage 3 — living world

### Generate
- BATCH-08 ambient fauna/props;
- BATCH-09 character motion;
- BATCH-20 scientific instrument animation states;
- BATCH-21 water/sky motion;
- BATCH-22 building activity.

### Animation discipline
- one authored state/frame per image-generation call;
- animation frames share canvas/pivot/identity;
- sprite sheets are assembled later in Aseprite/pipeline;
- low-cadence authored pixel animation is preferred over synthetic smooth interpolation;
- reduced-motion has a complete static fallback.

### Gate
Idle Hub must support at least:
- 2–4 visible living entities;
- 3 independent calm motion systems;
- one visible building-activity cue;
- correct foreground occlusion;
- no ambient element that competes with task CTA.

### FAIL conditions
- frame identity drift;
- pivot jump >1 logical px for local animation states;
- random high-frequency motion/noise;
- UI/task readability loss.

## 7. Stage 4 — environment states

### Generate
- BATCH-16 seasons;
- BATCH-17 weather;
- BATCH-18 day phases.

### Mandatory rule
Every state uses `hub.geometry.lock_v1` as reference. Never prompt “draw the same campus in winter/rain/night” from scratch. Generate only the requested replacement/overlay state.

### Gate
Run the BATCH-19 combination matrix.

### FAIL conditions
- architecture/path/horizon moves >2 logical px;
- building silhouette changes because of season/weather/day generation;
- snow/rain/fog obscures essential interaction regions;
- lighting invents new windows/lamps.

## 8. Stage 5 — rare events

Generate BATCH-28 only after Stages 0–4 pass.

Rules:
- rare event is optional;
- event contains no required information;
- event can be disabled entirely;
- reduced-motion can suppress it;
- event may never mutate base geometry.

Gate: Art Director checks that rare events remain below normal navigation and CTA in visual hierarchy.

## 9. Stage 6 — UI and fullscreen integration

### Sources
- accepted BATCH-15 UI chrome;
- BATCH-24 responsive-crop QA;
- accepted scene/layer manifests.

### Runtime contract
- scene fills `100vw × 100vh`;
- uniform `cover` scaling only;
- nearest-neighbour where pixel textures are scaled;
- no independent X/Y stretch;
- React/DOM owns text-heavy UI unless explicitly assigned otherwise;
- critical architecture stays inside central safe-zone;
- UI is not baked into background art.

### Gate
Pass 16:9, 16:10, 3:2, 4:3, 21:9, 1920×1080, 1440×900, 1280×800 and supported mobile-landscape checks defined in BATCH-24.

## 10. Stage 7 — final assembly QA

Run:
- BATCH-19 state-combination QA;
- BATCH-26 final assembly QA.

PASS requires all of the following:

1. geometry drift <=2 logical px across environment-state composites;
2. all full-scene overlays align at `(0,0)`;
3. no black/empty margins in supported fullscreen views;
4. no state requires independent X/Y stretch;
5. seven major campus zones remain recognizable with text hidden;
6. foreground occlusion works on at least three approved routes;
7. no fake meteorological data/text is baked into production art;
8. day/weather/season never redraw architecture;
9. reduced-motion remains complete and visually coherent;
10. accepted assets have semantic ID, source path, logical size, pivot/anchor, world layer, provenance and acceptance status;
11. runtime resolves only approved generated output, not candidates;
12. QA composite is not substituted for layered runtime assembly.

## 11. Per-job execution checklist

Before sending any numbered generation JOB:

- [ ] copy the entire JOB, not only its first paragraph;
- [ ] attach the exact `References` listed in the JOB;
- [ ] request exactly one image;
- [ ] verify declared canvas/logical size;
- [ ] verify transparency requirement;
- [ ] verify pivot/origin/trim policy;
- [ ] ensure anti-collage instruction is present;
- [ ] ensure task-specific hard negatives are present.

Immediately after generation:

- [ ] reject contact sheet/grid/collage/multiple variants;
- [ ] reject wrong alpha/checkerboard;
- [ ] reject geometry/identity/pivot drift;
- [ ] reject text/UI/fake data unless explicitly requested;
- [ ] compare against reference at logical resolution;
- [ ] record candidate provenance;
- [ ] do pixel cleanup before production acceptance;
- [ ] obtain independent review.

## 12. Prompt-quality gate

Run:

```bash
python tools/validate_art_generation_prompts.py
```

A revised v2 batch must not pass if a numbered image JOB lacks the mandatory sections or is too short to be independently actionable.

## 13. Recommended immediate sequence

```text
12-10
→ 12-01..09
→ 13-01..10
→ 23-01..10
→ 14-01..10
→ 09-01..10
→ 20-01..10
→ 21-01..10
→ 22-01..10
→ 16/17/18
→ 24
→ 25
→ 19/26
→ 27/28
```

Do not reorder environment/state production ahead of geometry lock. Do not start rare-event production before the base Hub passes final assembly/readability checks.
