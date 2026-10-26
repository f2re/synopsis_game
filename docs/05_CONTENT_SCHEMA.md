# 05. Модель данных, JSON и методические профили

## 1. Цель

Учебный материал отделяется от игрового движка и версионируется независимо.

Основные программные сущности:

- `MethodProfile` — правила конкретной методической школы или кафедры;
- `Source` — библиографический или нормативный источник;
- `ContentPack` — версия набора учебного материала;
- `TaskDefinition` — шаблон задания;
- `TaskInstance` — публичный экземпляр задания;
- `Skill` — измеряемая компетенция;
- `Scenario` — многошаговая ситуация;
- `BalanceProfile` — численные параметры игрового баланса;
- `ReplayManifest` — версии и данные для воспроизведения матча.

Технические имена сущностей сохраняются на английском, пояснения — на русском.

## 2. `MethodProfile`

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
    "pressure_rise": "Р"
  },
  "sources": ["ZVEREV_1977", "ROSHYDROMET_KN01_CURRENT"],
  "rules": {
    "front_requires_multiple_signs": true,
    "use_previous_terms": true,
    "vertical_coordination_required": true
  }
}
```

Изменение методического смысла требует новой версии профиля.

## 3. `Source`

```json
{
  "id": "ZVEREV_1977",
  "type": "textbook",
  "title": "Синоптическая метеорология",
  "author": "А. С. Зверев",
  "year": 1977,
  "authority": "classic_textbook"
}
```

Нормативный источник хранит издателя, год, область действия и при необходимости дату актуальности.

## 4. `ContentPack`

```json
{
  "id": "core_ru_001",
  "version": "0.1.0",
  "method_profile": "RUS_CLASSIC_TRAINING_V1",
  "status": "draft",
  "tasks": ["kn01_temp_001", "station_plot_001"],
  "balance_profile": "ranked_s1_v3"
}
```

## 5. `TaskDefinition`

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
  "sources": ["ZVEREV_1977"]
}
```

Шаблон хранится на серверной стороне вместе с эталоном и не является форматом передачи клиенту.

## 6. Последовательность

```json
{
  "id": "surface_analysis_001",
  "type": "sequence",
  "steps": ["..."],
  "correct_order": [0, 1, 2, 3],
  "allowed_swaps": []
}
```

Для сложных алгоритмов предпочтителен частичный порядок или граф зависимостей, если строгая линейная последовательность методически неверна.

При выдаче задания сервер перемешивает публичные шаги детерминированно по зерну раунда. `correct_order` и обратное соответствие клиенту не передаются.

## 7. Дешифрирование

```json
{
  "id": "kn01_temp_028",
  "type": "decode",
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

Значение в примере иллюстрирует структуру. Эталон формируется и проверяется версионированным кодеком.

## 8. Схема нанесения станции

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
  "required_elements": ["temperature", "dew_point", "pressure", "wind"],
  "layout_profile": "RUS_SURFACE_STATION_V1"
}
```

## 9. Геометрия карты

Экранные пиксели запрещены в эталоне ответа. Координаты хранятся в пространстве бланка, независимом от разрешения устройства.

```json
{
  "answer": {
    "kind": "geometry",
    "geometry_type": "polyline",
    "coordinate_space": {
      "kind": "normalized-map",
      "extent": [0, 0, 1000, 1000],
      "projection_id": "surface_blank_v1"
    },
    "reference": [[120, 440], [310, 390], [520, 410]],
    "validation": {
      "mode": "topology-assisted",
      "corridor_map_units": 14,
      "crossing_rules": [],
      "endpoint_rules": [],
      "context_rules": ["wind_consistency", "front_context", "orography_context"]
    }
  }
}
```

Клиент переводит координаты указателя в пространство бланка до отправки ответа. Сервер применяет одинаковую проверку независимо от размера экрана.

Для изобар и изаллобар учитываются:

- локальная интерполяция между наблюдениями;
- непрерывность и отсутствие необоснованных самопересечений;
- согласование с фактическим полем давления и ветра;
- фронтальный и орографический контекст;
- допуски конкретного методического профиля.

Универсальная жёсткая геометрическая маска для всей карты не используется.

## 10. Критика наблюдений

```json
{
  "id": "critique_001",
  "type": "findError",
  "stations": ["s1", "s2", "s3", "s4"],
  "answer": {
    "suspect_station": "s4",
    "certainty": "high",
    "reason_codes": ["wind_pressure_inconsistency"]
  }
}
```

Нужно отличать ошибку от редкого, но физически возможного наблюдения.

## 11. `BalanceProfile`

```json
{
  "id": "ranked_s1_v3",
  "reliability_max": 100,
  "or_max": 5,
  "effects": {
    "quick": 5,
    "medium": 10,
    "heavy": 18
  }
}
```

Учебный шаблон не обязан содержать соревновательные коэффициенты. Рейтинговый режим использует отдельный профиль баланса.

## 12. `Scenario`

```json
{
  "id": "south_cyclone_case_001",
  "title": "Южный циклон — архивный случай",
  "data_origin": "real_archive",
  "stages": ["observations", "critique", "surface_analysis", "upper_air", "frontology", "forecast"],
  "sources": []
}
```

## 13. `TaskInstance`

Публичный экземпляр не содержит правильного ответа.

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

Для задания с вариантами или последовательностью `payload` содержит только уже переставленные публичные элементы.

## 14. `ReplayManifest`

```json
{
  "match_id": "m_001",
  "game_rules_version": "0.3.0",
  "balance_profile": "ranked_s1_v3",
  "content_packs": ["core_ru_001@0.1.0"],
  "method_profile": "RUS_CLASSIC_TRAINING_V1",
  "kn01_ruleset_id": "KN01_CURRENT_RU_2026",
  "data_snapshot_id": "...",
  "seed": 78122
}
```

Манифест хранит всё, что требуется для точного воспроизведения старого матча.

## 15. Версионирование

Независимо версионируются игровые правила, пакеты учебного материала, методические профили, профили баланса, схемы данных, наборы правил КН-01 и снимки актуальных данных.

Изменение правильного ответа или методического смысла не считается косметической правкой.

## 16. Автоматическая проверка

Минимальные проверки:

- соответствие JSON Schema;
- уникальность идентификаторов;
- существование источников, профилей, навыков и заданий;
- отсутствие правильного ответа в публичном `TaskInstance`;
- проверка диапазонов;
- проверка геометрии в единицах карты;
- отсутствие противоречивых перестановок и зависимостей;
- воспроизводимость по версиям и зерну.

## 17. Локализация

Профессиональные термины, условные обозначения и формулировки источника не переводятся автоматически общим словарём интерфейса. Российский профиль является отдельным методическим профилем, а не только русской локализацией другой школы.
