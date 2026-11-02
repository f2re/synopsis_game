# BATCH-25 — Hub interaction visual states

Purpose: дать интерактивным зонам главного Hub ясную визуальную обратную связь без запекания текста, labels, level data или hitbox-геометрии в изображение.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is a self-contained full-canvas overlay prompt and must be generated separately.

## Shared constants

- Geometry authority: `hub.geometry.lock_v1`.
- Architecture authority: accepted BATCH-13 layers.
- Canvas for every job: `640×360` transparent RGBA, origin `(0,0)`, never trim.
- The interaction overlay may contain only highlight/dim/accent pixels for the requested state.
- Runtime labels, text, level numbers, hit regions and pointer logic remain separate DOM/Phaser geometry.
- Interaction state must remain readable under day/night/weather variants without becoming neon or overpowering the active task CTA.

---

## JOB 25-01 — `hub.interaction.radar.hover`

### References
- **Image A:** `hub.geometry.lock_v1` — authoritative for camera and Radar position.
- **Image B:** accepted Radar building layer — authoritative for radome/entrance contours and material palette.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay at `(0,0)`, never trimmed. Only Radar hover-accent pixels may be visible.

### Generation prompt
Create a restrained hover-state overlay for the accepted Radar building. Preserve all architecture unchanged and add only a small set of interaction accents: cool-cyan edge highlights on already-existing radome/technical contours, a subtle warm emphasis around the accepted entrance, and at most a few compact brighter pixels on an existing scientific fixture. The building should feel selectable but still belong to the premium pixel-art scene. Keep accents narrow and local, with no large glow cloud. Output exactly one image containing only the hover overlay.

### Hard negatives
No whole-building redraw, no new radome, no moved entrance, no text/label/level badge, no halo around full silhouette, no neon outline, no arrows/icons, no UI panel, no contact sheet/sprite sheet/grid/collage/options, no checkerboard background.

### PASS / FAIL
If overlay extends materially beyond Radar hotspot, changes architecture, competes with CTA or contains text/iconography = FAIL.

---

## JOB 25-02 — `hub.interaction.maps.hover`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Maps & Analysis pavilion layer.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay containing only Maps & Analysis hover accents.

### Generation prompt
Create a subtle selectable-state overlay for the Maps & Analysis pavilion. Emphasize only existing glass-frame edges with restrained cyan clusters and one warm interior/doorway cue that improves discoverability. Preserve exact window/frame geometry and do not introduce fake map graphics. The accent must remain subordinate to the current task and compatible with dusk/day/rain states. Output one transparent overlay only.

### Hard negatives
No readable maps, no new glazing, no full facade copy, no glow plate, no text/UI/badge/icon, no multiple states in one image.

### PASS / FAIL
Any new geometry, excessive glow bleeding into adjacent hotspot, or fake map/data content = FAIL.

---

## JOB 25-03 — `hub.interaction.archive.hover`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Archive layer.

### Output contract
Exactly ONE `640×360` transparent RGBA hover overlay.

### Generation prompt
Create an Archive hover-state overlay using only existing entrance/window/facade-edge coordinates. Add a restrained amber emphasis to selected accepted windows/doorway pixels and a faint cool contour cue along one or two existing facade edges. The treatment should communicate interactability while preserving the quiet scholarly character of the Archive. Output exactly one overlay image.

### Hard negatives
No new window or door, no sign/text, no glowing book icon, no whole-building outline, no facade repaint, no contact sheet/collage/options.

### PASS / FAIL
Architecture drift, text/icon insertion, bright halo or overlap into neighbouring hotspot = FAIL.

---

## JOB 25-04 — `hub.interaction.aerology.hover`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Aerology layer.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay restricted to Aerology hotspot accents.

### Generation prompt
Create a subtle Aerology hover state. Add restrained cyan accents on already-existing scientific roof/preparation-bay details and a gentle warm interior emphasis through accepted glazing. Preserve all geometry and keep the effect compact. It should visually suggest upper-air science without launching a balloon or adding new equipment. Output one overlay only.

### Hard negatives
No new balloon, no moved equipment, no text/labels, no full silhouette neon, no UI badge/arrow, no contact sheet/grid/collage.

### PASS / FAIL
New object insertion, architecture change, glow beyond hotspot or semantic ambiguity with another building = FAIL.

---

## JOB 25-05 — `hub.interaction.tournament.hover`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Tournament Hall layer.

### Output contract
Exactly ONE `640×360` transparent RGBA hover overlay.

### Generation prompt
Create a restrained hover state for Tournament Hall that feels slightly ceremonial without becoming flashy. Use compact gold/amber accents on already-existing entrance, emblem-mounting or window-edge geometry and a small cool contour support if needed for separation. Keep the institutional meteorological-campus language intact. Output one transparent overlay only.

### Hard negatives
No trophy graphic, no banner, no readable event text, no scoreboard, no full-building glow, no changed facade, no collage/multiple options.

