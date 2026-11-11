/** Dev-only public visual fixture: real component; all API functions replaced locally. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, type BlitzLobby, type BlitzSession, type SessionUser } from '../../src/api';
import { BlitzWorkspace } from '../../src/features/shift/BlitzWorkspace';
import fixture from './blitz-practice-fixture.json';
import '../../src/styles.css';
import '../../src/hub-ui.css';

if (!import.meta.env.DEV) throw new Error('The public BlitzWorkspace fixture is development-only.');

type View = 'ready' | 'locked' | 'numeric' | 'choice' | 'sequence' | 'station' | 'completed' | 'timeout';
let view: View = 'ready';
let startedAt = Date.now();
let round: BlitzSession | null = null;
const user: SessionUser = { id: 'fixture.blitz-practice.public', displayName: 'Тестовый синоптик', groupId: 'Открытый стенд', roles: ['student'], status: 'active', createdAt: '2026-11-11T00:00:00.000Z', avatar: fixture.avatar };

function active(index: number): BlitzSession {
  const session = structuredClone(fixture.active[index]) as BlitzSession;
  session.startedAt = new Date(startedAt).toISOString();
  session.deadlineAt = new Date(startedAt + 90_000).toISOString();
  session.serverNow = new Date().toISOString();
  return session;
}

function select(next: View) {
  view = next; startedAt = Date.now();
  round = next === 'completed' ? structuredClone(fixture.completed) as BlitzSession
    : next === 'timeout' ? structuredClone(fixture.timeout) as BlitzSession
      : next === 'numeric' ? active(0) : next === 'choice' ? active(3) : next === 'sequence' ? active(4) : next === 'station' ? active(5) : null;
}

for (const method of Object.keys(api)) Object.assign(api, { [method]: async () => { throw new Error(`Тестовый стенд: API ${method} не подключён.`); } });
api.blitzLobby = async () => ({ ...structuredClone(view === 'locked' ? fixture.locked : fixture.ready), session: round }) as BlitzLobby;
api.startBlitz = async () => { startedAt = Date.now(); round = active(0); return structuredClone(round); };
api.blitzSession = async () => {
  if (!round) throw new Error('Тестовый раунд не выбран.');
  round.serverNow = new Date().toISOString();
  if (round.status === 'active' && Date.now() >= Date.parse(round.deadlineAt)) {
    round.status = 'completed'; round.finishReason = 'timeout'; round.completedAt = round.deadlineAt; round.task = null;
  }
  return structuredClone(round);
};
api.submitBlitzAnswer = async () => { throw new Error('На визуальном стенде ввод не проверяется. Переключайте состояния кнопками над экраном; реальная проверка работает на /blitz после входа.'); };

function Harness() {
  const [selected, setSelected] = useState<View>('ready');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const labels: Array<[View, string]> = [['ready', 'До старта'], ['locked', 'Закрытый доступ'], ['numeric', 'Число'], ['choice', 'Выбор'], ['sequence', 'Порядок'], ['station', 'Схема'], ['completed', 'Итог'], ['timeout', 'Время вышло']];
  return <>
    <header className="blitz-review-banner" data-review-fixture="public-blitz-practice"><strong>Тестовый стенд блица · API подменён</strong><span>Настоящий экран. Публичные состояния получены проверкой текущих учебных заданий через ShiftService. Вход, реальные аккаунты и серверные сохранения не используются. Ввод здесь не оценивается.</span><nav aria-label="Тестовые состояния">{labels.map(([id, label]) => <button key={id} type="button" aria-pressed={selected === id} onClick={() => { select(id); setSelected(id); setRevision((value) => value + 1); setNotice(''); }}>{label}</button>)}</nav>{notice && <p role="status">{notice}</p>}</header>
    <BlitzWorkspace key={revision} user={user} onExit={() => setNotice('Кампус открывается в основном приложении. Этот стенд показывает только блиц.')} onStartPractice={() => setNotice('Учебная смена доступна в основном приложении после входа.')} />
  </>;
}

createRoot(document.getElementById('review-root')!).render(<Harness />);
