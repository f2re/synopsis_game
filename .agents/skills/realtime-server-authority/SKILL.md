---
name: realtime-server-authority
description: "Server-authoritative realtime matches, identity, replay and API contracts"
---

# realtime-server-authority

Read `apps/server`, `packages/contracts`, identity and arena role cards. Server owns answers, match state, ratings and rewards. Do not send correct answers to the client ahead of validation. Replay is versioned and deterministic; keep live feeds quarantined, authenticated events scoped and public display fields allowlisted. Exercise malformed input, duplicate messages, disconnect/reconnect, latency, authz and replay consistency. Route security review independently.


Evidence: list tested cases and exact commands, with independent reviewer decisions when required.
