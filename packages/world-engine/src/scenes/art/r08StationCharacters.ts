import type { StationCharacterPlacement } from '../hub/HubCharacterLayer';
import { R08_STATION_SCALE } from './r08StationLayout.ts';

const at = (x: number, y: number): [number, number] => [x * R08_STATION_SCALE, y * R08_STATION_SCALE];

// Points mark footsteps on paved landings, forward of the building base.
// R08 uses the same source-space positions when the mobile camera pans.
const fixedPoints: Record<string, [number, number]> = {
  'character.r01.observer': at(290, 231),
  'npc.r01.vera': at(178, 216),
  'companion.r01.pascal': at(278, 244),
  animal_squirrel: at(366, 224),
  bird_tit: at(136, 231),
};

export const R08_CHARACTERS: StationCharacterPlacement = {
  placeActor(definition) {
    const point = fixedPoints[definition.id];
    if (!point) return undefined;
    const range = at(277, 355);
    return {
      ...definition,
      positions: { landscape: point, portrait: point },
      motion: definition.id === 'character.r01.observer' && definition.motion ? {
        ...definition.motion,
        patrol: { landscape: range, portrait: range, depth: point[1] },
      } : undefined,
    };
  },
  crowd: [
    { id: 'colleague-west', costume: 1, visitors: 0, action: 'talk', point: at(157, 223), facesLeft: false, second: false, offset: 0 },
    { id: 'colleague-east', costume: 0, visitors: 0, action: 'talk', point: at(176, 225), facesLeft: true, second: true, offset: 0 },
    { id: 'rounds', costume: 2, visitors: 0, action: 'walk', from: at(195, 243), to: at(263, 244), travelMs: 5400, offset: 1600 },
    { id: 'visitor-1', costume: 1, visitors: 1, action: 'walk', from: at(381, 217), to: at(419, 215), travelMs: 3800, offset: 950 },
    { id: 'visitor-2', costume: 2, visitors: 2, action: 'talk', point: at(312, 222), facesLeft: false, second: false, offset: 1200 },
    { id: 'visitor-3', costume: 1, visitors: 3, action: 'talk', point: at(329, 223), facesLeft: true, second: true, offset: 1200 },
    { id: 'visitor-4', costume: 0, visitors: 4, action: 'walk', from: at(63, 222), to: at(112, 225), travelMs: 4000, offset: 500 },
    { id: 'visitor-5', costume: 1, visitors: 5, action: 'walk', from: at(222, 264), to: at(176, 261), travelMs: 4000, offset: 1200 },
    { id: 'visitor-6', costume: 0, visitors: 6, action: 'walk', from: at(320, 251), to: at(379, 235), travelMs: 4800, offset: 650 },
  ],
};
