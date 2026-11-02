# BATCH-09 — Hub character motion keyframes

Purpose: добавить живой человеческий масштаб и короткие спокойные циклы в Hub без identity drift и без AI-generated sprite sheets.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is one authored state/frame and must be generated separately.

## Shared constants

- World-character family: logical `32×48`, bottom-center pivot, one baseline.
- Existing characters are image edits of accepted masters; do not regenerate identity from text alone.
- Every output: exactly ONE true transparent RGBA frame with no floor/background/shadow plate/UI/text.
- Fixed identity attributes—face, hair, clothes, proportions, palette and asymmetrical accessories—must remain stable across frames.
- Head/torso vertical drift between walk frames: maximum 1 logical pixel.
- Target low-cadence ambient animation: roughly 220–380 ms/frame; no 24 fps smooth-motion expectation.
- Sprite-sheet assembly occurs later in Aseprite/pipeline.

---

## JOB 09-01 — `character.player.world.walk.right.a`

### References
- **Image A:** accepted `character.player.world.idle.down` / accepted world-player identity master — authoritative for face, hair, clothing, body proportions, palette and scale.
- **Image B:** accepted Hub master for dusk lighting and world-character scale.

### Output contract
Exactly ONE transparent RGBA world-character frame, logical `32×48`, bottom-center pivot, same canvas/baseline as the accepted player master. One character only.

### Generation prompt
Create the first authored keyframe of a calm walk to screen-right for the accepted player character. Preserve identity exactly: same head size, hair silhouette, face, navy field clothing, footwear, backpack/accessories and palette. Shift only limb pose into a natural walking phase: front leg slightly forward, rear leg slightly back, opposite arm in restrained counter-swing, torso nearly vertical and head stable. The pose must feel like a student walking between campus buildings, not running. Keep pixel clusters broad/readable at 32×48 and preserve the bottom-center pivot. Output exactly one frame.

### Hard negatives
No new outfit, changed face/hair, running/leaping pose, speed lines, floor, cast-shadow plate, scenery, text/UI, second character, alternate frame, contact sheet, sprite sheet, grid, collage, multiple options or checkerboard background.

### PASS / FAIL
Identity drift, head/torso size change >1 px, baseline/pivot shift, backpack/accessory disappearance, opaque background or multiple frames = FAIL.

---

## JOB 09-02 — `character.player.world.walk.right.b`

### References
- **Image A:** accepted 09-01 walk frame A.
- **Image B:** accepted player identity master — authoritative for fixed identity/scale.

### Output contract
Exactly ONE transparent RGBA `32×48` walk frame B, identical canvas/pivot/baseline to 09-01.

### Generation prompt
Create the second walking phase for the exact same player. Preserve every fixed identity element and the same overall head/torso position. Reverse the limb phase naturally: the previously rear leg moves forward, the previously forward leg moves back, and the arms switch counter-swing while remaining modest. Vertical body bounce may differ by at most one logical pixel. Keep clothing folds and backpack mass as stable as possible, changing only what limb motion requires. The A/B pair must alternate without visible identity or size flicker. Output one frame only.

### Hard negatives
No outfit recolor, face/hair change, scale change, new accessory, exaggerated stride, run pose, floor/background, text/UI, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Any fixed identity drift, torso/head displacement >1 px, inconsistent backpack size, baseline jump or incompatible silhouette scale = FAIL.

---

## JOB 09-03 — `character.player.world.inspect`

### References
- **Image A:** accepted player world identity master.
- **Image B:** accepted field notebook/map-folder visual language if available.

### Output contract
Exactly ONE transparent RGBA `32×48` player state, bottom-center pivot and same baseline/scale as idle/walk frames.

### Generation prompt
Create an inspect state for the accepted player. The character has stopped walking and holds a small field notebook or folded map at mid-torso/chest height with both hands, looking down slightly in a calm professional posture. Preserve exact face, hair, clothing, body proportions and palette. The notebook/map must be simplified to a readable small shape without any visible writing or fake meteorological graphics. Keep feet planted on the same baseline and ensure the pose can transition back to idle without scale/pivot change. Output exactly one image.

