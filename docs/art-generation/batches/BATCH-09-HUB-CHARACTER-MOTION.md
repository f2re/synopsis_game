# BATCH-09 — Hub character motion keyframes

Purpose: добавить в текущий Hub живой человеческий масштаб и короткие спокойные циклы. Этот batch не создаёт новые identities без необходимости: 09-01…09-08 должны быть **image edits** от уже принятых character masters и сохранять лицо, одежду, пропорции и palette identity.

## Execution contract

- Ровно 10 jobs; один job = один PNG.
- Никогда не просить sprite sheet/contact sheet/grid.
- Transparent RGBA, без пола, тени-плашки, UI, текста и окружения.
- Для walk keyframes сохранять один canvas, baseline и pivot.
- Left/right допускается зеркалить runtime только если асимметричные аксессуары не ломаются; иначе отдельный authored frame.
- Цель — 2–4 frame low-cadence animation, а не плавная 24 fps анимация.
- Все персонажи должны визуально соответствовать Hub scale family 32×48.

## JOB 09-01 — `character.player.world.walk.right.a`

Использовать принятый `character.player.world.idle.down` как identity reference. Один 32×48 world-character frame игрока, шаг вправо, первая ключевая фаза: передняя нога слегка вынесена, противоположная рука естественно противофазна, корпус почти вертикален, без exaggerated running pose. Сохранить лицо, волосы, одежду и рюкзак. Bottom-center pivot, одна baseline. Transparent RGBA.

## JOB 09-02 — `character.player.world.walk.right.b`

Вторая ключевая фаза того же шага вправо, identity и canvas строго те же, что 09-01: ноги сменили фазу, руки в обратной противофазе, голова и высота тела меняются максимум на 1 logical pixel. Не менять одежду, лицо, цвет или размер. 32×48, bottom-center, transparent RGBA.

## JOB 09-03 — `character.player.world.inspect`

Игрок остановился и изучает небольшой полевой блокнот/карту двумя руками; спокойная профессиональная поза, лицо и одежда идентичны master. 32×48, bottom-center. Один персонаж, один предмет, transparent RGBA.

## JOB 09-04 — `hub.npc.student_a.walk.right.a`

Image edit от принятого `hub.npc.student_a`. Первый frame спокойной ходьбы вправо; блокнот остаётся при персонаже, силуэт и цвета не меняются. 32×48, bottom-center, transparent RGBA.

## JOB 09-05 — `hub.npc.student_a.walk.right.b`

Вторая фаза той же ходьбы. Максимальная стабильность головы/торса, движение читается ногами и руками. 32×48, bottom-center, transparent RGBA.

## JOB 09-06 — `hub.npc.student_b.walk.left.a`

Image edit от `hub.npc.student_b`. Первая спокойная фаза ходьбы влево; clipboard остаётся под рукой и не меняет размер. 32×48, bottom-center, transparent RGBA.

## JOB 09-07 — `hub.npc.student_b.walk.left.b`

Вторая фаза той же ходьбы; сохранить exact identity, palette, baseline и canvas. 32×48, bottom-center, transparent RGBA.

## JOB 09-08 — `hub.npc.observer.inspect_instrument`

Image edit от `hub.npc.observer`: опытный наблюдатель поднял небольшой ручной прибор/анемометр на уровень груди и смотрит на него. Сдержанная профессиональная поза, без нового костюма. 32×48, bottom-center, transparent RGBA.

## JOB 09-09 — `hub.npc.rooftop_technician.idle`

Один новый world NPC для rooftop route: технический сотрудник метеоцентра, тёмно-синяя рабочая куртка, защитная шапка/кепка, компактный пояс инструментов, спокойная поза стоя. Не строитель и не военный. 32×48, bottom-center, same Hub dusk palette, transparent RGBA.

## JOB 09-10 — `hub.npc.archivist.doorway`

Один новый world NPC для зоны Архива: архивист/сотрудник центра с папкой документов, тёплый коричнево-синий рабочий образ, компактные очки, спокойная поза в дверном проёме. 32×48, bottom-center, transparent RGBA. Без двери и интерьера — только персонаж.

## Acceptance

- identity drift между ключевыми кадрами = FAIL;
- смещение baseline/pivot = FAIL;
- изменение масштаба головы/торса >1 px = FAIL;
- любой grid/contact sheet = FAIL;
- runtime animation cadence целевая 220–380 ms/frame для ambient walking;
- движение должно оставаться читаемым при nearest-neighbour scaling.
