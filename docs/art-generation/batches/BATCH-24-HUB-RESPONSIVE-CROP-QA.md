# BATCH-24 — Hub responsive crop and safe-frame QA

Purpose: зафиксировать, что главный экран действительно работает на весь экран без растяжения и без потери ключевых объектов при разных соотношениях сторон.

## Global contract

`hub.geometry.lock_v1` remains the only geometry authority. Do NOT redesign or regenerate the campus. These jobs are QA/composition references produced from the same accepted master by crop/reframe-safe editing only. No object may move relative to another. No independent X/Y scaling. Use uniform scale + crop only. One job = one image.

## JOB 24-01 — `hub.qa.aspect.16x9`
Create exactly ONE 16:9 fullscreen QA composite from the accepted Hub master. Preserve complete 640×360 composition and verify top HUD and bottom navigation reserved zones without baking UI. No object movement.

## JOB 24-02 — `hub.qa.aspect.16x10`
Create exactly ONE 16:10 fullscreen crop reference from the same master using uniform scaling only. Preserve central safe-zone and all critical gameplay architecture. Do not stretch vertically.

## JOB 24-03 — `hub.qa.aspect.3x2`
Create exactly ONE 3:2 crop reference using uniform cover behavior. Maintain central campus and primary building recognition. Edge vegetation may crop; critical architecture may not move.

## JOB 24-04 — `hub.qa.aspect.4x3`
Create exactly ONE 4:3 crop reference from the same geometry. No redesign, no zoom compensation that changes relative sizes. Verify that central CTA safe-zone remains clear.

## JOB 24-05 — `hub.qa.aspect.ultrawide_21x9`
Create exactly ONE 21:9 fullscreen reference using the same scene geometry and uniform scale. Allow additional horizontal reveal/crop policy only if derived from master-safe extension; do not invent new critical architecture at the sides.

## JOB 24-06 — `hub.qa.viewport.desktop_1920x1080`
Create exactly ONE QA reference representing runtime `cover` on 1920×1080. No UI baked in. Mark nothing with text; this is visual crop evidence only.

## JOB 24-07 — `hub.qa.viewport.laptop_1440x900`
Create exactly ONE QA crop reference for 1440×900 with uniform scaling. Preserve all primary hotspots inside visible safe area.

## JOB 24-08 — `hub.qa.viewport.projector_1280x800`
Create exactly ONE QA crop reference for 1280×800 classroom/projector use. Preserve readability of building silhouettes and central plaza.

## JOB 24-09 — `hub.qa.viewport.mobile_landscape_844x390`
Create exactly ONE landscape-mobile crop reference using uniform cover. Critical architecture stays visible; decorative extreme edges may crop. No UI.

## JOB 24-10 — `hub.qa.safezone.overlay_reference`
Create exactly ONE QA reference derived from the accepted master showing composition with safe-zone logic visually implied by empty margins only; do NOT draw guides, text, borders or grid. Ensure important architecture stays inside the central protected composition zone.

## Acceptance

- relative object coordinates must remain invariant;
- no non-uniform scaling;
- no architecture re-layout;
- no generation of new side buildings to fill ultrawide space;
- critical objects: Radar, Maps & Analysis, Main Center, Code Post, Archive, Aerology, Tournament Hall and central landmark remain recognizable in all supported desktop/projector crops;
- mobile landscape may crop secondary edge decoration only.
