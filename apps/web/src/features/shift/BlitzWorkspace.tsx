import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type BlitzLobby, type BlitzSession, type SessionUser, type ShiftTask, type StationPlotPayload, type TaskStep } from '../../api';
import { GAME_MARK } from '../../brand';
import { isSavedAvatarPortrait, SavedAvatarPortrait } from '../avatar/SavedAvatarPortrait';
import { PixelIcon, PixelProgressBar } from '../ui';
import { handleRadioGroupKeyDown } from '../ui/radioGroupKeys';
import { StationPlotTask } from './StationPlotTask';
import './ShiftWorkspace.css';
import './BlitzWorkspace.css';

interface BlitzWorkspaceProps {
  user: SessionUser;
  onExit: () => void;
  onStartPractice: () => void;
}

/** A display estimate only: accepting answers and ending the round belong to the server. */
function remainingAt(clock: { remaining: number; receivedAt: number } | null): number {
  return clock ? Math.max(0, Math.ceil((clock.remaining - (performance.now() - clock.receivedAt)) / 1000)) : 0;
}

export function BlitzWorkspace({ user, onExit, onStartPractice }: BlitzWorkspaceProps) {
  const [lobby, setLobby] = useState<BlitzLobby | null>(null);
  const [session, setSession] = useState<BlitzSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [remaining, setRemaining] = useState(0);
  const current = useRef<BlitzSession | null>(null);
  const clock = useRef<{ remaining: number; receivedAt: number } | null>(null);
  const requestInFlight = useRef(false);
  const refreshInFlight = useRef(false);
  const lastRefresh = useRef(0);
  const startRequest = useRef<string | null>(null);
  const mounted = useRef(true);
  const identityEpoch = useRef(0);
  const loadSequence = useRef(0);
  const accountId = useRef(user.id);
  const sessionOwner = useRef(user.id);
  accountId.current = user.id;

  function isCurrent(epoch: number): boolean { return mounted.current && identityEpoch.current === epoch && accountId.current === user.id; }

  function acceptSession(next: BlitzSession, epoch: number) {
    if (!isCurrent(epoch)) return;
    const previous = current.current;
    const sameRound = previous?.id === next.id;
    // A slow poll or answer retry must never move another tab's accepted progress backwards.
    if (sameRound && (previous.progress.answered > next.progress.answered || previous.status === 'completed' && next.status === 'active'
      || Date.parse(next.serverNow) < Date.parse(previous.serverNow))) return;
    current.current = next;
    if (!sameRound || Date.parse(next.serverNow) > Date.parse(previous.serverNow)) {
      const reported = Date.parse(next.deadlineAt) - Date.parse(next.serverNow);
      const estimated = sameRound && clock.current ? clock.current.remaining - (performance.now() - clock.current.receivedAt) : reported;
      clock.current = { remaining: Math.max(0, Math.min(reported, estimated)), receivedAt: performance.now() };
    }
    setSession(next);
    setRemaining(next.status === 'active' ? remainingAt(clock.current) : 0);
  }

  async function load(epoch = identityEpoch.current) {
    if (!isCurrent(epoch)) return;
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError('');
    try {
      const result = await api.blitzLobby();
      if (!isCurrent(epoch) || sequence !== loadSequence.current) return;
      setLobby(result);
      if (result.session) {
        acceptSession(result.session, epoch);
        if (result.session.status === 'active') setNotice('Раунд восстановлен. Отсчёт продолжался, пока экран был закрыт.');
      }
    } catch (reason) { if (isCurrent(epoch) && sequence === loadSequence.current) setError(reason instanceof Error ? reason.message : 'Не удалось открыть блиц'); }
    finally { if (isCurrent(epoch) && sequence === loadSequence.current) setLoading(false); }
  }

  useEffect(() => {
    const epoch = ++identityEpoch.current;
    sessionOwner.current = user.id;
    mounted.current = true;
    current.current = null; clock.current = null; startRequest.current = null;
    requestInFlight.current = false; refreshInFlight.current = false; lastRefresh.current = 0;
    setSession(null); setLobby(null); setRemaining(0); setNotice(''); setError(''); setBusy(false);
    void load(epoch);
    return () => {
      mounted.current = false;
      // StrictMode can mount the same effect again before an earlier request settles.
      if (identityEpoch.current === epoch) identityEpoch.current += 1;
    };
  }, [user.id]);

  async function refresh() {
    const epoch = identityEpoch.current;
    const id = current.current?.id;
    if (!isCurrent(epoch) || !id || refreshInFlight.current || requestInFlight.current) return;
    refreshInFlight.current = true;
    lastRefresh.current = performance.now();
    try {
      const next = await api.blitzSession(id);
      if (!isCurrent(epoch) || current.current?.id !== id) return;
      acceptSession(next, epoch);
      setError('');
    } catch (reason) {
      if (isCurrent(epoch)) setError(reason instanceof Error ? reason.message : 'Нет связи с сервером. Отсчёт продолжается.');
    } finally { if (isCurrent(epoch)) refreshInFlight.current = false; }
  }

  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const tick = window.setInterval(() => {
      const value = remainingAt(clock.current);
      setRemaining(value);
      if (performance.now() - lastRefresh.current >= (value === 0 ? 2_000 : 5_000)) void refresh();
    }, 250);
    const reconnect = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', reconnect);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', reconnect);
    };
  }, [session?.id, session?.status]);

  async function start() {
    const epoch = identityEpoch.current;
    if (!isCurrent(epoch) || requestInFlight.current || !lobby?.eligible) return;
    requestInFlight.current = true;
    setBusy(true); setError(''); setNotice('');
    // Reuse after a lost response. A successful start clears it for the next deliberate round.
    startRequest.current ??= crypto.randomUUID();
    try {
      const next = await api.startBlitz(startRequest.current);
      if (!isCurrent(epoch)) return;
      acceptSession(next, epoch);
      startRequest.current = null;
    } catch (reason) { if (isCurrent(epoch)) setError(reason instanceof Error ? reason.message : 'Не удалось начать блиц'); }
    finally { if (isCurrent(epoch)) { requestInFlight.current = false; setBusy(false); } }
  }

  async function submit(instanceId: string, answer: unknown) {
    const epoch = identityEpoch.current;
    const id = current.current?.id;
    if (!isCurrent(epoch) || !id || requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true); setError('');
    try {
      const result = await api.submitBlitzAnswer(id, instanceId, answer);
      if (!isCurrent(epoch) || current.current?.id !== id) return;
      acceptSession(result.session, epoch);
      setNotice(result.accepted
        ? result.feedback?.correct ? 'Ответ принят · верно.' : 'Ответ принят. Объяснение сохранено в разборе раунда.'
        : 'Время истекло. Последний ответ не вошёл в результат.');
    } catch (reason) {
      if (!isCurrent(epoch)) return;
      setError(reason instanceof Error ? reason.message : 'Не удалось отправить ответ. Можно повторить отправку.');
      if (reason instanceof ApiError && reason.status === 409) {
        requestInFlight.current = false;
        await refresh();
      }
    } finally { if (isCurrent(epoch)) { requestInFlight.current = false; setBusy(false); } }
  }

  if (sessionOwner.current !== user.id) return <main className="shift-shell blitz-shell" role="status">Открываем блиц…</main>;

  const active = session?.status === 'active';
  const completed = session?.status === 'completed';
  const contentStatus = session?.contentStatus ?? lobby?.contentStatus;
  const draft = Boolean(contentStatus && contentStatus !== 'published');
  const portrait = session ? session.equipment.avatarPortrait : user.avatarPortrait;
  const total = session?.progress.total ?? lobby?.total ?? 6;

  return <main className="shift-shell blitz-shell">
    <header className={`shift-topbar blitz-topbar${active ? ' is-active' : ''}`}>
      <div className="shift-heading"><PixelIcon name="kn01" size="md" /><div className="shift-heading__text"><span className="shift-kicker">{GAME_MARK} · тренировка</span><strong>Блиц-практика · 90 с</strong></div></div>
      {active && <div className={`blitz-timer ${remaining <= 15 ? 'blitz-timer--ending' : ''}`} aria-label={`Осталось ${remaining} секунд`}><span aria-hidden="true">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span><small>на весь раунд</small></div>}
      <button type="button" className="shift-exit" onClick={onExit}><PixelIcon name="logout" size="sm" /><span>На станцию</span></button>
    </header>

    <div className="blitz-layout">
      <aside className="blitz-profile" aria-label="Персонаж в блице">
        <div className="blitz-profile__portrait"><SavedAvatarPortrait portrait={portrait} size={80} label={session ? 'Портрет на начало раунда' : 'Сохранённый портрет'} missingLabel={session ? 'Портрет не сохранён для этого раунда' : 'Сохраните портрет в гардеробе'} /></div>
        <div className="blitz-profile__identity"><strong>{user.displayName}</strong><span>{isSavedAvatarPortrait(portrait) ? session ? 'Портрет и комплект на начало раунда' : 'Ваш сохранённый портрет' : session ? 'Портрет не сохранён для этого раунда' : 'Сохраните портрет в гардеробе'}</span></div>
        <details className="blitz-profile__details"><summary>Комплект и время</summary><p>Одежда и инструменты сохраняют ваш образ. В блице одна самостоятельная попытка на задание.</p><p>Выход и перезагрузка не останавливают отсчёт. Здесь можно продолжить тот же раунд.</p></details>
      </aside>

      <section className="blitz-content">
        {draft && <p className="shift-draft">Задания проходят методическую проверку.</p>}
        {loading ? <section className="blitz-card" role="status"><h1>Открываем блиц…</h1><p>Проверяем доступ и сохранённый раунд.</p></section> : <>
          {!session && <section className="blitz-card">
            <span className="blitz-kicker">Короткая самостоятельная тренировка</span>
            <h1>Шесть заданий. Один отсчёт.</h1>
            <p>Дешифрируйте кодовые группы, восстановите порядок и нанесите данные станции. Все задания взяты из текущей учебной смены.</p>
            <dl className="blitz-rules"><div><dt>90 секунд</dt><dd>На весь раунд, включая переходы.</dd></div><div><dt>Одна попытка</dt><dd>После ответа открывается разбор.</dd></div><div><dt>Только практика</dt><dd>Личный результат: число верных ответов.</dd></div></dl>
            {lobby?.eligible
              ? <button type="button" className="shift-primary" disabled={busy} onClick={() => void start()}>{busy ? 'Начинаем…' : 'Начать блиц · 90 с'}</button>
              : lobby && <div className="blitz-locked"><strong>Сначала завершите одну учебную смену КН-01.</strong><p>Блиц откроется после её последнего ответа.</p><button type="button" className="shift-primary" onClick={onStartPractice}>К учебной смене</button></div>}
          </section>}

          {active && session.task && <>
            <div className="blitz-progress"><PixelProgressBar value={session.progress.answered} max={total} variant="teal" size="sm" stepText={`Задание ${session.progress.current} из ${total}`} /><span>Верно: {session.progress.correct}</span></div>
            {remaining === 0 && <p className="blitz-sync" role="status">Сверяем завершение с сервером… Итог появится после подтверждения.</p>}
            <BlitzQuestion key={session.task.instanceId} task={session.task} disabled={busy || remaining === 0} onSubmit={(answer) => void submit(session.task!.instanceId, answer)} />
          </>}

          {completed && <section className="blitz-card blitz-result" aria-labelledby="blitz-result-title">
            <span className="blitz-kicker">Серверный результат</span>
            <h1 id="blitz-result-title">{session.finishReason === 'timeout' ? 'Время вышло' : 'Раунд завершён'}</h1>
            <div className="blitz-result__score"><strong>{session.progress.correct}<span> / {total}</span></strong><p>верных ответов</p></div>
            <p>Отправлено: {session.progress.answered} из {total}. Без ответа: {total - session.progress.answered}.</p>
            <p>Результат сохранён для этого раунда. Учебные знаки, рейтинг и квалификационный допуск не меняются.</p>
            <div className="blitz-result__actions"><button type="button" className="shift-primary" disabled={busy} onClick={() => void start()}>{busy ? 'Начинаем…' : 'Новый блиц · 90 с'}</button><button type="button" className="secondary-button" onClick={onStartPractice}>Спокойная учебная смена</button></div>
            {session.review.length > 0 && <div className="blitz-review"><h2>Разбор отправленных ответов</h2>{session.review.map((item, index) => <details key={item.instanceId}><summary><span>{item.correct ? '✓' : '·'} {index + 1}. {item.question}</span><b>{item.correct ? 'Верно' : 'Есть ошибка'}</b></summary><p>{item.explanation}</p>{item.sources.map((source) => <p className="blitz-review__source" key={`${source.sourceId}:${source.locator}`}>{source.title} · {source.locator}</p>)}</details>)}</div>}
          </section>}
        </>}

        {notice && <p className="blitz-notice" role="status">{notice}</p>}
        {error && <div className="shift-error" role="alert"><p>{error}</p>{active ? <button type="button" className="secondary-button" onClick={() => void refresh()}>Обновить состояние</button> : !lobby ? <button type="button" className="secondary-button" onClick={() => void load()}>Повторить загрузку</button> : null}</div>}
      </section>
    </div>
  </main>;
}

