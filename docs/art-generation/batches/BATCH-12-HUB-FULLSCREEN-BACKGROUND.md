# BATCH-12 — Hub full-screen background layers

Purpose: заменить слабый текущий фон системой полноэкранных слоёв, сохранив композицию кампуса и целевой художественный стиль.

## Global prompt prefix for every job

Use the attached current Hub screenshot ONLY as camera/composition reference and the approved polished Hub artwork as STYLE reference. Modern premium pixel-art game background, crisp intentional clusters, no photographic blur, no painterly smearing, no random single-pixel noise, no vector smoothness. Strong readable masses, controlled palette, atmospheric depth, North-West / St Petersburg scientific-campus mood. No UI, no labels, no text, no people unless explicitly requested. One job = one image.

## JOB 12-01 — `hub.bg.sky.dusk`

Create exactly ONE full-screen pixel-art sky background layer, logical canvas 640×360, designed for browser `cover` crop with all important cloud structure inside the central 520×292 safe-zone. Baltic/North-West dusk: deep blue upper sky transitioning through violet and cool cyan to restrained warm peach near the horizon. Large layered cumulus and stratocumulus masses with clear pixel clusters and believable meteorological structure, not fantasy clouds. No city, water, buildings, trees, UI or text. Full opaque background.

## JOB 12-02 — `hub.bg.clouds.far`

Create exactly ONE transparent RGBA far-cloud layer aligned to the 640×360 Hub camera. Only distant thin cloud banks and a few high wisps; all other pixels transparent. Horizontal elongated forms suitable for slow parallax, cool blue-violet shadow, subtle warm sunset edge. No sky fill, city, birds, buildings, labels or UI.

## JOB 12-03 — `hub.bg.clouds.mid`

Create exactly ONE transparent RGBA middle-cloud layer, 640×360, larger and slightly darker than the far layer, with 3–5 broad cloud masses that can drift slowly. Preserve empty central areas so architecture remains readable. Crisp pixel clusters, no soft airbrush. No sky fill, city, people, UI or text.

## JOB 12-04 — `hub.bg.city_skyline`

Create exactly ONE transparent RGBA distant St Petersburg-inspired skyline layer for the Hub, 640×360 composition, low horizon, restrained historical silhouettes, domes/spires/chimneys and compact distant apartment blocks. Scientific-game fiction, not a literal landmark collage. Buildings occupy only the distant band; no foreground campus, water fill, trees, UI or text. Cool blue-gray distance palette with sparse warm windows.

## JOB 12-05 — `hub.bg.water.base`

Create exactly ONE transparent RGBA wide river/water plane layer aligned to the Hub camera. Horizontal Neva-like water band with perspective-compressed pixel ripples, cool cobalt/blue-gray base, subtle sunset color reflection. No boats, city, buildings, shoreline vegetation, UI or text. 640×360 canvas, only water pixels visible.

## JOB 12-06 — `hub.bg.water.reflections`

Create exactly ONE transparent RGBA reflection layer for the distant city and lamps on the water. Broken vertical pixel clusters, sparse warm amber and cool cyan reflections, perspective-scaled toward horizon. No solid water fill, no boats, no buildings, no UI. Must overlay `hub.bg.water.base` without changing geometry.

## JOB 12-07 — `hub.bg.campus_ground`

Create exactly ONE full-scene transparent campus ground/terrain layer, 640×360 aligned to the Hub camera: terraces, paved paths, small stairs, low retaining walls, lawn/soil masses and plaza surfaces ONLY. No buildings, trees, lamps, people, labels or UI. Clear navigable shapes suitable for placing NPC routes. Autumn North-West palette, readable pixel clusters, consistent 3/4/isometric-lite perspective.

## JOB 12-08 — `hub.bg.distant_haze`

Create exactly ONE transparent atmospheric haze layer, 640×360: subtle blue-violet mist bands separating skyline, water and campus depth. Pixel-art dithering only in controlled broad patterns; no smooth Gaussian blur. No geometry, text or objects. This layer should reduce contrast only in the far distance.

## JOB 12-09 — `hub.bg.light_window_mask`

Create exactly ONE transparent RGBA warm-light mask for architecture, 640×360 aligned to the current Hub geometry: only groups of lit windows and a few doorway glows, no walls/roofs/buildings. Amber-gold rectangular pixel clusters with varied intensity; designed for dusk/night toggling. Everything else transparent. No labels or UI.

## JOB 12-10 — `hub.bg.fullscreen_composite_reference`

Create exactly ONE polished full-screen 640×360 Hub composite REFERENCE using the same camera/framing as the current Hub but rebuilt in the approved premium pixel-art style. This is NOT a runtime final bitmap; it is the visual target for validating all separate layers. Scientific campus fills the viewport, low horizon and water/city in distance, multiple distinct functional buildings, rich but controlled autumn vegetation, warm windows, cool dusk atmosphere, readable paths, no black margins. Keep all critical buildings inside the central safe-zone. No top HUD, bottom bar, labels, text, level badges or interface. This reference must visually resemble a finished game scene even with UI disabled.

## Acceptance

- 12-01 and 12-10 are opaque; 12-02…09 use real alpha where specified;
- 640×360 logical canvas for every full-scene layer;
- no UI/text baked into background;
- no independent X/Y stretch required at runtime;
- safe-zone survives `cover` crop;
- style must match approved Hub reference, not the current rough implementation.
