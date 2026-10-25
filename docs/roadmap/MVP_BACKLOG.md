# MVP backlog

**Статус:** active planning

Этот файл переводит общий roadmap в короткий исполнимый backlog. Задачи сгруппированы по vertical slice, каждая должна иметь owner, issue и acceptance criteria перед началом разработки.

## Epic METH — методическая база

- [ ] `METH-001` Source registry: структура, ID, authority, status.
- [ ] `METH-002` `RUS_CLASSIC_TRAINING_V1` method profile.
- [ ] `METH-003` Терминологический glossary: первичный анализ, подъём карты, В/Н, П/Р, Т/Х.
- [ ] `METH-004` Reviewer checklist для учебного задания.
- [ ] `METH-005` Зафиксировать точные библиографические записи и страницы для стартового pack.

**Gate:** каждое эталонное правило имеет source ID и status.

## Epic ENG — каркас

- [ ] `ENG-001` Инициализировать monorepo.
- [ ] `ENG-002` Общий TypeScript config/lint/test.
- [ ] `ENG-003` `content-schema` package.
- [ ] `ENG-004` `meteorology-domain` package.
- [ ] `ENG-005` `game-rules` package.
- [ ] `ENG-006` минимальный web app.
- [ ] `ENG-007` минимальный server app.

**Gate:** dev-сборка запускает клиент и сервер, CI зелёный.

## Epic CONTENT — первый content pack

- [ ] `CONTENT-001` 30+ задач на условные обозначения.
- [ ] `CONTENT-002` генератор базовых КН-01 drills.
- [ ] `CONTENT-003` 20+ station plot задач.
- [ ] `CONTENT-004` 20+ observation critique кейсов.
- [ ] `CONTENT-005` sequence задач по первичному анализу.
- [ ] `CONTENT-006` reason codes и explanations.
- [ ] `CONTENT-007` content pack manifest + version.

**Gate:** pack проходит schema/source validation.

## Epic TASK — renderers

- [ ] `TASK-001` Choice.
- [ ] `TASK-002` Sequence.
- [ ] `TASK-003` Decode/encode.
- [ ] `TASK-004` StationPlot.
- [ ] `TASK-005` FindError.
- [ ] `TASK-006` Hotspot.
- [ ] `TASK-007` общий feedback/explanation shell.

Для каждого: desktop + mobile + keyboard + tests.

## Epic SOLO — учебная петля

- [ ] `SOLO-001` Daily shift generator.
- [ ] `SOLO-002` Attempt log.
- [ ] `SOLO-003` Error journal.
- [ ] `SOLO-004` Mastery skeleton.
- [ ] `SOLO-005` Простое spaced repetition.

**Gate:** студент проходит смену на телефоне и получает объяснение ошибок.

## Epic GAME — соревновательные правила

- [ ] `GAME-001` Reliability state.
- [ ] `GAME-002` Operational Resource.
- [ ] `GAME-003` quick/medium/heavy effect model.
- [ ] `GAME-004` combo/streak.
- [ ] `GAME-005` shield/parry через observation critique.
- [ ] `GAME-006` ranked normalization.
- [ ] `GAME-007` speed bonus cap.

**Gate:** deterministic unit tests подтверждают одинаковый результат при одинаковом event stream.

## Epic NET — realtime

- [ ] `NET-001` protocol schema.
- [ ] `NET-002` authoritative match state machine.
- [ ] `NET-003` server-side task issue/validation.
- [ ] `NET-004` reconnect snapshot.
- [ ] `NET-005` event log.
- [ ] `NET-006` basic abuse/rate-limit policy.

## Epic MODE — режимы MVP

- [ ] `MODE-001` 90-second Blitz.
- [ ] `MODE-002` 1v1 Duel.
- [ ] `MODE-003` Equivalent task pairing.
- [ ] `MODE-004` Mirror demo round.

**Gate:** два удалённых браузера завершают матч без доступа клиента к правильным ответам.

## Epic CLASSROOM — аудитория

- [ ] `CLASS-001` room/join code.
- [ ] `CLASS-002` QR join.
- [ ] `CLASS-003` mass qualifier.
- [ ] `CLASS-004` playoff bracket.
- [ ] `CLASS-005` projector spectator view.
- [ ] `CLASS-006` instructor metrics.
- [ ] `CLASS-007` replay marker.

## Epic MAP — первый картографический slice

- [ ] `MAP-001` zoom/pan/fullscreen.
- [ ] `MAP-002` station plot SVG renderer.
- [ ] `MAP-003` selectable station elements.
- [ ] `MAP-004` basic isobar line task.
- [ ] `MAP-005` previous-term overlay.

## Epic UX — game-first shell

- [ ] `UX-001` design tokens: UI vs meteorological semantics.
- [ ] `UX-002` home hero + primary CTA.
- [ ] `UX-003` active match HUD.
- [ ] `UX-004` mobile one-task focus.
- [ ] `UX-005` projector layout.
- [ ] `UX-006` reduced motion/high contrast.

## Definition of MVP

MVP готов к пилоту, когда:

- стартовый content pack прошёл методическую проверку;
- solo работает mobile/desktop;
- блиц и 1v1 работают стабильно;
- instructor может создать комнату;
- зритель видит матч на проекторе;
- replay воспроизводится;
- ошибки классифицируются;
- новый task JSON добавляется без изменения движка;
- ranked не зависит от постоянной прокачки.

## Приоритизация

Использовать порядок:

`Must have → Should have → Could have → Experiment`.

Новая задача попадает сюда только после того, как идея описана в `docs/ideas/IDEA_BACKLOG.md` или принята напрямую как обязательное требование.
