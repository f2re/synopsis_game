# Протокол генерации игровых ассетов в ChatGPT Images

Этот документ нужен именно из-за типичного отказа генератора: просьба «сделай серию из 10 картинок» часто превращается в один контакт-лист, коллаж или sprite sheet. Для production это запрещено.

## 1. Непереговорное правило

**Один image-generation вызов = один semantic asset = один самостоятельный файл.**

Батч из десяти — это очередь из десяти последовательных вызовов. Батч никогда не отправляется генератору целиком как один prompt.

Правильная последовательность:

```text
BATCH-03
  job 01 -> generate -> inspect -> save/retry -> stop
  job 02 -> generate -> inspect -> save/retry -> stop
  ...
  job 10 -> generate -> inspect -> save/retry -> stop
```

Неправильно:

```text
Generate all ten assets below...
Make a sprite sheet...
Put 10 items on transparent canvas...
Create a 2x5 grid...
Show variants side-by-side...
```

## 2. Контроллер чата

Перед выполнением батча можно один раз дать ChatGPT следующую **текстовую** инструкцию. Она не является image prompt:

> Ты выполняешь очередь production-ассетов для игры. В очереди десять независимых заданий, но за один раз разрешено выполнить только одно. Когда я присылаю `RUN <asset-id>`, создай ровно одно отдельное изображение только для указанного asset-id и остановись. Не предугадывай следующий asset. Не объединяй задания, не создавай коллаж, контакт-лист, sprite sheet, таблицу вариантов или несколько объектов на одном холсте. После одной генерации жди следующую команду.

После этого отправляется **только один** prompt из batch-файла.

## 3. Обязательное начало каждого isolated-asset prompt

Каждый prompt для прозрачного ассета начинается смыслово одинаково:

> Create exactly ONE standalone production game asset. One subject only. One image only. Do not create a set, collection, sprite sheet, contact sheet, comparison board, multiple variants, panels, labels or captions. The entire canvas contains only the requested subject and transparent empty space around it.

Повторение здесь намеренное. Надёжность важнее стилистической краткости.

## 4. Обязательный конец каждого isolated-asset prompt

> Output requirement: a single PNG-style RGBA image with a genuinely transparent background. Do not draw a checkerboard, white card, colored matte, floor plane, shadow plate, frame or vignette. No text, letters, numbers, logos, watermark or UI chrome. Do not include alternative poses or extra props unless they are physically part of the named subject. Keep all visible pixels of the subject inside the canvas with transparent padding.

ChatGPT Images поддерживает запрос прозрачного фона, но результат всё равно проходит визуальную/alpha-проверку. Нарисованная шахматная сетка не считается transparency.

## 5. Prompt anatomy

Порядок секций стабилен:

1. **Cardinality** — ровно один объект/одна сцена.
2. **Asset role** — world sprite, companion, inventory icon, portrait, scene.
3. **Subject** — что именно изображается.
4. **View/camera** — front/3⁄4/top-down/side и положение.
5. **Silhouette** — основные массы и читаемость.
6. **Material** — ткань, металл, дерево, стекло и т. п.
7. **Pixel language** — логическая сетка, кластеры, линии, отсутствие шума.
8. **Palette/light** — общая cold/warm система 26063.
9. **Layer/anchor** — важные границы, bottom-center/center, overlap rules.
10. **Negative constraints** — фон, текст, лишние варианты, collage/sheet.
11. **Output** — отдельный RGBA asset.

## 6. Pixel-language contract

Не использовать только фразу `pixel art`; она слишком широкая. В prompt указываем:

- modern polished pixel-art game asset;
- clear intentional pixel clusters;
- no random single-pixel noise;
- no painterly brush texture;
- no smooth vector gradient pretending to be pixel art;
- selective local-color outlines instead of a uniform pure-black outline;
- readable silhouette at native logical size;
- highlights grouped into clusters, not glitter/noise;
- curved objects use stepped cluster geometry consistently;
- nearest-neighbour look, no fuzzy edge halo;
- the level of detail is appropriate to the asset class.

Палитра не должна искусственно ограничиваться «ровно 8 цветами» для всех классов. Крупная сцена и портрет имеют больше цветовых ролей, чем UI icon.

## 7. Контракт слоёв и наложений

### World character / wearable

Нельзя генерировать куртку, брюки или волосы как совершенно свободную иллюстрацию и ожидать точного наложения. Используется один утверждённый **silhouette template**.

При генерации/редактировании wearable:

