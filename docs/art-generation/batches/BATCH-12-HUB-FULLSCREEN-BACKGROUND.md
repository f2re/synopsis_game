# BATCH-12 — Hub canonical fullscreen master + background layers

Status: **GEOMETRY LOCK v1**. This batch is authoritative for the first/main Hub screen.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every numbered JOB below is self-contained and must be sent to ChatGPT Images separately. Never send the whole batch as one generation request.

## Canonical scene constants

- logical canvas: **640×360 px**;
- origin: top-left `(0,0)`;
- aspect ratio: **16:9**;
- runtime fullscreen: uniform `cover` only, never independent X/Y stretching;
- gameplay safe zone: **x=48..592, y=42..315**;
- top HUD reserve: approximately `y=0..42`;
- bottom navigation reserve: approximately `y=315..360`;
- fixed elevated wide camera, slightly top-down; NOT isometric/fisheye/cinematic tilt;
- vertical building edges remain vertical;
- visual vanishing focus approximately `(320,100)`;
- roof depth approximately 20–30% of visible building height;
- horizon: **y=92 ±2 px**;
- water band: approximately **y=92..147**;
- main architecture: approximately **y=108..294**;
- foreground framing: approximately **y=274..360**.

Locked semantic regions:

| Zone | Region on 640×360 canvas |
|---|---|
| Radar | `x=38..178, y=66..174` |
| Maps & Analysis | `x=34..208, y=145..287` |
| 26063 main operations building | `x=205..433, y=111..264` |
| Aerology | `x=438..600, y=106..221` |
| Archive | `x=351..490, y=182..289` |
| Tournament Hall | `x=492..634, y=180..301` |
| Code Post / glass lab | `x=260..397, y=203..301` |
| Central globe/plaza | `x=246..394, y=229..329` |
| Foreground railing | mostly `y=286..352` |

Style lock: modern premium pixel art; crisp intentional clusters; coherent cluster scale; controlled selective outlines; no painterly smear, photographic texture, vector-smooth edges or random single-pixel noise. North-West / St Petersburg scientific-campus mood; cool navy/blue-violet ambient shadows and restrained warm operational light. No UI, labels, level badges or readable text inside art layers.

---

## JOB 12-01 — `hub.geometry.lock_v1`

### References
- **Image A:** current approved Hub screenshot/composition reference — use only to preserve useful scene intent and functional-zone relationships, not its rough rendering quality.
- **Image B:** approved polished project pixel-art reference — authoritative for pixel-cluster language, material quality, atmosphere and palette discipline.

### Output contract
Return exactly **ONE opaque 640×360 PNG**, origin `(0,0)`, no trim, no borders and no black/empty margins. This image becomes the canonical geometry master; it is not a transparent overlay. Critical architecture must stay inside the declared safe zone and locked semantic regions.

### Generation prompt
Create the canonical fullscreen geometry master for the main Hub of the meteorological educational game. Fix a wide elevated camera with horizon at y≈92 and low distant water/city band. Arrange the campus exactly as a reusable game scene: Radar in `x=38..178,y=66..174`; Maps & Analysis in `x=34..208,y=145..287`; the largest 26063 main operations building in `x=205..433,y=111..264`; Aerology in `x=438..600,y=106..221`; Archive in `x=351..490,y=182..289`; Tournament Hall in `x=492..634,y=180..301`; Code Post/glass lab in `x=260..397,y=203..301`; central scientific globe/plaza in `x=246..394,y=229..329`; nearest railing/vegetation frames the lower foreground without hiding the plaza. Use a St Petersburg/North-West river-city context, believable paths/stairs/terraces and compact scientific architecture. Lighting should be neutral dusk/golden-hour-compatible so later layers can shift time of day. Geometry consistency is more important than decorative detail. Output exactly one finished reference image.

### Hard negatives
Do not create UI, top HUD, bottom navigation, labels, building names, level numbers, readable signs, portraits or CTA. Do not use isometric/fisheye/tilted cinematic camera. Do not place alpine mountains or fantasy campus architecture. Do not crop critical buildings, add black margins, create a collage, contact sheet, sprite sheet, grid, comparison board or multiple variants. No photorealism, painterly brushwork, smooth vector illustration or fake checkerboard transparency.

