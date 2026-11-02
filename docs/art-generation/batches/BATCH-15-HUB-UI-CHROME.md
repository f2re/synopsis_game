# BATCH-15 — Hub UI chrome without baked text

Purpose: отделить интерфейс от арт-фона. Все надписи, числа, уровни, статус игрока и динамические данные рендерятся приложением; генератор создаёт только визуальные рамки/подложки/сокеты.

This file follows `PROMPT-AUTHORING-STANDARD.md`. Every JOB is a standalone copy-paste image prompt and must be generated separately.

## Shared constants

- UI style authority: accepted Hub UI reference and project pixel-UI tokens.
- Exactly ONE UI asset per generation.
- Transparent RGBA outside the declared panel/button shape.
- No Cyrillic/Latin text, numbers, fake labels or generated data.
- Pixel language: deep navy/blue-gray panels, thin cyan inner edge, restrained amber primary accent, crisp 1–2 px logical cluster logic, no smooth vector anti-aliasing.
- Where a pair exists (`default/active`, `default/hover`), geometry/dimensions must be pixel-identical.
- Wide panels must support 9-slice or safe center-band stretching; do not bake viewport-specific content.

---

## JOB 15-01 — `ui.hub.top_status_panel`

### References
- **Image A:** accepted Hub UI reference / project pixel UI style.
- **Image B:** approved palette/token reference if available.

### Output contract
Exactly ONE transparent RGBA wide top HUD background, logical size `640×32`. Exterior transparent. No content. Geometry must be suitable for horizontal 9-slice/tiled-center use.

### Generation prompt
Create one wide top status-panel background for the Hub. Use a dark navy semi-translucent-looking pixel frame with stepped/beveled corners, thin cool-cyan inner border and subtle separator notches/regions that can later host player identity, mastery, league, energy and reliability information. The panel itself must contain no text, icons, numbers or portraits. Keep visual weight low so the scene remains visible beneath it. Design the outer corners and fixed end-caps cleanly while keeping a designated center band visually tile/9-slice safe. Output exactly one panel asset.

### Hard negatives
No text, numbers, fake labels, icons, avatar, level badge, decorative logo, gradient blur, smooth vector corners, second panel variant, contact sheet/sprite sheet/grid/collage/options, checkerboard background.

### PASS / FAIL
Any generated typography/content, non-tile-safe center pattern, unclear transparent exterior or smooth non-pixel edges = FAIL.

---

## JOB 15-02 — `ui.hub.bottom_nav_panel`

### References
- **Image A:** accepted Hub UI reference.
- **Image B:** accepted top panel for border/palette consistency.

### Output contract
Exactly ONE transparent RGBA bottom navigation tray, logical size `640×48`, with fixed end-caps and a stretch-safe center policy.

### Generation prompt
Create one wide bottom navigation tray background with a deep navy pixel frame, stepped corners, restrained cyan inner edge and subtle warm/cyan highlight cues. The structure may visually imply six secondary button bays plus one larger central CTA bay, but all bays remain completely empty: no icons, labels or symbols. Keep separators simple enough that the panel can scale responsively via 9-slice/center-band rules. Match top-panel border thickness and overall UI material language. Output one asset only.

### Hard negatives
No text/icons/numbers, no actual button labels, no decorative scene art, no fixed-resolution content that prevents responsive slicing, no contact sheet/collage/options.

### PASS / FAIL
Generated content, inconsistent border thickness vs 15-01, non-responsive repeating texture or opaque exterior = FAIL.

---

## JOB 15-03 — `ui.hub.hotspot_plate.default`

### References
- **Image A:** accepted Hub UI style reference.

### Output contract
Exactly ONE transparent RGBA blank hotspot plate, logical size `128×32`.

### Generation prompt
Create a default building-hotspot label plate with a compact dark navy stepped/softened pixel frame, thin cool border and one small empty square socket on the right for a runtime status/upgrade icon. Leave the central label area visually quiet and blank for live text. The plate should read clearly over complex pixel-art backgrounds while remaining secondary to the main CTA. Output exactly one asset.

### Hard negatives
No text, numbers, building name, icon, arrow, level marker, glow halo, rounded vector pill aesthetic, second state, contact sheet/collage.

### PASS / FAIL
Any baked content, unreadable border at runtime scale, ambiguous empty label area or non-pixel smoothness = FAIL.

---

## JOB 15-04 — `ui.hub.hotspot_plate.active`

### References
- **Image A:** accepted 15-03 default plate, authoritative for every pixel of geometry and dimensions.

### Output contract
Exactly ONE transparent RGBA active/hover state, `128×32`, pixel-identical geometry to 15-03.

### Generation prompt
Create the active/hover variant by editing only color/light-emphasis pixels of the accepted default plate. Preserve dimensions, corner shape, border thickness, icon socket and internal padding pixel-for-pixel. Increase interaction clarity with restrained amber/cyan rim accents and a slightly brighter inner fill while keeping the label area blank. Output one asset only.

### Hard negatives
No size change, no extra border, no text/icon, no glow cloud, no shifted socket, no redesign, no contact sheet/collage/options.

### PASS / FAIL
Any geometry mismatch with 15-03, content insertion or state brightness stronger than the primary CTA = FAIL.

---

## JOB 15-05 — `ui.hub.cta_primary.default`

### References
- **Image A:** accepted Hub UI reference.
- **Image B:** approved amber primary-action palette.

