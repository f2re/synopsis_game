# BATCH-05 — Hub foundational world assets, landmarks and ambient NPCs

Purpose: создать базовые world-assets, на которые опираются последующие character-motion, instrument-animation и depth batches, без нарушения canonical Hub geometry.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is self-contained and must be generated separately. Legacy `480×270` outputs and legacy `scene_hub_geometry_master_dusk` alignment are superseded by `hub.geometry.lock_v1` from BATCH-12.

## Shared constants

- **Image A for Hub-aligned work:** accepted `hub.geometry.lock_v1`, authoritative for camera, scale, horizon and world placement.
- **Image B:** approved polished Hub style reference, authoritative for premium pixel-art material/lighting language.
- Full-scene occluders: exactly `640×360`, origin `(0,0)`, transparent RGBA, never trim.
- Isolated props/NPCs use declared logical size and pivot.
- Exactly one semantic asset/state per generation; no contact sheets/sprite sheets/grids/collages.
- No baked text/UI/labels/fake meteorological data.

---

## JOB 05-01 — `hub.foreground.railing`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — authoritative for exact foreground railing position and camera.
- **Image B:** approved Hub style/material reference.

### Output contract
Exactly ONE `640×360` transparent RGBA full-scene occluder layer at origin `(0,0)`, never trimmed. Visible pixels: only the nearest foreground railing segments that render in front of world characters.

### Generation prompt
Create the foundational foreground railing occluder aligned pixel-for-pixel to the canonical Hub. Include only the accepted frontmost stone posts and blue-black painted metal lattice/rails crossing the lower scene, primarily within the canonical foreground band. Preserve exact perspective, rail height, post spacing and all route relationships from Image A. Use cool blue-gray stone/metal clusters with restrained warm reflected lamp accents, keeping broad readable shapes suitable for sprite occlusion. Every other pixel must be transparent. Output exactly one full-canvas overlay.

### Hard negatives
No 480×270 canvas, no new railing section, no plants unless physically integral and already approved, no ground, buildings, people, labels, UI, alternate version, contact sheet, sprite sheet, grid, collage/options, fake checkerboard transparency or trimmed canvas.

### PASS / FAIL
PASS only if layer stacks at `(0,0)` with no correction and matches accepted railing edges within 1–2 px. Legacy size, perspective drift, unrelated pixels, opaque background or trim = FAIL.

---

## JOB 05-02 — `hub.foreground.conifer_canopy`

### References
- **Image A:** `hub.geometry.lock_v1` — authoritative for foreground vegetation anchors/occlusion relationship.
- **Image B:** accepted North-West conifer style/palette.

### Output contract
Exactly ONE `640×360` transparent RGBA full-scene foreground vegetation occluder at `(0,0)`, never trimmed.

### Generation prompt
Create only the accepted nearest conifer/branch canopy pixels that should render in front of moving world characters near scene edges/lower depth lanes. Preserve the exact canopy footprint and camera from Image A. Use broad blue-green North-West foliage clusters, deep cool interior shadow and limited warm lamp reflection, with no individual-needle noise. Keep route-critical center areas clear and leave every non-occluding pixel transparent. This is an occlusion layer, not a new vegetation composition. Output exactly one aligned image.

### Hard negatives
No 480×270 output, no new tree, no whole background vegetation repaint, no architecture, ground, people, UI/text, noisy needles, second canopy option, contact sheet/grid/collage or trim.

### PASS / FAIL
Canopy edge mismatch >2 px, new vegetation placement, route obstruction, wrong canvas/origin or non-transparent unrelated pixels = FAIL.

---

## JOB 05-03 — `hub.prop.weather_balloon`

### References
- **Image A:** accepted Hub master for world scale/perspective/lighting.
- **Image B:** approved aerological equipment reference if available.

### Output contract
Exactly ONE isolated transparent RGBA prop sprite, logical size `64×96`, bottom-center anchor at the lowest tether/package point. One balloon assembly only.

### Generation prompt
Create a tethered meteorological/aerological balloon prepared for launch as a standalone world prop. Use a cream-white rounded balloon envelope with subtle broad panel clusters, a short readable tether and a compact radiosonde/instrument package below. Keep the silhouette scientifically plausible and clear at 64×96, with cool violet-blue dusk shadows and restrained warm station-light edge. The asset is pre-launch and static; it must integrate with the Aerology zone without containing staff or architecture. Output exactly one transparent sprite.

