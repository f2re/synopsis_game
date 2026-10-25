# 08. План-проспект реализации и backlog

## 1. Принцип планирования

Разработка идёт вертикальными срезами: каждый этап должен давать работающий сценарий от контента до интерфейса и аналитики, а не набор несвязанных подсистем.

План не фиксирует календарные сроки. Переход к следующему этапу происходит после выполнения acceptance criteria предыдущего.

## 2. Этап 0 — методическое и продуктовое основание

### METH-001 — Registry источников

- [ ] создать `content/sources/`;
- [ ] занести фундаментальные учебники;
- [ ] занести действующие РД;
- [ ] занести используемые редакции кодов;
- [ ] присвоить стабильные `source_id`;
- [ ] указать authority/status.

**DoD:** ни одно опубликованное учебное правило не существует без `source_id` или явного статуса `department_custom`.

### METH-002 — Методические профили

- [ ] `RUS_CLASSIC_TRAINING_V1`;
- [ ] кафедральный override;
- [ ] notation profile;
- [ ] sequence dependencies;
- [ ] allowed swaps;
- [ ] правила фронтологического анализа.

### METH-003 — Экспертная валидация

- [ ] проверить термин «подъём карты»;
- [ ] В/Н, П/Р, Т/Х;
- [ ] схему станции;
- [ ] первичный анализ;
- [ ] фронтологию;
- [ ] АТ/ОТ;
- [ ] ПЭСМ;
- [ ] правила использования реальных/синтетических данных.

### PROD-001 — Product principles

- [ ] утвердить game-first UI;
- [ ] утвердить честный PvP;
- [ ] утвердить разделение Mastery/Arena Rating;
- [ ] утвердить запрет pay-to-win;
- [ ] определить возраст/аудиторию пилота.

---

## 3. Этап 1 — технический каркас

### ENG-001 — Monorepo

- [ ] frontend;
- [ ] backend;
- [ ] shared schemas;
- [ ] game rules;
- [ ] content;
- [ ] tests;
- [ ] CI.

### ENG-002 — Content loader

- [ ] JSON Schema;
- [ ] content pack loading;
- [ ] source validation;
- [ ] method profile resolver;
- [ ] dev error reporting.

### ENG-003 — User/progress core

- [ ] локальный профиль;
- [ ] attempts;
- [ ] mastery skeleton;
- [ ] журнал ошибок.

### UI-001 — Design system

- [ ] game UI tokens;
- [ ] meteorological semantic tokens;
- [ ] typography;
- [ ] desktop/mobile breakpoints;
- [ ] reduced motion;
- [ ] accessibility baseline.

**Gate 1:** можно открыть игру, загрузить content pack, выполнить задание и сохранить попытку.

---

## 4. Этап 2 — первый учебный vertical slice

### TASK-001 — Choice renderer
### TASK-002 — Sequence renderer
### TASK-003 — Decode renderer
### TASK-004 — StationPlot renderer
### TASK-005 — FindError renderer
### TASK-006 — Hotspot renderer

Для каждого:

- [ ] desktop;
- [ ] mobile;
- [ ] answer validation;
- [ ] explanation;
- [ ] source display;
- [ ] attempt logging;
- [ ] unit tests.

### CONTENT-001 — Условные обозначения
### CONTENT-002 — КН-01 базовый
### CONTENT-003 — Схема станции
### CONTENT-004 — В/Н и П/Р
### CONTENT-005 — Критика наблюдений
### CONTENT-006 — Алгоритмический конструктор первичного анализа

### SOLO-001 — «Ежедневная смена»

- [ ] 2 review tasks;
- [ ] 2 current-topic tasks;
- [ ] 1 challenge;
- [ ] итог;
- [ ] ошибки;
- [ ] mastery update.

**Gate 2:** студент может пройти короткую смену на телефоне и компьютере; преподаватель может просмотреть журнал попыток.

---

## 5. Этап 3 — базовая карта

### MAP-001 — Interactive surface

- [ ] zoom/pan;
- [ ] raster base;
- [ ] vector overlays;
- [ ] station points;
- [ ] layer switcher;
- [ ] fullscreen.

### MAP-002 — Station plots

- [ ] SVG renderer;
- [ ] hit testing;
- [ ] selectable components;
- [ ] Russian notation profile.

### MAP-003 — Lines

- [ ] fronts;
- [ ] isobars;
- [ ] isallobars;
- [ ] tolerance corridor;
- [ ] geometry scoring.

### MAP-004 — Time/level comparison

- [ ] previous term;
- [ ] split view;
- [ ] AТ layer switching;
- [ ] ОТ layer switching.

**Gate 3:** можно решить учебную задачу непосредственно на карте, а не на статической картинке.

---

## 6. Этап 4 — PvP vertical slice

### NET-001 — WebSocket protocol
### NET-002 — Authoritative match state
### NET-003 — Server task generation
### NET-004 — Server answer validation
### NET-005 — Reconnect/snapshot

### GAME-001 — Reliability
### GAME-002 — OR resource
### GAME-003 — Quick/medium/heavy effects
### GAME-004 — Combo
### GAME-005 — Shield/parry

### MODE-001 — 90-second Blitz
### MODE-002 — 1v1 Duel

### FAIR-001 — Ranked normalization
### FAIR-002 — Ping/grace policy
### FAIR-003 — Equivalent task generator

**Gate 4:** два удалённых игрока могут завершить честную дуэль; правильные ответы отсутствуют в клиентском payload.

---

## 7. Этап 5 — spectator, instructor, tournament

### OBS-001 — Spectator route

- [ ] join active match;
- [ ] read-only state;
- [ ] closed-answer reveal;
- [ ] projector layout.

