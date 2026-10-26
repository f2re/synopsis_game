---
name: russian-synoptic-acceptance
description: Acceptance procedures when a task changes meteorological truth, terminology, answer validation or feedback under Russian synoptic school standards.
---

# Skill — Russian Synoptic Acceptance

Use when a task changes meteorological truth, terminology, answer validation or feedback.

Read:
- `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md`
- `docs/09_SOURCE_POLICY.md`
- selected method profile and source registry
- `agents/roles/meteo-methodologist-ru.md`
- `agents/roles/meteo-verifier.md`

Procedure:
1. Identify the exact claim and target mode (training/ranked/exam).
2. Resolve source, edition, locator and method profile.
3. Derive the expected answer independently twice using the two reviewer roles.
4. Check Russian notation and operation order.
5. Encode fixtures/tests for machine-checkable parts.
6. Block ambiguous answers; split method profiles if legitimate traditions differ.

Output: source-backed expected answer, profile, citations/locators, tests, reviewer verdicts.