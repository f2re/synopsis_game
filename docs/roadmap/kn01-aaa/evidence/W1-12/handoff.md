# W1-12 — Контракты данных уровня: LevelDefinition, ShiftDefinition, TaskTemplate, ProgressionState, события

Исполнитель (роль): `orchestrator`  
Дата: 2026-10-30  
Статус задачи: `review`

## Изменённые и созданные файлы:
- `packages/contracts/src/level.ts` — TypeScript-типы структуры уровня, смен и шаблонов задач без раскрытия эталонных ответов на клиенте.
- `packages/contracts/src/progression.ts` — типизация модели прогрессии, порогов допуска, журнала ошибок и структуры событий (`progression.unlocked`, `progression.reward_granted`, `shift.completed`).
- `content/schemas/level.schema.json` — JSON-схема структуры уровня для статической валидации.

## Что сделано по критериям приёмки:
1. **Изоляция эталонных ответов**:
   - Клиентские структуры данных не содержат полей правильного ответа (`correct_answer`, `solution`). Проверка ответов производится исключительно на сервере.
2. **Проверка схемы валидатором**:
   - Валидатор `python tools/validate_content_contracts.py` подтверждает соответствие всех уровней и задач схеме.
3. **Событийная модель**:
   - Типизированы все доменные события: `progression.unlocked`, `progression.reward_granted`, `shift.completed` с полным набором метаданных.

## Доказательства:
- Контракты: `packages/contracts/src/level.ts`, `packages/contracts/src/progression.ts`
- Схема: `content/schemas/level.schema.json`
- Проверка контрактов: `python tools/validate_content_contracts.py` — **PASS**.

## Допущения:
- Пакет contracts используется как общий источник типов между сервером и веб-клиентом.

## Нерешённые риски:
- Нет.

## Требуемые проверяющие:
- `integration-release-engineer`
- `security-privacy-reviewer`
