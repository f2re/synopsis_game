# Документация проекта «Синоптический центр»

Этот каталог — единая точка входа в проектную документацию. Документы разделены на **базовые спецификации** и **модульные расширения**, чтобы механику, методику, архитектуру, контент и визуальный язык можно было изменять независимо.

> После GDD обязательно читать [`00A — Фундаментальные runtime-принципы`](00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md). Он фиксирует живой мир, live КН-01, автономную Arena TV, закрытый roster и персонализируемого персонажа как основы продукта.

## 1. Базовые спецификации

| № | Документ | Назначение |
|---|---|---|
| 00 | [Видение и GDD](00_VISION_GDD.md) | продуктовая идея, игровые циклы, прогрессия, режимы |
| 00A | [Фундаментальные runtime-принципы](00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md) | живой мир, автономность, live-данные, roster, avatar |
| 01 | [Российская синоптическая школа](01_RUSSIAN_SYNOPIC_SCHOOL.md) | терминология, принципы отечественной школы, методические ограничения |
| 02 | [Gameplay и баланс](02_GAMEPLAY_AND_BALANCE.md) | боевые эффекты, OR, Надёжность, PvP, рейтинги |
| 03 | [Realtime PvP и трансляции](03_REALTIME_PVP_AND_BROADCAST.md) | WebSocket, автономные турниры, Arena TV, replay |
| 04 | [Контент и типы заданий](04_CONTENT_AND_TASKS.md) | renderers, drills, сценарии, реальные/синтетические данные |
| 05 | [Content schema](05_CONTENT_SCHEMA.md) | JSON, MethodProfile, ContentPack, TaskDefinition, ReplayManifest |
| 06 | [Технические требования](06_TECHNICAL_REQUIREMENTS.md) | web-first архитектура, домены, security, performance |
| 07 | [Арт-дирекшн и UX](07_ART_DIRECTION_AND_UX.md) | game-first UI, карта как сцена, mobile/spectator/instructor UX |
| 08 | [Roadmap](08_IMPLEMENTATION_ROADMAP.md) | этапы, gates, epics, Definition of MVP |
| 09 | [Политика источников](09_SOURCE_POLICY.md) | provenance, authority, review и правила публикации контента |

## 2. Модульная документация

| Раздел | Документ | Для чего |
|---|---|---|
| Game Design | [Каталог механик](game-design/MECHANICS_CATALOG.md) | добавлять/менять механику без раздувания GDD |
| Game Design | [Avatar & Cosmetic Progression](game-design/AVATAR_AND_COSMETIC_PROGRESSION.md) | персонализация, заработанные предметы, companions |
| Meteorology | [Учебные модули](meteorology/CONTENT_MODULES.md) | предметная карта курса и зависимости |
| Architecture | [Архитектура](architecture/README.md) | границы пакетов, live-ingest, broadcast, identity, world-engine |
| Content | [Authoring guide](content/AUTHORING_GUIDE.md) | как добавить новое задание/сценарий |
| Content | [Live КН-01 pipeline](content/LIVE_KN01_PIPELINE.md) | реальные станции, file/socket feed, parser/encoder, snapshot pool |
| Realtime | [Autonomous Arena Display](realtime/AUTONOMOUS_ARENA_DISPLAY.md) | автоматический выбор live-матча, kiosk/attract mode |
| Accounts | [Roster Login & Access](accounts/ROSTER_LOGIN_AND_ACCESS.md) | без саморегистрации, admin roster, classroom PIN/code |
| UX | [Screen map](ux/SCREEN_MAP.md) | маршруты, экраны и визуальная иерархия |
| Design | [Pixel-art style guide](design/PIXEL_ART_STYLE_GUIDE.md) | зафиксированный визуальный baseline, персонажи, инвентарь |
| Design | [Living World System](design/LIVING_WORLD_SYSTEM.md) | время суток, фоновые анимации, птицы/животные, interactables |
| Roadmap | [MVP backlog](roadmap/MVP_BACKLOG.md) | исполнимые задачи первого vertical slice |
| Ideas | [Idea backlog](ideas/IDEA_BACKLOG.md) | эксперименты и гипотезы до принятия |
| Decisions | [ADR](decisions/README.md) | почему приняты дорогие/сквозные решения |
| Testing | [Quality gates](testing/QUALITY_GATES.md) | Definition of Ready/Done и проверки |

Целевая иерархия:

