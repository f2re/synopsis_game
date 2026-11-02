# BATCH-08 — Living World ambient sprites

Purpose: закрыть обязательные микро-объекты живого Hub: птицы, мелкая фауна, флаг, метеоприборы и дальний транспорт.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is self-contained and must be sent to ChatGPT Images separately. Never submit the whole batch as one image request.

## Shared constants

- Style authority: accepted Hub/character gold set and `hub.geometry.lock_v1` for world scale and dusk palette.
- Exactly ONE semantic asset per generation.
- True transparent RGBA background; never a painted checkerboard.
- No floor, card, UI, text, frame or unrelated scenery unless physically integral to the asset.
- Pixel style: modern premium pixel art, crisp purposeful clusters, readable silhouette, no random one-pixel noise, no vector-like anti-aliasing.
- Pivot/anchor must be explicit and preserved in manifest.

---

## JOB 08-01 — `fauna.gull.perched`

### References
- **Image A:** accepted Hub master for world scale, dusk lighting and railing context.
- **Image B:** approved fauna/pixel-art reference if available for outline and cluster language.

### Output contract
Exactly ONE isolated transparent RGBA sprite, logical size `48×48`, bottom-center pivot. One gull only; no perch/railing/background pixels.

### Generation prompt
Create one North-West coastal gull world sprite calmly perched on an implied invisible baseline, 3/4 profile suitable for the Hub camera. Use a compact believable gull silhouette: white/very pale gray body, medium gray wing masses, darker wing tips, small warm beak/leg accents and cool blue-gray reflected dusk shadows. Wings are folded cleanly against the body. The head remains proportionate rather than chibi/cartoon oversized. Build plumage with broad intentional clusters, not feather-by-feather noise. Keep feet/baseline readable so the runtime can place the bird on railings or roofs using the bottom-center pivot. Output exactly one image.

### Hard negatives
No railing, branch, ground, water, sky, second bird, flying pose, bread/food, text/UI, card, shadow plate, contact sheet, sprite sheet, grid, collage, multiple views/options or fake checkerboard transparency.

### PASS / FAIL
PASS only if silhouette reads clearly at 48×48, pivot is unambiguous and alpha is clean. Oversized cartoon head, noisy feathers, extra scenery/animal, opaque background or multi-image output = FAIL.

---

## JOB 08-02 — `fauna.cormorant.perched`

### References
- **Image A:** accepted Hub master for coastal scale/lighting.
- **Image B:** accepted gull/fauna style for cluster density consistency.

### Output contract
Exactly ONE isolated transparent RGBA sprite, logical size `48×56`, bottom-center pivot. One cormorant only.

### Generation prompt
Create one cormorant world sprite standing/perched upright in a 3/4 profile. The silhouette should be distinctly different from the gull: longer neck, narrow hooked beak, compact elongated dark body and folded wings. Use graphite-black and very dark navy feathers with cool blue highlights and tiny restrained warm reflected edges from Hub lighting. Keep the bird naturalistic within stylized pixel-art proportions and readable at small scale through large coherent mass shapes. Feet share one baseline for placement on low walls/railings. Output exactly one isolated sprite.

### Hard negatives
No spread-wing drying pose in this state, no water, pier, railing, second bird, fish, text/UI, card, background, photoreal feather texture, contact sheet/grid/collage/options.

### PASS / FAIL
If silhouette can be confused with gull, neck/beak identity is lost, baseline/pivot is unclear, background is opaque or extra objects appear = FAIL.

---

## JOB 08-03 — `fauna.squirrel.run`

### References
- **Image A:** accepted squirrel/companion identity if available; otherwise approved Hub fauna style.
- **Image B:** Hub master for ground/world scale and dusk palette.

### Output contract
Exactly ONE transparent RGBA world sprite, logical size `48×48`, bottom-center pivot. One running squirrel only.

### Generation prompt
Create one northern red/brown squirrel in a readable light-running phase for ambient Hub movement. Body is slightly extended forward, front/rear legs separated into broad readable clusters and the large fluffy tail arcs upward/back to form the main silhouette. Use warm reddish-brown mids, darker russet outline/shadows and cool blue reflected dusk accents. Keep fur rendered as clustered masses rather than individual hairs. The pose should imply a quick but natural scamper, not a dramatic leap, and remain compatible with a later idle/keyframe family at the same scale. Output exactly one isolated sprite.

