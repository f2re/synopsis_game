# Первый экран V2 — реализация живого синоптического кампуса

**Дата:** 2026-11-05. **Статус:** план исполнения; реализации и независимые агентские приёмки по этому плану пока не выполнялись. **Художественный источник:** [шесть новых референсов](../design/SCREEN_REFERENCE_SET_V2_20261105.md), приоритет R01.

## Исходное состояние (проверено по main и открытым PR)

- `main`: React 19 + Vite 8; `@synopsis/world-engine` на Phaser **4.2.1**, логический кампус **480×270**, отдельные DOM UI и SVG/Canvas синоптические карты. Файлы: `packages/world-engine/src/runtime/createWorldGame.ts`, `packages/world-engine/src/scenes/hub/HubScene.ts`, `apps/web/src/features/hub/HubOverlay.tsx`.
- 2.5D находится **не в main**, а в [draft PR #95](https://github.com/f2re/synopsis_game/pull/95): Three.js 0.187, ортокамера 640×360, internal 320×180, GLSL palette/dither/edge; opt-in `?hubRenderer=three2d`, fallback `legacy2d`.
- Открытые блокеры перед переключением renderer: [#91](https://github.com/f2re/synopsis_game/issues/91) пересечения маршрутов/объектов; [#93](https://github.com/f2re/synopsis_game/issues/93) арт-приёмка; [#94](https://github.com/f2re/synopsis_game/issues/94) реальный GPU; [#85](https://github.com/f2re/synopsis_game/issues/85) интеграционная QA. Ранее успешные Chrome/SwiftShader smoke не равны real-GPU тестам.
- Старые `design/pixel-art/0*.webp` — 120×68, только история. Новые PNG ожидают импорта по SHA-256.

## Принцип реализации: сперва one-screen vertical slice

**Выбранный путь:** не делать полную миграцию в 3D ради одного экрана. Сначала добиться R01-качества в живой многослойной 2D Phaser-сцене и React HUD при неизменной навигационной модели, параллельно проверять перенос *тех же* ассетов/семантических идентификаторов в 2.5D ветке. Three.js добавляет глубину и мягкие эффекты, но не заменяет художественную работу.

| Этап | Результат / файлы | Владелец / рецензент | Условие завершения |
|---|---|---|---|
| G0. Baseline + референсы | шесть исходных PNG + манифест с SHA; контрольные снимки нынешнего Hub на desktop/mobile | `art-director` / `pixel-art-quality-reviewer` | hash-validator PASS; известны различия с R01 |
| G1. Камера и мастер-кадр | новый иллюстративный геометрически непротиворечивый мастер **1920×1080**, вариант без UI/надписей, утверждённая безопасная область; Северо-Запад вместо Альп | `level-designer` + `technical-artist` / `art-director` | читаются ≥6 локаций без подписей, центр и вход, no crop CTA |
| G2. Производственные слои | небо, дальний план, берег/площадь, независимые здания, кусты/ограждения, NPC, локальные fx; source PNG/ASE/Tiled + manifests → atlases | `pixel-asset-designer` + `asset-pipeline-engineer` / `pixel-art-quality-reviewer` | контрольный composite vs master, согласованные координаты и alpha, никаких прямоугольных заглушек |
| G3. Живая 2D-сцена | Phaser texture atlas; parallax, z/occlusion, day/night/weather, отличимые 8 доступных ID, интерактивные entrances | `game-runtime-webgl-engineer` + `living-world-engineer` / `qa-tester` | camera cover & safe crop; exact entrance hit; idle без «мертвого» фона |
| G4. React HUD V2 | верхний профиль/прогресс, крупный CTA, нижние mode/actions, hover/focus/locked; русская типографика | `ui-programmer` + `ui-pixel-designer` / `ux-accessibility-reviewer` | 3-second comprehension, no overlap, Tab/Enter/ESC, 44px targets |
| G5. Доменная связка | настоящее действие «Начать смену», досье после выбора здания, события world bridge, корректные реальные символы/данные | `gameplay-programmer` + `meteo-methodologist-ru` / `meteo-verifier` | все действия ведут к действующим маршрутам, без фейкового прогресса |
| G6. QA/визуальный gate | реальные скриншоты Chromium в 1920×1080, 1440×900, 2560×1440, мобильный portrait; сравнение с R01 по частям, perf, accessibility | `qa-lead` + `web-performance-engineer` / независимый `art-director` | собственный evidence-pack, нет критических отклонений |
| G7. 2.5D эксперимент | orthographic projection, shader palette/post, depth/normal, occlusion; geometry collision-review, сравнение тех же сцен | `threejs-architect` + `shader-artist` + `webgl-perf-auditor` / интеграционный инженер | только после #85/#91/#93/#94, отдельно решать вопрос default |

## Состав первого экрана и интерактивные сценарии

**Состояния:** `firstVisit`, `idle`, `hoverBuilding`, `focusBuilding`, `walkToBuilding`, `dossierOpen`, `locked`, `reducedMotion`, `offline/error`. Контент центрального CTA — из реальной модели следующего задания. Повторное наведение/выбор не создают второе досье. Закрытый корпус объясняет условие открытия. Смена времени суток/погоды не меняет доступность зданий.

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
| Phaser 4 (main) | высокая для 2D-слоёв, атласов, анимаций, интерактивности | **основа первого экранного среза** |
| React 19 / CSS HUD | высокая для адаптивных панелей, русских шрифтов, accessibility | сохранить; отделить от scene graph |
| SVG/Canvas `map-engine` | высокая для нормативных фронтов/изобар, станций | не пикселизировать профессиональную геометрию |
| Three.js 0.187 (draft #95) | средняя/высокая для объёмов и глубины; недостаточна без правильных ассетов | opt-in вторым этапом, реальный GPU gate |
| GLSL pixel-post | полезно для палитры, outlines, локальной стилизации | ввести только после base art; тестировать на артефакты/детерминизм |
| Procedural geometry | для layout, коллизий, depth, placeholder; низкая как final art | не принимать в качестве фасадов/декора |
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
4. `feat(hub): render V2 parallax, NPC, day/night masks`.
5. `feat(ui): compose responsive hub HUD V2`.
6. `test(hub): baseline screenshots, keyboard and real GPU gate`.

**Запрет слияния:** не переключать `hubRenderer` по умолчанию без устранения геометрических конфликтов, приёмки реальных кадров и независимых GPU/QA gate.
