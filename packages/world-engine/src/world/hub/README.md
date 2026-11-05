# Hub world definition

The files in this directory own renderer-independent spatial semantics for the Hub.

Rules:

- gameplay IDs are semantic strings such as `building.archive`, never Three.js UUIDs or atlas coordinates;
- logical coordinates are defined in the Hub canonical 640×360 space;
- collision/navigation/interaction truth belongs here or in adjacent renderer-independent world modules;
- render meshes may be regenerated, replaced or instanced without changing gameplay IDs;
- weather, season, time-of-day and progression states change materials/particles/visibility, not canonical geometry;
- `HUB_WORLD_DEFINITION_V1` uses accepted `hub.geometry.lock_v1` (640×360) in the Three.js POC branch; its `bounds` are screen-space silhouettes, not approved ground footprints;
- `HubNavigation.ts` plans routes through intersections of canonical path polylines, with bounded first/last connectors. It never interprets screen-space building bounds as collision obstacles;
- `HubCollision.ts` validates explicit **ground-space** obstacle polygons and avatar clearance; the accepted Hub water band is enforced as a blocked polygon at runtime, while unapproved building facades are **not** treated as ground footprints;
- the route planner deletes path edges or door connectors intersecting accepted blockers and refuses a destination inside one;
- route-finding and obstacle tests are run with `pnpm world:test`; gameplay remains renderer-independent even though only the Three.js avatar currently consumes the routes;
- **not yet accepted**: pedestrian collision/occupancy polygons, building footprint approval, path width clearance for avatars, dynamic obstacles, and movement completion gating for facility interactions.

The next implementation owner (`living-world-engineer`) must add validated pedestrian footprints and entrance connectors before reporting collision-safe navigation. `game-runtime-webgl-engineer` adapts the renderer, while `web-performance-engineer` and `integration-release-engineer` independently review acceptance.

Renderer code consumes this definition. Renderer code must not silently become a second source of world geometry truth.

## H3D-037: проверяемый вариант обходов (не принят)

`HubCollisionReviewLayout.ts` предлагает **отдельную** пространственную версию `hub.geometry.collision_review_v1`. В ней неизменны положения зданий, небосклон, береговая полоса, канонический холст 640×360 и идентификаторы взаимодействия; изменены только семь осевых дорожек и наружные точки остановки возле восьми входов. Кандидат не перезаписывает `HUB_WORLD_DEFINITION_V1`.

Включение **только для художественного/технического просмотра**: `?hubRenderer=three2d&hubLayout=collisionReview`. Рендерер и граф перемещения используют одни и те же предложенные дорожки. Для маршрутов включены девять предварительных процедурных footprints, запретная водная полоса и отступ 5 логических пикселей. Открытие досье здания по клику сохранено и не зависит от завершения ходьбы.

`pnpm world:test` проверяет, что все осевые линии не пересекают контуры построек, все восемь входов доступны от стартовой точки, а каждая пара зданий имеет проходимый маршрут. CI сохраняет базовую и исправленную схемы в `spatial-audit.svg` / `collision-review.svg`, численные данные — в JSON, браузерные скриншоты — в `hub-2_5d-visual-smoke`.

**Нельзя выпускать как production:** footprint-полигоны отражают текущие процедурные BoxGeometry, но ещё не утверждены арт-директором как постоянная геометрия. Отдельно проверить действительную ширину дорожек, столбы/ограждения, центральный глобус и читаемость новой трассировки. До закрытия #91, #93, #94 и #85 режим `legacy2d` остаётся стандартным.

## Перемещение и прибытие персонажа (H3D-041)

В варианте `?hubRenderer=three2d&hubLayout=collisionReview` окно досье здания открывается **после прибытия** персонажа. Клик во время движения заменяет прежнюю цель; недостижимая цель не открывает окно; команда `hub:walk_to_building` отменяет ожидающее открытие. В штатных `legacy2d` и каноническом `three2d` взаимодействие остаётся немедленным, пока не пройдена UX-приёмка.

`HubAvatarMotion.ts` выполняет детерминированный шаг по наземным точкам с единым бюджетом расстояния даже при пересечении нескольких сегментов за кадр. `HubVisitQueue.ts` содержит только дискретное состояние взаимодействия и доставляет ID здания ровно один раз. События WorldBridge не отправляются каждый кадр. При пользовательском `prefers-reduced-motion: reduce` допустимый маршрут по-прежнему рассчитывается и проверяется, но интерполяция пропускается: персонаж сразу появляется в разрешённой точке, досье открывается без ожидания.

Новые контрактные тесты проверяют ускоренную/разбитую на кадры ходьбу, ретаргетинг, пустой/заблокированный маршрут, приоритет нового клика, отмену внешней командой и одно событие открытия. Эти тесты не подменяют настоящую браузерную UX-проверку на ПК и телефонах.
