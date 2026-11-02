# BATCH-23 — Hub depth and occlusion layers

Purpose: обеспечить настоящую пространственную глубину первого экрана: игрок, NPC и животные должны корректно проходить **за** оградой, кустами, кронами, фонарями и частями центрального объекта, а не просто рисоваться поверх сцены.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is self-contained and generated separately.

## Shared constants

- Geometry authority: `hub.geometry.lock_v1`.
- Canvas for every job: `640×360` transparent RGBA, origin `(0,0)`, never trim.
- The accepted Hub master is authoritative for exact occluder geometry and coordinates.
- Generate only pixels that must render **in front of** moving entities, except explicit depth masks.
- Pixel boundaries must remain crisp under nearest-neighbour scaling.
- No UI, labels, text, architecture redesign or new environmental objects.

---

## JOB 23-01 — `hub.occluder.railing.front`

### References
- **Image A:** `hub.geometry.lock_v1` — authoritative for camera and railing position.
- **Image B:** accepted foreground railing artwork, if available — authoritative for material, exact posts/lattice and lighting.

### Output contract
Exactly ONE `640×360` transparent RGBA full-scene overlay at `(0,0)`. Visible pixels: only the nearest front railing segments that must cover lower portions of player/NPC sprites.

### Generation prompt
Extract/recreate only the frontmost stone-and-metal railing portions from the accepted Hub composition that physically sit between the camera and walkable routes. Preserve every post, top rail, lattice opening, angle and perspective line exactly. Keep dark blue-gray stone/painted metal material clusters and restrained warm lamp reflections. The occluder should be visually complete when drawn over moving characters but contain no background, ground, plants or architecture. Output exactly one transparent overlay image.

### Hard negatives
No new railing section, no repositioning, no plants, no lamps, no ground fill, no characters, no UI/text, no blur, no extra variants, no contact sheet/sprite sheet/grid/collage, no checkerboard background.

### PASS / FAIL
Overlay must align pixel-for-pixel with the accepted railing in Image A. Geometry drift >1 logical px, missing major front segment or unrelated pixels = FAIL.

---

## JOB 23-02 — `hub.occluder.railing.side`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted railing master.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay containing only side/corner railing portions that can pass in front of moving sprites near left/right routes.

### Generation prompt
Create the side-railing occlusion layer from the exact accepted scene. Include only those railing/corner pixels that are physically in front of route lanes at the scene edges. Preserve perspective, post spacing, material palette and height relative to the front railing. Keep all non-occluding scene areas transparent. Output one image only.

### Hard negatives
No duplicate front railing, no new corner design, no plants/ground, no widened rail, no UI/text, no contact sheet or multiple options.

### PASS / FAIL
Any railing segment not present in the accepted master, perspective drift or opaque background = FAIL.

---

## JOB 23-03 — `hub.occluder.shrubs.front_left`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted front-left vegetation layer.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay, only front-left shrub/flower masses that can cover lower character pixels.

### Generation prompt
Extract/recreate the accepted front-left shrub and flower-bed masses as a dedicated foreground occluder. Preserve exact footprint, height, silhouette and perspective. Use broad coherent foliage clusters, controlled seasonal color masses and clean edges; retain only vegetation physically in front of walkable lanes. Transparent everywhere else. Output exactly one overlay.

### Hard negatives
No new bush, no scattered leaf confetti, no ground patch, no building/railing pixels, no characters, no text/UI, no collage/contact sheet.

### PASS / FAIL
Footprint/height drift >2 px, random noisy foliage, missing main occluding mass or extra scenery = FAIL.

---

## JOB 23-04 — `hub.occluder.shrubs.front_right`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted front-right vegetation layer.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay containing only accepted front-right vegetation that must occlude moving entities.

### Generation prompt
Create the front-right vegetation occluder using the exact accepted shrub/flower geometry. Preserve silhouette, depth relationship and seasonal palette role; only the frontmost foliage clusters that physically overlap route lanes should remain visible. Use clean grouped pixel clusters and keep all other pixels transparent. Output one image only.

### Hard negatives
No new shrub placement, no ground, no lamp/building pixels, no text/UI, no blur, no multiple variants.

### PASS / FAIL
Any mismatch that causes visible double edges against base vegetation, footprint drift or non-vegetation pixels = FAIL.

---

## JOB 23-05 — `hub.occluder.tree_canopy.left`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted left tree/conifer canopy.

### Output contract
Exactly ONE `640×360` transparent RGBA canopy occlusion layer.

### Generation prompt
Create only the left-side canopy portions that visually sit in front of deeper walk lanes, NPCs or props. Preserve exact branch/canopy silhouette and anchor from the accepted scene. Keep broad blue-green foliage masses with seasonally appropriate edits supplied by the active season layer, avoiding tiny random needle/leaf noise. Do not include trunk/ground unless those pixels themselves physically occlude route sprites. Output one transparent overlay.

