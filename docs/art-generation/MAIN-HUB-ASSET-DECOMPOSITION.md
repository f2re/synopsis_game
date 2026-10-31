# Главный экран Hub — декомпозиция на production-ассеты

## Цель

Текущий Hub нельзя лечить ещё одной цельной картинкой. Экран собирается из независимых слоёв, чтобы:

- фон занимал весь viewport без растягивания;
- здания и интерактивные зоны не были запечены в один bitmap;
- можно было менять время суток, сезон и погоду;
- NPC и объекты корректно перекрывались передним планом;
- hotspot labels и UI оставались живыми DOM/React/Phaser элементами;
- новые изображения можно было заменять по одному.

## Два референса с разными ролями

1. **Текущий рабочий скриншот** — только геометрия/расположение: горизонт, вода, кампус, положение зон и camera framing.
2. **Утверждённый художественный Hub reference** — только стиль: современный уютный pixel-art, крупные читаемые кластеры, тёплые окна, холодное небо, выразительные здания, насыщенная, но контролируемая детализация.

Нельзя копировать из текущего рабочего скриншота его рыхлую/размытую пикселизацию и фотографическую текстуру.

## Full-screen contract

### Авторский canvas

- logical master: **640×360 px, 16:9**;
- центральная safe-zone: **520×292 px**;
- 60 px горизонтального и 34 px вертикального overscan вокруг safe-zone;
- все ключевые здания, входы, дороги и интерактивные точки находятся внутри safe-zone;
- края кадра могут безопасно обрезаться при `cover`.

### Runtime

- Hub занимает `100vw × 100vh` внутри игрового viewport;
- изображение **никогда не растягивается независимо по X/Y**;
- масштаб сохраняет aspect ratio;
- режим: `cover`, crop по краям;
- nearest-neighbour sampling / `image-rendering: pixelated`;
- при экстремальном aspect ratio разрешён контролируемый crop, но не distortion;
- UI располагается поверх сцены и не запекается в фон.

## Слои

```text
L00 sky base
L01 far clouds / sun / moon / atmospheric haze
L02 distant city silhouette and lights
L03 water + reflections
L04 campus ground / terraces / roads
L05 architecture base modules
L06 landmark identity overlays
L07 props / lamps / vegetation
L08 NPC / player / animals
L09 foreground railing / foliage occluders
L10 weather / local light FX
L11 hotspot labels / interaction hints
L12 top HUD / bottom navigation / modal UI
```

## Что генерируется, а что нет

### Генерируется

- sky/background layers;
- city/water layers;
- отдельные building modules;
- входы, купола, радары, стеклянные павильоны;
- деревья, кусты, фонари, ограждения;
- NPC/animals/props;
- light/weather masks;
- 9-slice UI frames and icon art.

### Не генерируется как raster art

- русские подписи зданий;
- числа уровня;
- состояние игрока;
- прогресс-бары;
- live weather/map data;
- synoptic fronts/isobars;
- hit boxes;
- кнопочные надписи;
- clickable regions.

## Генерационные пакеты

- `BATCH-12-HUB-FULLSCREEN-BACKGROUND.md` — дальний фон и полноэкранная геометрическая основа;
- `BATCH-13-HUB-ARCHITECTURE.md` — здания и интерактивные архитектурные модули;
- `BATCH-14-HUB-FOREGROUND-GAMEPLAY.md` — передний план, растительность, приборы и игровые объекты;
- `BATCH-15-HUB-UI-CHROME.md` — UI панели, hotspot plates и кнопочные состояния без текста.

## Общий anti-collage contract

Каждый job запускается отдельно.

**1 prompt = 1 generation = 1 PNG = 1 semantic asset.**

Запрещено:

- contact sheet;
- sprite sheet в одной генерации;
- grid 2×5/5×2;
- набор вариантов;
- несколько объектов, если job не описывает единый объектный комплекс;
- текст внутри изображения;
- checkerboard вместо настоящей alpha transparency.

## Production acceptance

Главный экран считается художественно завершённым только если:

- сцена заполняет весь viewport без полос и без растяжения;
- минимум 6 функциональных зон различимы без текстовых labels;
- минимум 3 глубинных плана читаются визуально;
- foreground действительно перекрывает moving sprites;
- background не содержит baked UI;
- при выключении UI Hub остаётся полноценной игровой сценой;
- day/dusk/night меняются светом и масками, а не заменой всей геометрии;
- все отдельно сгенерированные модули совпадают по перспективе, масштабу и пиксельному языку.
