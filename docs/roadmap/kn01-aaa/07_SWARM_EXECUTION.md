# 07. Исполнение роем агентов

**Статус:** принято к исполнению

## 1. Принципы

1. Источник статуса — только [`harness/plan.json`](harness/plan.json). Отметки в Markdown, чатах и коммитах статусом не являются.
2. Одна задача — один владелец и один или несколько независимых проверяющих (`agents/registry.yaml`). Самоприёмка запрещена и блокируется валидатором.
3. Агент берёт только задачу из `python tools/validate_harness_plan.py --next`.
4. Любое отклонение от спецификации — запись в поле `notes` задачи и сообщение оркестратору до продолжения.
5. Методические утверждения — только после W1-01; художественные ассеты — только через кандидатов, проверку `pixel-art-quality-reviewer` и затем `art-director`.

## 2. Волны

| Волна | Цель | Выход из волны |
|---|---|---|
| W0 | бейзлайн, тестовый ростер, восстановленные эталоны, харнесс в проверках | бейзлайн-скриншоты и метрики; e2e может войти в игру |
| W1 | фундамент: методика, дизайн уровня, арт-библия, типографика, токены, контракты, бюджеты, звуковая карта, вайрфреймы | все спецификации утверждены проверяющими |
| W2 | производство: кодек, генератор, банк телеграмм, пакет заданий, серверная прогрессия, ассеты, звуки, конвейер | все ассеты и данные прошли свои ворота |
| W3 | интеграция экранов, сцен и звука | путь S00–S21 работает целиком |
| W4 | полировка: анимации, подсветки, доступность, производительность, тексты | все пункты `02_VISION_AND_PILLARS.md` §3 выполнены |
| W5 | приёмка: e2e, визуальная регрессия, плейтест, методическая и художественная приёмка, релизные ворота | `publication_allowed: true` для пакета уровня и выпуск |

Внутри волны задачи без взаимных зависимостей выполняются параллельно. Параллельные исполнители никогда не правят одни и те же файлы: поле `deliverables` задаёт зону владения.

## 3. Роли, навыки и инструменты

| Роль (реестр) | Основные задачи | Навыки и инструменты агента |
|---|---|---|
| `orchestrator` | контракты данных, порядок волн, разбор блокировок | `.agents/workflows/start-foundation-cycle.md`, навык `plan`, агент `planner`, агент `architect` |
| `meteo-methodologist-ru` | область уровня, таксономия ошибок, правила, пакет заданий, справочник | `.agents/skills/russian-synoptic-acceptance`, `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md`, `docs/09_SOURCE_POLICY.md` |
| `meteo-verifier` | независимое воспроизведение каждого эталона | тот же навык, без доступа к выводам методиста до своей проверки |
| `live-kn01-engineer` | кодек, генератор, банк телеграмм | `.agents/skills/live-kn01`, навыки `tdd-workflow`, `tdd` |
| `gameplay-balance-designer` | дизайн смен, освоение, допуск, тексты наставника | навыки `design:ux-copy`, `design:user-research` |
| `art-director` | палитра, ключевые кадры, финальная художественная приёмка | `.agents/skills/pixel-art-direction`, навык `design:design-critique` |
| `pixel-asset-designer` | все растры мира, фауны, NPC, наград, эффектов | `.agents/skills/pixel-art-direction`, `docs/design/sprites/GENERATION_SERIES_CONTRACT.md` |
| `pixel-art-quality-reviewer` | техническая приёмка растров | `tools/validate_pixel_art.py`, `docs/design/sprites/PIXEL_ART_VALIDATION_WORKFLOW.md` |
| `pixel-asset-pipeline-engineer` | манифесты, атласы, семантические ID, генерация токенов | `.agents/skills/pixel-asset-pipeline` |
| `game-runtime-webgl-engineer` | сцены Phaser, мост React↔Phaser, свет и подсветки | `.agents/skills/phaser-webgl-runtime`, агент `typescript-reviewer` для самопроверки до сдачи |
| `living-world-engineer` | расписания жизни, фауна, NPC, находки | `.agents/skills/living-world-browser` |
| `ui-pixel-designer` | дизайн-система, все React-экраны, адаптация | навыки `frontend-design`, `design:design-system`, `design:accessibility-review` |
| `audio-ambient-designer` | звуковая карта, новые звуки, подключение | `.agents/skills/ambient-audio`, `tools/validate_audio.py` |
| `identity-avatar-engineer` | серверная прогрессия, награды, тестовый ростер | навыки `tdd-workflow`, `backend-patterns` |
| `realtime-arena-engineer` | режимы смены на сервере | навык `tdd-workflow` |
| `web-performance-engineer` | бюджеты, профили, замеры | агент `performance-optimizer`, встроенный браузер |
| `ux-accessibility-reviewer` | вайрфреймы, тест трёх секунд, плейтест, доступность | навыки `design:accessibility-review`, `design:user-research` |
| `security-privacy-reviewer` | утечки ответов, ростер, лицензии звуков и данных | агент `security-reviewer`, навык `security-review` |
| `integration-release-engineer` | бейзлайн, e2e, визуальная регрессия, релиз | навыки `e2e-testing`, `e2e`, `verification-loop`, `gstack`, агент `e2e-runner` |

