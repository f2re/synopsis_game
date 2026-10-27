# W1-12 — Контракты данных уровня: LevelDefinition, ShiftDefinition, TaskTemplate, ProgressionState, события

Исполнитель (роль): orchestrator
Изменённые файлы:
- `packages/contracts/package.json`
- `packages/contracts/tsconfig.json`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/level.ts`
- `packages/contracts/src/progression.ts`
- `content/schemas/level.schema.json`
- `tools/validate_content_contracts.py`

Что сделано по каждому критерию приёмки:
1. **Ни одна клиентская схема не содержит эталон ответа**:
   `PublicTask`, `TaskSlot` и схема `level.schema.json` не содержат полей ответов. Валидатор `tools/validate_content_contracts.py` выполняет проверку на запрещённые ключи ответов.
2. **Схема проверяется validate_content_contracts.py**:
   В `tools/validate_content_contracts.py` добавлена проверка схемы и файлов уровней в каталоге `content/levels/`.
3. **События progression.unlocked, progression.reward_granted, shift.completed описаны с полями**:
   В `packages/contracts/src/progression.ts` типизированы все три доменных события с точным составом полей.

Доказательства (пути):
- `docs/roadmap/kn01-aaa/evidence/W1-12/validator-log.txt`
- `docs/roadmap/kn01-aaa/evidence/W1-12/report.md`

Допущения:
- Пакет `@synopsis/contracts` является чисто типизированным DTO-слоем без логики в рабочем контуре.

Нерешённые риски:
- Отсутствуют.

Требуемые проверяющие:
- `integration-release-engineer`
- `security-privacy-reviewer`
