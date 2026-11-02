# BATCH-19 — Hub combined-state QA composites

Purpose: проверить, что сочетания `season + weather + day-phase` используют одну и ту же каноническую сцену и не создают скрытый геометрический дрейф.

This file follows `PROMPT-AUTHORING-STANDARD.md`. These are **QA reference composites**, not runtime source assets and not permission to redraw the Hub.

## Shared constants

- Geometry authority: accepted `hub.geometry.lock_v1`.
- Inputs: accepted layers from BATCH-16, BATCH-17 and BATCH-18 only.
- Canonical logical canvas: `640×360`.
- Every composite preserves exact camera, horizon, building bounding boxes, paths, plaza, waterline and foreground anchors.
- One QA composite per job; no contact sheet or 10-state comparison board.
- No new art may be invented to hide layer incompatibilities.

---

## JOB 19-01 — `hub.qa.spring_dawn_clear`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted spring deciduous/flowerbed layers, clear-atmosphere layer and dawn-light layer.

### Output contract
Exactly ONE `640×360` QA composite. This is a flattened review image only; source production remains layered.

### Generation/compositing prompt
Compose the accepted canonical Hub using only the accepted SPRING + DAWN + CLEAR state layers. Preserve exact geometry and layer origins. Spring vegetation should show fresh partial foliage and restrained early flowers; atmosphere should be clean with subtle horizon haze; dawn lighting should be cool overall with soft low warm edge light and minimal artificial lighting. Do not generate any replacement building, path or sky object beyond accepted state layers. Output exactly one QA image.

### Hard negatives
No redraw, no new tree/building, no crop/reframe/zoom, no geometry correction by painting, no text/UI, no collage/contact sheet/multiple states.

### PASS / FAIL
Any major landmark shift >2 logical px, new/missing object, altered path/waterline or unapproved art = FAIL.

---

## JOB 19-02 — `hub.qa.spring_day_rain`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted spring layers, daytime light, overcast/rain streaks, wet surfaces and approved puddle/reflection layer.

### Output contract
Exactly ONE `640×360` QA composite using accepted layers only.

### Generation/compositing prompt
Compose SPRING + DAY + RAIN from the accepted assets. Keep fresh vegetation, diffuse daytime rain lighting, active rain particles, wet paths and restrained puddle/reflection accents while preserving every route and building coordinate. Rain may soften contrast but must not hide major hotspot architecture or path intersections. Do not invent additional storm clouds or regenerate terrain. Output one QA image only.

### Hard negatives
No new puddles outside approved layer, no moved path edge, no redrawn rainy background, no architecture shift, no UI/text, no comparison grid.

### PASS / FAIL
Route readability loss, geometry drift >2 px, state-specific building redesign or unapproved weather content = FAIL.

---

## JOB 19-03 — `hub.qa.summer_day_clear`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted summer vegetation/flowerbeds, daytime light and clear atmosphere.

### Output contract
Exactly ONE `640×360` QA composite.

### Generation/compositing prompt
Compose SUMMER + DAY + CLEAR using accepted layers only. Show mature full green crowns inside approved envelopes, controlled summer flowerbeds, bright neutral-cool daylight and clean atmospheric depth. Preserve exact building/path/plaza/water geometry. The state should feel clearly summer through vegetation and light without altering scene composition. Output one QA image only.

### Hard negatives
No expanded canopies beyond accepted masks, no new flowers/props, no architecture repaint, no crop/reframe, no text/UI, no contact sheet.

### PASS / FAIL
Vegetation anchor drift, hidden hotspot/building silhouette, new scene content or coordinate changes >2 px = FAIL.

---

## JOB 19-04 — `hub.qa.summer_golden_storm`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted summer vegetation, golden-hour lighting and storm-cloud layer. No lightning unless a separately approved flash state is intentionally included.

### Output contract
Exactly ONE `640×360` QA composite.

### Generation/compositing prompt
Compose SUMMER + GOLDEN HOUR + APPROACHING STORM using the accepted layers. Maintain mature vegetation, dark organized convective clouds and low warm light breaking beneath the cloud base, with cool shadows on campus materials. Preserve exact geometry and avoid turning the scene into fantasy disaster art. This QA state checks whether strong sky/weather contrast still leaves architecture and navigation readable. Output one image only.

### Hard negatives
No new lightning bolt, no tornado, no architecture redraw, no moved horizon, no apocalyptic color grading, no text/UI, no multi-state board.

### PASS / FAIL
Loss of critical building readability, geometry shift, unapproved weather effect or palette overwhelming gameplay hierarchy = FAIL.

---

## JOB 19-05 — `hub.qa.autumn_dusk_clear`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted autumn vegetation/fallen leaves, dusk lighting and clear atmosphere.

### Output contract
Exactly ONE `640×360` QA composite. This is the primary visual-target state.

### Generation/compositing prompt
Compose AUTUMN + DUSK + CLEAR using accepted layers only. Use controlled amber/rust foliage, cool blue-violet ambient, warm operational windows/lamps and restrained clear-sky depth. Preserve every architecture/path/waterline coordinate exactly. This state should closely match the canonical target mood and serves as the principal reference for judging style coherence across other environmental states. Output exactly one QA image.

