# Матрица перегенерации ассетов

Каждая строка — отдельная image-generation задача и отдельный output-файл. `BATCH-XX` содержит ровно 10 jobs. Batch не является одним image prompt.

## BATCH-00 — gold set / калибровка

| Job | Semantic ID | Класс | Final grid | Anchor | Production folder |
|---|---|---|---:|---|---|
| 00-01 | `character.player.world.idle.down` | world_character | 32×48 | bottom-center | `assets/source/characters/player/` |
| 00-02 | `character.player.inventory.master` | inventory_avatar | 160×240 | bottom-center | `assets/source/characters/player/` |
| 00-03 | `portrait.mentor.neutral` | dialogue_portrait | 256×320 | bottom-center | `assets/source/characters/portraits/` |
| 00-04 | `companion.pascal.idle` | companion_sprite | 48×48 | bottom-center | `assets/source/animals/` |
| 00-05 | `companion.tit.idle` | companion_sprite | 48×48 | bottom-center | `assets/source/animals/` |
| 00-06 | `prop.meteo.anemometer.handheld` | prop_sprite | 64×64 | center | `assets/source/props/meteo/` |
| 00-07 | `prop.meteo.front_pencil` | prop_sprite | 64×64 | center | `assets/source/props/meteo/` |
| 00-08 | `vegetation.nw.pine.medium` | vegetation_sprite | 64×96 | bottom-center | `assets/source/environment/vegetation/` |
| 00-09 | `prop.hub.lamp.warm` | prop_sprite | 48×80 | bottom-center | `assets/source/props/furniture/` |
| 00-10 | `scene.hub.geometry_master.dusk` | large_scene | 480×270 | 0,0 | `assets/source/environment/hub/` |

`inventory_avatar` добавлен как отдельный класс для экрана инвентаря: он не должен быть растянутой версией 32×48 world sprite. Цель — сохранить идентичность персонажа, но дать достаточно места одежде и аксессуарам.

## BATCH-01 — avatar: волосы, головные уборы, верх

Все эти изображения — **слои**, привязанные к принятому silhouette template персонажа. При генерации использовать 00-02 как image reference, не менять базовую позу/анатомию.

| Job | Semantic ID | Final grid | Layer |
|---|---|---:|---|
| 01-01 | `avatar.hair.short` | 160×240 full canvas | hair |
| 01-02 | `avatar.hair.bob` | 160×240 full canvas | hair |
| 01-03 | `avatar.hair.braid` | 160×240 full canvas | hair |
| 01-04 | `avatar.hair.curly` | 160×240 full canvas | hair |
| 01-05 | `avatar.headwear.ushanka` | 160×240 full canvas | headwear |
| 01-06 | `avatar.headwear.cap` | 160×240 full canvas | headwear |
| 01-07 | `avatar.headwear.glasses` | 160×240 full canvas | headwear/front-face |
| 01-08 | `avatar.top.lab_coat` | 160×240 full canvas | torso/front |
| 01-09 | `avatar.top.field_jacket` | 160×240 full canvas | torso/front |
| 01-10 | `avatar.top.parka` | 160×240 full canvas | torso/front |

Folder: `assets/source/characters/player/layers/`.

## BATCH-02 — avatar: низ, обувь, рюкзаки

| Job | Semantic ID | Final grid | Layer |
|---|---|---:|---|
| 02-01 | `avatar.top.sweater` | 160×240 | torso/front |
| 02-02 | `avatar.bottom.field_cargo` | 160×240 | legs |
| 02-03 | `avatar.bottom.slacks` | 160×240 | legs |
| 02-04 | `avatar.bottom.overalls` | 160×240 | legs + torso-under |
| 02-05 | `avatar.footwear.boots` | 160×240 | feet |
| 02-06 | `avatar.footwear.shoes` | 160×240 | feet |
| 02-07 | `avatar.footwear.felt` | 160×240 | feet |
| 02-08 | `avatar.backpack.satchel` | 160×240 | back/strap-front |
| 02-09 | `avatar.backpack.field` | 160×240 | back/strap-front |
| 02-10 | `avatar.backpack.radio` | 160×240 | back/strap-front |

