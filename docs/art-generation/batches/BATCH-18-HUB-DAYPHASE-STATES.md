# BATCH-18 — Hub day-phase states, Geometry Lock v1

Purpose: dawn/day/golden hour/dusk/night must change only light and sky-state layers while preserving the same canonical Hub geometry.

## Mandatory input

Attach accepted `hub.geometry.lock_v1` as Image A. Full 640×360 canvas, origin `(0,0)`, no crop, trim, reframe, zoom or camera change.

Append to every prompt:

> Image A is authoritative for geometry. Preserve camera, horizon, building footprints, rooflines, paths, plaza, waterline and all object positions exactly. Generate only the requested lighting/celestial layer. Do not redesign or move anything. Full 640×360 canvas. No UI, labels or text.

## JOB 18-01 — `hub.dayphase.dawn.light`

Create exactly ONE full-canvas transparent RGBA dawn-light layer aligned to Image A. Cool blue ambient base with soft low warm light near horizon, very gentle long highlights, weak window/lamp activity. No new sky geometry or architecture. Full canvas.

## JOB 18-02 — `hub.dayphase.day.light`

Create exactly ONE full-canvas transparent RGBA daylight layer: bright neutral-cool daytime illumination, crisp but not harsh shadows, most artificial lights visually inactive. Preserve all geometry. No sun disc in this job, no UI/text.

## JOB 18-03 — `hub.dayphase.goldenhour.light`

Create exactly ONE full-canvas transparent RGBA golden-hour lighting layer. Warm low-angle directional highlights on roofs, facades, foliage and water; cooler long shadows; controlled amber reflections. Preserve all object geometry and exact camera. No sun disc in this job.

## JOB 18-04 — `hub.dayphase.dusk.light`

Create exactly ONE full-canvas transparent RGBA dusk-light layer. Cool blue-violet ambient shadows, warm building windows and lamp activation, restrained pink/amber residual horizon illumination. Preserve exact geometry. No UI/text.

## JOB 18-05 — `hub.dayphase.night.light`

Create exactly ONE full-canvas transparent RGBA night-light layer. Deep navy ambient, subtle cool moonlit edges, strong but controlled warm operational windows/lamps, darker vegetation. Do not erase architectural readability. Preserve exact geometry. No moon/stars in this job.

## JOB 18-06 — `hub.light.window_mask`

Create exactly ONE full-canvas transparent RGBA canonical window-light mask aligned to all building windows in Image A. Warm amber/yellow rectangular pixel clusters only; no walls, roofs, text or UI. Designed for intensity modulation by day phase. Full canvas, no trim.

## JOB 18-07 — `hub.light.lamp_glow_mask`

Create exactly ONE full-canvas transparent RGBA lamp-glow mask aligned to canonical lamp positions. Compact warm halos and reflected ground accents only; avoid airbrushed blur, use broad pixel clusters/dither. No lamp geometry itself, no text/UI.

## JOB 18-08 — `hub.celestial.sun`

Create exactly ONE full-canvas transparent RGBA sun layer with a small restrained pixel-art solar disc and minimal atmospheric halo, positioned consistently with the canonical horizon for late-afternoon/golden-hour use. No scene redraw, no clouds, no UI/text. Full canvas.

## JOB 18-09 — `hub.celestial.moon_stars`

Create exactly ONE full-canvas transparent RGBA moon-and-stars layer for night use: small moon, restrained star field, no fantasy Milky Way overload. Preserve sky framing and keep stars away from opaque architecture regions where possible. No UI/text.

## JOB 18-10 — `hub.dayphase.night_window_pattern_b`

Create exactly ONE full-canvas transparent RGBA alternate night window-activity pattern based on the same canonical window positions as 18-06: some rooms dark, some lit, small believable operational variation. Do not invent or move windows. Used to make the center feel alive over time. Full canvas, transparent elsewhere.

## Acceptance

FAIL if lighting generation changes object shape, camera, horizon or crop. PASS only if all phases can be switched by stacking/removing layers over the same canonical geometry with zero positional correction.