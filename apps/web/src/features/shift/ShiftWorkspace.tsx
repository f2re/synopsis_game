import { useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  type AvatarProfile,
  type FindErrorPayload,
  type EquipmentSnapshot,
  type ShiftAnswerResponse,
  type ShiftReference,
  type ShiftReward,
  type ShiftProgress,
  type ShiftTask,
  type StationBoardPayload,
  type StationPlotPayload,
  type TaskStep,
} from '../../api';
import { GAME_MARK } from '../../brand';
import { PixelIcon, PixelProgressBar } from '../ui';
import { FindErrorTask } from './FindErrorTask';
import { StationBoardTask } from './StationBoardTask';
import { StationPlotTask } from './StationPlotTask';
import { DigitAnatomy } from './feedback/DigitAnatomy';
import { createCodePostBridge } from '../../game/worldBridge';
import { worldAudio } from '@synopsis/world-engine';
import { OPTIONS } from '../avatar/avatarOptions';
import { AvatarPreview } from '../avatar/AvatarPreview';
import './ShiftWorkspace.css';

function normalizedNumber(value: string): number { return Number(value.trim().replace(',', '.')); }
function correctAnswerText(value: unknown): string {
  if (Array.isArray(value)) return value.join(' → ');
  if (value === null || value === undefined) return '—';
  return String(value);
}

export type ShiftExitReason = 'manual' | 'completed' | 'startup-error';

export interface ShiftAnswerEvent {
  instanceId: string;
  definitionId: string;
  question: string;
  responseKind: string;
  correct: boolean;
  firstAttemptCorrect: boolean;
  explanation: string;
  principleTags: string[];
  answered: number;
  correctCount: number;
  total: number;
  assisted: boolean;
  retried: boolean;
  reward?: ShiftReward;
  assistedTasks: number;
}

interface ShiftWorkspaceProps {
  avatar?: AvatarProfile;
  onExit: (reason: ShiftExitReason) => void;
  onAnswerEvaluated?: (event: ShiftAnswerEvent) => void;
  onProgressChanged?: (progress: ShiftProgress, assistedTasks: number) => void;
}

