# BATCH-15 — Hub UI chrome without baked text

Purpose: отделить интерфейс от арт-фона. Все надписи, уровни, числа и состояние игрока рендерятся приложением; генератор создаёт только визуальные рамки/иконки/подложки.

## Global rule

Exactly ONE UI asset per generation. Transparent RGBA unless the asset itself is a panel fill. No Cyrillic/Latin text, no numbers, no fake labels. Premium pixel-art UI matching the Hub: deep navy/blue-gray panels, thin cyan inner edge, restrained amber primary accent, crisp 1–2 px cluster logic at logical scale. No contact sheet.

## JOB 15-01 — `ui.hub.top_status_panel`

Create exactly ONE wide top HUD panel background, no content: dark navy translucent-looking pixel frame with beveled/stepped corners, subtle cyan inner border, small separators for future player/mastery/league/energy/reliability sections but NO icons or text. Logical 640×32 strip, horizontally tile-safe center section, transparent exterior.

## JOB 15-02 — `ui.hub.bottom_nav_panel`

Create exactly ONE wide bottom navigation tray background, no labels/icons: dark navy pixel frame with six secondary button bays and one larger central CTA bay, but no readable symbols. Logical 640×48, transparent exterior, stepped corners, subtle warm/cyan highlights.

## JOB 15-03 — `ui.hub.hotspot_plate.default`

Create exactly ONE blank hotspot label plate for buildings: dark navy rounded/stepped pixel panel, thin cool border, small right-side square socket for status/upgrade icon, NO text. Logical 128×32, transparent exterior.

## JOB 15-04 — `ui.hub.hotspot_plate.active`

Create exactly ONE active/hover variant of the same hotspot plate geometry: stronger amber/cyan rim light and slightly brighter inner fill, NO text/icons. Must align pixel-for-pixel with 15-03 dimensions.

## JOB 15-05 — `ui.hub.cta_primary.default`

Create exactly ONE blank primary CTA button background: wide amber-gold pixel button with stepped bevel, subtle warm gradient by discrete pixel clusters, dark navy outer line, small empty icon socket left and empty arrow socket right, NO text. Logical 192×48, transparent exterior.

## JOB 15-06 — `ui.hub.cta_primary.hover`

Create exactly ONE hover/active variant of 15-05 with identical geometry: brighter top edge, restrained glow accents, no text/icons. No size drift.

## JOB 15-07 — `ui.hub.nav_button.default`

Create exactly ONE blank secondary navigation button background: compact dark navy panel, cyan edge, empty icon area left, empty label area center, no content. Logical 96×44, transparent exterior.

## JOB 15-08 — `ui.hub.nav_button.active`

Create exactly ONE active/selected variant of 15-07 with identical dimensions and geometry, amber/cyan emphasis, no content.

## JOB 15-09 — `ui.hub.profile_badge_frame`

Create exactly ONE small avatar/profile badge frame: square pixel frame with clipped/stepped corners, dark navy body, cool cyan edge and tiny amber accent. Logical 48×48, transparent center for runtime portrait, transparent exterior. No portrait, text or level number.

## JOB 15-10 — `ui.hub.upgrade_icon_frame`

Create exactly ONE tiny square upgrade/status socket frame: dark navy/cyan pixel frame with green-accent border area, empty center, no arrow/text. Logical 24×24, transparent exterior. Runtime inserts actual icon/vector.

## Acceptance

- all text remains live UI;
- geometry must be reusable via 9-slice/tiled center where applicable;
- default/active pairs must be pixel-identical in dimensions;
- no fake typography in raster output;
- panels do not force fixed viewport size; top/bottom wide assets must support responsive slicing/stretching only in designated center bands.
