# BATCH-24 — Hub responsive crop and safe-frame QA

Purpose: доказать, что главный Hub действительно работает как fullscreen-сцена на поддерживаемых соотношениях сторон без неравномерного растяжения, редизайна или потери критических игровых зон.

This file follows `PROMPT-AUTHORING-STANDARD.md`. These jobs produce QA/reference composites only. They must never be used to justify moving architecture for a specific viewport.

## Shared geometry contract

- Geometry authority: `hub.geometry.lock_v1`.
- Canonical authored scene: `640×360`, 16:9.
- Runtime policy: uniform scale + `cover` crop only; independent X/Y scaling is forbidden.
- Critical architecture: Radar, Maps & Analysis, Main Center, Code Post, Archive, Aerology, Tournament Hall, central landmark.
- Critical UI-safe composition zones remain spatially free even though UI itself is not baked into these QA images.
- Decorative extreme-edge vegetation/sky/water may crop; critical architecture may not be repositioned.
- Every job returns exactly ONE QA image, never a contact sheet or multi-viewport board.

---

## JOB 24-01 — `hub.qa.aspect.16x9`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — sole authority for scene layout.
- **Image B:** accepted full Hub composite without UI, if available, for final visual fidelity.

### Output contract
Exactly ONE 16:9 QA composite derived from the canonical scene. Preserve full 640×360 composition and relative object coordinates.

### Generation prompt
Produce a clean 16:9 fullscreen QA reference of the accepted Hub using the exact canonical camera, horizon and object layout. Do not redraw or improve composition. Preserve the entire authored frame and leave the top HUD reserve and bottom navigation reserve visually usable without actually drawing UI. Maintain full building recognition, foreground depth and central CTA-safe composition. This is evidence of the baseline viewport, not a new artwork. Output one image only.

### Hard negatives
No moved building, no zoom compensation, no non-uniform stretch, no UI/text/guides/grid, no alternate viewport, no contact sheet/collage.

### PASS / FAIL
Any coordinate change, building crop in baseline 16:9, black margin or non-uniform scaling = FAIL.

---

## JOB 24-02 — `hub.qa.aspect.16x10`

### References
- **Image A:** `hub.geometry.lock_v1`.

### Output contract
Exactly ONE 16:10 crop reference produced by uniform cover behaviour only.

### Generation prompt
Derive the 16:10 fullscreen view from the accepted 16:9 Hub by uniform scaling and crop only. Do not redesign, vertically stretch or reposition any object. Preserve all critical architecture and the central landmark inside the visible frame. Cropping may remove only low-priority extreme-edge decoration. Keep top and bottom UI-safe regions functionally usable. Output one QA image only.

### Hard negatives
No vertical stretching, no camera tilt, no architecture compression, no new side content, no labels/UI/guides, no multi-panel comparison.

### PASS / FAIL
Any critical building partially lost, relative coordinate drift or aspect distortion = FAIL.

---

## JOB 24-03 — `hub.qa.aspect.3x2`

### References
- **Image A:** `hub.geometry.lock_v1`.

### Output contract
Exactly ONE 3:2 uniform-cover crop reference.

### Generation prompt
Create the 3:2 QA viewport by uniformly scaling the canonical Hub until the viewport is filled, then crop only the unavoidable outer edges. Preserve central campus, principal building recognition, paths, central landmark and interaction-safe composition. Do not move or resize individual elements to “fit better”. Edge foliage and non-critical distant scenery may crop. Output exactly one image.

### Hard negatives
No re-layout, no object-specific scaling, no regenerated architecture, no UI/text/grid, no collage.

### PASS / FAIL
If any major campus function becomes unrecognizable or if architecture is individually moved/rescaled = FAIL.

---

## JOB 24-04 — `hub.qa.aspect.4x3`

### References
- **Image A:** `hub.geometry.lock_v1`.

### Output contract
Exactly ONE 4:3 QA crop from the same geometry using uniform cover only.

### Generation prompt
Derive a 4:3 crop from the accepted Hub without redesign. Because the viewport is narrower, preserve the central scientific campus hierarchy and all critical hotspot buildings by relying on the predefined safe-zone—not by moving them. Decorative lateral vegetation and distant skyline edges may crop. Keep the central CTA-safe area visually clear. Output one image only.

### Hard negatives
No camera recenter that changes composition, no per-object shift, no squeeze/stretch, no new side architecture, no text/UI/guides/contact sheet.

### PASS / FAIL
Loss of critical hotspot building, non-uniform scale or visible geometry drift = FAIL.

---

## JOB 24-05 — `hub.qa.aspect.ultrawide_21x9`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** approved optional safe horizontal extension layer, only if such an extension already exists; otherwise Image A remains sole authority.

### Output contract
Exactly ONE 21:9 fullscreen QA reference using uniform scale and approved extension/crop policy only.

