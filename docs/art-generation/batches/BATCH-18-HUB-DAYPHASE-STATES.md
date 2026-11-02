# BATCH-18 — Hub day-phase states, Geometry Lock v1

Purpose: рассвет, день, золотой час, сумерки и ночь меняют только световые/небесные состояния при неизменной геометрии Hub.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is independently copy-pasteable and must be generated separately.

## Shared constants

- **Image A:** accepted `hub.geometry.lock_v1`, authoritative for camera, horizon, architecture, paths, waterline and object coordinates.
- Full-scene day-phase layers: `640×360`, origin `(0,0)`, never trim.
- Day phase changes light, sky/celestial and emissive state only; it never moves geometry.
- Window/lamp masks are separate from architecture.
- One image per job; no contact sheets, time-of-day grids or collages.

---

## JOB 18-01 — `hub.dayphase.dawn.light`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted neutral/dusk lighting family for material consistency.

### Output contract
Exactly ONE `640×360` transparent RGBA dawn-light overlay at origin `(0,0)`, never trimmed.

### Generation prompt
Create a dawn lighting state for the accepted Hub without changing any geometry. Use a cool blue ambient base with low warm light near the horizon, very gentle long highlights on selected roof/facade/vegetation edges, soft cool shadows and only weak residual window/lamp activity. Preserve material readability and keep the scene calm, early and slightly damp/cool rather than orange. This is a lighting overlay only; transparent where no lighting change is required. Output exactly one image.

### Hard negatives
No new sky geometry, no moved sun, no architecture repaint, no new windows/lamps, no text/UI, no contact sheet/sprite sheet/grid/collage/options, no smooth cinematic bloom.

### PASS / FAIL
Any geometry change, new light source, excessive orange wash or loss of material readability = FAIL.

---

## JOB 18-02 — `hub.dayphase.day.light`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted daytime palette/material reference if available.

### Output contract
Exactly ONE `640×360` transparent RGBA daylight overlay at `(0,0)`.

### Generation prompt
Create a bright neutral-cool daytime lighting state over the exact accepted Hub geometry. Increase ambient clarity, add crisp but not harsh directional highlights/shadows, keep most artificial window/lamp sources visually inactive, and preserve all facade/vegetation/material colors without flattening them. Do not draw the sun disc in this job. The scene must remain premium pixel art with readable broad clusters, not a washed full-frame filter. Output one transparent overlay only.

### Hard negatives
No sun disc, no new cloud state, no building recolor, no moved shadows implying different geometry, no text/UI, no contact sheet/collage, no photorealistic HDR look.

### PASS / FAIL
If architecture changes, artificial lights remain implausibly dominant, or lighting becomes a flat opaque color wash = FAIL.

---

## JOB 18-03 — `hub.dayphase.goldenhour.light`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted material/lighting family for roofs, foliage and water.

### Output contract
Exactly ONE `640×360` transparent RGBA golden-hour lighting overlay at `(0,0)`.

### Generation prompt
Create a restrained golden-hour state with low-angle warm directional highlights on accepted roof edges, facade planes, foliage tops and water reflections, balanced by cooler elongated shadow accents. Preserve all geometry and exact object positions. Use amber/peach light sparingly so the scene remains meteorological/scientific rather than romantic fantasy. Do not draw the solar disc here; celestial source is separate. Output exactly one overlay.

### Hard negatives
No geometry redesign, no whole-scene orange filter, no new shadows that imply moved objects, no sun disc, no text/UI, no collage/contact sheet/options, no soft photographic bloom.

### PASS / FAIL
If warm light overwhelms palette, shadows contradict fixed geometry or architecture is repainted = FAIL.

---

## JOB 18-04 — `hub.dayphase.dusk.light`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted canonical dusk target/style reference.

### Output contract
Exactly ONE `640×360` transparent RGBA dusk-light overlay at `(0,0)`.

### Generation prompt
Create the canonical dusk lighting state: cool blue-violet ambient shadows, restrained residual pink/amber horizon influence, gradual activation of warm operational windows and campus lamps, and subtle cool/warm reflection balance on water/metal/glass. Preserve exact building/path/object geometry. This state should match the primary Hub mood and remain coherent with accepted window/lamp masks. Output one image only.

### Hard negatives
No moved horizon, no new lamps/windows, no full-scene purple wash, no architecture redraw, no text/UI, no contact sheet/grid/collage.

### PASS / FAIL
New emissive source, geometry drift, excessive saturation or loss of building/material readability = FAIL.

---

## JOB 18-05 — `hub.dayphase.night.light`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted dusk state and window/lamp masks.

### Output contract
Exactly ONE `640×360` transparent RGBA night-light overlay at `(0,0)`.

### Generation prompt
Create a night lighting state with deep navy ambient, subtle cool moonlit edge cues, darker vegetation and strong but controlled warm operational windows/lamps. Preserve architectural silhouettes and route readability; the campus must feel active and safe, not crushed into black. Keep warm lights localized and use cool shadow clusters to maintain pixel-art depth. Do not add moon/stars in this job. Output one transparent overlay only.

