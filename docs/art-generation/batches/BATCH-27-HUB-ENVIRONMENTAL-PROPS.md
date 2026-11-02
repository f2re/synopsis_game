# BATCH-27 — Hub environmental props

Purpose: наполнить главный экран правдоподобными мелкими объектами научного кампуса, не запекая их в `hub.geometry.lock_v1` и не превращая сцену в визуальный шум.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB below is a standalone prompt and must be generated separately.

## Shared constants

- Style reference: accepted Hub master and approved prop family.
- Perspective: same elevated 3/4 / isometric-lite Hub camera.
- Output: exactly ONE isolated transparent RGBA asset per job; no background/floor unless physically integral.
- Pivot: bottom-center unless explicitly specified.
- Pixel style: premium modern pixel art, crisp clusters, controlled selective outlines, no random single-pixel texture.
- Palette: cool blue-gray/dark metal/wood/stone base with restrained warm dusk reflections.
- Props are optional/removable and must not be required to understand navigation.

---

## JOB 27-01 — `hub.prop.bike_rack`

### References
- **Image A:** accepted Hub master for camera, scale and material language.
- **Image B:** accepted nearby campus street-furniture prop if available for outline/lighting consistency.

### Output contract
Exactly ONE transparent RGBA sprite, logical size `128×64`, bottom-center pivot. One asset group: one rack plus 2–3 simple bicycles.

### Generation prompt
Create a compact bicycle parking rack suitable for a functioning meteorological/scientific campus. Use dark painted metal hoops or a restrained linear rack with 2–3 simple commuter bicycles parked naturally as one grouped asset. Bicycle frames, wheels and handlebars must be simplified enough to remain readable at 128×64 without dense spoke noise. Match the Hub 3/4 perspective and dusk lighting, with cool metal shadows and a few tiny warm reflected highlights. The object should feel practical and used, not decorative or sporty. Output exactly one isolated asset.

### Hard negatives
No people, no ground patch, no bike-shop signage, no readable brand logos, no detailed wheel spokes, no scattered accessories, no text/UI, no contact sheet/sprite sheet/grid/collage/multiple options, no fake checkerboard transparency.

### PASS / FAIL
Unreadable bicycle silhouettes, perspective mismatch, dense spoke noise, opaque background or extra unrelated object = FAIL.

---

## JOB 27-02 — `hub.prop.utility_box`

### References
- **Image A:** accepted Hub master.
- **Image B:** accepted technical metal props for palette/material reference.

### Output contract
Exactly ONE transparent RGBA sprite, `48×64`, bottom-center pivot.

### Generation prompt
Create one outdoor technical utility/electrical cabinet for the campus: compact blue-gray weatherproof metal enclosure, slightly raised base, simple door seam, a few broad ventilation slots and one tiny amber service indicator. Keep proportions plausible for outdoor infrastructure and use grouped metal highlight/shadow clusters rather than texture noise. It should be visually secondary and reusable near service walls or paths. Output exactly one isolated asset.

### Hard negatives
No readable warning label, no high-voltage text/icon, no graffiti, no cable maze, no wall/ground background, no UI, no second cabinet, no collage/contact sheet.

### PASS / FAIL
Text/icon generation, perspective drift, noisy vents or extra scene geometry = FAIL.

---

## JOB 27-03 — `hub.prop.map_kiosk_blank`

### References
- **Image A:** accepted Hub master for scale/camera.
- **Image B:** accepted UI/scene metal-and-glass language.

### Output contract
Exactly ONE transparent RGBA sprite, `80×112`, bottom-center pivot. The display surface must be blank and dark for runtime content.

### Generation prompt
Create a freestanding scientific-campus information/map kiosk: sturdy dark blue-gray metal frame, shallow protective cap, one large blank inset display panel, subtle warm side or top light and a stable base. The panel must remain an empty uniform dark surface so runtime UI can place actual content separately. Keep the silhouette readable at Hub scale and match the same 3/4 perspective as architecture. Output one isolated asset only.

### Hard negatives
No baked map, no Cyrillic/Latin text, no fake icons, no poster, no person, no ground patch, no glowing screen content, no contact sheet/collage/options.

### PASS / FAIL
Any generated text/map/icon inside the panel, distorted 3/4 perspective or non-transparent background = FAIL.

---

## JOB 27-04 — `hub.prop.planter_large`

### References
- **Image A:** accepted Hub master for vegetation/material language.
- **Image B:** current seasonal vegetation state if generating a season-specific source variant.

### Output contract
Exactly ONE transparent RGBA sprite, `80×64`, bottom-center pivot.

### Generation prompt
Create one large institutional planter used along campus paths: low sturdy stone/painted-metal vessel with broad readable material planes and a compact North-West vegetation mass. Vegetation must use coherent clusters rather than individual confetti leaves. The planter silhouette should support seasonal recolor/replacement later without changing the base vessel geometry. Match Hub perspective and restrained dusk highlights. Output exactly one asset.

### Hard negatives
No ground patch, no scattered fallen leaves outside planter, no sign/text, no highly ornamental fantasy pot, no dense flower noise, no multiple planters or variants.

### PASS / FAIL
Noisy foliage, perspective mismatch, vessel geometry too ornate or opaque background = FAIL.

---

## JOB 27-05 — `hub.prop.trash_bin`

### References
- **Image A:** accepted Hub master and street-furniture style.

### Output contract
Exactly ONE transparent RGBA sprite, `40×56`, bottom-center pivot.