### PASS / FAIL
PASS only if canvas is exactly 640×360, horizon is y=92±2, all principal masses remain inside locked regions, foreground does not block central plaza, scene fills the frame and style matches premium project pixel art. Camera drift, missing/extra major building, changed region layout, black margins, baked UI/text or multi-image output = FAIL.

---

## JOB 12-02 — `hub.bg.sky.base`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — authoritative for canvas, horizon and framing.
- **Image B:** approved Hub style/palette reference — authoritative for pixel-art sky treatment.

### Output contract
Exactly **ONE opaque 640×360 PNG**, origin `(0,0)`, never trimmed. This is the base sky layer only; it deliberately contains no clouds or foreground scene objects.

### Generation prompt
Create the reusable base-sky layer for the accepted Hub camera. Preserve the exact 640×360 frame and horizon y≈92 from Image A. Fill the sky with a calm North-West/Baltic dusk-neutral gradient rendered through deliberate pixel-art color bands and broad cluster transitions: cool deep blue upper sky, restrained violet/cyan middle transition and mild warm peach/amber near-horizon influence. Keep the treatment neutral enough for later dawn/day/night overlays and do not bake a dramatic sunset event into the base. The sky must extend behind all later architecture and crop safely under fullscreen `cover`. Output exactly one opaque sky image.

### Hard negatives
No clouds, sun, moon, stars, skyline, water, buildings, trees, birds, haze object, UI, text or labels. No Gaussian blur, photographic gradient, vector-smooth banding, random dithering noise, contact sheet, grid, collage or multiple options. Do not move the horizon or change canvas/crop.

### PASS / FAIL
Horizon relation must match Image A, sky must cover the complete 640×360 frame and contain only sky color treatment. Any scene object, cloud/celestial body, black margin, camera change or multi-image output = FAIL.

---

## JOB 12-03 — `hub.bg.clouds.far`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — authoritative for horizon, sky band and architecture-safe regions.
- **Image B:** approved pixel-art cloud/style reference if available — authoritative for cluster scale and meteorological form language.

### Output contract
Exactly **ONE transparent RGBA 640×360 PNG**, origin `(0,0)`, never trimmed. Only far-cloud pixels may be non-transparent; all other pixels must have real alpha transparency.

### Generation prompt
Create a distant cloud layer aligned to the canonical Hub. Place low-contrast stratocumulus/cumulus banks mainly around `y=35..105`, with horizontally elongated forms suitable for distant parallax and the low Baltic horizon. Use meteorologically plausible layered cloud masses, broad stepped pixel contours, cool blue-violet shadow groups and restrained warm horizon-facing edges. Preserve open negative space above critical campus architecture and keep cloud contrast lower than the later mid-cloud layer. Do not alter any geometry from Image A. Output one full-canvas transparent overlay only.

### Hard negatives
No sky fill, city, water, buildings, birds, sun/moon, rain, lightning, UI, text or labels. No fantasy towers, airbrush blur, vector smoothness, random single-pixel cloud noise, fake checkerboard, trim/recenter, contact sheet, sprite sheet, grid, collage or multiple variants.

### PASS / FAIL
Clouds must remain in the accepted sky/depth band and architecture-safe composition. Any non-cloud scene pixel, opaque background, horizon/camera drift, excessive foreground-scale cloud mass or multi-image output = FAIL.

---

## JOB 12-04 — `hub.bg.clouds.mid`

### References
- **Image A:** accepted `hub.geometry.lock_v1` for camera/horizon/safe-zone.
- **Image B:** accepted far-cloud layer and approved cloud style for scale/lighting continuity.

### Output contract
Exactly **ONE transparent RGBA 640×360 PNG**, origin `(0,0)`, no trim. Only 3–5 mid-level cloud masses are visible.

### Generation prompt
Create the middle-cloud layer for the canonical Hub: 3–5 broader, slightly darker and more dimensional cloud masses mainly within `y=10..105`. Use believable cumulus/stratocumulus structure with stepped contours, grouped highlights and cool blue-violet undersides. Preserve generous breathing space above the central 26063 main operations building and other major architecture so the scene remains readable and UI-safe. This layer is intended for slow parallax, so shapes must be coherent and separated rather than one continuous ceiling. Match Image A exactly in canvas and camera. Output one transparent overlay only.

### Hard negatives
No sky fill, skyline, water, buildings, birds, precipitation, lightning, UI/text, fantasy supercell, smooth blur, vector edges, trim, contact sheet/grid/collage/options or additional alternate cloud states.

