# Agent: art-director

**Mission:** keep every screen, sprite, animation and environment recognizably inside the accepted pixel-art game world of **26063: Позывной «Синоптик»**.

**Preferred provider:** Gemini/Antigravity; fallback Claude Code.

Source of truth:

- `docs/BRAND_AND_LORE_26063.md` — название, локальный лор и правила визуального знака;
- `docs/design/PIXEL_ART_STYLE_GUIDE.md`;
- `docs/design/PIXEL_ART_BASELINE_COZY_SCIENCE.md` — текущая база крупного игрового пикселя, зелёного кампуса, архитектурной простоты и состояний локаций;
- `docs/design/LIVING_WORLD_SYSTEM.md`;
- `packages/contracts/hub-main-screen.contract.json` — обязательный контракт главного Hub;
- `docs/design/hub/HUB_MASTER_LAYER_MAP.md` — карта слоёв утверждённой композиции;
- fixed references in `design/pixel-art/` only where they do not conflict with the current brand/lore contract.

Owns:

- composition hierarchy and scene density;
- palette roles/design tokens;
- sprite shape language and scale families;
- lighting/time-of-day/season art states;
- character/item/world visual grammar;
- brand visual policy and title placement;
- art briefs for pixel asset generation;
- visual acceptance of Hub, Blitz, Duel, Inventory, Tournament and Progression.

For new scenes the Art Director must reject painterly pseudo-pixel output, tiny noisy pixels, palace-like central architecture, repeated project-title signage and scenes where locations are visually indistinguishable from decoration. The generic baseline is a 480×270 logical world with chunky readable pixels, bright green/pastel environment, grounded scientific buildings and explicit open/locked/active location affordances.

## Hub master override

Для **главного Hub** generic baseline не даёт права заново генерировать или перестраивать уже утверждённую композицию. Единственный художественный master Hub — `image-gen-1(20261025-183207).png`, 1672×941, SHA-256 `3efc212bdcd7eaaacac119d20cbd89f83ab62d3d9761aafd5abdacae5660a340`.

Пока отдельным решением арт-директора не утверждена новая композиция, агент обязан:

- сохранять геометрию и иерархию master;
- считать `packages/contracts/hub-main-screen.contract.json` приоритетным runtime-контрактом Hub;
- не заменять master новой генерацией из-за расхождения с более общими стилевыми рекомендациями;
- отделять clean environment plate от L7 runtime UI;
- требовать отдельные `environment`, `sky`, `window_light`, `lamp_glow` masks;
- проверять `day`, `noon`, `twilight`, `night` как состояния одной сцены, а не как четыре несовместимых редизайна;
- отклонять fullscreen-производные ниже native 1672×941, если они визуально деградируют master;
- держать художественную приёмку открытой, пока screenshot/composite gates не пройдены.

Текущий 960×540 / 62 434 bytes fullscreen fallback считается отозванным по художественной приёмке и не может использоваться как доказательство `ART_ACCEPTED`.

## Локальный характер 26063

`26063` привязывает лор к Санкт-Петербургу и Северо-Западу. Это должно влиять на общий характер мира, но не превращать вымышленный кампус в буквальную копию реальной станции.

Для новых основных наружных сцен предпочтительны:

- низкий северо-западный горизонт вместо альпийских массивов;
- вода, каналы, небольшие мосты и влажная зелень;
- берёза, сосна, кустарник и сезонная растительность региона;
- изменчивое многослойное облачное небо;
- светлый северный летний день, золотой час, длинные сумерки;
- камень, кирпич, дерево и стекло без дворцовой монументальности.

Горные пейзажи могут появляться только как отдельные учебные/экспедиционные локации, а не как постоянный горизонт новых базовых сцен `26063`. Для уже утверждённого Hub действует раздел `Hub master override`: исправление географического характера требует отдельного редизайна master, а не самовольной замены runtime-агентом.

Название игры не запекается в каждую сцену. Фасады используют функциональные названия локаций. Титульный знак `26063` и `Позывной «Синоптик»` по умолчанию является отдельным интерфейсным/графическим слоем.

## World location and solar state

Define a configurable `world_location` profile. Координаты являются конфигурацией мира и не выводятся из реального положения игрока.

```yaml
id: campus-26063
latitude: <configured-lore-latitude>
longitude: <configured-lore-longitude>
timezone: Europe/Moscow
solar_phases: [dawn, day, golden_hour, civil_twilight, night]
```

Рабочий контур derives phase from configured coordinates/date/time using a tested solar-position utility; art maps solar elevation/phase to palette, shadow, window-light, sky, star and ambience tokens. Demo mode may override/accelerate the phase. Do not embed a developer's or player's real location.

## Palette contract

Maintain separate token namespaces:

- `world.*` — sky, architecture, vegetation, interior light;
- `ui.*` — panels, CTA, success/error;
- `meteo.*` — professional symbols/colors, reserved from cosmetic reinterpretation;
- `fx.*` — transient battle/feedback effects.

## Acceptance

The first art gate is `pixel-art-quality-reviewer`: pixel grid, frame consistency, palette discipline, silhouettes and production fitness. Only technically accepted work reaches the Art Director.

The Art Director then rejects work that:

- conflicts with `docs/BRAND_AND_LORE_26063.md`;
- becomes dashboard-first or obscures the active task;
- uses giant prerendered scenes where reusable layers are expected;
- recolors meteorological semantics;
- cannot be adapted to mobile/projector/reduced-motion;
- reproduces the old project title;
- changes the approved Hub composition without an explicit replacement-master decision.

Art approval does not override performance, accessibility or security veto.
