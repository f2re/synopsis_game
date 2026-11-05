# SCREEN-V2 — исполнение этапов в основной ветке

**Дата:** 2026-11-05  
**Статус:** распределение задач зафиксировано в `main`; выполнение и независимая приёмка не заявлены.  
**Координатор:** `orchestrator` (Claude Code; резерв Codex).  
**Главная задача:** [#107](https://github.com/f2re/synopsis_game/issues/107).  
**Референс:** [SCREEN_REFERENCE_SET_V2_20261105.md](../../docs/design/SCREEN_REFERENCE_SET_V2_20261105.md).  
**Первый вертикальный срез:** [HUB_V2_FIRST_SCREEN_20261105.md](../../docs/roadmap/HUB_V2_FIRST_SCREEN_20261105.md).

## Правила маршрутизации

Каждая задача назначается **ровно одному внутреннему владельцу** из `agents/registry.yaml`; специалисты из `agents/EXTERNAL_SPECIALISTS_ROUTING.md` допускаются как консультанты. Независимые принимающие не могут совпадать с исполнителем. Вызов/запуск Claude, Codex или Gemini нельзя считать состоявшимся только по наличию этого файла или GitHub Issue. Перед сдачей требуется лог/PR/коммит и подтверждённые проверки.

Изменения по решению владельца проекта интегрируются в `main` **только после прохождения применимых gate**; безусловная публикация непроверенного рендера запрещена. Параллельная работа допускается в временных `agent/<role>/<task>` ветках; финальная запись результата и контрактов — в `main`. На момент подготовки плана `main` использует Phaser 4.2.1, а Three.js 2.5D остаётся экспериментом PR #95 с `legacy2d` по умолчанию. Это не решение о миграции движка.

## Таблица передачи

| Очередь | ID задачи и цель | Единственный владелец | Независимая приёмка | Зависимость / GitHub |
|---|---|---|---|---|
| P0-A | ASSET-HUB-AUDIT: проверить отсутствующие runtime PNG, целостность WebP, SHA и источник каждого слоя | `pixel-asset-pipeline-engineer` | `integration-release-engineer`, `art-director` | #24, #76; `node tools/assets/scripts/audit-hub-runtime.mjs` |
| P0-B | ART-V2-REFS: импортировать 6 исходных PNG и выполнить строгую проверку hash/dimensions | `art-director` | `pixel-art-quality-reviewer` | #107; `python tools/validate_visual_refs_v2.py` |
| P1 | HUB-GEOMETRY: утвердить положение 8 semantic POI, camera cover/safe crop, единый источник world bounds/hit polygons; legacy 480×270 не смешивать с 2.5D 640×360 | `game-runtime-webgl-engineer` | `web-performance-engineer`, `art-director`, `ux-accessibility-reviewer` | #77, #91, #93, #104 |
| P2-A | HUB-ASSETS: художественный master → редактируемые источники, фасады/слои/маски и атласы; без процедурной подмены композиции | `pixel-asset-designer` | `pixel-art-quality-reviewer`, `art-director` | #28 → #24 → #31, #73 |
| P2-B | HUB-RENDER: подключить принятые слои, геометрию и день/ночь; сохранить Phaser lifecycle и `legacy2d` | `game-runtime-webgl-engineer` | `web-performance-engineer`, `integration-release-engineer` | #29, #82, #85, #94, PR #95 |
| P3 | HUB-UI: главный CTA «Начать смену», compact HUD, диалог локации, динамический статус блокировки; без перекрытия архитектуры | `ui-pixel-designer` | `art-director`, `ux-accessibility-reviewer` | #107; после P1 |
| P4 | HUB-ACCEPTANCE: реальные browser screenshots, desktop/mobile, управление с клавиатуры, отказ GPU, reduced motion, pixel diff | `integration-release-engineer` | `art-director`, `web-performance-engineer`, `ux-accessibility-reviewer` | #31, #85, #94; после P0–P3 |
| P5 | SCREEN-BLITZ: интерактивная SVG/Canvas синоптическая карта и новая оболочка смены | `game-runtime-webgl-engineer` (только интеграция; геометрия карты остаётся React feature) | `meteo-methodologist-ru`, `meteo-verifier`, `ux-accessibility-reviewer` | После P4; не вводить отдельный map-engine пакет |
| P6 | SCREEN-PROGRESSION: связать существующие `ProgressionService`, API и реальные результаты серверной проверки | `identity-avatar-engineer` | `security-privacy-reviewer`, `integration-release-engineer` | После P4; не дублировать сервис |
| P7 | SCREEN-INVENTORY: Paper Doll / 6 слотов и существующий `AvatarEditor`; раздельные косметика и игровые модификаторы | `identity-avatar-engineer` | `art-director`, `ux-accessibility-reviewer` | После P4; #74, #75 |
| P8 | SCREEN-DUEL: авторитетные серверные ходы, PvP по сценарию и живой журнал; научные ответы только из версионированных правил | `realtime-arena-engineer` | `security-privacy-reviewer`, `meteo-methodologist-ru`, `meteo-verifier` | После P5/P6; до турнира |
| P9 | SCREEN-TOURNAMENT: режим зрителя `/arena-tv` с публичными данными без приватных сведений | `realtime-arena-engineer` | `security-privacy-reviewer`, `integration-release-engineer`, `art-director` | После P8 |
| SEC-01 | Прогресс и награды: запрещено принимать `isCorrect` из тела клиента как проверенный результат | `identity-avatar-engineer` | `security-privacy-reviewer`, `integration-release-engineer` | Блокирует рейтинги и награды P6/P8 |

**Дисциплинарная оговорка:** для P5 автором требований и принимающим научной геометрии являются `meteo-methodologist-ru` и `meteo-verifier`; реализация самого SVG/Canvas должна быть выделена в дочернюю задачу с владельцем из действующего реестра (новую роль/пакет без ADR не вводить).

## Минимальная доказательная база для закрытия

1. Коммит или PR с перечнем файлов и идентификатором задачи, подтверждение владельца роли.
2. Выполненные команды и журнал проверки (отдельно backend, TypeScript, визуальный smoke, исполнение в браузере).
3. Бинарные исходные референсы с проверенным SHA-256 и происхождением; не заменять их миниатюрами.
4. Для каждого нового экранного состояния — снимок **из браузера**, а не нарисованный макет.
5. Подтверждение независимых принимающих ролей; `ART_ACCEPTED` и real-device GPU `PASS` не выводить из успешного CI.
6. Явная запись блокеров, версии renderer и `legacy2d` fallback.

## Обнаруженные блокеры (не закрыты)

- В `HubScene.ts` есть ссылки на `/hub/layers/*.png`, которых нет в дереве `apps/web/public/hub` на момент аудита. Скрипт `audit-hub-runtime.mjs` диагностирует этот разрыв.
- Base64 мастер-текстуры собран из `runtimePart01..06.ts`; аномальная длина `runtimePart04.ts` требует проверки исходного SHA и полного RIFF-контейнера, **без угадывания повреждённого байта**.
- `locationRegistry.ts` и `HubBuildingLayer.ts` содержат разные координатные модели; нельзя подменять одну другой простым масштабом без геометрической приёмки.
- `HubTimeOfDay.ts` использует часовые интервалы вместо положения Солнца — необходимо отдельное решение `living-world-engineer` с географической и астрономической проверкой.
- `/api/progression/shift` принимает клиентские результаты. До серверной верификации такая запись не должна считаться основанием для рейтингов, экзамена и соревновательных наград.
- 2.5D PR #95 ещё не прошёл обязательные #85/#91/#93/#94; менять default renderer нельзя.

## Инструкция оркестратору (Codex / Claude / Antigravity)

1. Открыть `AGENTS.md`, `agents/registry.yaml` и этот файл.
2. Взять первую незаблокированную задачу из таблицы; проверить открытые Issues, чтобы не дублировать их.
3. Передать конкретные файлы, контракт и критерии выполнения назначенному внутреннему владельцу в соответствующем агентском клиенте. Записать ссылку на запуск/артефакт в Issue.
4. Передать коммит/PR независимым рецензентам. При FAIL вернуть владельцу без `ART_ACCEPTED`.
5. После подтверждённых gate включить изменения в `main`, затем приложить браузерные доказательства и зафиксировать состояние выполнения.

## Текущий исполнительский пакет P0 (05.11.2026)

- **Код технического слоя:** [PR #118](https://github.com/f2re/synopsis_game/pull/118), владелец `game-runtime-webgl-engineer`. Отдельная camera-cover работает только с `?hubCover=1`; ассеты со статусом `PENDING` не грузятся до независимой приёмки. Это инженерная подготовка, а не сданный рисунок.
- **Артовые ресурсы и упаковка:** [#109](https://github.com/f2re/synopsis_game/issues/109), `pixel-asset-pipeline-engineer` (Codex). Обязательный исходный пакет — шесть неизменённых R01–R06 PNG; `artAcceptance=PASS` не проставлять до проверки SHA и независимого ревью.
- **Художественная приёмка:** [#107](https://github.com/f2re/synopsis_game/issues/107), `art-director` (Antigravity/Gemini), независимый `pixel-art-quality-reviewer` [#31](https://github.com/f2re/synopsis_game/issues/31).
- **Геометрия и доступность:** `living-world-engineer` [#104](https://github.com/f2re/synopsis_game/issues/104) (Codex), консультанты `level-designer` и `world-geometry-specialist`. При 390×844 camera-cover открывает только центральную часть мира; до UX-решения этот режим не становится основным.
- **Независимая интеграция:** `integration-release-engineer` [#85](https://github.com/f2re/synopsis_game/issues/85) (Codex), `web-performance-engineer` для замеров real-device GPU [#94](https://github.com/f2re/synopsis_game/issues/94).
- **Оркестратор:** `orchestrator` (Claude Code), проверяет последовательность #107 → #109 → #31 → #85/#94 и фиксирует SHA/логи/проверяющих. Нельзя открывать очередной этап на основании одной сгенерированной картинки или зелёной сборки.

Нативные роли уже находятся в `.codex/agents/`, `.claude/agents/`, `.agents/agents/`; полный список навыков — в `agents/capability-catalog.json`. Это файловые задания и GitHub-передачи: **не утверждается, что подключение реально запустило Claude, Codex или Antigravity**. Ссылка на execution-session/PR-review обязательна для перевода любой карточки в `IN_PROGRESS` или `PASS`.
