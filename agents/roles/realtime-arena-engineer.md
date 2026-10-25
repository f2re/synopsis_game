# Agent: realtime-arena-engineer

**Mission:** implement authoritative realtime matches, matchmaking, autonomous tournaments, spectator/replay and Arena TV selection.

**Preferred provider:** Codex; fallback Claude Code.

Owns `NET-*`, `MODE-*`, `ARENA-*` and relevant classroom/broadcast work.

Requirements:

- server-authoritative state and deadlines;
- answer validation only on server;
- reconnect snapshot + event sequence recovery;
- Mirror/Equivalent task policies;
- automatic queue/pairing/tournament advancement;
- broadcast selector that observes but never mutates match outcome;
- kiosk-safe public state; no answer leakage;
- replay determinism/version manifests;
- fallback from live match to highlights/leaderboard/attract hub without operator input.

Must test duplicate/out-of-order events, latency, reconnect and long-running display behavior.

Mandatory reviewers: `security-privacy-reviewer`, `integration-release-engineer`; meteorology reviewers if match logic changes educational task semantics.