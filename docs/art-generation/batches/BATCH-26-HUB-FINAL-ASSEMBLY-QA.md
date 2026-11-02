# BATCH-26 — Final Hub assembly QA composites

Purpose: финально доказать, что первый экран собирается из независимых слоёв в стабильную цельную сцену без геометрического дрейфа, визуальных конфликтов и скрытой зависимости от одного запечённого background bitmap.

This file follows `PROMPT-AUTHORING-STANDARD.md`. These are QA composite prompts. They must use only previously accepted assets; they are not an invitation to generate new art.

## Shared constants

- Geometry authority: `hub.geometry.lock_v1`.
- Source assets: accepted outputs from BATCH-12…25 only.
- No new architecture, vegetation, props, characters, UI or lighting concepts may be invented inside QA jobs.
- Layer origins/pivots must be used exactly as declared in manifests.
- QA composites are review evidence, not runtime source bitmaps unless separately approved.
- One QA job = one image. Never make contact sheets or multi-state comparison boards.

---

## JOB 26-01 — `hub.qa.base_no_ui`

### References
- **Image A:** accepted `hub.geometry.lock_v1`.
- **Asset set:** accepted base sky/cloud/skyline/water/ground/architecture/vegetation/foreground/prop layers.

### Output contract
Exactly ONE final base Hub composite with no UI. Canonical 16:9 composition; geometry identical to master.

### Generation/compositing prompt
Assemble the accepted Hub base scene using only approved layers and their declared origins. Use the canonical autumn+dusk baseline. Include accepted sky, distant clouds, city, water, campus terrain, architecture, landmark identity overlays, vegetation, props, foreground depth and static ambient assets. Do not invent missing art or repaint seams. Preserve the exact camera, horizon and object coordinates from `hub.geometry.lock_v1`. The purpose is to verify that the layered scene visually reproduces the intended finished Hub even with all UI disabled. Output exactly one image.

### Hard negatives
No labels, HUD, bottom bar, CTA, new building, new tree, new character, generated seam patch, geometry adjustment, non-uniform scaling, contact sheet/collage.

### PASS / FAIL
If any layer requires manual CSS-like offset to align, if geometry differs >2 logical px from master, or if black/empty margins appear = FAIL.

---

## JOB 26-02 — `hub.qa.base_with_npcs`

### References
- **Image A:** accepted 26-01.
- **Asset set:** accepted player/NPC/animal sprites plus BATCH-23 occlusion layers and route/pivot metadata.

### Output contract
Exactly ONE composite identical to 26-01 plus accepted living entities placed on approved route coordinates.

### Generation/compositing prompt
Start from the accepted 26-01 base and add only accepted player, NPC and animal sprites using their declared bottom-center pivots and route positions. Demonstrate depth handling: at least one entity must pass partially behind the front railing, one behind vegetation or a landmark front arc, and one remain fully visible in an unobstructed lane. Preserve all background/architecture pixels exactly. This QA image verifies spatial scale and occlusion, not character redesign. Output one image only.

### Hard negatives
No new character pose, no resized sprite, no painted shadow not from approved mask, no moved architecture, no UI/text, no collage/multi-state board.

### PASS / FAIL
Incorrect pivot, floating feet, entity drawn over an occluder it should be behind, or sprite scale drift = FAIL.

---

## JOB 26-03 — `hub.qa.base_with_activity`

### References
- **Image A:** accepted 26-02.
- **Asset set:** accepted building activity, instrument animation state A, cloud/water phase A, window/lamp states.

### Output contract
Exactly ONE composite adding approved ambient activity to 26-02.

### Generation/compositing prompt
Add accepted activity overlays to 26-02: building interior/window activity, one accepted state of each scientific instrument, water/cloud phase A, appropriate window-light and lamp state. Preserve base geometry and entity placement. The image should communicate a living but calm center with multiple independent low-intensity motions implied by the chosen states. No new art may be generated to fill gaps. Output exactly one QA composite.

### Hard negatives
No extra lights, no new people, no fake readable data, no changed cloud system, no geometry repaint, no UI/text, no multiple variants.

### PASS / FAIL
If ambience overwhelms CTA-safe areas, introduces unapproved content or shifts geometry = FAIL.

---

## JOB 26-04 — `hub.qa.full_ui_default`

### References
- **Image A:** accepted 26-03 scene.
- **Asset/UI set:** accepted BATCH-15 chrome and runtime layout specification.

### Output contract
Exactly ONE full first-screen QA composite including accepted UI chrome placeholders. Text must remain blank/neutral unless rendered by actual runtime, not generated into art.

### Generation/compositing prompt
Compose the accepted Hub scene with the approved top HUD frame, bottom navigation chrome, hotspot plates and main CTA container in their declared runtime positions. Use blank neutral text blocks or no text at all; do not ask the image generator to invent interface copy. Preserve scene visibility behind UI and verify hierarchy: current task/CTA first, scene second, ambient detail third. Output one image only.

### Hard negatives
No readable generated Russian text, no new icons, no UI redesign, no moved scene geometry, no baked screenshot labels, no collage.

### PASS / FAIL
If UI obscures critical architecture unnecessarily, if scene competes with CTA, or if generated fake text appears = FAIL.

---

## JOB 26-05 — `hub.qa.hover_state`

### References
- **Image A:** accepted 26-04.
- **Image B:** one accepted BATCH-25 hover overlay for a chosen building.

### Output contract
Exactly ONE composite with one and only one building hover state active.

