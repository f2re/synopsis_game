import { useMemo, useState } from 'react';
import { GAME_MARK } from '../../brand';
import { PixelIcon } from '../ui';
import {
  ShiftWorkspace,
  type ShiftAnswerEvent,
  type ShiftExitReason,
} from './ShiftWorkspace';
import {
  getSynopticRhythm,
  MENTOR_TOPICS,
  SHIFT_DEBRIEF,
  SHIFT_HANDOVER_NOTE,
} from './shiftLore';
import './SeamlessShiftFlow.css';
import './LivingShiftFeedback.css';

type ShiftFlowPhase = 'handover' | 'work';

type MentorReaction = {
  correct: boolean;
  text: string;
};

export function SeamlessShiftFlow({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<ShiftFlowPhase>('handover');
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorTopicId, setMentorTopicId] = useState<string>(MENTOR_TOPICS[0].id);
  const [journal, setJournal] = useState<ShiftAnswerEvent[]>([]);
  const [mentorReaction, setMentorReaction] = useState<MentorReaction | null>(null);
  const [debriefReason, setDebriefReason] = useState<Exclude<ShiftExitReason, 'startup-error'> | null>(null);
  const rhythm = useMemo(() => getSynopticRhythm(), []);
  const journalActive = mentorTopicId === 'journal';
  const mentorTopic = MENTOR_TOPICS.find((topic) => topic.id === mentorTopicId) ?? MENTOR_TOPICS[0];
  const mistakes = journal.filter((entry) => !entry.correct);
  const lastProgress = journal.at(-1);

  function handleShiftExit(reason: ShiftExitReason) {
    if (reason === 'startup-error') {
      onExit();
      return;
    }
    setMentorOpen(false);
    setMentorReaction(null);
    setDebriefReason(reason);
  }

  function handleAnswerEvaluated(event: ShiftAnswerEvent) {
    setJournal((current) => {
      const withoutDuplicate = current.filter((item) => item.instanceId !== event.instanceId);
      return [...withoutDuplicate, event];
    });

    if (event.correct) {
      setMentorReaction({
        correct: true,
        text: 'Принято. Теперь свяжи цифру с процессом и не теряй ход анализа.',
      });
      return;
    }

    setMentorTopicId('journal');
    setMentorReaction({
      correct: false,
      text: 'Не исправляй ответ вслепую. Я положил принцип ошибки в разбор смены.',
    });
  }

  function openMentor() {
    setMentorOpen(true);
    setMentorReaction(null);
  }

  if (phase === 'handover') {
    return (
      <main className="shift-lore-shell" aria-labelledby="shift-handover-title">
        <section className="shift-lore-card shift-handover-card">
          <div className="shift-lore-eyebrow">
            <PixelIcon name="kn01" size="sm" />
            <span>{GAME_MARK} · приём смены</span>
          </div>
          <h1 id="shift-handover-title">Записка на краю стола</h1>
          <div className="shift-term-strip" aria-label="Ритм синоптических сроков">
            <span>Предыдущий основной срок <strong>{rhythm.previousTermUtc}</strong></span>
            <span>Следующий <strong>{rhythm.nextTermUtc}</strong> · через {rhythm.minutesToNextTerm} мин</span>
          </div>
          <blockquote className="shift-handover-note">
            <span>{SHIFT_HANDOVER_NOTE.author}</span>
            <small>{SHIFT_HANDOVER_NOTE.time}</small>
            <p>{SHIFT_HANDOVER_NOTE.text}</p>
          </blockquote>
          <div className="shift-handover-checklist">
            <strong>Перед первым заданием</strong>
            {SHIFT_HANDOVER_NOTE.checklist.map((item, index) => (
              <div key={item}><b>{index + 1}</b><span>{item}</span></div>
            ))}
          </div>
          <div className="shift-lore-actions">
            <button type="button" className="shift-primary" onClick={() => setPhase('work')}>Принять смену</button>
            <button type="button" className="secondary-button" onClick={onExit}>Вернуться в центр</button>
          </div>
        </section>
      </main>
    );
  }

  const completed = debriefReason === 'completed';

  return (
    <div className="seamless-shift-host">
      <ShiftWorkspace onExit={handleShiftExit} onAnswerEvaluated={handleAnswerEvaluated} />

      {mentorReaction && !mentorOpen && !debriefReason && (
        <button
          type="button"
          className={`shift-mentor-reaction ${mentorReaction.correct ? 'is-correct' : 'is-wrong'}`}
          onClick={openMentor}
          aria-label="Открыть разбор Иннокентия Борисовича"
        >
          <PixelIcon name={mentorReaction.correct ? 'guide' : 'alert'} size="sm" />
          <span><strong>Ольхин:</strong> «{mentorReaction.text}»</span>
        </button>
      )}

      <button
        type="button"
        className="shift-mentor-trigger"
        aria-expanded={mentorOpen}
        aria-controls="shift-mentor-panel"
        onClick={() => {
          if (mentorOpen) setMentorOpen(false);
          else openMentor();
        }}
      >
        <PixelIcon name="guide" size="sm" />
        <span>Спросить Ольхина</span>
        {mistakes.length > 0 && <b className="shift-mentor-count" aria-label={`Ошибок в разборе: ${mistakes.length}`}>{mistakes.length}</b>}
      </button>

      {mentorOpen && !debriefReason && (
        <aside id="shift-mentor-panel" className="shift-mentor-panel" aria-label="Клеёнчатая тетрадь Иннокентия Борисовича">
          <header>
            <div>
              <span>Клеёнчатая тетрадь</span>
              <strong>Иннокентий Борисович Ольхин</strong>
            </div>
            <button type="button" onClick={() => setMentorOpen(false)} aria-label="Закрыть тетрадь">×</button>
          </header>
          <p className="shift-mentor-greeting">«Не бойся спросить до того, как провёл линию. Ластик бумагу трёт, а разговор — мысль чистит».</p>
          <div className="shift-mentor-tabs" role="tablist" aria-label="Закладки тетради">
            {MENTOR_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                role="tab"
                aria-selected={!journalActive && topic.id === mentorTopic.id}
                className={!journalActive && topic.id === mentorTopic.id ? 'is-active' : ''}
                onClick={() => setMentorTopicId(topic.id)}
              >
                {topic.label}
              </button>
            ))}
            <button
              type="button"
              role="tab"
              aria-selected={journalActive}
              className={journalActive ? 'is-active' : ''}
              onClick={() => setMentorTopicId('journal')}
            >
              Разбор смены{mistakes.length > 0 ? ` · ${mistakes.length}` : ''}
            </button>
          </div>

          {journalActive ? (
            <section className="shift-mentor-page shift-journal-page">
              <h2>Разбор текущей смены</h2>
              {journal.length === 0 ? (
                <p>Здесь появятся проверенные задания. Ошибки сохраняются вместе с объяснением принципа, чтобы к ним можно было вернуться без выхода из смены.</p>
              ) : (
                <div className="shift-journal-list">
                  {[...journal].reverse().map((entry) => (
                    <article key={entry.instanceId} className={`shift-journal-entry ${entry.correct ? 'is-correct' : 'is-wrong'}`}>
                      <header>
                        <strong>Задание {entry.answered}</strong>
                        <span>{entry.correct ? 'принято' : 'нужен разбор'}</span>
                      </header>
                      <p>{entry.question}</p>
                      <div className="shift-journal-explanation">{entry.explanation}</div>
                      {entry.principleTags.length > 0 && (
                        <small>{entry.principleTags.join(' · ')}</small>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="shift-mentor-page">
              <h2>{mentorTopic.title}</h2>
              <p>{mentorTopic.body}</p>
              <div><strong>Правило:</strong> {mentorTopic.rule}</div>
            </section>
          )}

          <footer>
            <span>Срок {rhythm.previousTermUtc}</span>
            <span>Подсказка объясняет принцип и не раскрывает ответ до проверки.</span>
          </footer>
        </aside>
      )}

      {debriefReason && (
        <div className="shift-debrief-overlay" role="dialog" aria-modal="true" aria-labelledby="shift-debrief-title">
          <section className="shift-lore-card shift-debrief-card">
            <div className="shift-lore-eyebrow">
              <PixelIcon name="guide" size="sm" />
              <span>{GAME_MARK} · сдача смены</span>
            </div>
            <h1 id="shift-debrief-title">{completed ? SHIFT_DEBRIEF.title : 'Смена сдаётся досрочно'}</h1>
            <p className="shift-debrief-quote">
              <strong>{SHIFT_DEBRIEF.author}:</strong>{' '}
              «{completed
                ? SHIFT_DEBRIEF.text
                : 'Если нужно отойти — сначала зафиксируй, где остановился. Незаконченная работа не должна превращаться в потерянный ход мысли.'}»
            </p>
            <p className="shift-debrief-next">
              {completed
                ? SHIFT_DEBRIEF.next
                : 'Рабочее состояние сохранено на этом экране. Можно продолжить ту же смену без повторного запуска.'}
            </p>
            <div className="shift-term-strip">
              <span>Текущий цикл: {rhythm.previousTermUtc} → {rhythm.nextTermUtc}</span>
              <span>Ответов: {lastProgress?.answered ?? 0} · верных: {lastProgress?.correctCount ?? 0} · на разборе: {mistakes.length}</span>
            </div>
            <div className="shift-lore-actions">
              <button type="button" className="shift-primary" onClick={onExit}>Вернуться в центр</button>
              {!completed && (
                <button type="button" className="secondary-button" onClick={() => setDebriefReason(null)}>Продолжить эту смену</button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}