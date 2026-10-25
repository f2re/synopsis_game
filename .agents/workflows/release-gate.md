# Workflow — Integration / Release Gate

1. Collect task handoff and required gate evidence.
2. Verify no gate was approved by the implementation owner itself.
3. Re-run relevant CI/unit/integration/E2E/content/replay tests.
4. Reproduce the user-facing acceptance criterion on required profiles: desktop, mobile and/or projector.
5. Verify manifests: method profile, KN-01 ruleset, content/snapshot, game rules, balance and replay versions where applicable.
6. Confirm docs/schema/changelog reflect behavior.
7. If any blocking gate or ambiguity remains, return to owner with exact failure.
8. Otherwise record `RELEASE_ACCEPTED` and integrate in dependency order.