# Quality gates

**Статус:** proposed

Этот документ определяет минимальные проверки перед merge/release. Цель — не дать игровому, методическому и техническому слоям расходиться.

## Gate A — Documentation

- все внутренние Markdown-ссылки существуют;
- нет дублирующихся ID механик/задач/ADR;
- новый крупный модуль включён в `docs/README.md`;
- изменение архитектурной границы сопровождается ADR;
- новый термин не противоречит glossary/методическому профилю.

## Gate B — Content schema

- JSON валиден;
- ID уникальны;
- все `source_id` существуют;
- `method_profile` существует;
- required skills существуют;
- published pack не изменён задним числом;
- answer не попадает в client payload.

## Gate C — Methodology

Для задания, которое попадёт в Ranked/Exam:

- источник проверен;
- правильный ответ однозначен в выбранном method profile;
- distractors правдоподобны, но неверны по конкретной причине;
- explanation описывает принцип, а не только сообщает ответ;
- нет западной нотации вместо российской там, где профиль требует В/Н, П/Р и т. д.;
- реальный кейс имеет provenance.

## Gate D — Gameplay

- правильность важнее скорости;
- постоянная прокачка не даёт Ranked-преимущества;
- control/stun effects имеют cap;
- при одинаковом event stream результат deterministic;
- проигрыш не отнимает Mastery/учебный прогресс.

## Gate E — Realtime

- server authoritative;
- reconnect восстанавливает state;
- duplicate/out-of-order events обрабатываются;
- spectator не видит ответ раньше закрытия задачи;
- replay даёт тот же final state;
- клиентский таймер не может изменить серверный результат.

## Gate F — UX

- в active task главный объект занимает доминирующую область;
- mobile: одна задача — один фокус;
- touch targets достаточного размера;
- смысл не кодируется только цветом;
- reduced motion поддерживается;
- метеорологические цвета не подменяются декоративной темой.

## Gate G — Accessibility

- keyboard path для основных действий;
- focus states;
- readable contrast;
- screen-reader labels для обычных UI controls;
- альтернативные маркеры там, где цвет учебно значим.

## Gate H — Performance

Перед пилотом:

- бюджетный ноутбук/средний смартфон проходят core flow;
- карта не блокирует main thread заметными паузами;
- архивные assets lazy-load;
- spectator fan-out протестирован на аудиторию;
- reconnect тестируется на нестабильной сети.

## Gate I — Security/privacy

- нет секретов в frontend;
- authz проверяется сервером;
- административные действия логируются;
- input validation на API/WebSocket boundaries;
- rate limits для публичных realtime действий;
- не собираются камера/микрофон/геолокация без отдельной необходимости.

## Definition of Ready для задачи

Issue готова к разработке, если есть:

- проблема;
- scope;
- acceptance criteria;
- зависимости;
- нужный method profile/source для предметной задачи;
- UX reference для пользовательского изменения;
- тестовый сценарий.

## Definition of Done для feature

Feature готова, если:

- код/контент реализован;
- тесты зелёные;
- документация обновлена;
- telemetry определена, если нужна;
- нет открытых critical ambiguity по методике;
- изменение совместимо с replay/version policy или имеет migration decision.
