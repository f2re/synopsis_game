<div align="center">

# 🌦️ Синоптический центр

### Современная соревновательная учебная игра по синоптической метеорологии

**Российская синоптическая школа · live КН-01 · realtime PvP · автономные турниры · живой pixel-art мир**

[![Docs & repository quality](https://github.com/f2re/synopsis_game/actions/workflows/docs-quality.yml/badge.svg)](https://github.com/f2re/synopsis_game/actions/workflows/docs-quality.yml)
![Project status](https://img.shields.io/badge/status-specification%20%26%20MVP%20planning-1f6feb)
![Methodology](https://img.shields.io/badge/methodology-Russian%20synoptic%20school-0a7f5a)
![Live data](https://img.shields.io/badge/KN--01-live%20data-0ea5e9)
![Runtime](https://img.shields.io/badge/runtime-autonomous-6f42c1)
![World](https://img.shields.io/badge/world-living%20pixel--art-e67e22)
![Ranked](https://img.shields.io/badge/Ranked-no%20pay--to--win-0a7f5a)
![License](https://img.shields.io/badge/license-pending-lightgrey)

[Документация](docs/README.md) · [GDD](docs/00_VISION_GDD.md) · [Foundations](docs/00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md) · [Российская школа](docs/01_RUSSIAN_SYNOPIC_SCHOOL.md) · [MVP backlog](docs/roadmap/MVP_BACKLOG.md) · [Contributing](CONTRIBUTING.md)

</div>

---

## Идея

**«Синоптический центр»** — web-first игра для студентов-метеорологов и образовательных мероприятий, где профессиональная операция синоптика является непосредственно игровым действием.

> **Знание не проверяется перед игровым действием — знание и есть игровое действие.**

Игрок дешифрирует КН-01, собирает схему станции, проводит критику наблюдений, анализирует приземные карты, АТ/ОТ и фронты — и качество этих действий определяет исход смены, блица, дуэли или командного матча.

Новая фундаментальная модель проекта добавляет ещё один принцип:

> **Игра живёт сама.** Мир меняется, реальные данные поступают автоматически, матчи и турниры считаются сервером, а большой экран сам выбирает интересный live battle или attract-mode.

---

## Фундаментальные принципы

| Принцип | Реализация |
|---|---|
| 🎯 Процедурное обучение | студент запоминает **что и в каком порядке делать**, а не только определения |
| 🇷🇺 Российская школа | В/Н, П/Р, подъём карты, историчность, трёхмерность, АТ/ОТ, ВФЗ, ПЭСМ |
| 🌐 Live КН-01 | реальные метеотелеграммы станций могут автоматически становиться заданиями |
| 🧠 Автоматическая проверка | parser/encoder/validators формируют эталон без ручной оценки преподавателя |
| ⚔️ Knowledge-as-action | правильная профессиональная операция сама создаёт игровой эффект |
| 🏟️ Autonomous Arena TV | экран сам выбирает лучший live match, replay, leaderboard или attract-mode |
| 🌅 Living world | день/ночь, сезоны, птицы, белки, NPC, радар, фонари и интерактивные микро-события |
| 👤 Персональный синоптик | внешний вид, одежда, инструменты, companions и коллекции |
| 🔒 Closed roster | саморегистрации нет; пользователей добавляет администратор |
| 🧩 Versioned content | правила КН-01, методики, задачи и сценарии версионируются |
| ⚖️ Честный Ranked | косметика и прокачка не дают преимущества в рейтинговом матче |
| 🔁 Replay | матч хранится как event log с версиями rules/content/source snapshot |

Подробно: **[Фундаментальные runtime-принципы](docs/00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md)**.

---

## Живой Синоптический центр

Хаб — не статичный фон и не меню.

Он должен меняться в течение дня:

```text
рассвет → день → сумерки → вечер → ночь
```

Меняются:

- небо и свет;
- окна и фонари;
- активность помещений;
- NPC;
- птицы и животные;
- радар/мачты/флаги;
- сезонный декор;
- редкие фоновые события.

На птиц, бакланов/чаек, белок, флюгер, радар, фонтан и другие объекты можно нажимать. Часть взаимодействий открывает `World Discoveries`, косметику или просто забавную реакцию.

Всё строится из sprites/layers/CSS/SVG/Canvas, а не одного огромного static background.

- [Pixel-art Style Guide](docs/design/PIXEL_ART_STYLE_GUIDE.md)
- [Living World System](docs/design/LIVING_WORLD_SYSTEM.md)
- [Reference screens](design/pixel-art/README.md)

---

## Live КН-01

КН-01 должен поддерживать свежие реальные наблюдения, а не только заранее написанные вопросы.

```text
папка / socket / WebSocket feed
        ↓
raw telegram store
        ↓
versioned KN01 parser
        ↓
canonical observation
        ↓
QC / validation
        ↓
live snapshot pack
        ↓
automatic task generator
        ↓
Solo / Blitz / PvP
```

Из одной реальной станции можно автоматически получить задания на:

- decode температуры/давления/ветра/ww;
- encode группы;
- сборку схемы станции;
- восстановление давления;
- сравнение сроков;
- критику наблюдений.

Матч работает на фиксированном snapshot, поэтому live-данные не ломают fairness и replay.

Подробнее: **[Live КН-01 Pipeline](docs/content/LIVE_KN01_PIPELINE.md)**.

---

## Автономные матчи и большой экран

Основной runtime не требует преподавателя как оператора.

Сервер сам:

- проверяет ответы;
- считает результат;
- формирует matchmaking;
- продвигает bracket;
- выдаёт награды;
- выбирает, какой матч показывать на большом экране.

`Arena TV` автоматически предпочитает:

1. финал;
2. полуфинал;
3. матч сильнейших;
4. близкий матч/камбэк;
5. массовый Blitz;
6. highlight replay;
7. leaderboard;
8. living-world attract mode.

Это позволяет поставить экран в аудитории, холле или на дне открытых дверей и не управлять им вручную.

Подробнее: **[Autonomous Arena Display](docs/realtime/AUTONOMOUS_ARENA_DISPLAY.md)**.

---

## Закрытый roster и быстрый вход

Публичной регистрации нет.

```text
Admin/import
    ↓
разрешённый roster
    ↓
выбор группы
    ↓
выбор своего профиля
    ↓
короткий classroom PIN/code
    ↓
игра
```

Очень короткий код в 1–2 символа рассматривается только как удобный **classroom credential** в локальном доверенном режиме с rate limiting/lockout. Для публичного интернет-доступа security profile требует более сильный PIN или device pairing.

Подробнее: **[Roster Login & Access](docs/accounts/ROSTER_LOGIN_AND_ACCESS.md)**.

---

## Персонаж и коллекции

Игрок создаёт собственного пиксельного синоптика:

- тон кожи;
- причёска;
- волосы;
- одежда;
- рюкзак;
- обувь;
- инструмент в руках;
- значки;
- companion.

Стартовые направления:

- спортивный;
- строгий;
- полевой/походный;
- туристический;
- учебный/лабораторный.

Атрибутика зарабатывается за игру: Blitz, Duel, турниры, mastery, достижения, квалификации, архивные боссы и World Discoveries.

Особая коллекционная линия — синоптические карандаши: красно-синий фронтальный, мягкий чёрный изобарный, набор для подъёма карты, футляры, заточка, памятные и сезонные версии.

Все предметы — `cosmetic_only` для Ranked.

Подробнее: **[Avatar & Cosmetic Progression](docs/game-design/AVATAR_AND_COSMETIC_PROGRESSION.md)**.

---

## Основные игровые режимы

### Solo

- ежедневная «Синоптическая смена»;
- интервальное повторение;
- live КН-01 training;
- квалификационные допуски;
- архивные ситуации;
- комплексные «боссы».

### Realtime PvP

- **Blitz** — 60–120 секунд;
- **1v1 Синоптическая дуэль**;
- **2v2 Синоптическая бригада**;
- **3v3 Оперативная смена**;
- mass qualifier + playoff;
- автоматический турнир группы.

### Cooperative PvE

- ныряющий циклон;
- южный циклон;
- блокирующий антициклон;
- зимнее ОЯ;
- конвективный фронт;
- авиационная смена.

---

## Как учебная операция становится игровой механикой

| Учебная операция | Игровая роль |
|---|---|
| КН-01 / короткий decode | быстрый импульс + оперативный ресурс |
| Схема станции | защитный щит |
| Критика наблюдений | parry / контратака |
| Изобары / П–Р | контроль |
| Подъём карты | поддержка серии/workflow |
| Фронт по комплексу признаков | heavy action |
| Согласование АТ/ОТ | усиление командного решения |
| ПЭСМ | комплексное финальное действие |

Игровые эффекты не переименовывают реальные метеорологические понятия и не искажают профессиональную семантику.

---

## Архитектура

```text
apps/
├── web/
├── server/
├── display/             # Arena TV / kiosk
└── tools/

packages/
├── meteorology-domain/
├── kn01-codec/
├── live-ingest/
├── content-engine/
├── game-rules/
├── realtime-protocol/
├── broadcast-selector/
├── world-engine/
├── identity/
├── rewards/
├── map-engine/
├── replay/
└── ui/
```

Ключевое правило: **метеорологическое знание, live-ingest, игровой баланс, identity, visual world и realtime не смешиваются в одном модуле**.

Подробнее: [Architecture](docs/architecture/README.md).

---

## Документация

### Базовые документы

| Документ | Содержание |
|---|---|
| [00 — Vision / GDD](docs/00_VISION_GDD.md) | продуктовая концепция |
| [00A — Foundations](docs/00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md) | принятые фундаментальные runtime-идеи |
| [01 — Российская школа](docs/01_RUSSIAN_SYNOPIC_SCHOOL.md) | терминология и методика |
| [02 — Gameplay & Balance](docs/02_GAMEPLAY_AND_BALANCE.md) | Надёжность, OR, рейтинги |
| [03 — Realtime PvP](docs/03_REALTIME_PVP_AND_BROADCAST.md) | матчи, автономные турниры, broadcast, replay |
| [04 — Content & Tasks](docs/04_CONTENT_AND_TASKS.md) | типы задач |
| [05 — Content Schema](docs/05_CONTENT_SCHEMA.md) | JSON/versioning |
| [06 — Technical Requirements](docs/06_TECHNICAL_REQUIREMENTS.md) | security/performance |
| [07 — Art Direction & UX](docs/07_ART_DIRECTION_AND_UX.md) | game-first UI |
| [08 — Roadmap](docs/08_IMPLEMENTATION_ROADMAP.md) | этапы |
| [09 — Source Policy](docs/09_SOURCE_POLICY.md) | provenance/review |

### Новые фундаментальные модули

- [Living World System](docs/design/LIVING_WORLD_SYSTEM.md)
- [Live КН-01 Pipeline](docs/content/LIVE_KN01_PIPELINE.md)
- [Autonomous Arena Display](docs/realtime/AUTONOMOUS_ARENA_DISPLAY.md)
- [Roster Login & Access](docs/accounts/ROSTER_LOGIN_AND_ACCESS.md)
- [Avatar & Cosmetic Progression](docs/game-design/AVATAR_AND_COSMETIC_PROGRESSION.md)
- [Foundation Epics](docs/roadmap/FOUNDATION_EPICS.md)
- [ADR-0002](docs/decisions/ADR-0002-autonomous-living-runtime.md)

Полный индекс: **[docs/README.md](docs/README.md)**.

---

## Foundation implementation gate

Концепция считается реально вошедшей в продукт, когда одновременно работают:

- закрытый roster + быстрый classroom login;
- live КН-01 source → автоматически проверяемая задача;
- полностью автономный 1v1;
- Arena TV сам показывает матч и возвращается в attract-mode;
- хаб имеет минимум 4 time-of-day состояния;
- avatar сохраняется и виден в duel/spectator;
- награда за игру открывает cosmetic item без Ranked advantage.

Исполнимый backlog: **[FOUNDATION_EPICS.md](docs/roadmap/FOUNDATION_EPICS.md)**.

---

## Методическая корректность

Любое эталонное задание должно отвечать:

> **Из какого источника, какой редакции и по какому method profile этот ответ считается правильным?**

Классический учебник, кафедральная методика и современный норматив не смешиваются в неявное правило. Для КН-01 дополнительно фиксируется `kn01_ruleset_id` и snapshot/source version.

AI может помогать с draft и интерфейсом, но не является источником правильного метеорологического ответа.

---

## Contributing

См. [CONTRIBUTING.md](CONTRIBUTING.md) и [quality gates](docs/testing/QUALITY_GATES.md).

---

## Статус

**Сейчас:** specification + modular design + MVP/foundation planning.  
**Следующий milestone:** monorepo + identity/roster + KN01 codec/live-ingest + первый autonomous 1v1 + Arena TV + living hub slice.  
**Лицензия:** пока не выбрана.

---

<div align="center">

**Синоптический центр — атмосфера, которая живёт; знания, которые становятся действием.**

</div>
