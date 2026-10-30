# Перегенерация графики через ChatGPT Images

**Статус:** рабочий production-план  
**Ветка:** `art/chatgpt-asset-regeneration-plan`  
**Эталон:** `design/pixel-art/01_hub.webp`, `02_blitz.webp`, `04_inventory.webp` и утверждённый `docs/design/PIXEL_ART_STYLE_GUIDE.md`.

## 1. Почему текущие спрайты визуально разваливаются

Проблема не сводится к «плохим промптам».

1. `apps/web/src/features/avatar/AvatarPreview.tsx` сейчас рисует героя, одежду, часть окружения и анимацию вручную через `fillRect()` на холсте 32×48. Хорошие PNG из `public/assets/items` поэтому почти не определяют итоговый вид игрового персонажа.
2. В дереве ассетов смешаны хорошие крупные референсы, маленькие заглушки/кандидаты, отклонённые варианты и runtime-копии. У части волос/спутников runtime PNG имеют размер порядка сотен байт — это типичный признак примитивного placeholder-арта.
3. Генерация отдельных вещей без общего силуэта приводит к дрейфу плеч, талии, рук, обуви, масштаба головы и точки опоры. Такие картинки нельзя честно сложить слоями.
4. Большие сцены, world sprites, портреты, inventory icons и UI требуют разных логических сеток и разной плотности деталей. Один универсальный промпт под все классы запрещён.
5. Нельзя просить генератор «сделать 10 спрайтов одним изображением». Для production используется **10 заданий = 10 последовательных генераций = 10 отдельных файлов**.

## 2. Что считаем художественным эталоном

Целевой язык — современная high-quality pixel illustration, а не намеренно грубая 8-bit стилизация:

- крупные читаемые силуэты;
- осмысленные пиксельные кластеры без одиночного шума;
- холодный сине-графитовый внешний свет + тёплый янтарный свет рабочих помещений;
- глубокие navy/cyan тени, локальные коралловые/фиолетовые оттенки заката, янтарные акценты;
- материалы читаются: стекло, металл, дерево, бумага, ткань;
- контур не универсально чёрный: он темнее локального материала и меняется по освещению;
- персонаж узнаётся по силуэту, причёске, одежде, жесту и цветовой идентичности;
- в обитаемой сцене есть следы работы людей, но декоративная плотность не конкурирует с текущей задачей;
- текст, цифры, кнопки, русские подписи и профессиональная метеорологическая геометрия не запекаются в AI-картинки — это DOM/SVG/Canvas.

Референсные кадры пользователя имеют один и тот же визуальный каркас: тёмная navy UI-рама, яркий amber CTA, прохладный фон и локальное тёплое освещение. Это должно быть общей системой, а не случайной палитрой каждого ассета.

## 3. Классы ассетов и финальные технические размеры

| Класс | Финальная логическая сетка | Альфа | Якорь | Примечание |
|---|---:|---|---|---|
| `world_character` | 32×48 на кадр | да | bottom-center | направления и анимации собираются после утверждения базового силуэта |
| `companion_sprite` | 48×48 на кадр | да | bottom-center | отдельный объект, без подставки и фона |
| `dialogue_portrait` | 256×320 | да | bottom-center | допускает больше кластеров и оттенков |
| `profile_portrait` | 160×160 | да | center | для профиля/HUD |
| `prop_sprite` | 24–96 по классу | да | center или bottom-center | размер фиксируется в manifest |
| `inventory_icon` | master 128×128 → проверенные 64/32 | да | center | предмет занимает 72–84% стороны |
| `ui_icon` | master 128×128 → 64/32 | да | center | без иллюстративного фона |
| `foreground_occluder` | 480×270 | да | scene origin (0,0) | полный холст, чтобы не потерять выравнивание |
| `large_scene` | 480×270 | нет | scene origin (0,0) | единственное штатное исключение из transparent-background правила |

AI-выход — **кандидат**, а не финальный runtime-файл. Финальная сетка, palette cleanup, cluster cleanup, pivot и animation tags фиксируются в `.aseprite`/Pixelorama и manifest. Запрещено превращать плохо нарисованную большую иллюстрацию в «pixel art» агрессивным downscale + quantize.

## 4. Архитектура слоёв

### Хаб

1. `scene/base`: архитектура, земля, вода, дальний город/небо — один согласованный `large_scene`.
2. `scene/weather`: программные дождь/снег/туман/цветовые маски.
3. `world/behind`: NPC и объекты, которые должны оказаться за архитектурой/растительностью.
4. `foreground_occluder`: перила, ближайшие ветви/кусты, отдельные элементы переднего плана.
5. `world/front`: персонажи/животные/анимируемые приборы.
6. `interaction`: hotspot geometry и outlines, полученные из масок/сцен, а не сгенерированные как декоративные картинки.
7. `React UI`: верхняя панель, подписи зданий, CTA, навигация.

