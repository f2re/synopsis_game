# BATCH-17 — Hub weather states, Geometry Lock v1

Purpose: погода меняет атмосферу, поверхность и световые эффекты, но **никогда не меняет геометрию сцены**.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB below is independently copy-pasteable and must be generated separately.

## Shared constants

- **Image A:** accepted `hub.geometry.lock_v1`, authoritative for camera, horizon, architecture, paths, waterline, plaza and foreground anchors.
- Full-scene weather layers use `640×360`, origin `(0,0)`, never trim.
- Weather is additive/replacement state art only; never regenerate the campus itself.
- Weather must preserve hotspot readability and task CTA hierarchy.
- One image per job; no contact sheets, weather grids or comparison collages.

---

## JOB 17-01 — `hub.weather.clear.atmosphere`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted neutral sky/haze layer if available, authoritative for depth bands.

### Output contract
Exactly ONE `640×360` transparent RGBA clear-weather atmosphere layer at origin `(0,0)`, never trimmed.

### Generation prompt
Create a low-intensity clear-weather atmosphere overlay for the accepted Hub. Preserve the exact camera and geometry. Add only subtle clean-air depth treatment: a restrained near-horizon haze band, slightly crisper distant contrast and at most a few tiny high wisps if consistent with the accepted sky system. Keep architecture, paths and waterline untouched. The effect should communicate clear weather primarily through clarity and restrained atmosphere rather than through new dramatic objects. Transparent everywhere outside weather-effect pixels. Output exactly one image.

### Hard negatives
No new major cloud system, no sun disc, no architecture/terrain repaint, no exaggerated contrast filter, no UI/text, no contact sheet/sprite sheet/grid/collage/options, no checkerboard background.

### PASS / FAIL
Any changed building/path/horizon, new large cloud mass, opaque wash or non-weather scene pixels = FAIL.

---

## JOB 17-02 — `hub.weather.overcast.clouddeck`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted cloud style from BATCH-12/21 for palette and cluster language.

### Output contract
Exactly ONE `640×360` transparent RGBA overcast cloud-deck layer at `(0,0)`.

### Generation prompt
Create a broad meteorologically plausible overcast cloud deck aligned to the accepted Hub sky. Use layered stratus/stratocumulus masses with diffuse gray-blue tonal structure, broad horizontal organization and restrained low-contrast undersides. Preserve the exact horizon and keep principal building silhouettes readable beneath the cloud layer. This job provides cloud cover only; rain, wet surfaces and fog are separate effects. Output one transparent overlay only.

### Hard negatives
No apocalyptic storm tower, no lightning, no rain streaks, no architecture repaint, no lowered horizon, no new skyline, no text/UI, no collage/contact sheet/multiple variants.

### PASS / FAIL
Cloud geometry obscures critical architecture excessively, horizon shifts, cloud style becomes fantasy/dramatic or non-cloud pixels appear = FAIL.

---

## JOB 17-03 — `hub.weather.rain.streaks`

### References
- **Image A:** `hub.geometry.lock_v1` for full-scene perspective/depth.
- **Image B:** accepted overcast/rain palette if available.

### Output contract
Exactly ONE `640×360` transparent RGBA rain-particle layer at `(0,0)`, never trimmed.

### Generation prompt
Create a restrained rain-particle overlay with fine oblique streak clusters distributed by depth. Far rain should be denser and smaller; near rain can contain a few slightly longer streaks, but overall density must remain low enough that architecture, route markers and UI-safe zones stay readable. Use cool desaturated blue-gray/white pixel strokes with crisp stepped edges and no smooth motion blur. This job contains rain particles only—wet surfaces, puddles and cloud cover are separate. Output one image only.

### Hard negatives
No wet-surface shine, no puddles, no cloud fill, no giant foreground streaks, no blur/smear, no lightning, no text/UI, no contact sheet/grid/collage/options.

### PASS / FAIL
If rain masks critical interaction areas, uses anti-aliased blur, changes scene geometry or combines unrelated weather effects = FAIL.

---

## JOB 17-04 — `hub.weather.rain.wet_surfaces`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted path/roof/railing surface masks and dusk light palette.

### Output contract
Exactly ONE `640×360` transparent RGBA wet-surface overlay at `(0,0)`.

### Generation prompt
Create a wet-surface state aligned to the exact accepted geometry of paths, stairs, roofs and selected railing/horizontal surfaces. Darken only plausible wet material areas and add restrained specular pixel highlights following existing surface orientation. Keep route edges and stair boundaries fully readable. Water and reflective accents should feel like recent/active rain, not mirror-polished surfaces. Output one transparent overlay only.

### Hard negatives
No rain streaks, no new puddle shapes in this job, no moved path edge, no flooded routes, no architecture redraw, no broad whole-frame dark filter, no text/UI, no contact sheet/collage.

### PASS / FAIL
Surface highlight outside accepted geometry, hidden path/stair boundaries, mirror-like overreflection or scene-geometry change = FAIL.

---

## JOB 17-05 — `hub.weather.rain.puddles_reflections`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted plaza/path masks and lighting sources.

### Output contract
Exactly ONE `640×360` transparent RGBA puddle/reflection overlay at `(0,0)`.

### Generation prompt
Create small shallow puddles only in plausible low spots on canonical plaza/path positions. Preserve route readability and never alter the route geometry. Each puddle uses compact dark-blue/gray fill with sparse broken warm/cool reflection clusters aligned to accepted nearby lamps/windows/sky. Keep puddles few, small and secondary to navigation. Transparent elsewhere. Output exactly one image.

