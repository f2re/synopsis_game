import type { AvatarProfile } from '../../api';
import { OPTIONS } from './avatarOptions';

export interface AvatarDraft {
  version: 1;
  base: AvatarProfile;
  avatar: AvatarProfile;
}

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const AVATAR_FIELDS = Object.keys(OPTIONS) as Array<keyof AvatarProfile>;
const draftKey = (userId: string) => `synopsis.avatar-draft.v1:${encodeURIComponent(userId)}`;

function validAvatar(value: unknown): value is AvatarProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return Object.keys(candidate).length === AVATAR_FIELDS.length && AVATAR_FIELDS.every((field) =>
    Object.prototype.hasOwnProperty.call(candidate, field) && OPTIONS[field].some((option) => option.id === candidate[field]),
  );
}

export function sameAvatar(first: AvatarProfile, second: AvatarProfile): boolean {
  return AVATAR_FIELDS.every((field) => first[field] === second[field]);
}

/** Cosmetic drafts belong to one account in one tab; the server remains authoritative. */
export function readAvatarDraft(storage: DraftStorage, userId: string): AvatarDraft | null {
  try {
    const raw = storage.getItem(draftKey(userId));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const draft = value as Partial<AvatarDraft>;
    if (draft.version !== 1 || !validAvatar(draft.base) || !validAvatar(draft.avatar)) return null;
    if (sameAvatar(draft.base, draft.avatar)) return null;
    return { version: 1, base: { ...draft.base }, avatar: { ...draft.avatar } };
  } catch {
    return null;
  }
}

export function clearAvatarDraft(storage: DraftStorage, userId: string): boolean {
  try { storage.removeItem(draftKey(userId)); return true; } catch { return false; }
}

export function writeAvatarDraft(storage: DraftStorage, userId: string, base: AvatarProfile, avatar: AvatarProfile): boolean {
  if (!validAvatar(base) || !validAvatar(avatar)) return false;
  if (sameAvatar(base, avatar)) return clearAvatarDraft(storage, userId);
  try {
    storage.setItem(draftKey(userId), JSON.stringify({ version: 1, base, avatar } satisfies AvatarDraft));
    return true;
  } catch {
    return false;
  }
}

/** Keep newer server fields unless the user changed that field in this draft. */
export function mergeAvatarDraft(draft: AvatarDraft, saved: AvatarProfile): AvatarProfile {
  const merged = { ...saved };
  for (const field of AVATAR_FIELDS) {
    if (draft.avatar[field] !== draft.base[field]) merged[field] = draft.avatar[field];
  }
  return merged;
}

export function avatarDraftConflicts(draft: AvatarDraft, saved: AvatarProfile): Array<keyof AvatarProfile> {
  return AVATAR_FIELDS.filter((field) => draft.avatar[field] !== draft.base[field] &&
    saved[field] !== draft.base[field] && saved[field] !== draft.avatar[field]);
}

/** Some browsers deny the storage getter itself, before getItem can run. */
export function avatarDraftStorage(): DraftStorage {
  try { return window.sessionStorage; } catch {
    return { getItem: () => null, setItem: () => { throw new Error('Draft storage unavailable'); }, removeItem: () => undefined };
  }
}
