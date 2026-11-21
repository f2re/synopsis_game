import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, type LevelOneLobby, type LevelOneReview, type LevelOneSession, type SessionUser, type ShiftTask } from '../../api';
import { GAME_MARK } from '../../brand';
import { worldAudio } from '@synopsis/world-engine/audio';
import { SavedAvatarPortrait } from '../avatar/SavedAvatarPortrait';
import { PixelIcon, PixelProgressBar } from '../ui';
import { handleRadioGroupKeyDown } from '../ui/radioGroupKeys';
import { WorkroomBackdrop } from '../shift/WorkroomBackdrop';
import { SHIFT_HANDOVER_NOTE } from '../shift/shiftLore';
import { clearLevelOneDraft, clearLevelOneStartKey, levelOneAnswer, levelOneCorrectAnswer, levelOneStartKey, readLevelOneDraft, reviewedLevelOneAnswer, saveLevelOneDraft, toggleLevelOneSign, type LevelOneDraft } from './levelOneModel';
import '../shift/ShiftWorkspace.css';
import './levelOne.css';

interface Props {
  user: SessionUser;
  onExit: () => void;
  onOpenCharacter: () => void;
  onStartPractice: () => void;
}
interface CheckedTask { task: ShiftTask; review: LevelOneReview }
type PendingAnswer = { sessionId: string; task: ShiftTask; answer: { value: number } | { choiceIndex: number } };

function localDraftStore(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}
function playDeskSound(id: string): void {
  try { worldAudio.play(id); } catch { /* All feedback remains visible when sound is unavailable. */ }
}
function Sources({ sources }: { sources: LevelOneReview['sources'] }) {
  return <details className="level-one-sources"><summary>Источник и правило</summary>{sources.map(source => <div className="shift-source" key={`${source.sourceId}:${source.locator}`}><strong>{source.title}</strong><span>{source.locator}</span></div>)}</details>;
}

