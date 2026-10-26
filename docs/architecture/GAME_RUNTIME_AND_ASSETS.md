# Игровой рабочий контур, WebGL и графические ресурсы

**Статус:** принято

## Граница рабочих контуров

```text
React application
├── DOM/CSS UI
├── map-engine (SVG/Canvas; meteorological geometry)
└── GameWorld mount
    └── @synopsis/world-engine
        └── Phaser 4 / WebGL
```

Phaser не является оболочкой всего приложения. Он отвечает за отрисовку и анимацию живого игрового мира; обычный интерфейс остаётся в React.

## Слои отрисовки мира

`L0 sky/stars → L1 clouds/sun/moon → L2 distant terrain/city → L3 campus architecture → L4 vegetation/lights/flags → L5 NPC/fauna → L6 interactables → L7 DOM/UI boundary → L8 short feedback FX`.

`world-engine` получает состояние мира и детерминированные зерна событий. Покадровая анимация выполняется локально. Сервер не передаёт координату каждой птицы на каждом кадре.

## Поток графических ресурсов

```text
Aseprite / Pixelorama
        ↓
assets/source + assets/manifests
        ↓
sprite-tools: lint / tags / pivots / bounds / palette / atlas metadata
        ↓
Tiled JSON scene references stable asset IDs
        ↓
AssetPack optimisation
        ↓
assets/generated
        ↓
Phaser loader
```

## Контракт пиксельной отрисовки

- для пиксельных текстур используется выборка ближайшего соседа;
- случайное сглаживание при масштабировании запрещено;
- частота смены кадров спрайта не зависит от частоты обновления экрана;
- движение, tween и камера могут обновляться с частотой экрана, а нарисованные кадры сохраняют намеренно более низкий ритм;
- огромные заранее отрисованные полноэкранные фоны не используются там, где достаточно переиспользуемых слоёв и масок;
- покадровое состояние не передаётся через React;
- шейдеры и фильтры допустимы только при сохранении пиксельной читаемости и бюджета производительности;
- режимы уменьшенной анимации и пониженной нагрузки являются обязательной частью рабочего контура.

## Владение файлами

- `assets/source` — редактируемые исходники;
- `assets/scenes` — исходники сцен Tiled;
- `assets/manifests` — семантические метаданные и происхождение;
- `assets/generated` — результат сборки;
- `tools/assets` — средства преобразования и проверки;
- `packages/world-engine` — Phaser/WebGL-контур живого мира.

Связанные материалы: решение по Phaser/WebGL в каталоге `docs/decisions/` и `docs/design/PIXEL_ASSET_PIPELINE.md`.
