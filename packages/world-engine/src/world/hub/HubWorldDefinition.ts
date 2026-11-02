import { HUB_LOGICAL_HEIGHT, HUB_LOGICAL_WIDTH } from '../../runtime/fitLogicalViewport';

export interface HubPoint {
  x: number;
  y: number;
}

export interface HubRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HubBuildingDefinition {
  id: string;
  bounds: HubRect;
  entrance: HubPoint;
  interactionId: string;
}

export interface HubPathDefinition {
  id: string;
  points: HubPoint[];
  width: number;
}

export interface HubWorldDefinition {
  version: string;
  geometryLockId: string;
  status: 'migration-baseline' | 'accepted';
  logicalSize: { width: number; height: number };
  horizonY: number;
  waterlineY: number;
  safeZone: HubRect;
  buildings: HubBuildingDefinition[];
  paths: HubPathDefinition[];
  environmentAnchors: Record<string, HubPoint>;
}

/**
 * Initial 640x360 machine-readable migration baseline.
 *
 * The current production Hub is authored at 480x270. Until the accepted
 * 640x360 Geometry Lock is represented directly in runtime data, the known
 * semantic anchors are scaled by 4/3 and rounded to canonical logical pixels.
 * This baseline is intentionally explicit: future art-direction changes must
 * update this object and the visual snapshot together instead of drifting in
 * renderer-specific code.
 */
export const HUB_WORLD_DEFINITION_V1: HubWorldDefinition = {
  version: '1.0.0-migration',
  geometryLockId: 'hub.geometry.lock_v1.migration-baseline',
  status: 'migration-baseline',
  logicalSize: { width: HUB_LOGICAL_WIDTH, height: HUB_LOGICAL_HEIGHT },
  horizonY: 176,
  waterlineY: 176,
  safeZone: { x: 48, y: 42, width: 544, height: 273 },
  buildings: [
    {
      id: 'codepost',
      bounds: { x: 229, y: 93, width: 184, height: 147 },
      entrance: { x: 321, y: 240 },
      interactionId: 'building.codepost',
    },
    {
      id: 'archive',
      bounds: { x: 80, y: 117, width: 107, height: 69 },
      entrance: { x: 131, y: 187 },
      interactionId: 'building.archive',
    },
    {
      id: 'radar',
      bounds: { x: 460, y: 88, width: 127, height: 172 },
      entrance: { x: 521, y: 260 },
      interactionId: 'building.radar',
    },
    {
      id: 'cartography',
      bounds: { x: 16, y: 189, width: 77, height: 59 },
      entrance: { x: 55, y: 248 },
      interactionId: 'building.cartography',
    },
    {
      id: 'lab',
      bounds: { x: 61, y: 261, width: 96, height: 72 },
      entrance: { x: 109, y: 333 },
      interactionId: 'building.lab',
    },
    {
      id: 'hall',
      bounds: { x: 453, y: 277, width: 109, height: 69 },
      entrance: { x: 508, y: 347 },
      interactionId: 'building.hall',
    },
    {
      id: 'meteo-site',
      bounds: { x: 176, y: 272, width: 53, height: 69 },
      entrance: { x: 203, y: 341 },
      interactionId: 'building.meteo-site',
    },
    {
      id: 'canteen',
      bounds: { x: 573, y: 275, width: 61, height: 64 },
      entrance: { x: 604, y: 339 },
      interactionId: 'building.canteen',
    },
  ],
  paths: [
    {
      id: 'promenade',
      points: [
        { x: 67, y: 224 },
        { x: 205, y: 224 },
        { x: 360, y: 224 },
        { x: 491, y: 224 },
        { x: 587, y: 224 },
      ],
      width: 10,
    },
  ],
  environmentAnchors: {
    'meteo.anemometer': { x: 323, y: 131 },
    'lighthouse.flash': { x: 604, y: 127 },
    'lantern.01': { x: 67, y: 224 },
    'lantern.02': { x: 205, y: 224 },
    'lantern.03': { x: 360, y: 224 },
    'lantern.04': { x: 491, y: 224 },
    'lantern.05': { x: 587, y: 224 },
  },
};

export const HUB_BUILDING_BY_ID = new Map(
  HUB_WORLD_DEFINITION_V1.buildings.map((building) => [building.id, building] as const),
);
