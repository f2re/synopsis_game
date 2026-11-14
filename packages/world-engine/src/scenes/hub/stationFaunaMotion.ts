import type { WorldCharacterAction } from '../../runtime/characterAssets';

export const STATION_FAUNA_CYCLE_MS = 24_000;
const SQUIRREL_ID = 'animal_squirrel';
const TIT_ID = 'bird_tit';

interface Cue {
  start: number;
  duration: number;
  from: number;
  to: number;
  height: number;
  action: WorldCharacterAction;
}

// The two animals take turns. Each route returns to its starting point before
// the cycle repeats. Distances are in the logical coordinates of the plaza.
const RUN: readonly Cue[] = [
  { start: 2400, duration: 800, from: 0, to: -1, height: 0, action: 'run' },
  { start: 13000, duration: 800, from: -1, to: 0, height: 0, action: 'run' },
];
const BIRD: readonly Cue[] = [
  { start: 5800, duration: 460, from: 0, to: -0.25, height: 5, action: 'hop' },
  { start: 7100, duration: 460, from: -0.25, to: -0.5, height: 5, action: 'hop' },
  { start: 16900, duration: 1060, from: -0.5, to: 1, height: 17, action: 'flutter' },
  { start: 21700, duration: 460, from: 1, to: 0, height: 6, action: 'hop' },
];

export function isMovingFauna(id: string): boolean { return id === SQUIRREL_ID || id === TIT_ID; }

export function stationFaunaPose(id: string, time: number, portrait: boolean) {
  const squirrel = id === SQUIRREL_ID;
  const distance = squirrel ? (portrait ? 23 : 33) : (portrait ? 8 : 15);
  const clock = time % STATION_FAUNA_CYCLE_MS;
  let offset = 0;
  let facingRight = false;
  for (const cue of squirrel ? RUN : BIRD) {
    if (clock < cue.start) break;
    facingRight = cue.to > cue.from;
    const elapsed = clock - cue.start;
    if (elapsed < cue.duration) {
      const progress = elapsed / cue.duration;
      // The bird holds position through anticipation, then moves in one arc.
      const travel = cue.height ? Math.max(0, Math.min(1, (progress - 0.14) / 0.72)) : progress;
      return {
        x: distance * (cue.from + (cue.to - cue.from) * travel),
        y: -4 * cue.height * travel * (1 - travel),
        action: cue.action, elapsed, duration: cue.duration, facingRight,
      };
    }
    offset = cue.to;
  }
  return { x: distance * offset, y: 0, action: 'idle' as const, elapsed: 0, duration: 1, facingRight };
}
