# Content workspace

Каталог `content/` предназначен для версионируемого учебного содержания. Движок игры не должен содержать конкретные ответы и методические правила в исходном коде.

## Целевая структура

```text
content/
├── sources/            # библиографические и нормативные записи
├── method-profiles/    # российская классическая школа и кафедральные варианты
├── skills/             # дерево компетенций
├── packs/              # manifests публикуемых наборов
├── tasks/              # TaskDefinition
├── scenarios/          # многошаговые архивные/учебные кейсы
├── balance/            # BalanceProfile
└── assets/             # только разрешённые к использованию данные и метаданные
```

## Правила

1. Каждый эталонный task имеет `method_profile`.
2. Каждый содержательный ответ имеет source reference.
3. Реальные данные имеют provenance и rights metadata.
4. Синтетические drills маркируются `data_origin: synthetic_drill`.
5. Изменение правильного ответа требует новой версии content pack.
6. Published pack не редактируется задним числом; ошибочный материал deprecated/revoked новой версией.
7. Ranked использует только reviewed content.

## Минимальный жизненный цикл

```text
draft
  ↓
schema_valid
  ↓
source_checked
  ↓
method_reviewed
  ↓
pilot_validated
  ↓
published
```

Дополнительные конечные статусы: `deprecated`, `revoked`.

## Что сюда не помещать

- игровые коэффициенты, не относящиеся к content pack;
- UI-специфичный layout;
- секреты/API keys;
- непроверенные материалы, выданные за норматив;
- чужие изображения/карты без разрешения или понятного права использования.

См. также: `docs/05_CONTENT_SCHEMA.md`, `docs/09_SOURCE_POLICY.md`, `docs/meteorology/CONTENT_MODULES.md`.
