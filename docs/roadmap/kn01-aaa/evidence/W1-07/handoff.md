# W1-07 — Типографика v2: кегли по нативной сетке, единые шрифты в React и Phaser

Исполнитель (роль): `ui-pixel-designer`  
Дата: 2026-10-30  
Статус задачи: `review`

## Изменённые и созданные файлы:
- `tools/validate_fonts.py` — валидатор кеглей, запрета системных шрифтов (monospace, Inter, system-ui) и проверки 100% покрытия кириллицы.
- `docs/design/PIXEL_ART_STYLE_GUIDE.md` — зафиксирована спецификация «Пиксельная типографика v2», утверждены допустимые кегли нативной сетки (8px, 16px, 24px, 32px, 48px, 64px) и зафиксировано решение по мелким кириллическим подписям (`PixCyrillic-Dense`).
- `assets/fonts/FONT_PROVENANCE.md` — реестр лицензий и контрольных сумм SHA-256 шрифтов (SIL Open Font License 1.1).
- `tools/render_font_dpr_test.py` — тестовый генератор образцов при различных DPR.
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_1_0.png` — снимок при коэффициенте 1.0x.
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_1_25.png` — снимок при коэффициенте 1.25x.
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_1_5.png` — снимок при коэффициенте 1.5x.
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_2_0.png` — снимок при коэффициенте 2.0x.

## Что сделано по критериям приёмки:
1. **validate_fonts проверяет кегли CSS/TSX/Phaser на кратность нативной сетке**:
   - Валидатор `tools/validate_fonts.py` успешно проходит и блокирует использование произвольных некратных кеглей (9–14 px).
2. **Нет monospace/Inter/system-ui как основной гарнитуры**:
   - Запрещённые шрифты исключены из первичных определений `font-family` во всех стилях и Phaser-сценах (включая исправление в `HubStageLayer.ts`).
3. **Решение о шрифте для мелких кириллических подписей принято и записано**:
   - В качестве решения для компактных подписей утверждён `PixCyrillic-Dense` (нативный кегль 16px, субпиксельное сглаживание) и `Press Start 2P` (кегль 8px) только для кодовых индексов. Решение зафиксировано в стилевом руководстве и провенансе.
4. **Скриншоты текста при коэффициенте устройства 1; 1,25; 1,5; 2**:
   - Сгенерированы 4 эталонных растра в каталоге `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/`.

## Доказательства:
- Результат работы валидатора: `python tools/validate_fonts.py` — **PASS**.
- Снимки экрана: `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_*.png`.

## Допущения:
- Векторные символы метеокарт в `apps/web/src/features/map` используют специализированный Canvas/SVG-рендерер, не смешивающийся со спрайтовой типографикой игры.

## Нерешённые риски:
- Требуется подтверждение независимыми проверяющими `art-director` и `ux-accessibility-reviewer`.

## Требуемые проверяющие:
- `art-director`
- `ux-accessibility-reviewer`
