# Доказательства завершения станции R02

**Окончательная приёмка HEAD11 — PASS. RELEASE_ACCEPTED и PERF_ACCEPTED в пределах [интеграционного отчёта](../../2026-11-16-station-r02-integration-review.md).** Все четыре браузерных задания и остальные пять запущенных проверок завершились успешно. Все прежние замечания SVG, фокуса и подготовки прокрутки закрыты реальными событиями и исходными отчётами. Исторические отрицательные результаты сохранены отдельно.

Исходная голова: `66ca23f22b460211eae00a11db1d1385328546c0`; проверенный merge: `de3248aa121bbdadefad9be92fa8be49eb6e7642`; одинаковое дерево: `c3f751919d51c6edd5396fd68f5c4115d0036b7d`. Основная ветка сравнения — `a381888c034f12ec17a27b501952989b114253d1`. Браузерный прогон — [43890220174](https://github.com/f2re/synopsis_game/actions/runs/43890220174).

Реализацию и общий ход завершения описывает [отчёт координатора](../../2026-11-16-station-r02-completion.md). [Машинный индекс](browser-66ca23f/metadata.json) содержит полные SHA сценариев, ZIP и каждого файла, CI/job/artifact URL, действительные результаты ввода, сравнение производительности и явные SKIP. Временных подписанных ссылок загрузки в нём нет.

## Полные отчёты и исходные архивы

Пять JSON сохранены без изменения байтов: суммарно **6 161 053 байта**. Тринадцать выбранных PNG также сохранены без изменения: **5 034 045 байт**. Они охватывают станцию 1366/390/844, телеграфную и синоптическую в трёх ориентациях, примерочную, восстановленный портрет и фокус SVG после поворота. Полные ZIP остаются артефактами GitHub; для воспроизведения точного происхождения сохранены их размеры и SHA-256.

| Полный JSON | Записей | PNG в исходном архиве | Байт JSON |
| --- | ---: | ---: | ---: |
| [Экраны Chromium](browser-66ca23f/reports/chromium-screens.json) | 1033 | 315 | 2671007 |
| [Экраны Firefox](browser-66ca23f/reports/firefox-screens.json) | 1023 | 312 | 2707940 |
| [Окружение Chromium, кандидат](browser-66ca23f/reports/chromium-environment.json) | 56 | 74 | 374881 |
| [Окружение Firefox, кандидат](browser-66ca23f/reports/firefox-environment.json) | 53 | 72 | 363154 |
| [Основная ветка Chromium](browser-66ca23f/reports/chromium-baseline.json) | 8 | 8 | 44071 |

| Архив GitHub | SHA-256 ZIP |
| --- | --- |
| [14238245812](https://github.com/f2re/synopsis_game/actions/runs/43890220174/artifacts/14238245812) — station-screens-chromium | `4b78ee8d4e40be95293f3192de07c6ab0ed553e4ea290d2b4704fc6fb5490596` |
| [14238155192](https://github.com/f2re/synopsis_game/actions/runs/43890220174/artifacts/14238155192) — station-screens-firefox | `a901546145485c4df1e371e982a858e96a7c7ff95d01e3bb88d5ad035ff6417b` |
| [14238135609](https://github.com/f2re/synopsis_game/actions/runs/43890220174/artifacts/14238135609) — station-environment-chromium | `03794e251efaafd4b83beb696f41270f8a6f6531f7eb05ac2bde6c533f0eead7` |
| [14236019162](https://github.com/f2re/synopsis_game/actions/runs/43890220174/artifacts/14236019162) — station-environment-firefox | `1983afa49a5a3b4dabbffde727c28d72cd7de19848402649bc85608818477406` |

## Выбранные снимки

| Объект | Постоянные PNG |
| --- | --- |
| Станция и персонажи | [День 1366, Chromium](browser-66ca23f/screenshots/chromium-environment-solar-day-1366.png); [390, Firefox](browser-66ca23f/screenshots/firefox-screens-home-390.png); [844, Chromium](browser-66ca23f/screenshots/chromium-screens-home-844.png); [ночь 1366, Firefox](browser-66ca23f/screenshots/firefox-environment-solar-night-1366.png) |
| Телеграфная | [Приём смены 1366, Chromium](browser-66ca23f/screenshots/chromium-screens-all-shift-handover-1366.png); [задание 390, Firefox](browser-66ca23f/screenshots/firefox-screens-all-blitz-active-390.png); [приём смены 844, Chromium](browser-66ca23f/screenshots/chromium-screens-all-shift-handover-844.png) |
| Синоптическая | [1366, Chromium](browser-66ca23f/screenshots/chromium-screens-all-task-stationPlot-6-1366.png); [390, Firefox](browser-66ca23f/screenshots/firefox-screens-all-task-stationPlot-6-390.png); [844, Chromium](browser-66ca23f/screenshots/chromium-screens-all-task-stationPlot-6-844.png) |
| Фокус SVG после поворота | [844, Firefox](browser-66ca23f/screenshots/firefox-screens-all-station-plot-resize-844.png) |
| Примерочная и портрет | [Сохранённый образ 1440, Chromium](browser-66ca23f/screenshots/chromium-screens-portrait-editor-saved-1440.png); [восстановление 390, Firefox](browser-66ca23f/screenshots/firefox-screens-portrait-editor-restored-390.png) |

Кадры являются отдельными снимками, а не видеозаписью полного цикла. [Приёмка персонажей HEAD11](character-browser-head11.json) содержит собственный список шести просмотренных кадров и SHA графического контракта; помещения независимо принимает интеграционный проверяющий.

## История действительных браузерных результатов

| Этап | Сохранённый протокол | Что именно установлено |
| --- | --- | --- |
| HEAD4 `aa8c4a5` | [JSON](diagnostic-aa8c4a5-firefox/failure-case.json), [единственный диагностический PNG](diagnostic-aa8c4a5-firefox/all-blitz-svg-hit-failure-1366-4.png) | До щелчка `elementFromPoint` вернул корневой SVG при попадании в точную фигуру. Реальный маршрут события не записывался. |
| HEAD5 `6c5d1eb` | [JSON](diagnostic-6c5d1eb-firefox/failure-case.json) | Перенос видимой заливки на фигуру не устранил прежний отрицательный запрос попадания. |
| HEAD6 `4e54e20` | [JSON](diagnostic-4e54e20-firefox/failure-case.json) | Выравнивание начала SVG также не устранило запрос; сохранены сетка и отрицательные варианты. |
| HEAD8 `a9adfd6` | [JSON](diagnostic-a9adfd6-firefox/failure-case.json) | В записанном доверенном событии `clientX` потерял дробную часть и оказался за левым краем фигуры; точный обработчик правильно сохранил состояние. |
| HEAD9 `ccba9a2` | [JSON](diagnostic-ccba9a2-firefox/failure-case.json) | В исторической точке реальный корневой SVG-клик изменил T→Td; отрицательные проверки сохранены. Общий сценарий позже остановился на Tab после поворота 390→844. |
| HEAD10 `172e39d` | [JSON](diagnostic-172e39d-firefox/failure-case.json), [PNG перекрытия](diagnostic-172e39d-firefox/all-blitz-svg-hit-failure-844-2.png) | Двенадцать записей Tab после изменения размера прошли. Позже точка диаграммы попала под закреплённый заголовок; подготовка прокрутки ещё не учитывала существующий верхний отступ 96px. Клик не отправлен. |

Протокол HEAD9 содержит четыре исходные записи без изменения, проверенные SHA сценариев и ZIP, 144 успешно выполненных назначения после очистки, 157 доверенных кликов до остановки и явное отсутствие подробной геометрии на новом отказе фокуса. Не сохранённого кадра или не выполненного измерения в наборе нет.

## Изображения и положение персонажей

- [Историческая браузерная приёмка персонажей HEAD5](character-browser-head5.json) сохраняет источники, SHA выбранных кадров и ограниченный художественный допуск. Общий Firefox FAIL этого этапа указан явно.
- [Матрица перекрытий](station-r02-all-actors-occlusion.json) и [независимый пересчёт](independent-occlusion-check.json) проверяют видимость относительно декораций для 16 экземпляров, двух ориентаций и 34 секунд с шагом 100мс.
- [Неизменность PNG при переносе Паскаля](pascal-placement-png-comparison.json) отделяет координатную поправку от редактирования изображений.
- [Список PNG до ограниченного маршрута наблюдателя](observer-route-before-png.json) и [сравнение после](observer-route-png-comparison.json) фиксируют неизменность 204 файлов.

Эта модель перекрытий не включает HUD, погодные эффекты и взаимное перекрытие людей. Реальные снимки и логическая проверка маршрутов дополняют её, а не заменяются ею.

## Изолированное исправление JSON import

[Сравнение сборок](import-attribute-dist-comparison.json), [список файлов до](import-attribute-before-dist.json) и [список после](import-attribute-after-dist.json) доказывают побайтовое равенство всех 403 файлов веб-сборки при добавлении обязательного атрибута JSON import. Это доказательство относится только к той одной строке; последующие изменения маршрута наблюдателя, положения Паскаля и обработки SVG проверяются отдельно.

## Правила чтения доказательств

Полные браузерные отчёты остаются исходными. Дополнительные трактовки, ограничения и перенос допуска на документационный commit записываются рядом, а не подменяют поля исходного отчёта. PASS окружения не означает прохождения screens; PASS исходников не означает браузерной художественной приёмки; число записей не равно числу независимых тестов. Для Firefox нативный звук и скрытая вкладка не объявляются пройденными по одной общей метке audio. Интервалы RAF не выдаются за гарантированный FPS.