**Важно:** не генерировать каждое здание независимо и потом не собирать «Франкенштейн-хаб». Перспектива, horizon, источник света и атмосферная глубина должны задаваться базовой сценой. Отдельными PNG остаются только действительно интерактивные/анимируемые элементы и foreground-occluders.

### Блиц/смена

1. `workspace/base` — интерьер без текста и без центральной учебной панели.
2. `workspace/ambient` — окно/погода/необязательные animated props.
3. `assistant/portrait` или `world_character` — сопровождающий персонаж.
4. `task surface` — карта/телеграмма/профессиональная геометрия в SVG/Canvas/DOM.
5. `React UI` — таймер, серия, вопрос, ответы, feedback.

### Инвентарь

1. `room/base`.
2. `avatar/back` — рюкзак/задние аксессуары.
3. `avatar/body`.
4. `avatar/bottom + footwear`.
5. `avatar/top`.
6. `avatar/hair/headwear`.
7. `avatar/front/held-item`.
8. `companion`.
9. `React UI` + inventory icons.

Задача `identity-avatar-engineer`: заменить procedural `fillRect()` avatar renderer на manifest-driven sprite composition. Задача `game-runtime-webgl-engineer`: nearest-neighbour sampling, pivot consistency и отсутствие интерполированных кадров.

## 5. Каталоги

```text
assets/source/
  characters/
    player/
    npc/
    portraits/
  animals/
  props/
    inventory/
    meteo/
    furniture/
  environment/
    hub/
    rooms/
    vegetation/
    foreground/
  ui/
    icons/
    badges/
  palettes/
assets/manifests/
  characters/
  props/
  environment/
  ui/
docs/art-generation/
  CHATGPT_IMAGE_PROTOCOL.md
  ASSET_GENERATION_MATRIX.md
  batches/
```

Generated ChatGPT candidate PNG **не является каноническим source** до pixel-art review. После приёмки выбранный кандидат переносится/перерисовывается в editable `.aseprite`, получает manifest и только затем проходит pack/build.

## 6. Порядок выполнения

1. Сначала `BATCH-00`: десять gold assets разных классов. Массовая генерация запрещена, пока Art Director и `pixel-art-quality-reviewer` не приняли этот набор.
2. Затем avatar batches — потому что текущий procedural renderer сильнее всего расходится с референсом Inventory.
3. Затем inventory props/companions.
4. Затем Hub layers.
5. Затем Shift/Blitz workspace.
6. Затем UI/inventory icon family.
7. После каждого батча: alpha/grid/pivot check → pixel-art reviewer → Art Director → pipeline integration.

## 7. Что НЕ генерируем картинками

- русские подписи и названия зданий;
- кнопочный текст;
- значения уровня/энергии/рейтинга;
- изобары, фронты, станции, метеосимволы, координатные сетки — они остаются профессиональной SVG/Canvas-геометрией;
- hitboxes/hotspots;
- простые outlines и маски, если их можно детерминированно получить из alpha/scene geometry;
- night/day как независимые заново придуманные сцены: сохраняем геометрию и меняем light masks/tints; отдельный AI-edit допустим только как источник референса.

## 8. Внешние практики, использованные в контракте

- OpenAI, Images in ChatGPT: ChatGPT Images умеет следовать детальным инструкциям, редактировать загруженные изображения и создавать прозрачный фон. https://help.openai.com/en/articles/11084440-images-in-chatgpt
- Aseprite: sprite = размер + слои + кадры; слои/кадры/cels должны сохраняться в editable source. https://www.aseprite.org/docs/sprite/ и https://www.aseprite.org/docs/layers/
- Aseprite: sprite sheets экспортируются после авторинга кадров/тегов; генератор не должен создавать production sheet напрямую. https://www.aseprite.org/docs/sprite-sheet/
- MDN: для масштабирования pixel art в браузере использовать nearest-neighbour / `image-rendering: pixelated`; Canvas также должен работать без smoothing. https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look

## 9. Definition of Done одного ассета

- ровно один объект (или одна явно оговорённая background scene) на один файл;
- PNG RGBA с настоящей прозрачностью для isolated assets; никакой нарисованной «шахматки»;
- нет текста, водяных знаков, подписей, рамок, контакт-листов;
- силуэт читается на 1× и 2×;
- нет accidental anti-alias halo на alpha edge;
- указан semantic ID, final logical size, pivot, layer, intended use;
- asset не конфликтует с профессиональными метеоцветами;
- после Aseprite cleanup проходит `pixel-art-quality-reviewer`;
- после визуальной проверки проходит `art-director`;
- runtime использует semantic asset ID, а не ручные atlas coordinates.
