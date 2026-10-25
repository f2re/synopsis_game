# Skill — Live KN-01 Pipeline

Use for real-station ingest, codec, QC, task generation and answer validation.

Read:
- `docs/content/LIVE_KN01_PIPELINE.md`
- `docs/01_RUSSIAN_SYNOPIC_SCHOOL.md`
- `docs/09_SOURCE_POLICY.md`
- `agents/roles/live-kn01-engineer.md`

Procedure:
1. Preserve immutable raw input + source metadata.
2. Resolve station/time/ruleset before gameplay.
3. Parse into canonical observation with explicit `kn01_ruleset_id`.
4. Run syntax/QC/dedup/freshness/quarantine.
5. Freeze validated observations into deterministic snapshot packs.
6. Generate tasks and expected answers server-side.
7. Test encode/decode round trips and malformed cases.
8. Route methodology to both meteorology reviewers and feed boundary to Security.

Never let a live network feed become a synchronous dependency for each match question.