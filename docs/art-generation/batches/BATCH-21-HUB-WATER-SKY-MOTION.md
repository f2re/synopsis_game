# BATCH-21 — Hub water and sky motion layers

Purpose: дать первому экрану спокойное движение воздуха, воды и дальнего плана без перерисовки `hub.geometry.lock_v1`.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is a self-contained image-generation/edit prompt. Send **one JOB per generation call**.

## Shared constants

- Canonical canvas: `640×360`, origin `(0,0)`, never trim.
- Image A for every job: accepted `hub.geometry.lock_v1`, authoritative for camera, horizon, skyline band, water band and architecture-safe regions.
- Motion assets are transparent RGBA overlays; they contain only the requested moving atmospheric/water pixels.
- Pixel style: modern premium pixel art; broad coherent clusters; controlled dithering only; no Gaussian blur, vector smoothness or photographic texture.
- Runtime intent: low-amplitude, low-cadence ambient motion that never competes with CTA or building labels.

---

## JOB 21-01 — `hub.sky.cloud_far.phase_a`

### References
- **Image A:** `hub.geometry.lock_v1` for exact horizon and architecture-safe areas.
- **Image B:** accepted far-cloud master from BATCH-12, if available; use it as identity/shape authority.

### Output contract
Exactly ONE `640×360` transparent RGBA PNG, origin `(0,0)`, never trimmed. Only distant far-cloud pixels may be visible.

### Generation prompt
Create phase A of the far-cloud layer for the accepted Hub. Keep all cloud masses confined to the distant sky band above the fixed skyline, leaving the critical campus silhouette and hotspot-safe areas visually clear. Use long, horizontally stretched stratiform/stratocumulus banks and a few restrained high wisps appropriate to a North-West/Baltic atmosphere. Forms must be low-contrast, depth-separated and rendered as broad deliberate pixel clusters with cool blue-violet shadow and subtle warm horizon edge. This is an overlay only: transparent everywhere outside the clouds. Output exactly one image and one phase.

### Hard negatives
No sky fill, buildings, skyline, water, birds, sun/moon, UI, text, labels, contact sheet, sprite sheet, grid, collage, comparison or multiple options. No soft airbrush blur, no random dither noise, no cloud mass crossing deep into architecture.

### PASS / FAIL
Clouds must align to accepted sky band and remain subordinate. Any architecture/sky-fill pixels, opaque background, geometry change or contact-sheet output = FAIL.

---

## JOB 21-02 — `hub.sky.cloud_far.phase_b`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted 21-01 phase A — authoritative for cloud identity and count.

### Output contract
Exactly ONE `640×360` transparent RGBA phase B, same full canvas and origin.

### Generation prompt
Create phase B as a minimal edit of 21-01. Preserve the number, scale, altitude and overall silhouette family of every far-cloud mass. Shift the accepted cloud banks horizontally by only 2–4 logical pixels in a single coherent direction, with at most minor 1-pixel edge evolution where needed to avoid mechanical translation. Do not create or remove a cloud system. Keep the same contrast, palette, opacity hierarchy and architecture-safe gaps. Transparent everywhere outside cloud pixels. Output exactly one phase.

### Hard negatives
No new clouds, no cloud disappearance, no vertical jump, no camera/horizon change, no sky fill, no buildings, no birds, no UI/text, no blur, no collage/contact sheet/multiple variants.

### PASS / FAIL
A↔B alternation must read as slow drift, not morphing. Any displacement >4 px for principal masses, vertical shift >1 px, cloud-count change or geometry contamination = FAIL.

---

## JOB 21-03 — `hub.sky.cloud_mid.phase_a`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted mid-cloud master from BATCH-12 if available.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay, no trim, containing only mid-level cloud pixels.

