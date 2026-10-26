# Server modules

Planned Foundation modules:

- `identity`
- `live-ingest`
- `realtime`
- `broadcast`
- `replay`
- `rewards`

Internal modules may depend on `packages/contracts`, `packages/kn01-codec`, `packages/content-engine` and `packages/game-rules` through explicit interfaces. Avoid circular imports between modules.
