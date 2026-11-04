# BATCH-13 — Hub architecture modules aligned to Geometry Lock v1

Purpose: создать архитектурную идентичность первого/main Hub без дрейфа перспективы, масштаба или положения.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is self-contained and must be generated separately. All architecture outputs are **full-canvas aligned layers**, not freely trimmed standalone illustrations.

## Shared constants

- **Image A:** accepted `hub.geometry.lock_v1` from BATCH-12 — absolute authority for camera, horizon, footprint, roof pitch, scale and perspective.
- **Image B:** approved polished Hub style reference — authority for pixel-art material quality, palette and atmosphere.
- Every output: exactly `640×360`, transparent RGBA, origin `(0,0)`, never trim.
- Requested architecture remains inside its locked semantic region and preserves Image A footprint.
- Every pixel outside requested structure/physically integral details remains transparent.
- No terrain, sky, water, UI, labels, people or unrelated props.

Locked regions:

| Zone | Region |
|---|---|
| Radar | `x=38..178, y=66..174` |
| Maps & Analysis | `x=34..208, y=145..287` |
| 26063 Main Operations Building | `x=205..433, y=111..264` |
| Aerology | `x=438..600, y=106..221` |
| Archive | `x=351..490, y=182..289` |
| Tournament Hall | `x=492..634, y=180..301` |
| Code Post / glass lab | `x=260..397, y=203..301` |
| Central globe/plaza object | `x=246..394, y=229..329` |

---

## JOB 13-01 — `hub.arch.radar_building`

### References
- **Image A:** accepted `hub.geometry.lock_v1` — authoritative for exact Radar footprint, camera and roof relation.
- **Image B:** approved Hub style reference — authoritative for masonry/metal/glass cluster language and dusk palette.

### Output contract
Exactly ONE `640×360` transparent RGBA PNG, origin `(0,0)`, never trimmed. Only Radar-building pixels and physically integral roof fixtures may be visible. Main mass remains inside `x=38..178, y=66..174`.

### Generation prompt
Create the Radar building as a full-canvas aligned architecture layer occupying the exact accepted Radar footprint. Preserve Image A baseline, wall angles, roof pitch and scale. Give it a compact scientific institutional identity: sturdy cool blue-gray masonry/metal body, a prominent pale radome/geodesic dome integrated with the roof, restrained rooftop antenna/service details, practical service windows and small warm operational light cues. The radome must be the building’s immediate recognition feature without becoming oversized or sci-fi. Use premium intentional pixel clusters, stepped curves and controlled highlights that match Image B. Output exactly one aligned architecture layer.

### Hard negatives
Do not move, enlarge, recenter or redesign the building footprint. No surrounding trees, terrain, sky, road, people, labels, readable signs, UI, second radar building, satellite-TV toy, weaponized/sci-fi radar, contact sheet, sprite sheet, grid, collage or multiple variants. No fake checkerboard transparency, painterly blur or smooth vector dome.

### PASS / FAIL
Building footprint/roofline must register to Image A within 1–2 logical px. Region overflow that changes composition, perspective drift, missing radome identity, unrelated scene pixels, text/UI or trimmed canvas = FAIL.

---

## JOB 13-02 — `hub.arch.maps_analysis_pavilion`

### References
- **Image A:** `hub.geometry.lock_v1` for exact Maps & Analysis footprint in `x=34..208, y=145..287`.
- **Image B:** approved Hub style reference for glass/metal/material rendering.

### Output contract
Exactly ONE `640×360` transparent RGBA PNG at `(0,0)`, never trimmed. Only pavilion architecture pixels may be visible.

### Generation prompt
Create the Maps & Analysis pavilion on the exact accepted footprint and camera. Use a modern scientific-campus volume with broad glass-fronted sections, sturdy blue-gray metal/stone framing, warm interior depth and a recognizable analytical-room character. Include large window/wall areas suitable for runtime map displays or interior activity overlays, but keep all displays abstract and unreadable at this source-art stage. Preserve Image A baseline, wall angles, roofline and path relationship exactly. The building must be recognizable without a label through its open analytical/glass character, while remaining visually consistent with the rest of the campus. Output exactly one full-canvas aligned layer.

### Hard negatives
No readable synoptic charts, map text, station codes, labels, people, terrain, trees, sky, UI, new annex, enlarged glazing outside footprint, recentered standalone composition, contact sheet/grid/collage/options. No photoreal glass blur or vector-smooth frame lines.

### PASS / FAIL
Footprint/entrance/window mass must align to Image A. New geometry outside locked region, fake readable data, perspective mismatch, non-transparent background or trimmed canvas = FAIL.

---

## JOB 13-03 — `hub.arch.synoptic_center`

### References
- **Image A:** `hub.geometry.lock_v1` — exact central building footprint `x=205..433, y=111..264`, stairs and roof geometry.
- **Image B:** polished Hub reference — institutional style/material hierarchy.

### Output contract
Exactly ONE `640×360` transparent RGBA architecture layer at `(0,0)`, no trim. Only the main 26063 Main Operations Building and physically integral attached fixtures are non-transparent.

