import { HUB_WORLD_DEFINITION_V1, type HubPathDefinition, type HubPoint, type HubWorldDefinition } from './HubWorldDefinition.ts';

/**
 * UNAPPROVED experimental walkway proposal for H3D-037.
 * This changes only pedestrian path centre lines and destination approaches.
 * Buildings, art geometry, horizon, waterline and semantic IDs are inherited
 * from the accepted BATCH-12 Geometry Lock v1 without modification.
 *
 * It is explicitly opt-in: ?hubRenderer=three2d&hubLayout=collisionReview.
 * Never use this layout as the release default before Art Director acceptance.
 */
export const HUB_COLLISION_REVIEW_PATHS: HubPathDefinition[] = [
  {
    id: 'river-terrace',
    points: [
      { x: 52, y: 156 }, { x: 150, y: 156 }, { x: 205, y: 156 },
      { x: 320, y: 156 }, { x: 440, y: 156 }, { x: 588, y: 156 },
    ],
    width: 7,
  },
  {
    // From the river terrace, skirt the *west* side of operations and the
    // west side of codepost before returning to the southern plaza.
    id: 'plaza-spine',
    points: [
      { x: 320, y: 156 }, { x: 320, y: 213 },
      { x: 220, y: 222 }, { x: 220, y: 270 },
      { x: 256, y: 272 }, { x: 256, y: 316 },
      { x: 320, y: 316 }, { x: 320, y: 326 },
    ],
    width: 11,
  },
  {
    // Corridor strictly between cartography's southern wall and the
    // canteen's northern wall; clearance is checked below at 5 logical px.
    id: 'plaza-west',
    points: [
      { x: 94, y: 292.5 }, { x: 186, y: 292.5 },
      { x: 202, y: 309 }, { x: 256, y: 309 },
    ],
    width: 10,
  },
  {
    // The existing eastern centreline crossed archive and hall.
    // Relocate only the pedestrian path, not the buildings or the camera.
    id: 'plaza-east',
    points: [
      { x: 320, y: 316 }, { x: 447, y: 316 }, { x: 574, y: 316 },
    ],
    width: 10,
  },
  {
    id: 'radar-access',
    points: [
      { x: 150, y: 156 }, { x: 145, y: 183 }, { x: 108, y: 183 },
    ],
    width: 6,
  },
  {
    id: 'lab-access',
    points: [
      { x: 588, y: 156 }, { x: 582, y: 229 }, { x: 519, y: 229 },
    ],
    width: 6,
  },
  {
    id: 'canteen-access',
    points: [
      { x: 120, y: 318 }, { x: 170, y: 318 }, { x: 186, y: 292.5 },
    ],
    width: 6,
  },
];

/**
 * The actual click-to-walk target sits outside each projected building
 * entrance, separated from its procedural box footprint by >=5 logical px.
 * The original entrance and interaction IDs remain canonical and unchanged.
 */
export const HUB_COLLISION_REVIEW_APPROACHES: Readonly<Record<string, HubPoint>> = {
  radar: { x: 108, y: 183 },
  cartography: { x: 121, y: 292.5 },
  codepost: { x: 329, y: 309 },
  archive: { x: 421, y: 297 },
  lab: { x: 519, y: 229 },
  hall: { x: 563, y: 309 },
  'meteo-site': { x: 225, y: 307 },
  canteen: { x: 120, y: 318 },
};

export const HUB_COLLISION_REVIEW_CLEARANCE = 5;
export const HUB_COLLISION_REVIEW_SPAWN: HubPoint = { x: 320, y: 316 };

/** Separate non-authoritative world variant, never mutate accepted v1. */
export const HUB_COLLISION_REVIEW_WORLD: HubWorldDefinition = {
  ...HUB_WORLD_DEFINITION_V1,
  version: '1.1.0-review.1',
  geometryLockId: 'hub.geometry.collision_review_v1',
  status: 'migration-baseline',
  paths: HUB_COLLISION_REVIEW_PATHS,
};

/** Resolves an existing canonical entrance to its safe review-mode stop. */
export function reviewApproachForEntrance(point: HubPoint): HubPoint {
  for (const building of HUB_WORLD_DEFINITION_V1.buildings) {
    if (Math.hypot(point.x - building.entrance.x, point.y - building.entrance.y) < 0.01) {
      return HUB_COLLISION_REVIEW_APPROACHES[building.id] ?? point;
    }
  }
  return point;
}