### Generation prompt
Create a restrained campus waste/recycling bin: compact dark blue-gray powder-coated metal unit, simple lid/opening geometry, stable base and perhaps one tiny non-textual color accent integrated into the material. Keep it institutional, durable and visually quiet. Render broad metal planes with a few purposeful highlights so it remains legible at 40×56. Output one isolated asset only.

### Hard negatives
No readable recycling text, no large recycling logo, no overflowing trash, no litter, no ground, no person, no second bin, no UI/contact sheet.

### PASS / FAIL
Generated lettering/symbol dominance, silhouette ambiguity, perspective mismatch or background pixels = FAIL.

---

## JOB 27-06 — `hub.prop.delivery_cart`

### References
- **Image A:** accepted Hub master.
- **Image B:** accepted technical equipment-case language if available.

### Output contract
Exactly ONE transparent RGBA sprite, `72×56`, bottom-center pivot.

### Generation prompt
Create a small hand trolley used by station staff to move documents or instruments: compact dark metal frame, two readable wheels, simple handle and one closed blue-gray equipment/document case secured on the platform. Match the Hub 3/4 perspective and use clean clusters for wheels/frame without mechanical micro-detail. The prop should look practical and movable but static in this frame. Output one isolated asset.

### Hard negatives
No person pushing it, no text/labels on case, no packages pile, no ground patch, no industrial forklift styling, no motion blur, no collage.

### PASS / FAIL
Unreadable wheel/frame geometry, incorrect scale, fake branding/text or extra objects = FAIL.

---

## JOB 27-07 — `hub.prop.outdoor_table`

### References
- **Image A:** accepted Hub master for furniture perspective/material.

### Output contract
Exactly ONE transparent RGBA sprite, `96×64`, bottom-center pivot. One table/bench group with minimal integral props.

### Generation prompt
Create one compact outdoor scientific-work table or bench for campus use: weather-resistant dark wood slats and blue-gray metal support, broad 3/4 perspective, one closed blank notebook and one empty mug silhouette resting on top as quiet life cues. Keep the notebook surface unreadable and the mug simple. The object should feel like a place staff briefly review notes outdoors, not a café set. Output exactly one asset group.

### Hard negatives
No readable notebook text, no food, no chairs unless integral to bench design, no person, no ground patch, no extra table, no contact sheet/collage.

### PASS / FAIL
Props too detailed/noisy, perspective mismatch, generated writing or non-transparent background = FAIL.

---

## JOB 27-08 — `hub.prop.service_ladder`

### References
- **Image A:** accepted Hub master/architecture perspective.

### Output contract
Exactly ONE transparent RGBA sprite, `48×96`, bottom-center pivot.

### Generation prompt
Create a short fixed maintenance ladder/stair element for rooftop or service access: dark weather-resistant metal, clear vertical supports and broad rung clusters, slightly industrial but consistent with a research campus. Match the Hub camera so it can sit against a service wall without perspective conflict. Use simplified structural detail that survives 48×96 resolution. Output one isolated asset only.

### Hard negatives
No wall/roof background, no person, no safety sign text, no exaggerated fire-escape network, no rust texture noise, no multiple views.

### PASS / FAIL
Perspective incompatible with Hub, too-thin unreadable rungs, background geometry or text = FAIL.

---

## JOB 27-09 — `hub.prop.sensor_cabinet`

### References
- **Image A:** accepted Hub master.
- **Image B:** accepted meteorological instrument style.

### Output contract
Exactly ONE transparent RGBA sprite, `64×80`, bottom-center pivot.

### Generation prompt
Create an outdoor meteorological sensor/logger cabinet as a compact technical prop: weatherproof blue-gray enclosure, small cable conduit, a simplified radiation-shield element and restrained service hardware. Make the instrument scientifically plausible at broad visual level without showing readable screens or invented data. Keep materials crisp and aligned with other station instruments. Output one isolated asset.

### Hard negatives
No fake digital values, no readable labels, no antenna forest, no sci-fi device, no wall/ground, no person, no contact sheet.

### PASS / FAIL
Readable fake data, implausible decorative sci-fi form, perspective drift or extra scenery = FAIL.

---

## JOB 27-10 — `hub.prop.notice_post_blank`

### References
- **Image A:** accepted Hub master and street-furniture style.

### Output contract
Exactly ONE transparent RGBA sprite, `64×80`, bottom-center pivot. One blank plate for runtime text/content.

### Generation prompt
Create one small standing campus notice post: stable dark-metal/stone support, a single blank rectangular dark plate and one subtle warm edge lamp integrated into the structure. The plate must be completely free of writing, posters and pictograms so runtime content can be layered separately. Match the same 3/4 camera, dusk palette and premium pixel-art cluster language as the Hub. Output exactly one isolated asset.

### Hard negatives
No generated poster, no text, no arrows/icons, no ground patch, no second sign, no UI panel styling, no contact sheet/collage/options.

### PASS / FAIL
Any baked content on the plate, perspective mismatch, background pixels or extra sign = FAIL.

---

## Batch acceptance

- one semantic prop group per file;
- real alpha transparency with no painted checkerboard;
- declared logical size and pivot recorded in manifest;
- no baked labels/fake data;
- every prop reads at intended runtime scale and matches Hub camera;
- props are removable without leaving holes in base scene geometry;
- candidates pass pixel cleanup, provenance/manifest registration, pixel-art review and Art Director review before runtime use.
