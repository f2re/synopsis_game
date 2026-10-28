# Hub LoRA: `synopsis_hub_diorama`

Этот каталог задаёт машинный контракт генерации исходников для узкой LoRA хаба проекта **26063: Позывной «Синоптик»**.

Главное правило: **один prompt = одно отдельное изображение**. Коллажи, contact sheet, зеркальные копии и простые recolour-клоны не считаются новыми samples.

## Состав v1

- 10 канонических hub-сцен;
- ровно 30 независимых source renders;
- 20 `train`;
- 10 `validation` — по одному validation-кадру на каждую сцену;
- независимые теги `time_of_day`, `weather`, `season`;
- логическая сетка мира `480×270`;
- целевой long edge нового render — не меньше 1024 px;
- масштабирование существующего pixel-art — только native/integer nearest-neighbour;
- текст, UI и логотипы запрещены;
- source lineage обязателен и не может пересекать train/validation.

## Файлы

- `manifest.v1.json` — 30 заданий и художественно-технический контракт.
- `manifest.schema.json` — JSON Schema структуры manifest.
- `../../../scripts/validate_hub_lora_manifest.py` — семантическая проверка инвариантов.
- `../../../scripts/build_hub_generation_queue.py` — сборка backend-neutral JSONL очереди.

## Проверка

Из корня репозитория:

```bash
python scripts/validate_hub_lora_manifest.py
python scripts/build_hub_generation_queue.py --check-only
```

Проверить только validation-набор:

```bash
python scripts/build_hub_generation_queue.py \
  --split validation \
  --output artifacts/lora/hub_validation.jsonl
```

Полная очередь:

```bash
python scripts/build_hub_generation_queue.py
```

Каждая строка JSONL является отдельным generation job и всегда содержит `num_images: 1`.

## Жизненный цикл sample

1. Сгенерировать ровно одно изображение по одному job.
2. Провести художественную приёмку: единый размер логического пикселя, отсутствие blur/AA/UI/text и соответствие сцене.
3. Провести ЛОР-приёмку: профессиональный метеорологический характер, компактная архитектура, отсутствие монументальности/военизации.
4. Только принятый PNG переносится в `datasets/lora/hub/source/`.
5. Для принятого файла фиксируются checksum, provenance и source lineage в итоговом dataset manifest.
6. Любые последующие crops наследуют lineage исходника и обязаны оставаться в том же split.

JSONL из `artifacts/` — это очередь генерации, а не тренировочный датасет. Факт наличия job не означает, что сгенерированное изображение автоматически принято в обучение.

## Совместимость с `world-style v4`

`world-style v4` остаётся общим адаптером языка среды. `synopsis_hub_diorama` обучает более узкую структуру хаба — цельную диораму, разрезы, интерьеры и световые состояния. Hub-набор не должен засасывать персонажные листы, предметные листы или UI.

В prompt намеренно нет ссылок на конкретные коммерческие игры: стиль описывается собственными визуальными признаками проекта.