### Generation/compositing prompt
Take the accepted default full-screen state and activate exactly one accepted building hover overlay while all other hotspot states remain neutral. Verify that the highlighted building becomes discoverable without overwhelming neighbouring architecture, top HUD, labels or main CTA. Do not change any base pixel outside the overlay/UI composition. Output one image only.

### Hard negatives
No second hovered building, no new outline, no glow amplification beyond approved overlay, no generated tooltip text, no layout shift, no collage.

### PASS / FAIL
If hover spills into neighbouring hotspot, becomes brighter than CTA or alters base geometry = FAIL.

---

## JOB 26-06 — `hub.qa.autumn_rain_dusk`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State assets:** accepted autumn season layer, rain/wet-surface overlays and dusk lighting state.
- **UI:** accepted default chrome/layout if included for QA.

### Output contract
Exactly ONE autumn + rain + dusk state composite using accepted layers only.

### Generation/compositing prompt
Assemble the accepted Hub in autumn, dusk and active rain using only the approved seasonal, weather and day-phase layers. Preserve all architecture, paths, routes and object coordinates exactly. Wet surfaces/reflections must correspond to accepted geometry; rain must not erase hotspot readability. Keep UI-safe zones clear. Output one image only.

### Hard negatives
No regenerated rainy background, no moved buildings, no new puddle geometry outside approved overlay, no extra storm effect, no fake text, no collage.

### PASS / FAIL
Geometry drift >2 px, state-specific redesign or loss of hotspot readability = FAIL.

---

## JOB 26-07 — `hub.qa.winter_night_snow`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State assets:** accepted winter, night and snowfall layers.

### Output contract
Exactly ONE winter + night + snow QA composite.

### Generation/compositing prompt
Assemble winter/night/snow from accepted layers only. Snow accumulation must follow approved winter geometry, night lighting must preserve building identity, and snowfall particles remain atmospheric rather than obscuring navigation. Maintain exact camera/crop and object coordinates. Output one image only.

### Hard negatives
No independently redrawn winter architecture, no changed roof shapes, no snowdrift blocking routes unless explicitly in accepted layer, no new light sources, no text/UI invention.

### PASS / FAIL
Any architecture silhouette change, route blockage caused by invented snow geometry or lost building identity = FAIL.

---

## JOB 26-08 — `hub.qa.spring_day_clear`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State assets:** accepted spring + daytime + clear-weather layers.

### Output contract
Exactly ONE spring/day/clear QA composite.

### Generation/compositing prompt
Assemble the accepted Hub under spring daytime clear conditions. Apply approved spring vegetation/material state, daytime lighting and clear-weather atmosphere without changing architecture, paths or camera. The scene should feel brighter and seasonally distinct while preserving the same exact gameplay layout and hotspot recognition. Output one image only.

### Hard negatives
No new flower beds outside accepted seasonal assets, no moved trees/buildings, no new daylight architecture repaint, no generated text/UI.

### PASS / FAIL
If season recognition requires geometry change or if hotspot/building identities differ from other states = FAIL.

---

## JOB 26-09 — `hub.qa.projector_mode`

### References
- **Image A:** accepted scene and `hub.geometry.lock_v1`.
- **Image B:** accepted 1280×800 crop policy from BATCH-24.
- **UI:** approved projector/readability UI profile.

### Output contract
Exactly ONE 1280×800 projector QA composite produced through uniform scale/crop only.

### Generation/compositing prompt
Render the accepted first screen at the approved 1280×800 classroom/projector viewport using uniform scaling/crop. Preserve building recognition, current task/CTA hierarchy and major navigation controls. Use accepted projector UI profile only; do not redesign the scene or enlarge individual objects. Output one image only.

### Hard negatives
No per-object rescale, no extra contrast repaint unless part of approved profile, no moved building, no black bars, no generated text, no collage.

### PASS / FAIL
Unreadable major building silhouettes, clipped CTA/navigation, non-uniform stretch or geometry reframe = FAIL.

---

## JOB 26-10 — `hub.qa.reduced_motion`

### References
- **Image A:** accepted full Hub state.
- **Static state assets:** phase A/static equivalents for clouds, water, instruments, fauna/NPC ambience and building activity.

### Output contract
Exactly ONE reduced-motion QA composite using only static accepted states.

### Generation/compositing prompt
Assemble a visually complete reduced-motion version of the same Hub. Freeze clouds/water/instruments on approved static frames, suppress optional rare motion events, retain season/weather/day appearance and keep all interactive feedback available as static states. The image must still feel intentional and alive through composition/light, not dependent on animated blur or motion cues. Output one image only.

### Hard negatives
No motion streaks, no missing core scene elements, no geometry change, no reduced-motion-specific redesign, no UI loss, no new art.

### PASS / FAIL
If important state understanding depends on animation, if scene looks broken/empty, or if reduced-motion changes interaction geometry = FAIL.

---

## Final acceptance gate

PASS only if all of the following are true:

1. geometry drift between environmental state composites is <=2 logical px for every critical landmark;
2. all full-scene layers align at `(0,0)` with no manual offsets;
3. supported fullscreen layouts have no black/empty margins;
4. no state requires independent X/Y stretch;
5. at least seven campus zones remain recognizable with text hidden;
6. foreground occlusion works on at least three approved routes;
7. season/weather/day states never repaint or move architecture;
8. UI hierarchy remains task/CTA > navigation/state > ambience;
9. reduced-motion remains complete and usable;
10. QA composites are not substituted for layered runtime assembly unless explicitly approved by Art Director + runtime reviewers.
