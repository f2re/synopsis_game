# BATCH-16 — Hub season states, Geometry Lock v1

Purpose: support spring, summer, autumn and winter without regenerating or moving the Hub geometry.

## Mandatory input

Attach accepted `hub.geometry.lock_v1` as Image A. All jobs use full 640×360 canvas, origin `(0,0)`, exact same camera/horizon/paths/building footprints. No crop, trim, re-center, zoom or architectural redesign.

Append to every prompt:

> Image A is authoritative for geometry. Preserve camera, horizon, building footprints, rooflines, paths, plaza, waterline and foreground positions exactly. This job changes seasonal materials/vegetation only. Do not move or redesign anything. Full 640×360 canvas. No UI, labels or text.

Season system is component-based: vegetation is a replaceable layer; snow/leaves/flowers are additive overlays. Do not repaint the entire scene as a new independent illustration.

## JOB 16-01 — `hub.season.spring.deciduous`

Create exactly ONE full-canvas transparent RGBA spring deciduous-vegetation replacement layer aligned to Image A. Trees/shrubs occupy the same vegetation positions as the canonical Hub. Early-to-mid spring: fresh light green leaves, some partially open crowns, controlled cool green palette, subtle damp branches. Keep trunk/branch geometry and canopy footprint consistent with the locked scene. No buildings, ground, UI or text. Full 640×360 canvas, no trim.

## JOB 16-02 — `hub.season.summer.deciduous`

Create exactly ONE full-canvas transparent RGBA summer deciduous-vegetation replacement layer. Same exact tree/shrub positions and silhouette family as 16-01/Image A, but fuller mature green crowns, richer blue-green shadows and restrained warm highlights. Do not enlarge canopies enough to cover gameplay labels/routes. No architecture or ground. Full 640×360 canvas.

## JOB 16-03 — `hub.season.autumn.deciduous`

Create exactly ONE full-canvas transparent RGBA autumn deciduous-vegetation replacement layer. Preserve exact vegetation anchors and canopy extents. Controlled mixture of dark green, amber, ochre, rust and muted red; broad coherent clusters, not noisy confetti. No buildings/ground/UI/text. Full canvas.

## JOB 16-04 — `hub.season.winter.deciduous`

Create exactly ONE full-canvas transparent RGBA winter deciduous-vegetation replacement layer. Same exact tree anchors and branch architecture as other seasons, mostly bare branches with a few retained dry leaves where appropriate. Cold blue-gray/brown branch palette. No snow accumulation in this job; snow is separate. Full 640×360 canvas.

## JOB 16-05 — `hub.season.evergreen.base`

Create exactly ONE full-canvas transparent RGBA evergreen/conifer vegetation layer aligned to Image A. Conifers keep the same positions in all seasons; dense North-West blue-green clusters, consistent trunk/baseline geometry. This is the season-neutral conifer base used year-round. No snow, buildings, ground, UI or text.

## JOB 16-06 — `hub.season.spring.flowerbeds`

Create exactly ONE full-canvas transparent RGBA spring flowerbed/low-plant overlay in the exact canonical bed positions. Sparse early flowers and fresh shoots, restrained colors, readable pixel clusters. Do not change path/ground geometry. No trees, buildings, UI or text.

## JOB 16-07 — `hub.season.summer.flowerbeds`

Create exactly ONE full-canvas transparent RGBA summer flowerbed layer in the exact same canonical bed positions as 16-06. Fuller but controlled flowering masses, still secondary to architecture. Preserve bed shapes and routes. No buildings/UI/text.

## JOB 16-08 — `hub.season.autumn.fallen_leaves`

Create exactly ONE full-canvas transparent RGBA fallen-leaf overlay. Leaves collect only along path edges, stairs, shrub bases and protected corners; preserve walkable path readability. Broad clustered patches rather than random pixel noise. No geometry changes, no UI/text.

## JOB 16-09 — `hub.season.winter.snow_ground`

Create exactly ONE full-canvas transparent RGBA snow-accumulation overlay for ground, lawns, steps and low retaining walls. Preserve every path/stair boundary from Image A. Snow thickness visually consistent and does not erase route geometry. Avoid covering water. No snowfall particles here. Full canvas, no text/UI.

## JOB 16-10 — `hub.season.winter.snow_caps`

Create exactly ONE full-canvas transparent RGBA snow-cap overlay for roofs, railings, evergreen branches, ledges and globe/plinth horizontal surfaces. Use exact architecture/prop positions from Image A; do not repaint or reshape them. Controlled cool snow shadows and subtle warm reflected light. No falling snow, UI or text.

## Acceptance

All season layers must stack at `(0,0)` on the same geometry master. FAIL if path geometry, building shape, horizon or object position changes. FAIL if any output is cropped/trimmed. PASS only if switching seasons requires zero positional correction.