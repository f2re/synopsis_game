# BATCH-14 — Hub foreground and gameplay objects

Purpose: собрать передний план и интерактивные объекты, которые создают глубину, маршруты и визуально понятные точки взаимодействия поверх архитектуры.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is a standalone copy-paste prompt and must be generated separately.

## Shared constants

- Style authority: accepted Hub master / `hub.geometry.lock_v1` for camera, perspective and material/lighting family.
- Exactly ONE semantic asset per generation.
- Output: true transparent RGBA unless an internal blank panel fill is part of the object.
- Default pivot: bottom-center.
- Pixel style: modern premium pixel art; broad readable clusters; selective outlines; no random single-pixel noise.
- Dusk palette family: cool navy/blue-gray shadow with restrained warm lamp/window reflections.
- No text/UI/fake transparency/contact sheets.

---

## JOB 14-01 — `hub.fg.railing_center`

### References
- **Image A:** accepted Hub master for camera/foreground scale.
- **Image B:** accepted railing material reference if available.

### Output contract
Exactly ONE isolated transparent RGBA sprite, logical size `192×96`, bottom-center pivot. One straight foreground railing segment only.

### Generation prompt
Create a foreground railing segment designed to sit nearest the camera and partially occlude NPC/player legs. Use sturdy dark stone posts connected by blue-black painted metal lattice/rails, matching the Hub’s elevated 3/4 perspective. Make the top rail and post caps readable as broad stepped pixel clusters; use restrained warm reflected lamp accents and cool dusk shadows. The segment should feel like practical institutional campus architecture, not ornamental wrought iron. Preserve a clean baseline and enough transparent padding for compositing. Output exactly one asset.

### Hard negatives
No plants, lamp posts, ground patch, people, sign, text, decorative crest, second segment, alternate angle, contact sheet/sprite sheet/grid/collage/options, smooth vector curves or checkerboard background.

### PASS / FAIL
Perspective mismatch, unreadable lattice, extra objects, opaque background or pivot ambiguity = FAIL.

---

## JOB 14-02 — `hub.fg.railing_corner`

### References
- **Image A:** accepted Hub master.
- **Image B:** accepted 14-01 railing segment, authoritative for post height, material, thickness and palette.

### Output contract
Exactly ONE transparent RGBA corner/turn module, logical size `128×96`, bottom-center pivot.

### Generation prompt
Create one 90-degree foreground railing corner module that connects naturally to 14-01. Preserve the same stone-post height, metal rail thickness, lattice density, material colors and dusk lighting. The perspective turn must be clear in the Hub 3/4 camera and allow modular placement at screen-edge/route corners without changing scale. Keep the silhouette compact and structurally plausible. Output one isolated module only.

### Hard negatives
No additional straight run beyond needed connection, no plants/ground/lamp, no changed railing style, no text/UI, no multiple corner options/contact sheet/collage.

### PASS / FAIL
Connection heights/thickness differ from 14-01, turn perspective conflicts with Hub camera or extra objects appear = FAIL.

---

## JOB 14-03 — `hub.fg.autumn_shrub_cluster`

### References
- **Image A:** accepted Hub master for foreground scale/lighting.
- **Image B:** accepted autumn vegetation palette/cluster language.

### Output contract
Exactly ONE isolated transparent RGBA foreground shrub cluster, logical size `128×96`, bottom-center pivot.

### Generation prompt
Create one dense foreground autumn shrub cluster intended to occlude lower portions of moving sprites. Build the foliage from broad coherent dark-green base masses with controlled amber, ochre and rust leaf clusters, preserving readable negative spaces and a clear ground-facing base silhouette. Avoid rendering individual leaves as random pixels; the asset must remain clean at runtime scale. Add only restrained warm reflected light on camera-facing edges. Output exactly one shrub asset.

### Hard negatives
No ground patch, flowers, tree trunk, lamp, bench, text/UI, loose leaf confetti, second shrub variant, contact sheet/grid/collage, blur or photoreal foliage.

