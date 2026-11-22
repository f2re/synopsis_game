# Hub 2.5D experimental integration status

The 2026-11-22 integration retains this renderer behind an explicit query and WebGL2 capability check. Production remains the current R02 Phaser station. The experimental module is a separate lazy chunk, and the current server, saved portraits, R07 environment and DOM dialogs remain authoritative.

## Integrated code

PR #95 includes the ancestry of #79, #80, #87, #89, #90, #92, #97, #98 and #106. PR #102 adds shader safety/configuration; #117 adds bounded 320/480/640 resolution profiles. The malformed shell continuation in #117 has been corrected. All 97 existing world/runtime/shader unit tests pass in the integration workspace.

The separate experimental scene now handles both SHUTDOWN and DESTROY idempotently, reads live presentation preferences, shares React dialogs, and cancels retired bridge listeners. Its Three canvas pauses across context loss and hidden documents. Runtime model tests do not establish browser or GPU acceptance.

## Production gates retained

- independent final composition/art approval;
- hardware GPU and resource budgets on supported devices;
- approval of the candidate collision-review geometry (the historical canonical geometry still has six documented footprint conflicts);
- production character rig/artwork;
- any change of the default renderer.

The safe collision-review layout remains opt-in as `hubLayout=collisionReview`. Historical reports keep their original acceptance boundaries. Current integration evidence and remaining checks are recorded in `docs/testing/2026-11-22-open-pr-integration.md`.