Folder: `assets/source/characters/player/layers/`.

## BATCH-03 — held items, badges, companion poses

| Job | Semantic ID | Class | Grid |
|---|---|---|---:|
| 03-01 | `avatar.held.front_pencil` | avatar overlay | 160×240 full canvas |
| 03-02 | `avatar.held.clipboard_kn01` | avatar overlay | 160×240 full canvas |
| 03-03 | `avatar.held.anemometer_ari49` | avatar overlay | 160×240 full canvas |
| 03-04 | `avatar.held.flashlight` | avatar overlay | 160×240 full canvas |
| 03-05 | `avatar.held.map_folder` | avatar overlay | 160×240 full canvas |
| 03-06 | `avatar.badge.meteo` | avatar overlay | 160×240 full canvas |
| 03-07 | `avatar.badge.aerology` | avatar overlay | 160×240 full canvas |
| 03-08 | `companion.squirrel.idle` | companion_sprite | 48×48 |
| 03-09 | `companion.tit.perched` | companion_sprite | 48×48 |
| 03-10 | `companion.pascal.curled` | companion_sprite | 48×48 |

Folders: character overlays → `assets/source/characters/player/layers/`; animals → `assets/source/animals/`.

## BATCH-04 — inventory tool icons

| Job | Semantic ID | Grid | Folder |
|---|---|---:|---|
| 04-01 | `inventory.tool.front_pencil` | 128×128 master | `assets/source/props/inventory/` |
| 04-02 | `inventory.tool.isobar_pencil` | 128×128 master | same |
| 04-03 | `inventory.tool.cartographic_ruler` | 128×128 master | same |
| 04-04 | `inventory.tool.station_stamp` | 128×128 master | same |
| 04-05 | `inventory.tool.magnifier` | 128×128 master | same |
| 04-06 | `inventory.tool.archive_notebook` | 128×128 master | same |
| 04-07 | `inventory.tool.map_layers` | 128×128 master | same |
| 04-08 | `inventory.tool.radar_token` | 128×128 master | same |
| 04-09 | `inventory.tool.aerology_balloon_badge` | 128×128 master | same |
| 04-10 | `inventory.tool.tit_companion_badge` | 128×128 master | same |

Derivatives 64/32 создаёт pipeline, а не генератор.

## BATCH-05 — Hub: foreground, animated landmarks, ambient NPC

| Job | Semantic ID | Class | Grid | Layer |
|---|---|---|---:|---|
| 05-01 | `hub.foreground.railing` | foreground_occluder | 480×270 full scene | foreground |
| 05-02 | `hub.foreground.conifer_canopy` | foreground_occluder | 480×270 full scene | foreground |
| 05-03 | `hub.prop.weather_balloon` | prop_sprite | 64×96 | world/front |
| 05-04 | `hub.prop.windsock` | prop_sprite | 64×64 | world/front |
| 05-05 | `hub.prop.radar_dish` | prop_sprite | 96×96 | world/front |
| 05-06 | `hub.npc.student_a` | world_character | 32×48 | world/front |
| 05-07 | `hub.npc.student_b` | world_character | 32×48 | world/front |
| 05-08 | `hub.npc.observer` | world_character | 32×48 | world/front |
| 05-09 | `hub.landmark.globe_fountain` | interactive_object | 96×112 | world/front |
| 05-10 | `hub.prop.park_bench` | prop_sprite | 96×48 | world/front |

## BATCH-06 — Shift/Blitz workspace

| Job | Semantic ID | Class | Grid |
|---|---|---|---:|
| 06-01 | `scene.workspace.geometry_master.dusk` | large_scene | 480×270 |
| 06-02 | `portrait.mentor.encouraging` | dialogue_portrait edit | 256×320 |
| 06-03 | `portrait.mentor.focused` | dialogue_portrait edit | 256×320 |
| 06-04 | `portrait.mentor.correct` | dialogue_portrait edit | 256×320 |
| 06-05 | `portrait.mentor.wrong_gentle` | dialogue_portrait edit | 256×320 |
| 06-06 | `workspace.prop.teletype` | prop_sprite | 96×80 |
| 06-07 | `workspace.prop.desk_lamp` | prop_sprite | 64×80 |
| 06-08 | `workspace.prop.synoptic_map_stack` | prop_sprite | 96×64 |
| 06-09 | `workspace.prop.pencil_cup` | prop_sprite | 48×64 |
| 06-10 | `workspace.prop.mug_cloud` | prop_sprite | 48×48 |

