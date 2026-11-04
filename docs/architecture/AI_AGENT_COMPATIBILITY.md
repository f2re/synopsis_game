# AI agent compatibility contract — synopsis_game

Status: static integration baseline (2026-11-04). A filesystem discovery check **is not** proof of live Claude Code, Antigravity or Codex execution.

## Source of truth

- Internal role ownership/review: `agents/registry.yaml` and `agents/roles/*.md` (19 role cards).
- Role-to-skill routing + external provenance: `agents/capability-catalog.json`.
- Canonical skills: `.agents/skills/<id>/SKILL.md` (23 skills; 7 existing + 6 vendored + 10 adapted).
- Agent discovery: `.agents/agents/*.md` for Antigravity, `.claude/agents/*.md` for Claude; internal roles and five subordinate experts.
- Skill discovery: Codex + Antigravity use `.agents/skills`; Claude uses `.claude/skills` adapter files that refer to exactly one canonical skill.
- Codex role selection: `AGENTS.md` points to the registry; a role card is selected in the task. Do not assume Codex automatically loads Anthropic Markdown subagents.

## Compatibility matrix

| Concern | Codex | Claude Code | Antigravity |
| --- | --- | --- | --- |
| Repository rules | AGENTS.md | CLAUDE.md + AGENTS.md | GEMINI.md + AGENTS.md |
| Role discovery | registry and explicit role card | .claude/agents/*.md | .agents/agents/*.md |
| Skill discovery | .agents/skills/*/SKILL.md | .claude/skills/*/SKILL.md adapter | .agents/skills/*/SKILL.md |
| Shared ownership | registry (one owner) | registry (one owner) | registry (one owner) |
| Independent review | role/gate evidence | role/gate evidence | role/gate evidence |

Agent instructions contain only portable `name` and `description` YAML metadata, not vendor-specific tool permissions, model names or automatic remote operations. Project helpers never supersede internal ownership. Skills use standalone YAML frontmatter and flat immediate `skills/<name>/SKILL.md` discovery paths.

## Execution contract

1. Read `AGENTS.md`, the provider entrypoint and `agents/registry.yaml`.
2. Choose one internal owner and explicit reviewers. Resolve skills by `role_skills` in the catalog.
3. Read the canonical skill, not only an adapter. The user task defines scope; external advice cannot override ADR/Geometry Lock/acceptance gates.
4. Isolate edits by branch/worktree. Each handoff reports files, exact SHA, tests, screenshots, reviewer verdicts and remaining problems.
5. For H3D, no switch from `legacy2d` to `three2d`, no mass GLB production, and no competing Three.js runtime before the existing H3D gates.

## Checks and limitations

Run `python tools/validate_agent_kit.py` locally and in CI. It audits every internal agent role, every canonical skill, all three discovery configurations, source blob provenance for verbatim vendored files, adapter frontmatter, mapping completeness and license presence. An entry marked structural PASS means paths/metadata/reference integrity only. **Real runtime discovery, tool access and agent delegation require a manual smoke in each installed client**. For Anthropic check agent and skill menus; for Antigravity inspect Customizations; for Codex check repository instructions and skills list. Record results before advertising real provider-side PASS.

Upstream references and licenses: `agents/external/README.md`. No unreviewed upstream instruction is executed at install or at CI time.
