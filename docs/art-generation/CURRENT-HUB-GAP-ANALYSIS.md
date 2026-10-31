# Current Hub gap analysis — 2026-10-31

Основание: текущий рабочий Hub со статичным крупным geometry master, интерактивными labels поверх зданий и нижней навигацией.

## Что уже работает

- читается общий Петербург/Северо-Западный контекст;
- горизонт, вода, осенняя растительность и архитектурная масса дают правильное направление;
- зоны зданий уже можно адресовать интерактивно;
- foreground railing даёт потенциальный слой глубины.

## Почему экран пока ощущается мёртвым

1. Нет видимых людей и маршрутов — масштаб кампуса не подтверждён персонажами.
2. Шесть функциональных зон отличаются в основном текстовыми labels; сами здания недостаточно уникальны визуально.
3. Почти нет локальной анимации: радар, флюгер, шар, флаги, окна, вода, птицы, деревья не дают жизни.
4. Большая часть глубины запечена в geometry master; foreground/midground не работают как независимые слои.
5. Текущий кадр имеет сильную осеннюю палитру, но нет световых/погодных overlays, поэтому время и погода не ощущаются системными.
6. Не следует лечить это новым full-background art: это снова создаст дорогую статичную картинку и усложнит hit zones.

## Следующий production order

### P0 — BATCH-09: Hub character motion

Цель: за один проход добавить масштаб, жизнь и маршруты. Использовать принятые character masters и image-edit workflow. Не генерировать sprite sheets; каждый keyframe — отдельный PNG.

### P0 — BATCH-10: landmark identity overlays

Цель: каждое из шести зданий должно распознаваться без подписи. Это не новые здания, а прозрачные overlays, строго выровненные к geometry master. Текст не запекать.

### P1 — BATCH-11: ambient depth / weather layers

Цель: оживить небо, воду, окна, фонари и растительность независимыми слоями. Day/night/season должны менять свет, а не геометрию.

## Что сейчас НЕ генерировать

- новый полный Hub background;
- отдельные альтернативные здания с другой перспективой;
- labels с русским текстом как raster images;
- professional synoptic maps/фронты/изобары;
- полноценные sprite sheets одним запросом;
- day/night copies всей сцены;
- 10 объектов в одном contact sheet.

## Runtime stack после этих batch

```text
L0 sky/background from geometry master
L1 animated clouds / haze
L2 city + water base
L3 campus architecture base
L4 landmark identity overlays
L5 vegetation / flags / scientific props
L6 NPCs / player / animals
L7 foreground railing / foliage occluders
L8 local light/weather FX
L9 interaction labels/hit regions
L10 React UI
```

## Проверка визуальной готовности

После BATCH-09…11 на idle Hub за 10 секунд должны быть одновременно видны минимум:

- 2–4 NPC/животных в разных слоях;
- 3 независимых спокойных движения;
- минимум 4 здания, узнаваемых без текста;
- одно изменение света или воды;
- foreground occlusion хотя бы одного moving sprite;
- при этом ни один ambient asset не должен перекрывать интерактивный label/CTA.
