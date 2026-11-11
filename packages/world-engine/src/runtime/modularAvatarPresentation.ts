import {
  AVATAR_ACTIONS, avatarForContext, parseModularAvatarProfile,
  type AvatarAction, type AvatarContext, type AvatarDirection, type ModularAvatarProfile,
} from './modularAvatarManifest.ts';

/** Scene composition is independent of the saved outfit and the server's rules. */
export const AVATAR_SITUATION_POLICY = {
  wardrobe: { direction: 'down', actions: ['idle', 'walk', 'inspect'], companionVisible: true, motion: 'ambient' },
  campus: { direction: 'down', actions: ['idle', 'walk', 'inspect'], companionVisible: true, motion: 'ambient' },
  shift: { direction: 'right', actions: ['idle', 'inspect'], companionVisible: false, motion: 'quiet' },
  'blitz-preview': { direction: 'right', actions: ['idle'], companionVisible: false, motion: 'quiet' },
} as const satisfies Record<AvatarContext, {
  direction: AvatarDirection; actions: readonly AvatarAction[]; companionVisible: boolean; motion: 'ambient' | 'quiet';
}>;

export interface AvatarPresentationOptions {
  context?: AvatarContext;
  direction?: AvatarDirection;
  action?: AvatarAction;
  /** Only an actual shift snapshot may override the saved instrument. */
  equipment?: { heldItem: string } | null;
}

export interface AvatarPresentation {
  context: AvatarContext;
  profile: ModularAvatarProfile;
  direction: AvatarDirection;
  requestedAction: AvatarAction;
  action: AvatarAction;
  availableActions: readonly AvatarAction[];
  companionVisible: boolean;
  motion: 'ambient' | 'quiet';
  animate: boolean;
  equipmentSource: 'profile' | 'shift-snapshot';
}

/**
 * Intersect authored capabilities with the situation, never create new poses.
 * Until a pack has been accepted, only the stable idle fallback is available.
 */
export function resolveAvatarPresentation(
  profileValue: ModularAvatarProfile,
  options: AvatarPresentationOptions = {},
  acceptedActions: readonly AvatarAction[] = ['idle'],
): AvatarPresentation {
  const profile = parseModularAvatarProfile(profileValue);
  if (!profile) throw new Error('Modular avatar: invalid presentation profile');
  const context = options.context ?? 'wardrobe';
  const policy = AVATAR_SITUATION_POLICY[context];
  if (!policy) throw new Error('Modular avatar: invalid presentation context');
  const availableActions = AVATAR_ACTIONS.filter((action) =>
    acceptedActions.includes(action) && (policy.actions as readonly AvatarAction[]).includes(action));
  if (!availableActions.includes('idle')) throw new Error('Modular avatar: accepted idle capability is required');
  const requestedAction = options.action ?? 'idle';
  const action = availableActions.includes(requestedAction) ? requestedAction : 'idle';
  return {
    context,
    profile: avatarForContext(profile, context, options.equipment),
    direction: options.direction ?? policy.direction,
    requestedAction,
    action,
    availableActions,
    companionVisible: policy.companionVisible,
    motion: policy.motion,
    animate: policy.motion !== 'quiet' || action !== 'idle',
    equipmentSource: context === 'shift' && options.equipment ? 'shift-snapshot' : 'profile',
  };
}
