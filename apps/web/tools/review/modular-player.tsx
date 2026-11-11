/** Dev-only visual fixture. No login, tokens, real profile or HTTP API calls. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_MODULAR_AVATAR, parseModularAvatarProfile } from '@synopsis/world-engine/avatar';
import { api, type AvatarProfile, type EquipmentBadge, type EquipmentResponse, type SessionUser } from '../../src/api';
import { AvatarEditor } from '../../src/features/avatar/AvatarEditor';
import { HubScreen } from '../../src/features/hub/HubScreen';
import { clearAvatarDraft, avatarDraftStorage } from '../../src/features/avatar/avatarDraft';
import '../../src/styles.css';
import '../../src/hub-ui.css';

if (!import.meta.env.DEV) throw new Error('The public visual fixture is only available in the Vite development server.');

const FIXTURE_ID = 'fixture.modular-player-r02.public';
const STORAGE_KEY = 'synopsis.visual-review.modular-player-r02';
const EMPTY_USER: SessionUser = {
  id: FIXTURE_ID, displayName: 'Тестовый синоптик', groupId: 'Открытый стенд', roles: ['student'], status: 'active',
  createdAt: '2026-11-11T00:00:00.000Z', avatar: { ...DEFAULT_MODULAR_AVATAR },
};
let savedAvatar: AvatarProfile = { ...DEFAULT_MODULAR_AVATAR };
let selectedBadge: string | null = 'badge.training_starter';
try {
  const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as { avatar?: unknown; badgeId?: unknown } | null;
  const accepted = parseModularAvatarProfile(stored?.avatar);
  if (accepted) savedAvatar = accepted;
  if (stored?.badgeId === null) selectedBadge = null;
} catch { /* The fixture starts clean when this tab has no usable saved fixture. */ }

const user = (): SessionUser => ({ ...EMPTY_USER, avatar: { ...savedAvatar } });
function persistFixture() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ avatar: savedAvatar, badgeId: selectedBadge })); }

// Public baseline data copied from the checked-in starter catalog for visual review.
// No earned progress is invented: only the initial starter badge is unlocked.
const BADGES: EquipmentBadge[] = [
  { id: 'badge.training_starter', name: 'На связи', description: 'Стартовый значок учебной смены.', image: '/assets/items/badge_starter.png', effects: { reference: 1, retry: 0 }, effectDescription: '+1 обращение к справке за смену.', unlocked: true, equipped: true, unlock: { current: 1, target: 1, description: 'Доступен с первого входа' } },
  { id: 'badge.first_shift', name: 'Первое дежурство', description: 'Вы довели первую учебную смену до разбора.', image: '/assets/items/badge_first_shift.png', effects: { reference: 0, retry: 1 }, effectDescription: '+1 повтор неверного ответа до показа решения.', unlocked: false, equipped: false, unlock: { current: 0, target: 1, description: 'Завершить одну учебную смену' } },
  { id: 'badge.accuracy', name: 'Точный разбор', description: 'Не менее 80% заданий полной смены решены самостоятельно с первой попытки.', image: '/assets/items/badge_accuracy.png', effects: { reference: 1, retry: 1 }, effectDescription: '+1 справка и +1 повтор за смену.', unlocked: false, equipped: false, unlock: { current: 0, target: 8, description: 'Самостоятельно решить с первой попытки 8 из 10 заданий одной полной смены' } },
  { id: 'badge.regular', name: 'Ритм станции', description: 'Учебные смены завершены в три разных дня.', image: '/assets/items/badge_regular.png', effects: { reference: 2, retry: 0 }, effectDescription: '+2 обращения к справке за смену.', unlocked: false, equipped: false, unlock: { current: 0, target: 3, description: 'Завершить смены в 3 разных дня по UTC' } },
];

