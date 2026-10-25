# 05. Модель данных, JSON и методические профили

## 1. Цель

Учебное содержание отделяется от игрового движка и версионируется независимо.

Основные программные сущности:

- `MethodProfile` — правила конкретной методической школы или кафедры;
- `Source` — библиографический или нормативный источник;
- `ContentPack` — версия набора учебного содержания;
- `TaskDefinition` — шаблон задания;
- `TaskInstance` — конкретный экземпляр задания;
- `Skill` — измеряемая компетенция;
- `Scenario` — многошаговая ситуация;
- `BalanceProfile` — численные параметры игрового баланса;
- `ReplayManifest` — набор версий и данных, необходимых для воспроизведения матча.

Названия сущностей сохраняются на английском как программные идентификаторы. В пояснительном тексте используется русская терминология.

## 2. `MethodProfile` — методический профиль

Пример:

```json
{
  "id": "RUS_CLASSIC_TRAINING_V1",
  "name": "Российская классическая школа — учебный профиль v1",
  "status": "draft",
  "language": "ru",
  "notation": {
    "surface_low": "Н",
    "surface_high": "В",
    "pressure_fall": "П",
    "pressure_rise": "Р",
    "thermal_cold": "Х",
    "thermal_warm": "Т"
  },
  "sources": [
    "ZVEREV_1977",
    "RSHU_PRACTICUM_EDITION",
    "ROSHYDROMET_KN01_CURRENT"
  ],
  "rules": {
    "front_requires_multiple_signs": true,
    "use_previous_terms": true,
    "vertical_coordination_required": true
  }
}
```

Машинное значение `status: draft` означает «черновик». В человекочитаемом тексте статус пишется по-русски.

## 3. `Source` — источник

```json
{
  "id": "ZVEREV_1977",
  "type": "textbook",
  "title": "Синоптическая метеорология",
  "author": "А. С. Зверев",
  "year": 1977,
  "edition": "2-е переработанное и дополненное",
  "authority": "classic_textbook",
  "url": null,
  "notes": "Библиографические реквизиты проверить перед выпуском"
}
```

Для нормативного документа:

```json
{
  "id": "RD_52_27_724_2019",
  "type": "regulatory_method",
  "title": "Наставление по краткосрочным прогнозам погоды общего назначения",
  "year": 2019,
  "authority": "official_current",
  "issuer": "Росгидромет / Гидрометцентр России"
}
```

## 4. `ContentPack` — пакет учебного содержания

```json
{
  "id": "core_ru_001",
  "version": "0.1.0",
  "method_profile": "RUS_CLASSIC_TRAINING_V1",
  "status": "draft",
  "tasks": [
    "kn01_temp_001",
    "station_plot_001",
    "surface_analysis_001"
  ],
  "created_at": "2026-10-25T00:00:00Z",
  "review": {
    "methodical": "pending",
    "language": "pending",
    "technical": "passed"
  }
}
```

Поле `review` — технический контракт. В документации его значения трактуются как «ожидает проверки», «проверено» и т. п.

## 5. `TaskDefinition` — общие поля шаблона задания

```json
{
  "id": "surface_analysis_001",
  "topic": "primary_analysis",
  "skills": ["surface_analysis", "workflow_order"],
  "type": "sequence",
  "difficulty": 2,
  "method_profile": "RUS_CLASSIC_TRAINING_V1",
  "data_origin": "authored_training",
  "question": "Установите последовательность операций...",
  "sources": ["ZVEREV_1977"],
  "explanation": "...",
  "principle_tags": [
    "historical_sequence",
    "observation_critique",
    "vertical_consistency"
  ]
}
```

## 6. Задание на последовательность

```json
{
  "id": "surface_analysis_001",
  "type": "sequence",
  "steps": [
    "Ознакомление с предыдущими сроками",
    "Критика наблюдений",
    "Предварительная наметка барического поля",
    "Подъём карты",
    "Анализ изотенденций",
    "Предварительная наметка и согласование фронтов",
    "Уточнение зон осадков",
    "Окончательное оформление",
    "Проверка даты, срока и надписей"
  ],
  "correct_order": [0,1,2,3,4,5,6,7,8],
  "allowed_swaps": [],
  "violations": {
    "final_isobars_before_map_lift": "technology_order",
    "front_without_vertical_check": "vertical_consistency"
  }
}
```

Поле `allowed_swaps` должно поддерживать:

- пары взаимозаменяемых соседних шагов;
- эквивалентные группы;
- частичный порядок в виде ориентированного ациклического графа, если строгая линейная последовательность методически неверна.

Для сложных алгоритмов предпочтительно хранить **граф зависимостей**, а интерфейс уже может просить линейную раскладку.

## 7. Задание на дешифрирование

```json
{
  "id": "kn01_temp_028",
  "type": "decode",
  "topic": "kn01",
  "prompt": "Раскодируйте температуру воздуха",
  "payload": {
    "group": "1snTTT",
    "encoded": "10234"
  },
  "answer": {
    "kind": "numeric",
    "value": 23.4,
    "unit": "degC",
    "tolerance": 0.0
  }
}
```

