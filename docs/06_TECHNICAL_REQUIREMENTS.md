# 06. Технические требования и архитектура

## 1. Принцип архитектуры

Проект должен быть **web-first**, адаптивным и пригодным для запуска:

- на обычном ноутбуке преподавателя;
- на компьютерах учебного класса;
- на смартфонах студентов;
- на проекторе/большом экране в spectator mode.

Клиент не должен требовать установки нативного приложения для базового сценария.

## 2. Предлагаемый стек MVP

### Frontend

- TypeScript;
- React или другой компонентный web-framework;
- CSS/utility layer;
- Canvas/SVG для карт, станционных моделей и интерактивной геометрии;
- PWA как опция.

### Backend

- Node.js + TypeScript;
- REST/HTTP для аккаунта, контента и истории;
- WebSocket/Socket.IO для матчей;
- schema validation на границах API.

### Data

Для локального прототипа допустим SQLite.

Для многопользовательской версии:

- PostgreSQL — основная БД;
- Redis — presence, pub/sub, match coordination при масштабировании;
- object storage — изображения карт, архивные пакеты и крупные ассеты.

Стек не является обязательным стандартом: доменная модель должна позволять заменить конкретные технологии.

## 3. Модули системы

```text
apps/
  web/
  server/
  spectator/
packages/
  game-rules/
  content-schema/
  meteorology-domain/
  realtime-protocol/
  ui/
  replay/
content/
  method-profiles/
  packs/
  sources/
  scenarios/
```

На раннем этапе `spectator` может быть route внутри `web`.

## 4. Meteorology domain

Отдельный пакет должен содержать только предметную модель:

- station observation;
- KN code abstractions;
- map layers;
- pressure systems;
- fronts;
- upper-air levels;
- terminology IDs;
- task answer types.

Не помещать сюда UI и боевой баланс.

## 5. Game rules

Отдельный deterministic пакет:

- reliability;
- OR;
- effects;
- combo;
- cooldown;
- round state machine;
- scoring.

По возможности он должен запускаться одинаково на сервере и в тестах клиента, но авторитетным остаётся сервер.

## 6. Content engine

Функции:

- загрузка versioned content packs;
- schema validation;
- method profile resolution;
- task generation;
- answer validation;
- difficulty metadata;
- source provenance.

## 7. Map/graphics engine

Требования:

- слои;
- масштабирование/панорамирование;
- SVG/Canvas overlays;
- линии фронтов;
- изобары/изаллобары;
- station plots;
- геометрические ответы;
- возможность показывать original source image под векторными интерактивными слоями;
- отдельные режимы desktop/mobile.

Не следует на первом этапе строить полноценную ГИС. Нужен специализированный учебный renderer.

## 8. Accounts and roles

Роли:

- `student`;
- `instructor`;
- `content_author`;
- `method_reviewer`;
- `admin`.

Права должны проверяться сервером.

## 9. Группы и курсы

Сущности:

- institution;
- course;
- cohort/group;
- assignment;
- tournament;
- content profile;
- grading policy.

Один пользователь может состоять в нескольких курсах.

## 10. Учёт прогресса

Разделять:

- immutable attempt log;
- агрегированную статистику;
- mastery state;
- PvP rating;
- achievements;
- course grade/export.

Не использовать один `score` для всего.

## 11. Realtime server

Match state machine:

```text
CREATED
  ↓
LOBBY
  ↓
READY
  ↓
RUNNING
  ↓
ROUND_TRANSITION
  ↓
FINISHED
```

Дополнительные состояния:

- PAUSED (только разрешённые режимы);
- ABORTED;
- RECOVERING.

## 12. Авторитетность сервера

На сервере обязательно:

- выбор/генерация задания;
- deadline;
- проверка;
- начисление эффекта;
- рейтинг;
- финальный результат.

Клиентское состояние считается представлением серверного state.

## 13. Security basics

- TLS;
- secure cookies/token storage;
- rate limits;
- input validation;
- CSRF/XSS protection согласно выбранной auth-модели;
- отсутствие секретов в frontend bundle;
- server-side authorization;
- audit log административных действий;
- signed/immutable version IDs для опубликованных content packs.

