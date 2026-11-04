---
name: ui-runtime-components
description: "Use for implementing React pixel HUD and dialogs, keyboard focus, touch interaction, Cyrillic typography and Phaser-to-React UI bridge."
---

# ui-runtime-components

## When to use

Use for implementing React pixel HUD and dialogs, keyboard focus, touch interaction, Cyrillic typography and Phaser-to-React UI bridge. Avoid substituting this for a separate security, meteorology, performance or art approval.

## Procedure

1. Read apps/web/src, agents/roles/ui-pixel-designer.md and docs/design/PIXEL_ART_STYLE_GUIDE.md before editing UI.
2. Implement states for default, hover, pressed, disabled, focus-visible, error and reduced-motion; keep task/map readable.
3. React owns menus/HUD, Phaser owns living-world animation; never write per-frame Phaser state into React.
4. Review desktop/mobile/projector with screenshots or accessible test traces when runnable and obtain independent UX acceptance.

## Evidence and acceptance

Record branch and exact commit, files touched, executed commands, observed outputs, unanswered cases, review decisions and next required reviewer (ui-pixel-designer and ux-accessibility-reviewer). Never treat source citations or static checks as live test runs. The internal agents/registry.yaml and AGENTS.md govern the project, not external templates. No automatic remote installation is authorized.