### Generation prompt
Create phase A of the mid-cloud layer: 3–5 larger cloud masses with stronger form than the far layer but still subordinate to architecture and UI. Preserve broad empty corridors above the principal campus buildings and central CTA-safe composition. Use believable cumulus/stratocumulus structure with stepped pixel contours, grouped highlights and cool blue-violet undersides. Avoid fantasy towering clouds. Keep the layer transparent outside cloud pixels and maintain the accepted fixed camera/horizon.

### Hard negatives
No solid sky, no city, no weather particles, no lightning, no buildings, no birds, no text/UI, no smooth brush blur, no extra variants/contact sheet/grid.

### PASS / FAIL
Only mid-cloud pixels may exist. If clouds obscure major architecture silhouettes, exceed intended contrast, or introduce non-cloud pixels = FAIL.

---

## JOB 21-04 — `hub.sky.cloud_mid.phase_b`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted 21-03 phase A.

### Output contract
Exactly ONE `640×360` transparent RGBA phase B, same origin and canvas.

### Generation prompt
Create a restrained second motion phase of the exact same mid-cloud system. Shift principal cloud masses horizontally by 3–6 logical pixels while preserving altitude, mass identity, overall area and architecture-safe negative spaces. Allow only tiny edge-cluster evolution, not a redesign. Maintain the same palette, lighting, cloud count and opacity relationships. Output one phase only, transparent elsewhere.

### Hard negatives
No vertical jump, no cloud count change, no storm transformation, no extra cloud bank, no sky fill, no architecture, no text/UI, no contact sheet/sprite sheet/collage/options.

### PASS / FAIL
Principal mass centroid shift >6 px, vertical shift >1 px, identity drift or new occlusion of critical buildings = FAIL.

---

## JOB 21-05 — `hub.water.ripple.phase_a`

### References
- **Image A:** `hub.geometry.lock_v1` for exact river mask and perspective.
- **Image B:** accepted water base from BATCH-12.

### Output contract
Exactly ONE `640×360` transparent RGBA ripple-highlight overlay. Only water-ripple highlight pixels visible; no solid base water.

### Generation prompt
Create phase A of subtle river-surface ripples inside the exact accepted water polygon. Use short, mostly horizontal pixel clusters compressed toward the horizon and slightly broader/longer toward the viewer, consistent with the fixed perspective. Highlights should be sparse cool cyan/blue-white with a few restrained warm sunset accents only where the accepted lighting would support them. The layer must make the water feel alive without becoming noisy or sparkling excessively. Transparent outside ripple pixels.

### Hard negatives
No new shoreline, no water fill, no boats, no foam field, no vertical rain streaks, no city reflections beyond requested ripple accents, no architecture, no UI/text, no blur, no contact sheet/grid/collage.

### PASS / FAIL
Any pixel outside accepted water region, excessive high-frequency noise, perspective-inconsistent vertical marks or opaque background = FAIL.

---

## JOB 21-06 — `hub.water.ripple.phase_b`

### References
- **Image A:** `hub.geometry.lock_v1` and accepted water mask.
- **Image B:** accepted 21-05 ripple phase A.

### Output contract
Exactly ONE `640×360` transparent RGBA phase B.

### Generation prompt
Create the second ripple phase by subtly shifting and breaking the accepted phase-A highlight clusters by approximately 1–3 logical pixels within the same river mask. Preserve density, perspective scaling, palette and overall brightness. Do not introduce new large highlight zones; the goal is a calm low-cadence shimmer when A/B alternate. Transparent everywhere except ripple highlights.

### Hard negatives
No shoreline changes, no new reflection sources, no broad wave redesign, no architecture or sky pixels, no text/UI, no blur, no multi-frame sheet/collage/options.

### PASS / FAIL
A/B must feel like surface motion without brightness pumping. More than 3 px displacement for major highlight clusters or any off-water pixels = FAIL.

---

## JOB 21-07 — `hub.water.reflection.phase_a`

### References
- **Image A:** `hub.geometry.lock_v1` for city/lamp source coordinates and water region.
- **Image B:** accepted city/window/lamp lighting state and water base.

### Output contract
Exactly ONE `640×360` transparent RGBA reflection overlay; no solid water fill.

