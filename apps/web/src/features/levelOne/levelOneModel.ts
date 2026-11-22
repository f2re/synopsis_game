import type { LevelOneReview, ShiftTask } from '../../api';

type DraftStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface LevelOneDraft { numeric: string; choiceIndex: number | null }
const emptyDraft = (): LevelOneDraft => ({ numeric: '', choiceIndex: null });
const keyFor = (userId: string, sessionId: string, instanceId: string) => `synopsis.level-one.answer:${encodeURIComponent(userId)}:${encodeURIComponent(sessionId)}:${encodeURIComponent(instanceId)}`;

/** Decimal entry accepts the two familiar separators and the typographic minus, never JS literals. */
export function levelOneNumber(text: string): number | null {
  const normalized = text.trim().replace(/\u2212/g, '-').replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function levelOneAnswer(task: ShiftTask, draft: LevelOneDraft): { value: number } | { choiceIndex: number } | null {
  if (task.response.kind === 'numeric') {
    const value = levelOneNumber(draft.numeric);
    return value === null ? null : { value };
  }
  if (task.response.kind === 'choice' && draft.choiceIndex !== null && task.payload?.options?.some(option => option.id === draft.choiceIndex)) {
    return { choiceIndex: draft.choiceIndex };
  }
  return null;
}

export function toggleLevelOneSign(text: string): string {
  const value = text.trim().replace(/\u2212/g, '-');
  return value.startsWith('-') ? value.slice(1) : `-${value.replace(/^\+/, '')}`;
}

export function readLevelOneDraft(store: DraftStore | null, userId: string, sessionId: string, task: ShiftTask): LevelOneDraft {
  try {
    const raw: unknown = JSON.parse(store?.getItem(keyFor(userId, sessionId, task.instanceId)) ?? 'null');
    if (!raw || typeof raw !== 'object') return emptyDraft();
    const value = raw as Record<string, unknown>;
    if (value.userId !== userId || value.sessionId !== sessionId || value.instanceId !== task.instanceId) return emptyDraft();
    return {
      numeric: typeof value.numeric === 'string' && value.numeric.length <= 80 ? value.numeric : '',
      choiceIndex: typeof value.choiceIndex === 'number' && task.payload?.options?.some(option => option.id === value.choiceIndex) ? value.choiceIndex : null,
    };
  } catch { return emptyDraft(); }
}

export function saveLevelOneDraft(store: DraftStore | null, userId: string, sessionId: string, task: ShiftTask, draft: LevelOneDraft): void {
  try { store?.setItem(keyFor(userId, sessionId, task.instanceId), JSON.stringify({ userId, sessionId, instanceId: task.instanceId, ...draft })); } catch { /* Server-confirmed answers remain durable when local storage is unavailable. */ }
}

export function clearLevelOneDraft(store: DraftStore | null, userId: string, sessionId: string, instanceId: string): void {
  try { store?.removeItem(keyFor(userId, sessionId, instanceId)); } catch { /* Optional local draft. */ }
}

export function levelOneStartKey(store: DraftStore | null, userId: string, generate: () => string): string {
  const key = `synopsis.level-one.start:${encodeURIComponent(userId)}`;
  try {
    const existing = store?.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{16,100}$/.test(existing)) return existing;
  } catch { /* A component-held key still protects a repeated request. */ }
  const value = generate();
  try { store?.setItem(key, value); } catch { /* Optional recovery across reload. */ }
  return value;
}

export function clearLevelOneStartKey(store: DraftStore | null, userId: string): void {
  try { store?.removeItem(`synopsis.level-one.start:${encodeURIComponent(userId)}`); } catch { /* Optional recovery across reload. */ }
}

/** Feedback is read from the completed answer, never inferred from input or the next task. */
export function reviewedLevelOneAnswer(review: LevelOneReview[], instanceId: string): LevelOneReview | null {
  return review.find(item => item.instanceId === instanceId) ?? null;
}

export function levelOneCorrectAnswer(value: unknown): string {
  if (typeof value === 'number') return String(value).replace('.', ',');
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(String).join(', ');
  return 'См. объяснение';
}