Portrait jobs 06-02…06-05 должны быть image edits от принятого 00-03, а не новыми персонажами.

## BATCH-07 — UI/icon family видимых экранов

| Job | Semantic ID | Grid |
|---|---|---:|
| 07-01 | `ui.icon.weather.partly_cloudy` | 128×128 master |
| 07-02 | `ui.icon.mode.blitz` | 128×128 master |
| 07-03 | `ui.icon.mode.duel` | 128×128 master |
| 07-04 | `ui.icon.inventory` | 128×128 master |
| 07-05 | `ui.icon.trophy` | 128×128 master |
| 07-06 | `ui.icon.archive` | 128×128 master |
| 07-07 | `ui.icon.tasks` | 128×128 master |
| 07-08 | `ui.icon.energy` | 128×128 master |
| 07-09 | `ui.icon.reliability_shield` | 128×128 master |
| 07-10 | `ui.icon.settings` | 128×128 master |

Folder: `assets/source/ui/icons/`. Derivatives 64/32 получают единообразный pixel cleanup.

## BATCH-08 — Living World ambient sprites

Следующий production batch закрывает обязательные микро-объекты живого Hub из `docs/design/LIVING_WORLD_SYSTEM.md`. Все outputs — отдельные transparent RGBA sprites.

| Job | Semantic ID | Class | Grid | Anchor | Folder |
|---|---|---|---:|---|---|
| 08-01 | `fauna.gull.perched` | fauna_sprite | 48×48 | bottom-center | `assets/source/animals/` |
| 08-02 | `fauna.cormorant.perched` | fauna_sprite | 48×56 | bottom-center | `assets/source/animals/` |
| 08-03 | `fauna.squirrel.run` | fauna_sprite | 48×48 | bottom-center | `assets/source/animals/` |
| 08-04 | `companion.pascal.alert` | companion_sprite | 48×48 | bottom-center | `assets/source/animals/` |
| 08-05 | `fauna.flock.distant` | ambient_group | 96×48 | center | `assets/source/animals/` |
| 08-06 | `hub.prop.station_flag` | prop_sprite | 64×64 | bottom-left | `assets/source/props/hub/` |
| 08-07 | `hub.prop.mast_beacon` | prop_sprite | 48×96 | bottom-center | `assets/source/props/hub/` |
| 08-08 | `hub.prop.cup_anemometer` | prop_sprite | 64×80 | bottom-center | `assets/source/props/meteo/` |
| 08-09 | `hub.prop.weather_vane` | prop_sprite | 64×72 | bottom-center | `assets/source/props/meteo/` |
| 08-10 | `ambient.aircraft.distant` | ambient_sprite | 96×48 | center | `assets/source/environment/ambient/` |

Prompt source: `docs/art-generation/batches/BATCH-08-LIVING-WORLD-AMBIENT.md`.

## Runtime acceptance

Для каждого manifest обязательно сохранить:

- `id`;
- `source_path`;
- `class`;
- `logical_size`;
- `pivot`/`anchor`;
- `world_layer`;
- `states`/animation tags;
- palette role;
- provenance: generator/chat/date/reference IDs;
- `production_status`, `art_status`, `technical_status`;
- derivatives.

### Нельзя путать thumbnail и avatar layer

`apps/web/public/assets/items/*.png` сегодня фактически смешивает карточечные изображения и предполагаемые слои персонажа. После миграции:

- inventory thumbnails получаются из manifest/approved source;
- avatar renderer использует canonical layers/sprite sheets;
- public runtime tree является build output;
- React/Phaser не должен обращаться к `candidate_*`.
