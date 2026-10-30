# BATCH-02 — Avatar: низ, обувь, рюкзаки

**Prerequisite:** accepted 00-02 inventory-avatar master as image reference.  
Каждый job — отдельная генерация; output — только named overlay на общем 160×240 transparent canvas с неизменным bottom-center anchor.

## JOB 02-01 — `avatar.top.sweater`
> Create exactly ONE standalone transparent clothing overlay: cozy meteorologist wool sweater aligned to the attached accepted avatar master. Output ONLY sweater pixels. Keep shoulders, arms, hand openings, waist and pose exactly unchanged. Dense blue-gray/navy wool with a restrained geometric isobar-inspired knit motif that remains decorative and does NOT imitate a real meteorological chart; no text. Use broad coherent pixel clusters, subtle warm indoor highlight and cool shadow, no fuzzy yarn noise. Full common canvas, genuine alpha, no body, background, second sweater, comparison board or sprite sheet.

## JOB 02-02 — `avatar.bottom.field_cargo`
> Create exactly ONE standalone transparent lower-body clothing overlay: durable field cargo trousers aligned to the accepted avatar master. Output ONLY trousers. Preserve exact hip, leg, knee, ankle and foot-opening positions. Muted olive/conifer technical fabric, reinforced knees and two readable utility pockets; compact functional silhouette, not military camouflage. Pixel clusters should describe fabric planes and folds without random speckle. Cool shadow, small warm reflected light, local-color outline. No torso/body/feet/background/text/variants/sheet.

## JOB 02-03 — `avatar.bottom.slacks`
> Create exactly ONE standalone transparent lower-body overlay: formal service slacks for indoor meteorological duty, aligned exactly to the accepted avatar master. Output ONLY trousers. Deep navy-charcoal fabric, straight clean cut, subtle crease, simple belt/waist treatment without text. Preserve hip width, leg stance, ankle positions and baseline. Modern polished pixel art with restrained clusters and local-color outline. Genuine transparent full canvas; no shoes, torso, background, mannequin, second option or sprite sheet.

## JOB 02-04 — `avatar.bottom.overalls`
> Create exactly ONE standalone transparent insulated bib-overall overlay aligned to the accepted avatar master. Output ONLY the overalls layer; head, hands, outer coat and shoes remain transparent. Deep blue weatherproof fabric, visible bib, shoulder straps, reinforced knees, practical side fasteners, compact winter-work silhouette. Preserve exact pose and body landmarks; do not enlarge anatomy. Intentional clusters, cool navy shadows, limited amber hardware highlights, no texture noise. No body/background/text/duplicate/sheet.

## JOB 02-05 — `avatar.footwear.boots`
> Create exactly ONE standalone transparent footwear overlay: sturdy field boots aligned precisely to the accepted avatar master. Output ONLY the two boots. High dark-brown leather/technical boots with readable ankle support and chunky but not exaggerated wet-ground tread. Preserve exact foot positions, stance width and bottom baseline. Pixel-art material clusters, dark local outline, cool reflected shadow and small warm leather highlight. No legs, ground, mud splashes, card, text, alternate shoes or sprite sheet.

## JOB 02-06 — `avatar.footwear.shoes`
> Create exactly ONE standalone transparent footwear overlay: comfortable indoor service shoes aligned to the accepted avatar master. Output ONLY both shoes. Compact dark navy/charcoal leather shoes with soft sole, understated professional design, readable toe/sole separation at inventory-avatar scale. Match foot positions and baseline exactly. Clean clusters, local-color outline, no glossy vector gradient. Transparent canvas only; no legs/floor/text/duplicate/variants/sheet.

## JOB 02-07 — `avatar.footwear.felt`
> Create exactly ONE standalone transparent footwear overlay: traditional felt boots with protective galoshes for severe-cold station work, aligned to the accepted avatar master. Output ONLY footwear. Muted gray felt shafts with dark rubber lower sections, sturdy practical silhouette, subtle snow-weather character without actual snow particles. Preserve foot stance and baseline. Clustered pixel shading, no fuzzy noise. No legs, ground, background, text, second pair or sprite sheet.

## JOB 02-08 — `avatar.backpack.satchel`
> Create exactly ONE standalone transparent avatar accessory overlay: observer document satchel aligned to the accepted master. Output ONLY bag plus its visible strap. Brown weathered leather rectangular field-document bag hanging at one side, compact brass buckle, strap crossing the torso without covering face/hands. Keep all body landmarks and pose fixed; design the overlay so behind-body and front-strap portions can later be split into two Aseprite layers. Intentional material clusters, warm leather highlight, cool shadow. No body/background/text/extra bag/sheet.

## JOB 02-09 — `avatar.backpack.field`
> Create exactly ONE standalone transparent avatar accessory overlay: compact expedition backpack aligned to the accepted master. Output ONLY backpack plus visible straps. Muted conifer technical canvas, rolled map/weather cover secured at top, small instrument attachment loops, practical meteorological field gear rather than military pack. Do not change shoulder/arm geometry. Keep full common canvas and exact pivot; clear back mass with narrow front straps suitable for later layer split. No body, scenery, labels, second pack or sprite sheet.

## JOB 02-10 — `avatar.backpack.radio`
> Create exactly ONE standalone transparent avatar accessory overlay: portable field radio pack aligned to the accepted avatar master. Output ONLY radio pack, antenna and straps. Compact dark navy/gray rugged housing, short flexible antenna, simple knobs/connectors, restrained amber status detail without readable digits. Preserve shoulders/arms and pose; no sci-fi styling. Pixel-art clusters emphasize metal/plastic planes, clean local outline. Transparent full canvas; no body/background/text/duplicate/sheet.

## Acceptance

Backpacks that cross the torso are split after approval into `back` and `front_strap` layers in editable source. All garment boundaries are corrected against the same silhouette template before runtime export.