export const USER_ROLES = [
  'student',
  'instructor',
  'content_author',
  'method_reviewer',
  'display',
  'admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = 'active' | 'disabled';
export type SecurityProfile = 'trusted' | 'public';

export const AVATAR_OPTIONS = {
  skinTone: ['skin.light', 'skin.warm', 'skin.medium', 'skin.deep'],
  hair: ['hair.short', 'hair.wave', 'hair.bob', 'hair.curl', 'hair.long'],
  hairColor: ['haircolor.brown', 'haircolor.black', 'haircolor.blond', 'haircolor.auburn'],
  headwear: ['headwear.none', 'headwear.cap', 'headwear.beanie'],
  top: ['top.center-jacket', 'top.field-jacket', 'top.hoodie', 'top.sweater', 'top.shirt'],
  bottom: ['bottom.dark-trousers', 'bottom.field-trousers', 'bottom.jeans'],
  footwear: ['footwear.sneakers', 'footwear.boots', 'footwear.shoes'],
  backpack: ['backpack.none', 'backpack.city', 'backpack.field'],
  heldItem: ['held.none', 'held.tablet', 'held.map-folder', 'held.pencil'],
  companion: ['companion.none', 'companion.tit', 'companion.squirrel'],
  badge: ['badge.none', 'badge.meteo', 'badge.aerology'],
} as const;

export interface AvatarProfile {
  skinTone: string;
  hair: string;
  hairColor: string;
  headwear: string;
  top: string;
  bottom: string;
  footwear: string;
  backpack: string;
  heldItem: string;
  companion: string;
  badge: string;
}

export const DEFAULT_AVATAR: AvatarProfile = {
  skinTone: 'skin.warm',
  hair: 'hair.short',
  hairColor: 'haircolor.brown',
  headwear: 'headwear.none',
  top: 'top.center-jacket',
  bottom: 'bottom.dark-trousers',
  footwear: 'footwear.sneakers',
  backpack: 'backpack.none',
  heldItem: 'held.none',
  companion: 'companion.none',
  badge: 'badge.none',
};

export interface UserRecord {
  id: string;
  displayName: string;
  groupId: string;
  roles: UserRole[];
  status: UserStatus;
  loginCodeSalt: string;
  loginCodeHash: string;
  avatar: AvatarProfile;
  createdAt: string;
  codeSet?: boolean;
  disabledAt?: string;
  lastLoginAt?: string;
  failedAttempts: number;
  lockedUntil?: string;
}

export interface IdentityState {
  version: 1;
  users: UserRecord[];
}

export interface SessionUser {
  id: string;
  displayName: string;
  groupId: string;
  roles: UserRole[];
  status: UserStatus;
  avatar: AvatarProfile;
  createdAt: string;
  codeSet?: boolean;
  lastLoginAt?: string;
}

export interface AdminUser extends SessionUser {
  disabledAt?: string;
  lockedUntil?: string;
}

export function toSessionUser(user: UserRecord): SessionUser {
  return {
    id: user.id,
    displayName: user.displayName,
    groupId: user.groupId,
    roles: [...user.roles],
    status: user.status,
    avatar: { ...user.avatar },
    createdAt: user.createdAt,
    codeSet: Boolean(user.codeSet),
    lastLoginAt: user.lastLoginAt,
  };
}

export function toAdminUser(user: UserRecord): AdminUser {
  return {
    ...toSessionUser(user),
    disabledAt: user.disabledAt,
    lockedUntil: user.lockedUntil,
  };
}

export function validateAvatar(input: unknown): AvatarProfile {
  if (!input || typeof input !== 'object') {
    throw new Error('Некорректный профиль персонажа');
  }
  const source = input as Record<string, unknown>;
  const result = {} as AvatarProfile;
  for (const key of Object.keys(AVATAR_OPTIONS) as Array<keyof AvatarProfile>) {
    const value = source[key];
    const allowed = AVATAR_OPTIONS[key] as readonly string[];
    if (typeof value !== 'string' || !allowed.includes(value)) {
      throw new Error(`Недопустимое значение внешности: ${key}`);
    }
    result[key] = value;
  }
  return result;
}