### Hard negatives
No moon/stars, no new light fixtures, no black crush hiding geometry, no neon cyberpunk palette, no architecture repaint, no text/UI, no contact sheet/collage.

### PASS / FAIL
If major buildings lose silhouette recognition, new lights appear, or geometry changes = FAIL.

---

## JOB 18-06 — `hub.light.window_mask`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted architecture layers/window coordinates.

### Output contract
Exactly ONE `640×360` transparent RGBA canonical window-light mask at `(0,0)`.

### Generation prompt
Create a reusable canonical window-light mask using only already-existing accepted building windows. Represent lit windows as compact warm amber/yellow rectangular pixel clusters with slight intensity variation, preserving each opening’s exact shape/position. No wall, roof, frame or interior scene pixels should be copied except where necessary inside the openings. This mask is designed for intensity modulation by day phase. Output exactly one transparent overlay.

### Hard negatives
No new windows, no changed opening size, no wall/roof pixels, no readable interior screens/text, no glow cloud, no UI, no contact sheet/collage.

### PASS / FAIL
Any light outside accepted window mask, new window geometry or architecture pixels = FAIL.

---

## JOB 18-07 — `hub.light.lamp_glow_mask`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted lamp positions and lamp-body assets.

### Output contract
Exactly ONE `640×360` transparent RGBA lamp-glow mask at `(0,0)`.

### Generation prompt
Create compact warm lamp halos and restrained reflected ground accents aligned precisely to accepted campus lamp positions. Use broad pixel-art clusters and controlled dither rather than airbrushed circles. Keep glow size physically plausible, strongest near the fixture and rapidly diminishing so it does not invade adjacent hotspots. Do not include lamp geometry itself. Output one transparent overlay only.

### Hard negatives
No lamp posts, no new lamps, no huge bloom circles, no soft Gaussian blur, no text/UI, no contact sheet/collage/options.

### PASS / FAIL
Glow misalignment >1–2 px, excessive radius, new light source or copied lamp geometry = FAIL.

---

## JOB 18-08 — `hub.celestial.sun`

### References
- **Image A:** `hub.geometry.lock_v1` for horizon/framing.
- **Image B:** accepted golden-hour/dawn palette.

### Output contract
Exactly ONE `640×360` transparent RGBA sun layer at `(0,0)` with only solar-disc/minimal halo pixels.

### Generation prompt
Create a small restrained pixel-art solar disc positioned consistently with the canonical horizon for approved late-afternoon/golden-hour use. Use a compact warm disc with minimal stepped atmospheric halo and no scene redraw. The source should support the accepted directional lighting without becoming a decorative oversized sunset object. Transparent everywhere else. Output exactly one image.

### Hard negatives
No sky fill, no clouds, no architecture, no giant sun, no lens flare, no photoreal bloom, no text/UI, no contact sheet/collage.

### PASS / FAIL
Incorrect horizon relation, oversized disc/halo, background pixels or visual dominance over campus = FAIL.

---

## JOB 18-09 — `hub.celestial.moon_stars`

### References
- **Image A:** `hub.geometry.lock_v1` for sky framing.
- **Image B:** accepted night-light state.

### Output contract
Exactly ONE `640×360` transparent RGBA moon-and-stars layer at `(0,0)`.

### Generation prompt
Create a small moon plus restrained star field for clear-night conditions. Keep the moon compact and consistent with Hub scale, with minimal cool halo if needed. Stars are sparse grouped single/few-pixel points concentrated in unobstructed sky and must not appear over opaque architecture. Preserve visual hierarchy: night campus remains primary. Output one transparent layer only.

### Hard negatives
No giant moon, no fantasy Milky Way/nebula, no dense star noise, no architecture/sky fill, no text/UI, no collage/contact sheet.

### PASS / FAIL
Moon dominates scene, stars become noise, stars overlap architecture extensively or geometry/background appears = FAIL.

---

## JOB 18-10 — `hub.dayphase.night_window_pattern_b`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted 18-06 window mask and baseline night occupancy pattern.

### Output contract
Exactly ONE `640×360` transparent RGBA alternate night window-activity pattern at `(0,0)`.

### Generation prompt
Create a second deterministic night occupancy-light pattern using exactly the same accepted window positions as 18-06. Change only which existing windows are lit, dim or dark, with plausible building-specific operational variation. Preserve every opening’s shape and never create a new window. Keep average brightness consistent enough that switching patterns suggests subtle room activity rather than flicker. Output one transparent overlay only.

### Hard negatives
No new/moved windows, no wall/roof pixels, no random sparkle, no readable interior text/screens, no UI, no contact sheet/collage/multiple patterns.

### PASS / FAIL
Any new window, window-position drift, brightness pumping or architecture pixels = FAIL.

---

## Batch acceptance

- every lighting/celestial layer stacks at `(0,0)` with zero positional correction;
- no state changes camera, horizon, architecture, paths or waterline;
- artificial/celestial sources remain separate and reusable;
- day phases preserve material/readability hierarchy;
- one job = one image; no time-of-day comparison board is accepted;
- candidates require pixel cleanup, manifest/provenance registration and independent art/technical review.