### PASS / FAIL
If the state reads like a UI badge rather than architectural emphasis, or if geometry changes, = FAIL.

---

## JOB 25-06 — `hub.interaction.codepost.hover`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted Code Post layer.

### Output contract
Exactly ONE `640×360` transparent RGBA overlay.

### Generation prompt
Create the Code Post hover state using compact cyan operational accents on accepted communications/entrance details plus a subtle warm control-room emphasis. Preserve all facade and antenna geometry. The result should communicate “active operations point” through material/light cues only, with no text, status symbol or HUD-like element. Output exactly one overlay.

### Hard negatives
No readable code, no new antenna, no terminal icon, no neon frame, no full facade copy, no text/UI, no contact sheet/collage.

### PASS / FAIL
Any new geometry, fake data, or accent spill into adjacent hotspot = FAIL.

---

## JOB 25-07 — `hub.interaction.maincenter.hover`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted main 26063 main operations building layer.

### Output contract
Exactly ONE `640×360` transparent RGBA hover overlay restricted to central building accents.

### Generation prompt
Create a restrained hover state for the main 26063 main operations building. Emphasize the accepted entrance stairs, central doorway and approved weather-insignia mounting area with a balanced cyan/amber pixel treatment. The main center may read slightly stronger than secondary buildings but must not become a glowing beacon or compete with the main CTA. Preserve the central building silhouette exactly. Output one overlay only.

### Hard negatives
No new logo/text, no full-outline glow, no facade recolor, no moved stairs/door, no UI button treatment, no collage/multiple variants.

### PASS / FAIL
If the hover becomes visually dominant over CTA, changes building form or introduces a sign/icon = FAIL.

---

## JOB 25-08 — `hub.interaction.selected.ringless`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted base architecture of the currently selected hotspot.
- **Image C:** corresponding accepted hover overlay if available.

### Output contract
Exactly ONE `640×360` transparent RGBA generic selected-state overlay. The generated state must be applicable through a building-specific edit, not a literal ring asset.

### Generation prompt
Create a stronger selected-state architectural emphasis than hover while preserving the building unchanged. Build the state from a denser set of existing edge/fixture highlights and a controlled increase in accepted entrance/interior emphasis. The selected state should remain integrated with pixel-art materials and should not look like a floating HUD outline. No circular ring is allowed. Output exactly one overlay representing one selected building state only.

### Hard negatives
No ring, no marquee border, no neon full silhouette, no pulsing rays, no text/icon/badge, no geometry change, no multi-building highlight, no contact sheet.

### PASS / FAIL
If state cannot be cleanly removed to reveal unchanged base, or if it resembles detached UI rather than scene-integrated feedback = FAIL.

---

## JOB 25-09 — `hub.interaction.locked.dim_mask`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted target-building mask/architecture.

### Output contract
Exactly ONE `640×360` transparent RGBA dimming overlay confined to one accepted building region.

### Generation prompt
Create a locked-state local contrast-reduction overlay for the target building. Use cool desaturated blue-gray translucent pixel clusters that lower saturation/contrast while preserving every silhouette and readable material boundary. The state must make the building feel unavailable without hiding it or implying damage. Runtime will supply any lock icon/text separately. Output one overlay only.

### Hard negatives
No padlock icon, no text, no grayscale repaint of whole scene, no black opaque box, no changed building pixels beyond translucent local mask, no contact sheet/collage.

### PASS / FAIL
If silhouette becomes hard to read, mask crosses hotspot boundary or a lock symbol/text appears = FAIL.

---

## JOB 25-10 — `hub.interaction.upgrade.available`

### References
- **Image A:** `hub.geometry.lock_v1`.
- **Image B:** accepted architecture/fixture geometry of the eligible building.

### Output contract
Exactly ONE `640×360` transparent RGBA upgrade-available accent overlay.

### Generation prompt
Create an extremely restrained architectural cue that an upgrade is available. Add only 2–4 compact green/cyan accent clusters near an existing entrance, fixture or service-light area already present on the building. The cue must look like part of the physical scene and is intended to pair with a separate runtime upgrade icon. Keep it discoverable but subtle. Output exactly one overlay.

### Hard negatives
No plus sign, arrow, star, badge, floating marker, text, new lamp/fixture, geometry change, full glow, contact sheet or multiple variants.

### PASS / FAIL
If the image itself communicates through a UI symbol rather than scene-integrated light/material cue, or if architecture changes, = FAIL.

---

## Batch acceptance

- all outputs are `640×360` transparent overlays at `(0,0)`;
- every state removes cleanly to reveal unchanged base art;
- no state contains text, level numbers, labels, icons or hitbox geometry;
- accents do not cross neighbouring hotspot boundaries;
- hover/selected/locked/upgrade states remain distinguishable under day/night/weather variants;
- reduced-motion uses static states only;
- candidates require cleanup, manifest/provenance registration and independent art/UX review before runtime use.
