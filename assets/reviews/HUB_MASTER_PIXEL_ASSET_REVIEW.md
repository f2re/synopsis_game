# HUB MASTER — Pixel Asset Review

Status: **PASS**

## Что принято

Первый production Hub использует утверждённый master как цельную рабочую подложку и отдельный semantic/runtime overlay. Это специально выбрано вместо автоматической сегментации, которая ранее повреждала контуры, тени и соседние элементы.

Runtime-подложка:

- source master: 1672×941 PNG;
- runtime: 960×540 WebP;
- runtime bytes: 62 434;
- runtime SHA-256: `a1ac9abc8a4bc0e428040ef96f0f7c0a9117b0c3967b72c3b881782d0c8dfd08`;
- регистрация: origin `(0,0)`, полный canvas;
- масштабирование: scene-specific logical grid 960×540 + camera cover.

## Production elements

Отдельно от подложки реализованы:

- semantic hotspots всех основных зданий;
- semantic hotspots нижней навигации;
- hotspot профиля и шестерёнки;
- runtime hover/focus outline;
- runtime status notice;
- переход в Архив;
- событие `hub:start-shift`;
- событие `hub:session-menu`.

Их semantic IDs и координаты закреплены в `assets/scenes/hub/hub_master.scene.json`.

## Правило дальнейших спрайтов

Персонажи, птицы, флаги, облака, приборы, свет и вода могут быть вынесены в отдельные sprite families только как чисто пересозданные assets по master. До их готовности утверждённый base остаётся fallback, поэтому анимационная разработка не может ухудшить стартовый экран.

В `assets/generated` вручную ничего не редактируется. Runtime asset собирается из канонического модуля `packages/world-engine/src/assets/hub/masterAsset.ts`.

Итог: **PASS**.
