## Что изменено

Кратко опишите изменение и проблему, которую оно решает.

## Agent ownership

- Task ID:
- Implementation owner agent:
- Provider/session: Codex / Claude Code / Gemini-Antigravity / other
- Required independent gates:
- Handoff: приложен / не требуется

- [ ] Owner выбран по `agents/registry.yaml` / `agents/tasks/FOUNDATION_OWNERSHIP.md`.
- [ ] Реализующий агент не является единственным reviewer собственного gated-изменения.

## Тип изменения

- [ ] Code
- [ ] Content
- [ ] Methodology
- [ ] Game design / balance
- [ ] UI / UX
- [ ] Art / pixel assets / animation
- [ ] Audio / ambient
- [ ] Documentation
- [ ] Infrastructure / CI

## Связанные issue / ADR

- Issue:
- ADR:

## Методика и источники

Если PR меняет учебный смысл:

- Method profile:
- Source ID / документ:
- Раздел / страница:
- Methodologist verdict:
- Independent verifier verdict:

- [ ] Учебный ответ не основан только на проектном предположении.
- [ ] Классическая методика, кафедральный вариант и актуальный норматив не смешаны.
- [ ] Для Ranked/Exam получен `METEO_ACCEPTED` по `agents/QUALITY_GATES.md`.

## Контент

- [ ] JSON/schema validation пройдена.
- [ ] ID уникальны.
- [ ] Реальные данные имеют provenance/rights.
- [ ] Synthetic drill явно маркирован.
- [ ] Published content не изменяется задним числом.

## Gameplay / Ranked

- [ ] Изменение не создаёт pay/grind-to-win.
- [ ] Правильность остаётся важнее скорости.
- [ ] Ranked normalization не нарушена.
- [ ] Эффект не искажает значение метеорологического термина.

## Realtime / Security

- [ ] Server authoritative model сохранена.
- [ ] Правильные ответы не раскрываются клиенту заранее.
- [ ] Reconnect/replay совместимость проверена или описана migration policy.
- [ ] Authorization/input validation учтены.
- [ ] Для roster/feed/public display изменений получен `SECURITY_ACCEPTED`.

## Art / Animation / Audio

- [ ] Визуал соответствует `PIXEL_ART_STYLE_GUIDE` и Living World System.
- [ ] Метеорологические цвета/символы не переопределены косметикой.
- [ ] Для значимых визуальных изменений получен `ART_ACCEPTED`.
- [ ] Для тяжёлых/фоновых анимаций получен `PERF_ACCEPTED`.
- [ ] Внешние audio/assets имеют URL, author, license, attribution/path/checksum; неизвестные права отсутствуют.

## UX / Accessibility

- [ ] Active task остаётся главным визуальным объектом.
- [ ] Mobile проверен.
- [ ] Projector проверен, если затронут Arena TV.
- [ ] Keyboard/focus path учтён.
- [ ] Смысл не передаётся только цветом/звуком.
- [ ] Reduced motion сохраняет функциональность.

## Тестирование

Опишите выполненные проверки.

- [ ] Unit
- [ ] Integration
- [ ] E2E
- [ ] Content validation
- [ ] Manual desktop
- [ ] Manual mobile
- [ ] Projector/kiosk
- [ ] Replay/realtime
- [ ] Performance profile

## Screenshots / replay / примеры

Добавьте при необходимости.

## Checklist

- [ ] Документация обновлена.
- [ ] CHANGELOG обновлён, если изменение заметно пользователю/разработчику.
- [ ] Acceptance criteria выполнены.
- [ ] Все blocking agent gates закрыты.
- [ ] Нет известных critical ambiguity.
- [ ] Integration/Release agent может воспроизвести результат.