### Generation prompt
Create the main 26063 Main Operations Building as the largest and visually primary institutional building while preserving Image A geometry exactly. Use a balanced scientific/classical facade with broad central entrance, existing stair relationship, cool stone/blue-gray structural masses, warm operational windows and a restrained blank weather-insignia mounting area with no lettering. Add only compact scientifically plausible roof fittings where they fit the accepted silhouette. The building should communicate competence and centrality through massing and material quality, not through excessive monumentality. Keep vertical edges vertical and match the Hub elevated camera. Output one aligned layer only.

### Hard negatives
No readable building name/logo, new staircase, moved entrance, changed roof pitch, fantasy observatory tower, government-palace grandeur, people, terrain, sky, trees, UI, contact sheet/collage/options or standalone recentering.

### PASS / FAIL
Any stair/footprint/roofline shift >2 px, loss of central-building hierarchy, text/signage, new annex or canvas trimming = FAIL.

---

## JOB 13-04 — `hub.arch.aerology`

### References
- **Image A:** `hub.geometry.lock_v1` — exact Aerology footprint `x=438..600, y=106..221` and roof/platform relation.
- **Image B:** approved Hub style/reference for scientific glass/metal treatment.

### Output contract
Exactly ONE `640×360` transparent RGBA PNG, origin `(0,0)`, never trimmed. Only Aerology architecture and physically integral fittings may be visible.

### Generation prompt
Create the Aerology building on the exact accepted footprint. Preserve scale, roof pitch, baseline and camera from Image A. Give the building a recognizable upper-air sounding identity through architecture rather than labels: compact research volume, glass/metal preparation bay, a small upper platform or loading/prep structure, restrained roof fittings for radiosonde/balloon work and warm research interior glimpses. Keep details scientifically plausible and visually clean at Hub scale. Do not launch or place a free balloon in this architecture job; mobile balloon assets are separate. Output exactly one aligned building layer.

### Hard negatives
No exterior free balloon, giant antenna array, sci-fi launch tower, text/signage, people, terrain, sky, vegetation, UI, changed footprint, recentering, contact sheet/grid/collage/multiple variants.

### PASS / FAIL
Footprint/roof relation drift, architecture expanding beyond locked region, free balloon/event content, text/UI or wrong camera = FAIL.

---

## JOB 13-05 — `hub.arch.archive`

### References
- **Image A:** `hub.geometry.lock_v1` — Archive region `x=351..490, y=182..289`, exact footprint/roofline.
- **Image B:** accepted Hub architectural style reference.

### Output contract
Exactly ONE `640×360` transparent RGBA Archive layer at `(0,0)`, never trimmed.

### Generation prompt
Create the Archive building aligned exactly to the accepted geometry. Use an older but maintained scientific-library/institutional wing: cool masonry facade, dark blue-gray roof, tall warm windows, modest central entrance and subtle exterior service/storage cues. The architecture should suggest historical maps, observation journals and document storage through proportion/material character only, not through written signs. Keep the building grounded in North-West institutional design and visually quieter than the main 26063 Main Operations Building. Preserve every accepted footprint and roofline relationship. Output one aligned architecture layer only.

### Hard negatives
No gothic fantasy library, castle towers, oversized clock, readable archive sign, books/papers outside, people, terrain, trees, sky, UI, changed footprint, contact sheet/collage/options or standalone cropped asset.

### PASS / FAIL
Gothic/fantasy drift, footprint/roof shift >2 px, added scene content, text/signage, wrong scale or trimmed canvas = FAIL.

---

## JOB 13-06 — `hub.arch.tournament_hall`

### References
- **Image A:** `hub.geometry.lock_v1` — Tournament Hall region `x=492..634, y=180..301` and entrance mass.
- **Image B:** approved Hub style reference for institutional materials and lighting.

### Output contract
Exactly ONE `640×360` transparent RGBA building layer at `(0,0)`, never trimmed. Only Tournament Hall architecture/physically integral details are visible.

### Generation prompt
Create the Tournament Hall using the exact accepted footprint and perspective. Give it a slightly more formal, symmetrical and public-facing institutional character than secondary research buildings: broad ceremonial entrance, tall warm windows, balanced facade rhythm and a blank emblem/trophy mounting area that contains no text or symbol content. It remains part of a meteorological educational campus, not an arena or military hall. Keep scale within the locked region and preserve Image A roofline/entrance relationship. Output exactly one aligned layer.

### Hard negatives
No banners, readable event names, scoreboards, flags with text, military motifs, stadium architecture, crowd, terrain, trees, UI, new annex, recentering, contact sheet/collage/options.

### PASS / FAIL
Region overflow, altered entrance/roof geometry, sports-arena/military drift, readable content or trimmed/non-transparent canvas = FAIL.

---

## JOB 13-07 — `hub.arch.code_post_glass_lab`

### References
- **Image A:** `hub.geometry.lock_v1` — exact Code Post/glass-lab region `x=260..397, y=203..301`.
- **Image B:** approved project glass/technical architecture style.

### Output contract
Exactly ONE `640×360` transparent RGBA PNG at `(0,0)`, never trimmed. Only Code Post/glass laboratory architecture pixels visible.

