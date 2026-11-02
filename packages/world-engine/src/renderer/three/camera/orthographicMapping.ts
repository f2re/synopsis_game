import type { HubPoint2D } from '../geometryLock.ts';

export interface HubWorldPoint3D {
  x: number;
  y: number;
  z: number;
}

export const HUB_CAMERA_TILT_DEGREES = 35;
export const HUB_CAMERA_TILT_RADIANS = (HUB_CAMERA_TILT_DEGREES * Math.PI) / 180;

/**
 * Maps a canonical logical ground point into the world X/Z plane. With the
 * matching fixed orthographic camera this is affine and round-trips exactly.
 * Y remains free for building/character height.
 */
export function logicalGroundToWorld(point: HubPoint2D): HubWorldPoint3D {
  const screenVertical = 180 - point.y;
  return {
    x: point.x - 320,
    y: 0,
    z: screenVertical === 0 ? 0 : -screenVertical / Math.sin(HUB_CAMERA_TILT_RADIANS),
  };
}

export function worldGroundToLogical(point: HubWorldPoint3D): HubPoint2D {
  const screenVertical = -point.z * Math.sin(HUB_CAMERA_TILT_RADIANS);
  return {
    x: point.x + 320,
    y: 180 - screenVertical,
  };
}