### PASS / FAIL
PASS only if clouds remain visually subordinate to campus and contain real alpha outside cloud pixels. Major architecture occlusion, cloud count outside 3–5, opaque background, geometry drift or multiple images = FAIL.

---

## JOB 12-05 — `hub.bg.city_skyline`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — authoritative for horizon y≈92 and distant-city scale.
- **Image B:** approved North-West/St Petersburg mood reference — style only, not literal landmark copying.

### Output contract
Exactly **ONE transparent RGBA 640×360 PNG**, origin `(0,0)`, never trimmed. Non-transparent pixels are restricted to the distant city band around `y≈77..123`.

### Generation prompt
Create the distant city skyline across the river for the canonical Hub. Preserve the locked horizon and distant scale. Use restrained St Petersburg/North-West-inspired urban silhouettes: low classical roof rhythm, a few modest spires/domes/chimneys, compact institutional and residential masses, sparse warm windows and cool blue-gray atmospheric perspective. The skyline must feel believable but fictional rather than a collage of famous monuments. Keep vertical detail simplified enough to read at distance and remain subordinate to campus architecture. Output one aligned transparent layer only.

### Hard negatives
No campus buildings, water fill, foreground trees, bridge dominating the scene, literal landmark collage, readable signs, UI/text, photoreal city texture, giant cathedral/tower focal point, moved horizon, trim, contact sheet/grid/collage/multiple variants.

### PASS / FAIL
Skyline baseline/scale must align with Image A; city must remain distant and secondary. Horizon shift >2 px, foreground-scale building, literal tourist-landmark dominance, opaque background or unrelated scene pixels = FAIL.

---

## JOB 12-06 — `hub.bg.water.base`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — authoritative for river polygon/band approximately `y=92..147` and shoreline perspective.
- **Image B:** approved Hub palette for water material language.

### Output contract
Exactly **ONE transparent RGBA 640×360 PNG**, origin `(0,0)`, no trim. Only base-water pixels may be visible; all non-water areas are transparent.

### Generation prompt
Create the neutral river/water base aligned to the exact accepted water band. Use a cool cobalt/blue-gray body with restrained broad horizontal color variation and perspective-compressed ripple structure, smaller and denser toward the horizon and slightly broader toward the near edge. Keep the base calm enough for separate animated ripple/reflection overlays and later weather states. Preserve shoreline/waterline geometry pixel-for-pixel from Image A. Output exactly one full-canvas transparent water layer.

### Hard negatives
No city, boats, birds, buildings, shoreline vegetation, solid sky, strong lamp reflections, rain, foam, waves, text/UI, blur, changed shoreline, trim, checkerboard, contact sheet/collage/options.

### PASS / FAIL
Any water pixel outside accepted river region, shifted waterline, scene objects, excessive animated-looking highlights or opaque background = FAIL.

---

## JOB 12-07 — `hub.bg.water.reflections`

### References
- **Image A:** accepted `hub.geometry.lock_v1` for water region and distant source alignment.
- **Image B:** accepted city/window/lamp light sources and base-water layer.

### Output contract
Exactly **ONE transparent RGBA 640×360 PNG**, origin `(0,0)`, never trimmed. This layer contains reflection pixels only; no solid water base.

### Generation prompt
Create the canonical static reflection layer for the accepted river. Align sparse warm amber and cool cyan reflection sources beneath the accepted distant city/operational-light positions. Use broken vertical-to-slightly-diagonal pixel columns, increasingly compressed toward the horizon, with empty water between reflection groups. Keep brightness restrained because animated breakup states are produced later in BATCH-21. Preserve exact water geometry and source coordinates. Output exactly one transparent reflection overlay.

### Hard negatives
No solid water fill, new lamp/window source, mirrored building image, boat, shoreline, architecture, sky, text/UI, smooth blur, large bloom, trim, contact sheet/grid/collage/options.

### PASS / FAIL
Reflection source misalignment >2 px, reflection outside water region, excessive mirror-like detail, opaque background or unrelated scene pixels = FAIL.

---

## JOB 12-08 — `hub.bg.campus_ground`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — authoritative for paths, stairs, terraces, plaza and terrain boundaries.
- **Image B:** approved ground/material reference for pixel-art stone/lawn/soil language.

