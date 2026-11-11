import type { AvatarAction, AvatarDirection } from './modularAvatarManifest';

/** Discrete, focused UI intent. Coordinates are canvas CSS pixels, never page coordinates. */
export type WorldAvatarCommand =
  | { kind: 'step'; direction: AvatarDirection }
  | { kind: 'point'; x: number; y: number }
  | { kind: 'inspect' }
  | { kind: 'stop' }
  | { kind: 'controls'; open: boolean };

export interface WorldAvatarNavigationState {
  ready: boolean;
  acceptedActions: AvatarAction[];
  requestedAction: AvatarAction;
  paused: boolean;
  moving: boolean;
}