- прикладывается изображение утверждённого base character как reference;
- запрещено менять голову, плечи, кисти, таз, положение ног и baseline;
- outer garment может выходить за base silhouette только в указанных областях;
- внутренние вырезы вокруг лица/кистей должны быть прозрачными;
- anchor сохраняется строго `bottom-center`;
- направление и pose сохраняются.

Если генератор сдвинул анатомию — такой вариант reject, а не «подвинуть CSS-ом».

### Inventory icon

- один предмет;
- предмет занимает примерно 72–84% bounding box;
- center anchor;
- нет pedestal/card/background;
- perspective family фиксируется на 3/4 сверху для объёмных предметов и почти фронтально для плоских.

### Foreground occluder

- полный scene canvas 480×270;
- прозрачность вне occluder;
- не trim после экспорта: scene origin должен оставаться `(0,0)`;
- используется только для элементов, действительно пересекающих игрока по depth.

## 8. Большие сцены — специальный режим

`large_scene` — единственный класс в этих batch-файлах, где фон НЕ прозрачный.

Prompt должен требовать:

- одну 16:9 сцену без UI и текста;
- фиксированную композицию и horizon;
- свободные safe zones под React UI;
- никаких вшитых кнопок, табличек с русским текстом, уровней/энергии;
- профессиональные карты/изобары не рисовать как достоверные данные — оставить поверхности/экраны под runtime content.

Day/night/season не регенерируются независимо. Сначала утверждается geometry master; варианты делаются edit/tint/mask с сохранением геометрии.

## 9. Retry protocol

Результат перегенерируется, если выполнено хотя бы одно условие:

- несколько вариантов/панелей в одном изображении;
- непрозрачный фон у isolated asset;
- нарисованная checkerboard transparency;
- белая/цветная кайма по alpha edge;
- предмет обрезан краем;
- появились буквы/логотип/подписи;
- стиль стал painterly/anime-vector/3D render вместо утверждённой pixel illustration;
- нарушен pivot/baseline/reference silhouette;
- генератор добавил постамент, карточку или интерьер;
- мелкие детали превратились в случайный pixel noise.

Retry prompt:

> REGENERATE THE SAME SINGLE ASSET ONLY. The previous result failed production QA because: `<one concrete failure>`. Preserve the requested subject, view, silhouette and 26063 art direction. Correct only that failure. Still return exactly one standalone image, never a sheet or set.

## 10. Как исполнять batch из 10 в ChatGPT

Для каждого `BATCH-XX`:

1. открыть batch-файл;
2. взять только `JOB 01`;
3. отправить его как отдельное image-generation сообщение;
4. проверить результат;
5. при PASS сохранить с указанным filename;
6. только затем отправить `JOB 02` новым сообщением;
7. повторить до `JOB 10`.

**Не писать в image prompt «это первый из десяти»**: модель не должна знать про остальные девять изображений.

## 11. Проверка до Art Director review

Для isolated asset:

- [ ] ровно один expected subject;
- [ ] alpha реально присутствует;
- [ ] прозрачная рамка вокруг объекта;
- [ ] нет checkerboard/матта;
- [ ] нет текста;
- [ ] silhouette читаем;
- [ ] lighting совпадает с family;
- [ ] local-color outline;
- [ ] кластерная дисциплина;
- [ ] pivot/baseline совпадает;
- [ ] filename и semantic id совпадают с matrix.

Для scene:

- [ ] 16:9 geometry master;
- [ ] нет baked UI;
- [ ] safe zones сохранены;
- [ ] horizon/architecture соответствуют North-West/St Petersburg-inspired кампусу, без постоянного alpine background;
- [ ] есть человеческие следы работы;
- [ ] задача/карта не теряется в декоративной плотности.

## 12. Почему sprite sheet собирается ПОСЛЕ генерации

Aseprite хранит отдельные layers, frames и cels, а sprite sheet экспортируется из уже проверенной анимации. Это даёт контроль над frame size, pivot, tags, frame duration и padding. Поэтому ChatGPT генерирует/редактирует **отдельные кандидаты**, а production sheet создаёт asset pipeline после ручной pixel cleanup.

Источники:

- OpenAI — Images in ChatGPT: https://help.openai.com/en/articles/11084440-images-in-chatgpt
- Aseprite — Sprite structure: https://www.aseprite.org/docs/sprite/
- Aseprite — Layers: https://www.aseprite.org/docs/layers/
- Aseprite — Sprite sheet export: https://www.aseprite.org/docs/sprite-sheet/
- MDN — Crisp pixel art scaling: https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look