function BlitzQuestion({ task, disabled, onSubmit }: { task: ShiftTask; disabled: boolean; onSubmit: (answer: unknown) => void }) {
  const [numeric, setNumeric] = useState('');
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>(task.payload?.steps ?? []);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const title = useRef<HTMLHeadingElement>(null);
  const number = Number(numeric.trim().replace(',', '.'));
  const kind = task.response.kind;
  useEffect(() => { if (kind !== 'numeric') title.current?.focus(); }, []);
  const valid = kind === 'numeric' ? numeric.trim() !== '' && Number.isFinite(number)
    : kind === 'choice' ? choiceIndex !== null
      : kind === 'sequence' ? steps.length > 0
        : kind === 'stationPlot' ? (task.payload?.observations?.length ?? 0) > 0 && Object.keys(placements).length === task.payload?.observations?.length : false;

  function submit() {
    if (disabled || !valid) return;
    onSubmit(kind === 'numeric' ? { value: number } : kind === 'choice' ? { choiceIndex } : kind === 'sequence' ? { order: steps.map((step) => step.id) } : { placements });
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...steps];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setSteps(next);
  }

  return <article className="shift-card blitz-question">
    <h1 ref={title} tabIndex={-1}>{task.question}</h1>
    {task.payload?.encoded && <div className="kn01-code" aria-label={`Кодовая группа ${task.payload.encoded}`}>{task.payload.encoded}</div>}
    {task.payload?.group && <div className="kn01-group">Структура: <code>{task.payload.group}</code></div>}
    {kind === 'numeric' && <label className="shift-numeric"><span>Ответ</span><div><input autoFocus disabled={disabled} inputMode="decimal" value={numeric} onChange={(event) => setNumeric(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} aria-label="Числовой ответ" />{task.response.unit && <b>{task.response.unit === 'degC' ? '°C' : task.response.unit}</b>}</div></label>}
    {kind === 'choice' && <div className="shift-options" role="radiogroup" aria-label="Варианты ответа" onKeyDown={handleRadioGroupKeyDown}>{(task.payload?.options ?? []).map((option) => <button key={option.id} disabled={disabled} type="button" role="radio" tabIndex={!disabled && (choiceIndex ?? task.payload?.options?.[0]?.id) === option.id ? 0 : -1} aria-checked={choiceIndex === option.id} className={choiceIndex === option.id ? 'is-selected' : ''} onClick={() => setChoiceIndex(option.id)}><span>{String.fromCharCode(65 + option.id)}</span>{option.label}</button>)}</div>}
    {kind === 'sequence' && <div className="shift-sequence" aria-label="Порядок групп">{steps.map((step, index) => <div className="shift-sequence-row" key={step.id}><b>{index + 1}</b><code>{step.label}</code><div><button type="button" aria-label={`Поднять ${step.label}`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" aria-label={`Опустить ${step.label}`} disabled={disabled || index === steps.length - 1} onClick={() => move(index, 1)}>↓</button></div></div>)}</div>}
    {kind === 'stationPlot' && task.payload?.observations && task.payload?.slots && <StationPlotTask payload={task.payload as StationPlotPayload} placements={placements} onChange={setPlacements} disabled={disabled} />}
    <button type="button" className="shift-primary" disabled={disabled || !valid} onClick={submit}>{disabled ? 'Ожидаем сервер…' : 'Отправить ответ'}</button>
  </article>;
}
