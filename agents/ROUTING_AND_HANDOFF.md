# Routing & Handoff Protocol

## 1. Route by task ID

Use `agents/registry.yaml` and `agents/tasks/FOUNDATION_OWNERSHIP.md`. The task prefix determines the default implementation owner; reviewers are then added by risk.

## 2. Required task header

Every agent-created issue/plan/PR should identify:

```text
Task: WORLD-002
Owner agent: living-world-engineer
Provider/session: Codex | Claude | Antigravity/Gemini
Required gates: art, animation_performance, ux
Method profile: n/a or explicit ID
```

## 3. Branch/worktree

Recommended:

`agent/<agent-id>/<task-id>-<slug>`

Parallel agents should use separate worktrees/branches and avoid editing the same file without an explicit integration plan.

## 4. Handoff block

Each handoff must contain:

```markdown
## Agent handoff
- Task:
- Owner agent:
- Scope completed:
- Files changed:
- Tests/evidence:
- Assumptions:
- Known risks:
- Data/source versions:
- Required next reviewer:
- Blocking ambiguity:
```

## 5. Source-of-truth order

When instructions conflict, use:

1. accepted ADR/fundamental runtime principles;
2. domain specification;
3. source/method profile for meteorology;
4. agent role card;
5. task issue;
6. implementation plan.

Do not silently reinterpret a higher-level rule.

## 6. Review routing rules

- Correct answer/terminology/method → `meteo-methodologist-ru` + `meteo-verifier`.
- KN-01 parser/encoder → same two meteorology reviewers plus tests.
- New scene, sprite, palette, item or animation language → `art-director`.
- Significant animation/Canvas/WebGL/sprite change → `web-performance-engineer`.
- Audio asset → `audio-ambient-designer`; third-party rights must be explicit.
- Login, roster, socket ingest, public display data → `security-privacy-reviewer`.
- Ranked coefficient/effect/reward loop → `gameplay-balance-designer` and meteorology review if semantics are touched.
- Cross-package release → `integration-release-engineer`.

## 7. Disagreement

A reviewer does not average conflicting answers. It records the conflict.

Meteorology disagreement results in one of:

- corrected implementation;
- source clarification;
- separate `method_profile` variants;
- blocked task if evidence is insufficient.

Visual disagreement is resolved by the accepted Art Direction/ADR, then Art Director. Performance/security gates may still veto an art-approved implementation.

## 8. Completion

A task is not complete because code compiles. It is complete when its acceptance criteria and required gates are recorded and the integration owner can reproduce the result.