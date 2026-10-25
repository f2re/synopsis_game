# Content authoring guide

**Статус:** proposed

Пошаговая инструкция для добавления нового задания или сценария без изменения движка.

## 1. Определите учебную цель

Сформулируйте один измеряемый навык:

- декодировать группу КН-01;
- корректно нанести элемент станции;
- выявить ошибочное наблюдение;
- выбрать следующий шаг анализа;
- провести линию фронта по комплексу признаков.

Не начинайте с игрового эффекта.

## 2. Выберите module/skill

Проверьте `docs/meteorology/CONTENT_MODULES.md`.

Если нужного модуля нет — сначала добавьте его туда и опишите prerequisites.

## 3. Укажите method profile

Пример:

```text
RUS_CLASSIC_TRAINING_V1
```

Если правило кафедральное — создайте отдельный профиль/override, не меняйте глобальную трактовку.

## 4. Привяжите источник

Минимум:

- `source_id`;
- редакция;
- раздел/страница/пункт;
- authority/status.

Для real archive дополнительно:

- поставщик;
- срок;
- права;
- preprocessing;
- checksum/устойчивый идентификатор.

## 5. Выберите renderer

Предпочитать существующий тип:

- `choice`;
- `multiChoice`;
- `sequence`;
- `decode` / `encode`;
- `stationPlot`;
- `findError`;
- `hotspot`;
- `drawLine`;
- `compare`;
- `numeric`;
- `scenario`.

Новый renderer создаётся только если существующие типы не выражают учебное действие.

## 6. Опишите эталон

Эталон должен включать:

- правильный ответ;
- tolerance/allowed alternatives;
- explanation;
- principle tags;
- reason codes для типичных ошибок.

Для sequence лучше использовать dependency graph, если строгая линейность методически неверна.

## 7. Проверьте ambiguity

Задайте вопросы:

- возможен ли второй физически корректный ответ?
- хватает ли данных?
- зависит ли решение от неуказанного кафедрального правила?
- является ли distractor действительно неверным, а не просто редким?

## 8. Добавьте battle metadata только после учебной проверки

Учебный task может существовать без PvP.

Боевой слой должен быть опциональным и переопределяемым `BalanceProfile`.

## 9. Статус публикации

```text
draft → source_checked → method_reviewed → pilot_validated → published
```

Ranked/Exam не используют `draft`.

## 10. Минимальный пример

```json
{
  "id": "kn01_temp_001",
  "topic": "kn01",
  "skills": ["kn01_temperature"],
  "type": "decode",
  "difficulty": 1,
  "method_profile": "RUS_CLASSIC_TRAINING_V1",
  "data_origin": "synthetic_drill",
  "sources": [
    {
      "source_id": "ROSHYDROMET_KN01_CURRENT",
      "locator": "temperature_group"
    }
  ],
  "question": "Раскодируйте температуру воздуха",
  "payload": {},
  "answer": {},
  "explanation": "...",
  "principle_tags": ["code_reading"]
}
```

## 11. Checklist автора

- [ ] учебная цель одна и ясна;
- [ ] source указан;
- [ ] profile указан;
- [ ] ambiguity рассмотрена;
- [ ] explanation есть;
- [ ] reason codes есть;
- [ ] origin данных указан;
- [ ] synthetic/real не смешаны;
- [ ] task renderer подходит;
- [ ] schema validation проходит;
- [ ] method review выполнен перед Ranked/Exam.