### Hard negatives
No person, building, sky, ground, second balloon, free-flight pose, readable instrument text/data, brand/logo, card, text/UI, contact sheet/sprite sheet/grid/collage/options or fake transparency.

### PASS / FAIL
Scientifically implausible geometry, unclear tether/anchor, wrong scale, extra scenery/object or non-transparent background = FAIL.

---

## JOB 05-04 — `hub.prop.windsock`

### References
- **Image A:** accepted Hub master for scale/camera/dusk light.
- **Image B:** approved station prop palette if available.

### Output contract
Exactly ONE isolated transparent RGBA windsock sprite, logical size `64×64`, bottom-center pivot at pole base.

### Generation prompt
Create one campus meteorological windsock as a clean standalone sprite. Use a slim dark mast and a red/white or project-approved high-visibility fabric sock blowing clearly to one side in one broad authored base phase. Fabric shape must be readable through a few large folds rather than noisy stripes, with cool navy shadow and restrained warm lamp rim. Keep the mast/pivot stable so later animation phases can edit only cloth while preserving support geometry. Match the Hub 3/4 camera. Output exactly one asset.

### Hard negatives
No ground/building/sky, wind arrow, text/letters, second windsock, alternate phase in same image, torn fabric, smooth cloth blur, UI, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Unclear pole base/pivot, unreadable cloth, perspective mismatch, multiple states or background pixels = FAIL.

---

## JOB 05-05 — `hub.prop.radar_dish`

### References
- **Image A:** accepted Hub master for prop scale/perspective.
- **Image B:** approved meteorological radar/antenna material language.

### Output contract
Exactly ONE isolated transparent RGBA radar-dish sprite, logical size `96×96`, bottom-center base anchor with clearly identifiable rotation/yoke pivot.

### Generation prompt
Create one compact meteorological radar/antenna dish suitable for rooftop/campus animation. Use a pale metal parabolic dish in believable 3/4 perspective, dark support yoke/base and a small feed horn/arm. The dish ellipse must be clean and stepped, with grouped cool metal highlights/shadows and tiny restrained warm reflected accents. Geometry should expose a stable rotation center so later BATCH-20 frames can rotate the moving component without changing support. It must read as scientific equipment, not household satellite TV or a weapon. Output one isolated sprite.

### Hard negatives
No roof/background, giant radar installation, sci-fi weapon, satellite-TV branding, text/data, second dish, multiple angles, UI, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Unclear pivot/yoke, wrong perspective, sci-fi/toy appearance, background pixels or multiple variants = FAIL.

---

## JOB 05-06 — `hub.npc.student_a`

### References
- **Image A:** accepted player/world-character gold set for 32×48 scale and cluster language.
- **Image B:** accepted Hub master for dusk lighting.

### Output contract
Exactly ONE isolated transparent RGBA world-character sprite, logical size `32×48`, bottom-center pivot, one baseline. One Student A only.

### Generation prompt
Create Meteorology Student A in idle 3/4/front Hub pose. Give the NPC a distinct silhouette from the player: short dark hair, light field shirt under a blue vest/jacket, dark practical trousers, small notebook carried at the side and relaxed conversational posture. Keep proportions within the exact project world-character scale family, with compact slightly expressive head, broad readable garment clusters and minimal facial pixels. Use cool dusk shadow plus restrained warm window/lamp rim. This accepted idle becomes identity reference for BATCH-09 animation edits. Output exactly one sprite.

### Hard negatives
No recolored player-template look, no second person, floor/shadow plate, speech bubble, readable notebook text, UI, alternate pose, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Wrong 32×48 scale, unclear identity, baseline/pivot ambiguity, noisy face/clothes or extra scene pixels = FAIL.

---

## JOB 05-07 — `hub.npc.student_b`

### References
- **Image A:** accepted world-character scale/style family.
- **Image B:** Hub master for lighting/palette context.

### Output contract
Exactly ONE isolated transparent RGBA `32×48` NPC sprite, bottom-center pivot and one baseline.

