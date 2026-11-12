# Cozy station screens — independent browser Art / UX review

## Current verdict — PASS

**Independent Art / UX acceptance: `1038194`. Visual sources are unchanged in `6949d46`, so the accepted composition and screen layout remain approved for that revision.** Archive and login findings A1 and A2 are resolved; the local codebook dialog is accepted. The earlier `REQUEST_CHANGES` is preserved only as review history below.

Reviewer: `/root/settings_audio`, reviewing the UI by `/root` and `/root/library` and room artwork by `/root/sprite_art`. This reviewer authored the settings/audio implementation, so those areas require their separate independent review.

## Accepted visual evidence — `1038194`

- GitHub Actions run: `43162691773`; artifact: `13918806696`.
- Evidence directory: `/workspace/scratch/d61534510b4d/browser-final/`.
- Supplied browser report: **PASS**, 46 recorded cases, 28 screenshots, zero page errors.
- Independently inspected the nine changed `archive-{1440,390,844}.png`, `login-{1440,390,844}.png`, and `codebook-{1440,390,844}.png` captures. Unchanged screens retain the earlier qualified visual acceptance.

**A1 resolved.** The archive now opens a dedicated reading-room route with the approved room image, a real DOM heading, explanatory shelf panel, one gold library action and an explicit “На площадь” return. At all three sizes the primitive canvas placeholder and competing canvas controls are absent. The room, text and actions do not overlap. The portrait page stacks naturally, and the landscape page is vertically scrollable. This composition continues the main menu's warm reading-room / cool window palette.

The browser script and passing report additionally verify that entering the archive leaves zero canvas elements, returning to the campus mounts exactly one, and browser Back returns to the reading room without a hidden canvas. The new route is included in the allowed return paths and uses the indoor library atmosphere surface; these details were also checked in source.

**A2 resolved.** Login fields are now vertically arranged with explicit group, user and personal-code labels. The group label resolves in the browser case at each viewport; the later real-server scenario selects the labeled fields and completes login. At landscape height, the modal intentionally shows a scrollable portion of the form. Its source defines vertical overflow rather than clipping inaccessible controls. The short screenshot is not evidence that all fields fit simultaneously.

**Local codebook accepted.** The native dialog now appears over the retained library rather than replacing the route. It keeps a visible close action, search, selected code group and paper article in all three sizes. Source inspection confirms that closing unmounts the dialog, restores the opener focus and retains the library component/state. The passing browser scenario opens the local dialog, presses Escape and proceeds from the library. The earlier lazy-route focus check also passes for the library heading.

### Interpretation of the full-page modal images

The captures use `fullPage: true`. A modal opened after scrolling to the library footer appears at the corresponding document offset in the long PNG, while the viewport-sized backdrop covers the active visible area. Likewise, the long portrait login capture includes underlying page content beyond the current viewport. These images must not be interpreted as two simultaneously visible interactive screens or as a dialog intentionally placed at the bottom of the viewport. Some headed captures have 15 pixels less document width because of the scrollbar; the report shows no document horizontal overflow beyond the viewport.

### Independence and later verification

This **PASS is for Art / UX composition and the reviewed navigation changes at `1038194`, retained for unchanged visual sources in `6949d46`**. It does not self-approve this agent's settings or audio implementation. The later revision changes only the Phaser `audio: { noAudio: true }` configuration and its audio-context assertions; the accepted visual sources are unchanged.

CI6 for `6949d46` (run `43163311875`) subsequently passed, with one AudioContext after the campus and final exit. That execution result is separate audio evidence, supplied by the release owner; independent audio/performance acceptance belongs to the library reviewer. The accepted evidence is in `/workspace/scratch/d61534510b4d/browser-accepted/`, with seven selected screenshots committed under `docs/testing/evidence/cozy-screens-r01/`. The nine changed images already inspected for this Art / UX review remain the `1038194` captures; no new visual test is claimed here.

## Historical first review — `980a06b`

### Scope and evidence of the first review

- Task: cozy station screens, independent Art Director / UX accessibility review.
- Reviewer: `/root/settings_audio`, reviewing UI by `/root` and `/root/library` and the room art by `/root/sprite_art`.
- **Independence boundary:** settings and audio were implemented by this reviewer. This report does not approve those areas or their performance.
- Screenshot revision: `980a06b`.
- GitHub Actions run: `43161519857`; artifact: `13917554479`.
- Browser: Chromium `151.0.7922.34`, production assets and real server according to `browser-report.json`.
- Viewports: 1440 × 1000, 390 × 844, 844 × 390. Long page images are full-page captures, not evidence that all content fits in one viewport.
- Downloaded evidence: `/workspace/scratch/d61534510b4d/browser-first/`.
- Inspected directly: `home`, `library`, `help`, `campus`, `archive`, `exit`, and `codebook` PNGs at all three widths (21 images), plus `failure-1794461387545.png`.
- The supplied browser run is **FAIL**, stopping at the login label lookup. Its successful preceding screen cases do not constitute overall browser acceptance.

The source/export pixel-art acceptance remains separately recorded in `2026-11-12-station-room-art-review.md`. This review assesses the actual browser composition and legibility of that resource in the screens.

### Historical verdict for `980a06b`: REQUEST_CHANGES — superseded by the PASS above

