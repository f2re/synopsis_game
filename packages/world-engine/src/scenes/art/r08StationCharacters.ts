import type { StationCharacterPlacement } from '../hub/HubCharacterLayer';
import { R08_STATION_SCALE } from './r08StationLayout.ts';
import { r08WalkFrame } from './r08Gait.ts';

const at = (x: number, y: number): [number, number] => [x * R08_STATION_SCALE, y * R08_STATION_SCALE];

// Points mark footsteps on paved landings, forward of the building base.
// R08 uses the same source-space positions when the mobile camera pans.
const fixedPoints: Record<string, [number, number]> = {
  'character.r01.observer': at(318, 216),
  'npc.r01.vera': at(157, 213),
  'companion.r01.pascal': at(270, 235),
  animal_squirrel: at(364, 219),
  bird_tit: at(108, 218),
};

export const R08_CHARACTERS: StationCharacterPlacement = {
  placeActor(definition) {
    const point = fixedPoints[definition.id];
    if (!point) return undefined;
    return {
      ...definition,
      displayHeight: definition.id === 'animal_squirrel' ? 32 : definition.displayHeight,
      positions: { landscape: point, portrait: point },
      motion: definition.id === 'character.r01.observer' ? definition.motion : undefined,
    };
  },
  patrol: { id: 'observer-patrol', costume: 0, visitors: 0, action: 'walk', from: at(315, 216), to: at(347, 216), travelMs: 3000, offset: 250 },
  walkFrame: r08WalkFrame,
  crowd: [
    { id: 'colleague-west', costume: 1, visitors: 0, action: 'talk', point: at(114, 215), facesLeft: false, second: false, offset: 0 },
    { id: 'colleague-east', costume: 0, visitors: 0, action: 'talk', point: at(131, 217), facesLeft: true, second: true, offset: 0 },
    { id: 'rounds', costume: 2, visitors: 0, action: 'walk', from: at(140, 260), to: at(208, 260), travelMs: 5400, offset: 1600 },
    { id: 'visitor-1', costume: 1, visitors: 1, action: 'walk', from: at(378, 214), to: at(399, 214), travelMs: 2100, offset: 950 },
    { id: 'visitor-2', costume: 2, visitors: 2, action: 'talk', point: at(312, 222), facesLeft: false, second: false, offset: 1200 },
    { id: 'visitor-3', costume: 1, visitors: 3, action: 'talk', point: at(329, 223), facesLeft: true, second: true, offset: 1200 },
    { id: 'visitor-4', costume: 0, visitors: 4, action: 'walk', from: at(81, 212), to: at(98, 212), travelMs: 1800, offset: 500 },
    { id: 'visitor-5', costume: 1, visitors: 5, action: 'walk', from: at(220, 269), to: at(167, 269), travelMs: 4500, offset: 1200 },
    { id: 'visitor-6', costume: 0, visitors: 6, action: 'walk', from: at(240, 235), to: at(264, 235), travelMs: 2100, offset: 650 },
  ],
};
