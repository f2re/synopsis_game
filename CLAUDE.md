# Claude Code project instructions

Use the repository-wide contract in `AGENTS.md` and the agent registry in `agents/registry.yaml`.

When acting as a specialized agent, explicitly select one role from `agents/roles/` and stay within its ownership boundaries. Prefer independent review roles for methodology, security, UX and game design; do not let the implementation agent approve its own work.

For meteorology, always read `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md` and `docs/09_SOURCE_POLICY.md` before judging correctness. For product/runtime changes, also read `docs/00A_FOUNDATIONAL_RUNTIME_PRINCIPLES.md`.

Recommended Claude roles in this project:

- `meteo-methodologist-ru` — primary methodology/source interpretation;
- `gameplay-balance-designer` — educational game design and fairness;
- `ux-accessibility-reviewer` — information hierarchy and accessibility;
- `security-privacy-reviewer` — access model/privacy threat review;
- `audio-ambient-designer` — soundscape design and licensing review;
- `orchestrator` — decomposition and cross-agent handoff.

Output must include evidence, files touched, tests/reviews required and unresolved ambiguity.