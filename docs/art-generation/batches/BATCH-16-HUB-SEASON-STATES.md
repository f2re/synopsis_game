# BATCH-16 — Hub season states, Geometry Lock v1

Purpose: поддержать весну, лето, осень и зиму без повторной генерации или смещения Hub geometry.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is a self-contained edit/generation prompt. Send one JOB per generation call.

## Shared constants

- **Image A:** accepted `hub.geometry.lock_v1`, authoritative for camera, horizon, architecture, terrain, waterline, paths, plaza and vegetation anchors.
- Full-scene seasonal outputs use `640×360`, origin `(0,0)`, never trim.
- Season changes vegetation/material state only; it never moves buildings or routes.
- Deciduous vegetation is a replacement layer; snow/leaves/flowers are additive overlays.
- One image per job; no contact sheets, multi-season grids or collages.

---

## JOB 16-01 — `hub.season.spring.deciduous`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted canonical deciduous vegetation geometry from the neutral/autumn master, authoritative for tree/shrub anchors, trunk positions and canopy footprint.

### Output contract
Exactly ONE `640×360` transparent RGBA spring deciduous replacement layer at origin `(0,0)`, never trimmed.

### Generation prompt
Create the spring deciduous-tree and shrub replacement layer for the accepted Hub. Preserve every trunk anchor, branch architecture, shrub base and overall canopy footprint from Image B. Render early-to-mid spring vegetation with fresh light-to-medium greens, partially open crowns, visible branch structure in some trees and restrained damp cool shadows. Keep broad coherent pixel clusters and avoid noisy individual-leaf confetti. The layer must swap directly with the canonical deciduous layer without moving or scaling anything. Transparent everywhere outside deciduous vegetation. Output exactly one image.

### Hard negatives
No building, path, ground, sky, water, snow, flowers outside shrubs, new tree, moved trunk, enlarged canopy blocking routes, text/UI, contact sheet/sprite sheet/grid/collage/options, fake checkerboard transparency.

### PASS / FAIL
Any anchor shift >1 px, canopy expansion that blocks interaction zones, new/missing tree or non-vegetation pixels = FAIL.

---

## JOB 16-02 — `hub.season.summer.deciduous`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted spring/canonical deciduous geometry, authoritative for anchors and maximum canopy extents.

### Output contract
Exactly ONE `640×360` transparent RGBA summer deciduous replacement layer at `(0,0)`, no trim.

### Generation prompt
Create the summer deciduous vegetation state on the exact same anchors and silhouette family as the accepted canonical layer. Crowns are fuller and mature but may not expand beyond approved canopy envelopes. Use richer blue-green/leaf-green masses with controlled warm sunlit accents and cool interior shadows, maintaining premium pixel-art cluster discipline. Keep trunks and shrub bases spatially identical so routes/hotspots remain unchanged. Transparent outside vegetation. Output one image only.

### Hard negatives
No new tree, no canopy growth into UI/hotspot safe areas, no ground, building or path pixels, no flowerbed additions, no text/UI, no collage/contact sheet/options.

### PASS / FAIL
Anchor drift, canopy footprint outside accepted envelope, noisy foliage or scene-geometry contamination = FAIL.

---

## JOB 16-03 — `hub.season.autumn.deciduous`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted deciduous geometry.

### Output contract
Exactly ONE `640×360` transparent RGBA autumn deciduous replacement layer at `(0,0)`.

### Generation prompt
Create the autumn deciduous layer using the exact same trunk/shrub anchors and canopy extents as the accepted geometry. Use a controlled mixture of remaining dark green, amber, ochre, rust and muted red-orange arranged in broad clustered masses with realistic uneven seasonal transition. Preserve branch/trunk structure and avoid confetti-like single leaves. This is a replacement vegetation layer only, intended to stack without any positional correction. Output exactly one image.

### Hard negatives
No fallen leaves on ground in this job, no new tree, no path/architecture pixels, no random leaf noise, no text/UI, no contact sheet/grid/collage/multiple variants.

### PASS / FAIL
Tree count/anchor change, canopy growth/shrinkage beyond approved envelope, noisy single-pixel foliage or non-vegetation content = FAIL.

---

## JOB 16-04 — `hub.season.winter.deciduous`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted deciduous geometry with trunk/branch anchors.

### Output contract
Exactly ONE `640×360` transparent RGBA winter deciduous replacement layer, `(0,0)`, no trim.

### Generation prompt
Create the winter deciduous state using the exact canonical tree and shrub anchors. Most crowns become bare branch structures with cold blue-gray/brown wood, retaining only occasional dry-leaf clusters where visually plausible. Preserve trunk position, branch architecture and overall upper silhouette enough to maintain scene balance. Do not add snow accumulation here; snow is handled by separate jobs. Keep branches pixel-clean and readable rather than hair-like. Output one transparent layer only.

### Hard negatives
No snow caps, no new/felled trees, no moved trunks, no ground/building pixels, no dense twig noise, no text/UI, no collage/contact sheet.

### PASS / FAIL
Changed tree anchors, excessively fine unreadable branches, missing major silhouette structure or added snow/scene pixels = FAIL.

---

## JOB 16-05 — `hub.season.evergreen.base`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted conifer positions/geometry.

### Output contract
Exactly ONE `640×360` transparent RGBA evergreen/conifer base layer at `(0,0)`.

