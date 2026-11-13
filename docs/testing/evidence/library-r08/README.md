# R08: сохранённые свидетельства библиотеки

Финальные экраны получены из [run 43488115593](https://github.com/f2re/synopsis_game/actions/runs/43488115593), head `2e5b0e56ffe5eec6591ed195940d0d912f392b31`, проверенное объединение `6c7643fed51b736e937ef67e174ce1789463205f`. Все четыре задания этого запуска завершились успешно.

[Манифест](manifest.json) содержит происхождение и контрольные суммы каждого файла. Девять PNG скопированы без изменения байтов. Пять raw JSON сохранены в gzip-контейнерах с нулевым временем: распаковка полностью восстанавливает исходные байты, отдельно записаны хеши оригинала и контейнера. Все созданные GitHub blobs совпали с независимо вычисленными Git hashes.

## Отчёты

| Файл | Run | Записи / PNG | Результат |
| --- | --- | ---: | --- |
| [Chromium, экраны](screens-chromium-run5.json.gz) | 43488115593 | 553 / 312 | PASS |
| [Firefox, экраны](screens-firefox-run5.json.gz) | 43488115593 | 542 / 309 | PASS |
| [Chromium, окружение](environment-chromium-candidate-run4.json.gz) | 43485629426 | 55 / 74 | PASS |
| [Firefox, окружение](environment-firefox-candidate-run4.json.gz) | 43485629426 | 52 / 72 | PASS |
| [Chromium, исходная версия](environment-chromium-baseline-run4.json.gz) | 43485629426 | 8 / 8 | PASS |

Число записей включает проверки, измерения и снимки; оно не равно числу независимых тестов.

Environment-отчёты сохраняют исходное происхождение: head `d05a373a9f67e73aec70ed1a3c88a80a6294d658`, merge `a922376b11c5cc13a96154aeccff6303bc2a5296`, база `532a2282a19e87495283473663071d5f7cc2e6c9`. Runtime окружения и его сценарий между этими версиями не менялись; финальные environment jobs также SUCCESS. Старые JSON не переименованы в результаты нового запуска.

В raw environment JSON сохранена устаревшая строка `rainScope`: база уже содержит дождь R07. Правильная граница измерения — дождь проверен у кандидата без парного A/B. Сравнение ясных сцен выполнено отдельно на одном исполнителе и принято независимым reviewer.

Для чтения JSON достаточно распаковать соответствующий `.json.gz` обычным gzip. `raw_sha256` в манифесте проверяет распакованный исходник; `sha256` — сохранённый контейнер.

## Контрольные кадры

| Состояние | Исходный PNG |
| --- | --- |
| Вход на большом экране, Chromium | [chromium-library-entry-1366.png](chromium-library-entry-1366.png) |
| Короткое горизонтальное окно, Chromium | [chromium-library-entry-844.png](chromium-library-entry-844.png) |
| Исправленное наведение, Chromium, телефон | [chromium-library-bookmark-hover-390.png](chromium-library-bookmark-hover-390.png) |
| Вход на телефоне, Firefox | [firefox-library-entry-390.png](firefox-library-entry-390.png) |
| Обычная статья, Firefox | [firefox-library-reader-390.png](firefox-library-reader-390.png) |
| Развёрнутое чтение, Firefox | [firefox-library-expanded-390.png](firefox-library-expanded-390.png) |
| Возвращение к источникам, Firefox | [firefox-library-reopened-390.png](firefox-library-reopened-390.png) |
| Текст 200%, Firefox | [firefox-library-text-200-390.png](firefox-library-text-200-390.png) |
| Читальный зал, Chromium | [chromium-archive-entry-1366.png](chromium-archive-entry-1366.png) |

Полные архивы содержат 621 финальный PNG экранов. Эта выборка и исходные отчёты сохраняют основные доказательства после истечения хранения CI. Суммы PNG вычислены при сохранении и связаны с проверенными ZIP; исходные screen reports не содержат собственного реестра хешей всех PNG.

Подробные критерии, независимые заключения, реальные измерения и границы допуска — в [итоговом протоколе](../../2026-11-13-library-r08-release-review.md).
