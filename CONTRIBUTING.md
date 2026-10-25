# Contributing to «Синоптический центр»

Проект сочетает game design, realtime-разработку, browser graphics/audio и предметную синоптическую метеорологию. Изменение считается корректным только тогда, когда не ломает соседние слои и прошло обязательные независимые gates.

## 1. С чего начать

Перед работой прочитайте:

1. `AGENTS.md`;
2. `agents/registry.yaml`;
3. свою карточку в `agents/roles/`;
4. `README.md` и `docs/README.md`;
5. документ соответствующего домена;
6. `docs/testing/QUALITY_GATES.md` и `agents/QUALITY_GATES.md`.

Provider adapters: `CLAUDE.md`, `GEMINI.md`; Antigravity workflows/skills находятся в `.agents/`.

Для предметного контента дополнительно обязательны `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md`, `docs/09_SOURCE_POLICY.md`, `docs/05_CONTENT_SCHEMA.md`.

## 2. Ownership и review

Один task имеет одного implementation owner по `agents/tasks/FOUNDATION_OWNERSHIP.md`. Реализующий агент не принимает собственный gated результат.

Обязательные независимые контуры:

- meteorology → `meteo-methodologist-ru` + `meteo-verifier`;
- visual direction → `art-director`;
- animation/browser cost → `web-performance-engineer`;
- auth/feed/privacy → `security-privacy-reviewer`;
- shared playable baseline → `integration-release-engineer`.

## 3. Типы изменений

- **Code** — engine, UI, realtime, storage, renderer, tooling.
- **Content** — tasks, scenarios, method profiles, sources, skills.
- **Methodology** — термин, последовательность, допустимый ответ, нотация или правило.
- **Game design** — механика, режим, баланс, progression/rewards.
- **Art/Audio** — sprites, world layers, animation, soundscape, external assets.
- **Documentation** — спецификация без изменения поведения.

## 4. Ветка, handoff и PR

Рекомендуемая agent-ветка:

`agent/<agent-id>/<task-id>-<slug>`

Один PR — одна логическая цель. Handoff оформляется по `agents/ROUTING_AND_HANDOFF.md` и указывает scope, files, tests/evidence, assumptions, risks и next reviewers.

Commit examples:

```text
feat: add blitz match state
fix: reject client-side answer payload
content: add KN-01 temperature drills
method: clarify map lift terminology
art: add dusk bird sprite states
perf: throttle hidden ambient loops
```

## 5. Учебный контент и российская методика

PR должен явно указать `method_profile`, источник/редакцию/локатор, origin материала, provenance/rights и reason codes.

Нельзя использовать «так принято» без источника для Ranked/Exam. Не смешивать классический учебник, кафедральную методику, действующий документ и игровую условность. При легитимном расхождении создаётся отдельный профиль/версия.

Для Ranked/Exam требуется `METEO_ACCEPTED`: две независимые проверки и, где возможно, машинный fixture/test.

## 6. Новая игровая механика

Сначала `docs/game-design/MECHANICS_CATALOG.md` или `docs/ideas/IDEA_BACKLOG.md`.

Опишите учебную цель, игровой цикл, effect/cost, риски, Ranked impact, accessibility и acceptance criteria. Pay/grind-to-win запрещён; правильность важнее скорости.

## 7. Art, living world и audio

Визуал следует `docs/design/PIXEL_ART_STYLE_GUIDE.md`, `docs/design/LIVING_WORLD_SYSTEM.md` и `design/tokens/pixel-art-theme.yaml`.

- task/map остаётся главным объектом;
- `meteo.*` цвета/геометрия не меняются косметикой;
- world phase берётся из конфигурируемого `world_location`, а не скрытого местоположения пользователя;
- production assets декомпозируются в sprites/layers/components;
- heavy animation требует performance gate и reduced-motion;
- external audio/art имеет URL, author, license, attribution, local path/checksum; неизвестные права = reject.

## 8. Архитектурное изменение

Если меняются несколько пакетов, replay/versioning/storage/security/content semantics или фундаментальный runtime-принцип — нужен ADR в `docs/decisions/`.

## 9. UI/UX

Student UI — game-first, не dashboard-first. Desktop/mobile/projector должны сохранять понятную иерархию. Keyboard/focus, readable contrast, touch targets и reduced-motion обязательны для core flow.

## 10. Тесты

В зависимости от изменения нужны unit, integration, E2E, content validation, property-based генераторные тесты, replay determinism, visual/regression и performance profiling.

## 11. Definition of Ready

Task готов к разработке, если есть:

- ID, owner agent и reviewers;
- ясный scope/acceptance criteria/dependencies;
- source/method profile для предметной логики;
- UX/art reference для пользовательского изменения;
- тестовый сценарий;
- понимание, что не входит в задачу.

## 12. Definition of Done

Feature готова, когда:

- CI зелёный;
- owner tests выполнены;
- все required independent gates закрыты;
- документация/schema обновлены;
- нет critical methodology ambiguity;
- replay/version policy соблюдена;
- Integration/Release agent воспроизвёл acceptance criteria.

## 13. Не допускается

- self-approval gated work;
- hardcoded учебные ответы в UI;
- AI-generated правильные ответы без source-backed acceptance;
- синтетические карты под видом реальных;
- pay-to-win;
- неизвестно лицензированные скачанные assets;
- декоративный dashboard вместо игрового процесса;
- изменение published content задним числом;
- утверждение, что agent/test/review «выполнен», без проверяемого артефакта.
