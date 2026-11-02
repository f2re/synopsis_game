import { HUB_LOGICAL_HEIGHT, HUB_LOGICAL_WIDTH } from '../../runtime/logicalViewportMath.ts';

export interface HubPoint2D {
  x: number;
  y: number;
}

export interface HubRect2D extends HubPoint2D {
  width: number;
  height: number;
}

export interface HubGeometryLockBuilding {
  id: string;
  screenBounds: HubRect2D;
  entrance: HubPoint2D;
}

export interface HubGeometryLockManifest {
  id: string;
  version: 1;
  logicalSize: { width: 640; height: 360 };
  internalFramebuffer: { width: 320; height: 180 };
  migrationSource: {
    logicalSize: { width: 480; height: 270 };
    scale: number;
    note: string;
  };
  camera: {
    projection: 'orthographic';
    tiltDegrees: number;
    center: HubPoint2D;
  };
  horizonY: number;
  waterlineY: number;
  safeZone: HubRect2D;
  buildings: readonly HubGeometryLockBuilding[];
}

const MIGRATION_SCALE = 4 / 3;
const scale = (value: number): number => value * MIGRATION_SCALE;

/**
 * Geometry Lock v1 is an explicit migration snapshot of the coordinates that are
 * actually used by the current 480x270 HubBuildingLayer. These are screen-space bounds, not inferred ground footprints. It intentionally does
 * not consume locationRegistry because that file still contains an older,
 * incompatible coordinate space. R3 will replace both with HubWorldDefinition.
 */
export const HUB_GEOMETRY_LOCK_V1: HubGeometryLockManifest = {
  id: 'hub.geometry.lock_v1',
  version: 1,
  logicalSize: { width: HUB_LOGICAL_WIDTH, height: HUB_LOGICAL_HEIGHT },
  internalFramebuffer: { width: 320, height: 180 },
  migrationSource: {
    logicalSize: { width: 480, height: 270 },
    scale: MIGRATION_SCALE,
    note: 'Scaled from live HUB_BUILDINGS coordinates; locationRegistry is legacy and is not authoritative.',
  },
  camera: {
    projection: 'orthographic',
    tiltDegrees: 35,
    center: { x: 320, y: 180 },
  },
  horizonY: scale(132),
  waterlineY: scale(136),
  safeZone: { x: 48, y: 42, width: 544, height: 273 },
  buildings: [
    {
      id: 'codepost',
      screenBounds: { x: scale(172), y: scale(70), width: scale(138), height: scale(110) },
      entrance: { x: scale(241), y: scale(180) },
    },
    {
      id: 'archive',
      screenBounds: { x: scale(60), y: scale(88), width: scale(80), height: scale(52) },
      entrance: { x: scale(98), y: scale(140) },
    },
    {
      id: 'radar',
      screenBounds: { x: scale(345), y: scale(66), width: scale(95), height: scale(129) },
      entrance: { x: scale(391), y: scale(195) },
    },
    {
      id: 'cartography',
      screenBounds: { x: scale(12), y: scale(142), width: scale(58), height: scale(44) },
      entrance: { x: scale(41), y: scale(186) },
    },
    {
      id: 'lab',
      screenBounds: { x: scale(46), y: scale(196), width: scale(72), height: scale(54) },
      entrance: { x: scale(82), y: scale(250) },
    },
    {
      id: 'hall',
      screenBounds: { x: scale(340), y: scale(208), width: scale(82), height: scale(52) },
      entrance: { x: scale(381), y: scale(260) },
    },
    {
      id: 'meteo-site',
      screenBounds: { x: scale(132), y: scale(204), width: scale(40), height: scale(52) },
      entrance: { x: scale(152), y: scale(256) },
    },
    {
      id: 'canteen',
      screenBounds: { x: scale(430), y: scale(206), width: scale(46), height: scale(48) },
      entrance: { x: scale(453), y: scale(254) },
    },
  ],
};

export function validateGeometryLock(manifest: HubGeometryLockManifest): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  if (manifest.logicalSize.width !== 640 || manifest.logicalSize.height !== 360) {
    errors.push('Hub Geometry Lock must use logical size 640x360.');
  }
  if (manifest.internalFramebuffer.width !== 320 || manifest.internalFramebuffer.height !== 180) {
    errors.push('Default internal framebuffer must be 320x180.');
  }
  if (manifest.horizonY < 0 || manifest.horizonY > manifest.logicalSize.height) {
    errors.push('horizonY is outside logical canvas.');
  }
  if (manifest.waterlineY < manifest.horizonY || manifest.waterlineY > manifest.logicalSize.height) {
    errors.push('waterlineY must be at/below the horizon and inside logical canvas.');
  }

  for (const building of manifest.buildings) {
    if (ids.has(building.id)) errors.push(`Duplicate building id: ${building.id}`);
    ids.add(building.id);

    const { x, y, width, height } = building.screenBounds;
    if (width <= 0 || height <= 0) errors.push(`${building.id}: screen bounds must be positive.`);
    if (x < 0 || y < 0 || x + width > manifest.logicalSize.width || y + height > manifest.logicalSize.height) {
      errors.push(`${building.id}: screen bounds are outside logical canvas.`);
    }
    if (
      building.entrance.x < 0 ||
      building.entrance.x > manifest.logicalSize.width ||
      building.entrance.y < 0 ||
      building.entrance.y > manifest.logicalSize.height
    ) {
      errors.push(`${building.id}: entrance is outside logical canvas.`);
    }
  }

  return errors;
}
