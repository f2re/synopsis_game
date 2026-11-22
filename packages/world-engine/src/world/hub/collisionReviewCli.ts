import { createHubObstacleGuard, hubGroundRectObstacle } from './HubCollision.ts';
import {
  HUB_COLLISION_REVIEW_APPROACHES,
  HUB_COLLISION_REVIEW_CLEARANCE,
  HUB_COLLISION_REVIEW_SPAWN,
  HUB_COLLISION_REVIEW_WORLD,
} from './HubCollisionReviewLayout.ts';
import { planHubRoute } from './HubNavigation.ts';
import { previewHubProceduralFootprints, auditHubProceduralPathCrossings } from './HubSpatialAudit.ts';
import { HUB_WORLD_DEFINITION_V1 } from './HubWorldDefinition.ts';

const review = HUB_COLLISION_REVIEW_WORLD;
const collision = [hubGroundRectObstacle('water', review.waterBand), ...previewHubProceduralFootprints(review)];
const isBlocked = createHubObstacleGuard(collision, HUB_COLLISION_REVIEW_CLEARANCE);
const routeSummaries = HUB_WORLD_DEFINITION_V1.buildings.map(building => {
  const destination = HUB_COLLISION_REVIEW_APPROACHES[building.id];
  const route = planHubRoute(review.paths, HUB_COLLISION_REVIEW_SPAWN, destination, {
    obstacles: collision,
    clearance: HUB_COLLISION_REVIEW_CLEARANCE,
  });
  return {
    id: building.id,
    acceptedEntrance: building.entrance,
    proposedApproach: destination,
    reachable: route !== null,
    safe: !!route && route.every((p, i) => i === 0 || !isBlocked(route[i - 1], p)),
    route,
  };
});

console.log(JSON.stringify({
  warning: 'UNAPPROVED collisionReview variant. Never ship as default or rewrite Geometry Lock v1.',
  proposedGeometryLockId: review.geometryLockId,
  acceptedGeometryLockId: HUB_WORLD_DEFINITION_V1.geometryLockId,
  canvas: review.logicalSize,
  geometryUnchanged: review.buildings === HUB_WORLD_DEFINITION_V1.buildings &&
    review.landmarks === HUB_WORLD_DEFINITION_V1.landmarks &&
    review.waterBand === HUB_WORLD_DEFINITION_V1.waterBand,
  clearancePx: HUB_COLLISION_REVIEW_CLEARANCE,
  oldCenterlineConflicts: auditHubProceduralPathCrossings(HUB_WORLD_DEFINITION_V1).length,
  proposedCenterlineConflicts: auditHubProceduralPathCrossings(review).length,
  paths: review.paths,
  routes: routeSummaries,
}, null, 2));