Конкретное значение приведено только как пример структуры и должно быть проверено модулем КН-01.

## 8. Задание на схему станции

```json
{
  "id": "station_plot_010",
  "type": "stationPlot",
  "input": {
    "temperature": -5.2,
    "dew_point": -7.1,
    "pressure": 1013.4,
    "wind_direction_deg": 240,
    "wind_speed": 8
  },
  "required_elements": [
    "temperature",
    "dew_point",
    "pressure",
    "wind"
  ],
  "layout_profile": "RUS_SURFACE_STATION_V1"
}
```

## 9. Задание на геометрию карты

Для карты нельзя хранить только один пиксель правильного ответа.

```json
{
  "answer": {
    "kind": "geometry",
    "geometry_type": "polygon",
    "coordinates": [[...]],
    "tolerance_px": 12,
    "projection": "..."
  }
}
```

Для линии дополнительно могут задаваться:

- эталонная полилиния;
- допустимый коридор;
- ограничения на концы линии;
- правила пересечений;
- топологические правила.

## 10. Задание на критику наблюдений

```json
{
  "id": "critique_001",
  "type": "findError",
  "stations": ["s1", "s2", "s3", "s4", "s5"],
  "answer": {
    "suspect_station": "s4",
    "certainty": "high",
    "reason_codes": ["wind_pressure_inconsistency"]
  },
  "distractors": {
    "s2": "unusual_but_possible"
  }
}
```

Важно различать ошибку и редкое, но физически возможное наблюдение.

## 11. Метаданные игрового эффекта

Учебная задача не обязана знать о сетевом состязании. Игровой слой задаётся отдельно или необязательно:

```json
{
  "battle": {
    "class": "quick",
    "base_effect": 6,
    "resource_gain": 1,
    "time_limit_ms": 8000,
    "combo_tag": "surface_observation"
  }
}
```

Для рейтингового режима сервер использует `BalanceProfile`, который может переопределять эти значения.

## 12. `BalanceProfile` — профиль баланса

```json
{
  "id": "ranked_s1_v3",
  "reliability_max": 100,
  "or_max": 5,
  "effects": {
    "quick": 5,
    "medium": 10,
    "heavy": 18
  },
  "speed_bonus_max": 0.15,
  "control_chain_limit": 1
}
```

Значения `quick`, `medium`, `heavy` являются внутренними классами баланса. В пользовательском интерфейсе им соответствуют «быстрое», «среднее» и «сложное» действие.

## 13. `Scenario` — многошаговая ситуация

```json
{
  "id": "south_cyclone_case_001",
  "title": "Южный циклон — архивный случай",
  "data_origin": "real_archive",
  "valid_time": "...",
  "stages": [
    "observations",
    "critique",
    "surface_analysis",
    "upper_air",
    "frontology",
    "evolution",
    "forecast"
  ],
  "assets": [],
  "sources": []
}
```

## 14. `TaskInstance` — экземпляр задания

Один шаблон может создавать много экземпляров.

```json
{
  "instance_id": "match123_task007",
  "definition_id": "kn01_temp_generator",
  "content_pack": "core_ru_001@0.1.0",
  "seed": 982341,
  "payload": {},
  "server_answer_hash": "..."
}
```

Клиент не получает поле с правильным ответом.

## 15. `ReplayManifest` — манифест воспроизведения

```json
{
  "match_id": "m_001",
  "game_rules_version": "0.3.0",
  "balance_profile": "ranked_s1_v3",
  "content_packs": ["core_ru_001@0.1.0"],
  "method_profile": "RUS_CLASSIC_TRAINING_V1",
  "seed": 78122
}
```

Так старый матч можно воспроизвести после обновления игры.

## 16. Версионирование

Для технических версий рекомендуется семантическое версионирование SemVer.

Отдельно версионируются:

- игровые правила;
- пакеты учебного содержания;
- методические профили;
- профили баланса;
- схема данных.

Изменение правильного ответа или методического смысла — не косметическая правка и требует новой версии.

## 17. Автоматическая проверка

Необходимые проверки:

- соответствие JSON Schema;
- уникальность идентификаторов;
- существование всех `source_id`;
- существование методического профиля;
- корректность ссылок на компетенции;
- отсутствие правильного ответа в данных, отправляемых клиенту;
- проверка диапазонов;
- генеративные тесты свойств;
- проверка геометрии;
- отсутствие противоречивых `allowed_swaps`.

## 18. Локализация

Учебные термины нельзя переводить автоматически общим словарём интерфейса.

Система локализации различает:

- обычный текст интерфейса;
- профессиональную терминологию;
- условные обозначения;
- формулировки, зависящие от конкретного источника.

Российский профиль — самостоятельный методический профиль, а не просто русская локализация западной методики.

## 19. Язык схем и документации

Поля JSON/YAML и имена программных типов сохраняются как технический контракт. Всё пояснение вокруг них пишется по-русски согласно [`LANGUAGE_POLICY.md`](LANGUAGE_POLICY.md).
