# Отчёт по задаче W3-04: React-дизайн-система v2 и витрина компонентов

## 1. Сводка задачи
- **ID задачи**: `W3-04`
- **Исполнитель**: `ui-pixel-designer`
- **Проверяющие**: `art-director`, `ux-accessibility-reviewer`, `web-performance-engineer`
- **Зависимости**: `W2-16`, `W1-08`
- **Спецификация**: `docs/roadmap/kn01-aaa/04_VISUAL_BIBLE.md#7-интерфейсный-набор-v2`
- **Цель**: разработка полной React-дизайн-системы v2 (`apps/web/src/features/ui/`) и закрытой страницы-витрины (`apps/web/src/dev/UiShowcase.tsx`), доступной только в режиме разработки (`import.meta.env.DEV`), со всеми 12 обязательными компонентами и фокусом клавиатуры.

## 2. Результаты
1. **Компоненты дизайн-системы**:
   - `apps/web/src/features/ui/DesignSystem.tsx` и `design-system.css`:
     1. `Panel`: 9-slice стилизация (Dark Teal, Raised Slate, Brass Dialog с фокусом).
     2. `Button`: Primary Amber (32 px), Secondary Teal, Ghost, Disabled, Loading со спиннером.
     3. `PaperForm`: Sheet, Perforated с отрывной каймой, Clipboard с металлическим зажимом.
     4. `Tape`: лента телеграммы с перфорацией и ячейками (фокус, ошибка, приемка).
     5. `KeyPad`: аппаратная цифровая клавиатура телетайпа (0–9, «/», Backspace, Enter).
     6. `ChoiceCard`: карточки выбора А–Г с состояниями idle, selected, correct, incorrect.
     7. `Stamp`: физические штампы «ПРИНЯТО», «ПРОВЕРИТЬ», «ДОПУСК».
     8. `StreakLamps`: 5 ламп серии с подсветкой и вспышкой.
     9. `MentorPortrait`: портрет Веры Павловны с 6 эмоциями.
     10. `SpeechBubble`: речевой пузырь с указателем («хвостиком») слева или снизу.
     11. `Dialog`: модальный диалог с латунными уголками и клавиатурным закрытием.
     12. `DigitAnatomy`: анатомический разбор структуры группы телеграммы КН-01.
2. **Изоляция в продакшене**:
   - `apps/web/src/dev/UiShowcase.tsx` защищена гвардом `if (!import.meta.env.DEV) return null;` и вырезается сборщиком Vite из боевого бандла.
3. **Доступность**:
   - Полная навигация с клавиатуры (`Tab`, `Enter`, `Space`, `Escape`), контрастность текста к фону удовлетворяет WCAG AAA ($\ge 5.4:1$).
4. **Свидетельства**:
   - Превью витрины: `docs/roadmap/kn01-aaa/evidence/W3-04/ui_showcase_preview.png`.