### Hard negatives
No tree, grass, pavement, nut, second squirrel, speed lines, exaggerated jump, text/UI, card, motion blur, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Tail/body proportion drift, unreadable legs, ambiguous baseline, extra scenery, noisy fur or non-transparent background = FAIL.

---

## JOB 08-04 — `companion.pascal.alert`

### References
- **Image A:** accepted `companion.pascal.idle` master — authoritative for Pascal’s orange-white markings, green eyes, body scale and left-ear notch.
- **Image B:** Hub master for dusk lighting.

### Output contract
Exactly ONE transparent RGBA sprite, logical size `48×48`, bottom-center pivot, same scale family and identity as Pascal master.

### Generation prompt
Create an alert seated pose of Pascal, the plump fluffy ginger-and-white station cat. Preserve his accepted identity exactly: white chest/muzzle, warm ginger back/tail, pink nose, green eyes and small notch on the tip of the left ear. Pascal sits upright with tail wrapped near the paws, body slightly more attentive than idle and head subtly raised as if noticing a sound. Keep proportions, marking boundaries and fur mass consistent with the master. Render fur with broad clustered shapes and restrained warm/cool Hub lighting. Output one image only.

### Hard negatives
No different cat markings, no missing ear notch, no collar/accessory, no teletype/cushion/floor, no second pose, no text/UI, no cartoon surprise symbols, no contact sheet/grid/collage/options.

### PASS / FAIL
Identity drift, scale/head-size change >1–2 px, missing distinctive markings/notch, extra scenery or opaque background = FAIL.

---

## JOB 08-05 — `fauna.flock.distant`

### References
- **Image A:** Hub geometry master for distant-sky scale and contrast hierarchy.
- **Image B:** accepted individual bird style only for silhouette language.

### Output contract
Exactly ONE transparent RGBA ambient group sprite, logical size `96×48`, center pivot. One flock group of 7–9 birds.

### Generation prompt
Create one small distant flock as a single ambient group for the Hub sky. Arrange approximately 7–9 tiny bird silhouettes in a loose shallow V or curved migrating group with natural spacing and a few different wing phases. Each bird is extremely simplified—only enough pixels to read as a distant bird—and the entire flock uses 2–3 cool dark tonal values so it stays behind gameplay. Keep the group horizontally oriented for slow ambient movement and avoid a perfect geometric formation. Output exactly one transparent group sprite.

### Hard negatives
No sky fill, cloud, large foreground bird, multiple separate flock options, text/UI, labels, contact sheet, sprite sheet, grid, collage, comparison board or checkerboard background.

### PASS / FAIL
Birds too large/detailed, flock becomes a solid unreadable blob, more than one alternative group appears, or background is non-transparent = FAIL.

---

## JOB 08-06 — `hub.prop.station_flag`

### References
- **Image A:** accepted Hub master for prop scale/camera/lighting.
- **Image B:** approved project brand/weather emblem reference if available, but no text may be reproduced.

### Output contract
Exactly ONE transparent RGBA sprite, logical size `64×64`, bottom-left pivot at flagpole base. One short flagpole + one flag as a single asset.

### Generation prompt
Create one compact station flag for the meteorological campus. Use a short dark metal flagpole and a dark navy fabric flag caught in one broad readable wave. The fabric may contain a very small simple white/cyan non-text weather motif such as abstract cloud-plus-wind geometry, but no lettering or number. Keep the cloth folds broad and designed as an authored base phase for later animation; use cool dusk shadows and restrained warm edge reflections. Match the Hub camera and ensure the pole base gives a clear bottom-left anchor. Output exactly one asset.

### Hard negatives
No Russian/state flag, political/state symbols, readable “26063”, words, logos, multiple flag variants, building/ground, person, large glow, contact sheet/grid/collage/options.

### PASS / FAIL
Text/state-symbol generation, unclear anchor, perspective mismatch, excessively detailed emblem or background pixels = FAIL.

---

## JOB 08-07 — `hub.prop.mast_beacon`

### References
- **Image A:** accepted Hub master for rooftop scale and camera.
- **Image B:** approved technical mast/antenna style.

### Output contract
Exactly ONE transparent RGBA sprite, logical size `48×96`, bottom-center pivot. Upper mast section with beacon fixtures only.

