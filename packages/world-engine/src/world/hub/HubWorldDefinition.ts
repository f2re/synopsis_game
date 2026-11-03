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

export interface HubLandmarkDefinition {
  id: string;
  kind: 'operations' | 'central-globe' | 'foreground-railing';
  bounds: HubRect;
  anchor: HubPoint;
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
  waterBand: HubRect;
  safeZone: HubRect;
  buildings: HubBuildingDefinition[];
  landmarks: HubLandmarkDefinition[];
  paths: HubPathDefinition[];
  environmentAnchors: Record<string, HubPoint>;
}

/**
 * Authoritative machine-readable Hub Geometry Lock v1.
 *
 * Source: BATCH-12-HUB-FULLSCREEN-BACKGROUND.md. These regions are the runtime
 * contract for the 640x360 first/main Hub screen. Renderers may change
 * materials, lighting, weather and internal 3D depth, but they may not move
 * the horizon, water band or semantic screen regions without a new Geometry
 * Lock revision.
 */
export const HUB_WORLD_DEFINITION_V1: HubWorldDefinition = {
  version: '1.0.0',
  geometryLockId: 'hub.geometry.lock_v1',
  status: 'accepted',
  logicalSize: { width: HUB_LOGICAL_WIDTH, height: HUB_LOGICAL_HEIGHT },
  horizonY: 92,
  waterlineY: 92,
  waterBand: { x: 0, y: 92, width: 640, height: 55 },
  safeZone: { x: 48, y: 42, width: 544, height: 273 },
  buildings: [
    {
      id: 'radar',
      bounds: { x: 38, y: 66, width: 140, height: 108 },
      entrance: { x: 108, y: 174 },
      interactionId: 'building.radar',
    },
    {
      id: 'cartography',
      bounds: { x: 34, y: 145, width: 174, height: 142 },
      entrance: { x: 121, y: 287 },
      interactionId: 'building.cartography',
    },
    {
      id: 'codepost',
      bounds: { x: 260, y: 203, width: 137, height: 98 },
      entrance: { x: 329, y: 301 },
      interactionId: 'building.codepost',
    },
    {
      id: 'archive',
      bounds: { x: 351, y: 182, width: 139, height: 107 },
      entrance: { x: 421, y: 289 },
      interactionId: 'building.archive',
    },
    {
      id: 'lab',
      bounds: { x: 438, y: 106, width: 162, height: 115 },
      entrance: { x: 519, y: 221 },
      interactionId: 'building.lab',
    },
    {
      id: 'hall',
      bounds: { x: 492, y: 180, width: 142, height: 121 },
      entrance: { x: 563, y: 301 },
      interactionId: 'building.hall',
    },
    {
      id: 'meteo-site',
      bounds: { x: 194, y: 218, width: 62, height: 82 },
      entrance: { x: 225, y: 300 },
      interactionId: 'building.meteo-site',
    },
    {
      id: 'canteen',
      bounds: { x: 74, y: 246, width: 92, height: 66 },
      entrance: { x: 120, y: 312 },
      interactionId: 'building.canteen',
    },
  ],
  landmarks: [
    {
      id: 'operations',
      kind: 'operations',
      bounds: { x: 205, y: 111, width: 228, height: 153 },
      anchor: { x: 319, y: 264 },
    },
    {
      id: 'central-globe',
      kind: 'central-globe',
      bounds: { x: 246, y: 229, width: 148, height: 100 },
      anchor: { x: 320, y: 292 },
    },
    {
      id: 'foreground-railing',
      kind: 'foreground-railing',
      bounds: { x: 0, y: 286, width: 640, height: 66 },
      anchor: { x: 320, y: 328 },
    },
  ],
  paths: [
    {
      id: 'river-terrace',
      points: [
        { x: 52, y: 159 },
        { x: 205, y: 161 },
        { x: 320, y: 160 },
        { x: 440, y: 162 },
        { x: 588, y: 160 },
      ],
      width: 7,
    },
    {
      id: 'plaza-spine',
      points: [
        { x: 320, y: 151 },
        { x: 320, y: 214 },
        { x: 320, y: 276 },
        { x: 320, y: 326 },
      ],
      width: 11,
    },
    {
      id: 'plaza-west',
      points: [
        { x: 94, y: 286 },
        { x: 192, y: 278 },
        { x: 320, y: 276 },
      ],
      width: 10,
    },
    {
      id: 'plaza-east',
      points: [
        { x: 320, y: 276 },
        { x: 447, y: 280 },
        { x: 574, y: 292 },
      ],
      width: 10,
    },
  ],
  environmentAnchors: {
    'globe.center': { x: 320, y: 292 },
    'meteo.anemometer': { x: 225, y: 248 },
    'lighthouse.flash': { x: 604, y: 127 },
    'tree.west.01': { x: 177, y: 268 },
    'tree.west.02': { x: 143, y: 302 },
    'tree.east.01': { x: 467, y: 270 },
    'tree.east.02': { x: 514, y: 316 },
    'lantern.01': { x: 203, y: 276 },
    'lantern.02': { x: 268, y: 276 },
    'lantern.03': { x: 372, y: 277 },
    'lantern.04': { x: 439, y: 281 },
  },
};

export const HUB_BUILDING_BY_ID = new Map(
  HUB_WORLD_DEFINITION_V1.buildings.map((building) => [building.id, building] as const),
);
