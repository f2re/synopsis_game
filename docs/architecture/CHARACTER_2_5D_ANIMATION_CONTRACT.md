# Контракт персонажей и анимации для 2.5D Hub

**Статус:** принято

## 1. Цель

Персонажи должны сохранять читаемость пиксельной игры, но не требовать sprite sheet для каждого направления, костюма, сезона и состояния. Производственная модель: общий low-poly rig + modular meshes + shared animations + palette recoloring + стилизованная дискретизация поз.

## 2. Источник игровой процесс truth

Renderer не управляет перемещением персонажа.

Авторитетны:

- logical position в координатах мира;
- logical facing/heading;
- locomotion state;
- action state;
- equipped cosmetic IDs;
- NPC schedule/route.

Renderer преобразует эти данные в transform, animation clip, attachment visibility и palette state.

Root motion как источник положения запрещён.

## 3. Базовый humanoid rig

Для человекоподобных персонажей используется один совместимый skeleton family.

Рекомендуемая структура:

```text
root
└── hips
    ├── spine
    │   ├── chest
    │   │   ├── neck/head
    │   │   ├── upperArm.L → lowerArm.L → hand.L
    │   │   └── upperArm.R → lowerArm.R → hand.R
    ├── upperLeg.L → lowerLeg.L → foot.L
    └── upperLeg.R → lowerLeg.R → foot.R
```

Ориентир: 13–17 deform bones. Дополнительные helper bones допускаются, но не должны превращать рабочий контур rig в тяжёлый cinematic skeleton.

Все modular wearable meshes должны быть совместимы с одной skeleton family или иметь явный adapter contract.

## 4. Geometry budget

Ориентиры, а не обязательный минимум:

- ordinary NPC: 500–1500 triangles;
- player/hero: 1500–3000 triangles;
- wearable/accessory: по silhouette value;
- face detail: минимальный.

Критерий качества — читаемая silhouette при внутреннем framebuffer, а не число полигонов.

Мелкая geometry, которая исчезает после downsample до 320×180, считается лишней.

## 5. Modular structure

Базовые slots:

```text
body/base
head
hair
headgear
torso/clothing
legs
shoes
accessory.back
accessory.hand.left
accessory.hand.right
optional outerwear
```

Не требуется отдельный цельный mesh на каждую комбинацию внешности.

Player cosmetics должны ссылаться на stable item IDs из игровой процесс/inventory layer, а renderer mapping определяет соответствующий mesh/palette/attachment.

## 6. Palette slots

Материалы персонажей используют ограниченные semantic color slots, например:

```text
skin
hair
primary_cloth
secondary_cloth
trousers
shoes
metal
accent
```

Один mesh должен поддерживать несколько цветовых конфигураций без отдельной texture bake на каждый вариант.

Допустимы:

- vertex color IDs;
- tiny indexed/lookup texture;
- material groups;
- palette LUT.

Запрещено создавать отдельную full texture только ради смены цвета одежды, если это можно выразить palette slot.

## 7. Face contract

При целевом масштабе персонажа детали лица должны быть намеренно упрощены.

Разрешены:

- low-poly head silhouette;
- минимальные eye/brow/mouth marks;
- 8×8/16×16 indexed face decal;
- несколько expression variants.

Не требуется realistic face rig.

## 8. Shared animation library

Минимальная библиотека первой версии:

- `idle`;
- `walk`;
- `run`;
- `interact`;
- `work`;
- `carry`;
- `sit`;
- `emote`.

Vertical slice обязан реализовать только `idle` и `walk`; остальные вводятся по мере игровой процесс-потребности.

Один clip должен переиспользоваться всеми совместимыми персонажами.

## 9. Animation рабочий контур

Three.js animation layer использует стандартную модель clip/action/mixer или эквивалентный abstraction внутри renderer.

Обязательный high-level interface:

```ts
interface CharacterAnimationState {
  locomotion: 'idle' | 'walk' | 'run';
  action?: 'interact' | 'work' | 'carry' | 'sit' | 'emote';
  speed: number;
  reducedMotion: boolean;
}
```

Renderer сам решает blending/crossfade, но игровой процесс не должен оперировать именами костей или `AnimationAction`.

## 10. Pixel-style pose sampling

World renderer может обновляться с 60 FPS, но pose animation должна иметь художественно ограниченную частоту.

Default target:

```text
character pose sampling: 10 FPS
world transform/camera:   render FPS
```

