# Первый экран V2 — реализация живого синоптического кампуса

**Дата:** 2026-11-05. **Статус:** план исполнения; реализации и независимые агентские приёмки по этому плану пока не выполнялись. **Художественный источник:** [шесть новых референсов](../design/SCREEN_REFERENCE_SET_V2_20261105.md), приоритет R01.

## Исходное состояние (проверено по main и открытым PR)

- `main`: React 19 + Vite 8; `@synopsis/world-engine` на Phaser **4.2.1**, логический кампус **480×270**, отдельные DOM UI и SVG/Canvas синоптические карты. Файлы: `packages/world-engine/src/runtime/createWorldGame.ts`, `packages/world-engine/src/scenes/hub/HubScene.ts`, `apps/web/src/features/hub/HubOverlay.tsx`.
- 2.5D находится **не в main**, а в [draft PR #95](https://github.com/f2re/synopsis_game/pull/95): Three.js 0.187, ортокамера 640×360, internal 320×180, GLSL palette/dither/edge; opt-in `?hubRenderer=three2d`, fallback `legacy2d`.
- Открытые блокеры перед переключением renderer: [#91](https://github.com/f2re/synopsis_game/issues/91) пересечения маршрутов/объектов; [#93](https://github.com/f2re/synopsis_game/issues/93) арт-приёмка; [#94](https://github.com/f2re/synopsis_game/issues/94) реальный GPU; [#85](https://github.com/f2re/synopsis_game/issues/85) интеграционная QA. Ранее успешные Chrome/SwiftShader smoke не равны real-GPU тестам.
- Старые `design/pixel-art/0*.webp` — 120×68, только история. Шесть оригинальных полноразмерных PNG уже импортированы и проверены по SHA-256; художественное производство первого экрана остаётся открытой задачей.

## Принцип реализации: сперва one-screen vertical slice

**Выбранный путь:** целевой визуальный срез реализуется на уже заложенном **Phaser 4 + Three.js 2.5D** в отдельной opt-in ветке PR #95 по принятому там ADR-0007. Phaser остаётся игровым framework, Three.js — специализированным рендерером Hub; React HUD и метеорологический map-engine не переписываются. **Legacy2D сохраняется как действующий fallback** до независимой приёмки. Качество R01 создаётся прежде всего авторскими формами, текстурами, декалями и композицией, а не процедурными примитивами/пиксельным постфильтром.

| Этап | Результат / файлы | Владелец / рецензент | Условие завершения |
|---|---|---|---|
| G0. Baseline + референсы | шесть исходных PNG + манифест с SHA; контрольные снимки нынешнего Hub на desktop/mobile | `art-director` / `pixel-art-quality-reviewer` | hash-validator PASS; известны различия с R01 |
| G1. Камера и мастер-кадр | новый иллюстративный геометрически непротиворечивый мастер **1920×1080**, вариант без UI/надписей, утверждённая безопасная область; Северо-Запад вместо Альп | `level-designer` + `technical-artist` / `art-director` | читаются ≥6 локаций без подписей, центр и вход, no crop CTA |
| G2. Производственные ресурсы | небо/дальний план — рисованные пиксельные плоскости; фасады/крыши — модульная геометрия с авторскими текстурами и декалями; дорожки/объекты/NPC/FX — со своими atlas/GLB/manifest и правами; единая UV/texel дисциплина | `pixel-asset-designer` + `asset-pipeline-engineer` / `pixel-art-quality-reviewer` | контрольный composite vs master, согласованные координаты и alpha, никаких прямоугольных заглушек |
| G3. Живая 2.5D-сцена | ортографическая Three-сцена в Phaser lifecycle: геометрия, материалы, авторские текстуры, world-space depth/occlusion, day/night/weather и восемь действующих semantic building ID | `game-runtime-webgl-engineer` + `living-world-engineer` / `qa-tester` | camera cover & safe crop; exact entrance hit; idle без «мертвого» фона |
| G4. React HUD V2 | верхний профиль/прогресс, крупный CTA, нижние mode/actions, hover/focus/locked; русская типографика | `ui-programmer` + `ui-pixel-designer` / `ux-accessibility-reviewer` | 3-second comprehension, no overlap, Tab/Enter/ESC, 44px targets |
| G5. Доменная связка | настоящее действие «Начать смену», досье после выбора здания, события world bridge, корректные реальные символы/данные | `gameplay-programmer` + `meteo-methodologist-ru` / `meteo-verifier` | все действия ведут к действующим маршрутам, без фейкового прогресса |
| G6. QA/визуальный gate | реальные скриншоты Chromium в 1920×1080, 1440×900, 2560×1440, мобильный portrait; сравнение с R01 по частям, perf, accessibility | `qa-lead` + `web-performance-engineer` / независимый `art-director` | собственный evidence-pack, нет критических отклонений |
| G7. Включение 2.5D по умолчанию | independent art, GPU, collision и integration QA; сравнение с legacy2D fallback, отсутствие context-loss/regression | `threejs-architect` + `shader-artist` + `webgl-perf-auditor` / интеграционный инженер | только после #85/#91/#93/#94, отдельно решать вопрос default |

## Состав первого экрана и интерактивные сценарии

**Состояния:** `firstVisit`, `idle`, `hoverBuilding`, `focusBuilding`, `walkToBuilding`, `dossierOpen`, `locked`, `reducedMotion`, `offline/error`. Текст центральной кнопки — из реальной модели следующего задания. Повторное наведение/выбор не создают второе досье. Закрытый корпус объясняет условие открытия. Смена времени суток/погоды не меняет доступность зданий.

**Предварительный render stack:**

```text
L0 sky & haze                         (painted backgrounds)
L1 coast/city/sea                     (parallax distant)
L2 ground/plaza/approach paths        (fixed navigation alignment)
L3 campus architecture               (individual silhouettes, entrance anchors)
L4 vegetation / scientific props     (static + light motions)
L5 avatar / NPC / animals            (spatial depth; occlusion)
L6 foreground occluders              (rails, shrubs, lamps)
L7 local light / weather / water FX   (mask-limited; low-power toggle)
L8 interactive regions               (semantic IDs; no baked labels)
L9 React HUD / popovers              (independent resolution, keyboard access)
```

**Не допускается:** использовать PNG R01 как финальный fullscreen background, тайно заменить старые скриншоты в CI новыми статичными картинками, рисовать научные карты через эффектную «ручную» генерацию, выдавать Shader POC за accepted art.

## Матрица совместимости

| Узел | Совместимость с R01 | Решение |
|---|---|---|
| Phaser 4 (main) | высокая для lifecycle/input/audio и 2D резервного Hub; 480×270 сохраняется для legacy | **сохранить, не заменять** |
| React 19 / CSS HUD | высокая для адаптивных панелей, русских шрифтов, accessibility | сохранить; отделить от scene graph |
| SVG/Canvas `map-engine` | высокая для нормативных фронтов/изобар, станций | не пикселизировать профессиональную геометрию |
| Three.js 0.187 (draft #95) | целевая 2.5D архитектура Hub по ADR-0007, но исходный procedural визуал не эквивалентен R01 | **основа нового opt-in визуального среза**; default только после арт/GPU/QA |
| GLSL pixel-post | полезно для палитры, outlines, локальной стилизации | ввести только после base art; тестировать на артефакты/детерминизм |
| Procedural geometry | полезна для общего мира, коллизий, глубины и повторяемых объектов; низкая детализация текущих фасадов недостаточна | довести текстурами/декалями/модульными мешами; proxy не принимать как final art |
| AI full-frame generation | хорошо для художественного поиска и мастер-идей, плохо для playable assets | декомпозиция/перерисовка/ассетный контроль обязательны |

## Инженерная приёмка

- **Истина в кадре:** итоговый screenshot должен исходить из запущенной игры, не из Figma/AI composite; сравнение делать при тех же viewport, фазе, погоде, seed и UI-state.
- **Ритм и размер:** 60 fps как ориентир desktop и стабильный playable low-power режим; показатели подтверждаются только real-device profiling. Не публиковать не измеренные draw-call/VRAM/latency.
- **Критическая проверка:** кириллица не «плывёт», цвета фронтов и изобар нормативны, перспективная сетка едина, нет скачков texel size, выделение объекта и зона клика совпадают, клавиатура и ESC не блокируются Canvas.
- **Готовность:** source assets + manifests + screenshot evidence + независимая художественная приёмка. Ни зелёный CI, ни успешная сборка по отдельности не означают готовность визуала.

## Очерёдность коммитов

1. `art(ref): add V2 source references + SHA manifest`.
2. `art(hub): approve 1920 master and depth/interaction map`.
3. `art(hub): split master into layers + atlas manifests`.
4. `feat(hub): render textured 2.5D master, NPC, day/night and occlusion`.
5. `feat(ui): compose responsive hub HUD V2`.
6. `test(hub): baseline screenshots, keyboard and real GPU gate`.

**Запрет слияния:** не переключать `hubRenderer` по умолчанию без устранения геометрических конфликтов, приёмки реальных кадров и независимых GPU/QA gate. До этих проверок сохраняется совместимость с `legacy2d`.

## Разрешение, пиксельная плотность и реальная похожесть на R01

У референсов 1672×941 много мелких объектов, недостижимых одним фильтром над грубой геометрией. В текущем `legacy2d` логическая сцена 480×270 с целочисленным масштабом и паспарту (`fitLogicalViewport.ts`). В draft ADR-0007 2.5D uses camera 640×360, render target 320×180. **Это исходные технические значения, а не доказательство достаточной детализации.**

В **G1/G3** выполнить A/B настоящего рендера на одной геометрии/освещении/текстурах:
- 2.5D beauty render **320×180**, **480×270**, **640×360** (дополнительный вариант до 960×540 только при обосновании GPU) с nearest-neighbor upscale без размытия.
- Одинаковая финальная ширина 1920 px, а также 1440×900 и узкий экран; отдельно оценить читаемость окон, приборов, лиц NPC, лесенок, знаков, границ фасадов.
- Измерить GPU memory, frame-time p95, количество вызовов и пиксельную читаемость на **реальном устройстве**; выбрать **наименьшее разрешение, которое проходит художественный gate**, а не самое маленькое по умолчанию.
- Внутреннее разрешение мира и плотность React-текста независимы; нельзя рендерить русские длинные подписи в 320×180. Пиксельный фрагментный фильтр не должен затрагивать профессиональную карту SVG/Canvas.
- При отклонении 2.5D-сцены от R01 сперва исправлять silhouette/material/light/decal и только затем настраивать outlines/dither/palette.

**Проверка масштаба:** в `legacy2d` камера сейчас реализует integer-fit с паспарту, тогда как контракт художественной приёмки требует fullscreen cover. Выбрать и протестировать **сцено-специфичный cover/crop + safe-area mapping** для нового Hub (не изменять константы всех старых сцен), либо зафиксировать осознанный компромисс, если целочисленный масштаб потребует краевых полей. Эти два контракта нельзя объявлять одновременно выполненными без браузерного сравнения.
