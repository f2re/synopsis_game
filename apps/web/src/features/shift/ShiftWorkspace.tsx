import { useEffect, useMemo, useState } from 'react';
import { api, type ShiftAnswerResponse, type ShiftTask, type TaskStep } from '../../api';
import { GAME_MARK } from '../../brand';
import './ShiftWorkspace.css';

function normalizedNumber(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

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
    setFeedback(null);
  }, [task?.instanceId]);

  const canSubmit = useMemo(() => {
    if (!task || feedback || submitting) return false;
    if (task.response.kind === 'numeric') return numeric.trim() !== '' && Number.isFinite(normalizedNumber(numeric));
    if (task.response.kind === 'choice') return choiceIndex !== null;
    if (task.response.kind === 'sequence') return steps.length > 0;
    return false;
  }, [choiceIndex, feedback, numeric, steps.length, submitting, task]);

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
      else answer = { order: steps.map((step) => step.id) };
      const result = await api.submitTaskAnswer(shiftId, task.instanceId, answer);
      setFeedback(result);
      setProgress(result.progress);
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
    return <main className="shift-shell"><section className="shift-loading">Готовим учебную смену…</section></main>;
  }

  if (error && !task) {
    return (
      <main className="shift-shell">
        <section className="shift-loading">
          <strong>Смена не запущена</strong>
          <p>{error}</p>
          <button className="secondary-button" onClick={onExit}>Вернуться в центр</button>
        </section>
      </main>
    );
  }

  if (!task) return null;

  return (
    <main className="shift-shell">
      <header className="shift-topbar">
        <div>
          <span className="shift-kicker">{GAME_MARK} · учебная смена</span>
          <strong>КН-01 SYNOP</strong>
        </div>
        <div className="shift-progress" aria-label={`Выполнено ${progress.answered} из ${progress.total}`}>
          <span>{progress.current}/{progress.total}</span>
          <div><i style={{ width: `${progress.total ? (progress.answered / progress.total) * 100 : 0}%` }} /></div>
        </div>
        <button className="shift-exit" onClick={onExit}>В центр</button>
      </header>

      <section className="shift-stage" aria-live="polite">
        <aside className="shift-context">
          <span>Тема</span>
          <strong>Дешифрирование КН-01</strong>
          <p>Сначала читаем кодовую группу, затем переводим её в физическую величину или смысл.</p>
          {contentStatus !== 'published' && <div className="shift-draft">Учебный пакет проходит независимую методическую приёмку. Рейтинговый режим отключён.</div>}
        </aside>

        <article className="shift-card">
          <div className="shift-card-meta">
            <span>Задание {progress.current}</span>
            <span>Сложность {task.difficulty}</span>
          </div>
          <h1>{task.question}</h1>

          {task.payload?.encoded && (
            <div className="kn01-code" aria-label={`Кодовая группа ${task.payload.encoded}`}>{task.payload.encoded}</div>
          )}
          {task.payload?.group && <div className="kn01-group">Структура: <code>{task.payload.group}</code></div>}

          {!feedback && task.response.kind === 'numeric' && (
            <label className="shift-numeric">
              <span>Ответ</span>
              <div>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={numeric}
                  onChange={(event) => setNumeric(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && canSubmit) void submit(); }}
                  aria-label="Числовой ответ"
                />
                {task.response.unit && <b>{task.response.unit === 'degC' ? '°C' : task.response.unit}</b>}
              </div>
            </label>
          )}

          {!feedback && task.response.kind === 'choice' && (
            <div className="shift-options" role="radiogroup" aria-label="Варианты ответа">
              {(task.payload?.options ?? []).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={choiceIndex === option.id}
                  className={choiceIndex === option.id ? 'is-selected' : ''}
                  onClick={() => setChoiceIndex(option.id)}
                >
                  <span>{String.fromCharCode(65 + option.id)}</span>{option.label}
                </button>
              ))}
            </div>
          )}

          {!feedback && task.response.kind === 'sequence' && (
            <div className="shift-sequence" aria-label="Порядок групп">
              {steps.map((step, index) => (
                <div key={step.id} className="shift-sequence-row">
                  <b>{index + 1}</b><code>{step.label}</code>
                  <div>
                    <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label={`Поднять ${step.label}`}>↑</button>
                    <button type="button" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1} aria-label={`Опустить ${step.label}`}>↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <div className="shift-error" role="alert">{error}</div>}

          {feedback ? (
            <section className={`shift-feedback ${feedback.feedback.correct ? 'is-correct' : 'is-wrong'}`}>
              <div className="shift-feedback-title">{feedback.feedback.correct ? 'Верно' : 'Нужно исправить принцип'}</div>
              {!feedback.feedback.correct && (
                <p><strong>Правильный ответ:</strong> {correctAnswerText(feedback.feedback.correctAnswer)}</p>
              )}
              <p>{feedback.feedback.explanation}</p>
              {feedback.feedback.sources.map((source) => (
                <div className="shift-source" key={`${source.sourceId}-${source.locator}`}>
                  <strong>{source.title}</strong><span>{source.locator}</span>
                </div>
              ))}
              <button className="shift-primary" type="button" onClick={advance}>
                {feedback.completed ? `Завершить смену · ${feedback.progress.correct}/${feedback.progress.total}` : 'Следующее задание'}
              </button>
            </section>
          ) : (
            <button className="shift-primary" type="button" onClick={() => void submit()} disabled={!canSubmit}>
              {submitting ? 'Проверяем…' : 'Проверить'}
            </button>
          )}
        </article>
      </section>
    </main>
  );
}