## 14. Privacy by design

Собирать только данные, необходимые для учебной и игровой функции.

По умолчанию не требуются:

- камера;
- микрофон;
- геолокация;
- телефонная книга;
- биометрия.

Для учебных организаций предусмотреть удаление/архивирование данных по политике учреждения.

## 15. Accessibility

Обязательно:

- клавиатурное управление;
- screen-reader labels для обычных UI-элементов;
- настройка размера текста;
- не кодировать смысл только цветом;
- отдельные паттерны/символы для фронтов и статусов;
- режим повышенной контрастности;
- предупреждение для быстро мигающих эффектов;
- возможность уменьшить анимацию.

Цвета метеорологических карандашей сохраняются там, где это учебно значимо, но дополняются формой/легендой.

## 16. Responsive UX

### Desktop

- карта/задача — доминирует;
- быстрые действия доступны без прокрутки;
- вторичные панели компактны.

### Mobile

- одна задача на экран;
- крупные touch-targets;
- горизонтальные карусели навыков допустимы только вне активной задачи;
- карта имеет fullscreen mode;
- PvP состояние закреплено в компактной верхней полосе.

### Projector

- крупная типографика;
- минимальный текст;
- spectator-first layout;
- нет элементов управления игрока.

## 17. Offline/poor network

Solo-тренировка может кэшировать:

- content pack;
- assets;
- локальные попытки.

Рейтинговый PvP требует соединения.

После восстановления сети solo attempts синхронизируются с conflict policy.

## 18. Testing

### Unit

- game rules;
- decoders/encoders;
- content validators;
- scoring;
- method profile resolver.

### Property-based

- генераторы кодовых задач;
- эквивалентные PvP-задачи;
- сериализация replay;
- допустимые sequence permutations.

### Integration

- REST;
- WebSocket match lifecycle;
- reconnect;
- content pack publishing.

### E2E

- студент проходит solo;
- два игрока завершают duel;
- преподаватель создаёт tournament;
- spectator подключается к активному матчу;
- replay совпадает с итогом.

## 19. Content CI

Каждый PR с контентом должен запускать:

- schema validation;
- source-link validation;
- duplicate IDs;
- answer validation;
- generation smoke tests;
- prohibited notation checks для method profile;
- screenshot/regression test для ключевых task renderers.

## 20. Telemetry

Продуктовые события:

- task_started;
- task_answered;
- hint_used;
- explanation_opened;
- match_started/finished;
- reconnect;
- replay_opened;
- content_error_reported.

Учебные события должны быть отделены от маркетинговой аналитики.

## 21. Performance budget

Цели задаются на этапе прототипа, но архитектурно требуется:

- быстрый first interaction;
- отсутствие тяжёлой 3D-сцены в обязательном потоке;
- lazy-loading архивных карт;
- оптимизированные SVG/растровые тайлы;
- устойчивость на бюджетных студенческих ноутбуках и средних смартфонах.

## 22. API boundaries

Рекомендуемые домены API:

```text
/auth
/courses
/content
/tasks
/progress
/matches
/tournaments
/replays
/leaderboards
/admin/content
```

WebSocket namespace/channel должен быть отдельным от обычного REST.

## 23. Export

Преподавателю необходимы:

- CSV/JSON результатов;
- отчёт по навыкам;
- журнал типичных ошибок;
- история турнира;
- ссылки/идентификаторы replay.

Экспорт не должен содержать лишние персональные данные.

## 24. Definition of Done для технического ядра

Ядро готово к пилоту, когда:

- content pack загружается и валидируется;
- минимум 5 типов задач работают desktop/mobile;
- прогресс сохраняется;
- realtime 1v1 устойчив к reconnect;
- spectator mode работает;
- instructor может создать группу/матч;
- replay воспроизводится;
- тесты правил и контента выполняются в CI;
- нет клиентского доступа к правильным ответам до проверки сервером.
