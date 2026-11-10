# MODULAR-PLAYER-R01 — рабочий контур и интерфейс: передача

Date: 2026-11-10. Implementation owner: `/root/ui_review` (`game-runtime-webgl-engineer`, UI integration). Independent technical reviewer: `/root/server_review`; see `docs/testing/2026-11-10-modular-player-independent-review.md`. No commits were made by the implementation owner.

## State

**Реализация рабочего контура и локальные проверки: PASS. New art activation remains blocked.** The actual candidate atlas/manifests are complete by catalog but retain `artAcceptance: PENDING`. The production parser rejects them; the existing personal Canvas remains the wardrobe fallback. No NPC is substituted for a saved appearance. A separate in-memory schema probe confirms that the generated candidate matches the new contract, without modifying its acceptance status.

The candidate publishes four directions and `idle` only. Поддерживаются необязательные авторские `walk` и `inspect`; unavailable actions resolve to idle with a diagnostic, and accepted-pack UI capabilities omit their buttons. The future blitz context is a pure appearance adapter. No playable blitz route or scoring/equipment effect was added.

## Implemented

- `packages/world-engine/src/runtime/modularAvatarManifest.ts`: 96×144 rig, foot pivot `(48,136)`, complete 42-value coverage, exact four-color skin/hair remapping contract, shared pose z-order and context adapter. Required body/clothing/companion frames cannot be empty; optional accessories require explicit `hidden: direction | occlusion` when absent. `none` remains empty.
- `packages/world-engine/src/runtime/modularAvatarCompositor.ts` and `src/avatar.ts`: shared local manifest/image loader, palette-cell and composition caches, leased resources, reusable body and child sheets. Отрисовка использует авторские фрагменты без синтеза движений или генерации сочетаний одежды. Cache limits are 12 MiB for composites and 4 MiB for palette cels; the manifest permits at most 16 MiB of decoded atlas pixels. These are software limits, not a physical-device measurement.
- `WorldBridge.ts`, `characterAssets.ts`, `HubModularAvatarLayer.ts`, `HubScene.ts`, `HubCharacterLayer.ts`, `WorldCanvas.tsx`: full saved profile, independent child companion, Phaser-owned upload canvases, stale-response/logout/destroy protection, diagnostics, and reservation within the existing three-actor scene animation cap. Reduced motion freezes authored frames; low power samples less often. Missing walk frames cannot become a sliding idle figure.
- `AvatarPreview.tsx`, `LegacyAvatarPreview.tsx`, `AvatarEditor.tsx`: shared accepted renderer with explicit personal fallback and capabilities. Existing per-account draft storage/recovery remains in place. A stable family-wide companion envelope and `object-fit: contain` preserve the person's scale and aspect ratio across companion choices within the existing 2:3 CSS viewport.
- `App.tsx`, `SeamlessShiftFlow.tsx`, `ShiftWorkspace.tsx`: saved appearance reaches the learning UI; held item is overlaid from the current shift's server equipment snapshot. Other appearance fields and all reward/buff rules are preserved.
- `packages/world-engine/package.json`, `apps/web/vite.config.ts`: pure `@synopsis/world-engine/avatar` entry and an explicit Vite alias before the main package alias.
- `tools/test_world_characters.cjs`: the existing test loader now supplies the pure profile contract dependency.

## Validation

| Check | Observed result |
|---|---|
| Web TypeScript | PASS; `web-typecheck.txt` |
| World-engine TypeScript | PASS |
| Web production build | PASS; `web-build.txt`; existing large-chunk/dynamic-import warnings remain |
| Native TypeScript modular + existing character tests | 16/16 PASS; `modular-and-character-unit.txt` |
| New asynchronous Phaser adapter regression | PASS; `modular-lifecycle.txt` |
| Existing character lifecycle regression | PASS |
| Inventory + draft regression | PASS: 11 slots, 42 values, 24 items, 29 images, 3 presets; account isolation/recovery retained |
| Deterministic modular asset rebuild | PASS; `asset-check.txt`; candidate remains PENDING |
| Actual candidate schema | PASS for schema only; production pending gate rejects as required; `candidate-schema.txt` |

The asynchronous regression covers stale profile loads, logout, scene destroy, lease release, ownership of GPU upload surfaces, companion foot placement, animation reservation, reduced motion, low-power sampling, walk-to-idle completion, missing clips and failed art loading. The pure tests cover server catalog parity, required pose coverage, explicit occlusion, exact RGB/alpha preservation, action timing, cache eviction and shared context/profile identity.

## Browser and remaining gates

`tools/test_modular_avatar_layout.cjs` is a repeatable real-component layout probe for viewport widths 375, 680, 1000 and 1440, with and without a companion. It intercepts a synthetic manifest only in its test page and reuses existing PNG bytes; it does not accept or publish any character art. Local Chromium launch was blocked by the executor's process-singleton socket restriction (`EPERM`). The Cloud Browser could not reach that executor's localhost. **No browser-layout PASS is claimed here.** Root will use the existing native HTTP review stand on port 5181 for the actual candidate and responsive layout.

Art Director/technical pixel review, real browser/GPU measurements, all hair/headwear overlaps and final Integration & Release acceptance are still required before activation. Current art stays gated independently of successful code tests.

## CI additions

The required workflow now includes:

```sh
python tools/assets/build_modular_player_r01.py --check
node --experimental-strip-types --test packages/world-engine/src/runtime/modularAvatar.test.ts
node tools/test_modular_avatar.cjs
```

Local checks used Node 24.22.1. GitHub CI remains pinned to Node 22.23.4 and retains its Linux/Astra release gates. This handoff does not claim those remote gates have already run.
