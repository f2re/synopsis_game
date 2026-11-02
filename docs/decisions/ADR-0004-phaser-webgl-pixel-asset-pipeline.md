# ADR-0004: Phaser 4, WebGL-контур и конвейер пиксельных ресурсов

**Статус:** принято; **частично заменено ADR-0007 для Hub renderer**

> `ADR-0007-threejs-2-5d-pixel-renderer.md` заменяет только sprite-first/Tiled-first способ построения нового Hub. React/Phaser boundary, Phaser 4 как framework игрового контура, WebGL, разделение профессионального `map-engine`, правила воспроизводимой сборки ресурсов и pixel discipline остаются в силе.

## Решение

Рабочий контур живого мира в браузере строится на Phaser 4, первоначально зафиксированном на версии `4.2.1`, и встраивается внутрь React-приложения. Phaser отвечает за отрисовку мира и игровой цикл; React — за обычный интерфейс приложения. Профессиональный метеорологический `map-engine` остаётся отдельным SVG/Canvas-модулем и не переносится в Phaser только ради визуального единообразия.

Для 2D-пиксельной графики, legacy scenes, portraits, UI и иных raster assets производственный путь сохраняет Aseprite/Pixelorama, `assets/source`, manifests и reproducible packing. Канонический sprite pipeline больше не является обязательным способом построения нового Hub: для него действует ADR-0007 и контракт Three.js 2.5D renderer.

Точные версии графических инструментов хранятся в `config/art-toolchain.yaml`; runtime dependencies фиксируются package manager lockfile и соответствующими package manifests.

## Границы ответственности

`pixel-asset-designer` создаёт редактируемые 2D-исходники там, где raster asset остаётся правильным решением. `pixel-asset-pipeline-engineer` владеет воспроизводимым преобразованием и упаковкой. `game-runtime-webgl-engineer` владеет интеграцией Phaser/WebGL и нового Hub renderer. `living-world-engineer` владеет состоянием мира и фоновым поведением. `web-performance-engineer` независимо проверяет бюджеты и деградацию.

Производные ресурсы не редактируются вручную. Переход на новую основную версию Phaser или смена основного способа 3D/2.5D rendering требует явного архитектурного пересмотра.

## Последствия

Для 2D/legacy частей проекта сохраняется воспроизводимый путь «исходник → atlas/packed asset → Phaser». Для Hub canonical source of truth смещается к `HubWorldDefinition`, reusable/procedural geometry, GLB assets по необходимости, material states и pixel post-processing.

Это уменьшает комбинаторный рост сезонных, погодных, directional и progression raster variants, но добавляет Three.js renderer и 3D asset validation pipeline.

## Связанные решения

- [`ADR-0007 — Three.js 2.5D renderer для Hub`](ADR-0007-threejs-2-5d-pixel-renderer.md)
