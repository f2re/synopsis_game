# @synopsis/contracts

Versioned schemas and DTOs shared across web, server, replay and visual-runtime boundaries.

This package contains no business logic. It may define public task payloads, canonical observation structures, match/broadcast events, replay manifests and machine-checkable visual contracts.

## Visual contracts

`hub-main-screen.contract.json` is the source of truth for the approved main Hub composition and its runtime decomposition. It fixes the master identity/SHA, minimum fullscreen texture fidelity, L0–L7 split, time-of-day masks, runtime UI separation and screenshot/composite acceptance gates.

The logical interaction grid is not an art resolution. A scene may use 960×540 logical coordinates while its fullscreen raster source remains at least the native 1672×941 Hub master resolution.
