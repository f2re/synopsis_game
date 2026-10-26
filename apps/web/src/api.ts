export type UserRole = 'student' | 'instructor' | 'content_author' | 'method_reviewer' | 'display' | 'admin';
export type UserStatus = 'active' | 'disabled';

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

export interface AdminUser extends SessionUser { disabledAt?: string; lockedUntil?: string; }
export interface RosterUser { id: string; displayName: string; groupId: string; hasCode?: boolean; }
export interface TaskOption { id: number; label: string; }
export interface TaskStep { id: number; label: string; }

export interface StationPlotObservation {
  id: string;
  stationId?: string;
  field?: 'T' | 'Td' | string;
  label: string;
  value: string;
  display?: string;
  numericValue?: number;
  wind?: { directionDeg: number; speedMs: number };
}
export interface StationPlotSlot {
  id: string;
  stationId?: string;
  x: number;
  y: number;
  kind: 'text' | 'wind' | string;
}
export interface StationPlotPayload {
  profile?: string;
  station?: { id?: string; name?: string } | null;
  canvas?: { width: number; height: number };
  observations: StationPlotObservation[];
  slots: StationPlotSlot[];
}
export interface StationBoardStation { id: string; name: string; x: number; y: number; }
export interface StationBoardPayload {
  profile?: string;
  canvas: { width: number; height: number };
  stations: StationBoardStation[];
  observations: StationPlotObservation[];
  slots: StationPlotSlot[];
}
export interface FindErrorPayload {
  profile?: string;
  rule?: string | null;
  canvas: { width: number; height: number };
  stations: StationBoardStation[];
  observations: StationPlotObservation[];
}
export interface StationPlotComponentResult {
  observationId: string;
  submittedSlotId: string | null;
  expectedSlotId: string;
  correct: boolean;
}
export interface DependencyViolation { before: string; after: string; }
export interface ShiftFeedbackDetails {
  components?: StationPlotComponentResult[];
  selectedStationId?: string;
  expectedStationId?: string;
  violations?: DependencyViolation[];
  multipleOrdersAllowed?: boolean;
}
export interface ShiftTask {
  instanceId: string;
  definitionId: string;
  contentPack: string;
  type: string;
  difficulty: number;
  question: string;
  response: { kind: 'numeric' | 'choice' | 'sequence' | 'dependencySequence' | 'stationPlot' | 'stationBoard' | 'findError' | string; unit?: string | null };
  payload?: {
    group?: string;
    encoded?: string;
    options?: TaskOption[];
    steps?: TaskStep[];
    profile?: string;
    rule?: string | null;
    station?: { id?: string; name?: string } | null;
    stations?: StationBoardStation[];
    canvas?: { width: number; height: number };
    observations?: StationPlotObservation[];
    slots?: StationPlotSlot[];
  };
}
export interface ShiftProgress { answered: number; correct: number; current: number; total: number; }
export interface ShiftStartResponse {
  shiftId: string;
  mode: string;
  contentPack: string;
  contentStatus: string;
  task: ShiftTask;
  progress: ShiftProgress;
}
export interface ShiftAnswerResponse {
  feedback: {
    correct: boolean;
    correctAnswer: unknown;
    details?: ShiftFeedbackDetails | null;
    explanation: string;
    principleTags: string[];
    sources: Array<{ sourceId: string; title: string; locator: string }>;
  };
  answered: number;
  completed: boolean;
  nextTask: ShiftTask | null;
  progress: ShiftProgress;
}

const TOKEN_KEY = 'synopsis.session.token';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) { super(message); }
}
export function getSessionToken(): string | null { return sessionStorage.getItem(TOKEN_KEY); }
export function setSessionToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}
async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  if (authenticated) {
    const token = getSessionToken();
    if (!token) throw new ApiError(401, 'Сессия отсутствует', 'session_required');
    headers.set('authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(response.status, String(payload.error ?? 'Ошибка запроса'), String(payload.code ?? ''));
  return payload as T;
}

export const api = {
  async groups(): Promise<string[]> { return (await request<{ groups: string[] }>('/api/identity/groups')).groups; },
  async roster(groupId: string): Promise<RosterUser[]> { return (await request<{ users: RosterUser[] }>(`/api/identity/roster?group=${encodeURIComponent(groupId)}`)).users; },
  async login(userId: string, code: string): Promise<SessionUser> {
    const result = await request<{ token: string; user: SessionUser }>('/api/identity/login', { method: 'POST', body: JSON.stringify({ userId, code }) });
    setSessionToken(result.token); return result.user;
  },
  async adminLogin(code: string): Promise<SessionUser> {
    const result = await request<{ token: string; user: SessionUser }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ code }) });
    setSessionToken(result.token); return result.user;
  },
  async setCode(newCode: string, currentCode?: string): Promise<SessionUser> { return (await request<{ user: SessionUser }>('/api/identity/set-code', { method: 'POST', body: JSON.stringify({ newCode, currentCode }) }, true)).user; },
  async logout(): Promise<void> { try { await request('/api/identity/logout', { method: 'POST' }, true); } finally { setSessionToken(null); } },
  async me(): Promise<SessionUser> { return (await request<{ user: SessionUser }>('/api/identity/me', {}, true)).user; },
  async updateAvatar(avatar: AvatarProfile): Promise<SessionUser> { return (await request<{ user: SessionUser }>('/api/identity/avatar', { method: 'PATCH', body: JSON.stringify({ avatar }) }, true)).user; },
  async startShift(): Promise<ShiftStartResponse> { return request<ShiftStartResponse>('/api/shifts', { method: 'POST' }, true); },
  async currentShiftTask(shiftId: string): Promise<{ task: ShiftTask; progress: ShiftProgress }> { return request(`/api/shifts/${encodeURIComponent(shiftId)}/task`, {}, true); },
  async submitTaskAnswer(shiftId: string, instanceId: string, answer: unknown): Promise<ShiftAnswerResponse> { return request<ShiftAnswerResponse>(`/api/tasks/${encodeURIComponent(instanceId)}/answer`, { method: 'POST', body: JSON.stringify({ shiftId, answer }) }, true); },
  async shiftResult(shiftId: string): Promise<{ shiftId: string; completed: boolean; answered: number; correct: number; total: number }> { return request(`/api/shifts/${encodeURIComponent(shiftId)}/result`, {}, true); },
  async adminUsers(): Promise<AdminUser[]> { return (await request<{ users: AdminUser[] }>('/api/admin/users', {}, true)).users; },
  async createUser(input: { displayName: string; groupId: string; roles?: UserRole[]; initialCode?: string }): Promise<AdminUser> { return (await request<{ user: AdminUser }>('/api/admin/users', { method: 'POST', body: JSON.stringify(input) }, true)).user; },
  async batchCreateUsers(input: { groupId: string; roles?: UserRole[]; users: Array<{ displayName: string; initialCode?: string }> }): Promise<{ groupId: string; count: number; created: Array<AdminUser & { initialCode: string }> }> { return request('/api/admin/users/batch', { method: 'POST', body: JSON.stringify(input) }, true); },
  async setUserStatus(userId: string, status: UserStatus): Promise<AdminUser> { return (await request<{ user: AdminUser }>(`/api/admin/users/${encodeURIComponent(userId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, true)).user; },
  async resetCode(userId: string, code?: string): Promise<void> { await request(`/api/admin/users/${encodeURIComponent(userId)}/reset-code`, { method: 'POST', body: JSON.stringify({ code }) }, true); },
};
