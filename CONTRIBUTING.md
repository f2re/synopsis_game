# Contributing to «Синоптический центр»

Проект сочетает game design, realtime-разработку и предметную синоптическую метеорологию. Поэтому изменение считается корректным только тогда, когда оно не ломает соседние слои.

## 1. С чего начать

Перед работой прочитайте:

1. `README.md`;
2. `docs/README.md`;
3. документ соответствующего домена;
4. `docs/testing/QUALITY_GATES.md`.

Для предметного контента дополнительно обязательны:

- `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md`;
- `docs/09_SOURCE_POLICY.md`;
- `docs/05_CONTENT_SCHEMA.md`.

## 2. Типы изменений

### Код

Изменяет engine, UI, realtime, storage, map renderer, tooling.

### Content

Добавляет/меняет tasks, scenarios, method profiles, sources, skills.

### Methodology

Меняет трактовку термина, последовательность, допустимый ответ, нотацию или правило.

### Game design

Меняет механику, режим, баланс, progression.

### Documentation

Уточняет спецификацию без изменения поведения.

## 3. Ветка и PR

Рекомендуемые имена веток:

```text
feat/...
fix/...
docs/...
content/...
method/...
refactor/...
```

Один PR — одна логическая цель.

## 4. Commit messages

Рекомендуемый формат:

```text
feat: add blitz match state
fix: reject client-side answer payload
content: add KN-01 temperature drills
docs: document method profile versioning
method: clarify map lift terminology
```

## 5. Изменение учебного контента

PR должен явно ответить:

- какой `method_profile` используется;
- какой источник подтверждает правильный ответ;
- есть ли локатор страницы/раздела;
- это реальный или синтетический материал;
- если реальный — есть ли provenance/rights;
- какие reason codes возникают при ошибках;
- проверено ли задание на неоднозначность.

Нельзя использовать «так принято» без источника для Ranked/Exam content.

## 6. Изменение российской терминологии

Не смешивать:

- классический учебник;
- кафедральную методику;
- действующий официальный документ;
- проектную игровую условность.

Если два источника расходятся, создаётся отдельный профиль/версия, а не молчаливое «исправление» одного другим.

## 7. Новая игровая механика

Сначала добавить карточку в `docs/game-design/MECHANICS_CATALOG.md` или `docs/ideas/IDEA_BACKLOG.md`.

Минимально описать:

- учебную цель;
- игровой цикл;
- эффект;
- стоимость/сложность;
- риски;
- влияние на Ranked;
- acceptance criteria.

## 8. Архитектурное изменение

Если изменение влияет на несколько пакетов, format replay, versioning, storage, security model или content semantics — нужен ADR в `docs/decisions/`.

## 9. UI/UX

Главное правило: student UI — game-first, не dashboard-first.

Во время активной задачи:

- карта/задача доминирует;
- вторичная статистика не конкурирует с ней;
- mobile сохраняет один фокус;
- учебные цвета не подменяются декоративной темой.

## 10. Тесты

В зависимости от изменения нужны:

- unit tests;
- integration tests;
- E2E;
- content validation;
- property-based tests для генераторов;
- replay determinism;
- visual/regression checks для ключевых renderers.

## 11. Definition of Ready

Не начинайте крупную задачу без:

- ясного scope;
- acceptance criteria;
- dependency list;
- нужного source/method profile для учебной логики;
- понимания, что не входит в задачу.

## 12. Definition of Done

PR считается готовым, когда:

- CI зелёный;
- документация обновлена;
- изменения покрыты подходящими тестами;
- method/content review выполнен, если требуется;
- нет скрытой зависимости от конкретной кафедральной трактовки;
- replay/versioning не нарушены.

## 13. Что приветствуется

- маленькие вертикальные срезы;
- реальные архивные сценарии с provenance;
- автоматические валидаторы;
- accessibility;
- low-end mobile performance;
- инструменты для преподавателя;
- хорошие объяснения ошибок.

## 14. Что не приветствуется

- pay-to-win;
- hardcoded учебные ответы в UI;
- синтетические карты, выданные за реальные;
- механики без учебной цели;
- декоративный dashboard вместо игрового процесса;
- AI-generated правильные ответы без проверки;
- изменение published content задним числом.