### Generation prompt
Create the central compact Code Post / glass laboratory pavilion aligned to Image A. Preserve exact footprint and camera. Use transparent/glazed roof or wall sections, blue-gray structural frames, compact communications fittings, visible warm control-room volume and practical scientific-campus proportions. It should read as a technical operational node and provide a visually lighter glass contrast against masonry buildings, without fake screens or readable data. Keep the structure secondary in size to the main 26063 Main Operations Building while distinct in material. Output exactly one full-canvas architecture layer.

### Hard negatives
No readable code, AAXX groups, screen text, neon cyberpunk lab, giant antenna tower, people, terrain, plants, UI, changed footprint, glasshouse redesign outside region, contact sheet/collage/options.

### PASS / FAIL
Geometry/perspective drift, readable fake data, overgrown sci-fi styling, region overflow or trimmed canvas = FAIL.

---

## JOB 13-08 — `hub.arch.central_globe_landmark`

### References
- **Image A:** `hub.geometry.lock_v1` — exact central landmark region `x=246..394, y=229..329`, plaza relationship and baseline.
- **Image B:** approved scientific landmark style/material palette.

### Output contract
Exactly ONE `640×360` transparent RGBA landmark layer at `(0,0)`, never trimmed. Only globe/armillary/plinth/fountain structure pixels physically integral to the object are visible.

### Generation prompt
Create the central scientific globe/armillary landmark aligned exactly to the accepted plaza position. Use a readable blue/brass globe with broad abstract continent masses, restrained armillary frame and a low scientific stone/metal plinth or compact fountain structure if already implied by Image A. Build clear front/rear depth so later occlusion layers can separate the foreground arc from sprites passing behind it. Keep scale appropriate to the plaza and use cool material shadows with restrained warm/cyan reflections. No labels on the globe. Output one aligned full-canvas layer.

### Hard negatives
No country names, latitude/longitude text, fantasy planetary rings, giant monument scale, people, plaza paving outside object footprint, new paths, UI, contact sheet/collage/options or cropped standalone presentation.

### PASS / FAIL
Centroid/baseline shift >2 px, landmark too large for locked region, unreadable front/rear structure, text or unrelated plaza geometry = FAIL.

---

## JOB 13-09 — `hub.arch.rooftop_instruments`

### References
- **Image A:** `hub.geometry.lock_v1` — authoritative for all rooftop instrument anchor locations.
- **Image B:** accepted building layers from 13-01…13-07 and approved meteorological instrument style references.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, never trimmed. Visible pixels are ONLY rooftop scientific instruments already implied/approved for the architecture.

### Generation prompt
Create the rooftop instrument overlay for the accepted Hub architecture. At exact approved roof anchors, add compact scientifically plausible equipment such as small radar/communication dishes, antennas, wind sensors, radiation-shield elements, cable boxes and short mast structures. Keep each instrument subordinate to its building and readable at Hub scale through broad silhouette clusters. Preserve every roof pixel by leaving roofs themselves transparent; this layer contains instruments only. Match cool metal shadows and restrained warm reflected light. Output exactly one aligned overlay.

### Hard negatives
No roof repaint, giant radar, dense antenna forest, sci-fi weapon equipment, fake digital displays, readable labels, new building, sky, people, UI, moved anchors, contact sheet/collage/options.

### PASS / FAIL
Any instrument anchor drift >2 px, copied roof/building pixels, scientifically implausible fantasy form, excessive density or canvas trim = FAIL.

---

## JOB 13-10 — `hub.arch.shared_entrance_details`

### References
- **Image A:** `hub.geometry.lock_v1` for approved entrance locations.
- **Image B:** accepted BATCH-13 building layers for exact doorway geometry/material language.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, never trimmed. Only approved reusable entrance-detail pixels may be visible.

### Generation prompt
Create a shared entrance-detail overlay for the accepted campus buildings at their existing positions. Add only restrained glass/metal canopies, compact warm ceiling lamps, short railings and institutional door surrounds where those details are already compatible with Image A and the accepted building layers. Preserve doorway widths, stair geometry, facade planes and building footprints exactly. Use one coherent scientific-campus material system so secondary entrances feel related without becoming identical clones. All text/signage remains runtime UI and is absent. Output exactly one aligned full-canvas overlay.

### Hard negatives
No new entrance, moved doorway, changed stairs, readable sign, direction arrow, people, ground, vegetation, large awning outside accepted footprint, UI, contact sheet/grid/collage/options.

### PASS / FAIL
Any doorway/stair geometry change, entrance added where none exists, signage/text, layer misalignment or non-transparent unrelated pixels = FAIL.

---

## Batch acceptance

- every output is exactly 640×360 transparent RGBA at `(0,0)` and never trimmed;
- each building/landmark preserves its locked region, footprint, baseline, roof pitch and camera;
- layers stack on `hub.geometry.lock_v1` without CSS offsets or manual scaling;
- buildings remain distinguishable without labels;
- no text/UI/fake meteorological data is baked into architecture;
- all candidates receive pixel cleanup, provenance/manifest registration, pixel-art quality review and Art Director acceptance before runtime use.