### Output contract
Exactly **ONE transparent RGBA 640×360 PNG**, origin `(0,0)`, no trim. Only season-neutral campus terrain/path pixels may be visible.

### Generation prompt
Create the season-neutral campus ground layer from the exact geometry of Image A. Include paved paths, plaza surfaces, small stairs, terraces, low retaining walls, lawn and soil masses while preserving every principal route intersection and central-plaza footprint. Use readable broad material clusters in the fixed 3/4 camera: cool blue-gray paving/stone, restrained neutral lawn/soil bases ready for seasonal replacement overlays. Keep surfaces clean enough to support NPC route readability and later snow/leaves/wetness layers. Output one aligned transparent layer only.

### Hard negatives
No buildings, trees, lamps, people, fallen autumn leaves, snow, puddles, weather, text/UI, redesigned path, additional stair, crop/trim, contact sheet/collage/options.

### PASS / FAIL
Any path/plaza/stair boundary change, baked season/weather detail, scene-object contamination, origin drift or opaque non-ground background = FAIL.

---

## JOB 12-09 — `hub.bg.depth_haze`

### References
- **Image A:** accepted `hub.geometry.lock_v1` for depth bands.
- **Image B:** accepted skyline/water/campus layers for contrast relationships.

### Output contract
Exactly **ONE transparent RGBA 640×360 PNG**, origin `(0,0)`, never trimmed. Only atmospheric depth-haze pixels may be visible.

### Generation prompt
Create a subtle canonical atmospheric depth layer separating distant skyline, water and campus without blurring the pixel art. Concentrate low-opacity blue-violet haze near the city/water transition and in selected far/mid depth bands, reducing it toward the foreground. Use broad clustered dithering patterns rather than Gaussian blur or random noise. Preserve the exact camera/horizon and leave principal foreground architecture crisp. This layer should be barely noticeable alone but improve depth when stacked. Output exactly one transparent overlay.

### Hard negatives
No whole-frame color wash, fog wall, smooth blur, buildings, skyline redraw, water fill, UI/text, random single-pixel dither, trim, contact sheet/grid/collage/options.

### PASS / FAIL
Foreground contrast loss, geometry pixels, opaque wash, noisy dither, horizon shift or non-transparent background = FAIL.

---

## JOB 12-10 — `hub.reference.dusk_composite_v1`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — absolute authority for camera, regions, paths and crop.
- **Image B:** approved polished Hub/project style reference — authority for art quality, palette and atmosphere.
- **Accepted layer candidates:** BATCH-12 layers if already available; use only where approved.

### Output contract
Exactly **ONE opaque 640×360 QA/reference composite**, origin `(0,0)`, no trim and no black margins. This is a visual target for review, not a replacement for layered runtime assembly.

### Generation prompt
Create the polished canonical dusk/golden-hour Hub reference while preserving Image A geometry exactly. Keep the same horizon, locked building regions, path/plaza network, waterline and foreground framing. Improve only visual execution: coherent premium pixel clusters, richer yet controlled materials, layered North-West vegetation, distant river/city depth, cool blue-violet atmospheric shadow, restrained warm operational windows/lamps and subtle water reflections. Every functional building must remain recognizable without text and the entire scene must feel like a finished game screen even with UI disabled. Do not move or resize any object to improve composition. Output exactly one reference image.

### Hard negatives
No UI, labels, building names, level badges, navigation, CTA, text, new/missing building, changed path/roof pitch/horizon, non-uniform stretch, painterly/photo/vector style, black margins, collage/contact sheet/grid or multiple variants.

### PASS / FAIL
Compare to Image A at logical resolution. Any major geometry shift >2 px, changed building footprint, path/plaza drift, altered horizon/camera, baked UI/text or style regression = FAIL. PASS only when it can serve as visual QA while `hub.geometry.lock_v1` remains the geometry authority.

---

## Batch acceptance

- 12-01 is accepted before dependent Hub generation begins;
- all full-scene layers remain 640×360 and aligned at `(0,0)`;
- no transparent layer is trimmed;
- horizon/camera/path/building geometry remain stable within declared tolerances;
- no UI/text is baked into scene art;
- fullscreen requires only uniform `cover`, never independent X/Y stretching;
- every candidate receives pixel cleanup, provenance/manifest registration and independent pixel-art + Art Director review before production use.