export function ShiftWorkspace({ avatar, onExit, onAnswerEvaluated, onProgressChanged }: ShiftWorkspaceProps) {
  const [shiftId, setShiftId] = useState('');
  const [task, setTask] = useState<ShiftTask | null>(null);
  const [progress, setProgress] = useState({ answered: 0, correct: 0, current: 1, total: 0 });
  const [contentStatus, setContentStatus] = useState('');
  const [numeric, setNumeric] = useState('');
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ShiftAnswerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [equipment, setEquipment] = useState<EquipmentSnapshot | null>(null);
  const [reference, setReference] = useState<ShiftReference | null>(null);
  const [retryOffered, setRetryOffered] = useState(false);
  const [attempt, setAttempt] = useState<1 | 2>(1);
  const [openingReference, setOpeningReference] = useState(false);
  const [resumed, setResumed] = useState(false);
  const requestInFlight = useRef(false);
  const answerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    api.startShift()
      .then((started) => {
        if (!active) return;
        setShiftId(started.shiftId);
        setTask(started.task);
        setProgress(started.progress);
        setContentStatus(started.contentStatus);
        setEquipment(started.equipment);
        setReference(started.reference ?? null);
        setRetryOffered(started.retryAvailable);
        setResumed(started.progress.answered > 0 || started.retryAvailable || Boolean(started.reference));
        onProgressChanged?.(started.progress, started.equipment.assistedTasks);
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Не удалось начать смену'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setNumeric('');
    setChoiceIndex(null);
    setSteps(task?.payload?.steps ? [...task.payload.steps] : []);
    setPlacements({});
    setSelectedStationId(null);
    setFeedback(null);
    setReference((current) => current?.instanceId === task?.instanceId ? current : null);
  }, [task?.instanceId]);

  const canSubmit = useMemo(() => {
    if (!task || feedback || submitting || openingReference || retryOffered) return false;
    if (task.response.kind === 'numeric') return numeric.trim() !== '' && Number.isFinite(normalizedNumber(numeric));
    if (task.response.kind === 'choice') return choiceIndex !== null;
    if (task.response.kind === 'sequence' || task.response.kind === 'dependencySequence') return steps.length > 0;
    if (task.response.kind === 'stationPlot' || task.response.kind === 'stationBoard') {
      const required = task.payload?.observations?.length ?? 0;
      return required > 0 && Object.keys(placements).length === required;
    }
    if (task.response.kind === 'findError') return Boolean(selectedStationId);
    return false;
  }, [choiceIndex, feedback, numeric, placements, selectedStationId, steps.length, submitting, openingReference, retryOffered, task]);

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function acceptAnswerResult(result: ShiftAnswerResponse) {
    if (!task) return;
    setProgress(result.progress);
    setEquipment(result.equipment);
    onProgressChanged?.(result.progress, result.equipment.assistedTasks);
    setResumed(false);
    if (result.status === 'retry-offered') {
      setRetryOffered(true);
      return;
    }
    setRetryOffered(false);
    setFeedback(result);
    onAnswerEvaluated?.({
      instanceId: task.instanceId,
      definitionId: task.definitionId,
      question: task.question,
      responseKind: task.response.kind,
      correct: result.feedback.correct,
      firstAttemptCorrect: result.feedback.firstAttemptCorrect,
      explanation: result.feedback.explanation,
      principleTags: [...result.feedback.principleTags],
      answered: result.progress.answered,
      correctCount: result.progress.correct,
      total: result.progress.total,
      assisted: Boolean(result.feedback.assisted),
      retried: Boolean(result.feedback.retried),
      assistedTasks: result.equipment.assistedTasks,
      reward: result.reward,
    });
    try {
      worldAudio.play(result.feedback.correct ? 'audio.feedback.synoptic-chime' : 'audio.feedback.mistake-thud');
    } catch { /* Feedback remains readable without sound. */ }
    const bridge = createCodePostBridge();
    bridge.triggerStamp(result.feedback.correct ? 'ПРИНЯТО' : 'ПРОВЕРИТЬ');
    bridge.updateStreak(result.progress.correct);
  }

  async function submit() {
    if (!task || !shiftId || !canSubmit || requestInFlight.current) return;
    requestInFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      let answer: unknown;
      if (task.response.kind === 'numeric') answer = { value: normalizedNumber(numeric) };
      else if (task.response.kind === 'choice') answer = { choiceIndex };
      else if (task.response.kind === 'sequence' || task.response.kind === 'dependencySequence') answer = { order: steps.map((step) => step.id) };
      else if (task.response.kind === 'findError') answer = { stationId: selectedStationId };
      else answer = { placements };
      const result = await api.submitTaskAnswer(shiftId, task.instanceId, answer, attempt);
      acceptAnswerResult(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось проверить ответ');
    } finally {
      setSubmitting(false);
      requestInFlight.current = false;
    }
  }

  async function openReference() {
    if (!task || !equipment || !equipment.enabled || equipment.remaining.reference < 1 || reference || feedback || requestInFlight.current) return;
    requestInFlight.current = true;
    setOpeningReference(true); setError('');
    try {
      const result = await api.shiftReference(shiftId, task.instanceId);
      setReference(result); setEquipment(result.equipment);
      onProgressChanged?.(progress, result.equipment.assistedTasks);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось открыть справку. Попробуйте ещё раз.');
    } finally {
      requestInFlight.current = false; setOpeningReference(false);
    }
  }

  function beginRetry() {
    setAttempt(2); setRetryOffered(false); setError('');
    window.requestAnimationFrame(() => answerInput.current?.focus());
  }

  async function reveal() {
    if (!task || requestInFlight.current) return;
    requestInFlight.current = true; setSubmitting(true); setError('');
    try { acceptAnswerResult(await api.revealShiftAnswer(shiftId, task.instanceId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось открыть разбор.'); }
    finally { requestInFlight.current = false; setSubmitting(false); }
  }

  function advance() {
    if (!feedback) return;
    if (feedback.nextTask) {
      const nextTask = feedback.nextTask;
      // Clear the previous answer in the same render batch as the new question.
      // An effect alone can briefly combine a new task with the old explanation.
      setFeedback(null);
      setNumeric('');
      setChoiceIndex(null);
      setSteps(nextTask.payload?.steps ? [...nextTask.payload.steps] : []);
      setPlacements({});
      setSelectedStationId(null);
      setError('');
      setAttempt(1);
      setRetryOffered(false);
      setReference(null);
      setTask(nextTask);
    }
    else onExit('completed');
  }

  if (loading) {
    return (
      <main className="shift-shell">
        <section className="shift-loading" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src="/ui/ui_station_crest_badge_v2.png" alt="26063" className="overlay-crest" style={{ width: 52, height: 52 }} />
          <p>Готовим учебную смену…</p>
        </section>
      </main>
    );
  }
  if (error && !task) {
    return (
      <main className="shift-shell">
        <section className="shift-loading" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src="/ui/ui_station_crest_badge_v2.png" alt="26063" className="overlay-crest" style={{ width: 52, height: 52 }} />
          <strong>Смена не запущена</strong>
          <p>{error}</p>
          <button className="secondary-button" onClick={() => onExit('startup-error')} style={{ marginTop: 8 }}>Вернуться в центр</button>
        </section>
      </main>
    );
  }
  if (!task) return null;

  const stationPlot = task.response.kind === 'stationPlot';
  const stationBoard = task.response.kind === 'stationBoard';
  const findError = task.response.kind === 'findError';
  const dependencySequence = task.response.kind === 'dependencySequence';
  const stationTask = stationPlot || stationBoard;
  const wideTask = stationTask || findError || dependencySequence;
  const heldTool = OPTIONS.heldItem.find((item) => item.id === equipment?.heldItem);
  const answerBlocked = Boolean(feedback) || retryOffered || submitting || openingReference;
  // Feedback still belongs to the answered task; the server already points to
  // the next unanswered one while the player is reading this explanation.
  const displayedTaskNumber = feedback ? feedback.progress.answered : progress.current;

  return (
    <main className="shift-shell">
      <header className="shift-topbar">
        <div className="shift-heading">
          <PixelIcon
            name="kn01"
            size="md"
            className="shift-topbar-icon"
            style={{ width: 36, height: 36, flexShrink: 0 }}
          />
          <div className="shift-heading__text">
            <span className="shift-kicker">{GAME_MARK} · учебная смена</span>
            <strong>{dependencySequence ? 'Первичный анализ' : findError ? 'Контроль наблюдений' : stationBoard ? 'Учебный планшет' : stationPlot ? 'Схема станции' : 'КН-01 SYNOP'}</strong>
          </div>
        </div>
        <div className="shift-progress-box">
          <PixelProgressBar
            value={progress.answered}
            max={progress.total}
            variant="teal"
            size="sm"
            stepText={`Задание ${displayedTaskNumber} из ${progress.total}`}
            showPercent
          />
        </div>
        <button type="button" className="shift-exit" onClick={() => onExit('manual')}>
          <PixelIcon name="logout" size="sm" />
          <span>Сдать смену</span>
        </button>
      </header>

      {equipment && <section className="shift-equipment" aria-label="Снаряжение этой смены">
        <div className="shift-equipment__identity">{avatar && <AvatarPreview avatar={avatar} context="shift" equipment={equipment} size={48} showBackdrop={false} />}{heldTool?.image && <img src={heldTool.image} alt="" width={44} height={44} />}<div><strong>{heldTool?.name ?? 'Без инструмента'}</strong><span>{equipment.badgeName ?? 'Учебный знак не выбран'}</span></div></div>
        <div className="shift-equipment__charges"><span>Справка <strong>{equipment.remaining.reference} / {equipment.charges.reference}</strong></span><span>Повтор <strong>{equipment.remaining.retry} / {equipment.charges.retry}</strong></span></div>
        <p>Комплект на начало смены<span>Помощь учитывается отдельно</span></p>
      </section>}
      {resumed && <p className="shift-resumed" role="status">Продолжена ваша незавершённая смена. Задание, снаряжение и оставшиеся заряды восстановлены.</p>}

      <section className="shift-stage" aria-live="polite">
        <aside className="shift-context">
          <div className="shift-context-topic-badge">
            <PixelIcon name={stationTask ? 'cartography' : dependencySequence ? 'trend' : 'doc'} size="sm" />
            <span>Тема</span>
          </div>
          <strong>{dependencySequence ? 'Конструктор зависимостей анализа' : findError ? 'Критика и физический контроль' : stationBoard ? 'Планшет приземных наблюдений' : stationPlot ? 'Нанесение данных станции' : 'Дешифрирование КН-01'}</strong>
          <p>{dependencySequence
            ? 'Здесь нет единственной правильной линейной цепочки. Расположите операции так, чтобы соблюдались обязательные зависимости методического профиля.'
            : findError
              ? 'Проверьте согласованность уже нанесённых наблюдений. Выберите станцию, в которой нарушено заданное физическое условие.'
              : stationBoard
                ? 'Работайте сразу с несколькими станциями на едином листе. Координаты станций и моделей нормированы и не зависят от размера экрана.'
                : stationPlot
                  ? 'Размещайте метеоэлементы по их нормативным позициям на станционной модели. Координатная сетка не зависит от разрешения экрана.'
                  : 'Сначала читаем кодовую группу, затем переводим её в физическую величину или смысл.'}</p>
          {contentStatus !== 'published' && <div className="shift-draft">Учебный пакет проходит независимую методическую приёмку. Рейтинговый режим отключён.</div>}
        </aside>

        <article className={`shift-card ${wideTask ? 'shift-card-wide' : ''}`}>
          <div className="shift-card-meta">
            <span className="shift-card-meta-pill">
              <PixelIcon name="doc" size="sm" />
              <span>Задание {displayedTaskNumber}</span>
            </span>
            <span className="shift-card-meta-pill">
              <PixelIcon name="trend" size="sm" />
              <span>Сложность {task.difficulty}</span>
            </span>
          </div>
          <h1>{task.question}</h1>

          {task.payload?.encoded && <div className="kn01-code" aria-label={`Кодовая группа ${task.payload.encoded}`}>{task.payload.encoded}</div>}
          {task.payload?.group && <div className="kn01-group">Структура: <code>{task.payload.group}</code></div>}

          {!feedback && !retryOffered && task.response.kind === 'numeric' && (
            <label className="shift-numeric"><span>{attempt === 2 ? 'Повторная попытка' : 'Ответ'}</span><div><input ref={answerInput} autoFocus disabled={answerBlocked} inputMode="decimal" value={numeric} onChange={(event) => setNumeric(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && canSubmit) void submit(); }} aria-label="Числовой ответ" />{task.response.unit && <b>{task.response.unit === 'degC' ? '°C' : task.response.unit}</b>}</div></label>
          )}

          {!feedback && !retryOffered && task.response.kind === 'choice' && (
            <div className="shift-options" role="radiogroup" aria-label="Варианты ответа">
              {(task.payload?.options ?? []).map((option) => <button key={option.id} disabled={answerBlocked} type="button" role="radio" aria-checked={choiceIndex === option.id} className={choiceIndex === option.id ? 'is-selected' : ''} onClick={() => setChoiceIndex(option.id)}><span>{String.fromCharCode(65 + option.id)}</span>{option.label}</button>)}
            </div>
          )}

          {!feedback && !retryOffered && (task.response.kind === 'sequence' || dependencySequence) && (
            <div className="shift-sequence" aria-label={dependencySequence ? 'Порядок операций анализа' : 'Порядок групп'}>
              {steps.map((step, index) => <div key={step.id} className="shift-sequence-row"><b>{index + 1}</b><code>{step.label}</code><div><button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0 || answerBlocked} aria-label={`Поднять ${step.label}`}>↑</button><button type="button" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1 || answerBlocked} aria-label={`Опустить ${step.label}`}>↓</button></div></div>)}
            </div>
          )}

          {stationPlot && task.payload?.observations && task.payload?.slots && <StationPlotTask payload={task.payload as StationPlotPayload} placements={placements} onChange={setPlacements} disabled={answerBlocked} results={feedback?.feedback.details?.components} />}
          {stationBoard && task.payload?.observations && task.payload?.slots && task.payload?.stations && task.payload?.canvas && <StationBoardTask payload={task.payload as StationBoardPayload} placements={placements} onChange={setPlacements} disabled={answerBlocked} results={feedback?.feedback.details?.components} />}
          {findError && task.payload?.observations && task.payload?.stations && task.payload?.canvas && <FindErrorTask payload={task.payload as FindErrorPayload} selectedStationId={selectedStationId} onSelect={setSelectedStationId} disabled={answerBlocked} feedback={feedback?.feedback.details} />}

          {!feedback && equipment?.enabled && <div className="shift-assistance">
            <button type="button" className="shift-assistance__button" disabled={Boolean(reference) || equipment.remaining.reference < 1 || submitting || openingReference || retryOffered} onClick={() => void openReference()}><img src="/assets/items/held_map_folder.png" alt="" width={28} height={28} /><span>{openingReference ? 'Открываем справку…' : reference ? 'Справка открыта' : 'Открыть справку'}<small>{reference ? 'Помощь отмечена' : `Осталось: ${equipment.remaining.reference}`}</small></span></button>
            <p>Справка содержит объяснение задания. Ответ после её открытия учитывается как выполненный с помощью.</p>
          </div>}
          {reference && !feedback && <aside className="shift-reference" aria-labelledby="shift-reference-title"><h2 id="shift-reference-title">Справка к заданию</h2><span className="shift-assisted-label">С помощью</span><p>{reference.explanation}</p>{reference.sources.map((source) => <div className="shift-source" key={`${source.sourceId}-${source.locator}`}><strong>{source.title}</strong><span>{source.locator}</span></div>)}</aside>}

          {retryOffered && <section className="shift-retry" aria-labelledby="shift-retry-title"><h2 id="shift-retry-title">Есть возможность исправить ответ</h2><p>Первая попытка неверна. Потратьте один заряд повтора, чтобы решить задание ещё раз, или откройте разбор. Заряд расходуется при проверке повторного ответа.</p><div><button type="button" className="shift-primary" disabled={submitting || openingReference} onClick={beginRetry}>Повторить ответ · 1 заряд</button><button type="button" className="shift-assistance__button" disabled={submitting || openingReference} onClick={() => void reveal()}>{submitting ? 'Открываем…' : 'Показать разбор'}</button></div></section>}
          {attempt === 2 && !feedback && !retryOffered && <p className="shift-retry-note">Повторная попытка · исправление поможет разобраться, но не заменит результат первой попытки. <button type="button" disabled={submitting || openingReference} onClick={() => void reveal()}>Перейти к разбору</button></p>}

          {error && <div className="shift-error" role="alert">{error}</div>}

          {feedback ? (
            <section className={`shift-feedback ${feedback.feedback.correct ? 'is-correct' : 'is-wrong'}`}>
              <div className="shift-feedback-title">
                <PixelIcon name={feedback.feedback.correct ? 'trophy' : 'alert'} size="sm" />
                <span>{feedback.feedback.correct ? feedback.feedback.retried ? 'Верно после повтора' : feedback.feedback.assisted ? 'Верно с помощью' : 'Верно' : 'Нужно исправить принцип'}</span>
              </div>
              {feedback.feedback.assisted && <p className="shift-assisted-label">Задание выполнено с помощью. Самостоятельность учитывается отдельно.</p>}
              {!feedback.feedback.correct && !stationTask && !findError && !dependencySequence && <p><strong>Правильный ответ:</strong> {correctAnswerText(feedback.feedback.correctAnswer)}</p>}
              {!feedback.feedback.correct && stationTask && <p>Красным отмечено ошибочное размещение, жёлтым — нормативная позиция для пропущенного или неверно размещённого элемента.</p>}
              {!feedback.feedback.correct && findError && <p><strong>Физическое нарушение:</strong> станция {correctAnswerText(feedback.feedback.correctAnswer)}. На планшоне она отмечена зелёным, ваш выбор — красным.</p>}
              {dependencySequence && !feedback.feedback.correct && (
                <div>
                  <p><strong>Нарушенные зависимости:</strong></p>
                  <ul>
                    {(feedback.feedback.details?.violations ?? []).map((item) => <li key={`${item.before}-${item.after}`}><strong>{item.before}</strong> должно быть раньше «{item.after}».</li>)}
                  </ul>
                  <p><strong>Один из допустимых порядков:</strong> {correctAnswerText(feedback.feedback.correctAnswer)}</p>
                </div>
              )}
              {dependencySequence && feedback.feedback.correct && <p>Порядок допустим. Другие линейные порядки также могут быть правильными, если сохраняют все обязательные зависимости.</p>}
              {task.payload?.encoded && (
                <DigitAnatomy
                  codeGroup={task.payload.encoded}
                  groupType={task.payload.group}
                  isCorrect={feedback.feedback.correct}
                  explanation={feedback.feedback.explanation}
                  resolvedValue={typeof feedback.feedback.correctAnswer === 'number' ? feedback.feedback.correctAnswer : undefined}
                />
              )}
              <p>{feedback.feedback.explanation}</p>
              {feedback.feedback.principleTags.length > 0 && <div className="shift-principles" aria-label="Проверяемые принципы">{feedback.feedback.principleTags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
              {feedback.feedback.sources.map((source) => <div className="shift-source" key={`${source.sourceId}-${source.locator}`}><strong>{source.title}</strong><span>{source.locator}</span></div>)}
              {feedback.completed && <section className="shift-completion-summary"><strong>Смена завершена</strong><span>С первой попытки: {feedback.progress.correct} из {feedback.progress.total} · с помощью: {feedback.equipment.assistedTasks}</span>{feedback.reward && feedback.reward.newBadges.length > 0 && <span>Получены знаки: {feedback.reward.newBadges.map((badge) => badge.name).join(', ')}</span>}</section>}
              <button className="shift-primary" type="button" onClick={advance}>{feedback.completed ? `Завершить смену · ${feedback.progress.correct}/${feedback.progress.total}` : 'Следующее задание'}</button>
            </section>
          ) : !retryOffered && <button className="shift-primary" type="button" onClick={() => void submit()} disabled={!canSubmit}>{submitting ? 'Проверяем…' : attempt === 2 ? 'Проверить повторную попытку' : 'Проверить'}</button>}
        </article>
      </section>
    </main>
  );
}