### Generation prompt
Create the upper section of a scientific-campus meteorological/radio mast: slender dark steel lattice/support structure, compact antenna elements and two small red aviation obstruction beacon fixtures integrated near the top. Geometry should be technically plausible but simplified for pixel-art readability. Render metal with cool blue-gray highlights/shadows; beacon lenses may show compact red material cores but no broad emitted glow in this base asset because ON/OFF emission states are handled later. Preserve a clean bottom attachment/pivot. Output exactly one isolated sprite.

### Hard negatives
No building/roof slab, no sky, no giant telecommunications tower, no military antenna, no wide beacon halo, no text/UI, no second mast, no contact sheet/collage/options.

### PASS / FAIL
Unclear structure, oversized beacon, sci-fi/military drift, ambiguous bottom anchor or non-transparent background = FAIL.

---

## JOB 08-08 — `hub.prop.cup_anemometer`

### References
- **Image A:** accepted Hub master for scale/camera.
- **Image B:** accepted handheld/meteorological instrument style for material language.

### Output contract
Exactly ONE transparent RGBA sprite, logical size `64×80`, bottom-center pivot. One three-cup anemometer on a short mast.

### Generation prompt
Create one outdoor cup anemometer suitable for the meteorological campus. Use a short vertical mast, compact instrument housing/hub and exactly three cups on evenly spaced rotor arms. Make the rotor center and support geometry clear enough for later authored rotation frames. Keep cup shapes and arms readable with broad clusters rather than hair-thin lines, using pale/cool metal with dark blue-gray support shadows and restrained warm reflected highlights. This is the neutral/base rotor orientation. Output exactly one isolated instrument.

### Hard negatives
No four cups, no propeller instead of cups, no wind arrow, no digital display/numbers, no text/labels, no building/ground, no second instrument, no contact sheet/grid/collage/options.

### PASS / FAIL
Wrong cup count, scientifically implausible rotor, unclear pivot/support, fake data/text, perspective mismatch or background pixels = FAIL.

---

## JOB 08-09 — `hub.prop.weather_vane`

### References
- **Image A:** accepted Hub master for scale/perspective.
- **Image B:** approved scientific instrument material language.

### Output contract
Exactly ONE transparent RGBA sprite, logical size `64×72`, bottom-center pivot. One professional weather vane only.

### Generation prompt
Create a compact professional meteorological weather vane: vertical support, horizontal directional shaft/arrow with readable tail vane, and a simple cross-axis reference element without letters. Use dark steel/blue-gray material with a few restrained brass/amber accents. Keep the silhouette technical and functional rather than decorative. Match the Hub 3/4 camera and leave a clear bottom-center anchor for rooftop/ground mounting. Output exactly one isolated asset.

### Hard negatives
No decorative rooster, cardinal letters N/E/S/W, text, numbers, ground, roof, second vane, fantasy ornament, large arrow UI symbol, contact sheet/grid/collage/options.

### PASS / FAIL
Decorative/non-professional styling, generated letters, unclear pivot/direction geometry, wrong perspective or opaque background = FAIL.

---

## JOB 08-10 — `ambient.aircraft.distant`

### References
- **Image A:** accepted Hub master for distant-sky scale/lighting.
- **Image B:** approved ambient silhouette language if available.

### Output contract
Exactly ONE transparent RGBA distant aircraft sprite, logical size `96×48`, center pivot. One aircraft only.

### Generation prompt
Create one distant civilian regional aircraft silhouette suitable for a rare/deep-background Hub event. Use a compact twin-engine regional jet or turboprop-like 3/4 side silhouette, simplified into broad cool blue-gray pixel masses with only minimal highlight clusters. Keep it clearly civilian and small enough to read as far away, with no airline branding. The sprite is intended to cross the distant sky slowly and remain visually subordinate to architecture and UI. Output exactly one isolated aircraft image.

### Hard negatives
No military/fighter aircraft, weaponry, airline logo/text, contrail, sky/cloud background, multiple aircraft, airport, UI, contact sheet/sprite sheet/grid/collage/options.

### PASS / FAIL
Military appearance, excessive detail/scale, generated branding, multiple aircraft or non-transparent background = FAIL.

---

## Batch acceptance

- every file contains exactly one requested semantic object/group;
- true alpha transparency with declared logical size/pivot;
- no background/cards/text/UI/contact sheets;
- pixel-cluster language matches accepted Hub/character masters;
- animation-capable props expose stable pivots/support geometry;
- all candidates pass pixel cleanup, provenance/manifest registration and independent review before runtime use.