### Generation prompt
Create Meteorology Student B as a distinct idle world character. Use tied-back or compact light-brown hair, warm muted sweater/jacket over dark trousers, a clipboard tucked under one arm and an attentive friendly stance. Preserve project 32×48 proportions and use deliberate low-resolution clusters rather than template recoloring or facial micro-noise. The clipboard and hair asymmetry should be clear enough that future left/right animation is authored correctly rather than blindly mirrored. Match Hub dusk cool/warm lighting. Output exactly one isolated sprite.

### Hard negatives
No second NPC, readable clipboard content, floor/background, player-clone recolor, exaggerated hairstyle, text/UI, alternate pose, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Scale mismatch, weak/distorted silhouette, unclear asymmetric accessory, extra background or multi-pose output = FAIL.

---

## JOB 05-08 — `hub.npc.observer`

### References
- **Image A:** accepted world-character family for scale/cluster language.
- **Image B:** Hub master for lighting and professional atmosphere.

### Output contract
Exactly ONE isolated transparent RGBA `32×48` experienced-observer NPC, bottom-center pivot and one baseline.

### Generation prompt
Create an experienced field observer as an older, distinct Hub NPC. Use a practical cap, dark weatherproof jacket, dark trousers and a compact instrument pouch/field case, with upright professional posture. Convey experience through slightly older facial/hair cues without increasing head/body size. Use broad garment masses, one or two restrained brass/amber equipment details and the same cool dusk/warm rim-light family as other characters. Avoid military/tactical appearance. This idle state becomes the identity reference for later instrument-inspection animation. Output one sprite only.

### Hard negatives
No military uniform/tactical gear, no weapon/tool raised, no floor/background, second person, text/UI, excessive facial detail, alternate pose, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Military drift, wrong scale/pivot, unclear older-observer identity, noisy detail or opaque background = FAIL.

---

## JOB 05-09 — `hub.landmark.globe_fountain`

### References
- **Image A:** accepted Hub master for plaza perspective/scale.
- **Image B:** approved scientific globe/material reference.

### Output contract
Exactly ONE isolated transparent RGBA interactive landmark, logical size `96×112`, bottom-center pivot. One globe/fountain sculpture group only.

### Generation prompt
Create the foundational central scientific globe fountain/sculpture as a standalone world landmark. Use a low circular blue-gray stone basin/plinth with a stylized blue/metal globe held above it, broad abstract continent shapes and subtle contained water jets if physically integral. Keep materials distinct—stone, metal/glass, cool cyan water—with restrained warm plaza reflections. Match Hub 3/4 perspective and maintain a strong silhouette suitable for interaction and later front-arc occlusion separation. No labels on globe. Output exactly one isolated landmark.

### Hard negatives
No plaza floor, people, readable geography/text, giant fountain spray, fantasy planetary rings, UI glow ring, second sculpture, contact sheet/grid/collage/options.

### PASS / FAIL
Perspective mismatch, unreadable front/rear depth, text/geography labels, excessive water or background pixels = FAIL.

---

## JOB 05-10 — `hub.prop.park_bench`

### References
- **Image A:** accepted Hub master for furniture scale/perspective.
- **Image B:** approved dark wood/blue-gray metal material language.

### Output contract
Exactly ONE isolated transparent RGBA bench sprite, logical size `96×48`, bottom-center ground anchor. One bench only.

### Generation prompt
Create one practical scientific-campus park bench in 3/4 perspective: dark weathered wood slats on a sturdy blue-gray painted metal frame, compact proportions and restrained cool dusk shadows with small warm reflected lamp accents. Use broad readable wood/metal pixel clusters and clean stepped perspective so the bench remains legible at runtime size. The asset should feel institutional and durable rather than ornate. Leave enough transparent padding for placement along Hub paths. Output exactly one isolated bench.

### Hard negatives
No ground patch, plant, person, cat, litter, sign, text/UI, second bench, alternate angle, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Wrong Hub perspective/scale, noisy slats, unclear anchor, extra scenery or non-transparent background = FAIL.

---

## Batch acceptance

- full-scene foundational occluders are canonical 640×360 at `(0,0)`; legacy 480×270 outputs are rejected;
- NPC/prop identities become authoritative references for later animation/state edits;
- no candidate relies on CSS offset fixes for pivot/alignment;
- one asset/state per image, true alpha where required;
- no text/UI/fake data;
- all candidates receive pixel cleanup, manifest/provenance registration and independent pixel-art/Art Director review before runtime use.
