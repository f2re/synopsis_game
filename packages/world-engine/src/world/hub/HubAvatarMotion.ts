/**
 * Renderer-independent motion on the Three.js y=0 ground plane.
 *
 * Each step consumes a finite distance budget across ordered waypoints.
 * World transforms (heading, hop and animated height) are renderer-owned.
 */
export interface HubGroundPosition {
  x: number;
  z: number;
}

export interface HubMotionStep {
  position: HubGroundPosition;
  /** Number of completed waypoints at the beginning of the provided list. */
  completedWaypoints: number;
  /** Most recent horizontal movement direction in radians; null when still. */
  headingRadians: number | null;
  traveled: number;
  arrived: boolean;
}

const EPS = 1e-6;

function finitePoint(point: HubGroundPosition): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.z);
}

/**
 * Stable when a single slow frame crosses several short segments. The caller
 * may retain the unconsumed tail and call again on the next frame; no mutable
 * module state is needed and zero-length waypoints are skipped safely.
 */
export function stepHubAvatarMotion(
  position: HubGroundPosition,
  waypoints: readonly HubGroundPosition[],
  distanceBudget: number,
): HubMotionStep {
  if (!finitePoint(position) || waypoints.some(point => !finitePoint(point)) ||
      !Number.isFinite(distanceBudget) || distanceBudget < 0) {
    throw new RangeError('HubMotion: position, waypoints and budget must be finite; budget nonnegative');
  }

  const next = { x: position.x, z: position.z };
  let remaining = distanceBudget;
  let traveled = 0;
  let completed = 0;
  let heading: number | null = null;

  while (completed < waypoints.length) {
    const target = waypoints[completed];
    const dx = target.x - next.x;
    const dz = target.z - next.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= EPS) {
      next.x = target.x;
      next.z = target.z;
      completed += 1;
      continue;
    }
    if (remaining <= 0) break;
    heading = Math.atan2(dx, dz);
    if (distance <= remaining + EPS) {
      next.x = target.x;
      next.z = target.z;
      completed += 1;
      traveled += distance;
      remaining = Math.max(0, remaining - distance);
      continue;
    }
    const ratio = remaining / distance;
    next.x += dx * ratio;
    next.z += dz * ratio;
    traveled += remaining;
    remaining = 0;
    break;
  }

  return {
    position: next,
    completedWaypoints: completed,
    headingRadians: heading,
    traveled,
    arrived: completed === waypoints.length,
  };
}