### OBS-002 — Instructor view

- [ ] answer timings;
- [ ] error codes;
- [ ] principle violations;
- [ ] mark replay moment;
- [ ] group summary.

### TOURN-001 — Room + join code/QR
### TOURN-002 — Mass qualifier
### TOURN-003 — Single-elimination bracket
### TOURN-004 — Auto-main-stage projector match

### REPLAY-001 — Event log
### REPLAY-002 — Replay player
### REPLAY-003 — Version manifest

**Gate 5:** преподаватель создаёт турнир группы, участники входят по коду, аудитория видит матч на проекторе, после матча доступен replay.

---

## 8. Этап 6 — продвинутая синоптика

### CONTENT-AT-001 — АТ-850
### CONTENT-AT-002 — АТ-700
### CONTENT-AT-003 — АТ-500
### CONTENT-AT-004 — АТ-300
### CONTENT-OT-001 — ОТ1000/500
### CONTENT-TB-001 — Термобарическое поле

### FRONT-001 — История процесса
### FRONT-002 — Приземный комплекс признаков
### FRONT-003 — Vertical consistency
### FRONT-004 — ВФЗ
### FRONT-005 — Эволюция фронта

### AERO-001 — Аэрологическая диаграмма
### AERO-002 — Вертикальный разрез

### ADV-001 — Орографические особенности
### ADV-002 — Ведущий поток
### ADV-003 — ПЭСМ

**Gate 6:** игра проверяет не только распознавание, но и трёхмерное/историческое согласование решения.

---

## 9. Этап 7 — командные режимы

### MODE-2V2 — Синоптическая бригада

- [ ] роли surface/upper-air;
- [ ] shared state;
- [ ] vertical-consistency combo;
- [ ] team rating experimental.

### MODE-3V3 — Оперативная смена

- [ ] observation/code role;
- [ ] surface/frontology role;
- [ ] aerology role;
- [ ] common forecast stage.

### PVE-001 — Group raid framework

**Gate 7:** команда вынуждена обмениваться профессионально значимыми выводами, а не просто складывать очки.

---

## 10. Этап 8 — реальные архивные сценарии

### DATA-001 — Archive case format
### DATA-002 — Asset provenance
### DATA-003 — Rights/license registry
### DATA-004 — Historical map normalization

### BOSS-001 — Ныряющий циклон
### BOSS-002 — Южный циклон
### BOSS-003 — Блокирующий антициклон
### BOSS-004 — Конвективный фронт
### BOSS-005 — Зимнее ОЯ
### BOSS-006 — Авиационная смена

Каждый кейс должен иметь:

- дату/срок;
- район;
- исходные данные;
- источники;
- ожидаемые решения;
- допустимые альтернативы;
- методический комментарий;
- права на использование материалов.

---

## 11. Этап 9 — радар/спутник/ОЯ

### RADAR-001 — Базовые продукты МРЛ
### RADAR-002 — Радиоэхо и опасные зоны
### SAT-001 — Облачные системы
### SAT-002 — Нефанализ в профиле курса
### OYA-001 — Сценарии опасных явлений

Контент сверять с актуальными методическими документами отдельно от классического учебника.

---

## 12. Этап 10 — production hardening

### SEC-001 — Security review
### SEC-002 — Authorization tests
### SEC-003 — Abuse/rate limiting

### PERF-001 — Low-end mobile profile
### PERF-002 — Classroom 30-user test
### PERF-003 — Spectator fan-out test

### OPS-001 — Metrics/logging
### OPS-002 — Backups
### OPS-003 — Content rollback
### OPS-004 — Match incident tooling

### A11Y-001 — Keyboard
### A11Y-002 — Contrast
### A11Y-003 — Reduced motion
### A11Y-004 — Color-independent semantic markers

---

## 13. Эпики backlog

### EPIC A — Methodology

- METH source registry;
- method profiles;
- expert review;
- version policy.

### EPIC B — Core learning

- tasks;
- feedback;
- mastery;
- spaced repetition;
- journal of errors.

### EPIC C — Map workstation

- map layers;
- station plotting;
- lines;
- time/height comparison.

### EPIC D — Realtime

- match server;
- protocol;
- reconnect;
- event store.

### EPIC E — Competition

- blitz;
- duel;
- rating;
- tournament;
- teams.

### EPIC F — Classroom

- groups;
- instructor;
- projector;
- export;
- replay review.

### EPIC G — Advanced meteorology

- AT/OT;
- frontology;
- aerology;
- radar/satellite;
- OЯ;
- forecast.

### EPIC H — Art/UX

- design system;
- game home;
- match HUD;
- mobile;
- spectator;
- accessibility.

---

## 14. Приоритет MVP

Если нужно радикально сократить объём, сохранять в таком порядке:

1. методический профиль + источники;
2. КН-01 / station plot / critique;
3. 5–6 универсальных renderer-ов;
4. solo daily shift;
5. 90-second blitz;
6. 1v1;
7. spectator/instructor;
8. tournament;
9. карта/frontology;
10. advanced content.

Не начинать с изометрической базы, экономики, магазина или сложной 3D-графики — они не доказывают ключевую ценность проекта.

## 15. Definition of Product MVP

MVP считается успешным, если одновременно выполнено:

- методист может проверить источник каждого эталонного задания;
- студент проходит тренировку на смартфоне;
- 1v1 интересен без искусственных усилителей;
- преподаватель запускает массовый блиц;
- spectator screen понятен аудитории;
- система показывает типичные ошибки группы;
- новый пакет вопросов добавляется без изменения движка;
- replay позволяет разобрать спорный эпизод;
- постоянная прокачка не влияет на исход Ranked.
