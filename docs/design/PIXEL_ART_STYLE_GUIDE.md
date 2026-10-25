# Pixel-art Style Guide

Status: `accepted-art-direction`

This document fixes the visual direction for the **Synoptic Center** game. It should be treated as the baseline for future UI, illustration, animation and front-end implementation unless superseded by an explicit design decision.

## 1. Visual goal

The game should feel like a **modern, cozy, high-quality pixel-art game**, not a retro parody and not an LMS dashboard with a pixel filter.

The desired emotional mix:

- competence and curiosity;
- evening research-campus atmosphere;
- warmth from interior lights against cool blue-violet skies;
- a sense that the center is alive even when the player is idle;
- a competitive layer that can become energetic without becoming militaristic;
- small recurring discoveries that make the player want to return.

The strongest reference is the hub screen. Other screens are specializations of the same world.

## 2. Fixed reference screens

### Hub / Synoptic Center

![Hub](../../design/pixel-art/01_hub.webp)

Defines:

- the world and campus;
- warm-window / cool-sky contrast;
- readable modular buildings;
- small moving people and environmental life;
- the primary CTA hierarchy;
- how secondary HUD elements stay visually quiet.

### Blitz

![Blitz](../../design/pixel-art/02_blitz.webp)

Defines:

- one-task-one-focus composition;
- task timer and streak;
- minimal queue of next task categories;
- supportive character reaction;
- short, positive feedback loops.

### Realtime duel

![Duel](../../design/pixel-art/03_duel.webp)

Defines:

- mirrored PvP composition;
- shared map as the dominant scene;
- Reliability and OR as peripheral HUD;
- parry / counter / combo effects;
- esports energy without hiding professional data.

### Inventory

![Inventory](../../design/pixel-art/04_inventory.webp)

Defines:

- character identity;
- funny but relevant synoptic equipment;
- collection UX;
- cosmetics and desk personalization;
- visual progression of tools.

### Tournament / spectator broadcast

![Tournament](../../design/pixel-art/05_tournament.webp)

Defines:

- projector-readable spectator hierarchy;
- classroom tournament atmosphere;
- team colors and event feed;
- tournament bracket and presenter layer;
- big-screen readability from several meters away.

### Progression / seasonal journey

![Progression](../../design/pixel-art/06_progression.webp)

Defines:

- reasons to return daily;
- mastery tracks;
- career progression;
- room unlocks;
- seasonal rewards and collectible cosmetics.

> The repository previews are deliberately lightweight. Production assets should be recreated as authored sprites, layers and reusable UI components rather than shipping these concept images as backgrounds.

## 3. Composition hierarchy

Every player-facing screen follows this hierarchy:

1. **Current situation / map / task** — dominant.
2. **One primary action** — immediately obvious.
3. **Match or session state** — Reliability, OR, timer, streak.
4. **Secondary navigation and progress.**
5. **Decorative world detail.**

Do not give equal visual weight to every panel.

A three-second glance must answer:

- what am I doing now?
- where do I act?
- am I doing well?
- what is interactive and what is scenery?

## 4. Pixel-art language

### 4.1. Modern pixel art, not low-resolution imitation

Use crisp clusters, controlled anti-aliasing and deliberate shapes. Avoid random one-pixel noise.

Recommended production workflow:

- build world/sprite art on a fixed logical pixel grid;
- upscale using nearest-neighbor where appropriate;
- allow standard vector/UI text layers above the pixel scene if that improves readability;
- never blur professional symbols or map labels just to make them “more pixel”.

### 4.2. Shape language

World:

- compact architectural silhouettes;
- rounded observatory domes;
- radio masts, anemometers, radomes, balloons;
- small trees, lamps, benches, books and map cabinets.

UI:

- dark navy panels;
- 1–2 px-style inner highlights;
- moderate corner chamfers/rounding;
- clear icon blocks;
- strong amber highlight for the primary CTA.

## 5. Palette roles

The exact colors belong in design tokens, but the role split is fixed.

### World palette