### Hard negatives
No readable map/text, no new outfit, no desk/floor/background, no large clipboard hiding whole body, no second person, no speech bubble, no UI, no contact sheet/sprite sheet/collage/options.

### PASS / FAIL
Identity/scale drift, baseline shift, readable content on notebook, oversized held item or extra scenery = FAIL.

---

## JOB 09-04 — `hub.npc.student_a.walk.right.a`

### References
- **Image A:** accepted `hub.npc.student_a` idle master — authoritative for face/hair, blue vest/jacket, notebook, proportions and palette.
- **Image B:** Hub master for lighting/scale.

### Output contract
Exactly ONE transparent RGBA `32×48` walk-right frame A, bottom-center pivot, same canvas/baseline as Student A idle.

### Generation prompt
Create the first calm walk-right keyframe of Student A as an edit of the accepted master. Preserve the exact short dark-hair silhouette, clothing colors, notebook identity and body scale. Move only limbs into a restrained walking phase with one leg forward, the opposite arm counter-swinging and the notebook remaining naturally secured/held as in the master. Keep head/torso nearly fixed and retain the same dusk lighting clusters. The result must be recognizably the same NPC even at small scale. Output exactly one frame.

### Hard negatives
No new face/outfit, notebook disappearance/change, running pose, second student, floor/background, text/UI, alternate frame, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Identity drift, notebook size/location inconsistency, head/torso shift >1 px, pivot jump or opaque background = FAIL.

---

## JOB 09-05 — `hub.npc.student_a.walk.right.b`

### References
- **Image A:** accepted 09-04 frame A.
- **Image B:** Student A idle master.

### Output contract
Exactly ONE transparent RGBA `32×48` frame B with exact same canvas, bottom-center pivot and baseline.

### Generation prompt
Create the second walking phase of Student A. Reverse the leg/arm phase from 09-04 while preserving face, hair, blue clothing, notebook, overall silhouette envelope and palette. Keep torso/head position stable within one logical pixel and avoid changing accessory orientation unless the walking motion physically requires a tiny shift. The A/B pair should read as a low-cadence natural campus walk without flicker or morphing. Output exactly one frame only.

### Hard negatives
No new outfit/accessory, face change, exaggerated body bounce, run pose, floor/background, second NPC, text/UI, multi-frame sheet/contact sheet/collage.

### PASS / FAIL
Fixed silhouette/identity flicker, baseline/pivot change, notebook inconsistency or >1 px head/torso drift = FAIL.

---

## JOB 09-06 — `hub.npc.student_b.walk.left.a`

### References
- **Image A:** accepted `hub.npc.student_b` idle master — authoritative for hair, warm muted jacket/sweater, dark trousers, clipboard and scale.
- **Image B:** Hub master for lighting.

### Output contract
Exactly ONE transparent RGBA `32×48` walk-left frame A, bottom-center pivot and accepted baseline.

### Generation prompt
Create the first authored calm walk-left phase for Student B. Preserve tied-back/cropped light-brown hair, accepted warm muted outerwear, trousers, clipboard and friendly attentive identity. Shift limbs into a natural leftward walk while keeping the clipboard tucked/held consistently and torso/head nearly stationary. Maintain the same 32×48 scale, clean purposeful clusters and Hub dusk light. Avoid simply mirroring if clipboard/hair asymmetry would become incorrect; author the correct left-facing state. Output one image only.

### Hard negatives
No mirrored wrong-side clipboard, no new outfit/face, no run pose, no floor/background, text/UI, additional pose, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Asymmetry error, identity drift, head/torso movement >1 px, pivot/baseline change or accessory mismatch = FAIL.

---

## JOB 09-07 — `hub.npc.student_b.walk.left.b`

### References
- **Image A:** accepted 09-06 frame A.
- **Image B:** Student B idle master.

### Output contract
Exactly ONE transparent RGBA `32×48` frame B, same canvas/pivot/baseline as 09-06.

### Generation prompt
Create the second left-walk phase of the same Student B. Reverse the limb phase while preserving exact identity, clipboard side/size, hair silhouette, clothing palette and torso scale. Keep the head and upper torso stable and limit body bounce to one logical pixel. The transition A↔B should communicate walking through leg/arm motion rather than full-body morphing. Output exactly one isolated frame.

