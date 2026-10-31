# BATCH-19 — Hub combined-state QA composites

Purpose: verify that season + weather + day-phase combinations preserve one canonical scene. These are **QA reference composites**, not runtime source assets.

## Mandatory input

Use only the accepted Geometry Lock v1 and accepted layers from BATCH-16, BATCH-17 and BATCH-18. Do not redraw or reinterpret the Hub. Every output must remain 640×360 and preserve exact camera, horizon, buildings, paths, plaza and waterline.

Append to every prompt:

> Compose the accepted canonical Hub geometry with the named accepted season, weather and day-phase layers only. Do not redesign, move, resize, crop, reframe or invent scene geometry. Exact same 640×360 camera. No UI, labels or text.

## JOB 19-01 — `hub.qa.spring_dawn_clear`

Compose one QA reference: SPRING + DAWN + CLEAR. Fresh spring vegetation, cool early-morning atmosphere, soft warm horizon light, minimal artificial lighting. Exact canonical geometry.

## JOB 19-02 — `hub.qa.spring_day_rain`

Compose one QA reference: SPRING + DAY + RAIN. Fresh vegetation, overcast/rain state, wet paths and restrained reflections, no geometry drift.

## JOB 19-03 — `hub.qa.summer_day_clear`

Compose one QA reference: SUMMER + DAY + CLEAR. Full green crowns, summer flowerbeds, bright neutral daylight, clean atmosphere. Exact same building/path placement.

## JOB 19-04 — `hub.qa.summer_golden_storm`

Compose one QA reference: SUMMER + GOLDEN HOUR + APPROACHING STORM. Summer vegetation, convective storm clouds, warm low-angle light breaking under cloud base, no lightning required. Preserve canonical geometry.

## JOB 19-05 — `hub.qa.autumn_dusk_clear`

Compose one QA reference: AUTUMN + DUSK + CLEAR. Amber/rust foliage, cool evening ambient, warm windows and lamps. This should visually match the primary target mood while preserving Geometry Lock v1 exactly.

## JOB 19-06 — `hub.qa.autumn_overcast_rain`

Compose one QA reference: AUTUMN + OVERCAST + RAIN. Autumn foliage, wet paths, restrained puddles, diffuse cool light, warm operational windows. No geometry drift.

## JOB 19-07 — `hub.qa.winter_day_snow`

Compose one QA reference: WINTER + DAY + SNOW. Bare deciduous trees, snow ground/caps, active snowfall, cold daylight. Paths/stairs remain readable and exactly aligned.

## JOB 19-08 — `hub.qa.winter_night_clear`

Compose one QA reference: WINTER + NIGHT + CLEAR. Snow accumulation, dark blue ambient, warm operational windows/lamps, moon/stars layer, no snowfall. Same canonical geometry.

## JOB 19-09 — `hub.qa.winter_dawn_fog`

Compose one QA reference: WINTER + DAWN + FOG. Snow accumulation, bare trees, cool dawn light and low river/campus fog. Preserve readability and exact geometry.

## JOB 19-10 — `hub.qa.autumn_night_rain`

Compose one QA reference: AUTUMN + NIGHT + RAIN. Autumn foliage, deep navy night, rain, wet surfaces, warm windows/lamps and restrained reflections. No geometry changes.

## QA acceptance

All ten references must overlay when toggled with zero camera movement. Automated/manual review should compare:

- horizon y-position;
- building bounding boxes from BATCH-12;
- central globe/plaza centroid;
- path intersections;
- waterline;
- foreground railing baseline.

Any shift larger than 2 logical pixels on major geometry = FAIL. Any new/missing building, changed path, changed roof pitch, changed camera or non-uniform scale = FAIL.