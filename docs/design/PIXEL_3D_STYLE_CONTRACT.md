# Pixel 3D style contract

**Статус:** принято

Этот документ фиксирует визуальный язык нового 2.5D renderer-а. Он не описывает gameplay architecture; его задача — не дать технически корректному Three.js renderer-у превратиться в обычную low-poly 3D игру с фильтром пикселизации.

## 1. Художественная цель

Нужен эффект намеренно созданного pixel-art мира, в котором 3D используется как производственный и пространственный инструмент.

Искомое впечатление:

- читаемая крупная silhouette;
- ограниченная палитра;
- дискретные световые ступени;
- стабильная сетка пикселя;
- минимальная текстурная детализация;
- controlled dithering;
- ограниченные контуры;
- sprite-like cadence персонажей;
- атмосферное освещение, fog и particles без фотореализма.

Не является целью:

- реалистичная PBR-картинка;
- voxel aesthetics;
- smooth cartoon/cel-shading без pixel discipline;
- «мыльное 3D, уменьшенное до низкого разрешения».

## 2. Reference principles

Визуальная система ориентируется на три принципа:

1. **HD-2D composition:** реальная пространственная сцена, свет, туман, глубина и particles;
2. **pixel-art discipline:** ограниченная палитра, крупные формы, ступенчатое освещение, осмысленный animation cadence;
3. **geometry lock:** состояния мира не меняют камеру и пространственную композицию.

## 3. Pixel grid

Default internal grid:

```text
320×180
```

Canonical logical frame:

```text
640×360
```

Каждый internal pixel при default profile соответствует 2×2 logical pixels.

Final upscale использует nearest-neighbor. Любой blur после final quantization запрещён.

## 4. Palette discipline

Цвет мира должен идти через canonical palette system.

Рекомендуемый бюджет:

- 24–48 базовых world colors;
- отдельные semantic groups для terrain, architecture, vegetation, water, characters, lights;
- UI palette может существовать отдельно.

Каждая semantic material family должна иметь согласованные shadow/midtone/light values.

Пример:

```text
roof.red.shadow
roof.red.mid
roof.red.light
roof.red.emissive
```

Arbitrary RGB color from imported GLB material не должен автоматически попадать в финальный кадр.

## 5. Light bands

Default: 3 light bands.

Допустимо 4 для объектов, где это доказанно повышает читаемость.

Плавный Lambert/PBR gradient должен quantize до ограниченного набора tonal steps до финальной palette mapping.

Важнее правильно выбранная normal/silhouette, чем мягкий realistic gradient.

## 6. Dithering

Default: ordered Bayer 4×4.

Dithering используется для:

- переходов света;
- fog gradients;
- wetness/reflection transitions;
- ограниченных sky/water gradients.

Dithering не должен покрывать каждый материал одинаковой шумовой сеткой.

Запрещено:

- random temporal noise;
- film grain поверх pixel grid;
- subpixel animated noise, создающий shimmer;
- dense dithering на лицах/малых персонажах без необходимости.

## 7. Edge policy

Контуры — вспомогательный инструмент.

Использовать:

- depth discontinuity;
- normal discontinuity;
- selective semantic accent для gameplay object.

Не использовать:

- black outline на каждой polygon edge;
- постоянный толстый toon outline;
- контур, который сильнее silhouette объекта.

Default edge thickness: 1 internal pixel.

## 8. Geometry style

Geometry должна быть low-complexity, но не обязательно low-poly в демонстративном смысле.

Требования:

- silhouette читается на 320×180;
- крупные плоскости предпочтительнее мелкой фасеточной сетки;
- roofline, window rhythm, entrance, mast/antenna silhouette должны считываться;
- мелкие элементы, исчезающие после downsample, не моделируются;
- repeated details реализуются instancing/procedural kit.

## 9. Architecture style

Здание должно считываться сначала как:

1. mass/volume;
2. roof silhouette;
3. entrance;
4. window rhythm;
5. distinctive landmark detail;
6. только затем мелкие props.

Текстуры не должны компенсировать слабую geometry silhouette.

## 10. Surface detail

Основные способы детализации по приоритету:

1. geometry break;
2. palette region;
3. vertex color;
4. small decal;
5. tiny indexed texture.

Large photographic/albedo textures не являются частью canonical style.

## 11. Characters

Персонаж оценивается на реальном игровом масштабе, а не в крупном Blender viewport.

Обязательная визуальная иерархия:

- head;
- torso;
- arms;
- legs;
- hairstyle/headgear;
- one major accessory or clothing silhouette.

Face detail минимален.

