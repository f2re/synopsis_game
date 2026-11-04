# Проверка агентской системы 26063 — 4 ноября 2026

**Статус:** структурная интеграция проверена; реальное выполнение внутри трёх AI-клиентов не подтверждено.

## Объём и доказательства

Исходный коммит `main`: `3a8a75805cfd671c3b55643ece638632bcc0a2aa`. Обнаружено 19 внутренних ролей, 5 внешних помощников, 23 навыка. Для всех 24 ролей имеются конфигурации Claude Code, Antigravity и Codex; для всех навыков — Claude-адаптеры.

**Структурная проверка** означает проверку путей, метаданных, владельцев, навыков, внешнего происхождения и независимых проверяющих. **Проверка выполнения** требует реального AI-клиента, журнала инструментов и результата безопасной задачи. Первая не заменяет вторую.

## Внутренние роли (19)

| Роль | Предпочтительная система | Назначенные навыки | Доказательство |
| --- | --- | --- | --- |
| `orchestrator` | `claude-code` | `agent-handoff-gate`, `release-evidence` | Структура есть; запуск не проверен |
| `meteo-methodologist-ru` | `claude-code` | `russian-synoptic-acceptance`, `gameplay-determinism` | Структура есть; запуск не проверен |
| `meteo-verifier` | `antigravity-gemini` | `russian-synoptic-acceptance`, `gameplay-determinism` | Структура есть; запуск не проверен |
| `live-kn01-engineer` | `codex` | `live-kn01`, `realtime-server-authority` | Структура есть; запуск не проверен |
| `art-director` | `antigravity-gemini` | `pixel-art-direction`, `pixel-art-qa`, `threejs-postprocessing` | Структура есть; запуск не проверен |
| `pixel-asset-designer` | `antigravity-gemini` | `pixel-art-direction`, `pixel-art-qa`, `threejs-assets` | Структура есть; запуск не проверен |
| `pixel-art-quality-reviewer` | `codex` | `pixel-art-qa`, `pixel-asset-pipeline` | Структура есть; запуск не проверен |
| `pixel-asset-pipeline-engineer` | `codex` | `pixel-asset-pipeline`, `threejs-assets`, `pixel-art-qa` | Структура есть; запуск не проверен |
| `game-runtime-webgl-engineer` | `codex` | `phaser-webgl-runtime`, `phaser4-scenes`, `phaser4-webgl`, `threejs-scene`, `threejs-postprocessing` | Структура есть; запуск не проверен |
| `living-world-engineer` | `codex` | `living-world-browser`, `hub-nav-geometry`, `threejs-geometry` | Структура есть; запуск не проверен |
| `audio-ambient-designer` | `claude-code` | `ambient-audio` | Структура есть; запуск не проверен |
| `web-performance-engineer` | `codex` | `threejs-performance`, `release-evidence` | Структура есть; запуск не проверен |
| `realtime-arena-engineer` | `codex` | `realtime-server-authority`, `gameplay-determinism` | Структура есть; запуск не проверен |
| `identity-avatar-engineer` | `codex` | `threejs-animation`, `ui-accessibility`, `security-privacy-review` | Структура есть; запуск не проверен |
| `gameplay-balance-designer` | `claude-code` | `gameplay-determinism` | Структура есть; запуск не проверен |
| `ux-accessibility-reviewer` | `claude-code` | `ui-accessibility`, `pixel-art-qa` | Структура есть; запуск не проверен |
| `security-privacy-reviewer` | `claude-code` | `security-privacy-review` | Структура есть; запуск не проверен |
| `integration-release-engineer` | `codex` | `release-evidence`, `agent-handoff-gate` | Структура есть; запуск не проверен |
| `ui-pixel-designer` | `antigravity-gemini` | `ui-accessibility`, `pixel-art-direction`, `pixel-art-qa` | Структура есть; запуск не проверен |

Каждая роль имеет основной файл `agents/roles/<id>.md`, две Markdown-конфигурации в `.agents/agents` и `.claude/agents`, а также TOML-конфигурацию `.codex/agents`. Эти файлы позволяют обнаружить роль, но сами по себе не доказывают, что модель запускалась.

## Внешние помощники (5)

| Помощник | Владелец внутри проекта | Источник | Доказательство |
| --- | --- | --- | --- |
| `threejs-specialist` | `game-runtime-webgl-engineer` | `bullish0x/GameStudio`, SHA `52cd3e4b2fef` | Инструкция есть; запуск не проверен |
| `phaser-specialist` | `game-runtime-webgl-engineer` | `bullish0x/GameStudio`, SHA `a35ac61543e4` | Инструкция есть; запуск не проверен |
| `world-geometry-specialist` | `living-world-engineer` | `bullish0x/GameStudio`, SHA `e5f3460ea9e6` | Инструкция есть; запуск не проверен |
| `technical-artist` | `pixel-asset-pipeline-engineer` | `bullish0x/GameStudio`, SHA `fb2b2c97fb1b` | Инструкция есть; запуск не проверен |
| `webgl-perf-auditor` | `web-performance-engineer` | `skinnye/3d-web-pack`, SHA `f0dc97a1b84d` | Инструкция есть; запуск не проверен |

Это проектные адаптеры, не автоматически установленные внешние программы. Они обязаны передавать работу внутреннему владельцу и не могут независимо утвердить собственные изменения.

## Навыки (23)

