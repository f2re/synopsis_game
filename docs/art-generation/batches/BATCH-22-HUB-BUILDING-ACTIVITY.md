# BATCH-22 — Hub building activity overlays

Purpose: добавить ощущение реально работающего метеорологического центра через окна, двери и локальные внутренние сценки, **не меняя фасады и геометрию**.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is self-contained and must be generated separately.

## Shared constants

- Geometry authority: `hub.geometry.lock_v1`.
- Architecture authority: accepted BATCH-13 architecture layers.
- Output for every job: `640×360` transparent RGBA overlay, origin `(0,0)`, never trim.
- Only requested window/interior/doorway pixels may be non-transparent.
- Building silhouette, roofline, facade, stairs, door/window coordinates and camera are immutable.
- Pixel style: premium modern pixel art; small interior activity must remain subordinate to exterior architecture and UI.
- No readable fake meteorological data, labels, signs or UI.

---

## JOB 22-01 — `hub.activity.maps_room.worklight`

### References
- **Image A:** `hub.geometry.lock_v1` — authoritative for camera and exact Maps & Analysis location.
- **Image B:** accepted `hub.arch.maps_analysis_pavilion` — authoritative for glass-frame geometry and window openings.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, never trimmed. Only interior light/equipment silhouettes visible through already-existing Maps & Analysis glazing may be drawn.

### Generation prompt
Create a subtle working-state interior for the Maps & Analysis pavilion without repainting the facade. Through the accepted glass openings only, add several warm desk/work-wall light patches, dim equipment silhouettes, broad map-table shapes and small cool monitor-glow blocks that suggest active synoptic analysis. The interior must read as a professional meteorological workspace while containing no readable charts, labels, station codes or fake weather data. Keep activity visually soft enough that exterior glass frames remain dominant. Match the Hub dusk palette: warm amber interior against cool blue-gray exterior. Output exactly one overlay image.

### Hard negatives
Do not repaint window frames, roof, walls, stairs or surrounding ground. No readable map, no synoptic symbols, no text, no people outside, no new windows, no UI, no contact sheet/sprite sheet/grid/collage/multiple options, no checkerboard transparency.

### PASS / FAIL
Any facade pixel outside accepted window openings, any readable fake data, changed window geometry or opaque background = FAIL.

---

## JOB 22-02 — `hub.activity.maps_room.staff_silhouettes`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Maps pavilion and 22-01 worklight state.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay containing only 2–3 tiny staff silhouettes visible behind existing glazing.

### Generation prompt
Add 2–3 tiny interior staff silhouettes behind the accepted Maps & Analysis windows. Figures must be simplified low-detail pixel shapes appropriate to the distance: one seated or leaning over a table, one standing near a work wall, optionally one crossing behind the glass. Keep them clearly inside the building and partially occluded by existing window frames. Use muted dark-blue/brown silhouettes with restrained warm rim light. These are ambient scale cues, not character portraits. Output one image only.

### Hard negatives
No exterior people, no faces with micro-detail, no changed glass frames, no new windows, no readable screens/text, no floor outside, no contact sheet/collage/multiple variants.

### PASS / FAIL
Figures crossing outside window boundaries, figures too large to fit scene scale, facade repaint or identity-like portrait detail = FAIL.

---

## JOB 22-03 — `hub.activity.archive.window_reading`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Archive building master.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay, only inside already-existing Archive windows.

### Generation prompt
Create a quiet Archive reading-state overlay. Activate one or two existing windows with warm reading light, broad shelving/document-stack silhouettes and one tiny seated archivist silhouette. The mood is calm and scholarly, suggesting paper maps, journals and historical observations without any readable covers or text. Preserve the exact window shapes and facade; illumination should sit behind glass and not bleed across masonry. Output one transparent overlay only.

### Hard negatives
No new shelves visible outside windows, no facade change, no gothic/fantasy library treatment, no readable papers, no exterior person, no UI/text, no collage/contact sheet/options.

### PASS / FAIL
New window geometry, light spilling beyond accepted openings, readable text or building silhouette changes = FAIL.

---

## JOB 22-04 — `hub.activity.archive.door_open`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Archive facade with closed doorway.

### Output contract
Exactly ONE `640×360` transparent RGBA doorway-state overlay at `(0,0)`. Only pixels inside/at the accepted door opening may differ.

### Generation prompt
Create a subtle open-door state for the Archive. Keep the accepted doorway frame, threshold, surrounding masonry and stairs exactly aligned. Show the existing door opened slightly inward or sideways, revealing a narrow warm interior wedge with minimal depth cues—dark interior floor, one warm light plane and perhaps a tiny shelf silhouette. This is a restrained ambient state, not a new room illustration. Output exactly one overlay.

### Hard negatives
No enlarged door opening, no new doorway, no facade repaint, no people outside, no readable signs, no dramatic interior perspective, no text/UI, no multi-state sheet.

### PASS / FAIL
Doorframe shift >1 logical px, changed opening dimensions, new architecture or over-detailed room = FAIL.

---

## JOB 22-05 — `hub.activity.aerology.prep_bay`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Aerology building layer, authoritative for prep-bay glazing/openings.

### Output contract
Exactly ONE `640×360` transparent RGBA interior-only overlay.