- dusk navy / indigo sky;
- violet and pink atmospheric gradients;
- warm amber / tungsten interiors;
- deep green vegetation;
- muted concrete / stone / steel.

### Game UI palette

- dark desaturated navy base;
- pale blue for neutral information;
- amber/gold for primary CTA and earned rewards;
- green for verified success;
- red only for error/opponent/negative event where it cannot be confused with meteorological semantics.

### Meteorological semantics

Professional map colors are reserved and must not be repurposed by generic UI effects.

Examples:

- warm front red;
- cold front blue;
- occlusion purple;
- map-lift colors and other profile-specific semantics stay under `--meteo-*` tokens.

Game cosmetics may never recolor a standard meteorological symbol inside an educational task.

## 6. Living background system

The hub should feel alive even when the user does nothing.

### Ambient loops

Use short loops assembled from sprites and transforms:

- birds cross the sky in small groups;
- clouds drift at multiple parallax speeds;
- flags and windsocks move gently;
- tower lights blink;
- radar dish rotates slowly;
- balloon rises or drifts in the far background;
- leaves/ivy move subtly;
- selected windows flicker as people pass;
- small staff sprites walk between rooms;
- paper corner or hanging map can flutter indoors.

### Animation budget

At any moment only a few ambient loops should draw attention. Background animation must never compete with a current task.

Recommended layers:

1. far sky/clouds;
2. mountains/city;
3. campus architecture;
4. ambient NPCs/animals;
5. UI;
6. feedback particles.

## 7. Birds and companions

Birds are a recurring “life signal” of the world.

Use:

- distant flock silhouettes in hub/tournament backgrounds;
- local birds on railings and windowsills;
- collectible companions such as `Синичка`, `Чайка` or regional species;
- tiny idle animations: head tilt, hop, wing shake, short flight.

Companions are cosmetic/social and must not create Ranked advantages.

## 8. Synoptician character

The player avatar should be recognizable but secondary to the map during work.

Character slots:

- headwear;
- jacket / field coat;
- backpack;
- footwear;
- held object;
- companion;
- profile badge.

Possible visual progression:

- practical student backpack;
- field jacket;
- archive/map case;
- aerology badge;
- tournament insignia;
- seasonal weather accessories.

The avatar may react to success/failure in Blitz and post-match screens, but should not obscure the task.

## 9. Inventory philosophy

Inventory is about identity, collection and playful professional tools — not pay-to-win stats.

### Core themed items

- **Front pencil** — red/blue, for front-related visual identity.
- **Isobar pencil** — soft black/graphite.
- **Cartographic ruler**.
- **Station plotting / puançon tool**.
- **Weather loupe**.
- **Archive notebook**.
- **Map layer cards**.
- **Radar token**.
- **Aerology balloon badge**.
- **Map case**.
- **Desk lamp**.
- **Pins and patches**.

### Pencil progression

Pencils are a recurring humorous collectible system.

Possible attributes are mostly visual/UX:

- body style;
- cap/end color;
- wear level;
- sharpened / soft tip animation;
- line preview thickness;
- seasonal skin;
- engraved achievement marks.

Example tiers:

1. Student pencil;
2. Field pencil;
3. Synoptic pencil;
4. Senior synoptician set;
5. Archival / commemorative edition.

Do not make a higher-level pencil reveal correct answers or alter Ranked scoring.

## 10. Screen-specific rules

### Hub

- 65–80% of the visual impression belongs to the world scene.
- Buildings are semantic shortcuts to competencies.
- One large CTA: `Начать смену`.
- Blitz, Duel, Inventory, Tournament, Archive and Tasks are secondary entrances.

### Blitz

- one large task surface;
- answers in thumb / eye-friendly zone;
- timer is visible but not dominant;
- combo feedback lasts under ~1 s before returning focus;
- assistant/avatar reaction is peripheral.

### Duel

- map/task remains central;
- Reliability bars symmetrical at top;
- effects occur outside or at edges of the map where possible;
- no screen shake that makes map labels unreadable;
- shield/parry/counter use icon + short light burst, not long particles.

### Tournament

