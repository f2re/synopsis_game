# Workflow — Meteorology Acceptance

Use for Ranked/Exam content, KN-01 rules, station plotting, frontology, AT/OT, map analysis or explanatory feedback.

1. Freeze implementation/task version and identify `method_profile`.
2. `meteo-methodologist-ru` reconstructs the rule from approved sources and records citations/locators.
3. Separately, `meteo-verifier` derives the expected result from source/raw data without copying the first conclusion.
4. Compare conclusions.
5. If they agree, encode reproducible fixtures/tests where possible and mark `METEO_ACCEPTED`.
6. If they disagree, block publication and either correct the implementation, clarify evidence or create separate method-profile variants.

Never resolve a disagreement by majority vote or by choosing the model with the higher confidence statement.