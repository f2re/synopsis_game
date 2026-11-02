# BATCH-20 — Hub scientific instrument animation states

Purpose: оживить главный Hub локальными научными приборами без изменения `hub.geometry.lock_v1`.

This file follows `PROMPT-AUTHORING-STANDARD.md`. **Every JOB below is intentionally self-contained and must be sent to ChatGPT Images separately.** Never send the whole batch as one generation request.

## Shared technical constants

- Hub geometry authority: `hub.geometry.lock_v1`.
- Full-scene overlay canvas: `640×360`, origin `(0,0)`, never trim.
- Isolated instrument animation: exact accepted master canvas/pivot/bounding box.
- Pixel style: modern premium pixel art; crisp intentional clusters; selective outlines; no blur/vector smoothness/random noise.
- Lighting family: cool blue-violet dusk ambient with restrained warm station-light reflections unless a job explicitly changes only an emissive state.
- One state per PNG. Sprite-sheet assembly happens later in Aseprite/pipeline.

---

## JOB 20-01 — `hub.instrument.radar.rotation_a`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — authoritative for camera, roof position, horizon and scene scale.
- **Image B:** accepted radar instrument master from Hub architecture/prop production — authoritative for dish shape, support yoke, material palette, pivot and attachment geometry.

### Output contract
Return exactly **ONE transparent RGBA PNG** containing only radar pixels needed for animation state A. Keep the exact accepted canvas, pivot and roof attachment. If produced as full-scene alignment overlay, canvas is 640×360 at origin `(0,0)` and must not be trimmed.

### Generation prompt
Create animation phase A of the accepted meteorological radar. Preserve the complete fixed support/yoke/base and roof attachment pixel-for-pixel in position, scale and perspective. Change only the rotating radar/dish/antenna orientation to the first authored phase. The instrument must remain scientifically plausible, compact and readable in the Hub at runtime size. Keep pale metal highlights grouped into deliberate pixel clusters, cool dusk shadows and only the same restrained warm reflections already present in Image B. The result is an animation edit, not a redesign. Output exactly ONE image containing this one state only.

### Hard negatives
Do not redraw the building or roof. Do not change camera, perspective, scale, pivot, support geometry, dish diameter, feed assembly identity or palette family. No motion blur, glow streaks, new antennas, extra dishes, text, UI, labels, contact sheet, sprite sheet, grid, collage, alternate views or multiple options. Real alpha transparency only; never draw a checkerboard.

### PASS / FAIL
PASS only if fixed support pixels align to Image B and only the intended moving radar component changes. Pivot shift >1 logical px, dish-size drift >1 px, duplicated equipment, opaque background or any building pixels = FAIL.

---

## JOB 20-02 — `hub.instrument.radar.rotation_b`

### References
- **Image A:** `hub.geometry.lock_v1` for world alignment.
- **Image B:** accepted `hub.instrument.radar.rotation_a` plus the radar master for identity and fixed support geometry.

### Output contract
Exactly ONE transparent RGBA animation frame on the identical canvas/pivot/bounding box as 20-01. No trim.

### Generation prompt
Create the second authored radar rotation phase as an image edit of the accepted first phase. Keep all fixed support, base, yoke, roof contact, material clusters and lighting exactly aligned. Rotate only the moving radar component to a clearly different but physically continuous orientation suitable for alternating animation. Preserve apparent diameter and perspective ellipse; do not “improve” or re-model the instrument. Output one state only, intended to sit in exactly the same runtime coordinates as 20-01.

### Hard negatives
No new support pixels, no building redraw, no zoom, no crop, no scale drift, no changed dish thickness, no new highlight pattern unrelated to rotation, no text/UI, no multi-frame sheet, no contact sheet/collage/options, no fake transparency.

### PASS / FAIL
Switching 20-01 ↔ 20-02 must not visibly jump at the support/pivot. More than 1 px fixed-geometry drift or any silhouette growth unrelated to rotation = FAIL.

---

## JOB 20-03 — `hub.instrument.radar.rotation_c`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted radar master and accepted 20-01/20-02 frames.

### Output contract
Exactly ONE transparent RGBA phase C, same canvas, same pivot, same support geometry.

