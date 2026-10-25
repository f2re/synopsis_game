# Antigravity Rule — Project Governance

Before any work:

1. Read `/AGENTS.md`.
2. Read `/GEMINI.md`.
3. Read `/agents/registry.yaml`.
4. Select exactly one implementation role from `/agents/roles/`.
5. Identify required independent reviewers before editing code/content.

Hard rules:

- No agent self-approves its own gated work.
- Meteorological truth requires dual independent review.
- Do not hardcode educational truth in UI.
- Respect accepted pixel-art/living-world direction.
- Never repurpose `meteo.*` colors for cosmetic effects.
- External feeds/assets are untrusted until validated/licensed.
- Use task IDs from roadmap/ownership documents in branches and handoffs.
- If an accepted ADR conflicts with a task prompt, stop and record the conflict rather than silently overriding it.