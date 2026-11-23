import type { WorldCharacterDefinition } from '../../runtime/characterAssets';
import type { stationCrowdPlan } from './stationCrowd';

/** Coordinates belong to the R08/R09 512×288 composition, never to a viewport. */
export const R09_ACTOR_SPACE = { width: 512, height: 288 } as const;
type Point = [number, number];
type Placement = { point: Point; height: number; patrol?: [number, number] };

const PLACEMENTS: Record<string, Placement> = {
  'character.r01.observer': { point: [121, 217], height: 16, patrol: [116, 156] },
  'npc.r01.vera': { point: [302, 218], height: 16 },
  'companion.r01.pascal': { point: [194, 247], height: 12 },
  'animal_squirrel': { point: [104, 229], height: 16 },
  'bird_tit': { point: [371, 229], height: 12 },
};
const CROWD_IDS = new Set(['npc.r01.field-worker', 'npc.r01.map-worker', 'npc.r01.shift-worker']);

export function r09ActorDepth(footY: number): number {
  return 20 + Math.max(0, Math.min(R09_ACTOR_SPACE.height, footY)) / R09_ACTOR_SPACE.height * 10;
}

/**
 * Reuse accepted authored frames, durations and foot pivots. Unknown NPCs are not
 * copied to arbitrary positions; in particular no old fountain overlays the
 * fountain already drawn into this composition. The source manifest is untouched.
 */
export function r09CharacterDefinition(source: WorldCharacterDefinition): WorldCharacterDefinition | undefined {
  if (source.role === 'crowd' && CROWD_IDS.has(source.id)) {
    return { ...source, displayHeight: 16, positions: { landscape: [0, 0], portrait: [0, 0] } };
  }
  const placement = source.role === 'npc' ? PLACEMENTS[source.id] : undefined;
  if (!placement) return undefined;
  const motion = placement.patrol && source.motion && source.clips.walk ? {
    ...source.motion,
    speed: 6,
    patrol: {
      landscape: [...placement.patrol] as Point,
      portrait: [...placement.patrol] as Point,
      depth: r09ActorDepth(placement.point[1]),
    },
  } : undefined;
  return {
    ...source,
    displayHeight: placement.height,
    positions: { landscape: [...placement.point], portrait: [...placement.point] },
    motion,
  };
}

/** Short authored fauna cues keep their timing; their travel fits this scene. */
export function r09FaunaOffset(x: number, y: number): Point { return [x * .4, y * .4]; }

/** The new courtyard has no matching pair of R01 seats. Every pose has firm ground. */
export function r09CrowdPlan(): ReturnType<typeof stationCrowdPlan> {
  return [
    { id: 'colleague-west', costume: 1, visitors: 0, action: 'talk', point: [344, 221], facesLeft: false, second: false, offset: 0 },
    { id: 'colleague-east', costume: 0, visitors: 0, action: 'talk', point: [357, 222], facesLeft: true, second: true, offset: 0 },
    { id: 'visitor-1', costume: 1, visitors: 1, action: 'walk', from: [388, 222], to: [420, 222], travelMs: 6400, offset: 1500 },
    { id: 'visitor-2', costume: 2, visitors: 2, action: 'talk', point: [192, 236], facesLeft: false, second: false, offset: 1200 },
    { id: 'visitor-3', costume: 1, visitors: 3, action: 'talk', point: [205, 237], facesLeft: true, second: true, offset: 1200 },
    { id: 'visitor-4', costume: 0, visitors: 4, action: 'walk', from: [138, 264], to: [206, 264], travelMs: 10400, offset: 1000 },
    { id: 'visitor-5', costume: 1, visitors: 5, action: 'walk', from: [75, 207], to: [112, 207], travelMs: 7400, offset: 3000 },
    { id: 'visitor-6', costume: 0, visitors: 6, action: 'walk', from: [249, 274], to: [311, 274], travelMs: 10000, offset: 4600 },
  ];
}

export function r09HasContactShadow(definition: WorldCharacterDefinition): boolean {
  return definition.role === 'crowd' || definition.id === 'character.r01.observer' || definition.id === 'npc.r01.vera';
}