### Hard negatives
No new foliage placement, no redrawn building, no extra sunset sky object, no UI/text, no geometry patching, no contact sheet.

### PASS / FAIL
Difference from geometry lock >2 px, changed building identity, excessive saturation or invented state art = FAIL.

---

## JOB 19-06 — `hub.qa.autumn_overcast_rain`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted autumn vegetation, overcast cloud deck, rain particles, wet surfaces/puddles and appropriate window-light state.

### Output contract
Exactly ONE `640×360` QA composite.

### Generation/compositing prompt
Compose AUTUMN + OVERCAST + RAIN from accepted layers only. Preserve autumn canopy geometry, apply diffuse cool overcast atmosphere, rain particles, wet path/roof treatment and restrained warm operational windows. Ensure fallen-leaf overlays and puddles remain secondary and do not conceal route boundaries. Geometry and camera remain identical to all other QA states. Output one image only.

### Hard negatives
No new rain scene redraw, no flooded routes, no moved foliage/building, no additional fog unless explicitly accepted, no UI/text, no collage.

### PASS / FAIL
Path/hotspot readability loss, unapproved combined weather, geometry shift >2 px or state-specific architecture = FAIL.

---

## JOB 19-07 — `hub.qa.winter_day_snow`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted winter bare deciduous layer, snow-ground/snow-cap layers, daytime light and snowfall particles.

### Output contract
Exactly ONE `640×360` QA composite.

### Generation/compositing prompt
Compose WINTER + DAY + SNOW using only accepted layers. Show bare deciduous structure, approved ground/roof/branch snow accumulation, active depth-scaled snowfall and cold daytime light. Preserve paths and stairs as readable gameplay geometry; accumulation may frame routes but never reshape them. Keep buildings identical to other seasons. Output one QA image only.

### Hard negatives
No new snowdrift geometry, no changed roof pitch, no hidden steps/path intersections, no regenerated winter building, no text/UI/contact sheet.

### PASS / FAIL
Route geometry obscured, architecture silhouette changes, snow accumulation escapes accepted masks or coordinate drift >2 px = FAIL.

---

## JOB 19-08 — `hub.qa.winter_night_clear`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted winter accumulation/vegetation, night lighting, canonical window/lamp masks and moon/stars layer.

### Output contract
Exactly ONE `640×360` QA composite.

### Generation/compositing prompt
Compose WINTER + NIGHT + CLEAR from accepted assets. Use snow accumulation and bare trees, deep navy ambient light, controlled warm operational windows/lamps and the accepted restrained moon/star layer. There is no active snowfall. Preserve exact building/path/camera geometry and verify that major campus zones remain distinguishable under the darker state. Output exactly one QA image.

### Hard negatives
No new night architecture, no black crush, no new moon position, no additional snowfall, no text/UI, no contact sheet/collage.

### PASS / FAIL
Major building silhouette loss, geometry drift, invented light source or snow state inconsistency = FAIL.

---

## JOB 19-09 — `hub.qa.winter_dawn_fog`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted winter layers, dawn light and fog layer.

### Output contract
Exactly ONE `640×360` QA composite.

### Generation/compositing prompt
Compose WINTER + DAWN + FOG using accepted layers only. Preserve snow accumulation/bare vegetation, use cool early dawn light with restrained warm horizon cue and low fog strongest over water/far campus. Keep foreground routes, central plaza and interaction buildings readable. Do not generate any additional fog geometry or winter scenery outside accepted layers. Output one QA image only.

### Hard negatives
No whiteout, no new snow object, no building reposition, no Gaussian blur, no text/UI, no multi-state comparison.

### PASS / FAIL
Critical hotspot obscuration, blur, geometry shift >2 px or unapproved fog/snow content = FAIL.

---

## JOB 19-10 — `hub.qa.autumn_night_rain`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **State inputs:** accepted autumn vegetation/leaves, night lighting, rain particles, wet surfaces/puddles and window/lamp masks.

### Output contract
Exactly ONE `640×360` QA composite.

### Generation/compositing prompt
Compose AUTUMN + NIGHT + RAIN from accepted layers. Use deep navy night ambient, controlled warm windows/lamps, active rain, wet path/roof accents and restrained reflections over the accepted autumn vegetation state. Preserve geometry exactly and verify that the scene remains navigable despite low light and weather. Output one QA image only.

### Hard negatives
No new night/rain background, no moved building/path, no additional fog unless accepted, no excessive bloom or black crush, no text/UI/contact sheet.

### PASS / FAIL
Geometry shift >2 px, navigation/hotspot readability loss, unapproved weather/light content or changed building identity = FAIL.

---

## QA acceptance

All ten references must overlay with zero camera movement. Review at logical resolution and compare:

- horizon y-position;
- critical building bounding boxes;
- central globe/plaza centroid;
- principal path intersections;
- waterline;
- foreground railing baseline;
- vegetation anchor points.

Any shift >2 logical px on major geometry = FAIL. Any new/missing building, changed path/roof pitch/camera, non-uniform scale or generative seam patch = FAIL. These composites are evidence only; production remains layer-based.