### Generation prompt
Create a third radar rotation phase that completes a believable low-frame-count loop with 20-01 and 20-02. Preserve every non-rotating component and the accepted material/lighting clusters. Only the moving dish/antenna orientation changes. The sequence should imply steady mechanical rotation rather than wobble: center of rotation remains fixed, apparent dish size remains constant, and all transitions are visually coherent at nearest-neighbour scaling. Output one image only.

### Hard negatives
No new roof, no support redraw, no wobble, no translation of the dish center, no motion blur, no extra antenna, no text/UI, no sheet/grid/collage/multiple variants, no checkerboard.

### PASS / FAIL
All three radar states must share one pivot and one fixed support. Center shift >1 logical px, scale drift, perspective mismatch or identity drift = FAIL.

---

## JOB 20-04 — `hub.instrument.windsock.phase_a`

### References
- **Image A:** `hub.geometry.lock_v1` for exact mast/world position.
- **Image B:** accepted windsock master — authoritative for pole, pivot, fabric colors and scale.

### Output contract
Exactly ONE transparent RGBA state. Preserve pole and mast attachment exactly; change only fabric. Same canvas/pivot as accepted master.

### Generation prompt
Create windsock animation phase A under moderate wind. Keep the dark mast, bracket and attachment point fixed pixel-for-pixel. The fabric extends approximately 60–70% horizontally from the mast with one broad readable fold and a slight downward taper, using the accepted red/white or project-approved stripe identity. Render folds as broad intentional clusters that remain legible at Hub scale; no fabric micro-noise. Match the accepted dusk lighting and warm rim reflection. Output exactly one state.

### Hard negatives
Do not bend or move the pole, change wind direction signage, add arrows, labels, sky, ground, second windsock, flutter blur, contact sheet, sprite sheet, grid, collage or multiple options. Real alpha only.

### PASS / FAIL
Attachment point and pole must match master exactly. Fabric may change; pole may not. Pole/pivot drift >1 px, unreadable stripe noise or enlarged canvas trim = FAIL.

---

## JOB 20-05 — `hub.instrument.windsock.phase_b`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted 20-04 plus windsock master.

### Output contract
Exactly ONE transparent RGBA alternate fabric phase on identical canvas/pivot.

### Generation prompt
Create phase B as a restrained alternate fold of the same windsock under the same moderate wind regime. Keep the pole, bracket and fabric root completely fixed. Change only the soft cloth contour: slightly different extension and one shifted broad fold so alternating A/B suggests natural movement rather than direction change. Preserve stripe count, fabric length, palette and silhouette scale. Output one image only.

### Hard negatives
No mast movement, no opposite wind direction, no extra folds that create noise, no torn fabric, no arrows/text/UI, no multi-view or contact sheet, no background.

### PASS / FAIL
A/B switching must read as cloth motion with stable anchoring. Root shift, mast change, color identity drift or >2 px overall length drift = FAIL.

---

## JOB 20-06 — `hub.instrument.anemometer.phase_a`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted cup-anemometer master — authoritative for mast, housing, rotor center and three-cup geometry.

### Output contract
Exactly ONE transparent RGBA rotor state; same accepted canvas/pivot. Fixed mast/housing unchanged.

### Generation prompt
Create authored rotor phase A for the accepted three-cup anemometer. Preserve mast, sensor housing, rotor hub and support arm exactly. Rotate only the three cup arms around the fixed hub to a clear first orientation. Cups must remain equal-sized and physically arranged at approximately 120-degree intervals, simplified cleanly for pixel-art readability. Keep metal highlights clustered and compact; no motion smear. Output one image only.

### Hard negatives
No four-cup rotor, no propeller replacement, no mast/housing change, no added direction arrow, no text/data display, no glow, no contact sheet/sprite sheet/grid/collage/options, no opaque background.

### PASS / FAIL
Rotor hub must not move. Three-cup identity must remain obvious. Hub shift >1 px, changed cup count, fixed-support drift or silhouette scaling = FAIL.

---

## JOB 20-07 — `hub.instrument.anemometer.phase_b`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted 20-06 and anemometer master.

### Output contract
Exactly ONE transparent RGBA phase B on identical canvas/pivot.