export function LevelOneScreen({ user, onExit, onOpenCharacter, onStartPractice }: Props) {
  const [lobby, setLobby] = useState<LevelOneLobby | null>(null);
  const [session, setSession] = useState<LevelOneSession | null>(null);
  const [draft, setDraft] = useState<LevelOneDraft>({ numeric: '', choiceIndex: null });
  const [checked, setChecked] = useState<CheckedTask | null>(null);
  const [busy, setBusy] = useState<'loading' | 'starting' | 'answer' | 'reference' | 'recover' | null>('loading');
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const operationSequence = useRef(0);
  const pendingAnswer = useRef<PendingAnswer | null>(null);
  const startKey = useRef<string | null>(null);
  const sounded = useRef(new Set<string>());
  const heading = useRef<HTMLHeadingElement>(null);
  const feedbackHeading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);

  function isCurrent(operation: number) { return mounted.current && operationSequence.current === operation; }

  function adoptSession(next: LevelOneSession | null) {
    setSession(next);
    setChecked(null);
    setDraft(next?.task ? readLevelOneDraft(localDraftStore(), user.id, next.id, next.task) : { numeric: '', choiceIndex: null });
    setUncertain(false);
    pendingAnswer.current = null;
  }

  async function withRequest<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const abort = new AbortController();
    request.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 8_000);
    try { return await operation(abort.signal); }
    catch (reason) {
      if (abort.signal.aborted) throw new Error('Сервер не ответил вовремя. Проверьте соединение и повторите запрос.');
      throw reason;
    } finally {
      window.clearTimeout(timer);
      if (request.current === abort) request.current = null;
    }
  }

  async function loadLobby() {
    if (inFlight.current) return;
    const operation = ++operationSequence.current;
    inFlight.current = true;
    setBusy('loading'); setError('');
    try {
      const next = await withRequest(api.levelOneLobby);
      if (!isCurrent(operation)) return;
      setLobby(next); adoptSession(next.session);
      if (next.session) {
        clearLevelOneStartKey(localDraftStore(), user.id); startKey.current = null;
        setNotice(next.session.status === 'active' ? 'Открыто ваше сохранённое прохождение.' : 'Открыт сохранённый результат.');
      }
    } catch (reason) { if (isCurrent(operation)) setError(reason instanceof Error ? reason.message : 'Не удалось открыть первый уровень.'); }
    finally { if (isCurrent(operation)) { setBusy(null); inFlight.current = false; } }
  }

  useEffect(() => {
    mounted.current = true;
    void loadLobby();
    return () => { mounted.current = false; operationSequence.current++; request.current?.abort(); inFlight.current = false; };
  }, []);

  useEffect(() => {
    if (session?.task && !checked) saveLevelOneDraft(localDraftStore(), user.id, session.id, session.task, draft);
  }, [user.id, session?.id, session?.task?.instanceId, draft.numeric, draft.choiceIndex, checked]);

  const complete = session?.status === 'completed' && !checked;
  const task = checked?.task ?? session?.task ?? null;
  useLayoutEffect(() => {
    if (!checked) heading.current?.focus({ preventScroll: true });
  }, [task?.instanceId, complete, Boolean(lobby)]);
  useLayoutEffect(() => {
    if (checked) { feedbackHeading.current?.focus({ preventScroll: true }); feedbackHeading.current?.scrollIntoView({ block: 'nearest' }); }
  }, [checked?.review.instanceId]);

  async function start() {
    if (inFlight.current) return;
    const operation = ++operationSequence.current;
    inFlight.current = true; setBusy('starting'); setError('');
    startKey.current ??= levelOneStartKey(localDraftStore(), user.id, () => crypto.randomUUID());
    try {
      const next = await withRequest(signal => api.startLevelOne(startKey.current!, signal));
      if (!isCurrent(operation)) return;
      adoptSession(next); setNotice('');
      clearLevelOneStartKey(localDraftStore(), user.id); startKey.current = null;
      playDeskSound('audio.equip.paper-turn');
    } catch (reason) { if (isCurrent(operation)) setError(reason instanceof Error ? reason.message : 'Не удалось получить бланк. Повторите запрос.'); }
    finally { if (isCurrent(operation)) { setBusy(null); inFlight.current = false; } }
  }

  function acceptChecked(next: LevelOneSession, answeredTask: ShiftTask) {
    const review = reviewedLevelOneAnswer(next.review, answeredTask.instanceId);
    if (!review) throw new Error('Сервер не вернул разбор принятого ответа. Проверьте сохранение.');
    setSession(next); setChecked({ task: answeredTask, review });
    setUncertain(false); pendingAnswer.current = null;
    clearLevelOneDraft(localDraftStore(), user.id, next.id, answeredTask.instanceId);
    setNotice('Ответ проверен и сохранён.');
    if (!sounded.current.has(review.instanceId)) {
      sounded.current.add(review.instanceId);
      playDeskSound(review.correct ? 'audio.feedback.synoptic-chime' : 'audio.feedback.mistake-thud');
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (inFlight.current || !session || !task || checked) return;
    const answer = levelOneAnswer(task, draft);
    if (!answer && !pendingAnswer.current) return;
    const operation = ++operationSequence.current;
    const pending = pendingAnswer.current ?? { sessionId: session.id, task, answer: answer! };
    pendingAnswer.current = pending;
    inFlight.current = true; setBusy('answer'); setError('');
    try {
      const result = await withRequest(signal => api.submitLevelOneAnswer(pending.sessionId, pending.task.instanceId, pending.answer, signal));
      if (isCurrent(operation)) acceptChecked(result.session, pending.task);
    } catch (reason) {
      if (isCurrent(operation)) {
        // On a lost response retain the exact submitted answer until the server state is read.
        const definitiveRejection = reason instanceof ApiError && reason.status >= 400 && reason.status < 500 && reason.status !== 409;
        setUncertain(!definitiveRejection);
        if (definitiveRejection) pendingAnswer.current = null;
        setError(reason instanceof Error ? reason.message : 'Не удалось получить результат проверки.');
      }
    } finally { if (isCurrent(operation)) { setBusy(null); inFlight.current = false; } }
  }

  async function recover() {
    if (inFlight.current || !session) return;
    const operation = ++operationSequence.current;
    inFlight.current = true; setBusy('recover'); setError('');
    try {
      const next = await withRequest(signal => api.levelOneSession(session.id, signal));
      if (!isCurrent(operation)) return;
      const pending = pendingAnswer.current;
      if (pending && reviewedLevelOneAnswer(next.review, pending.task.instanceId)) acceptChecked(next, pending.task);
      else {
        const sameTask = next.task?.instanceId === task?.instanceId;
        setSession(next);
        if (!sameTask) adoptSession(next);
        setUncertain(false); pendingAnswer.current = null;
        setNotice('Сохранённое состояние проверено. Можно продолжать.');
      }
    } catch (reason) { if (isCurrent(operation)) setError(reason instanceof Error ? reason.message : 'Не удалось проверить сохранение.'); }
    finally { if (isCurrent(operation)) { setBusy(null); inFlight.current = false; } }
  }

  async function openReference() {
    if (inFlight.current || !session || !task || checked || uncertain || session.reference) return;
    const operation = ++operationSequence.current;
    inFlight.current = true; setBusy('reference'); setError('');
    try {
      const reference = await withRequest(signal => api.levelOneReference(session.id, task.instanceId, signal));
      if (isCurrent(operation)) setSession(current => current?.id === session.id ? { ...current, reference, equipment: reference.equipment, assistedTasks: reference.equipment.assistedTasks } : current);
    } catch (reason) { if (isCurrent(operation)) setError(reason instanceof Error ? reason.message : 'Не удалось открыть объяснение.'); }
    finally { if (isCurrent(operation)) { setBusy(null); inFlight.current = false; } }
  }

  function advance() {
    if (!session || !checked) return;
    setChecked(null); setError(''); setNotice('');
    setDraft(session.task ? readLevelOneDraft(localDraftStore(), user.id, session.id, session.task) : { numeric: '', choiceIndex: null });
    playDeskSound('audio.equip.paper-turn');
  }

  const progress = session?.progress;
  const answerReady = Boolean(task && levelOneAnswer(task, draft));
  const blocked = Boolean(busy || checked || uncertain);
  const firstIssue = session?.review.find(item => !item.correct);
  const portrait = session ? session.equipment.avatarPortrait : user.avatarPortrait;
  const numericUnit = task?.response.unit === 'degC' ? '°C' : task?.response.unit;

  return <main className="workroom-screen level-one-shell" data-level-state={busy === 'loading' ? 'loading' : complete ? 'completed' : task ? checked ? 'feedback' : 'task' : 'ready'}>
    <WorkroomBackdrop room="telegraph" />
    <header className="level-one-topbar">
      <div><span className="shift-kicker">{GAME_MARK} · уровень 1</span><strong>Первый бланк</strong></div>
      <button type="button" className="shift-exit" onClick={onExit} disabled={Boolean(busy && busy !== 'loading')}>На станцию</button>
    </header>
    <div className="level-one-desk">
      {busy === 'loading' && !lobby ? <section className="level-one-card" aria-busy="true"><h1 ref={heading} tabIndex={-1}>Открываем первый уровень…</h1><p>Проверяем сохранённое прохождение.</p></section>
        : !lobby ? <section className="level-one-card"><h1 ref={heading} tabIndex={-1}>Не удалось открыть уровень</h1><p role="alert">{error}</p><button type="button" className="shift-primary" onClick={() => void loadLobby()} disabled={Boolean(busy)}>Повторить подключение</button></section>
        : <>
          <div className="level-one-observer"><SavedAvatarPortrait portrait={portrait} size={40} label={session ? 'Портрет на начало прохождения' : 'Сохранённый персонаж'} /><span><strong>{user.displayName}</strong><small>{session ? 'Комплект на начало прохождения' : 'Готовимся к первому бланку'}</small></span>{progress && <span className="level-one-saved">Проверено {progress.answered} из {progress.total}</span>}</div>
          {notice && <p className="level-one-notice" role="status">{notice}</p>}
          {error && <div className="shift-error" role="alert"><p>{error}</p>{uncertain && <><p>Проверим, успел ли сервер сохранить ответ. Введённое значение оставлено на месте.</p><div className="level-one-actions"><button type="button" className="secondary-button" disabled={Boolean(busy)} onClick={() => void recover()}>Проверить сохранение</button><button type="button" className="secondary-button" disabled={Boolean(busy)} onClick={() => void submit()}>Отправить тот же ответ</button></div></>}</div>}
          {!session && <section className="level-one-card level-one-welcome">
            <span className="level-one-eyebrow">Кодовый пост · первое знакомство</span>
            <h1 ref={heading} tabIndex={-1}>{lobby.title}</h1>
            <p>Узнайте сводку, различите группы и прочитайте знак и значение. Здесь {lobby.total} коротких заданий с объяснениями.</p>
            <div className="level-one-rules"><span><PixelIcon name="doc" size="sm" /> {lobby.total} заданий</span><span>Без таймера</span><span>Объяснение по запросу</span></div>
            <button type="button" className="shift-primary" onClick={() => void start()} disabled={Boolean(busy)}>{busy === 'starting' ? 'Получаем бланк…' : 'Начать первый уровень'}</button>
            <button type="button" className="level-one-text-button" onClick={onOpenCharacter} disabled={Boolean(busy)}>Настроить персонажа</button>
            <p className="level-one-small">Можно начать с текущим образом. Ответы и результат сохраняются в вашем профиле.</p>
          </section>}
          {task && !complete && <section className="level-one-card level-one-task" data-instance-id={task.instanceId}>
            <div className="level-one-task-top"><span className="level-one-eyebrow">Бланк {checked ? progress!.answered : progress!.current} / {progress!.total}</span><span>{checked ? 'Проверен' : 'На рабочем столе'}</span></div>
            <PixelProgressBar value={progress!.answered} max={progress!.total} variant="teal" size="sm" stepText={`Проверено ${progress!.answered} из ${progress!.total}`} />
            <h1 ref={heading} tabIndex={-1}>{task.question}</h1>
            {task.payload?.encoded && <div className="kn01-code" aria-label={`Кодовая группа ${task.payload.encoded}`}>{task.payload.encoded}</div>}
            {task.payload?.group && <div className="kn01-group">Группа: <code>{task.payload.group}</code></div>}
            <form onSubmit={submit} aria-label="Ответ на задание">
              {task.response.kind === 'choice' && <div className="shift-options" role="radiogroup" aria-label="Варианты ответа" onKeyDown={handleRadioGroupKeyDown}>{(task.payload?.options ?? []).map((option, index) => <button key={option.id} type="button" role="radio" aria-checked={draft.choiceIndex === option.id} disabled={blocked} tabIndex={!blocked && (draft.choiceIndex ?? task.payload?.options?.[0]?.id) === option.id ? 0 : -1} className={draft.choiceIndex === option.id ? 'is-selected' : ''} onClick={() => setDraft(current => ({ ...current, choiceIndex: option.id }))}><span aria-hidden="true">{index + 1}</span>{option.label}</button>)}</div>}
              {task.response.kind === 'numeric' && <div className="level-one-number"><label htmlFor="level-one-number">Числовой ответ{numericUnit ? `, ${numericUnit}` : ''}</label><div><button type="button" className="level-one-sign" aria-label="Изменить знак числа" disabled={blocked} onClick={() => { setDraft(current => ({ ...current, numeric: toggleLevelOneSign(current.numeric) })); input.current?.focus(); }}>±</button><input id="level-one-number" ref={input} type="text" inputMode="decimal" autoComplete="off" maxLength={80} value={draft.numeric} disabled={blocked} onChange={event => setDraft(current => ({ ...current, numeric: event.target.value }))} aria-describedby="level-one-number-help" />{numericUnit && <span aria-hidden="true">{numericUnit}</span>}</div><p id="level-one-number-help">Можно использовать запятую или точку. Кнопка ± меняет знак.</p></div>}
              {!checked && <button type="submit" className="shift-primary" disabled={!answerReady || blocked}>{busy === 'answer' ? 'Проверяем и сохраняем…' : 'Проверить ответ'}</button>}
            </form>
            {!checked && <div className="level-one-help"><button type="button" className="level-one-text-button" onClick={() => void openReference()} disabled={Boolean(busy || uncertain || session?.reference)}>{busy === 'reference' ? 'Открываем объяснение…' : session?.reference ? 'Объяснение открыто' : 'Открыть объяснение'}</button><p>Объяснение может содержать ответ. Его использование учитывается отдельно.</p></div>}
            {session?.reference && !checked && <aside className="shift-reference"><h2>Объяснение к заданию</h2><p>{session.reference.explanation}</p><Sources sources={session.reference.sources} /></aside>}
            {checked && <section className={`shift-feedback ${checked.review.correct ? 'is-correct' : 'is-wrong'}`} aria-labelledby="level-one-feedback-title">
              <div className="level-one-stamp" aria-hidden="true">ПРОВЕРЕНО</div>
              <h2 id="level-one-feedback-title" ref={feedbackHeading} tabIndex={-1}>{checked.review.correct ? checked.review.assisted ? 'Верно с объяснением' : 'Верно' : 'Разберём ответ'}</h2>
              {!checked.review.correct && <p><strong>Правильный ответ:</strong> {levelOneCorrectAnswer(checked.review.correctAnswer)}</p>}
              <p>{checked.review.explanation}</p>
              <Sources sources={checked.review.sources} />
              <p className="level-one-small">Ответ сохранён{checked.review.assisted ? ' · объяснение использовано' : ''}.</p>
              <button type="button" className="shift-primary" onClick={advance}>{session?.status === 'completed' ? 'Посмотреть результат' : 'Следующее задание'}</button>
            </section>}
          </section>}
          {complete && session && <section className="level-one-card level-one-result">
            <div className="level-one-stamp" aria-hidden="true">БЛАНК СОБРАН</div>
            <span className="level-one-eyebrow">Результат сохранён</span>
            <h1 ref={heading} tabIndex={-1}>Первый уровень завершён</h1>
            <p>Все {session.progress.total} заданий разобраны. К объяснениям можно вернуться ниже.</p>
            <dl className="level-one-stats"><div><dt>Верно</dt><dd>{session.progress.correct} / {session.progress.total}</dd></div><div><dt>Самостоятельно</dt><dd>{session.unassistedCorrect}</dd></div><div><dt>С объяснением</dt><dd>{session.assistedTasks}</dd></div></dl>
            <p>{firstIssue ? `Начните повторение с вопроса: «${firstIssue.question}»` : session.assistedTasks > 0 ? 'Попробуйте пройти бланк ещё раз самостоятельно.' : 'Все ответы верны и даны самостоятельно. Можно перейти к учебной смене.'}</p>
            <div className="level-one-actions"><button type="button" className="shift-primary" onClick={() => void start()} disabled={Boolean(busy)}>{busy === 'starting' ? 'Получаем бланк…' : 'Пройти уровень ещё раз'}</button><button type="button" className="secondary-button" onClick={onExit} disabled={Boolean(busy)}>На станцию</button><button type="button" className="level-one-text-button" onClick={onStartPractice} disabled={Boolean(busy)}>Открыть учебную смену</button><button type="button" className="level-one-text-button" onClick={onOpenCharacter} disabled={Boolean(busy)}>Настроить персонажа</button></div>
          </section>}
          {session && session.review.length > 0 && !checked && <section className="level-one-journal" aria-labelledby="level-one-journal-title"><h2 id="level-one-journal-title">Разбор бланка</h2><p>Проверенные ответы этого прохождения.</p>{session.review.map((item, index) => <details key={item.instanceId}><summary><span>{index + 1}. {item.question}</span><b>{item.correct ? 'Верно' : 'Разбор'}</b></summary><p>{item.explanation}</p>{!item.correct && <p>Правильный ответ: {levelOneCorrectAnswer(item.correctAnswer)}</p>}{item.assisted && <p className="level-one-small">Объяснение было открыто до ответа.</p>}<Sources sources={item.sources} /></details>)}</section>}
          <details className="shift-desk-note level-one-note"><summary>Записка Полины</summary><blockquote><p>{SHIFT_HANDOVER_NOTE.text}</p><cite>{SHIFT_HANDOVER_NOTE.author}</cite></blockquote></details>
        </>}
    </div>
  </main>;
}
