import type { HubPoint, HubRect } from './HubWorldDefinition';

/**
 * Only polygon coordinates representing actual ground occupancy may be passed
 * to routing. Projected facade/screen bounds are not collision geometry.
 */
export interface HubGroundObstacle {
  id: string;
  vertices: readonly HubPoint[];
}

const EPSILON = 1e-7;

function difference(a: HubPoint, b: HubPoint): HubPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function cross(a: HubPoint, b: HubPoint): number {
  return a.x * b.y - a.y * b.x;
}

function distanceSquared(a: HubPoint, b: HubPoint): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function pointToSegmentDistance(point: HubPoint, a: HubPoint, b: HubPoint): number {
  const direction = difference(b, a);
  const lengthSquared = direction.x ** 2 + direction.y ** 2;
  if (lengthSquared <= EPSILON ** 2) return Math.sqrt(distanceSquared(point, a));
  const dot = (point.x - a.x) * direction.x + (point.y - a.y) * direction.y;
  const fraction = Math.max(0, Math.min(1, dot / lengthSquared));
  return Math.hypot(point.x - a.x - fraction * direction.x, point.y - a.y - fraction * direction.y);
}

function segmentsIntersect(a: HubPoint, b: HubPoint, c: HubPoint, d: HubPoint): boolean {
  const ab = difference(b, a);
  const cd = difference(d, c);
  const denominator = cross(ab, cd);
  const ac = difference(c, a);
  if (Math.abs(denominator) <= EPSILON) {
    if (Math.abs(cross(ac, ab)) > EPSILON) return false;
    const minX = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
    const maxX = Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x));
    const minY = Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
    const maxY = Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
    return minX <= maxX + EPSILON && minY <= maxY + EPSILON;
  }
  const t = cross(ac, cd) / denominator;
  const u = cross(ac, ab) / denominator;
  return t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON;
}

function pointInsidePolygon(point: HubPoint, vertices: readonly HubPoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index++) {
    const a = vertices[previous];
    const b = vertices[index];
    if (pointToSegmentDistance(point, a, b) <= EPSILON) return true;
    const intersects = ((a.y > point.y) !== (b.y > point.y)) &&
      (point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function validPolygon(obstacle: HubGroundObstacle): void {
  const { id, vertices } = obstacle;
  if (!id || vertices.length < 3 || vertices.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    throw new Error('HubCollision: obstacle has invalid id, coordinates or vertex count');
  }
  let doubleArea = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    if (distanceSquared(a, b) < EPSILON ** 2) {
      throw new Error('HubCollision: obstacle has a degenerate edge: ' + id);
    }
    doubleArea += a.x * b.y - b.x * a.y;
  }
  if (Math.abs(doubleArea) <= EPSILON) throw new Error('HubCollision: obstacle has zero area: ' + id);
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    for (let j = i + 2; j < vertices.length; j += 1) {
      // Consecutive polygon edges share endpoints by construction.
      if (i === 0 && j === vertices.length - 1) continue;
      const c = vertices[j];
      const d = vertices[(j + 1) % vertices.length];
      if (segmentsIntersect(a, b, c, d)) {
        throw new Error('HubCollision: obstacle self-intersects: ' + id);
      }
    }
  }
}

/** Converts accepted ground-area rectangles (e.g. water) into collision polygons. */
export function hubGroundRectObstacle(id: string, rect: HubRect): HubGroundObstacle {
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
      !Number.isFinite(rect.width) || !Number.isFinite(rect.height) ||
      rect.width <= 0 || rect.height <= 0) {
    throw new Error('HubCollision: invalid ground rectangle: ' + id);
  }
  return {
    id,
    vertices: [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height },
    ],
  };
}

/**
 * Validated, clearance-aware edge predicate. An edge touching an obstacle
 * boundary is rejected. Call once per planned route, not once per frame.
 */
export function createHubObstacleGuard(
  obstacles: readonly HubGroundObstacle[],
  clearance = 0,
): (a: HubPoint, b: HubPoint) => boolean {
  if (!Number.isFinite(clearance) || clearance < 0) {
    throw new Error('HubCollision: invalid agent clearance');
  }
  const ids = new Set<string>();
  for (const obstacle of obstacles) {
    validPolygon(obstacle);
    if (ids.has(obstacle.id)) throw new Error('HubCollision: duplicate obstacle id: ' + obstacle.id);
    ids.add(obstacle.id);
  }

  return (a, b) => {
    for (const obstacle of obstacles) {
      const vertices = obstacle.vertices;
      if (pointInsidePolygon(a, vertices) || pointInsidePolygon(b, vertices)) return true;
      for (let i = 0; i < vertices.length; i += 1) {
        const c = vertices[i];
        const d = vertices[(i + 1) % vertices.length];
        if (segmentsIntersect(a, b, c, d)) return true;
        if (clearance > 0 && Math.min(
          pointToSegmentDistance(a, c, d),
          pointToSegmentDistance(b, c, d),
          pointToSegmentDistance(c, a, b),
          pointToSegmentDistance(d, a, b),
        ) <= clearance + EPSILON) return true;
      }
    }
    return false;
  };
}
