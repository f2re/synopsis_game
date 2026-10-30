# Акт передачи задачи W3-06

- **Задача**: `W3-06` (Онбординг S04–S05: выдача формы и брифинг наставника)
- **Исполнитель**: `ui-pixel-designer`
- **Файлы**:
  - `apps/web/src/features/onboarding/BriefingScreen.tsx`
  - `apps/web/src/features/avatar/AvatarEditor.tsx`
  - `apps/web/src/features/avatar/avatarOptions.ts`
  - `apps/web/src/features/avatar/AvatarOptionGrid.tsx`
  - `docs/roadmap/kn01-aaa/evidence/W3-06/onboarding_preview.png`
  - `docs/roadmap/kn01-aaa/evidence/W3-06/briefing_demo.gif`
- **Требуемые рецензенты**:
  - `ux-accessibility-reviewer`
  - `art-director`
  - `gameplay-balance-designer`
- **Проверки**:
  - `pnpm -C apps/web exec tsc --noEmit` — успешно.
  - `pnpm -C apps/web build` — успешно.
  - `python tools/validate_repo.py` — успешно.