Агент-исполнитель может вызывать вспомогательные агенты (например, `code-reviewer`), но их вывод — **самопроверка**, а не приёмка. Приёмку дают только роли из `reviewers` задачи.

## 4. Цикл одной задачи

```text
1. --next показывает задачу; оркестратор назначает исполнителя роли owner
2. owner: status → in_progress (валидатор проверит зависимости)
3. owner читает spec, делает deliverables в своей зоне файлов
4. owner собирает evidence в docs/roadmap/kn01-aaa/evidence/<ID>/:
     скриншоты (4 раскладки), журналы тестов, отчёты валидаторов, видео ≤ 20 с для анимаций
5. owner: status → review, пишет handoff.md (что сделано, файлы, допущения, риски)
6. каждый reviewer пишет review-<роль>.md: проверенные критерии по одному, вердикт
7. reviewer добавляет запись в verified_by: {role, verdict, date, ref}
8. при вердикте rejected → status → in_progress, owner исправляет, цикл 4–7
9. когда все reviewers accepted → status → done; валидатор проверяет всё
```

### 4.1. Шаблон `handoff.md`

```text
# <ID> — <название>
Исполнитель (роль):
Изменённые файлы:
Что сделано по каждому критерию приёмки:
Доказательства (пути):
Допущения:
Нерешённые риски:
Требуемые проверяющие:
```

### 4.2. Шаблон `review-<роль>.md`

```text
# Проверка <ID> ролью <роль>
Дата:
Проверено независимо (как):
| Критерий | Результат | Доказательство |
Вердикт: accepted | rejected
Замечания:
```

## 5. Обязательные проверки перед `review`

```bash
python tools/validate_repo.py
python tools/validate_architecture.py
python tools/validate_brand.py
python tools/validate_pixel_art.py
python tools/validate_fonts.py
python tools/validate_harness_plan.py
pnpm typecheck
pnpm test:server
```

Задачи, меняющие интерфейс, прикладывают скриншоты 1920×1080, 1366×768, 844×390 и проектор; меняющие анимацию — видео и вариант уменьшенной анимации; меняющие мир — замер кадров/с.

## 6. Запреты

- править `assets/generated` руками;
- использовать живописные или фотореалистичные изображения в рабочем контуре;
- задавать цвет, кегль или гарнитуру вне токенов;
- придумывать правило КН-01 без `source_id`;
- передавать эталон ответа клиенту;
- добавлять новое приложение или пакет без ADR;
- отмечать задачу выполненной без доказательств;
- расширять область за пределы уровня КН-01.

## 7. Эскалация

Блокировка дольше одного цикла работы или спор проверяющего с исполнителем → `status: blocked` с причиной в `notes` → оркестратор собирает владельцев и проверяющих; методические споры решаются по `docs/09_SOURCE_POLICY.md` §3 и могут привести к разделению методического профиля, но не к «среднему» решению.
