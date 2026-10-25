# Workflow — Start Foundation Development Cycle

1. Read `docs/roadmap/FOUNDATION_EPICS.md` and `agents/tasks/FOUNDATION_OWNERSHIP.md`.
2. Select the highest-priority unblocked task.
3. Load its owner role card and mandatory domain docs.
4. Create/checkout `agent/<agent-id>/<task-id>-<slug>`.
5. Restate acceptance criteria and dependencies before implementation.
6. Implement the smallest vertical slice that proves the task.
7. Run owner-level tests.
8. Produce the handoff block from `agents/ROUTING_AND_HANDOFF.md`.
9. Route to every required independent reviewer.
10. Only after all blocking gates pass, route to `integration-release-engineer`.

Parallelization rule: parallel tasks must not edit the same hot file unless the orchestrator records the merge order first.