The main menu, library, help, campus navigation, exit, and visible codebook layout are accepted within the screenshot scope. The archive has a concrete obstruction and readability problem at all three sizes. The known login regression also blocks overall acceptance. A corrected run is required; later code revisions are not accepted based on these earlier screenshots.

| Screen | 1440 px | 390 px | 844 px | Finding |
| --- | --- | --- | --- | --- |
| Main menu | PASS | PASS | PASS | One clear gold campus action; complete Russian labels; warm room and cool window retain their visual roles. |
| Library | PASS | PASS | PASS | Article, search, topics, source links and bookmarks remain legible; scene is subordinate to the reading task. |
| Help | PASS | PASS | PASS | Clear first-shift steps, keyboard guidance and FAQ; text wraps without obstruction. Mobile naturally requires vertical reading. |
| Campus | PASS | PASS | PASS | Top controls and bottom navigation remain within the viewport; the central shift action stays distinct. |
| Archive | REQUEST_CHANGES | REQUEST_CHANGES | REQUEST_CHANGES | The added library CTA overlaps canvas controls, and the old schematic room is illegible/cropped on mobile. |
| Exit | PASS | PASS | PASS | Calm final state, complete exit explanation and one return action; landscape content remains scrollable. |
| Codebook | PASS, visible layout | PASS, visible layout | PASS, visible layout | Heading and close action remain accessible; article uses readable paper contrast. Screenshots alone do not verify focus trapping, scrolling or state restoration. |

The browser report records `scrollWidth == viewport width` and no broken images for the sampled screen cases. This supports the absence of document-level horizontal overflow, but does not detect clipping inside the archive canvas.

### Findings from the first review — resolved

#### A1 — Archive canvas and new CTA compete for the same area

Evidence: `archive-1440.png`, `archive-390.png`, `archive-844.png`.

- At 1440 px the new DOM “Открыть библиотеку” card intersects the canvas's lower actions, including its return region.
- At 844 × 390 the DOM card covers the old “Архивные ситуации / Старые карты / Коллекции” area. The visual affordances suggest clickable destinations that are obscured by a different foreground action.
- At 390 × 844 the canvas is a small schematic strip surrounded by a large empty dark region. “Архив” and its description are clipped at the left edge; the old canvas labels are too small to read comfortably. The lack of document horizontal overflow does not resolve this internal crop.
- The primitive archive room also produces a conspicuous style discontinuity after the detailed regional campus and newly approved reading room. Its simple mountain window is inconsistent with the water / low-horizon regional atmosphere established by the new room.

Requested fix: make the archive a deliberate reading-room presentation with the approved `StationRoomArt`, a real DOM heading and one clear library action, while retaining the existing route/navigation back to the campus. Remove or hide the obsolete schematic canvas controls from that presentation. Use the existing responsive room assets; another generation is not needed. Confirm the result at all three viewports in a new browser run.

#### A2 — Login form has lost its vertical field layout

Evidence: `failure-1794461387545.png` and the run's reported `getByLabel('Группа', { exact: true })` timeout.

The screenshot shows group, user and personal-code labels running inline with adjacent fields. The text field is squeezed to a narrow width. The test failure additionally indicates that the intended group accessible label was not resolved. Root already identified and is fixing this lazy-style / labeling regression. Recheck the rendered form and successful labeled interaction after the fix; a visual-only inspection is not sufficient.

### Library mini-scene: accepted composition

The added mini-scene is successful in the actual browser captures, not merely in source review:

- At 1440 px it occupies approximately 404 × 228 pixels beneath “Каталог”; the bookcase, lamp, reading desk, water and window are recognizable.
- At 844 px the approximately 246 × 139 rendering still preserves the warm lamp against the cool exterior. The article retains the larger area and stronger reading hierarchy.
- At 390 px it is omitted from the single-column reading view. The article, return-to-catalog action, source links and related concepts receive the space.
- The dark catalog / paper article separation is clear, and the selected concept remains identifiable. The image does not contain competing labels or controls.

The same source image ties the library to the main menu without requiring a second visual style. No corrective asset work is needed for this use.

### Main menu, help and exit

The main menu clearly presents “Войти в кампус” as the primary action. Help, settings, library and exit are separate, readable controls. In portrait the menu precedes the large scene, so basic navigation is not pushed below the illustration. At 844 px the two-column layout remains legible with natural page scrolling.

The help page uses a useful visual distinction between the paper first-shift guide and dark interaction/FAQ sections. The revised “Посмотреть кампус” label matches the current campus interaction model. The long mobile page is readable; no buttons or text are covered by decorative art.

Exit presents the stopped session as a completed state and explains that the browser tab may be closed. The return action is easy to identify. The landscape full-page capture is 480 px high for a 390 px viewport; this is normal scrollable content, not a claim of one-screen fit.

### Acceptance boundary recorded at the first review

The planned newer revision includes the library-local codebook overlay and a campus focus fallback. Earlier source review recommended these to preserve library query/article state and provide a meaningful focus destination for a campus screen without an `h1`. The images reviewed here cannot verify the newer implementation. Require the next actual browser result for its interaction/focus assertions and the archive/login corrections.

This review does not claim a screen-reader audit, physical-device GPU profiling, audible music quality evaluation, or an overall release PASS. Those remain separate gates and, for this reviewer's own settings/audio changes, require an independent reviewer.