### Hard negatives
No new tree, no moved canopy, no sky fill, no building pixels, no UI/text, no blur/contact sheet/collage.

### PASS / FAIL
Canopy mismatch producing ghost/double edges, geometry drift or added non-occluding scenery = FAIL.

---

## JOB 23-06 — `hub.occluder.tree_canopy.right`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted right canopy.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay containing only right-side front canopy pixels.

### Generation prompt
Create the right-side canopy occluder with exact alignment to the accepted Hub. Preserve canopy footprint, branch mass and palette role. Keep only pixels that need to render in front of deeper world entities; transparent elsewhere. Maintain premium pixel clusters and coherent silhouette at nearest-neighbour scaling. Output one image only.

### Hard negatives
No new vegetation, no trunk/ground unless actually occluding, no architecture, no text/UI, no extra options.

### PASS / FAIL
Any coordinate drift >2 px, non-occluding scene pixels or mismatch against base canopy = FAIL.

---

## JOB 23-07 — `hub.occluder.lamp_foreground`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted foreground lamp posts.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay containing only foreground lamp bodies/caps that can occlude sprites. Exclude glow halos.

### Generation prompt
Create the lamp-body occlusion layer from the exact accepted foreground lamps. Preserve mast width, base, lantern cap and perspective. Include only opaque physical lamp pixels that should render in front of characters; all illumination/glow remains in lighting layers and must not appear here. Keep dark metal/stone clusters with accepted material highlights. Output one image only.

### Hard negatives
No glow, no extra lamp, no moved base, no ground patch, no UI/text, no contact sheet/collage.

### PASS / FAIL
Glow pixels, lamp coordinate drift, duplicated lamps or unrelated scene content = FAIL.

---

## JOB 23-08 — `hub.occluder.globe_foreground_arc`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted central globe/armillary landmark master.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay containing only the front-facing armillary/globe portions that physically sit in front of routes behind the landmark.

### Generation prompt
Separate the central scientific globe/armillary into a front occlusion layer. Preserve exact geometry, thickness, material and alignment. Include only the arcs, rim or structural pixels that would visually pass in front of a sprite walking behind the landmark; do not duplicate rear arcs or pedestal pixels belonging behind the character. Keep the accepted blue/brass/stone material language and transparent everything else. Output one image only.

### Hard negatives
No whole landmark copy, no geometry redesign, no extra globe details, no ground/water, no people, no UI/text, no contact sheet.

### PASS / FAIL
If the overlay contains rear geometry or causes double-rendering when composited, or shifts landmark edges >1 px = FAIL.

---

## JOB 23-09 — `hub.depth.shadow_contact_mask`

### References
- **Image A:** `hub.geometry.lock_v1` for walkable path/plaza geometry.
- **Image B:** accepted route/path mask if available.

### Output contract
Exactly ONE `640×360` transparent RGBA contact-shadow support mask. No objects; only reusable low-opacity shadow shapes at likely sprite baselines.

### Generation prompt
Create a subtle contact-shadow mask for approved walkable paths and plaza zones. Use small flattened dark blue-gray pixel clusters positioned where world sprites commonly stand, scaled/perspectively compressed by depth. These are reusable runtime shadow footprints, not baked character shadows. Keep opacity restrained and edges pixel-art crisp; no soft Gaussian blur. Transparent elsewhere. Output exactly one image.

### Hard negatives
No characters, no object-specific silhouettes, no architecture, no broad darkness wash, no smooth blur, no UI/text, no multiple variants/contact sheet.

### PASS / FAIL
Shadows outside walkable areas, overly large blobs, blurred edges or scene geometry pixels = FAIL.

---

## JOB 23-10 — `hub.depth.midground_separator_haze`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted depth/haze baseline.

### Output contract
Exactly ONE `640×360` transparent RGBA midground separation overlay.

### Generation prompt
Create a very subtle cool depth-separation haze layer placed between foreground path/vegetation and more distant architecture. Use broad low-opacity pixel/dither bands that gently reduce contrast in selected midground zones while leaving major building silhouettes and interaction hotspots crisp. Preserve all scene geometry; this is purely atmospheric separation and should be nearly invisible when viewed alone. Output exactly one transparent overlay.

### Hard negatives
No Gaussian blur, no fog wall, no whole-frame color wash, no architecture repaint, no UI/text, no extra objects, no contact sheet/collage.

### PASS / FAIL
If the layer materially obscures interaction zones, affects foreground more than midground, or includes geometry pixels = FAIL.

---

## Batch acceptance

- all layers stack at `(0,0)` with no CSS offsets;
- every occluder corresponds to visible accepted geometry;
- at least three approved NPC/player routes visibly pass behind an occluder;
- no layer duplicates background/architecture unnecessarily;
- alpha boundaries are clean under nearest-neighbour scaling;
- season variants must preserve occluder footprint even when colors/foliage density change;
- candidates require pixel cleanup, manifest/provenance registration and independent review before runtime use.
