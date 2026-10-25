# Документация проекта «Синоптический центр»

Этот каталог — единая точка входа в проектную документацию. Документы разделены на **базовые спецификации** и **модульные расширения**, чтобы механику, методику, архитектуру и контент можно было изменять независимо.

## 1. Базовые спецификации

| № | Документ | Назначение |
|---|---|---|
| 00 | [Видение и GDD](00_VISION_GDD.md) | продуктовая идея, игровые циклы, прогрессия, режимы |
| 01 | [Российская синоптическая школа](01_RUSSIAN_SYNOPIC_SCHOOL.md) | терминология, принципы отечественной школы, методические ограничения |
| 02 | [Gameplay и баланс](02_GAMEPLAY_AND_BALANCE.md) | боевые эффекты, OR, Надёжность, PvP, рейтинги |
| 03 | [Realtime PvP и трансляции](03_REALTIME_PVP_AND_BROADCAST.md) | WebSocket, spectator, instructor, replay, турниры |
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
| Meteorology | [Учебные модули](meteorology/CONTENT_MODULES.md) | предметная карта курса и зависимости |
| Architecture | [Архитектура](architecture/README.md) | границы пакетов, зависимости, versioning |
| Content | [Authoring guide](content/AUTHORING_GUIDE.md) | как добавить новое задание/сценарий |
| UX | [Screen map](ux/SCREEN_MAP.md) | маршруты, экраны и визуальная иерархия |
| Roadmap | [MVP backlog](roadmap/MVP_BACKLOG.md) | исполнимые задачи первого vertical slice |
| Ideas | [Idea backlog](ideas/IDEA_BACKLOG.md) | эксперименты и гипотезы до принятия |
| Decisions | [ADR](decisions/README.md) | почему приняты дорогие/сквозные решения |
| Testing | [Quality gates](testing/QUALITY_GATES.md) | Definition of Ready/Done и проверки |

Целевая иерархия:

```text
docs/
├── game-design/       # отдельные игровые механики и режимы
├── meteorology/       # учебные модули и предметные границы
├── architecture/      # модульная архитектура и границы сервисов
├── content/           # авторинг и workflow контента
├── ux/                # screen map, HUD, responsive rules
├── roadmap/           # исполнимые задачи и MVP backlog
├── ideas/             # идеи, эксперименты и гипотезы
├── decisions/         # ADR — архитектурные и продуктовые решения
└── testing/           # quality gates и тестовые стратегии
```

## 3. Что где редактировать

- Изменение **термина или методики** → `01_RUSSIAN_SYNOPIC_SCHOOL.md`, `meteorology/`, `09_SOURCE_POLICY.md`.
- Новая **игровая механика** → `game-design/MECHANICS_CATALOG.md`.
- Новый **режим игры** → базовый GDD + отдельная карточка механики/режима.
- Изменение **баланса** → `02_GAMEPLAY_AND_BALANCE.md`, затем `BalanceProfile` в контенте.
- Новая **сущность JSON** → `05_CONTENT_SCHEMA.md`.
- Изменение **архитектуры** → `architecture/` + ADR.
- Новое **задание или сценарий** → `content/AUTHORING_GUIDE.md` + `content/` в корне проекта.
- Изменение **экранов/пространства UI** → `ux/SCREEN_MAP.md` + `07_ART_DIRECTION_AND_UX.md`.
- Новая **идея** → `ideas/IDEA_BACKLOG.md` до переноса в roadmap.
- Готовая к реализации идея → `roadmap/MVP_BACKLOG.md` с acceptance criteria.

## 4. Статусы документов

Рекомендуемые статусы:

- `draft` — идея или черновик;
- `proposed` — готово к обсуждению;
- `accepted` — принято как проектное решение;
- `method_reviewed` — проверено предметным специалистом;
- `implemented` — реализовано в коде;
- `deprecated` — заменено новым решением.

В новых документах статус указывать в начале файла.

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
Источники и методика
        ↓
Предметная модель
        ↓
TaskDefinition / Scenario
        ↓
Игровые правила
        ↓
Режим матча
        ↓
UI / UX
        ↓
Realtime / storage / analytics
```

Если верхний уровень изменился, нижние уровни проверяются на совместимость, но не переписываются автоматически.

## 7. Начать реализацию

Для первого vertical slice читать в порядке:

1. [00 — GDD](00_VISION_GDD.md)
2. [01 — Российская школа](01_RUSSIAN_SYNOPIC_SCHOOL.md)
3. [04 — Контент](04_CONTENT_AND_TASKS.md)
4. [05 — Schema](05_CONTENT_SCHEMA.md)
5. [Architecture](architecture/README.md)
6. [Authoring guide](content/AUTHORING_GUIDE.md)
7. [Screen map](ux/SCREEN_MAP.md)
8. [MVP backlog](roadmap/MVP_BACKLOG.md)
9. [Quality gates](testing/QUALITY_GATES.md)

## 8. Золотое правило документации

Если решение нельзя однозначно отнести к одному из слоёв — его сначала оформить как ADR или идею, а не зашивать напрямую в код.
