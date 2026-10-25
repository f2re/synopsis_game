# Screen map

**Статус:** proposed

Цель — зафиксировать пространство продукта и не допустить превращения student UI в перегруженный dashboard.

## 1. Student routes

```text
/
├── home
├── play/
│   ├── daily-shift
│   ├── blitz
│   ├── duel/:matchId
│   ├── team/:matchId
│   └── raid/:scenarioId
├── learn/
│   ├── skills
│   ├── module/:moduleId
│   └── errors
├── map/:scenarioId
├── replay/:replayId
├── league
└── profile
```

## 2. Instructor routes

```text
/instructor
├── groups
├── group/:id
├── room/create
├── tournament/:id
├── live/:matchId
├── content
├── analytics
└── replay/:id
```

## 3. Spectator routes

```text
/watch/:matchId
/tournament/:id/stage
/projector/:roomId
```

## 4. Home

Главный фокус — **одно действие**: «Начать смену» или актуальный сценарий.

Вторичный слой:

- daily tasks;
- прогресс навыков;
- лига;
- достижения;
- текущий сезон.

Не показывать одновременно полный leaderboard, всю карту навыков, магазин, архив и аналитику.

## 5. Active task

Desktop:

```text
┌───────────────────────────────────────────┐
│ Player A      Round / Timer      Player B │
├───────────────────────────────────────────┤
│                                           │
│             MAP / TASK / DATA             │
│                                           │
├───────────────────────────────────────────┤
│ answer controls / tools / OR              │
└───────────────────────────────────────────┘
```

Mobile:

```text
┌───────────────────┐
│ compact match HUD │
├───────────────────┤
│                   │
│    TASK / MAP     │
│                   │
├───────────────────┤
│ answer controls   │
└───────────────────┘
```

## 6. Map workspace

Режимы:

- fullscreen;
- layers;
- previous term;
- split view;
- АТ/ОТ switching;
- draw/select mode;
- station focus.

Во время задания карта не должна быть уменьшенной декоративной карточкой.

## 7. Post-task

### Ranked

Короткий feedback до закрытия раунда, подробное объяснение после того, как оно не может помочь сопернику.

### Solo

Сразу показывать:

- правильность;
- объяснение;
- source;
- тип ошибки;
- действие «повторить похожее».

## 8. Spectator

Показывать крупно:

- игроков;
- Надёжность;
- current category;
- map/task visual;
- streak;
- tournament stage;
- результат закрытого задания.

Не показывать элементы ввода игрока.

## 9. Instructor live

Допустима высокая плотность:

- ответы;
- response time;
- reason codes;
- mastery;
- latency;
- replay markers;
- aggregate group accuracy.

Instructor UI не является визуальным шаблоном student UI.

## 10. Navigation principle

В активной игре обычная навигация сворачивается. Игрок не должен случайно уйти с матча обычным tap по sidebar.

## 11. Responsive breakpoints

Точные значения задаются design system, но функциональные режимы:

- phone portrait;
- phone landscape;
- tablet;
- laptop;
- desktop widescreen;
- projector.

## 12. UX acceptance

За 3 секунды пользователь должен понять:

1. какая задача активна;
2. какое действие главное;
3. где состояние матча;
4. что относится к метеоданным;
5. что относится к game UI.
