---
name: audio-direction-qa
description: "Use for designing and reviewing Hub audio cues, soundscape mix, rights, browser gesture activation, mute and accessible audio fallback."
---

# audio-direction-qa

## When to use

Use for designing and reviewing Hub audio cues, soundscape mix, rights, browser gesture activation, mute and accessible audio fallback. Avoid substituting this for a separate security, meteorology, performance or art approval.

## Procedure

1. Read packages/world-engine/src/audio/WorldAudioManager.ts and audioDefinitions.ts plus the current sound design contract.
2. Define event IDs, source asset, cue priority, loop/crossfade, weather/season variations and quiet study limits.
3. Do not convey essential educational truth through sound alone; verify mute/reduced-sensory, pause, scene teardown and user gesture.
4. Require clear audio file provenance, license and attribution; document tested mix conditions and Art Director review.

## Evidence and acceptance

Record branch and exact commit, files touched, executed commands, observed outputs, unanswered cases, review decisions and next required reviewer (audio-ambient-designer, art-director and ux-accessibility-reviewer). Never treat source citations or static checks as live test runs. The internal agents/registry.yaml and AGENTS.md govern the project, not external templates. No automatic remote installation is authorized.
