# BATCH-28 — Hub rare ambient events

Purpose: добавить редкие микро-события, которые создают ощущение самостоятельной жизни мира, но не меняют базовую геометрию, не влияют на игровой баланс и могут быть полностью отключены.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is standalone and generated separately. Rare-event art is lower priority than base Hub production.

## Shared constants

- Full-scene geometry authority where needed: `hub.geometry.lock_v1`.
- Isolated sprites must use accepted Hub perspective/scale and true alpha.
- Full-scene overlays use `640×360`, origin `(0,0)`, never trim.
- Events must remain secondary to task CTA, hotspot labels and navigation.
- No event may introduce required gameplay information.
- Reduced-motion may suppress or freeze events completely.

---

## JOB 28-01 — `hub.event.large_bird_flock`

### References
- **Image A:** accepted Hub master for sky scale and perspective.
- **Image B:** accepted distant-bird/flock style from BATCH-08 if available.

### Output contract
Exactly ONE transparent RGBA group sprite, logical size `160×64`, center pivot. One flock group only.

### Generation prompt
Create one rare distant migration/flock event composed of approximately 18–24 tiny birds forming a loose curved arc or shallow migrating pattern. Individual birds should be simplified 2–4 cluster silhouettes with small phase variation, but the flock must read as one distant atmospheric group rather than dozens of detailed sprites. Use cool dark silhouettes with only 2–3 tonal values so it stays behind gameplay. Keep spacing organic and avoid a perfect V. Output exactly one isolated flock group.

### Hard negatives
No sky fill, no large foreground birds, no species portraits, no text/UI, no multiple flock options, no contact sheet/sprite sheet/grid/collage, no painted checkerboard.

### PASS / FAIL
If the flock competes with architecture/CTA, contains oversized birds, becomes a dense black blob or includes background pixels = FAIL.

---

## JOB 28-02 — `hub.event.balloon_high_altitude`

### References
- **Image A:** accepted Hub master for distant scale.
- **Image B:** accepted aerological balloon identity from BATCH-20/Hub props.

### Output contract
Exactly ONE transparent RGBA distant sprite, `48×64`, center pivot.

### Generation prompt
Create one high-altitude aerological sounding balloon already well above the campus: a tiny cream-white spherical/teardrop envelope with a very small dark radiosonde/tether cue below. Preserve the accepted balloon identity but simplify it for distance. Use subtle cool sky-side shading and one restrained warm edge only if consistent with current day phase. The sprite should be recognizable on inspection but visually quiet. Output one isolated asset only.

### Hard negatives
No cloud/sky background, no second balloon, no operator, no text/logo, no oversized radiosonde, no weather data, no contact sheet/collage.

### PASS / FAIL
If balloon reads as a large foreground object, loses accepted identity, or includes background = FAIL.

---

## JOB 28-03 — `hub.event.squirrel_with_nut`

### References
- **Image A:** accepted squirrel identity/master.
- **Image B:** Hub master for world scale/lighting.

### Output contract
Exactly ONE transparent RGBA sprite, `48×48`, bottom-center pivot, same scale family as accepted squirrel.

### Generation prompt
Create a rare squirrel event pose using the accepted squirrel identity: the animal pauses alertly near vegetation while holding one small nut between its front paws. Preserve body size, fur palette, tail mass and facial identity from the master. Keep pose compact and readable, with the large tail forming a clear silhouette. Match Hub lighting and avoid micro-fur noise. Output exactly one sprite.

### Hard negatives
No ground/tree/grass patch, no multiple nuts, no human-like pose, no costume, no text/UI, no alternate poses/contact sheet.

### PASS / FAIL
Identity/scale drift, changed tail proportions, extra scenery or noisy fur rendering = FAIL.

---

## JOB 28-04 — `hub.event.pascal_window`

### References
- **Image A:** accepted Pascal cat identity master — authoritative for orange-white markings, green eye and left-ear notch.
- **Image B:** Hub master for window-scale relationship.

### Output contract
Exactly ONE transparent RGBA sprite, `48×32`, bottom-center pivot at sill baseline. Cat pixels only; no window frame.

### Generation prompt
Create a small rare-event pose of Pascal peeking from an existing window. Show only his head, upper chest and two front paws resting on an implied sill baseline. Preserve his accepted orange-white facial markings, compact fluffy shape, green eye(s) and distinctive small notch on the left ear. Expression should be calm/curious rather than cartoonishly surprised. Keep detail simplified for the small scale. Output exactly one transparent sprite.

### Hard negatives
No actual window/frame, no background, no full body, no different cat markings, no accessory, no text/UI, no multiple expressions/contact sheet.

### PASS / FAIL
Missing ear notch/identity cues, incorrect scale, window/background pixels or over-detailed portrait rendering = FAIL.

---

## JOB 28-05 — `hub.event.gull_takeoff`

### References
- **Image A:** accepted perched gull identity/master.
- **Image B:** Hub master for scale and lighting.

### Output contract
Exactly ONE transparent RGBA takeoff keyframe, `48×48`, bottom-center pivot compatible with accepted perch baseline.

### Generation prompt
Create one takeoff keyframe of the accepted gull: wings raised in a broad upward beat, body lifting just above the former perch baseline, feet beginning to leave contact. Preserve species proportions, white/gray/dark wing-tip palette, beak size and overall scale from the accepted perched state. Keep wing clusters broad and readable rather than feather-noisy. This is one authored frame, not a complete animation sheet. Output one image only.

