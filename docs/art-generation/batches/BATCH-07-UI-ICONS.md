# BATCH-07 — UI icon family

Все jobs: один icon master 128×128 на прозрачном фоне, center anchor, без текста. Стиль — чистый pixel UI, проще и графичнее world art: сильный силуэт, 12–32 основных цветовых ролей, ограниченные highlights. Derivatives 64/32 создаёт pipeline после ручной pixel cleanup.

## JOB 07-01 — `ui.icon.weather.partly_cloudy`
> Create exactly ONE standalone pixel UI icon: partly cloudy weather, one icon only. Compact white/very pale blue cloud with a small warm amber sun emerging from upper-right, dark navy local outline and tiny cyan reflected shadow. Strong readable silhouette for 32px derivative, minimal clusters, no realistic sky and no soft gradient. Genuine transparent RGBA. No circular badge background, card, text, numbers, duplicate icons, variants or sprite sheet.

## JOB 07-02 — `ui.icon.mode.blitz`
> Create exactly ONE standalone pixel UI icon for Blitz mode: a bold lightning bolt implying speed, one icon only. Warm yellow/amber bolt with small pale highlight and deep navy outline, slightly forward-leaning dynamic silhouette. Must remain readable at 32px; clean clusters, no electric particle cloud, no text. Transparent RGBA, no button/card background, second bolt, labels, variants or sprite sheet.

## JOB 07-03 — `ui.icon.mode.duel`
> Create exactly ONE standalone pixel UI icon for Duel mode: two compact crossed scientific/competition stylized pencils or slim foils/swords, one icon only, clearly competitive but not militaristic. Pale steel/white bodies with blue and amber accent tips/handles, deep navy outline, strong X silhouette readable at 32px. No blood, shields, text, card, duplicate weapons, background or sprite sheet.

## JOB 07-04 — `ui.icon.inventory`
> Create exactly ONE standalone pixel UI icon for Inventory: compact meteorologist backpack/field bag, one icon only. Deep blue/navy body, small cyan pocket and warm brass buckle accents, frontal/3⁄4 simplified silhouette. Designed for clean 32px derivative, grouped clusters, no tiny straps noise. Transparent RGBA; no slot frame, text, second bag or sheet.

## JOB 07-05 — `ui.icon.trophy`
> Create exactly ONE standalone pixel UI icon: academic/weather tournament trophy cup, one icon only. Warm gold/amber cup with two handles and small dark-blue base, bright but not glossy-vector, compact silhouette legible at 32px. Intentional clusters, navy shadow outline. Transparent background; no ribbon text, podium, card, second trophy, particles or sprite sheet.

## JOB 07-06 — `ui.icon.archive`
> Create exactly ONE standalone pixel UI icon for Archive: compact folder/archive case, one icon only. Warm ochre/yellow folder with slightly darker tab and small navy document edge, simplified enough for 32px derivative. Strong silhouette, grouped highlights, no paper text or labels. Transparent RGBA; no cabinet, UI card, second folder, variants or sprite sheet.

## JOB 07-07 — `ui.icon.tasks`
> Create exactly ONE standalone pixel UI icon for Tasks: clipboard with a few abstract checklist lines and three square marks, one icon only. Pale paper, dark navy clipboard body/outline, small amber accent; no readable words or numbers. Clean 32px-readable pixel clusters. Genuine transparent background; no button/card, pen, second clipboard, text or sprite sheet.

## JOB 07-08 — `ui.icon.energy`
> Create exactly ONE standalone pixel UI icon for Energy: compact vivid green/cyan lightning bolt, one icon only, distinct from amber Blitz bolt by palette and slightly upright silhouette. Deep navy outline and one pale highlight cluster; no glow cloud, particles or battery shape. Must survive 32px reduction. Transparent RGBA; no card, number, plus sign, duplicate or sheet.

## JOB 07-09 — `ui.icon.reliability_shield`
> Create exactly ONE standalone pixel UI icon for forecast reliability: compact shield with a simple white/cyan meteorological check/star/cloud-symbol abstraction in center, one icon only. Deep navy/blue shield, pale steel/cyan rim, readable at 32px, professional rather than fantasy heraldry. No text, percentages or numerals. Transparent RGBA; no card, second shield, badge board or sprite sheet.

## JOB 07-10 — `ui.icon.settings`
> Create exactly ONE standalone pixel UI icon for Settings: clean mechanical gear/cog, one icon only. Pale steel/blue-gray gear with deep navy interior and small cool highlight, symmetric readable teeth sized for 32px derivative. No wrench, card, text, second gear or decorative background. Genuine transparent RGBA, no variants or sprite sheet.

## UI acceptance

These are masters, not screenshots. The final UI uses live CSS/React frames, typography and state colors. Icons must not contain their own button backgrounds, shadows or labels unless a separate frame asset explicitly requires that.