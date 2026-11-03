import type { HubPathDefinition, HubPoint } from './HubWorldDefinition';
import { createHubObstacleGuard, type HubGroundObstacle } from './HubCollision.ts';

/** Pure, renderer-independent routing along the accepted Hub path centrelines.
 * Building screen bounds are deliberately NOT interpreted as ground obstacles.
 */
const EPS = 1e-7;
const KEY_DECIMALS = 5;

interface Segment {
  a: HubPoint;
  b: HubPoint;
}

interface Cut {
  t: number;
  point: HubPoint;
}

interface GraphNode {
  point: HubPoint;
  edges: Map<string, number>;
}

interface Projection {
  index: number;
  point: HubPoint;
  distance: number;
  t: number;
}

export interface HubRouteOptions {
  /** Maximum distance from the requested anchor to an approved path, logical px. */
  maxConnectorDistance?: number;
  /** Ground-occupancy polygons; do not pass projected building silhouettes. */
  obstacles?: readonly HubGroundObstacle[];
  /** Logical-pixel clearance for an avatar hull around polygon obstacles. */
  clearance?: number;
}

function finitePoint(point: HubPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function distance(a: HubPoint, b: HubPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cross(a: HubPoint, b: HubPoint): number {
  return a.x * b.y - a.y * b.x;
}

function subtract(a: HubPoint, b: HubPoint): HubPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function project(point: HubPoint, segment: Segment): Cut {
  const v = subtract(segment.b, segment.a);
  const squaredLength = v.x * v.x + v.y * v.y;
  const raw = ((point.x - segment.a.x) * v.x + (point.y - segment.a.y) * v.y) / squaredLength;
  const t = Math.max(0, Math.min(1, raw));
  return { t, point: { x: segment.a.x + t * v.x, y: segment.a.y + t * v.y } };
}

function closestOnPaths(
  segments: readonly Segment[],
  anchor: HubPoint,
  isBlocked: (a: HubPoint, b: HubPoint) => boolean,
): Projection | undefined {
  let best: Projection | undefined;
  segments.forEach((segment, index) => {
    const candidate = project(anchor, segment);
    if (isBlocked(anchor, candidate.point)) return;
    const next: Projection = { ...candidate, index, distance: distance(anchor, candidate.point) };
    if (!best || next.distance < best.distance - EPS) best = next;
  });
  return best;
}

function registerCrossings(first: Segment, second: Segment, firstCuts: Cut[], secondCuts: Cut[]): void {
  const r = subtract(first.b, first.a);
  const s = subtract(second.b, second.a);
  const difference = subtract(second.a, first.a);
  const denominator = cross(r, s);
  if (Math.abs(denominator) < EPS) {
    // Shared/overlapping collinear segments must also connect, without
    // linking nonintersecting parallel paths that merely look close.
    if (Math.abs(cross(difference, r)) > EPS) return;
    for (const endpoint of [second.a, second.b]) {
      const cut = project(endpoint, first);
      if (distance(endpoint, cut.point) < EPS) {
        firstCuts.push(cut);
        secondCuts.push({ t: project(endpoint, second).t, point: cut.point });
      }
    }
    for (const endpoint of [first.a, first.b]) {
      const cut = project(endpoint, second);
      if (distance(endpoint, cut.point) < EPS) {
        secondCuts.push(cut);
        firstCuts.push({ t: project(endpoint, first).t, point: cut.point });
      }
    }
    return;
  }
  const t = cross(difference, s) / denominator;
  const u = cross(difference, r) / denominator;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return;
  const hit = project({ x: first.a.x + t * r.x, y: first.a.y + t * r.y }, first);
  firstCuts.push(hit);
  secondCuts.push({ t: Math.max(0, Math.min(1, u)), point: hit.point });
}

function pointKey(point: HubPoint): string {
  return `${point.x.toFixed(KEY_DECIMALS)},${point.y.toFixed(KEY_DECIMALS)}`;
}

function addNode(graph: Map<string, GraphNode>, point: HubPoint): string {
  const key = pointKey(point);
  if (!graph.has(key)) graph.set(key, { point: { x: point.x, y: point.y }, edges: new Map() });
  return key;
}

function addEdge(
  graph: Map<string, GraphNode>,
  a: HubPoint,
  b: HubPoint,
  isBlocked: (a: HubPoint, b: HubPoint) => boolean,
): void {
  if (isBlocked(a, b)) return;
  const ka = addNode(graph, a);
  const kb = addNode(graph, b);
  if (ka === kb) return;
  const weight = distance(a, b);
  graph.get(ka)!.edges.set(kb, weight);
  graph.get(kb)!.edges.set(ka, weight);
}

/**
 * Finds a deterministic shortest route via actual path intersections.
 * The first/last short connector approaches a path; no implicit free-space
 * edge is permitted between unrelated road segments. Optional ground-only
 * polygons block all intersecting path and connector edges. Returns null if
 * anchors are off-path, obstructed, or in disconnected graph components.
 */
export function planHubRoute(
  paths: readonly HubPathDefinition[],
  start: HubPoint,
  goal: HubPoint,
  options: HubRouteOptions = {},
): HubPoint[] | null {
  const maxConnectorDistance = options.maxConnectorDistance ?? 72;
  if (!finitePoint(start) || !finitePoint(goal)) throw new Error('HubNavigation: non-finite anchor');
  if (!Number.isFinite(maxConnectorDistance) || maxConnectorDistance < 0) {
    throw new Error('HubNavigation: invalid maximum connector distance');
  }
  const isBlocked = createHubObstacleGuard(options.obstacles ?? [], options.clearance ?? 0);
  if (isBlocked(start, start) || isBlocked(goal, goal)) return null;
  if (distance(start, goal) < EPS) return [{ ...start }];

  const segments: Segment[] = [];
  for (const path of paths) {
    if (path.points.length < 2 || !Number.isFinite(path.width) || path.width <= 0) {
      throw new Error(`HubNavigation: invalid path ${path.id}`);
    }
    for (let index = 1; index < path.points.length; index += 1) {
      const a = path.points[index - 1];
      const b = path.points[index];
      if (!finitePoint(a) || !finitePoint(b) || distance(a, b) < EPS) {
        throw new Error(`HubNavigation: degenerate path segment ${path.id}`);
      }
      segments.push({ a, b });
    }
  }
  if (segments.length === 0) return null;

  const startProjection = closestOnPaths(segments, start, isBlocked);
  const goalProjection = closestOnPaths(segments, goal, isBlocked);
  if (!startProjection || !goalProjection) return null;
  if (startProjection.distance > maxConnectorDistance || goalProjection.distance > maxConnectorDistance) return null;

  const cuts = segments.map((segment): Cut[] => [
    { t: 0, point: segment.a },
    { t: 1, point: segment.b },
  ]);
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      registerCrossings(segments[i], segments[j], cuts[i], cuts[j]);
    }
  }
  cuts[startProjection.index].push(startProjection);
  cuts[goalProjection.index].push(goalProjection);

  const graph = new Map<string, GraphNode>();
  cuts.forEach((segmentCuts) => {
    segmentCuts.sort((a, b) => a.t - b.t);
    for (let j = 1; j < segmentCuts.length; j += 1) {
      addEdge(graph, segmentCuts[j - 1].point, segmentCuts[j].point, isBlocked);
    }
  });
  addEdge(graph, start, startProjection.point, isBlocked);
  addEdge(graph, goal, goalProjection.point, isBlocked);
  const startKey = addNode(graph, start);
  const goalKey = addNode(graph, goal);

  // Small campus graph: Dijkstra with stable tie-breaking avoids dependency on
  // Three.js/Phaser or an external graph library.
  const cost = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  while (visited.size < graph.size) {
    let current: string | undefined;
    let smallest = Infinity;
    for (const key of graph.keys()) {
      const value = cost.get(key) ?? Infinity;
      if (!visited.has(key) && value < smallest - EPS) {
        current = key;
        smallest = value;
      }
    }
    if (current === undefined) break;
    if (current === goalKey) break;
    visited.add(current);
    for (const [neighbor, weight] of graph.get(current)!.edges) {
      const candidate = smallest + weight;
      if (candidate < (cost.get(neighbor) ?? Infinity) - EPS) {
        cost.set(neighbor, candidate);
        previous.set(neighbor, current);
      }
    }
  }
  if (!cost.has(goalKey)) return null;
  const result: HubPoint[] = [];
  let cursor = goalKey;
  for (;;) {
    result.push(graph.get(cursor)!.point);
    if (cursor === startKey) break;
    const parent = previous.get(cursor);
    if (!parent) return null;
    cursor = parent;
  }
  result.reverse();
  return result;
}
