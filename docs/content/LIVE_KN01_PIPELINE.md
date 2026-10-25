# Live КН-01 Pipeline — реальные станции и автоматическая генерация заданий

**Статус:** accepted-concept

## 1. Цель

КН-01 в игре должен работать не только на статическом банке вопросов, но и на **актуальных метеорологических телеграммах реальных станций**. Из живого потока система автоматически формирует проверяемые упражнения на кодирование, декодирование, нанесение станции и критику наблюдений.

Преподаватель не должен вручную создавать ответы или оценивать результат.

## 2. Базовый поток

```text
Data Source
   ↓
Ingress Adapter
   ↓
Raw Telegram Store
   ↓
Dedup / Timestamp / Station Resolution
   ↓
KN01 Parser
   ↓
Canonical Observation
   ↓
Validation + QC
   ↓
Task Generator
   ↓
Task Instance
   ↓
Server-side Answer Validator
   ↓
Solo / Blitz / PvP / Arena TV
```

## 3. Источники входных данных

Подключение делается адаптерами. Ядро не должно зависеть от одного канала.

Минимально предусмотреть:

- `file-spool` — папка, куда поступают текстовые метеотелеграммы;
- `batch-file` — импорт архива файлов;
- `tcp-socket` — поток по TCP;
- `websocket-feed` — WebSocket;
- `unix-socket` — локальная интеграция при необходимости;
- `message-queue` — опционально для промышленного контура;
- `manual-test-fixture` — только для разработки/тестов.

Термин «телеграмма» здесь означает метеорологическое кодовое сообщение, а не обязательно приложение Telegram.

## 4. Raw-first принцип

Сырая входная телеграмма сохраняется неизменённой с метаданными:

```json
{
  "raw_id": "...",
  "received_at": "...",
  "source_adapter": "file-spool",
  "source_name": "local-kn01-feed",
  "payload": "...",
  "checksum": "..."
}
```

Это позволяет:

- повторно разбирать сообщение новым parser-version;
- расследовать ошибки;
- воспроизводить старые задания;
- не терять исходный материал.

## 5. Station registry

Система должна иметь реестр станций:

- идентификатор;
- WMO/локальный номер по принятому профилю;
- название;
- координаты;
- высота;
- активность;
- допустимые aliases;
- регион/группа для фильтрации.

Если станция не разрешается однозначно, сообщение помещается в quarantine и не используется в Ranked.

## 6. Ruleset и актуальность КН-01

Parser/encoder всегда работают с явным `kn01_ruleset_id`.

Пример:

```text
KN01_CURRENT_RU_2026
KN01_LEGACY_TRAINING_1
```

Конкретная версия должна быть связана с источником методики/нормативной документации и датой действия.

Нельзя:

- зашивать правила в UI;
- молча менять ruleset для уже созданного replay;
- смешивать legacy и current задачи без маркировки.

## 7. Canonical Observation

После разбора телеграмма преобразуется в предметную модель, например:

```json
{
  "station_id": "...",
  "observation_time": "...",
  "temperature_c": 2.3,
  "dewpoint_c": 1.7,
  "pressure_hpa": 1001.8,
  "wind_dir_deg": 240,
  "wind_speed": 6,
  "visibility": 8000,
  "ww": 61,
  "clouds": {},
  "source_raw_id": "...",
  "ruleset_id": "KN01_CURRENT_RU_2026"
}
```

Точные поля определяются `meteorology-domain`, а не этим документом.

## 8. Автоматическая проверка

### Decode

`raw KN01 → canonical observation`.

Ожидаемый ответ генерируется parser-ом.

### Encode

`canonical observation → KN01 group/message`.

Проверка выполняется encoder-ом по тому же ruleset.

### Round-trip invariant

Для допустимых сообщений должен выполняться контролируемый round-trip:

```text
parse(encode(observation)) ≈ observation
```

с учётом допустимых потерь точности/формата конкретного кода.

### Station plot

