# 03. Онлайн PvP, батлы, автономные трансляции и replay

## 1. Цель онлайн-слоя

Онлайн-режим превращает учебную работу в короткое живое соревнование, пригодное для самостоятельной игры, учебной группы и публичного показа.

Ключевой принцип после обновления концепции: **основной realtime-runtime работает без преподавателя-оператора**.

Система сама:

- формирует очередь матчей;
- подбирает соперников;
- выдаёт задания;
- проверяет ответы;
- ведёт турнир;
- считает rating/mastery;
- выбирает матч для большого экрана;
- переключает spectator scenes;
- завершает матч и запускает следующий;
- строит replay/highlight.

Преподаватель может наблюдать, настраивать профиль курса и делать административный override, но не обязан вручную запускать каждую игровую операцию.

## 2. Основные сценарии

- 1v1;
- 2v2 и 3v3;
- массовый Blitz;
- автоматический турнир группы;
- scheduled tournament/event;
- spectator mode;
- autonomous Arena TV;
- replay/highlights;
- attract-mode для экрана, когда матчей нет.

## 3. Модель матча

Сервер является авторитетным источником состояния.

Клиент отвечает только за:

- визуализацию;
- ввод ответа;
- локальную анимацию;
- предварительный UX таймера.

Сервер отвечает за:

- выбор/генерацию задания;
- проверку ответа;
- таймер;
- OR;
- эффекты;
- Надёжность;
- рейтинг;
- завершение раунда;
- event log;
- tournament progression.

## 4. Событийная модель

Минимум:

```text
MATCH_CREATED
PLAYER_JOINED
MATCH_READY
MATCH_START
ROUND_START
TASK_START
ANSWER_SUBMITTED
ANSWER_ACCEPTED
ANSWER_REJECTED
TASK_RESULT
RESOURCE_CHANGED
ABILITY_USED
EFFECT_APPLIED
SHIELD_APPLIED
PARRY
COUNTER
COMBO_CHANGED
RELIABILITY_CHANGED
ROUND_END
MATCH_END
PLAYER_DISCONNECTED
PLAYER_RECONNECTED
TOURNAMENT_ADVANCED
BROADCAST_SELECTED
BROADCAST_SCENE_CHANGED
HIGHLIGHT_CREATED
```

Все события имеют server timestamp и sequence number.

## 5. WebSocket-транспорт

```text
Player A ─┐
          ├── WebSocket ── Match Server ── Event Store
Player B ─┘                    │
                              ├── Spectators
                              ├── Broadcast Selector
                              ├── Arena TV
                              └── Replay Renderer
```

Для MVP допустим Socket.IO.

## 6. Почему не нужна видеотрансляция

Сервер передаёт **состояние и события**, а не видеопоток.

Это позволяет:

- масштабировать число зрителей;
- строить отдельный projector UI;
- автоматически переключать матчи;
- воспроизводить replay;
- скрывать правильный ответ до нужного момента;
- менять язык/масштаб независимо от клиента игрока.

## 7. Spectator mode

Зритель видит:

- карту/ситуацию;
- тему задачи;
- Надёжность;
- OR;
- combo;
- применённые действия;
- точность;
- последние события;
- avatar/nickname;
- турнирную стадию.

До закрытия задачи правильный ответ скрыт.

После закрытия система может показать краткое объяснение, не требующее преподавателя.

## 8. Arena TV / autonomous display

Большой экран — отдельный read-only клиент.

Он не ждёт действий преподавателя и самостоятельно выбирает сцену.

Приоритет по умолчанию:

1. финал;
2. полуфинал;
3. матч сильнейших игроков;
4. очень близкий матч;
5. камбэк/сильная серия;
6. массовый Blitz;
7. highlight replay;
8. leaderboard;
9. living-world attract mode.

Подробно: [`realtime/AUTONOMOUS_ARENA_DISPLAY.md`](realtime/AUTONOMOUS_ARENA_DISPLAY.md).

## 9. Broadcast selector

Selector работает только на чтение match/tournament state.

Он оценивает:

- stage;
- rating участников;
- близость счёта;
- streak;
- remaining Reliability;
- редкие игровые события;
- длительность текущего показа.

Он **не может** менять исход матча.

## 10. Автоматический турнир

Турнир может создаваться:

- расписанием;
- admin preset;
- автоматически для активной группы по configured policy;
- событием/сезоном.

После старта система сама:

1. фиксирует participants из разрешённого roster;
2. строит bracket/qualifier;
3. запускает раунды;
4. двигает победителей;
5. обновляет broadcast;
6. завершает event;
7. выдаёт награды.

Преподаватель не обязан создавать комнату в начале каждого турнира.

## 11. Mass qualifier

1. активные участники получают синхронные или эквивалентные задания;
2. проводится N коротких раундов;
3. система строит таблицу;
4. top-N переходят в playoff;
5. Arena TV автоматически переключается на ключевые матчи.

