# HUB MASTER — Art Director Review

Status: **REOPENED / CHANGES REQUIRED**

Master: `image-gen-1(20261025-183207).png`

SHA-256: `3efc212bdcd7eaaacac119d20cbd89f83ab62d3d9761aafd5abdacae5660a340`

## Что остаётся утверждённым

Композиция master остаётся неизменяемым визуальным baseline главного Hub: центральный корпус, Радар, Карты и анализ, Аэрология, Архив, Турнирный зал, площадь, глобус/фонтан, персонажи, растительность, горизонт, верхняя и нижняя интерфейсные зоны не переосмысляются и не переставляются.

## Почему прежний ART_ACCEPTED отозван

Фактический runtime-пакет не выполнил собственный production brief:

- вместо clean `hub_base` без runtime UI использована уменьшенная копия всего master;
- верхняя панель, подписи локаций, нижняя навигация и CTA остались запечены в raster-base;
- `window_light_mask` и `lamp_glow_mask` не были подключены как самостоятельные production-маски;
- fullscreen texture уменьшена до 960×540 и 62 434 bytes, после чего растягивается на browser viewport;
- утверждённый master имеет 1672×941 и 2 953 225 bytes, поэтому такая производная не может считаться визуально нейтральной оптимизацией;
- скриншот runtime показывает явную деградацию/блочную порчу нижней половины сцены.

Это противоречит issue #28 и #24. Оба issue переоткрыты.

## Новый обязательный контракт

Source of truth для реализации: `packages/contracts/hub-main-screen.contract.json`.

До новой художественной приёмки обязательно:

1. вернуть high-fidelity fullscreen source с native texture не меньше 1672×941;
2. не использовать 960×540 как пользовательскую fullscreen-текстуру;
3. изготовить clean environment plate без L7 UI;
4. вынести верхнюю панель, подписи локаций, нижнюю навигацию и CTA в runtime UI;
5. подключить `environment`, `sky`, `window_light`, `lamp_glow` masks;
6. поддержать `day`, `noon`, `twilight`, `night`, причём UI не участвует в world-lighting;
7. выполнить screenshot regression в 1920×1080, 2560×1440, 1440×900 и mobile portrait;
8. выполнить composite/diff против исходного master вне объявленных UI/dynamic masks.

## Временный fallback

До готовности clean environment plate допускается только high-fidelity native-resolution derivative утверждённого master. Он является визуальным fallback, а не финальной layered production-сценой и не получает статус `ART_ACCEPTED`.

## Решение

**FAIL текущему 960×540 runtime-base.**

Статус возвращается в `CHANGES REQUIRED` до повторного PASS от `pixel-art-quality-reviewer` и `art-director`.