### Output contract
Exactly ONE transparent RGBA primary CTA button background, logical size `192×48`, empty content sockets only.

### Generation prompt
Create a wide primary CTA button background using a warm amber-gold body, stepped pixel bevel, dark navy outer line and discrete clustered light/shadow steps rather than a smooth gradient. Include one empty icon socket on the left and one empty arrow/status socket on the right, with a broad blank central region for runtime text. The button must be the strongest UI action element without looking glossy or modern-vector. Output exactly one asset.

### Hard negatives
No text, arrow symbol, play icon, numbers, fake label, smooth CSS-like gradient, large outer glow, multiple variants/contact sheet/collage.

### PASS / FAIL
Any baked content, insufficient blank label region, vector-like smoothness or weak visual hierarchy = FAIL.

---

## JOB 15-06 — `ui.hub.cta_primary.hover`

### References
- **Image A:** accepted 15-05 default CTA, authoritative for dimensions/geometry.

### Output contract
Exactly ONE transparent RGBA hover/active CTA state, `192×48`, geometry pixel-identical to 15-05.

### Generation prompt
Create the hover/active state of the accepted primary CTA by changing only highlight/emissive accents. Preserve every edge, bevel, empty icon socket, label region and arrow socket exactly. Increase top-edge brightness and add a few restrained warm/cyan emphasis pixels while retaining the same amber body and dark outer line. The state should feel responsive but not larger. Output one asset only.

### Hard negatives
No geometry change, no pulsing rays, no text/icon, no enlarged glow, no shifted sockets, no contact sheet/collage/options.

### PASS / FAIL
Pixel geometry mismatch vs 15-05, size drift, generated content or over-bright glow = FAIL.

---

## JOB 15-07 — `ui.hub.nav_button.default`

### References
- **Image A:** accepted Hub UI style reference.

### Output contract
Exactly ONE transparent RGBA secondary navigation-button background, logical size `96×44`.

### Generation prompt
Create one blank secondary navigation button with compact deep-navy panel body, thin cyan edge, a small empty icon area on the left and a broad empty label area in the center/right. Use stepped pixel corners and subtle interior depth without smooth gradients. The button must remain visibly secondary to the amber CTA and readable over the Hub scene. Output exactly one asset.

### Hard negatives
No icon/text/number, no bright amber body, no floating shadow plate larger than button, no second state, no vector pill shape, no contact sheet/collage.

### PASS / FAIL
Generated content, wrong hierarchy vs CTA, poor blank-label capacity or smooth non-pixel edges = FAIL.

---

## JOB 15-08 — `ui.hub.nav_button.active`

### References
- **Image A:** accepted 15-07 default button.

### Output contract
Exactly ONE transparent RGBA active/selected state, `96×44`, identical geometry to 15-07.

### Generation prompt
Create the active/selected variant of the secondary navigation button by editing only border/fill emphasis. Preserve exact dimensions, corner shape, icon area and label area. Add a restrained amber/cyan emphasis and slightly brighter inner fill while keeping the button clearly secondary to the primary CTA. Output one image only.

### Hard negatives
No geometry change, no text/icon, no full amber CTA-like body, no glow cloud, no extra border, no contact sheet/collage/options.

### PASS / FAIL
Any geometry mismatch, content insertion or hierarchy confusion with primary CTA = FAIL.

---

## JOB 15-09 — `ui.hub.profile_badge_frame`

### References
- **Image A:** accepted Hub UI style.
- **Image B:** accepted avatar/profile visual language if available.

### Output contract
Exactly ONE transparent RGBA profile/avatar frame, logical size `48×48`, transparent center and exterior.

### Generation prompt
Create a compact square profile badge frame with clipped/stepped pixel corners, dark navy body, cool cyan edge and one tiny restrained amber accent. Keep the center fully transparent for a runtime portrait/avatar and leave no built-in level/rank content. The frame must remain readable at small size and match the same border thickness/cluster language as the Hub UI. Output one isolated frame only.

### Hard negatives
No portrait, face, text, level number, medal, rank icon, solid center fill, second frame, contact sheet/collage.

### PASS / FAIL
Non-transparent center, generated profile content, inconsistent border language or unreadable 48×48 geometry = FAIL.

---

## JOB 15-10 — `ui.hub.upgrade_icon_frame`

### References
- **Image A:** accepted Hub UI style.

### Output contract
Exactly ONE transparent RGBA tiny status/upgrade socket frame, logical size `24×24`, empty center.

### Generation prompt
Create a tiny square upgrade/status socket frame with dark navy body, thin cyan edge and a restrained green-accent border segment that can indicate positive/available status when paired with a runtime icon. Keep the center empty and transparent or neutral as required by the approved UI implementation. The frame must remain crisp and legible at 24×24. Output exactly one asset.

### Hard negatives
No plus sign, arrow, star, text, number, actual upgrade icon, glow halo, second variant, contact sheet/collage.

### PASS / FAIL
Any baked status symbol/content, unreadable small-scale geometry, wrong palette hierarchy or non-transparent exterior = FAIL.

---

## Batch acceptance

- all text/data remain live application UI;
- default/active pairs match dimensions and geometry pixel-for-pixel;
- wide panels support approved 9-slice/tile-safe center strategy;
- no raster output contains fake typography;
- UI assets do not force a fixed viewport width;
- all candidates pass pixel cleanup, manifest/provenance registration, Art Director and UX/accessibility review before use.