### Generation prompt
Create an active aerological preparation-bay state visible through the accepted Aerology windows. Add warm preparation lighting, compact balloon-handling equipment silhouettes, one small cart/rack shape and one tiny operator silhouette preparing a radiosonde package. The scene should communicate upper-air sounding work even without labels, but no full balloon launch occurs in this job. Keep all activity behind glass and within existing openings. Use broad clean pixel clusters and the accepted cool/warm Hub palette. Output one image only.

### Hard negatives
No exterior balloon, no new bay door, no added roof equipment, no readable labels/data, no people outside, no facade redraw, no contact sheet/collage/options.

### PASS / FAIL
Any silhouette outside accepted windows/bay, architecture drift or fake instrument text = FAIL.

---

## JOB 22-06 — `hub.activity.code_post.controlroom`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Code Post architecture.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay restricted to accepted control-room windows.

### Generation prompt
Create a restrained active-control-room interior for the Code Post. Through the existing windows only, add sparse warm room light, a few compact cool monitor-glow rectangles, dark desk/equipment silhouettes and 1–2 tiny staff silhouettes. The result should suggest communications/operations work without showing readable telemetry, AAXX groups or fake meteorological charts. Keep contrast controlled so the building remains part of the scene rather than a glowing screen wall. Output one overlay only.

### Hard negatives
No readable screens, no text/code, no new antennas, no exterior staff, no facade repaint, no neon cyberpunk lighting, no UI/contact sheet/collage.

### PASS / FAIL
Readable fake data, window-boundary violations, excessive glow or changed architecture = FAIL.

---

## JOB 22-07 — `hub.activity.tournament.rehearsal`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Tournament Hall layer.

### Output contract
Exactly ONE `640×360` transparent RGBA interior/entrance activity overlay.

### Generation prompt
Create a low-key rehearsal/preparation state for the Tournament Hall. Through accepted windows/entrance glazing only, add restrained warm interior lighting, a few tiny distant silhouettes and simple stage/room light blocks suggesting setup before an educational competition. Keep the activity institutional and non-militarized. No banners, brackets, scoreboards or readable event signage. Preserve all facade and entrance geometry. Output exactly one transparent overlay.

### Hard negatives
No crowd outside, no trophies/signs with text, no arena UI, no new architecture, no large spotlights bleeding outside, no contact sheet/collage/options.

### PASS / FAIL
Facade change, readable event graphics, excessive brightness or activity outside the building = FAIL.

---

## JOB 22-08 — `hub.activity.main_center.lobby`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted main 26063 Main Operations Building architecture.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay limited to accepted lobby/entrance/window openings.

### Generation prompt
Create an active but calm 26063 Main Operations Building lobby state. Through the accepted entrance and nearby glazing, add warm spatial depth, a dark floor plane, 2–4 tiny staff/student silhouettes in simple groups and restrained interior fixture light. The lobby should make the central building feel occupied without becoming a focal cutscene. Keep stairs, columns, doors and facade untouched; figures remain behind the entrance plane. Output one image only.

### Hard negatives
No exterior crowd, no new door, no readable reception signs, no banners, no facade repaint, no UI/text, no contact sheet/collage.

### PASS / FAIL
Silhouettes outside lobby, architectural drift, oversized figures or readable signage = FAIL.

---

## JOB 22-09 — `hub.activity.greenhouse.lablight`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted greenhouse/environmental lab architecture.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay restricted to existing glass panes/interior openings.

### Generation prompt
Create a warm working-state overlay for the greenhouse/environmental observation lab. Add localized bench lights, subtle plant silhouettes, instrument-table forms and one tiny researcher silhouette seen through existing glass. Keep the interior readable as a scientific workspace rather than a decorative conservatory. Preserve all metal/glass frame geometry and do not repaint panes outside illuminated regions. Output one transparent overlay only.

### Hard negatives
No new plants outside, no facade change, no oversized greenhouse glow, no readable labels/screens, no people outside, no UI/text, no contact sheet.

### PASS / FAIL
Frame geometry change, exterior vegetation insertion, excessive glow or fake readable data = FAIL.

---

## JOB 22-10 — `hub.activity.windows.random_alt`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted architecture/window-light baseline and existing window coordinates.

### Output contract
Exactly ONE `640×360` transparent RGBA alternate full-campus window-light mask. Only already-existing window pixels may light/dim.

### Generation prompt
Create a deterministic alternate occupancy-light state for the entire campus. Use exactly the existing accepted window positions; choose a different but plausible subset of windows to be warm-lit, dim or dark compared with the baseline. Maintain building-specific character: operational areas may have more active windows, archive/research wings fewer, and no window may appear where none exists. Keep light clusters compact and consistent with dusk/night pixel-art lighting. This is a mask/state asset, not a scene repaint. Output one image only.

### Hard negatives
No new windows, no changed window size, no wall/roof pixels, no random noisy sparkle, no readable signs, no text/UI, no contact sheet/collage/multiple variants.

### PASS / FAIL
Any light outside accepted window masks, any new window geometry or architecture pixels = FAIL.

---

## Batch acceptance

- every output is full-canvas `640×360` at `(0,0)` and never trimmed;
- facade pixels outside intended openings remain transparent;
- no job invents readable data or text;
- tiny figures stay subordinate and correctly scaled;
- switching activity states never changes building silhouette;
- reduced-motion can freeze any accepted state;
- all candidates require pixel cleanup, provenance/manifest registration and independent review before runtime use.