### Generation prompt
Create the second authored rotor phase of the same cup anemometer. Keep every fixed support pixel aligned with 20-06. Rotate only the three cups around the same hub by a small coherent angular step. Preserve cup dimensions, 120-degree relationship, palette, lighting and overall silhouette envelope. The A/B pair should imply rotation at low frame cadence when displayed nearest-neighbour. Output exactly one frame.

### Hard negatives
No mast movement, no cup resizing, no changed cup count, no blur, no extra instrument, no text/UI, no multi-frame image/contact sheet/collage, no checkerboard transparency.

### PASS / FAIL
Fixed geometry must register pixel-perfectly. Rotor center or mast drift >1 px, changed cup geometry or palette drift = FAIL.

---

## JOB 20-08 — `hub.instrument.mast_beacon.off`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted rooftop mast/beacon master.

### Output contract
Exactly ONE transparent RGBA OFF state, same canvas/pivot/geometry as beacon master.

### Generation prompt
Create the aviation obstruction beacon OFF state for the accepted meteorological mast. Preserve the complete mast, antenna, fixture housings and all non-emissive metal pixels exactly. Render beacon lenses as dark desaturated red glass with no emitted halo, while retaining small material highlights consistent with ambient dusk. This is a state edit only, not a new mast. Output one image only.

### Hard negatives
No geometry change, no new beacon count, no large glow, no blinking streak, no sky/roof/background, no text/UI, no sheet/grid/collage/options, no fake alpha.

### PASS / FAIL
OFF and ON state geometry must be identical. Any mast/fixture displacement, background pixels or emitted halo in OFF state = FAIL.

---

## JOB 20-09 — `hub.instrument.mast_beacon.on`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted 20-08 OFF state — authoritative for all geometry.

### Output contract
Exactly ONE transparent RGBA ON state with identical geometry/canvas/pivot to 20-08.

### Generation prompt
Create the ON state by editing only the beacon emission pixels of 20-08. Preserve all mast/antenna/fixture pixels exactly. Activate the accepted beacon lenses with compact saturated red cores and a restrained 1–2 logical-pixel red bloom consistent with premium pixel art, not soft airbrush. The emitted accent must remain small enough not to compete with Hub UI or nearby windows. Output exactly one image.

### Hard negatives
No mast redraw, no larger fixture, no wide glow cloud, no lens flare, no white flash, no architecture/background, no text/UI, no collage/contact sheet/multiple states in one image.

### PASS / FAIL
Geometry must match 20-08 pixel-for-pixel outside emission pixels. Any structural change or bloom beyond the declared compact extent = FAIL.

---

## JOB 20-10 — `hub.instrument.weather_balloon.launch_ready`

### References
- **Image A:** `hub.geometry.lock_v1` for launch-area placement and scale.
- **Image B:** accepted meteorological balloon master — authoritative for balloon envelope, tether, radiosonde package and palette.

### Output contract
Exactly ONE transparent RGBA launch-ready state. Preserve accepted canvas, bottom/tether anchor and overall size; no trim.

### Generation prompt
Create a launch-ready state of the accepted aerological sounding balloon before release. Keep the cream-white balloon envelope taut and vertically centered over the existing tether line; include the same compact radiosonde package and attachment hardware. Suggest only minimal pre-launch tension through a slight controlled envelope asymmetry or tether angle while preserving the anchor and scale. Maintain realistic scientific character, cool dusk shadow clusters and restrained warm station-light edge. Output one image only.

### Hard negatives
Do not show the balloon already flying away, do not add operator/person, building, sky, cloud, extra balloon, text, logos, meteorological data, contact sheet, sprite sheet, grid, collage or multiple variants. Real alpha only.

### PASS / FAIL
Anchor remains fixed; balloon identity/diameter remains within 1 px of master. Launch displacement, extra scene content, geometry drift or opaque background = FAIL.

---

## Batch acceptance

- all generated states are one-file/one-state assets;
- fixed supports register within 1 logical pixel across frames;
- no frame contains text, UI, fake data, background or unrelated geometry;
- no image is accepted directly into runtime before pixel cleanup, manifest registration and independent review;
- intended cadence: radar 180–300 ms/state; anemometer 120–220 ms/state; beacon 700–1600 ms toggle; windsock 350–700 ms/state;
- reduced-motion may freeze a single accepted state without visual incompleteness.