### Hard negatives
No accessory-side flip, outfit recolor, new face, exaggerated stride, new pose board, floor/background, text/UI, contact sheet/sprite sheet/collage.

### PASS / FAIL
Identity/accessory drift, body scale flicker, pivot shift or baseline mismatch = FAIL.

---

## JOB 09-08 — `hub.npc.observer.inspect_instrument`

### References
- **Image A:** accepted `hub.npc.observer` idle master — authoritative for older observer identity, cap, weatherproof jacket and instrument pouch.
- **Image B:** accepted handheld anemometer/instrument style if available.

### Output contract
Exactly ONE transparent RGBA `32×48` inspect state, bottom-center pivot and same scale/baseline as observer idle.

### Generation prompt
Create an instrument-inspection state for the experienced field observer. Preserve age cues, practical cap, dark weatherproof jacket, pouch, body proportions and palette. Raise a compact handheld meteorological instrument/anemometer to chest level and angle the head slightly toward it in a restrained professional pose. The instrument remains simplified enough to read at 32×48 and contains no visible numbers/text. Feet remain planted on the same baseline and the body scale does not change. Output one image only.

### Hard negatives
No new uniform, military appearance, readable instrument data, giant device, floor/background, second person, speech bubble, text/UI, contact sheet/sprite sheet/collage/options.

### PASS / FAIL
Observer identity drift, instrument too large/unreadable, baseline/pivot change, fake data/text or extra scene content = FAIL.

---

## JOB 09-09 — `hub.npc.rooftop_technician.idle`

### References
- **Image A:** accepted Hub world-character scale/style reference.
- **Image B:** accepted observer/student sprites for cluster density and dusk palette.

### Output contract
Exactly ONE transparent RGBA new NPC sprite, logical `32×48`, bottom-center pivot. One technician only.

### Generation prompt
Create one rooftop/service technician NPC for the meteorological center. The person wears a dark navy practical work jacket, simple protective/weather cap or beanie, dark trousers and a compact tool belt/pouch. Pose is calm idle standing, professional and non-militarized, suitable for rooftop equipment checks. Use a distinct silhouette from existing students/observer while staying in the exact same 32×48 scale family and dusk palette. Facial detail is minimal but human and approachable. Output exactly one isolated world sprite.

### Hard negatives
No hard hat construction-worker stereotype unless subtle approved cap, no military/tactical gear, no wrench raised dramatically, no roof/background, no text/UI, no second pose/person, no contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Wrong world-character scale, military/construction caricature, unclear pivot, excessive detail or background pixels = FAIL.

---

## JOB 09-10 — `hub.npc.archivist.doorway`

### References
- **Image A:** accepted Hub character scale/style.
- **Image B:** accepted Archive building palette/lighting for contextual consistency.

### Output contract
Exactly ONE transparent RGBA new NPC sprite, logical `32×48`, bottom-center pivot. Character only; no doorway/building pixels.

### Generation prompt
Create one archivist/scientific-center staff NPC intended to appear near the Archive doorway. Use a calm professional silhouette with compact glasses, warm brown/navy work cardigan or jacket over simple clothes and a small closed document folder held against the body. Keep the pose quiet and slightly attentive, as if pausing while carrying records. Match the Hub world-character scale, premium pixel clusters and cool dusk/warm rim-light palette. The character must be distinguishable from students without looking formal or bureaucratic. Output one isolated sprite only.

### Hard negatives
No actual door/interior/background, no readable folder text, no stack of papers, no librarian caricature, no second person, no UI/text, no multiple poses/contact sheet/sprite sheet/collage.

### PASS / FAIL
Incorrect 32×48 scale, fake text, background geometry, unclear baseline/pivot or overly stereotyped costume = FAIL.

---

## Batch acceptance

- identity edits preserve fixed face/hair/clothing/palette;
- baseline/pivot is stable across animation families;
- head/torso drift between walk phases <=1 logical px;
- no sprite sheet/contact sheet is accepted;
- all outputs use true alpha and one frame/person only;
- animation remains readable under nearest-neighbour scaling and reduced-motion can freeze an accepted static frame;
- candidates pass pixel cleanup, manifest/provenance registration and independent review before runtime use.
