# Отчёт по задаче W3-01: Новая сцена хаба в Phaser 4

## 1. Сводка задачи
- **ID задачи**: `W3-01`
- **Исполнитель**: `game-runtime-webgl-engineer`
- **Проверяющие**: `web-performance-engineer`, `art-director`
- **Зависимости**: `W2-21`, `W1-07`, `W1-08`
- **Спецификация**: `docs/roadmap/kn01-aaa/06_WORLD_ANIMATION_AUDIO.md#1-слои-хаба-480270`
- **Цель**: разработка новой архитектуры сцены хаба в Phaser 4 на слоях L0–L10 с целочисленным масштабированием, паспарту (включая 800×600), 6 фазами суток (включая Белые ночи Санкт-Петербурга), серверным мостом состояний зданий и модулями $\le 400$ строк на строгих токенах.

## 2. Результаты
1. **Реализация сцены**:
   - `packages/world-engine/src/scenes/hub/HubScene.ts` (170 строк $\le 400$).
   - `packages/world-engine/src/scenes/hub/HubBuildingLayer.ts` (139 строк $\le 400$).
   - `packages/world-engine/src/scenes/hub/HubTimeOfDay.ts` (126 строк $\le 400$).
   - `packages/world-engine/src/bridge/WorldBridge.ts` (88 строк $\le 400$).
   - `packages/world-engine/src/runtime/fitLogicalViewport.ts` (65 строк $\le 400$).
2. **Критерии приёмки**:
   - **Целое увеличение и паспарту**: проверено на всех разрешениях (800×600, 844×390, 1024×768, 1366×768, 1920×1080), 0% субпиксельного смазывания.
   - **Фазы суток**: расчёт по координатам станции 26063 (Санкт-Петербург: 59.93° с.ш., 30.31° в.д.) с режимом белых ночей и демонстрационным ускорением.
   - **Токены**: 100% цветов привязаны к `WORLD_PALETTE` и `UI_COLORS`.
   - **Серверный мост**: состояния зданий (`locked`, `available`, `active`, `just_unlocked`) обновляются через события `WorldBridge` без per-frame React ререндеров.
   - **Изоляция `hub_master_night`**: устаревший монолитный ассет полностью удалён из рабочего контура сцены.
3. **Свидетельства**:
   - Метрики: `docs/roadmap/kn01-aaa/evidence/W3-01/metrics.md`.
   - Скриншот паспарту: `docs/roadmap/kn01-aaa/evidence/W3-01/hub_scene_passepartout.png`.
   - Скриншот фаз суток: `docs/roadmap/kn01-aaa/evidence/W3-01/hub_phases_preview.png`.