```text
docs/
├── game-design/       # игровые механики, avatar, rewards
├── meteorology/       # учебные модули и предметные границы
├── architecture/      # модульная архитектура и границы сервисов
├── content/           # authoring + live data pipelines
├── realtime/          # online game + autonomous display
├── accounts/          # roster, login, roles, privacy
├── ux/                # screen map, HUD, responsive rules
├── design/            # visual language, pixel art, living world
├── roadmap/           # исполнимые задачи и MVP backlog
├── ideas/             # идеи, эксперименты и гипотезы
├── decisions/         # ADR — архитектурные и продуктовые решения
└── testing/           # quality gates и тестовые стратегии
```

Визуальные reference screens хранятся отдельно в [`design/pixel-art/`](../design/pixel-art/README.md), чтобы документация ссылалась на реальные зафиксированные концепты.

## 3. Что где редактировать

- Изменение **фундаментальной модели runtime** → `00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md` + ADR при конфликте с принятым принципом.
- Изменение **термина или методики** → `01_RUSSIAN_SYNOPIC_SCHOOL.md`, `meteorology/`, `09_SOURCE_POLICY.md`.
- Новая **игровая механика** → `game-design/MECHANICS_CATALOG.md`.
- Персонализация/награды → `game-design/AVATAR_AND_COSMETIC_PROGRESSION.md`.
- Новый **режим игры** → GDD + отдельная карточка механики/режима.
- Изменение **баланса** → `02_GAMEPLAY_AND_BALANCE.md`, затем `BalanceProfile`.
- Новая **сущность JSON** → `05_CONTENT_SCHEMA.md`.
- Изменение **архитектуры** → `architecture/` + ADR.
- Новое **задание или сценарий** → `content/AUTHORING_GUIDE.md` + `content/` в корне проекта.
- Live КН-01 / real-time data feed → `content/LIVE_KN01_PIPELINE.md`.
- Arena TV / автоматическая трансляция → `realtime/AUTONOMOUS_ARENA_DISPLAY.md`.
- Login/roster/security profile → `accounts/ROSTER_LOGIN_AND_ACCESS.md`.
- Изменение **маршрутов/структуры экранов** → `ux/SCREEN_MAP.md`.
- Пиксель-арт/визуальный язык → `design/PIXEL_ART_STYLE_GUIDE.md`.
- Фоновая жизнь/время суток/interactables → `design/LIVING_WORLD_SYSTEM.md`.
- Новая **идея** → `ideas/IDEA_BACKLOG.md` до переноса в roadmap.
- Готовая к реализации идея → `roadmap/MVP_BACKLOG.md` с acceptance criteria.

## 4. Статусы документов

- `draft` — идея или черновик;
- `proposed` — готово к обсуждению;
- `accepted` — принято как проектное решение;
- `accepted-concept` — концепт принят как основа дальнейшей спецификации;
- `method_reviewed` — проверено предметным специалистом;
- `accepted-art-direction` — зафиксировано как визуальный baseline;
- `implemented` — реализовано в коде;
- `deprecated` — заменено новым решением.

## 5. Правило модульности

Ни один модуль не должен быть единственным местом, где одновременно зафиксированы:

1. учебный смысл;
2. игровые коэффициенты;
3. UI;
4. сетевой протокол;
5. конкретная технология реализации.

Эти слои связаны ссылками и ID, но меняются независимо.

## 6. Иерархия решений

```text
Источники / live data / методика
        ↓
Предметная модель
        ↓
TaskDefinition / generated TaskInstance
        ↓
Игровые правила
        ↓
Match / tournament runtime
        ↓
Autonomous broadcast / replay
        ↓
UX / screen structure
        ↓
Visual language / living world
        ↓
Storage / analytics / rewards
```

## 7. Начать реализацию

Для vertical slice читать:

1. [00 — GDD](00_VISION_GDD.md)
2. [00A — Foundations](00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md)
3. [01 — Российская школа](01_RUSSIAN_SYNOPIC_SCHOOL.md)
4. [04 — Контент](04_CONTENT_AND_TASKS.md)
5. [Live КН-01](content/LIVE_KN01_PIPELINE.md)
6. [Architecture](architecture/README.md)
7. [Realtime](03_REALTIME_PVP_AND_BROADCAST.md)
8. [Roster/Login](accounts/ROSTER_LOGIN_AND_ACCESS.md)
9. [Screen map](ux/SCREEN_MAP.md)
10. [Pixel-art style guide](design/PIXEL_ART_STYLE_GUIDE.md)
11. [Living World](design/LIVING_WORLD_SYSTEM.md)
12. [Avatar/Cosmetics](game-design/AVATAR_AND_COSMETIC_PROGRESSION.md)
13. [MVP backlog](roadmap/MVP_BACKLOG.md)
14. [Quality gates](testing/QUALITY_GATES.md)

## 8. Золотое правило документации

Если решение нельзя однозначно отнести к одному из слоёв — его сначала оформить как ADR или идею, а не зашивать напрямую в код.
