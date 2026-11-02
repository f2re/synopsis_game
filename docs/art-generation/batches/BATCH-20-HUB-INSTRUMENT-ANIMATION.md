# BATCH-20 — Hub scientific instrument animation states

Purpose: оживить главный Hub локальными научными приборами без изменения `hub.geometry.lock_v1`.

## Global contract

Use `hub.geometry.lock_v1` as Image A for every job. Camera, canvas, horizon, architecture, object anchors and scene scale are immutable. Every job returns exactly ONE PNG. Do not create contact sheets, sprite sheets, grids or multiple variants. For full-scene overlays use transparent RGBA 640×360, origin `(0,0)`, no trim. For isolated instrument states use the exact same canvas, pivot and bounding box as the accepted master of that instrument. No text, no UI, no fake meteorological data.

## JOB 20-01 — `hub.instrument.radar.rotation_a`
Create exactly ONE transparent animation state for the accepted Hub radar dish/radome mechanism. Preserve the exact base/yoke/roof attachment. Rotate ONLY the moving radar part to animation phase A; do not redraw the building. Same pivot, same scale, same perspective. Transparent outside moving pixels.

## JOB 20-02 — `hub.instrument.radar.rotation_b`
Create exactly ONE second radar rotation state from the same accepted radar master. Same geometry and pivot as 20-01; only the moving dish/antenna orientation changes. No scale drift, no new highlights unrelated to rotation.

## JOB 20-03 — `hub.instrument.radar.rotation_c`
Create exactly ONE third radar rotation state. Preserve exact support geometry and lighting family. Transparent RGBA; one state only.

## JOB 20-04 — `hub.instrument.windsock.phase_a`
Create exactly ONE transparent windsock state aligned to its accepted mast anchor. Moderate wind, fabric extended about 60–70 percent, one broad fold. Preserve pole and attachment point exactly.

## JOB 20-05 — `hub.instrument.windsock.phase_b`
Create exactly ONE alternate windsock state for the same mast, slightly different fold/extension but identical pole, pivot and canvas. No new wind direction sign or text.

## JOB 20-06 — `hub.instrument.anemometer.phase_a`
Create exactly ONE transparent cup-anemometer rotor phase A. Keep mast, housing and pivot fixed; change only cup rotor angle. Scientifically plausible three-cup geometry, crisp pixel clusters.

## JOB 20-07 — `hub.instrument.anemometer.phase_b`
Create exactly ONE second cup-anemometer rotor phase B with exact same mast/housing/pivot as 20-06. No scale or perspective change.

## JOB 20-08 — `hub.instrument.mast_beacon.off`
Create exactly ONE transparent aviation-beacon OFF state for the accepted rooftop mast. Preserve mast pixels; red beacons dark/unlit. No glow halo.

## JOB 20-09 — `hub.instrument.mast_beacon.on`
Create exactly ONE transparent aviation-beacon ON state matched pixel-for-pixel to 20-08, with only compact red beacon cores and restrained 1–2 pixel warm-red bloom. No large airbrush glow.

## JOB 20-10 — `hub.instrument.weather_balloon.launch_ready`
Create exactly ONE transparent launch-ready aerological balloon state aligned to the accepted balloon position. Balloon taut, tether vertical, compact radiosonde package, subtle movement readiness but no launch displacement. Preserve anchor and scale.

## Acceptance

- moving parts only; fixed supports do not drift;
- pivot displacement >1 logical pixel = FAIL;
- silhouette size change >1 logical pixel = FAIL;
- no baked motion blur;
- intended runtime cadence: radar 180–300 ms/state, anemometer 120–220 ms/state, beacon 700–1600 ms toggle, windsock 350–700 ms/state;
- reduced-motion mode may freeze any accepted state.