### Hard negatives
No perch, no sky, no second bird, no motion blur, no different species, no text/UI, no multi-frame/contact sheet.

### PASS / FAIL
Identity/scale drift, unreadable wings, displaced pivot incompatible with perch animation or extra background = FAIL.

---

## JOB 28-06 — `hub.event.paper_gust`

### References
- **Image A:** Hub master for plaza scale/lighting.

### Output contract
Exactly ONE transparent RGBA ambient group sprite, `96×64`, center pivot, containing 3–5 blank paper sheets as one event group.

### Generation prompt
Create one short gust event group of 3–5 loose blank paper sheets caught in wind across the plaza. Use broad pale paper shapes at different simple orientations, with restrained cool shadow and warm edge reflection consistent with Hub dusk. The sheets should form one coherent motion group suitable for path animation; details remain minimal and no writing is visible. Output exactly one transparent group.

### Hard negatives
No readable writing, no documents with logos/forms, no ground, no person, no huge paper count, no motion blur smear, no contact sheet/collage.

### PASS / FAIL
Any readable marks, excessive visual density or multiple unrelated object types = FAIL.

---

## JOB 28-07 — `hub.event.aircraft_rare`

### References
- **Image A:** Hub master for distant-air scale.
- **Image B:** normal distant aircraft style if accepted.

### Output contract
Exactly ONE transparent RGBA distant aircraft sprite, `96×48`, center pivot.

### Generation prompt
Create a rare but plausible research/utility aircraft silhouette for the far background. It should differ subtly from routine passenger traffic—e.g. compact twin-engine research turboprop or civilian survey aircraft—without military styling. Use a restrained blue-gray silhouette with a few light clusters, simplified enough for distance. No airline/research logos or readable markings. Output one isolated sprite only.

### Hard negatives
No military weaponry, no fighter silhouette, no contrail, no sky, no logo/text, no second aircraft, no contact sheet/multiple views.

### PASS / FAIL
Military appearance, excessive detail, incorrect distant scale or background pixels = FAIL.

---

## JOB 28-08 — `hub.event.aurora_subtle`

### References
- **Image A:** `hub.geometry.lock_v1` for sky bounds and architecture-safe area.
- **Image B:** accepted clear-night day-phase state.

### Output contract
Exactly ONE `640×360` transparent RGBA full-scene overlay at `(0,0)`, never trimmed. Aurora pixels only in upper sky.

### Generation prompt
Create a rare subtle aurora overlay for cold clear-night conditions. Confine broad low-opacity green-cyan pixel ribbons to the upper sky above critical architecture, using stepped clustered shapes and sparse dither rather than smooth gradients. Keep the phenomenon scientifically plausible for a rare stylized event and visually restrained: it should reward noticing without dominating the campus or UI. Transparent everywhere outside aurora pixels. Output one overlay only.

### Hard negatives
No fantasy rainbow, no full-sky green wash, no architecture recolor, no stars/moon replacement, no text/UI, no blur, no contact sheet/collage.

### PASS / FAIL
Aurora overlaps major buildings strongly, becomes brighter than CTA/lamp hierarchy, or repaints sky/base geometry = FAIL.

---

## JOB 28-09 — `hub.event.festive_lights`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted architecture/railing geometry and lamp-light palette.

### Output contract
Exactly ONE `640×360` transparent RGBA aligned overlay, origin `(0,0)`, never trimmed.

### Generation prompt
Create a restrained rare festive-light overlay using small warm string-light clusters along a limited set of already-approved facade or railing edges. Preserve exact geometry and attachment coordinates. The decoration should feel like a modest campus celebration rather than a holiday theme: warm points/short runs only, no symbols or text. Maintain pixel-art cluster discipline and keep overall brightness below main interaction highlights. Output one overlay only.

### Hard negatives
No cultural/religious holiday iconography, no readable banner, no new railing/facade, no giant light curtain, no UI/text, no contact sheet.

### PASS / FAIL
Geometry drift, excessive coverage, semantic holiday symbols or dominance over navigation = FAIL.

---

## JOB 28-10 — `hub.event.quiet_night_reduced_population`

### Type
**QA/REFERENCE COMPOSITE** — this job does not create new production geometry or new characters.

### References
- **Image A:** accepted Hub night composite.
- **Asset set:** accepted population/ambient entity sprites and static states.

### Output contract
Exactly ONE QA/reference composite showing the accepted Hub at night with intentionally low population density. No new source asset may be invented.

### Generation/compositing prompt
Compose a quiet-night state using only accepted assets. Preserve geometry, night lighting, windows and props. Reduce visible ambient population to nearly empty: at most one or two distant accepted figures/animals, with static instrument/ambient states where appropriate. The purpose is to validate that the Hub still feels intentional and operational during a sparse night shift without relying on constant crowd motion. Output one reference image only.

### Hard negatives
No new background, no new NPC, no architecture change, no dramatic horror emptiness, no generated text/UI, no multiple versions in one image.

### PASS / FAIL
If geometry changes, new assets are invented, or scene becomes visually broken rather than calmly sparse = FAIL.

---

## Batch acceptance

- rare-event assets are optional and suppressible;
- none changes terrain/building geometry;
- none carries required gameplay information;
- events remain below task/CTA and navigation in visual hierarchy;
- isolated sprites use true alpha and declared pivots;
- full-scene overlays align at `(0,0)`;
- reduced-motion can replace moving events with static accepted pose or suppress them;
- every production candidate passes cleanup, provenance/manifest registration and independent review.
