# Датасеты LoRA: промпты для насыщения и чего не хватает

Статус: рабочий план, не утверждён. Эталоны сделаны владельцем во внешнем генераторе, поэтому и насыщение набора
делается там же: наш Z-Image пока не рисует cutaway-хаб на уровне эталона.

## 0. Решение: три отдельные LoRA вместо одной

| LoRA | Триггер | Что учит | Чего в наборе быть не должно |
| --- | --- | --- | --- |
| `hub` | `synopsis_hub_diorama` | Цельная 2.5D-диорама, здания в разрезе, интерьеры, плющ по камню, единый свет | Спрайты на фоне, иконки, портреты, одежда |
| `characters` | `synopsis_pixel_char` | Люди и животные: пропорции, лица, одежда, ракурсы, hi-res пиксель | Сцены и здания |
| `props` | `synopsis_pixel_prop` | Предметы, иконки, элементы мира, UI-рамки на ровном фоне | Сцены, люди |

Небо и облака идут в `hub`: на эталоне они часть одной картинки, отдельно их не учим.

## 1. Правила для всех наборов

- **Время суток и погода только в подписи.** Одна сцена в трёх разных светах учит модель отделять рисунок от цвета.
- **Без текста и интерфейса в кадре.** Никаких плашек «Радар Ур. 2», кнопок, шапки. Если плашка осталась, она описывается в подписи как `floating dark UI label with Russian text`.
- **Кропы только от 768 px по длинной стороне.** Мельче растягивается бакетами в «мыло». Лучше сразу генерировать от 1024 px.
- **Минимум 3 повтора нового стиля на 1 повтор старого** (дублировать файлы или `--repeats`).
- **Один шаг обучения = 4 сэмпла** (накопление градиента): 800 шагов это около 70 проходов на 44 кадра. Больше 1000 шагов не ставить без проверки на переобучение.
- Чекпоинты каждые 200 шагов, выбирать по картинкам, а не по последнему.

## 2. LoRA `hub`: 10 сцен

Общий префикс для каждого промпта:

```
HD pixel art game illustration, 2.5D front view from a high angle, fine small pixels, clean crisp outlines,
rich micro-detail, dense foliage, smooth painterly colour ramps, one global light source, no text, no UI,
no watermark, no frame
```

| № | Сцена (добавлять после префикса) |
| --- | --- |
| 1 | Glass weather-maps pavilion cut open at the front: panoramic windows, forecasters at desks, large wall displays of cyclones with fronts and isobars, two street monitors, stone steps |
| 2 | Archive building cut open: bookshelves to the ceiling, a standing globe, pinned wall maps, a reading desk, ivy climbing the stone walls, small lamps |
| 3 | Aerology station with an open balloon bay: a white weather balloon being prepared, instrument racks, staff in white coats, a glass wall, a flag windsock on the roof |
| 4 | White radar dome on a stone hill, a red-beacon lattice tower, antennas, dark spruces around, stone retaining walls covered in ivy |
| 5 | Tournament hall cut open: a golden trophy on a podium, red and blue banners with weather symbols, rows of seated people at monitors, stage lights |
| 6 | Cream stone main building with a small dome and a balcony, wide stairs down to a round plaza with a glass globe fountain, students crossing, street lamps |
| 7 | Tiered stone terraces with stairs, iron lamps, trimmed shrubs in planters, an orange cat on a parapet, warm cobblestone, spruces between levels |
| 8 | Valley view behind the campus: a river with a bridge, a city skyline with spires at the foot of mountains, a pine forest slope, a weather balloon in the sky |
| 9 | Whole campus as one wide tiered diorama: all pavilions, main building, plaza and radar hill in a single composition, tiny students everywhere |
| 10 | Open workroom cut away: cluttered meteorologist's desk, wall maps, plants, a corgi in a blue bandana, a laptop with a cloud mug, warm lamp, a window to the bay |

### 10 стилей освещения (множитель)

Каждый стиль это тег света и палитры. Брать каждую сцену минимум в трёх разных стилях.

| № | Тег для промпта и подписи |
| --- | --- |
| A | `sunset lighting, dusk atmosphere, purple and dark blue shadows, orange sky, glowing warm windows` |
| B | `deep night, indigo sky with stars, warm amber light from windows and lamps, cool blue shadows` |
| C | `dawn mist, pale pink and gold sky, soft haze between levels, long cool shadows` |
| D | `clear noon, bright blue sky, white cumulus clouds, short crisp shadows, saturated greens` |
| E | `overcast stratus sky, soft flat grey light, muted colours, wet stone` |
| F | `light rain, dark clouds, glossy wet pavement with reflections, lamps already lit` |
| G | `autumn afternoon, orange and yellow maples and birches, low warm sun, long shadows` |
| H | `winter, fresh snow on roofs and stairs, pale blue sky, warm lit windows, breath of cold` |
| I | `spring morning, blossoming trees, fresh light green foliage, soft sunlight, puddles` |
| J | `thunderstorm approaching, dramatic dark clouds with a bright rim, a break of low sun, tense contrast` |

