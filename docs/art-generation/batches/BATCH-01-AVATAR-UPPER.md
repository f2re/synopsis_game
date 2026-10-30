# BATCH-01 — Avatar: волосы, головные уборы, верх

**Prerequisite:** приложить принятый `character_player_inventory_master.png` (00-02) как image reference к КАЖДОЙ генерации.  
**Критично:** это 10 отдельных image-generation вызовов. Каждый результат — прозрачный full-canvas 160×240 overlay с тем же bottom-center anchor. Базового персонажа в output быть не должно: только named layer.

## JOB 01-01 — `avatar.hair.short`
> Create exactly ONE standalone transparent avatar overlay: short practical meteorologist haircut. Use the attached accepted inventory-avatar master strictly as alignment reference. Preserve the exact head position, skull volume, face opening, shoulder line, canvas and bottom-center anchor; output ONLY hair pixels, not the face/body. Neat short dark-brown hair with a natural side break and a few readable tousled clusters, appropriate for a young trainee. Modern polished pixel art, intentional medium clusters, selective dark-brown local outline, cool navy shadow and restrained warm highlight. No random strands/noise, no hat, no face, no background, no card, no second variant, no sprite sheet, no text. Genuine transparent RGBA everywhere outside the hair.

## JOB 01-02 — `avatar.hair.bob`
> Create exactly ONE standalone transparent avatar overlay: clean shoulder-length bob haircut for the same accepted avatar master. Match head/face opening and shoulder placement exactly; do not alter anatomy or pose. Output ONLY hair pixels. Structured but natural bob with a few broad lock clusters and clear silhouette around jaw/neck; dark-brown base compatible with recoloring. Modern polished pixel art, grouped highlights, no individual-strand noise, no soft painterly edge, selective local-color outline. Keep transparent holes around face/neck correct for compositing. One image only; no face/body, background, labels, alternate styles or contact sheet.

## JOB 01-03 — `avatar.hair.braid`
> Create exactly ONE standalone transparent avatar hair overlay: practical field braid aligned to the accepted avatar master. Do not change head, shoulders, hands or pose. Output ONLY the hair layer. Front hair is compact and wind-safe; one readable braid descends behind/along one shoulder without covering the hands. Build braid from a few interlocking pixel clusters rather than tiny repeated noise. Dark-brown neutral master color suitable for palette swaps, cool shadow, limited warm highlight, local-color outline. Preserve exact 160×240 full-canvas alignment and bottom-center anchor. No face/body, hat, background, card, text, extra braid, variants or sprite sheet.

## JOB 01-04 — `avatar.hair.curly`
> Create exactly ONE standalone transparent avatar hair overlay: voluminous naturally curly hairstyle aligned to the accepted avatar master. Output ONLY hair pixels. Preserve exact face opening, head center, shoulders and baseline. Curly volume should read through 6–10 large coherent curl masses, not hundreds of isolated dots; slightly irregular cyclone-like silhouette but professional and believable. Dark-brown master color, grouped warm highlights and cool navy shadow pockets, selective local outline. No anatomy changes, no face/body, background, decorative particles, labels, duplicate variants or sheet.

## JOB 01-05 — `avatar.headwear.ushanka`
> Create exactly ONE standalone transparent avatar overlay: practical polar ushanka for the accepted inventory-avatar master. Output ONLY the hat. Keep exact head position and canvas; do not redraw hair/face/body. Dark navy/blue-gray weatherproof outer fabric with compact muted fur trim, ear flaps lowered, simple scientific-service utilitarian shape. Pixel-art clusters must clearly distinguish fur mass from fabric without fuzzy noise. Cool shadows and restrained warm amber edge light; local-color outline. Transparent face opening and all unused canvas. No badge text, logo, snow, background, card, alternate flap positions, second hat or sprite sheet.

## JOB 01-06 — `avatar.headwear.cap`
> Create exactly ONE standalone transparent avatar overlay: observer field cap aligned to the accepted avatar master. Output ONLY the cap. Compact navy/blue field cap with short readable visor and one tiny non-text brass station emblem shape; believable meteorological field gear, not baseball branding. Keep head center, tilt and full 160×240 canvas exactly. Clean stepped visor geometry, deliberate clusters, local-color outline, cool shadow and small amber highlight. No face/hair/body, background, lettering, logo text, duplicate cap, variants or sheet.

## JOB 01-07 — `avatar.headwear.glasses`
> Create exactly ONE standalone transparent avatar overlay: thin researcher glasses aligned precisely to the accepted avatar master. Output ONLY glasses pixels. Two small thin metal frames, subtle bridge and temples, lenses mostly transparent with one or two controlled cool highlights; no opaque white lens fill. Maintain exact eye/face alignment and canvas. Pixel art must remain readable without oversized cartoon goggles. No face/body/hair, no background, no UI card, no text, no extra glasses or variants.

## JOB 01-08 — `avatar.top.lab_coat`
> Create exactly ONE standalone transparent clothing overlay: meteorological laboratory coat aligned to the accepted avatar master. Output ONLY garment pixels; hands/head/legs remain transparent. Preserve shoulder width, elbow/hand positions, waist seam and pose exactly. Off-white cotton coat, practical mid-thigh length, two deep work pockets, small pen/tool indication without readable text, subtle blue-gray shadows and warm office highlights. Clean pixel clusters and fabric folds, no painterly texture. Do not alter the silhouette outside reasonable coat hems. One image only, no body, room, card, labels, alternate coat or sheet.

## JOB 01-09 — `avatar.top.field_jacket`
> Create exactly ONE standalone transparent clothing overlay: wind-resistant field jacket for a North-West meteorology observer, aligned exactly to the accepted avatar master. Output ONLY jacket pixels. Muted conifer/blue-green technical fabric, compact high collar, practical pockets and seam blocks, small brass/amber zipper accents. Preserve shoulders, arms, hand cutouts, waist and pose. Strong readable silhouette, grouped fabric shading, cool navy shadows, local-color outline, no camouflage pattern noise. No body/background/text/brand/second variant/sprite sheet.

## JOB 01-10 — `avatar.top.parka`
> Create exactly ONE standalone transparent clothing overlay: heavy arctic station parka aligned to the accepted avatar master. Output ONLY parka pixels. Deep service navy with a roomy but controlled insulated silhouette, hood resting behind the head, warm muted fur/lining accent, reinforced cuffs and large practical pockets. Keep hands/head transparent and exact base pose/pivot unchanged. Use larger clusters to show padded volume; no fuzzy fur noise, no logos or text. Genuine transparent full canvas, no body, snow, scenery, card, alternate pose or sprite sheet.

## Acceptance

Reject any result that changes body geometry. Do not compensate alignment errors with CSS offsets. After selection, all ten layers are pixel-cleaned against the same `.aseprite` template and exported from one common canvas.