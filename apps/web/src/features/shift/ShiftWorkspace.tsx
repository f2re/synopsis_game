import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type FindErrorPayload,
  type ShiftAnswerResponse,
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
import './ShiftWorkspace.css';

function normalizedNumber(value: string): number { return Number(value.trim().replace(',', '.')); }
function correctAnswerText(value: unknown): string {
  if (Array.isArray(value)) return value.join(' → ');
  if (value === null || value === undefined) return '—';
  return String(value);
}

export function ShiftWorkspace({ onExit }: { onExit: () => void }) {
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

  useEffect(() => {
    let active = true;
    api.startShift()
      .then((started) => {
        if (!active) return;
        setShiftId(started.shiftId);
        setTask(started.task);
        setProgress(started.progress);
        setContentStatus(started.contentStatus);
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
  }, [task?.instanceId]);

  const canSubmit = useMemo(() => {
    if (!task || feedback || submitting) return false;
    if (task.response.kind === 'numeric') return numeric.trim() !== '' && Number.isFinite(normalizedNumber(numeric));
    if (task.response.kind === 'choice') return choiceIndex !== null;
    if (task.response.kind === 'sequence' || task.response.kind === 'dependencySequence') return steps.length > 0;
    if (task.response.kind === 'stationPlot' || task.response.kind === 'stationBoard') {
      const required = task.payload?.observations?.length ?? 0;
      return required > 0 && Object.keys(placements).length === required;
    }
    if (task.response.kind === 'findError') return Boolean(selectedStationId);
    return false;
  }, [choiceIndex, feedback, numeric, placements, selectedStationId, steps.length, submitting, task]);

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit() {
    if (!task || !shiftId || !canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      let answer: unknown;
      if (task.response.kind === 'numeric') answer = { value: normalizedNumber(numeric) };
      else if (task.response.kind === 'choice') answer = { choiceIndex };
      else if (task.response.kind === 'sequence' || task.response.kind === 'dependencySequence') answer = { order: steps.map((step) => step.id) };
      else if (task.response.kind === 'findError') answer = { stationId: selectedStationId };
      else answer = { placements };
      const result = await api.submitTaskAnswer(shiftId, task.instanceId, answer);
      setFeedback(result);
      setProgress(result.progress);
      try {
        worldAudio.play(result.feedback.correct ? 'audio.feedback.synoptic-chime' : 'audio.feedback.mistake-thud');
      } catch {}
      const bridge = createCodePostBridge();
      bridge.triggerStamp(result.feedback.correct ? 'ПРИНЯТО' : 'ПРОВЕРИТЬ');
      bridge.updateStreak(result.progress.correct);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось проверить ответ');
    } finally {
      setSubmitting(false);
    }
  }

  function advance() {
    if (!feedback) return;
    if (feedback.nextTask) setTask(feedback.nextTask);
    else onExit();
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
          <button className="secondary-button" onClick={onExit} style={{ marginTop: 8 }}>Вернуться в центр</button>
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

  return (
    <main className="shift-shell">
      <header className="shift-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PixelIcon
            name="kn01"
            size="md"
            className="shift-topbar-icon"
            style={{ width: 36, height: 36, flexShrink: 0 }}
          />
          <div className="shift-topbar-title-block">
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
            stepText={`Задание ${progress.current} из ${progress.total}`}
            showPercent
          />
        </div>
        <button type="button" className="shift-exit" onClick={onExit}>
          <PixelIcon name="logout" size="sm" />
          <span>В центр</span>
        </button>
      </header>

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
              <span>Задание {progress.current}</span>
            </span>
            <span className="shift-card-meta-pill">
              <PixelIcon name="trend" size="sm" />
              <span>Сложность {task.difficulty}</span>
            </span>
          </div>
          <h1>{task.question}</h1>

          {task.payload?.encoded && <div className="kn01-code" aria-label={`Кодовая группа ${task.payload.encoded}`}>{task.payload.encoded}</div>}
          {task.payload?.group && <div className="kn01-group">Структура: <code>{task.payload.group}</code></div>}

          {!feedback && task.response.kind === 'numeric' && (
            <label className="shift-numeric"><span>Ответ</span><div><input autoFocus inputMode="decimal" value={numeric} onChange={(event) => setNumeric(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && canSubmit) void submit(); }} aria-label="Числовой ответ" />{task.response.unit && <b>{task.response.unit === 'degC' ? '°C' : task.response.unit}</b>}</div></label>
          )}

          {!feedback && task.response.kind === 'choice' && (
            <div className="shift-options" role="radiogroup" aria-label="Варианты ответа">
              {(task.payload?.options ?? []).map((option) => <button key={option.id} type="button" role="radio" aria-checked={choiceIndex === option.id} className={choiceIndex === option.id ? 'is-selected' : ''} onClick={() => setChoiceIndex(option.id)}><span>{String.fromCharCode(65 + option.id)}</span>{option.label}</button>)}
            </div>
          )}

          {!feedback && (task.response.kind === 'sequence' || dependencySequence) && (
            <div className="shift-sequence" aria-label={dependencySequence ? 'Порядок операций анализа' : 'Порядок групп'}>
              {steps.map((step, index) => <div key={step.id} className="shift-sequence-row"><b>{index + 1}</b><code>{step.label}</code><div><button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label={`Поднять ${step.label}`}>↑</button><button type="button" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1} aria-label={`Опустить ${step.label}`}>↓</button></div></div>)}
            </div>
          )}

          {stationPlot && task.payload?.observations && task.payload?.slots && <StationPlotTask payload={task.payload as StationPlotPayload} placements={placements} onChange={setPlacements} disabled={Boolean(feedback)} results={feedback?.feedback.details?.components} />}
          {stationBoard && task.payload?.observations && task.payload?.slots && task.payload?.stations && task.payload?.canvas && <StationBoardTask payload={task.payload as StationBoardPayload} placements={placements} onChange={setPlacements} disabled={Boolean(feedback)} results={feedback?.feedback.details?.components} />}
          {findError && task.payload?.observations && task.payload?.stations && task.payload?.canvas && <FindErrorTask payload={task.payload as FindErrorPayload} selectedStationId={selectedStationId} onSelect={setSelectedStationId} disabled={Boolean(feedback)} feedback={feedback?.feedback.details} />}

          {error && <div className="shift-error" role="alert">{error}</div>}

          {feedback ? (
            <section className={`shift-feedback ${feedback.feedback.correct ? 'is-correct' : 'is-wrong'}`}>
              <div className="shift-feedback-title">
                <PixelIcon name={feedback.feedback.correct ? 'trophy' : 'alert'} size="sm" />
                <span>{feedback.feedback.correct ? 'Верно' : 'Нужно исправить принцип'}</span>
              </div>
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
                />
              )}
              <p>{feedback.feedback.explanation}</p>
              {feedback.feedback.principleTags.length > 0 && <div className="shift-principles" aria-label="Проверяемые принципы">{feedback.feedback.principleTags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
              {feedback.feedback.sources.map((source) => <div className="shift-source" key={`${source.sourceId}-${source.locator}`}><strong>{source.title}</strong><span>{source.locator}</span></div>)}
              <button className="shift-primary" type="button" onClick={advance}>{feedback.completed ? `Завершить смену · ${feedback.progress.correct}/${feedback.progress.total}` : 'Следующее задание'}</button>
            </section>
          ) : <button className="shift-primary" type="button" onClick={() => void submit()} disabled={!canSubmit}>{submitting ? 'Проверяем…' : 'Проверить'}</button>}
        </article>
      </section>
    </main>
  );
}
