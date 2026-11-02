# Исследование tooling для генерации 3D Hub

**Дата проверки:** 2026-11-02

**Статус:** research note; не является обязательным vendor lock-in.

## 1. Вывод

Для `synopsis_game` не следует выбирать «AI, который генерирует весь Hub». Требования Geometry Lock, semantic IDs, orthographic camera, deterministic states и pixel shader делают такой путь плохо контролируемым.

Рекомендуемая схема:

```text
approved 2D reference / isolated reference
        ↓ optional
image-to-3D draft generator
        ↓
Blender cleanup / procedural authoring
        ↓
GLB
        ↓
glTF Validator + glTF Transform inspect + project validator
        ↓
Three.js Style Lab
        ↓
production approval
```

Для самой сцены использовать `HubWorldDefinition + HubSceneRecipe + procedural/reusable kit`, а не world-generation output.

## 2. Blender

Роль: canonical editable 3D source и offline procedural workbench.

Почему подходит:

- нативный glTF/GLB import/export;
- Python scripting и headless execution;
- удобно нормализовать scale/pivots/material slots;
- Geometry Nodes/Python можно использовать для deterministic kit generation;
- не требуется использовать Blender scene graph как рабочий контур/игровой процесс truth.

Официальная документация glTF exporter:

- https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html

Production rule: точную версию Blender pin-ить при старте H3D-028, не полагаться на «latest» в CI.

## 3. Khronos glTF Validator

Repository:

- https://github.com/KhronosGroup/glTF-Validator

Подходит как обязательный generic validation stage для GLB/glTF. Проверяет соответствие glTF 2.0, references, accessors, animation data, extensions и binary correctness.

Не заменяет project validator: он не знает semantic material slots, scale classes, forbidden cameras/lights и budgets `synopsis_game`.

## 4. glTF Transform

CLI/docs:

- https://gltf-transform.dev/cli
- https://github.com/donmccurdy/glTF-Transform

Полезные операции:

- `inspect` перед оптимизацией;
- `prune`/deduplication после измерений;
- controlled mesh/texture transforms;
- отчёт о scene/mesh/material/texture структуре.

Policy: не запускать универсальный `optimize` без проверки результата. В проекте silhouette и material semantics важнее минимального размера любой ценой.

## 5. TRELLIS.2

Repository:

- https://github.com/microsoft/TRELLIS.2

На момент проверки проект описывает high-fidelity image-to-3D generation, mesh/PBR output и mesh processing utilities. Основной код/model опубликован под MIT License, при этом зависимости могут иметь собственные лицензии.

Почему это лучший первый experimental adapter:

- image-to-3D подходит к workflow «сначала approved isolated reference»;
- можно извлекать draft mesh, не принимая generated material как canonical style;
- permissive license основного проекта снижает integration friction;
- генератор легко изолировать за adapter interface.

Ограничения для `synopsis_game`:

- output может быть существенно сложнее нужного target-scale mesh;
- generated PBR не соответствует canonical pixel style напрямую;
- требует cleanup/decimation/material remapping;
- не должен генерировать whole Hub/camera/layout.

**Рекомендация:** сделать H3D-031 на 2–3 isolated props и сравнить время `generate + cleanup` с ручным low-poly/procedural authoring.

## 6. Microsoft TRELLIS (v1)

Repository:

- https://github.com/microsoft/TRELLIS

Поддерживает text/image-conditioned generation и mesh output. Upstream сам рекомендует для text-to-3D часто сначала генерировать изображение, затем использовать image-conditioned path.

Для нашего pipeline это подтверждает preferred workflow:

```text
style-controlled isolated 2D reference
→ image-to-3D
→ cleanup
```

Если TRELLIS.2 стабилен для нужных assets, отдельно тащить v1 в production не требуется.

## 7. Hunyuan3D 2.1 / 2.x

Repositories:

- https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- https://github.com/Tencent-Hunyuan/Hunyuan3D-2

Технически полезные свойства:

- image-to-shape/image-to-3D;
- GLB/OBJ workflows;
- отдельные shape и texture stages;
- локальный запуск;
- Blender-related ecosystem.

Но upstream license имеет дополнительные территориальные и usage conditions. На момент проверки лицензия Hunyuan3D 2.1 прямо ограничивает Territory и содержит отдельные условия для некоторых вариантов использования.

**Policy проекта:** `disabled-by-default-for-production`. Перед использованием нужен отдельный license/territory review. Не копировать assumption из старых README/форков.

С художественной точки зрения PBR texture stage всё равно не является необходимым: проекту полезнее shape generation с последующим semantic material remap.

## 8. HunyuanWorld 1.0 и world generators

Repository:

- https://github.com/Tencent-Hunyuan/HunyuanWorld-1.0

World-generation подход интересен как concept/R&D: проект заявляет explorable 3D world generation и mesh export. Но это не решает главные production constraints Hub:

- строгий Geometry Lock;
- exact camera mapping;
- semantic building IDs;
- collision/navigation truth;
- deterministic state matrix;
- reusable modular assets;
- small рабочий контур budgets.

Кроме того, upstream использует отдельную community license с территориальными условиями.

**Решение:** reference/research only; не production source of truth.

## 9. Почему не генерировать pixel texture напрямую

Современные image-to-3D systems ориентированы на high-fidelity/PBR output. В `synopsis_game` это часто создаёт лишнюю работу:

- baked light конфликтует с day/night;
- detailed roughness/normal stacks не видны на 320×180;
- photo-like textures конфликтуют с palette quantization;
- AI texture variation создаёт style drift между assets.

Поэтому production asset должен сохранять:

- silhouette;
- крупные planes;
- semantic material regions;
- limited meaningful geometry detail.

А pixel identity создаётся общим renderer-ом.

## 10. Evaluation matrix для H3D-031

Каждый generator adapter тестировать одинаково.

| Criterion | Weight | Как проверять |
|---|---:|---|
| silhouette fidelity | high | 320×180 Style Lab snapshot |
| cleanup time | high | minutes/task + number of manual operations |
| topology sanity | medium | project validator + Blender inspection |
| material cleanup | medium | number of slots/textures to remove/remap |
| repeatability | medium | same input/seed if supported |
| license suitability | hard gate | upstream license review |
| local/offline viability | medium | install/рабочий контур footprint |
| GLB interoperability | high | validator + Three.js load |
| target asset size | medium | triangles/draw/materials |
| style consistency | hard gate | canonical shader snapshot |

Generator выигрывает только если суммарное production time и качество лучше простого procedural/hand-authored asset.

## 11. Что не надо добавлять как dependency сейчас

До H3D-031 не добавлять в основное приложение:

- TRELLIS/TRELLIS.2 Python stack;
- Hunyuan stack;
- CUDA dependencies;
- world-generation runtimes;
- generator SDK/API clients.

Они должны жить вне browser рабочий контур и, при принятии, в отдельном tooling environment/adapter.

## 12. Decision recommendation

1. Implement H3D-001…008 без generator dependency.
2. Параллельно подготовить Style Lab, recipe schema и GLB validator.
3. Сначала доказать procedural building kit.
4. Затем сделать ограниченный TRELLIS.2 spike на isolated props.
5. Измерить cleanup time и target-scale quality.
6. Не использовать Hunyuan3D/HunyuanWorld в production до license review.
7. Массовое производство разблокировать только после H3D-034.