## 12. Mirror и Equivalent

### Mirror

Одинаковое задание обоим.

### Equivalent

Разные данные близкой сложности.

Для live КН-01 Equivalent может использовать разные реальные станции из одного snapshot pool.

Для Ranked предпочтителен Equivalent, если генератор прошёл fairness validation.

## 13. Live-data snapshot

Внешний поток КН-01 не должен быть синхронной зависимостью каждого вопроса.

Перед матчем формируется фиксированный `live_snapshot_id`/task pool.

Преимущества:

- fairness;
- replay;
- failover;
- одинаковая версия ruleset;
- защита от изменения данных посреди раунда.

См. [`content/LIVE_KN01_PIPELINE.md`](content/LIVE_KN01_PIPELINE.md).

## 14. Синхронизация таймеров

Каждая задача получает:

- `server_started_at`;
- `deadline_at`;
- `grace_window_ms`;
- `sequence`.

Клиент рисует таймер, сервер принимает решение.

## 15. Переподключение

- короткий disconnect не завершает матч немедленно;
- клиент запрашивает snapshot;
- сервер отдаёт state + sequence;
- event gap восстанавливается;
- после policy timeout применяется режим конкретного типа матча.

## 16. Replay

Replay хранится как event log, а не видео.

```json
{
  "seq": 153,
  "time_ms": 36420,
  "player_id": "p1",
  "event": "TASK_RESULT",
  "task_instance_id": "x7823",
  "correct": true,
  "duration_ms": 4820,
  "effect": "QUICK_HIT",
  "value": 6
}
```

Manifest хранит:

- game-rules version;
- balance version;
- content pack / live snapshot;
- KN01 ruleset при необходимости;
- seed;
- method profile;
- task instance data;
- events.

## 17. Highlight engine

Автоматически помечаются:

- comeback;
- серия;
- parry/counter;
- сложное быстрое решение;
- минимальный запас Reliability;
- финальный раунд;
- рекорд.

Highlight может автоматически попасть в Arena TV после завершения live match.

## 18. Post-match

Система автоматически показывает:

- результат;
- точность;
- среднее/медианное время;
- наиболее дорогие ошибки;
- темы для повторения;
- mastery delta;
- награды;
- replay markers.

Ручная оценка преподавателя для обычной петли не требуется.

## 19. Instructor/Admin mode

Это **не обязательный runtime-компонент**.

Инструктор/администратор может:

- посмотреть статистику;
- выбрать course/method profile;
- временно остановить нерейтинговое событие;
- исключить повреждённый content pack;
- пометить replay;
- сделать broadcast override;
- управлять roster.

Нельзя задним числом менять исход Ranked матча без отдельной административной процедуры/audit event.

## 20. Античит

- правильный ответ не отправляется заранее;
- server-side validation;
- server-side effects/rating;
- signed task instance;
- server-selected seed;
- impossible-time detection;
- suspicious pattern telemetry;
- rate limits.

Античит не требует камеры/микрофона.

## 21. Приватность публичного экрана

Arena TV показывает только разрешённые поля:

- nickname/display name;
- avatar;
- team/group при разрешении;
- игровые показатели.

Никогда не показываются PIN, email, internal IDs или приватные комментарии.

## 22. Наблюдаемость

Метрики:

- active matches;
- connected players;
- spectators;
- display clients;
- broadcast scene duration;
- selector switches;
- event lag;
- p50/p95 latency;
- reconnect rate;
- match completion rate;
- content errors;
- live snapshot age.

## 23. Fail-safe

Если content/live-data сервис недоступен:

- уже начатый матч использует snapshot;
- новые матчи используют cached validated pool;
- далее archive pack;
- Arena TV переходит в replay/leaderboard/living-world attract mode;
- пустой экран недопустим.

## 24. Kiosk requirements

Display client должен:

- auto-start fullscreen;
- иметь role `display`;
- reconnect автоматически;
- восстанавливать broadcast state;
- не иметь player/admin controls;
- иметь watchdog/reload policy;
- работать длительно без оператора.

## 25. Acceptance criteria realtime MVP+

- [ ] два браузера завершают 1v1 без рассинхронизации;
- [ ] сервер сам проверяет ответы;
- [ ] tournament может пройти без ручного переключения bracket;
- [ ] spectator подключается в середине матча;
- [ ] Arena TV сам выбирает live match;
- [ ] после матча Arena TV автоматически переключается;
- [ ] при отсутствии матчей запускается attract mode;
- [ ] replay воспроизводит итог;
- [ ] reconnect восстанавливает state;
- [ ] преподаватель не нужен для оценки результата;
- [ ] live-data snapshot не ломает replay/fairness;
- [ ] клиент не может подменить таймер/правильный ответ.
