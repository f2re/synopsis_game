# Agent Quality Gates

These gates supplement `docs/testing/QUALITY_GATES.md`.

## METEO_ACCEPTED

Required for any educational truth used in Ranked/Exam.

Evidence:

- explicit `method_profile`;
- source IDs and locators;
- `meteo-methodologist-ru` conclusion;
- independent `meteo-verifier` conclusion;
- ambiguity noted or ruled out;
- deterministic fixture/test where the rule can be encoded.

No consensus → no publication to Ranked/Exam.

## ART_ACCEPTED

Required for user-visible world/UI asset changes.

Checks:

- same game identity as fixed pixel-art references;
- semantic meteorological colors preserved;
- scene hierarchy correct;
- palette/time-of-day tokens used;
- world-location/solar-state policy respected;
- assets decomposable into reusable authored pieces.

## PERF_ACCEPTED

Required for animation-heavy/browser work.

Checks:

- desktop + mid-range mobile + projector profiles;
- no educational input blocked by ambient animation;
- reduced-motion path;
- sprite/texture memory documented;
- animation count/density budget;
- main-thread/frame timing measured once implementation exists.

## AUDIO_ACCEPTED

Checks:

- event-to-sound map documented;
- volume hierarchy keeps tasks intelligible;
- mute and reduced sensory profile;
- every third-party file has rights/provenance manifest;
- loops are seamless enough for long-running kiosk mode.

## SECURITY_ACCEPTED

Required for roster/auth/feed/realtime/public display changes.

Checks:

- threat model updated;
- server-side authz/input validation;
- PIN brute-force controls by deployment profile;
- external feed treated as untrusted;
- public display fields are allowlisted;
- no secrets or private data in client/log/replay.

## RELEASE_ACCEPTED

Required before a feature enters the shared playable baseline.

Checks:

- required gates above passed;
- CI/tests green;
- replay/version compatibility understood;
- docs/schema updated;
- acceptance criteria reproduced by integration agent;
- no unresolved critical ambiguity.