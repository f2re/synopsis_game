# BATCH-10 — Hub landmark identity overlays

Purpose: сделать функциональные зоны Hub узнаваемыми **без текстовых подписей**, не заменяя базовую архитектуру из BATCH-13 и не меняя `hub.geometry.lock_v1`.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is a self-contained full-canvas overlay prompt and must be generated separately.

## Shared constants

- Geometry authority: accepted `hub.geometry.lock_v1`.
- Architecture authority: accepted BATCH-13 building layers.
- Every output: exactly `640×360` transparent RGBA, origin `(0,0)`, never trim.
- Landmark overlays add only identity details on top of existing architecture; they never replace walls/roof/footprint.
- Every non-requested pixel remains transparent.
- Labels, building names, level/status data and interaction plates remain live UI.
- Pixel style/lighting must match accepted Hub master.

---

## JOB 10-01 — `hub.landmark.radar.identity_overlay`

### References
- **Image A:** `hub.geometry.lock_v1` — authoritative for Radar location and camera.
- **Image B:** accepted `hub.arch.radar_building` — authoritative for roof/radome/fixture geometry.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, never trimmed. Only Radar identity-accent pixels may be visible.

### Generation prompt
Create a Radar identity overlay that makes the facility recognizable without text while leaving the accepted building unchanged. Add only compact existing-compatible scientific details: a refined pale radome/dish accent cluster, a small technical service platform/rail cue if it fits the accepted roof geometry, and one restrained cold-cyan operational instrument light. Preserve every roof/wall/footprint pixel from Image B by leaving them transparent in this overlay. The identity treatment should be readable at normal Hub zoom but visually subordinate to the main task CTA. Output exactly one aligned overlay.

### Hard negatives
No full building copy, new wall/roof, moved radome, extra large dish, labels, text, icon plate, people, terrain, sky, UI, neon outline, contact sheet/sprite sheet/grid/collage/options, fake checkerboard transparency.

### PASS / FAIL
If removing overlay does not reveal unchanged building, if any architecture geometry is duplicated/altered, or identity accents spill outside Radar region = FAIL.

---

## JOB 10-02 — `hub.landmark.maps_analysis.identity_overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted `hub.arch.maps_analysis_pavilion` with exact window/glass geometry.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, no trim. Only identity details visible through/on accepted pavilion surfaces.

### Generation prompt
Create a Maps & Analysis identity overlay using the accepted pavilion only. Through existing glazing, add one broad low-detail illuminated analysis surface, a few abstract color-block/map-layer cues and dark desk/equipment silhouettes that imply map work. Keep all graphics deliberately unreadable and non-professional as source art; real meteorological maps remain runtime-rendered. Add at most a few cool edge-light accents to existing frames without repainting them. Preserve all facade/window geometry. Output exactly one overlay.

### Hard negatives
No readable map, fronts/isobars/data, labels, text, new window/frame, full interior illustration, people outside, building repaint, UI plate, contact sheet/collage/options.

### PASS / FAIL
Readable fake meteorological data, changed glazing geometry, copied facade pixels or overlay extending outside accepted building = FAIL.

---

## JOB 10-03 — `hub.landmark.archive.identity_overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted `hub.arch.archive`.

### Output contract
Exactly ONE `640×360` transparent RGBA identity overlay at `(0,0)`.

### Generation prompt
Create a restrained Archive identity overlay without repainting the accepted facade. Use only existing windows/door openings to show warm archival cues: broad shelving/document-box silhouettes, one compact brass/amber desk-lamp glow and perhaps a few dark paper-map storage shapes. Keep everything behind accepted glazing/door geometry and unreadable. The overlay should make the building feel like a working scientific archive through atmosphere/material clues, not signage. Output one full-canvas transparent layer only.

### Hard negatives
No readable labels/books, no new shelves outside windows, no gothic ornament, no new doorway/window, no exterior people, no facade copy, no UI/text, no contact sheet/collage.

### PASS / FAIL
Any identity detail outside accepted openings, architecture alteration, readable text or over-bright focal treatment = FAIL.

---

## JOB 10-04 — `hub.landmark.aerology.identity_overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted `hub.arch.aerology` — authoritative for preparation-bay/platform/roof geometry.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, never trimmed.

### Generation prompt
Create an Aerology facility identity overlay using only physically compatible cues on the accepted building: compact balloon-preparation rack/reel/tether hardware, one small launch-cradle or folded-envelope preparation cue and restrained cool/warm technical lights. Preserve every building surface and roof/platform geometry; leave them transparent in the overlay. The facility should communicate upper-air sounding preparation even with labels hidden. A free flying balloon is not part of this job because balloons exist as separate world assets/events. Output exactly one overlay.

### Hard negatives
No full balloon launch, no new roof/platform, no building repaint, no text/labels, no fake data, no people, no UI, no contact sheet/grid/collage/options.

### PASS / FAIL
New architecture, duplicated standalone balloon, geometry drift or identity detail outside approved Aerology area = FAIL.

---

## JOB 10-05 — `hub.landmark.tournament.identity_overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted `hub.arch.tournament_hall`.

### Output contract
Exactly ONE `640×360` transparent RGBA Tournament Hall identity overlay at `(0,0)`.

### Generation prompt
Create a restrained competitive/educational identity overlay for Tournament Hall. Add only scene-integrated details compatible with the accepted facade: a pair of narrow blank fabric/border accents, one abstract trophy-like light silhouette or emblem mounting glow with no readable symbol, and slightly stronger warm event-entry lighting through existing openings. Keep the treatment formal and scientific, not sports-arena kitsch. Base building remains untouched and transparent in this overlay. Output exactly one aligned layer.