Допустимый диапазон: 8–12 pose FPS после visual acceptance.

Это правило нужно для sprite-like cadence и уменьшения ощущения «слишком плавного 3D».

Reduced-motion режим может дополнительно уменьшать pose frequency/secondary animation.

## 11. Facing

Базовый режим Hub:

- world movement может иметь непрерывное направление;
- visual facing может quantize к 8 направлениям по 45°;
- плавный поворот допускается для специальных объектов/сцен, но не является default humanoid style.

Таким образом сохраняется визуальная грамматика sprite directions без восьми комплектов кадров.

## 12. Movement

Movement и animation разделены.

```text
logical position/velocity
→ renderer transform

velocity magnitude/action
→ animation state
```

Walk clip не перемещает root в игровой процесс space.

Преимущества:

- deterministic routes;
- простая collision;
- save/load без animation dependency;
- schedule system не зависит от rig;
- networking/replay хранит игровой процесс state, а не bone transforms.

## 13. Attachments

Skeleton family обязана иметь стабильные sockets/anchors как минимум:

- `hand.left`;
- `hand.right`;
- `back`;
- `head`.

К ним подключаются reusable props:

- clipboard;
- umbrella;
- tool;
- bag;
- book;
- radio;
- field equipment.

Attachment ID является semantic asset ID, а не raw scene node name.

## 14. Seasonal clothing

Сезонная одежда реализуется сменой modular clothing/accessory state, а не отдельным персонажем.

Пример:

```text
winter → outerwear + hat + gloves palette
rain   → raincoat/umbrella when required
summer → base torso variant
```

Одни и те же locomotion clips продолжают работать.

## 15. Contact shadow

Default character grounding — дешёвая contact/blob shadow либо общий shadow pass. Отдельная high-resolution dynamic shadow map на каждого NPC не требуется.

## 16. GLB authoring contract

Для skinned character GLB должен содержать:

- mesh;
- skeleton;
- skin weights;
- named animation clips либо отдельный canonical animation source;
- stable scale/orientation;
- no hidden camera/light;
- minimal material set;
- no duplicate unused nodes.

Canonical orientation и scale должны быть определены один раз в tooling и проверяться автоматически.

## 17. рабочий контур loading

Повторяющиеся персонажи не должны каждый раз заново парсить один GLB.

Нужно:

- cache loaded source;
- clone skinned instance через безопасный skeleton-aware helper;
- reuse geometry/material programs where possible;
- lazy-load cosmetics по необходимости;
- dispose resources только при реальном завершении lifecycle сцены.

## 18. Character factory

Целевой API:

```ts
createCharacter({
  id,
  archetype,
  appearance,
  cosmetics,
  palette,
  initialAnimation,
  interactionId
})
```

Factory возвращает renderer handle, но игровой процесс layer не должен обращаться к bones напрямую.

## 19. Animation controller

Нужен отдельный `CharacterAnimator`, который:

- маппит high-level state на clips;
- управляет crossfade;
- применяет pose quantization;
- синхронизирует animation speed с logical movement;
- отключает secondary motion в reduced-motion;
- не изменяет игровой процесс position.

## 20. Критерии приёмки

Character pipeline принят, если один и тот же base rig демонстрирует:

- минимум 3 визуально различимых персонажа через modular parts/palette;
- `idle` и `walk` без sprite sheets;
- корректные 8-direction facing states;
- стабильную посадку ног на ground;
- отсутствие visible jitter при 320×180;
- смену одного wearable без загрузки полного нового персонажа;
- attachment в руке;
- transition `idle ↔ walk`;
- reduced-motion mode;
- отсутствие игровой процесс dependency от bone transforms.

## 21. Не делать

Запрещено как default production strategy:

- отдельный skeleton для каждого NPC;
- Mixamo-scale complex rig без доказанной необходимости;
- unique animation set на каждого NPC;
- root-motion authority;
- sprite sheet для каждого направления после перехода на 3D character;
- отдельный GLB для каждого цвета одежды;
- facial rig уровня cinematic character;
- 60 FPS smooth pose interpolation как единственный визуальный режим.

## 22. Связанные документы

- `docs/architecture/HUB_2_5D_RENDERER_CONTRACT.md`
- `docs/design/PIXEL_3D_STYLE_CONTRACT.md`
- `docs/game-design/AVATAR_AND_COSMETIC_PROGRESSION.md`
- `docs/roadmap/HUB_2_5D_MIGRATION.md`
