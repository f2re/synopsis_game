# HUB_MASTER_PRODUCTION — production-поток утверждённого главного экрана

## Канонический master

Новая композиция Hub не создаётся. Единственный утверждённый визуальный master:

- исходное имя: `image-gen-1(20261025-183207).png`;
- production path после импорта: `assets/source/environment/hub/master/hub_master_approved.png`;
- размер: `1672×941`;
- PNG RGB;
- SHA-256: `3efc212bdcd7eaaacac119d20cbd89f83ab62d3d9761aafd5abdacae5660a340`.

`design/pixel-art/01_hub.webp` — только preview/reference alias. Он не является production source.

## Порядок исполнения

### 1. art-director — issue #28

Ветка: `agent/art-director/hub-master-decomposition`.

Задача: не перерисовывать Hub, а заморозить композицию и подготовить production-карту L0..L7, static/dynamic split, light masks, anchors, semantic IDs и hit polygons.

Результат: `READY_FOR_PIXEL_ASSET_DESIGN`.

### 2. pixel-asset-designer — issue #24

Ветка: `agent/pixel-asset-designer/hub-master-production`.

Задача: по карте арт-директора изготовить рабочую подложку и отдельные production assets.

Критическое правило: самостоятельные слои и спрайты нельзя получать простой вырезкой/автосегментацией master. Каждый объект пересоздаётся по master как референсу, затем вручную доводятся края, тени, прозрачность и пиксельная сетка. Обратная сборка должна визуально воспроизводить master.

Результат: editable source + manifests + контрольный composite.

### 3. pixel-art-quality-reviewer — issue #31

Независимый composite/diff gate против master. Отличия допустимы только внутри заранее объявленных dynamic/UI masks.

### 4. pipeline/runtime — issue #29

Только после двух художественных PASS. Подключить production assets в Phaser/WebGL, сохранить fullscreen/cover, заменить процедурный `HubScene.drawWorld()` и добавить screenshot regression.

## Нельзя

- генерировать новый главный экран вместо утверждённого;
- менять композицию ради удобства реализации;
- использовать `480×270` как разрешение финальной графики — это logical coordinate space;
- оставлять `Phaser.Graphics` как пользовательский art Hub;
- принимать рваные crop-слои, halo и повреждённые тени;
- сливать production Hub в `main` без #28 → #24 → #31 → #29.
