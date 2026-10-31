# BATCH-11 — Hub ambient depth / weather layers

Purpose: оживить текущий Hub без замены geometry master. Все jobs — независимые прозрачные слои или isolated sprites, которые можно включать/выключать и анимировать с разной частотой.

## Execution contract

- one job = one PNG;
- no sprite sheet/contact sheet/grid;
- transparent RGBA;
- scene-aligned layers use full 480×270 canvas and MUST NOT be trimmed;
- clouds may be isolated sprites with explicit anchor;
- no text/UI;
- keep geometry untouched;
- effects must remain subtle enough for study mode.

## JOB 11-01 — `ambient.cloud.far_stratus`

One isolated far cloud sprite for Hub sky: low elongated layered stratus/cumulus band, cool pale blue-gray, minimal contrast, broad coherent pixel clusters, no fluffy cartoon outline. 160×48, center anchor, transparent RGBA. Designed for slow parallax behind city skyline.

## JOB 11-02 — `ambient.cloud.mid_cumulus`

One isolated mid-distance cumulus cloud: compact multi-lobed mass with sunlit cream edge and blue-violet underside, matching current autumn/daylight Hub palette. 128×64, center anchor, transparent RGBA. No sky background.

## JOB 11-03 — `ambient.cloud.near_broken`

One isolated nearer broken-cloud group, slightly darker and higher contrast than 11-01/02, elongated 144×64 silhouette for faster parallax. Transparent RGBA, center anchor, no extra birds or weather effects.

## JOB 11-04 — `ambient.water.glint_layer`

Full 480×270 transparent scene-aligned overlay containing ONLY restrained river glints/ripple highlights on the water area of the accepted Hub master. No shoreline, buildings or sky. Use short horizontal pixel clusters, brighter near reflected sky/light, sparse enough to animate opacity/offset.

## JOB 11-05 — `ambient.windows.warm_mask`

Full 480×270 transparent aligned mask/layer containing ONLY selected warm window-light pixels in campus buildings. Different rooms may be grouped into 3–4 clusters for deterministic on/off cycles. No facade repainting, no people, no text.

## JOB 11-06 — `ambient.lamps.glow_mask`

Full 480×270 transparent aligned layer containing ONLY warm local lamp glow and tiny reflected highlights around existing foreground/campus lamps. Keep hard pixel-cluster falloff rather than smooth blurred halos. Do not redraw lamp geometry.

## JOB 11-07 — `ambient.foliage.wind_overlay`

Full 480×270 transparent aligned overlay with ONLY small secondary foliage clusters on selected foreground/midground trees and bushes, positioned to shift 1–2 logical pixels for a slow wind cycle. Do not repaint entire trees. Autumn orange/olive/dark-green palette consistent with master.

## JOB 11-08 — `ambient.leaves.falling_group`

One isolated ambient group of 8–12 autumn leaves at varied spacing, designed as a reusable particle sprite group. 96×96 transparent RGBA, center anchor. Orange/ochre/brown clusters, each leaf only a few logical pixels, no branch/background.

## JOB 11-09 — `ambient.rain.light_layer`

Full 480×270 transparent aligned light-rain layer: sparse short diagonal pixel streaks, lower density over UI-sensitive central interaction areas, no fog wash or darkening baked in. Must be suitable for slow opacity/toggle animation and study-calm profile.

## JOB 11-10 — `ambient.mist.river_layer`

Full 480×270 transparent aligned low river/campus mist layer: thin cool blue-gray pixel clusters concentrated over water and low ground, leaving buildings and labels readable. No smooth photorealistic blur; use stepped pixel-art transparency clusters. Designed for morning/evening weather state.

## Runtime notes

- clouds: parallax + very slow horizontal motion;
- water glints: opacity/UV-like offset or discrete frame toggles;
- windows: seeded room groups, 20–90 s state changes;
- lamps: fixed geometry, intensity follows time phase;
- foliage: 2–3 frame low-frequency cycle;
- rain/mist: separate weather state, never baked into geometry master;
- reduced-motion: freeze all movement, retain static state.

## Acceptance

- removing each layer returns exact base scene;
- no effect may contain architecture/text/UI;
- layer must preserve 480×270 origin where required;
- no blur/filter look that destroys pixel clusters;
- labels and CTA stay readable under all effects.
