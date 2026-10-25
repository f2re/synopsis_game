# Multi-agent development

**Статус:** accepted

Разработка проекта распределяется между специализированными агентами Codex, Claude Code и Gemini/Antigravity, но критерии приёмки принадлежат роли, а не конкретной модели.

Главные файлы:

- [`../../AGENTS.md`](../../AGENTS.md) — общий operating contract;
- [`../../agents/registry.yaml`](../../agents/registry.yaml) — роли, preferred/fallback provider, ownership и gates;
- [`../../agents/README.md`](../../agents/README.md) — структура команды;
- [`../../agents/tasks/FOUNDATION_OWNERSHIP.md`](../../agents/tasks/FOUNDATION_OWNERSHIP.md) — владелец и reviewers каждой текущей foundation-задачи;
- [`../../agents/QUALITY_GATES.md`](../../agents/QUALITY_GATES.md) — METEO/ART/PERF/AUDIO/SECURITY/RELEASE gates;
- [`../decisions/ADR-0003-multi-agent-development-governance.md`](../decisions/ADR-0003-multi-agent-development-governance.md) — принятое архитектурное решение.

Provider entrypoints:

- Codex → [`../../AGENTS.md`](../../AGENTS.md);
- Claude Code → [`../../CLAUDE.md`](../../CLAUDE.md);
- Gemini/Antigravity → [`../../GEMINI.md`](../../GEMINI.md) + [`.agents/`](../../.agents/).

Критический принцип: агент, который реализовал gated-изменение, не может быть его единственным приёмщиком. Для метеорологической истины в Ranked/Exam обязательны две независимые роли: `meteo-methodologist-ru` и `meteo-verifier`.