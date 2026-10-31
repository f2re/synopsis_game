# BATCH-17 — Hub weather states, Geometry Lock v1

Purpose: weather changes must affect atmosphere and surfaces, never scene geometry.

## Mandatory input

Attach accepted `hub.geometry.lock_v1` as Image A. Full canvas 640×360, origin `(0,0)`, no crop/trim/reframe. Preserve horizon, buildings, paths, waterline and plaza exactly.

Append to every job:

> Image A is authoritative for geometry. Preserve camera, horizon, building footprints, path geometry, waterline and all object positions exactly. Generate only the requested weather effect/state layer. Do not move or redesign scene content. Full 640×360 canvas. No UI, labels or text.

## JOB 17-01 — `hub.weather.clear.atmosphere`

Create exactly ONE full-canvas transparent RGBA clear-weather atmospheric layer: very subtle clean-air contrast lift, light near-horizon haze and a few restrained high clear-sky wisps only if needed. No new cloud masses, no geometry, no text/UI. This is a low-intensity additive state.

## JOB 17-02 — `hub.weather.overcast.clouddeck`

Create exactly ONE full-canvas transparent RGBA overcast cloud-deck layer aligned to Image A. Broad layered stratocumulus/stratus ceiling, meteorologically plausible, diffuse gray-blue masses, no dramatic fantasy forms. Keep architecture visible and do not change horizon. No rain in this job. Full canvas.

## JOB 17-03 — `hub.weather.rain.streaks`

Create exactly ONE full-canvas transparent RGBA rain-particle layer. Fine oblique rain streak clusters with depth variation, denser in far/mid layers and readable but not noisy. No wet-surface highlights in this job, no clouds, no UI/text. Preserve full canvas.

## JOB 17-04 — `hub.weather.rain.wet_surfaces`

Create exactly ONE full-canvas transparent RGBA wet-surface overlay aligned to exact canonical paths, stairs, roofs and railing horizontal surfaces. Darken selected surfaces and add restrained specular pixel highlights/reflections. Do not alter geometry or add rain particles. Full canvas.

## JOB 17-05 — `hub.weather.rain.puddles_reflections`

Create exactly ONE full-canvas transparent RGBA puddle/reflection overlay on canonical plaza/path positions only. Small shallow puddle shapes and reflected warm/cool light clusters, never large enough to erase route readability. Preserve exact path geometry. No rain particles/text/UI.

## JOB 17-06 — `hub.weather.fog.layer`

Create exactly ONE full-canvas transparent RGBA fog layer. Layered low-contrast mist strongest over water and far campus, lighter near foreground. Use broad pixel clusters/dither, no smooth blur. Preserve all geometry and keep interactive foreground readable. No new objects/UI/text.

## JOB 17-07 — `hub.weather.snow.fall`

Create exactly ONE full-canvas transparent RGBA snowfall-particle layer. Sparse-to-moderate flakes with depth-scaled sizes, controlled distribution, no accumulation on surfaces. Winter accumulation belongs to BATCH-16. No geometry changes, no UI/text.

## JOB 17-08 — `hub.weather.storm.clouds`

Create exactly ONE full-canvas transparent RGBA convective-storm cloud layer aligned to Image A. Dark organized cumulonimbus/embedded convective masses occupying upper sky while preserving the same horizon and camera. Strong but professional meteorological structure, not apocalyptic fantasy. No lightning in this job, no rain, no UI/text.

## JOB 17-09 — `hub.weather.lightning.flash_mask`

Create exactly ONE full-canvas transparent RGBA lightning illumination mask only: brief cool white-violet flash affecting cloud underside, roof edges, water highlights and some vertical surfaces, aligned to canonical geometry. No visible bolt required, no new objects, no text/UI. This is a transient light FX layer.

## JOB 17-10 — `hub.weather.postrain.mist`

Create exactly ONE full-canvas transparent RGBA post-rain mist layer: low river mist, subtle ground vapor near lawns/vegetation and softened far contrast. Preserve exact scene geometry, keep routes/labels readable. No rain streaks, no new clouds, no UI/text.

## Acceptance

PASS only if every weather layer overlays the same Hub at `(0,0)` with zero positional correction. FAIL on any changed building/path/horizon, baked UI/text, cropped canvas or non-pixel-art blur.