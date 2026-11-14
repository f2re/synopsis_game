import type { WorldCharacterAction } from '../../runtime/characterAssets';
import { getR01Decor } from './r01Layout.ts';

type Point = readonly [x: number, y: number];
type CrowdPlan = {
  id: string;
  costume: number;
  visitors: number;
} & (
  | { action: 'sit'; point: Point; facesLeft: boolean }
  | { action: 'talk'; point: Point; facesLeft: boolean; second: boolean; offset: number }
  | { action: 'walk'; from: Point; to: Point; travelMs: number; offset: number }
);

export const STATION_CROWD_TEXTURES = ['npc.r01.field-worker', 'npc.r01.map-worker', 'npc.r01.shift-worker'] as const;
export const STATION_VISITOR_LIMIT = 6;
export const STATION_VISITOR_LOW_POWER_LIMIT = 3;

export function stationVisitorCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0;
}

export function stationCrowdPlan(portrait: boolean): CrowdPlan[] {
  const benches = getR01Decor(portrait).filter(({ id }) => id === 'prop-bench');
  // The seat runs downhill to the right; the pot takes up the right third.
  // The seated cel's hips sit above its bottom (shoe) pivot.
  const seats: Point[] = benches.map(({ x, y, width, height }) => [x - width * .12, y - height * .49]);
  const conversation: readonly Point[] = portrait
    ? [[69, 591], [100, 594], [180, 578], [208, 581]]
    : [[549, 420], [578, 423], [294, 438], [323, 441]];

  return [
    { id: 'bench-west', costume: 0, visitors: 0, action: 'sit', point: seats[0], facesLeft: false },
    { id: 'bench-east', costume: 2, visitors: 0, action: 'sit', point: seats[1], facesLeft: false },
    { id: 'colleague-west', costume: 1, visitors: 0, action: 'talk', point: conversation[0], facesLeft: false, second: false, offset: 0 },
    { id: 'colleague-east', costume: 0, visitors: 0, action: 'talk', point: conversation[1], facesLeft: true, second: true, offset: 0 },
    { id: 'rounds', costume: 2, visitors: 0, action: 'walk', from: portrait ? [214, 531] : [371, 420], to: portrait ? [265, 546] : [431, 427], travelMs: 3200, offset: 1600 },
    { id: 'visitor-1', costume: 1, visitors: 1, action: 'walk', from: portrait ? [234, 630] : [690, 463], to: portrait ? [254, 592] : [815, 463], travelMs: portrait ? 3100 : 5800, offset: 950 },
    { id: 'visitor-2', costume: 2, visitors: 2, action: 'talk', point: conversation[2], facesLeft: false, second: false, offset: 1200 },
    { id: 'visitor-3', costume: 1, visitors: 3, action: 'talk', point: conversation[3], facesLeft: true, second: true, offset: 1200 },
    { id: 'visitor-4', costume: 0, visitors: 4, action: 'walk', from: portrait ? [25, 585] : [115, 472], to: portrait ? [19, 642] : [247, 472], travelMs: portrait ? 3300 : 6100, offset: 500 },
    { id: 'visitor-5', costume: 1, visitors: 5, action: 'sit', point: [seats[0][0] + 15, seats[0][1] + 5], facesLeft: false },
    { id: 'visitor-6', costume: 0, visitors: 6, action: 'sit', point: [seats[1][0] + 15, seats[1][1] + 5], facesLeft: false },
  ];
}

export function stationCrowdPose(plan: CrowdPlan, timeMs: number, reducedMotion: boolean, online: number) {
  if (plan.action === 'walk') {
    // Endpoints have a short rest before the worker turns back down the same path.
    const legMs = plan.travelMs + 1100;
    const clock = (timeMs + plan.offset) % (legMs * 2);
    const returning = clock >= legMs;
    const elapsed = clock % legMs;
    const progress = Math.min(1, elapsed / plan.travelMs);
    const t = reducedMotion ? plan.offset / plan.travelMs : returning ? 1 - progress : progress;
    return {
      x: plan.from[0] + (plan.to[0] - plan.from[0]) * t,
      y: plan.from[1] + (plan.to[1] - plan.from[1]) * t,
      action: (!reducedMotion && elapsed < plan.travelMs ? 'walk' : 'idle') as WorldCharacterAction,
      facesLeft: (plan.from[0] > plan.to[0]) !== (!reducedMotion && returning),
      elapsed,
    };
  }
  if (plan.action === 'talk') {
    const clock = (timeMs + plan.offset) % 6400;
    const turn = plan.second ? 3300 : 500;
    const hasPartner = plan.visitors === 0 || online >= 3;
    const talking = hasPartner && clock >= turn && clock < turn + 1050;
    return {
      x: plan.point[0], y: plan.point[1], facesLeft: plan.facesLeft, elapsed: Math.max(0, clock - turn),
      action: (talking && !reducedMotion ? 'talk' : 'idle') as WorldCharacterAction,
    };
  }
  return { x: plan.point[0], y: plan.point[1], action: 'sit' as const, facesLeft: plan.facesLeft, elapsed: 0 };
}
