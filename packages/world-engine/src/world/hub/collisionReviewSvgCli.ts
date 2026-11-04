import { HUB_COLLISION_REVIEW_APPROACHES, HUB_COLLISION_REVIEW_WORLD } from './HubCollisionReviewLayout.ts';
import { renderHubSpatialAuditSvg } from './HubSpatialAuditSvg.ts';
import { HUB_WORLD_DEFINITION_V1 } from './HubWorldDefinition.ts';

const base = renderHubSpatialAuditSvg(HUB_COLLISION_REVIEW_WORLD);
const markers = HUB_WORLD_DEFINITION_V1.buildings.map(building => {
  const p = HUB_COLLISION_REVIEW_APPROACHES[building.id];
  return [
    '<line x1="' + building.entrance.x + '" y1="' + building.entrance.y + '" x2="' + p.x +
      '" y2="' + p.y + '" stroke="#208456" stroke-width="1.5" stroke-dasharray="2 2"/>',
    '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="#18a763" stroke="#ffffff" stroke-width="1"/>',
  ].join('\n');
}).join('\n');
console.log(base.replace('</svg>', '<!-- Proposed safe approach anchors (NOT approved) -->\n' + markers + '\n</svg>'));
