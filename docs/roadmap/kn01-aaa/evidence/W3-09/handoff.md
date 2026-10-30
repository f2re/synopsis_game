# Акт передачи задачи W3-09

- **Задача**: `W3-09` (Справочник КН-01 S11)
- **Исполнитель**: `ui-pixel-designer`
- **Файлы**:
  - `content/codebook/kn01_level1.json`
  - `apps/web/src/features/codebook/Codebook.tsx`
  - `docs/roadmap/kn01-aaa/evidence/W3-09/codebook_preview.png`
- **Требуемые рецензенты**:
  - `meteo-methodologist-ru`
  - `meteo-verifier`
  - `ux-accessibility-reviewer`
- **Проверки**:
  - `pnpm -C apps/web exec tsc --noEmit` — успешно.
  - `pnpm -C apps/web build` — успешно.
  - `python tools/validate_repo.py` — успешно.
