# Задачи игрового WebGL-контура и конвейера ресурсов

**Статус:** принято к реализации

| Задача | Исполнитель | Обязательная приёмка |
|---|---|---|
| ENGINE-001 Каркас Phaser-пакета и рабочего контура | `game-runtime-webgl-engineer` | `web-performance-engineer`, `integration-release-engineer` |
| ENGINE-002 Граница жизненного цикла React↔Phaser | `game-runtime-webgl-engineer` | `web-performance-engineer`, `ux-accessibility-reviewer` |
| ENGINE-003 Контракт пиксельного масштабирования и камеры | `game-runtime-webgl-engineer` | `art-director`, `web-performance-engineer` |
| ENGINE-004 Базовые сцены, слои, tween и анимация | `game-runtime-webgl-engineer` | `living-world-engineer`, `web-performance-engineer` |
| ENGINE-005 Политика фильтров, шейдеров и частиц | `game-runtime-webgl-engineer` | `art-director`, `web-performance-engineer` |
| ASSET-001 Дерево исходников, имена и схема манифеста | `pixel-asset-pipeline-engineer` | `pixel-asset-designer`, `art-director` |
| ASSET-002 Проверка sprite-tools и получение метаданных | `pixel-asset-pipeline-engineer` | `integration-release-engineer` |
| ASSET-003 Оптимизация и атласы AssetPack | `pixel-asset-pipeline-engineer` | `web-performance-engineer`, `integration-release-engineer` |
| ASSET-004 Контракт сцен Tiled | `pixel-asset-pipeline-engineer` | `game-runtime-webgl-engineer`, `living-world-engineer`, `art-director` |
| ASSET-005 Происхождение и воспроизводимость сборки | `pixel-asset-pipeline-engineer` | `integration-release-engineer` |
| ASSET-006 Эталонные визуальные и рабочие проверки | `integration-release-engineer` | `art-director`, `web-performance-engineer` |

Задачи `WORLD-*` используют эти основы `ENGINE-*`/`ASSET-*` и не должны создавать второй механизм отрисовки или второй конвейер ресурсов.
