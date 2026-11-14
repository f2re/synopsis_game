import type { WorldCharacterAction } from '../../runtime/characterAssets';

export const STATION_FAUNA_CYCLE_MS = 17_000;
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
  { start: 1100, duration: 680, from: 0, to: -.62, height: 0, action: 'run' },
  { start: 2580, duration: 450, from: -.62, to: -1, height: 0, action: 'run' },
  { start: 6100, duration: 880, from: -1, to: -.24, height: 0, action: 'run' },
  { start: 7890, duration: 420, from: -.24, to: 0, height: 0, action: 'run' },
];
const BIRD: readonly Cue[] = [
  { start: 3500, duration: 460, from: 0, to: -.25, height: 4, action: 'hop' },
  { start: 4700, duration: 460, from: -.25, to: -.5, height: 5, action: 'hop' },
  { start: 8650, duration: 1060, from: -.5, to: 1, height: 16, action: 'flutter' },
  { start: 12400, duration: 460, from: 1, to: .62, height: 5, action: 'hop' },
  { start: 14200, duration: 760, from: .62, to: 0, height: 10, action: 'flutter' },
];

export function isMovingFauna(id: string): boolean { return id === SQUIRREL_ID || id === TIT_ID; }

export function stationFaunaPose(id: string, time: number, portrait: boolean) {
  const squirrel = id === SQUIRREL_ID;
  const distance = squirrel ? (portrait ? 23 : 33) : (portrait ? 8 : 15);
  const clock = time % STATION_FAUNA_CYCLE_MS;
  let offset = 0;
  // Restart with the same heading as the last landing. This avoids an
  // instantaneous turn at the cycle boundary.
  let facingRight = squirrel;
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