| Навык | Назначенные роли | Состояние |
| --- | --- | --- |
| `agent-handoff-gate` | `orchestrator`, `integration-release-engineer` | Адаптация; запуск не проверен |
| `ambient-audio` | `audio-ambient-designer` | Внутренний; запуск не проверен |
| `gameplay-determinism` | `meteo-methodologist-ru`, `meteo-verifier`, `realtime-arena-engineer`, `gameplay-balance-designer` | Адаптация; запуск не проверен |
| `hub-nav-geometry` | `living-world-engineer` | Адаптация; требуется H3D-ветка; запуск не проверен |
| `live-kn01` | `live-kn01-engineer` | Внутренний; запуск не проверен |
| `living-world-browser` | `living-world-engineer` | Внутренний; запуск не проверен |
| `phaser-webgl-runtime` | `game-runtime-webgl-engineer` | Внутренний; запуск не проверен |
| `phaser4-scenes` | `game-runtime-webgl-engineer` | Адаптация; запуск не проверен |
| `phaser4-webgl` | `game-runtime-webgl-engineer` | Адаптация; запуск не проверен |
| `pixel-art-direction` | `art-director`, `pixel-asset-designer`, `ui-pixel-designer` | Внутренний; запуск не проверен |
| `pixel-art-qa` | `art-director`, `pixel-asset-designer`, `pixel-art-quality-reviewer`, `pixel-asset-pipeline-engineer`, `ux-accessibility-reviewer`, `ui-pixel-designer` | Адаптация; запуск не проверен |
| `pixel-asset-pipeline` | `pixel-art-quality-reviewer`, `pixel-asset-pipeline-engineer` | Внутренний; запуск не проверен |
| `realtime-server-authority` | `live-kn01-engineer`, `realtime-arena-engineer` | Адаптация; запуск не проверен |
| `release-evidence` | `orchestrator`, `web-performance-engineer`, `integration-release-engineer` | Адаптация; запуск не проверен |
| `russian-synoptic-acceptance` | `meteo-methodologist-ru`, `meteo-verifier` | Внутренний; запуск не проверен |
| `security-privacy-review` | `identity-avatar-engineer`, `security-privacy-reviewer` | Адаптация; запуск не проверен |
| `threejs-animation` | `identity-avatar-engineer` | Проверяемый импорт; запуск не проверен |
| `threejs-assets` | `pixel-asset-designer`, `pixel-asset-pipeline-engineer` | Проверяемый импорт; запуск не проверен |
| `threejs-geometry` | `living-world-engineer` | Проверяемый импорт; запуск не проверен |
| `threejs-performance` | `web-performance-engineer` | Проверяемый импорт; запуск не проверен |
| `threejs-postprocessing` | `art-director`, `game-runtime-webgl-engineer` | Проверяемый импорт; запуск не проверен |
| `threejs-scene` | `game-runtime-webgl-engineer` | Проверяемый импорт; запуск не проверен |
| `ui-accessibility` | `identity-avatar-engineer`, `ux-accessibility-reviewer`, `ui-pixel-designer` | Адаптация; запуск не проверен |

Основной источник навыка: `.agents/skills/<id>/SKILL.md`. Для Claude Code доступен адаптер `.claude/skills/<id>/SKILL.md`. Импортированные материалы Three.js сверяются с зафиксированным SHA и лицензионными уведомлениями.

## Исправления по результатам проверки

1. Уточнены условия выбора всех 24 агентов и 23 навыков Claude Code. У каждого внешнего помощника есть отдельная специализированная процедура.
2. В конфигурациях Antigravity явно задано `subagent: true`, а внешние помощники не могут быть выбраны основным агентом.
3. Навык `hub-nav-geometry` теперь требует выбрать конкретную экспериментальную ветку. Отсутствующие в `main` файлы H3D больше нельзя считать существующими.
4. Роли КН-01 и аватара не предлагают создавать отдельные пакеты вне утверждённой архитектуры без ADR.
5. В задачах художественной приёмки различаются старое разрешение 480×270 и экспериментальный Hub 640×360.
6. Дополнен `tools/validate_agent_kit.py`: проверяются пригодность описаний, наличие специализированных процедур и распределение всех навыков между ролями.

## Необходимые живые испытания

| Система | Действие | Условие успешного прохождения |
| --- | --- | --- |
| Claude Code | Открыть проект, увидеть список агентов и навыков; делегировать `threejs-specialist` исследование без записи | 24 роли и 23 навыка видны; есть журнал и верно выбран владелец |
| Antigravity | Проверить Customizations и `/agents`; выполнить безопасное подзадание | Все профили обнаружены; зарегистрирован результат подагента |
| Codex | Проверить пользовательские профили и навыки; делегировать чтение конкретного модуля | 24 TOML-профиля и 23 навыка видны; есть отчёт и артефакт |
| Независимая приёмка | Отдельно запустить исполнителя и проверяющего для малой задачи | Два независимых подтверждаемых результата |
| 2.5D | Выбрать существующую H3D-ветку и проверить навигацию | Подтверждены файлы, маршруты, контуры и результаты тестов |

Без журналов действительных запусков пункты этой таблицы не могут считаться пройденными.

## Остаточные ограничения и риски

- На момент проверки ветка `main` не была защищена обязательной проверкой PR. Машинная проверка не может заменить внешние правила защиты GitHub.
- Назначение навыка не гарантирует его автоматическое применение моделью в каждом запросе.
- Отдельный реальный запуск Claude Code, Antigravity и Codex не выполнен в этой среде, поскольку соответствующие клиентские программы и авторизация здесь недоступны.
- WebGL на целевом оборудовании, независимая художественная приёмка и методическая корректность ответов проверяются отдельными процедурами.
- 2.5D остаётся в экспериментальных PR; перенос их исходников в `main` не является задачей этой ревизии.

**Заключение:** конфигурации, владельцы и навыки структурно согласованы. Эксплуатационная готовность каждого агента остаётся неподтверждённой до живых испытаний. Основной тест: `python tools/validate_agent_kit.py --json`.