Схема нанесения генерируется из canonical observation и проверяется по отдельным полям.

### Critique

Система может автоматически сравнивать:

- внутреннюю согласованность станции;
- соседние станции;
- временную последовательность;
- физические ограничения;
- правила кодирования.

Автоматическая критика должна хранить confidence и тип правила, а не выдавать эвристику за абсолютную истину.

## 9. Freshness policy

Для live-задач хранить:

- `observation_time`;
- `received_at`;
- `freshness_class`;
- `is_delayed`;
- `is_retransmission`.

Пример классов:

- `live`;
- `recent`;
- `stale`;
- `archive`.

Ranked может использовать только разрешённые классы.

## 10. Deduplication

Дубликаты определяются по комбинации:

- station;
- observation time;
- code type;
- raw checksum / normalized payload.

Повторная доставка не должна создавать бесконечные одинаковые задания.

## 11. Quarantine

Сообщение не попадает в игровой пул, если:

- parser error;
- неизвестная станция;
- неоднозначная группа;
- конфликт ruleset;
- критическая внутренняя несогласованность;
- timestamp вне допустимого окна;
- данные повреждены.

Quarantine доступен администратору/методисту для диагностики, но не требует ручной обработки для продолжения игры.

## 12. Task Generator

Из одного наблюдения могут создаваться разные задания:

- декодировать температуру;
- декодировать давление;
- определить ветер;
- восстановить сокращённое давление;
- выбрать ww;
- собрать часть станции;
- собрать полную станцию;
- закодировать одну группу;
- закодировать телеграмму;
- найти ошибку в намеренно модифицированной копии;
- сравнить две соседние станции;
- сравнить последовательные сроки.

## 13. PvP fairness

Для `Equivalent` режима игрокам выдаются разные live observations, но task generator нормализует:

- число операций;
- тип группы;
- число неоднозначных символов;
- длину ответа;
- empiric difficulty.

Если эквивалентность не может быть обеспечена, матч использует snapshot pool или Mirror.

## 14. Snapshot pool

Для устойчивости матч не зависит от внешнего live feed в момент каждого вопроса.

Сервис периодически строит `Live Snapshot Pack`:

```text
feed → validated observations → snapshot → task pool
```

Матч получает фиксированный snapshot/version, поэтому replay остаётся воспроизводимым.

## 15. Failover

Если live feed пропал:

1. используются свежие snapshot packs;
2. затем recent cache;
3. затем проверенный archive pack;
4. UI честно показывает источник/свежесть, если это важно для режима.

Игра не должна останавливаться из-за отсутствия внешнего канала.

## 16. Автономность

Live pipeline сам выполняет:

- ingest;
- parse;
- validation;
- task generation;
- answer generation;
- publication into task pool;
- telemetry;
- quarantine.

Роль преподавателя — не ручная проверка, а при необходимости просмотр методической статистики и проблемных случаев.

## 17. Наблюдаемость

Метрики:

- messages/min;
- parse success rate;
- station coverage;
- duplicate rate;
- quarantine rate;
- age distribution;
- tasks generated/min;
- answer validation errors;
- ruleset-version distribution.

## 18. Безопасность источника

Входной поток считается недоверенным.

Обязательно:

- size limits;
- encoding validation;
- input sanitization;
- no code execution from payload;
- adapter authentication там, где источник сетевой;
- audit metadata;
- rate limiting / queue backpressure.

## 19. Acceptance criteria

- [ ] файл с КН-01 может автоматически породить task instances;
- [ ] socket-feed может работать тем же pipeline без изменения game engine;
- [ ] parser и encoder имеют versioned ruleset;
- [ ] decode/encode автоматически проверяются;
- [ ] raw input сохраняется;
- [ ] дубликаты не размножают задания;
- [ ] повреждённые сообщения уходят в quarantine;
- [ ] live feed можно заменить snapshot/archive без остановки игры;
- [ ] replay содержит source snapshot/ruleset version;
- [ ] преподаватель не нужен для проверки ответа.
