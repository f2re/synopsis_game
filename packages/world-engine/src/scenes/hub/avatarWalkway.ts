import type { AvatarDirection } from '../../runtime/modularAvatarManifest';

export interface AvatarPoint { x: number; y: number; }
export interface AvatarWalkway { spawn: AvatarPoint; nodes: readonly AvatarPoint[]; edges: readonly (readonly [number, number])[]; }

/** Foot paths authored against r01Layout. Buildings, fountain and benches are not traversable. */
export function getAvatarWalkway(portrait: boolean): AvatarWalkway {
  return portrait ? {
    spawn: { x: 241, y: 595 },
    nodes: [{ x: 241, y: 452 }, { x: 241, y: 618 }, { x: 229, y: 618 }, { x: 229, y: 674 }],
    edges: [[0, 1], [1, 2], [2, 3]],
  } : {
    spawn: { x: 544, y: 490 },
    nodes: [{ x: 400, y: 440 }, { x: 544, y: 440 }, { x: 544, y: 520 }, { x: 400, y: 520 }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0]],
  };
}

const distance = (a: AvatarPoint, b: AvatarPoint): number => Math.hypot(a.x - b.x, a.y - b.y);
function project(point: AvatarPoint, a: AvatarPoint, b: AvatarPoint): { point: AvatarPoint; t: number; distance: number } {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  const result = { x: a.x + dx * t, y: a.y + dy * t };
  return { point: result, t, distance: distance(point, result) };
}

/** Clicks near the marked path snap to it; other ground never becomes a shortcut. */
export function findAvatarRoute(walkway: AvatarWalkway, from: AvatarPoint, to: AvatarPoint, tolerance = 18): AvatarPoint[] {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return [];
  const closest = (point: AvatarPoint) => walkway.edges.map(([a, b], edge) => ({ edge, ...project(point, walkway.nodes[a], walkway.nodes[b]) }))
    .sort((a, b) => a.distance - b.distance)[0];
  const start = closest(from), finish = closest(to);
  if (!start || !finish || start.distance > .1 || finish.distance > tolerance || distance(start.point, finish.point) < .1) return [];
  const nodes = [...walkway.nodes, start.point, finish.point];
  const origin = nodes.length - 2, destination = nodes.length - 1;
  const neighbours = nodes.map(() => [] as { node: number; cost: number }[]);
  walkway.edges.forEach(([a, b], edge) => {
    const split = [{ node: a, t: 0 }, { node: b, t: 1 }];
    if (start.edge === edge) split.push({ node: origin, t: start.t });
    if (finish.edge === edge) split.push({ node: destination, t: finish.t });
    split.sort((one, two) => one.t - two.t);
    for (let i = 1; i < split.length; i++) {
      const one = split[i - 1].node, two = split[i].node, cost = distance(nodes[one], nodes[two]);
      neighbours[one].push({ node: two, cost }); neighbours[two].push({ node: one, cost });
    }
  });
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set<number>();
  costs[origin] = 0;
  while (!visited.has(destination)) {
    let node = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (node === -1 || costs[i] < costs[node])) node = i;
    if (node === -1 || !Number.isFinite(costs[node])) return [];
    visited.add(node);
    for (const next of neighbours[node]) if (costs[node] + next.cost < costs[next.node]) {
      costs[next.node] = costs[node] + next.cost; previous[next.node] = node;
    }
  }
  const route: AvatarPoint[] = [];
  for (let node = destination; node !== origin; node = previous[node]) route.unshift({ ...nodes[node] });
  return route.filter((point, index) => distance(point, index ? route[index - 1] : from) > .1);
}

/** A deliberate key press moves along one straight section, never through a corner. */
export function avatarWalkwayStep(walkway: AvatarWalkway, point: AvatarPoint, direction: AvatarDirection, length = 36): AvatarPoint | null {
  const vector = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[direction];
  for (const [a, b] of walkway.edges) {
    if (project(point, walkway.nodes[a], walkway.nodes[b]).distance > .1) continue;
    for (const endpoint of [walkway.nodes[a], walkway.nodes[b]]) {
      const dx = endpoint.x - point.x, dy = endpoint.y - point.y;
      const forward = dx * vector[0] + dy * vector[1];
      if (forward <= .1 || Math.abs(dx * vector[1] - dy * vector[0]) > .1) continue;
      return { x: point.x + vector[0] * Math.min(length, forward), y: point.y + vector[1] * Math.min(length, forward) };
    }
  }
  return null;
}