### Generation prompt
Create the season-neutral conifer layer for the Hub. Preserve all accepted conifer trunk bases, heights, crown widths and overlap order. Use dense North-West blue-green foliage masses with broad stepped clusters, dark cool interior shadow and restrained warm reflected light. This layer is shared by seasons; seasonal snow or tint overlays are separate. Ensure conifers remain readable at Hub scale and do not expand into route or hotspot space. Output exactly one image.

### Hard negatives
No snow, no seasonal ornaments, no new conifer, no ground/architecture, no noisy individual needles, no text/UI, no multiple variants/contact sheet.

### PASS / FAIL
Anchor/height drift, changed tree count, route occlusion beyond approved footprint or scene-geometry contamination = FAIL.

---

## JOB 16-06 — `hub.season.spring.flowerbeds`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted canonical flowerbed/low-plant masks.

### Output contract
Exactly ONE `640×360` transparent RGBA additive spring flowerbed layer at `(0,0)`.

### Generation prompt
Create early spring flowerbeds and low-plant growth only inside the accepted canonical bed positions. Use sparse fresh shoots, small grouped early blossoms and restrained cool/fresh colors. Preserve every path/bed boundary and leave walkable surfaces clear. Flowers must read as broad small clusters rather than dense multicolor noise. Output one transparent overlay only.

### Hard negatives
No new flowerbed, no plants on paths/stairs, no large decorative bouquet look, no tree/building pixels, no text/UI, no contact sheet/collage.

### PASS / FAIL
Any bed-boundary violation, route obstruction, excessive color noise or scene-geometry change = FAIL.

---

## JOB 16-07 — `hub.season.summer.flowerbeds`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted canonical bed mask and 16-06 for placement.

### Output contract
Exactly ONE `640×360` transparent RGBA summer flowerbed layer at `(0,0)`.

### Generation prompt
Create the summer state of the exact same flowerbeds. Increase plant fullness and flowering density within the approved bed boundaries only, using controlled grouped colors that remain secondary to architecture and UI. Preserve path edges and empty circulation space. The state should feel richer than spring without becoming ornamental noise. Output exactly one transparent overlay.

### Hard negatives
No bed expansion, no plants on route surfaces, no text/UI, no new planter/architecture, no confetti color noise, no collage/contact sheet.

### PASS / FAIL
Bed geometry change, route encroachment, excessive saturation/density or unrelated pixels = FAIL.

---

## JOB 16-08 — `hub.season.autumn.fallen_leaves`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted path/terrain masks.

### Output contract
Exactly ONE `640×360` transparent RGBA additive fallen-leaf overlay at `(0,0)`.

### Generation prompt
Create a restrained autumn fallen-leaf accumulation overlay. Place broad clustered patches only along accepted path edges, stair sides, shrub bases, retaining-wall corners and wind-sheltered pockets. Keep central walkable route lines clearly readable. Use muted amber/rust/brown clusters with limited single-leaf accents and perspective-aware scale. Transparent elsewhere. Output one image only.

### Hard negatives
No uniform leaf carpet, no route blockage, no random full-frame speckle, no architecture repaint, no text/UI, no contact sheet/collage.

### PASS / FAIL
If path readability is reduced, leaf pixels spread outside plausible collection zones, or high-frequency noise dominates = FAIL.

---

## JOB 16-09 — `hub.season.winter.snow_ground`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted terrain/path/stair masks.

### Output contract
Exactly ONE `640×360` transparent RGBA ground-snow accumulation overlay at `(0,0)`.

### Generation prompt
Create winter snow accumulation on lawns, path edges, selected steps and low retaining-wall horizontal surfaces while preserving exact route/stair geometry. Snow depth must be visually shallow enough that path boundaries and interaction routes remain readable. Use cool white/blue-gray clustered shading with restrained warm reflected highlights. Do not cover water and do not add falling snow; this is accumulation only. Output one transparent overlay.

### Hard negatives
No redesigned snowdrifts, no hidden steps/routes, no snow on water, no falling flakes, no architecture reshaping, no text/UI, no collage/contact sheet.

### PASS / FAIL
Route/stair boundary loss, snow geometry that changes walkable layout, water coverage or non-seasonal scene pixels = FAIL.

---

## JOB 16-10 — `hub.season.winter.snow_caps`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted roof/railing/evergreen/landmark geometry.

### Output contract
Exactly ONE `640×360` transparent RGBA snow-cap overlay at `(0,0)`.

### Generation prompt
Create controlled snow caps on horizontal or upward-facing accepted surfaces: roofs, railings, evergreen branches, ledges and central globe/plinth surfaces. Follow existing geometry exactly without changing roof pitch, railing thickness or branch silhouette. Use compact cool-white masses with blue-gray underside shadow and subtle warm reflected light where appropriate. This overlay is separate from ground snow and falling snow. Output exactly one image.

### Hard negatives
No new roof shape, no hanging fantasy icicles unless explicitly accepted elsewhere, no falling flakes, no ground blanket, no text/UI, no contact sheet/collage.

### PASS / FAIL
Architecture/branch silhouette change, snow floating off surfaces, geometry drift >1–2 px or unrelated scene pixels = FAIL.

---

## Batch acceptance

- all seasonal full-scene layers stack at `(0,0)` with zero positional correction;
- switching seasons never moves buildings, paths, horizon, waterline or major vegetation anchors;
- seasonal vegetation respects approved route/hotspot envelopes;
- snow and leaves do not hide gameplay geometry;
- one job = one image; no multi-season board is accepted;
- all candidates require pixel cleanup, manifest/provenance registration and independent review.
