import type { HubWorldDefinition } from './HubWorldDefinition.ts';
import { auditHubProceduralPathCrossings, previewHubProceduralFootprints } from './HubSpatialAudit.ts';

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function p(point: { x: number; y: number }): string {
  return point.x.toFixed(2) + ',' + point.y.toFixed(2);
}

/** Render a read-only, canonical 640×360 diagnostic overlay for art review.
 * The output is NOT the accepted game scene or a suggested automatic reflow.
 */
export function renderHubSpatialAuditSvg(world: HubWorldDefinition): string {
  const footprints = previewHubProceduralFootprints(world);
  const conflicts = auditHubProceduralPathCrossings(world);
  const parts: string[] = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 640 360" role="img" aria-label="Hub ground footprint audit">',
    '<rect width="640" height="360" fill="#f5f3ee"/>',
    '<rect x="0" y="92" width="640" height="55" fill="#b2dce7" opacity=".85"/>',
    '<text x="10" y="116" fill="#28546e" font-family="monospace" font-size="9">water 92–147</text>',
  ];
  const safe = world.safeZone;
  parts.push('<rect x="' + safe.x + '" y="' + safe.y + '" width="' + safe.width +
    '" height="' + safe.height + '" fill="none" stroke="#808080" stroke-dasharray="4 4" stroke-width="1"/>');
  for (const path of world.paths) {
    parts.push('<polyline points="' + path.points.map(p).join(' ') + '" fill="none" stroke="#8f9a8d" stroke-opacity=".75" stroke-width="' + path.width + '" stroke-linecap="round" stroke-linejoin="round"/>');
    if (path.points.length) {
      parts.push('<text x="' + path.points[0].x + '" y="' + (path.points[0].y - 9) + '" font-size="8" font-family="monospace" fill="#4d5a4e">' + escapeXml(path.id) + '</text>');
    }
  }
  for (const footprint of footprints) {
    const xs = footprint.vertices.map(v => v.x);
    const ys = footprint.vertices.map(v => v.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    parts.push('<polygon points="' + footprint.vertices.map(p).join(' ') + '" fill="#e27a69" fill-opacity=".27" stroke="#af4437" stroke-width="1.25"/>');
    parts.push('<text x="' + centerX.toFixed(2) + '" y="' + centerY.toFixed(2) + '" font-size="7" font-family="monospace" fill="#7f1d1d" text-anchor="middle">' + escapeXml(footprint.id.slice(10)) + '</text>');
  }
  for (const conflict of conflicts) {
    parts.push('<line x1="' + conflict.start.x + '" y1="' + conflict.start.y + '" x2="' + conflict.end.x + '" y2="' + conflict.end.y + '" stroke="#d42122" stroke-width="2.2" stroke-dasharray="5 3"/>');
  }
  for (const building of world.buildings) {
    parts.push('<circle cx="' + building.entrance.x + '" cy="' + building.entrance.y + '" r="2.7" fill="#16784f" stroke="white" stroke-width="1"/>');
  }
  parts.push('<circle cx="320" cy="316" r="3.5" fill="#195bbd" stroke="white" stroke-width="1"/>');
  parts.push('<rect x="0" y="338" width="640" height="22" fill="#fffdfa" opacity=".94"/>');
  parts.push('<text x="8" y="352" font-family="monospace" font-size="9" fill="#81261e">H3D-037: ' + conflicts.length + ' path/structure overlaps | REVIEW ONLY — NOT APPROVED COLLISION</text>');
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}
