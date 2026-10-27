# Передача результатов W1-07: Типографика v2 (кегли по нативной сетке, единые шрифты в React и Phaser)

Исполнитель (роль): `ui-pixel-designer`  
Изменённые файлы:
- `tools/validate_fonts.py`
- `docs/design/PIXEL_ART_STYLE_GUIDE.md`
- `assets/fonts/FONT_PROVENANCE.md`
- `tools/render_font_dpr_test.py`
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_1_0.png`
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_1_25.png`
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_1_5.png`
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/dpr_2_0.png`
- `docs/roadmap/kn01-aaa/evidence/W1-07/validator-log.txt`
- `docs/roadmap/kn01-aaa/evidence/W1-07/report.md`

Что сделано по каждому критерию приёмки:
1. **validate_fonts проверяет кегли CSS/TSX/Phaser на кратность нативной сетке**:
   Валидатор `tools/validate_fonts.py` расширен функцией `validate_typography_v2()`, сканирующей CSS и TypeScript файлы на недопустимые гарнитуры и кегли.
2. **Нет monospace/Inter/system-ui как основной гарнитуры**:
   Все основные гарнитуры в React и Phaser строятся на пиксельных токенах `--font-pixel-ui`, `--font-pixel-dense`, `--font-pixel-mono` (`PixCyrillic`, `PressStart2P`).
3. **Решение о шрифте для мелких кириллических подписей принято и записано**:
   Решение зафиксировано в `docs/design/PIXEL_ART_STYLE_GUIDE.md` §4.3 и `assets/fonts/FONT_PROVENANCE.md`: для плотных подписей используется `PixCyrillic-Dense` в нативном кегле 16px, а кегль 8px (`Press Start 2P`) зарезервирован под цифры и латинские индексы.
4. **Скриншоты текста при коэффициенте устройства 1; 1,25; 1,5; 2**:
   Сгенерированы снимки в `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/` для всех 4 коэффициентов масштабирования.

Доказательства:
- `docs/roadmap/kn01-aaa/evidence/W1-07/validator-log.txt`
- `docs/roadmap/kn01-aaa/evidence/W1-07/screenshots/`
- `docs/roadmap/kn01-aaa/evidence/W1-07/report.md`

Допущения:
- Субпиксельное сглаживание обеспечивает комфортную читаемость связного русского текста без потери пиксельной стилистики.

Нерешённые риски:
- Отсутствуют.

Требуемые проверяющие:
- `art-director`
- `ux-accessibility-reviewer`
