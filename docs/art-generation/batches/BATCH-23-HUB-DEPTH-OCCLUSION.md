# BATCH-23 — Hub depth and occlusion layers

Purpose: обеспечить реальную пространственную глубину первого экрана: персонажи и животные должны проходить за объектами переднего плана и между планами сцены.

## Global contract

Use `hub.geometry.lock_v1` as the only geometry authority. All jobs are full 640×360 transparent RGBA canvases, origin `(0,0)`, never trimmed. Generate only the requested occluder/depth pixels. No UI, no text, no new architecture, no geometry drift.

## JOB 23-01 — `hub.occluder.railing.front`
Create exactly ONE transparent full-scene foreground occluder containing only the nearest stone-and-metal railing sections that must render in front of player/NPC legs. Preserve exact railing geometry from Image A; transparent everywhere else.

## JOB 23-02 — `hub.occluder.railing.side`
Create exactly ONE transparent occluder for left/right side railing/corner sections that may cover moving sprites near screen edges. Same geometry, no extra plants.

## JOB 23-03 — `hub.occluder.shrubs.front_left`
Create exactly ONE transparent occluder containing only the accepted front-left shrub/flower masses that should cover lower portions of sprites. Preserve broad pixel clusters and exact position.

## JOB 23-04 — `hub.occluder.shrubs.front_right`
Create exactly ONE transparent front-right vegetation occluder aligned exactly to Image A.

## JOB 23-05 — `hub.occluder.tree_canopy.left`
Create exactly ONE transparent left-side tree/conifer canopy occluder that may overlap moving characters or props in deeper lanes. Do not include trunks/ground unless they visually occlude.

## JOB 23-06 — `hub.occluder.tree_canopy.right`
Create exactly ONE transparent right-side canopy occluder with identical geometry to the accepted scene.

## JOB 23-07 — `hub.occluder.lamp_foreground`
Create exactly ONE transparent layer containing only the nearest foreground lamp-post bodies and caps that should render in front of sprites; exclude glow halos.

## JOB 23-08 — `hub.occluder.globe_foreground_arc`
Create exactly ONE transparent layer containing only the front-facing portion of the central globe/armillary structure that can occlude sprites passing behind the landmark. Do not include rear arcs or pedestal pixels that belong behind characters.

## JOB 23-09 — `hub.depth.shadow_contact_mask`
Create exactly ONE transparent contact-shadow mask for accepted walkable paths and plaza zones: small soft-edged pixel-art shadow shapes only at likely sprite baselines, no objects. Use low-opacity dark blue-gray clusters, no blur. Runtime may modulate opacity.

## JOB 23-10 — `hub.depth.midground_separator_haze`
Create exactly ONE transparent midground separator layer: very subtle cool haze/contrast-reduction bands behind foreground paths but in front of distant architecture, preserving all geometry. No smooth blur, only controlled pixel dithering.

## Acceptance

- overlays align at `(0,0)` with master;
- every occluder must correspond to actual geometry visible in master;
- no duplicated architecture/ground;
- alpha boundary clean enough for nearest-neighbor scaling;
- at least three NPC routes must visibly pass behind an occluder in runtime.