### Generation prompt
Create an ultrawide 21:9 QA view from the canonical Hub. Preserve the entire central 16:9 composition and all critical object coordinates. If approved non-critical horizontal extension art exists, reveal it at the sides; otherwise allow neutral decorative continuation derived from already-approved edge sky/water/vegetation only. Never invent new gameplay buildings or move central architecture to fill width. Output one image only.

### Hard negatives
No new critical architecture, no duplicated buildings, no center-scene stretching, no changed horizon height, no text/UI/grid/multi-view board.

### PASS / FAIL
Any new gameplay object outside canonical map, stretched center or shifted critical architecture = FAIL.

---

## JOB 24-06 — `hub.qa.viewport.desktop_1920x1080`

### References
- **Image A:** `hub.geometry.lock_v1`.

### Output contract
Exactly ONE QA image representing runtime cover behaviour at 1920×1080.

### Generation prompt
Render/derive the accepted Hub as it should appear in a 1920×1080 desktop viewport using the canonical uniform scaling policy. Preserve the exact 16:9 composition, avoid black/empty margins and keep all critical buildings, central landmark and foreground framing visible. Do not bake UI; the output exists to verify scene coverage and composition. Output one image only.

### Hard negatives
No bars/margins, no resampling blur, no UI/text, no object movement, no alternative design.

### PASS / FAIL
Black margins, blurred pixel scaling, changed composition or missing critical landmark = FAIL.

---

## JOB 24-07 — `hub.qa.viewport.laptop_1440x900`

### References
- **Image A:** `hub.geometry.lock_v1`.

### Output contract
Exactly ONE 1440×900 (16:10) QA crop reference.

### Generation prompt
Derive the laptop viewport using uniform cover from the canonical Hub. Preserve central safe-zone, principal buildings and foreground navigation depth. Allow only the crop implied by aspect ratio; do not compress the scene vertically or reposition elements. Keep enough visual breathing room for top HUD and bottom navigation overlays. Output one image only.

### Hard negatives
No vertical stretch, no custom reframe, no text/UI, no added edge art beyond approved decorative extension.

### PASS / FAIL
Any architecture distortion, hotspot loss or non-uniform scale = FAIL.

---

## JOB 24-08 — `hub.qa.viewport.projector_1280x800`

### References
- **Image A:** `hub.geometry.lock_v1`.

### Output contract
Exactly ONE 1280×800 classroom/projector QA reference.

### Generation prompt
Produce the projector 1280×800 view by uniform scaling/crop only. Verify broad silhouette readability at distance: major buildings must remain separable, the central landmark remains obvious, foreground railing does not dominate, and the main task/CTA safe composition remains clear for later UI. Do not alter scene density or move objects for projector readability. Output exactly one image.

### Hard negatives
No enlarged buildings, no simplified replacement art, no UI/text, no non-uniform scaling, no contrast repaint unrelated to approved projector profile.

### PASS / FAIL
If major building silhouettes merge or critical zones crop out because of an unapproved reframe = FAIL.

---

## JOB 24-09 — `hub.qa.viewport.mobile_landscape_844x390`

### References
- **Image A:** `hub.geometry.lock_v1`.

### Output contract
Exactly ONE 844×390 landscape-mobile crop reference using uniform cover.

### Generation prompt
Derive the mobile-landscape viewport from the same canonical scene using uniform cover. Preserve central campus, primary interaction buildings and central landmark; permit cropping of secondary extreme-edge vegetation and distant non-critical scenery. Do not shrink or move individual buildings to make everything fit. Keep the image readable under nearest-neighbour pixel scaling. Output one image only.

### Hard negatives
No mobile-specific redraw, no moved architecture, no text/UI, no portrait layout, no collage with desktop view.

### PASS / FAIL
Primary hotspot loss, non-uniform scaling, or object repositioning = FAIL.

---

## JOB 24-10 — `hub.qa.safezone.overlay_reference`

### References
- **Image A:** `hub.geometry.lock_v1`.

### Output contract
Exactly ONE safe-zone QA reference derived from the canonical composition. Do not draw guides, rectangles, labels or grid.

### Generation prompt
Create a clean QA reference that demonstrates the safe-zone composition through the scene itself: all critical buildings, central landmark and route-critical interaction areas remain comfortably inside the central protected composition while only low-priority scenery occupies crop-risk edges. Do not add visible guide marks; this is a visual validation of the already-authored layout. Preserve exact geometry and output one image only.

### Hard negatives
No grid, border, guide rectangle, annotations, text, UI, moved architecture, zoomed redesign or extra variants.

### PASS / FAIL
If safe-zone compliance requires moving any object or if critical architecture sits at a crop-risk edge = FAIL and the geometry lock itself must be reviewed rather than patched per viewport.

---

## Batch acceptance

- every reference is derived from one geometry authority;
- no non-uniform scaling anywhere;
- no per-viewport building movement or redesign;
- all supported desktop/projector views retain critical architecture;
- mobile landscape may crop only secondary decoration;
- no QA image contains text/guides unless a separate developer-only diagnostic artifact is intentionally created outside image-generation prompts;
- failures must feed back to geometry/safe-zone review, never be hidden by per-viewport generative edits.
