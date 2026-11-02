# BATCH-26 — Final Hub assembly QA composites

Purpose: финально проверить, что первый экран собирается из независимых слоёв в цельную стабильную сцену без геометрического дрейфа.

## Global contract

Every job must use only accepted assets from BATCH-12…25 and `hub.geometry.lock_v1`. Do not invent new architecture, vegetation, props, characters or UI. Composite with exact origin/pivots. One job = one image. These outputs are QA references, not runtime source bitmaps unless separately approved.

## JOB 26-01 — `hub.qa.base_no_ui`
Create exactly ONE final base composite of the Hub with no UI: accepted sky, clouds, skyline, water, ground, architecture, landmark overlays, vegetation, props and static ambient assets. Dusk/autumn baseline. No labels, no HUD, no bottom navigation. Geometry must match master exactly.

## JOB 26-02 — `hub.qa.base_with_npcs`
Create exactly ONE composite identical to 26-01 but with accepted player/NPC/animal sprites placed on approved routes and depth layers. At least one sprite must be partially occluded by foreground railing or vegetation. No UI.

## JOB 26-03 — `hub.qa.base_with_activity`
Create exactly ONE composite identical to 26-02 with accepted building activity overlays, instrument states, water/cloud motion phase A and window/lamp states. No new art.

## JOB 26-04 — `hub.qa.full_ui_default`
Create exactly ONE full first-screen composite using accepted base scene plus approved UI chrome placeholders for top HUD, bottom navigation, hotspot plates and central CTA. Runtime text may be represented only by neutral blank blocks; do not generate readable text. This verifies visual hierarchy and occlusion only.

## JOB 26-05 — `hub.qa.hover_state`
Create exactly ONE composite from 26-04 with one building hover overlay active and all others inactive. Verify hover does not overwhelm UI or neighboring architecture.

## JOB 26-06 — `hub.qa.autumn_rain_dusk`
Create exactly ONE composite using accepted autumn + rain + dusk states, same geometry and UI-safe areas. No regeneration of buildings or background.

## JOB 26-07 — `hub.qa.winter_night_snow`
Create exactly ONE composite using accepted winter + night + snowfall states. Same camera, same buildings, same paths, same crop.

## JOB 26-08 — `hub.qa.spring_day_clear`
Create exactly ONE composite using accepted spring + day + clear states. Same geometry and object coordinates.

## JOB 26-09 — `hub.qa.projector_mode`
Create exactly ONE 1280×800 projector QA composite derived by uniform scaling/crop from accepted scene plus UI chrome. Preserve building readability and CTA prominence. Do not redesign scene or UI.

## JOB 26-10 — `hub.qa.reduced_motion`
Create exactly ONE reduced-motion QA composite using static accepted states: no implied motion blur, fixed clouds/water/instruments, same season/day/weather appearance. Verify the scene still feels complete and readable without animated cues.

## Final acceptance gate

PASS only if:

- geometry drift between 26-01 and 26-08 is <=2 logical pixels for all critical landmarks;
- all architecture layers align at `(0,0)`;
- no black/empty margins appear in supported fullscreen layouts;
- no runtime state requires non-uniform X/Y stretching;
- at least seven major campus zones remain visually distinguishable with text hidden;
- foreground occlusion works on at least three routes;
- weather/day/season states do not repaint or move architecture;
- UI remains visually dominant over ambience but subordinate to active task/CTA;
- reduced-motion remains aesthetically complete;
- no generated composite is used as a substitute for the layered runtime assembly unless explicitly approved by Art Director + runtime reviewers.
