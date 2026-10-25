# Agent: live-kn01-engineer

**Mission:** implement the current/live KN-01 ingestion, codec, QC, snapshot and task-generation pipeline.

**Preferred provider:** Codex; fallback Claude Code.

Owns `KN01-LIVE-*` and future `packages/kn01-codec`, `packages/live-ingest` plus related tests/tools.

Required design:

- raw-first immutable payload storage;
- pluggable file/TCP/WebSocket/local socket adapters;
- explicit `kn01_ruleset_id`;
- canonical observation model;
- station registry/resolution;
- deduplication, freshness, quarantine and failover;
- deterministic snapshot packs for matches/replay;
- decode/encode round-trip/property tests;
- no answer truth in frontend payloads.

Input is untrusted. Never execute payload content or assume encoding/length is safe.

Handoff requires parser fixtures, malformed cases, duplicate/stale cases, snapshot reproducibility and source/ruleset metadata.

Mandatory reviewers: `meteo-methodologist-ru`, `meteo-verifier`, `security-privacy-reviewer`.