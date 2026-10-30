# Акт передачи задачи W3-07

- **Задача**: `W3-07` (Хаб-интерфейс S06–S08: главная кнопка, досье, карта уровня, выбор режима)
- **Исполнитель**: `ui-pixel-designer`
- **Файлы**:
  - `apps/web/src/features/hub/HubOverlay.tsx`
  - `apps/web/src/features/hub/LevelMap.tsx`
  - `apps/web/src/features/hub/ModeSelect.tsx`
  - `docs/roadmap/kn01-aaa/evidence/W3-07/hub_ui_preview.png`
- **Требуемые рецензенты**:
  - `ux-accessibility-reviewer`
  - `art-director`
- **Проверки**:
  - `pnpm -C apps/web exec tsc --noEmit` — успешно.
  - `pnpm -C apps/web build` — успешно.
  - `python tools/validate_repo.py` — успешно.