### PASS / FAIL
Noisy high-frequency foliage, unclear baseline, excessive width/height, background pixels or extra objects = FAIL.

---

## JOB 14-04 — `hub.fg.conifer_cluster`

### References
- **Image A:** accepted Hub master.
- **Image B:** accepted North-West conifer style/palette.

### Output contract
Exactly ONE transparent RGBA grouped asset, logical size `144×128`, bottom-center pivot; 2–3 overlapping small pines as one cluster.

### Generation prompt
Create one compact North-West conifer cluster for foreground/midground depth. Use 2–3 small overlapping pines with distinct but unified silhouettes, broad blue-green foliage masses, darker interior shadow and restrained warm ambient reflection. Keep trunk hints minimal and foliage clusters intentional; the group should act as one optional occlusion/depth asset, not as a forest patch. Match Hub perspective/scale and leave clean transparent padding. Output one asset only.

### Hard negatives
No ground, snow, random needles, deciduous leaves, building/lamp, text/UI, extra variants, contact sheet/collage.

### PASS / FAIL
Cluster reads as noisy texture, scale conflicts with Hub, baseline/pivot unclear or unrelated scenery appears = FAIL.

---

## JOB 14-05 — `hub.prop.lamp_post_warm`

### References
- **Image A:** accepted Hub master for scale/perspective.
- **Image B:** accepted warm-light palette and metal/stone material language.

### Output contract
Exactly ONE transparent RGBA lamp-post sprite, logical size `48×96`, bottom-center pivot. Physical lamp geometry only; no large glow background.

### Generation prompt
Create one restrained campus lamp post suitable for a scientific institutional park. Use a stable dark stone/metal base, slim blue-black pole and compact classic lantern/head with warm amber light source. Render the light source as a small emissive core and minimal local fixture glow only; broad halos belong to a separate lighting mask. Match the Hub 3/4 camera and keep the silhouette readable at 48×96. Output one isolated asset.

### Hard negatives
No painted airbrush halo, no ground, flowers, sign, person, ornate Victorian fantasy decoration, text/UI, second lamp, contact sheet/collage.

### PASS / FAIL
Glow dominates sprite, silhouette unreadable, perspective mismatch, background pixels or extra prop = FAIL.

---

## JOB 14-06 — `hub.prop.direction_sign_blank`

### References
- **Image A:** accepted Hub master for street-furniture scale/perspective.
- **Image B:** accepted dark-blue UI/metal palette if useful for material consistency.

### Output contract
Exactly ONE transparent RGBA direction-sign structure, logical size `64×80`, bottom-center pivot. Sign plates remain blank.

### Generation prompt
Create one compact campus direction sign: dark metal post with 2–3 dark blue directional plates arranged in a clean institutional stack, subtle cool edge highlights and a tiny warm edge light if appropriate. Plates must remain completely blank so runtime text/icons can be rendered separately. Match Hub perspective and avoid excessive ornamental detail. Output exactly one isolated asset.

### Hard negatives
No arrows, text, pictograms, Cyrillic/Latin letters, map symbols, ground patch, person, extra sign, UI-style floating panel, contact sheet/collage.

### PASS / FAIL
Any generated text/icon, ambiguous pivot, perspective mismatch or non-transparent background = FAIL.

---

## JOB 14-07 — `hub.gameplay.discovery_plinth`

### References
- **Image A:** accepted Hub master for scale/lighting.
- **Image B:** accepted central campus material language.

### Output contract
Exactly ONE transparent RGBA interactive pedestal sprite, logical size `64×64`, bottom-center pivot. Empty socket only; no collectible shown.

### Generation prompt
Create a small interactive discovery plinth for “world findings”: a low sturdy blue-gray stone/metal pedestal with one circular recessed weather/science emblem socket, subtle cyan material accent and restrained warm reflected edge light. The silhouette should be visually distinct enough to imply interactivity but remain integrated with physical campus scenery. Keep the top/socket empty for runtime content. Output one isolated asset only.