### Generation prompt
Create reflection phase A using only broken vertical-to-slightly-diagonal pixel columns beneath accepted warm city/window/lamp sources plus sparse cool cyan sky reflections. Every reflection source must align spatially with the accepted light source above the water. Compress and fragment columns toward the horizon; widen slightly toward the foreground while remaining subtle. Keep empty water between reflection clusters. Output exactly one transparent overlay.

### Hard negatives
No reflection under nonexistent light sources, no new lamps/windows, no solid water repaint, no boats, no text/UI, no soft blur, no symmetrical mirror image, no contact sheet/collage/options.

### PASS / FAIL
Source misalignment >2 logical px, reflection in non-water area, mirrored-building shapes or excessive opacity = FAIL.

---

## JOB 21-08 — `hub.water.reflection.phase_b`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted 21-07 phase A.

### Output contract
Exactly ONE `640×360` transparent RGBA reflection phase B.

### Generation prompt
Create phase B from the exact same reflection sources as 21-07. Keep source anchors fixed and change only fragmentation: break some columns into adjacent 1–2 px clusters, shift local fragments by 1–3 px, and slightly redistribute intensity while preserving average brightness and source-to-water alignment. The result should animate as gentle water breakup, not as moving lamps. Transparent outside reflection pixels.

### Hard negatives
No source movement, no new reflection source, no whole-column translation, no water repaint, no buildings, no UI/text, no blur, no multiple variants in one image.

### PASS / FAIL
If reflection anchors appear to move laterally with respect to light sources, if brightness changes dramatically, or if non-water pixels appear = FAIL.

---

## JOB 21-09 — `hub.atmosphere.haze.phase_a`

### References
- **Image A:** `hub.geometry.lock_v1` for depth bands.
- **Image B:** accepted distant-haze layer from BATCH-12 if available.

### Output contract
Exactly ONE `640×360` transparent RGBA atmospheric overlay, origin `(0,0)`, no trim.

### Generation prompt
Create distant-haze phase A that separates skyline, river and campus depth without blurring the pixel art. Use broad low-opacity blue-violet pixel/dither bands concentrated near the distant skyline/water transition and reduced toward foreground architecture. Keep haze spatially coherent and sparse, with controlled patterned dithering rather than noise. The effect should lower distant contrast while leaving the campus readable. Transparent outside haze pixels.

### Hard negatives
No Gaussian blur, no fog wall hiding buildings, no opaque color wash across entire frame, no architecture/skyline redraw, no text/UI, no contact sheet/collage/options.

### PASS / FAIL
If foreground contrast is strongly reduced, pixel clusters turn into random noise, or any geometry is repainted = FAIL.

---

## JOB 21-10 — `hub.atmosphere.haze.phase_b`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted 21-09 phase A.

### Output contract
Exactly ONE `640×360` transparent RGBA alternate haze phase.

### Generation prompt
Create phase B by subtly redistributing haze density within the exact same accepted depth zones. Keep the skyline/water depth relationship and all scene geometry unchanged. Shift only small dither clusters and local opacity emphasis enough to create barely perceptible atmospheric breathing at low cadence. Preserve overall average opacity and do not create visible moving fog blobs. Output one transparent overlay only.

### Hard negatives
No geometry change, no new fog bank, no foreground wash, no blur, no text/UI, no sky/water repaint, no contact sheet/grid/collage.

### PASS / FAIL
Haze A/B should be nearly interchangeable as still images; movement must be subtle. Large opacity pumping, new fog mass or any geometry contamination = FAIL.

---

## Batch acceptance

- all outputs are full `640×360` overlays at `(0,0)` and never trimmed;
- no architecture pixels occur in BATCH-21 layers;
- alternating A/B states creates no visible spatial jump;
- clouds preserve architecture-safe negative space;
- water effects never escape the accepted river mask;
- reduced-motion freezes phase A cleanly;
- every candidate passes pixel cleanup, manifest registration and independent art/technical review before runtime use.