### Hard negatives
No readable banner, logo, score, bracket, crowd, sports branding, military flags, new facade geometry, UI plate, contact sheet/collage/options.

### PASS / FAIL
If overlay resembles a sports event UI, contains readable content, changes facade/entrance geometry or dominates CTA hierarchy = FAIL.

---

## JOB 10-06 — `hub.landmark.codepost.identity_overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted `hub.arch.code_post_glass_lab`.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)` containing only Code Post identity details.

### Generation prompt
Create a compact operational identity overlay for the accepted Code Post/glass lab. Add only small communications/technical cues at already-approved attachment points: compact antenna/mast tips, a tiny equipment-cabinet status-light grouping and a distinctive but restrained amber/green operational-light pattern visible through existing glass. Do not render terminal text or actual code. Keep all building/frame pixels transparent and preserve exact geometry. Output one aligned overlay only.

### Hard negatives
No fake terminal data, AAXX text, new mast tower, new cabinet outside footprint, cyberpunk neon, full building copy, UI icon, contact sheet/collage/options.

### PASS / FAIL
Readable data, new geometry, excessive neon brightness or overlay outside accepted Code Post region = FAIL.

---

## JOB 10-07 — `hub.landmark.main_center.identity_overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted `hub.arch.synoptic_center` — authoritative for entrance/canopy/emblem mounting area.

### Output contract
Exactly ONE `640×360` transparent RGBA identity overlay at `(0,0)`.

### Generation prompt
Create the main Synoptic Center identity overlay using only accepted facade/entrance features. Add a restrained abstract scientific emblem geometry based on cloud/wind/globe forms without letters, compact warm canopy/entrance-light accents and a few small brass/blue material highlights at existing architectural details. The building should become more immediately recognizable as the primary center while remaining text-free. Do not copy walls, stairs or roof into the overlay. Output one full-canvas aligned layer.

### Hard negatives
No building name, station number, logo text, giant crest, changed canopy/stairs, facade repaint, flags, UI badge, contact sheet/collage/options.

### PASS / FAIL
Text/signage, architecture duplication/change, emblem too dominant, or identity detail outside accepted facade anchors = FAIL.

---

## JOB 10-08 — `hub.landmark.greenhouse.identity_overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted glass-lab/greenhouse architecture if present in approved scene.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, no trim. Only interior/identity pixels visible through accepted glazing.

### Generation prompt
Create the identity overlay for the greenhouse/environmental observation structure. Through existing glass panes only, add compact warm work-lamp patches, broad plant/measurement silhouettes and one small scientific instrument-stand form. Keep detail low enough to remain atmospheric and do not include staff in this identity layer. Preserve all glass-frame/roof geometry and leave building pixels transparent. The result should suggest environmental observation rather than a decorative greenhouse. Output exactly one overlay.

### Hard negatives
No new plants outside glass, no people, no readable charts, no facade/frame redraw, no expanded structure, no UI/text, no contact sheet/collage.

### PASS / FAIL
Pixels outside accepted glazing, changed architecture, fake readable data or decorative-conservatory drift = FAIL.

---

## JOB 10-09 — `hub.landmark.rooftop_instruments.overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted BATCH-13 rooftop-instrument base layer and architecture anchors.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, never trimmed. Only small identity/visibility accents on existing rooftop instruments may be visible.

### Generation prompt
Create a subtle rooftop-instrument identity/visibility overlay across the campus using existing approved instrument positions. Add only small highlight/detail clusters to accepted antenna tips, compact wind sensors, small dishes, radiation-shield edges and cable/support junctions so scientific equipment reads more clearly at normal Hub zoom. Do not duplicate complete instruments or roofs. Keep large areas transparent and visual density restrained. Output one aligned overlay only.

### Hard negatives
No new instrument, no copied roof/building, no antenna forest, no large glow, no text/data, no UI, no contact sheet/collage/options.

### PASS / FAIL
New equipment/geometry, excessive clutter, copied architecture pixels or anchor drift = FAIL.

---

## JOB 10-10 — `hub.landmark.entry_wayfinding_icons.overlay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted architecture/entrance locations and project physical-signage style.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)` containing only small in-world pictographic entrance plaques/signs. No text.

### Generation prompt
Create small physical pictographic plaques at already-approved entrances to reinforce building identity without written labels. Use compact abstract symbols only: radar-wave motif, map-layer motif, archive-box motif, balloon/aerology motif, restrained trophy motif and telegraph/code-post motif. Each plaque must look like an in-world enamel/metal sign attached to the architecture, not a floating React badge. Keep symbol geometry simple, one-color/two-color, readable at Hub scale and secondary to live UI. Output one aligned overlay only.

### Hard negatives
No letters, numbers, building names, arrows, floating HUD badges, large icons, new signposts, architecture change, contact sheet/collage/multiple variants.

### PASS / FAIL
Generated text, UI-like floating appearance, plaque outside approved entrance anchor, excessive size or architecture drift = FAIL.

---

## Batch acceptance

- all outputs are `640×360` transparent overlays at `(0,0)` with zero manual offset;
- removing any overlay reveals unchanged BATCH-13 architecture;
- each facility remains distinguishable with labels hidden;
- no readable fake meteorological data/text is baked into overlays;
- identity details remain subordinate to task CTA and interaction UI;
- candidates pass pixel cleanup, manifest/provenance registration and independent art/technical review.