### Hard negatives
No item displayed, no trophy, no floating glow icon, no text/level number, no ground, no UI panel, no second pedestal/contact sheet.

### PASS / FAIL
If asset reads like detached HUD rather than physical object, contains icon/text/item, or lacks clear interaction silhouette = FAIL.

---

## JOB 14-08 — `hub.gameplay.notice_board_blank`

### References
- **Image A:** accepted Hub master for scale/camera.
- **Image B:** accepted institutional street-furniture materials.

### Output contract
Exactly ONE transparent RGBA notice-board/kiosk sprite, logical size `80×96`, bottom-center pivot. Main inset panel must be blank.

### Generation prompt
Create one campus notice board/kiosk with a shallow protective roof/cap, sturdy dark blue-gray supports, one large blank dark inset display area and a small warm side lamp. The board should feel like physical campus infrastructure while leaving a clean rectangular region for runtime-rendered messages or illustrations. Maintain premium pixel clusters and the Hub 3/4 perspective. Output exactly one asset.

### Hard negatives
No posters, writing, fake maps, icons, arrows, UI labels, people, ground patch, second board, contact sheet/collage.

### PASS / FAIL
Any baked content inside panel, perspective mismatch, overdecorated frame or non-transparent exterior = FAIL.

---

## JOB 14-09 — `hub.gameplay.instrument_station`

### References
- **Image A:** accepted Hub master for world scale/perspective.
- **Image B:** accepted meteorological instrument style/source references where available.

### Output contract
Exactly ONE transparent RGBA outdoor instrument-station group, logical size `96×96`, bottom-center pivot.

### Generation prompt
Create one small scientifically plausible outdoor meteorological instrument station as a single grouped asset: a Stevenson-screen/radiation-shield-style white housing, compact thermometer/sensor enclosure and a small sensor mast on one shared base. Keep proportions functional and recognizable without over-detail. Use pale instrument surfaces with cool dusk shadows and restrained warm reflected light. The group should read as a real observation point, not decorative sci-fi equipment. Output one isolated group.

### Hard negatives
No fake digital readings, no text/labels, no giant radar, no person, no ground patch, no fantasy machinery, no second station, no contact sheet/collage.

### PASS / FAIL
Scientifically implausible silhouette, unreadable instrument grouping, fake data/text or background pixels = FAIL.

---

## JOB 14-10 — `hub.gameplay.central_globe`

### References
- **Image A:** accepted Hub master for plaza scale/perspective.
- **Image B:** approved central landmark concept/material palette.

### Output contract
Exactly ONE transparent RGBA central globe/armillary sculpture, logical size `112×128`, bottom-center pivot. No surrounding plaza/water basin unless integral to the accepted sculpture base.

### Generation prompt
Create one central interactive scientific globe sculpture for the Hub plaza. Use a readable blue/brass globe with broad abstract continent shapes, held inside a restrained armillary frame over a low blue-gray stone plinth. Keep the geometry institutional/scientific rather than fantasy astronomical. Use cool metal/stone shadows with controlled warm/cyan reflections and a clear front/rear arc structure suitable for later occlusion-layer separation. Output exactly one isolated landmark asset.

### Hard negatives
No readable labels/country names, no people, no surrounding ground, no decorative fountain jets unless explicitly integral, no UI glow ring, no text, no second version/contact sheet.

### PASS / FAIL
Globe lacks readable front/rear depth, perspective mismatches Hub, text appears, or asset includes unrelated scene geometry = FAIL.

---

## Batch acceptance

- every output contains exactly one requested semantic asset/group;
- true alpha only; no checkerboard/fake transparency;
- declared size/pivot recorded in manifest;
- no baked text/UI/fake data;
- foreground assets visibly support depth/occlusion or interaction;
- no basic placement requires CSS offset hacks;
- all candidates pass pixel cleanup, provenance/manifest registration and independent art/technical review.
