# Отчёт по контрактам данных уровня (W1-12)

**Роль:** orchestrator  
**Дата:** 2026-10-26  
**Спецификация:** `docs/roadmap/kn01-aaa/03_LEVEL_KN01_DESIGN.md` §12

---

## 1. Состав контрактов

1. **`packages/contracts/src/level.ts`:**
   - `LevelDefinition`, `ShiftDefinition`, `TaskSlot`, `GameModeDefinition`, `RewardDefinition`;
   - `PublicTask` — контракт задачи для фронтенда без эталона ответа;
   - `TaskTemplate` — шаблон генерации заданий на сервере;
   - Запрет хранения ответов в клиентских DTO строго зафиксирован в типах.
2. **`packages/contracts/src/progression.ts`:**
   - `ProgressionState`, `ShiftCompletionRecord`, `ErrorJournalEntry`;
   - Доменные события:
     * `progression.unlocked`: поля `userId`, `unlockedId`, `kind` (`shift` | `mode` | `building` | `feature`), `timestamp`;
     * `progression.reward_granted`: поля `userId`, `rewardId`, `rewardType`, `sourceShiftId`, `timestamp`;
     * `shift.completed`: поля `userId`, `shiftId`, `mode`, `accuracy`, `correctTasks`, `totalTasks`, `durationSeconds`, `rewardsGranted`, `newUnlocks`, `timestamp`.
3. **`content/schemas/level.schema.json`:**
   - Стандартный JSON Schema (draft-07) манифест уровня;
   - Проверяется скриптом `tools/validate_content_contracts.py`.