Animation cadence: 8–12 poses per second при render FPS 30/60.

Visual facing по умолчанию quantize до 8 направлений.

## 12. Vegetation

Дерево должно иметь:

- сильный trunk/crown silhouette;
- 2–4 крупных foliage masses вместо тысяч листьев;
- limited palette;
- минимум полупрозрачности;
- controlled wind deformation.

Сезон меняет прежде всего palette/density/snow state, а не topology каждого экземпляра.

## 13. Water

Water style:

- 3–4 tonal states;
- редкие pixel highlights;
- медленный scrolling pattern;
- small displacement;
- без realistic reflection pipeline по умолчанию.

Screen-space reflection не является обязательной технологией.

## 14. Rain and snow

Rain:

- длинные/короткие pixel streaks;
- low particle count относительно realistic rain;
- screen readability важнее density;
- wetness материала важнее количества капель.

Snow:

- крупные читаемые particles;
- ограниченная скорость;
- snow accumulation визуально отделена от падающего снега.

## 15. Fog and atmosphere

Fog должен поддерживать depth composition.

Allowed:

- depth fog;
- horizon haze;
- quantized atmospheric bands;
- sparse cloud planes/geometry.

Не допускается скрывать слабую композицию плотным full-screen overlay.

## 16. Day phases

Day phases не являются простым fullscreen tint.

Каждая фаза меняет согласованный набор:

- key light direction/intensity;
- ambient palette;
- sky/horizon palette;
- emissive response;
- fog color;
- optional stars/moon/sun;
- water highlight palette.

Geometry остаётся неизменной.

## 17. Weather material response

Material families обязаны иметь предсказуемую реакцию:

```text
stone    → wetness strong, snow medium
roof     → wetness medium, snow strong
vertical wall → wetness medium, snow low
foliage  → wetness low/medium, snow variable
metal    → selective highlight
```

Это предпочтительнее отдельных weather textures.

## 18. Building progression readability

State здания должен читаться без замены фасада целиком.

Допустимые каналы:

- emissive windows;
- entrance lighting;
- small semantic sign/decal;
- restrained outline/accent;
- local particle/effect;
- one added/removed prop where progression changes silhouette.

Запрещено превращать state в неограниченный набор отдельных full building renders.

## 19. UI boundary

Phaser/DOM UI композится после world pixel pipeline.

UI не обязан проходить через 320×180 renderer. Текст должен оставаться читаемым на физическом разрешении.

World-space labels допускаются только по отдельному UI contract.

## 20. Motion language

- camera normally static;
- ambient motion медленное и редкое;
- characters имеют stepped pose cadence;
- particles могут обновляться чаще;
- no constant screen shake;
- reduced-motion сохраняет состояние мира, но уменьшает secondary motion.

## 21. Visual acceptance matrix

Каждый vertical slice проверяется минимум в состояниях:

| Season | Time | Weather | Purpose |
|---|---|---|---|
| summer | day | clear | base readability |
| summer | night | clear | emissive/night palette |
| autumn | golden | overcast | palette/fog stress |
| winter | day | snow | accumulation |
| spring | dusk | rain | wetness/particles |
| any | any | fog | depth readability |

Во всех случаях Geometry Lock должен совпадать.

## 22. Failure conditions

Style review считается проваленным, если наблюдается хотя бы один системный дефект:

- сцена выглядит как обычный low-poly game с pixelation filter;
- материалы имеют uncontrolled RGB/PBR gradients;
- pixel grid плавает при resize/camera movement;
- dithering shimmer;
- characters выглядят слишком плавно и теряют sprite language;
- black outlines доминируют над формой;
- погода требует новых полноэкранных картинок;
- сезон меняет geometry/camera без gameplay причины;
- imported asset визуально выпадает из canonical palette.

## 23. Что использовать как art-direction references

Существующие утверждённые Hub Geometry Lock, season/weather batches и pixel-art references сохраняют ценность как визуальные эталоны:

- composition;
- silhouette;
- color relationships;
- atmospheric intent;
- weather intensity;
- seasonal cues.

Они не обязаны оставаться runtime layers после принятия 2.5D renderer-а.

## 24. Связанные документы

- `docs/architecture/HUB_2_5D_RENDERER_CONTRACT.md`
- `docs/architecture/CHARACTER_2_5D_ANIMATION_CONTRACT.md`
- `docs/design/PIXEL_ART_STYLE_GUIDE.md`
- `docs/design/HUB_VISUAL_ACCEPTANCE.md`
- `docs/roadmap/HUB_2_5D_MIGRATION.md`