**Рекомендуемая сборка: 10 сцен × 3 света = 30 кадров** (для каждой сцены A + два любых из B–J, но все десять
стилей должны встретиться хотя бы дважды). Плюс 8–10 уже имеющихся вечерних кропов эталона без плашек. Итого
около 40 кадров против 44 в v3, но без чужеродных спрайтов.

### Шаблон подписи

```
synopsis_hub_diorama, <сцена из таблицы, своими словами>, 2.5d game hub diorama, architectural cutaway view,
<тег стиля из таблицы>, hd pixel art illustration
```

Если на кадре остались плашки: добавить `, floating dark UI label with Russian text`.

## 3. Чего не хватает для остальных наборов

Спецификация `kn01_level1.image-spec.json` содержит 207 ассетов. Это то, что есть и чего не хватает.

| Группа | В спеке | Что есть сейчас | Чего не хватает для LoRA |
| --- | --- | --- | --- |
| Персонажи и аватары (`AVATAR`, `MENTOR`) | 5 | Лист `AVATAR-HERO-M2` и экспериментальные позы | 15–20 кадров людей одним стилем: герой, героиня, наставники (Вера Павловна, Семён Петрович), техник, метеоролог, школьники, в 3/4 и в профиль, на ровном фоне |
| Одежда (`CLOTH`) | 44 | Только тёмная форма и куртка из v1 | 15–20 предметов одним стилем: худи, форма, рюкзаки, головные уборы, обувь, на персонаже и отдельно |
| Животные (`CAT`, `SQUIRREL`, птицы) | ~12 | 4 кадра из v1 (ворона, белка, воробей, ёж) | Корги в бандане (есть на эталоне), синица, чайка, кряква, голубь, снегирь, стая; по 2 позы на вид |
| Здания (`BLD`) | 18 | 5 дневных зданий | Все остаются в `hub`: отдельные здания на ровном фоне не нужны, берутся из диорамы |
| Хаб и небо (`HUB`) | 16 | Небо 6 фаз, горизонт, земля, деревья | Слои собираются из `hub`-кадров; нужны слои днём и ночью |
| Предметы и элементы мира (`PROP`, `REW`, `FX`) | 23 | 4 предмета из v1 | 20–25 предметов на ровном фоне: приборы, карты, глобус, кубок, радиозонд, лампы, скамейки, клумбы, шар-зонд |
| Интерьеры (`ROOM`, `KF`, `SCR`) | 22 | 1 кадр рабочей комнаты (эталон) | 8–10 кадров комнаты героя с разной мебелью и светом; ключевые сцены как диорамы `hub` |
| Иконки (`ICON`) | 28 | `ICON-MODE-BLITZ` | 10–15 иконок одной рукой: шкала, энергия, лига, архив, турнир, задания, инвентарь |
| Интерфейс (`UI`, `TIT`, `BRAND`, `STATE`) | 37 | Лист рамок на эталоне | 10–12 рамок, плашек и кнопок, чисто, без текста |

### Что нужно сделать до генерации датасетов персонажей и предметов

1. **Таблица ракурсов и поз** для героя (стоит, идёт, указывает, радуется, думает). Без неё генератор даёт случайные
   позы, а нужны листы анимации.
2. **Фиксированная палитра людей** (`PEOPLE_PALETTE`, 14 цветов в `avatar_sheet.py`) должна попасть в подписи:
   `brown hair, blue hoodie, backpack`, иначе внешний вид героя будет плавать.
3. **Единая подложка:** персонажи и предметы на ровном светло-сером фоне (на пурпурном модель смешивает фон с водой и
   тенями, это уже проверено на деревьях).
4. **Старую LoRA `synopsis_character_v1`** на сервере стоит проверить: возможно, часть работы по людям уже сделана.

### Предлагаемый порядок

1. `hub` (30–40 кадров, раздел 2), потому что от него зависят хаб, небо, здания и ключевые сцены.
2. `characters` (около 40 кадров: герои, наставники, одежда, животные).
3. `props` (около 40 кадров: предметы, иконки, рамки).

## 4. Открытые вопросы владельцу

- Нужны ли шесть-восемь вариантов героя (разные лица, причёски) или один с переодеванием?
- Кого из персонажей из `docs/lore` считаем основными для набора `characters`, а кого оставляем на потом?
- Берём ли сезонные варианты хаба (осень, зима, весна) в первом наборе или во втором?
