# Foundation Epics — living world, live data, autonomous arena, roster, avatar

**Статус:** proposed

Этот backlog раскладывает принятые фундаментальные идеи на исполнимые эпики.

## EPIC WORLD — Living World

### WORLD-001 — Time-of-day state machine

- рассвет / день / сумерки / вечер / ночь;
- server/local installation time profile;
- accelerated demo profile;
- lighting tokens and masks.

**Done:** переход между состояниями не требует смены полного background bitmap.

### WORLD-002 — Ambient layer engine

- clouds;
- birds;
- flags;
- radar;
- tower lights;
- NPC;
- trees;
- water.

**Done:** минимум 6 независимых loops + battle-focus density profile.

### WORLD-003 — Interactive world objects

- birds;
- squirrel;
- radar;
- balloon;
- archive window;
- fountain/globe.

**Done:** минимум 5 interactables с короткой реакцией.

### WORLD-004 — Discoveries

- collection schema;
- rare ambient event;
- persistence;
- cosmetic-only reward hook.

### WORLD-005 — Reduced motion

**Done:** parallax/continuous loops отключаются без потери состояния мира.

---

## EPIC LIVE-KN01 — Real observation pipeline

### KN01-LIVE-001 — Raw ingress

- file spool;
- batch fixture;
- TCP/WebSocket adapter interface;
- raw immutable storage.

### KN01-LIVE-002 — Station registry

- station resolver;
- aliases;
- active/inactive;
- coordinates and metadata.

### KN01-LIVE-003 — Versioned codec

- parser;
- encoder;
- ruleset ID;
- round-trip tests.

### KN01-LIVE-004 — QC / quarantine

- malformed payload;
- unknown station;
- stale timestamp;
- duplicate;
- parser mismatch.

### KN01-LIVE-005 — Snapshot pack builder

**Done:** validated live data can be frozen into a deterministic match/replay pool.

### KN01-LIVE-006 — Task generator

Generate:

- decode temperature;
- decode pressure;
- wind;
- ww;
- station plot;
- encode group;
- critique variants.

### KN01-LIVE-007 — Feed failover

`live → recent snapshot → cache → archive`.

---

## EPIC AUTO-ARENA — Autonomous game/broadcast runtime

### ARENA-001 — Matchmaking queue

- active roster;
- rating constraints;
- mode preference;
- fair pairing.

### ARENA-002 — Automatic tournament progression

- qualifier;
- bracket;
- advancement;
- rewards;
- no instructor action required.

### ARENA-003 — Broadcast selector

Ranking inputs:

- tournament stage;
- ratings;
- score closeness;
- streak/comeback;
- scene dwell time.

### ARENA-004 — Arena TV client

- fullscreen;
- read-only display role;
- reconnect;
- kiosk startup;
- spectator-safe data.

### ARENA-005 — Attract mode

- living hub;
- leaderboard;
- recent achievements;
- demo replay;
- short educational captions.

### ARENA-006 — Highlight engine

- comeback;
- combo;
- parry;
- final round;
- record;
- automatic replay snippet.

### ARENA-007 — Watchdog/offline fallback

**Done:** display never remains blank on backend failure.

---

## EPIC IDENTITY — Closed roster and simple login

### ID-001 — Admin roster CRUD

- create;
- disable;
- group;
- roles;
- reset code.

### ID-002 — CSV/JSON roster import

- validation;
- conflict report;
- dry-run.

### ID-003 — Classroom login

`group → user → PIN/code → session`.

### ID-004 — Security profiles

- `trusted-classroom`;
- `public-internet`;
- rate limits;
- progressive delay;
- lockout.

### ID-005 — Display role

Read-only spectator credentials with no private data.

### ID-006 — Temporary guest roster

For school/open-day events.

---

## EPIC AVATAR — Personalized synoptician

### AVATAR-001 — Avatar schema

- body/skin tone;
- hair;
- headwear;
- clothes;
- footwear;
- backpack;
- held item;
- companion;
- badge.

### AVATAR-002 — First-login creator

Target: finish in under 60 seconds.

### AVATAR-003 — Starter style packs

- sport;
- strict;
- field;
- tourist;
- lab/student.

### AVATAR-004 — Cosmetic inventory

- rarity;
- unlock provenance;
- preview;
- equip.

### AVATAR-005 — Pencil collection

- front pencil;
- isobar pencil;
- map-lift set;
- visual level/tier;
- sharpening/idle animations.

### AVATAR-006 — Companion system

- tit;
- seagull;
- cormorant;
- bullfinch;
- squirrel/event pets.

### AVATAR-007 — Reward hooks

Connect rewards to:

- Blitz;
- Duel;
- tournament;
- mastery;
- achievement;
- archive boss;
- World Discovery.

**Hard rule:** no Ranked power.

---

## Suggested implementation order

```text
ID-001/003
    ↓
KN01-LIVE-001/003/005
    ↓
basic task generator
    ↓
ARENA-001/003/004
    ↓
WORLD-001/002
    ↓
AVATAR-001/002
    ↓
WORLD interactables + cosmetics
    ↓
full autonomous tournament/highlights
```

## Foundation Gate

Новая концепция считается реально вошедшей в продукт, когда одновременно работают:

- закрытый roster + быстрый login;
- один live КН-01 source → автоматически проверяемая задача;
- один полностью автономный 1v1;
- Arena TV самостоятельно показывает матч и возвращается в attract-mode;
- хаб имеет минимум 4 time-of-day состояния;
- avatar сохраняется и виден в duel/spectator;
- награда за матч открывает cosmetic item без влияния на Ranked.