### Hard negatives
No flooding, no puddle across stairs/door thresholds unless explicitly accepted, no new path shapes, no large mirror reflections, no rain particles/clouds, no text/UI, no collage/contact sheet.

### PASS / FAIL
Puddles hide route boundaries, appear on implausible surfaces, invent reflection sources or change path geometry = FAIL.

---

## JOB 17-06 — `hub.weather.fog.layer`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted depth/haze layer from BATCH-12/21.

### Output contract
Exactly ONE `640×360` transparent RGBA fog layer at `(0,0)`, never trimmed.

### Generation prompt
Create layered low-contrast fog strongest over water and the far campus, with reduced density toward foreground interaction zones. Use broad cool blue-gray pixel clusters and controlled patterned dithering, not Gaussian blur. The fog should soften distant city and background architecture while preserving main campus silhouettes and route/CTA readability. Keep the same horizon and depth logic. Output one transparent overlay only.

### Hard negatives
No opaque fog wall, no smooth blur, no hidden main buildings, no moved horizon, no new clouds, no whole-frame white wash, no text/UI, no contact sheet/collage.

### PASS / FAIL
Foreground/hotspot obscuration, anti-aliased blur, new geometry or excessive opacity = FAIL.

---

## JOB 17-07 — `hub.weather.snow.fall`

### References
- **Image A:** `hub.geometry.lock_v1` for depth/scene scale.
- **Image B:** accepted winter lighting palette if available.

### Output contract
Exactly ONE `640×360` transparent RGBA snowfall-particle layer at `(0,0)`.

### Generation prompt
Create sparse-to-moderate falling snow using depth-scaled pixel flakes. Far flakes are tiny and numerous; near flakes are slightly larger but still restrained. Distribute them naturally while leaving hotspot labels/CTA-safe areas visually clear. Use crisp white/cool-blue clusters with no soft blur. This job contains falling particles only—ground/roof accumulation belongs to BATCH-16. Output one image only.

### Hard negatives
No snow accumulation, no snowdrifts, no giant flakes covering UI, no blizzard whiteout, no blur, no geometry change, no text/UI, no contact sheet/grid/collage.

### PASS / FAIL
Accumulation appears, route/building readability collapses, particle size is inconsistent with depth or blur is used = FAIL.

---

## JOB 17-08 — `hub.weather.storm.clouds`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted cloud-language masters from BATCH-12/21.

### Output contract
Exactly ONE `640×360` transparent RGBA convective-storm cloud layer at `(0,0)`.

### Generation prompt
Create organized convective storm cloud masses in the accepted sky region: dark structured cumulonimbus/embedded convection with believable layered base, stronger vertical development than normal clouds and cool slate/violet shadow. Preserve the fixed horizon and do not redraw the campus. Keep the storm visually strong but professional and meteorologically grounded, leaving enough sky/architecture readability for gameplay. No lightning or rain in this job. Output one transparent overlay only.

### Hard negatives
No apocalyptic fantasy vortex, no tornado unless explicitly requested elsewhere, no lightning bolt, no rain streaks, no architecture recolor, no horizon shift, no UI/text, no collage/contact sheet.

### PASS / FAIL
Fantasy structure, changed scene geometry, storm covering essential interaction regions or combined lightning/rain effects = FAIL.

---

## JOB 17-09 — `hub.weather.lightning.flash_mask`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted storm-cloud state and current architecture/light masks.

### Output contract
Exactly ONE `640×360` transparent RGBA transient illumination mask at `(0,0)`.

### Generation prompt
Create a brief lightning-flash illumination overlay only. Apply cool white-violet highlight clusters to accepted cloud undersides, roof edges, water highlights and a limited number of vertical facade surfaces consistent with a distant flash. Preserve all geometry and do not draw a visible bolt unless a separate bolt asset is explicitly commissioned. Keep the effect transient and high-contrast but localized, suitable for additive blending. Output exactly one transparent overlay.

### Hard negatives
No visible bolt by default, no new light source geometry, no whole-frame white flash, no building redraw, no thunder text/icon, no UI, no contact sheet/collage.

### PASS / FAIL
Geometry changes, opaque full-frame flash, illumination on implausible surfaces or new objects = FAIL.

---

## JOB 17-10 — `hub.weather.postrain.mist`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted water/terrain depth layers.

### Output contract
Exactly ONE `640×360` transparent RGBA post-rain mist overlay at `(0,0)`.

### Generation prompt
Create a subtle post-rain mist state: low river mist bands, small cool vapor clusters near lawns/vegetation and softened far-distance contrast. Keep foreground paths and architecture crisp enough for interaction. Use broad controlled pixel clusters/dither and low opacity, with the strongest effect near water and low ground. No active rain or new cloud system. Output one transparent overlay only.

### Hard negatives
No active rain streaks, no white fog wall, no Gaussian blur, no architecture/terrain repaint, no new puddles, no text/UI, no contact sheet/collage.

### PASS / FAIL
Foreground readability loss, blur, changed geometry or combination with unrelated weather particles = FAIL.

---

## Batch acceptance

- every weather layer stacks at `(0,0)` with zero positional correction;
- no state changes building/path/horizon/waterline geometry;
- effects remain subordinate to interaction/UI hierarchy;
- one weather concept per job unless explicitly defined as a combined QA state elsewhere;
- no baked text/UI/fake meteorological data;
- all candidates require pixel cleanup, manifest/provenance registration and independent review.