function fixtureEquipment(): EquipmentResponse {
  const badge = BADGES.find((entry) => entry.id === selectedBadge);
  const heldItem = savedAvatar.heldItem;
  const charges = {
    reference: Math.min(2, (badge?.effects.reference ?? 0) + (heldItem === 'held.tablet' || heldItem === 'held.map-folder' ? 1 : 0)),
    retry: Math.min(2, (badge?.effects.retry ?? 0) + (heldItem === 'held.pencil' ? 1 : 0)),
  };
  return {
    loadout: { badgeId: selectedBadge }, catalog: BADGES.map((entry) => ({ ...structuredClone(entry), equipped: entry.id === selectedBadge })),
    stats: { completedShifts: 0, unassistedCorrect: 0, practiceDays: 0 },
    nextShift: { badgeId: selectedBadge, badgeName: badge?.name ?? null, heldItem, enabled: true, charges, remaining: { ...charges }, assistedTasks: 0 },
    rules: { chargeCap: 2, description: 'Публичные тестовые данные для проверки интерфейса; задания на стенде не запускаются.' },
    tools: [
      { id: 'held.tablet', effects: { reference: 1, retry: 0 }, effectDescription: '+1 обращение к справке за учебную смену.' },
      { id: 'held.map-folder', effects: { reference: 1, retry: 0 }, effectDescription: '+1 обращение к справке за учебную смену.' },
      { id: 'held.pencil', effects: { reference: 0, retry: 1 }, effectDescription: '+1 повтор неверного ответа до показа решения.' },
    ],
  };
}

// Replace every API method in this document before mounting the real components.
// Unexpected calls fail locally instead of contacting an authenticated endpoint.
for (const method of Object.keys(api)) Object.assign(api, { [method]: async () => { throw new Error(`Визуальный стенд: API ${method} не подключён.`); } });
api.me = async () => user();
api.equipment = async () => fixtureEquipment();
api.updateAvatar = async (avatar: AvatarProfile) => {
  const accepted = parseModularAvatarProfile(avatar);
  if (!accepted) throw new Error('Недопустимый профиль тестового стенда.');
  savedAvatar = accepted; persistFixture(); return user();
};
api.selectEquipmentBadge = async (badgeId: string | null) => {
  if (badgeId !== null && badgeId !== 'badge.training_starter') throw new Error('Этот знак не получен в стартовом тестовом наборе.');
  selectedBadge = badgeId; persistFixture(); return fixtureEquipment();
};

function ReviewHarness() {
  const [currentUser, setCurrentUser] = useState<SessionUser>(user);
  const [view, setView] = useState<'editor' | 'campus'>('editor');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  function resetFixture() {
    savedAvatar = { ...DEFAULT_MODULAR_AVATAR }; selectedBadge = 'badge.training_starter';
    sessionStorage.removeItem(STORAGE_KEY); clearAvatarDraft(avatarDraftStorage(), FIXTURE_ID);
    setCurrentUser(user()); setRevision((value) => value + 1); setView('editor'); setNotice('Только тестовый образ и его примерка сброшены.');
  }
  const noGame = () => setNotice('Это стенд внешности: учебные задания и действия аккаунта здесь не выполняются.');
  return <>
    <header className="review-banner" data-review-fixture="public-modular-r02">
      <div><strong>Тестовый стенд внешности</strong><span>Настоящие компоненты и принятые изображения · публичный тестовый профиль</span><small>Сохранение действует только в этой вкладке. Сервер, вход и реальные аккаунты не используются.</small></div>
      <div className="review-banner__actions"><button type="button" onClick={() => setView('editor')}>В гардероб</button><button type="button" onClick={resetFixture}>Сбросить тестовый образ</button></div>
      {notice && <p className="review-banner__notice" role="status">{notice}</p>}
    </header>
    {view === 'editor'
      ? <AvatarEditor key={revision} user={currentUser} onSaved={setCurrentUser} onBack={() => setView('campus')} />
      : <HubScreen user={currentUser} onLoginClick={noGame} onLogout={noGame} onOpenSetCode={noGame} onStartShift={noGame} onStartBlitz={noGame} onOpenAvatar={() => setView('editor')} onOpenAdmin={noGame} />}
  </>;
}

createRoot(document.getElementById('review-root')!).render(<StrictMode><ReviewHarness /></StrictMode>);