- designed for projector first;
- large names, scores, round and map;
- event feed limited to latest important actions;
- instructor controls separated from the public layer;
- correct answer remains hidden until the rules allow revealing it.

### Inventory

- character + equipment slots form the main composition;
- item cards can be denser than active gameplay screens;
- preview animations on hover/select;
- stats shown for collection/progression should not imply Ranked power if none exists.

### Progression

- show path, rooms and tangible world changes;
- progression should unlock visual places, tasks and modes;
- avoid generic battle-pass visual clutter;
- rewards need a weather/research/campus theme.

## 11. Animation rules

### Useful animation

- map layer fades/slides in;
- isobar/front appears along the player’s actual path;
- correct station elements snap into place;
- Reliability changes with a short pulse;
- OR travels as a small energy pulse to the resource icon;
- parry absorbs an incoming effect;
- room upgrade adds a real environmental detail to the hub.

### Avoid

- constant full-screen particles;
- aggressive camera shake;
- rapid flashes behind meteorological data;
- animation longer than the learning action it acknowledges;
- decorative effects that recolor front symbols or observation data.

## 12. Reusable implementation primitives

The production design should be feasible without generative imagery at runtime.

Build the visual system from reusable authored pieces:

### CSS / SVG / DOM

- panel frames;
- buttons;
- meters;
- task cards;
- icons;
- tabs;
- bracket lines;
- progress tracks;
- map overlays where vector semantics are preferable.

### Canvas / WebGL

- synoptic map interaction;
- drawing fronts/isobars;
- smooth highlighting;
- particles limited to feedback;
- optional parallax world layers.

### Sprite sheets

- characters;
- birds;
- flags;
- radar dish;
- balloon;
- plants;
- lights;
- small room activity;
- weather companions;
- tool item animations.

## 13. Suggested sprite scales

These are starting points, not hard engine limits:

- tiny ambient NPC: 16×24 or 20×28 logical px;
- main avatar: 32×48 / 48×64 logical px;
- bird: 8×8 to 16×12;
- item icon: 24×24 or 32×32;
- building module: tiled / layered, not one giant bitmap;
- feedback effect: 16–48 px with short lifetime.

Use integer scaling for sprite art where possible.

## 14. Return-to-game atmosphere

The world should change gently so the center feels inhabited.

Possible non-gameplay variation:

- sunrise / day / sunset / night lighting;
- rain on windows;
- first snow;
- fog in the valley;
- clear starry night;
- seasonal plants and banners;
- different birds by season;
- different NPC routines;
- a rare balloon or aircraft pass;
- lights switching on in unlocked rooms.

These are visual variations and should not fabricate meteorological observations used in a task.

## 15. Accessibility

Pixel art must not reduce usability.

- task text uses a highly legible font with Cyrillic support;
- text does not need to be a pixel font if readability suffers;
- color is never the only carrier of correctness;
- front symbols retain shape differences;
- reduced-motion mode disables parallax and most ambient loops;
- map information can be zoomed;
- projector mode uses larger type and reduced decorative density.

## 16. Acceptance checklist for new screens

A new screen belongs to this visual system if:

- [ ] it clearly shares the same campus/world palette;
- [ ] the active task is visually dominant when learning is happening;
- [ ] pixel art supports, rather than reduces, readability;
- [ ] professional symbols remain semantically correct;
- [ ] background life is subtle and loopable;
- [ ] important animation communicates cause/effect;
- [ ] no cosmetic creates Ranked advantage;
- [ ] the screen can be decomposed into reusable sprites/shapes/components;
- [ ] mobile and reduced-motion variants are feasible;
- [ ] it is visually recognizable as the same game as the six fixed references above.

## 17. Change policy

A large visual change should update this guide and, if it changes product identity, be accompanied by an ADR.

Examples requiring explicit review:

- switching away from pixel art;
- replacing the campus world with a pure dashboard;
- making characters the dominant object in professional tasks;
- changing semantic meteorological colors;
- introducing visually noisy combat effects;
- changing inventory from cosmetic/collection to Ranked power.
