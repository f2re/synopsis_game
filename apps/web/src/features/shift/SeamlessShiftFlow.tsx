import { useEffect, useMemo, useRef, useState } from 'react';
import { GAME_MARK } from '../../brand';
import type { ShiftProgress, ShiftReward } from '../../api';
import { PixelIcon } from '../ui';
import { AwardBadgeAnimation } from './AwardBadgeAnimation';
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

export function SeamlessShiftFlow({ onExit, onEquipment }: { onExit: () => void; onEquipment?: () => void }) {
  const [phase, setPhase] = useState<ShiftFlowPhase>('handover');
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorTopicId, setMentorTopicId] = useState<string>(MENTOR_TOPICS[0].id);
  const [journal, setJournal] = useState<ShiftAnswerEvent[]>([]);
  const [mentorReaction, setMentorReaction] = useState<MentorReaction | null>(null);
  const [debriefReason, setDebriefReason] = useState<Exclude<ShiftExitReason, 'startup-error'> | null>(null);
  const [serverProgress, setServerProgress] = useState<ShiftProgress | null>(null);
  const [assistedTasks, setAssistedTasks] = useState(0);
  const [reward, setReward] = useState<ShiftReward | null>(null);
  const debriefDialog = useRef<HTMLDialogElement>(null);
  const rhythm = useMemo(() => getSynopticRhythm(), []);
  const journalActive = mentorTopicId === 'journal';
  const mentorTopic = MENTOR_TOPICS.find((topic) => topic.id === mentorTopicId) ?? MENTOR_TOPICS[0];
  const mistakes = journal.filter((entry) => !entry.firstAttemptCorrect);
  useEffect(() => {
    if (debriefReason && debriefDialog.current && !debriefDialog.current.open) debriefDialog.current.showModal();
  }, [debriefReason]);

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
    if (event.reward) setReward(event.reward);
    setJournal((current) => {
      const withoutDuplicate = current.filter((item) => item.instanceId !== event.instanceId);
      return [...withoutDuplicate, event];
    });

    if (event.correct) {
      setMentorReaction({
        correct: true,
        text: event.retried ? 'Повтор помог исправить ответ. Первую ошибку сохраним в разборе смены.' : 'Принято. Теперь свяжи цифру с процессом и не теряй ход анализа.',
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

  // The server may finish the last answer while the early-exit dialog is open.
  // Both exit buttons must show the same final result and earned badges.
  const completed = debriefReason === 'completed' || Boolean(serverProgress && serverProgress.total > 0 && serverProgress.answered >= serverProgress.total);

  return (
    <div className="seamless-shift-host">
      <ShiftWorkspace onExit={handleShiftExit} onAnswerEvaluated={handleAnswerEvaluated} onProgressChanged={(progress, assisted) => { setServerProgress(progress); setAssistedTasks(assisted); }} />

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
        {mistakes.length > 0 && <b className="shift-mentor-count" aria-label={`Ошибок первой попытки в разборе: ${mistakes.length}`}>{mistakes.length}</b>}
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
                <p>Здесь появятся задания, разобранные в этом посещении. Итоговый прогресс смены сохраняется на сервере.</p>
              ) : (
                <div className="shift-journal-list">
                  {[...journal].reverse().map((entry) => (
                    <article key={entry.instanceId} className={`shift-journal-entry ${entry.correct ? 'is-correct' : 'is-wrong'}`}>
                      <header>
                        <strong>Задание {entry.answered}</strong>
                        <span>{entry.correct ? entry.retried ? 'исправлено повтором' : entry.assisted ? 'с помощью' : 'принято' : 'нужен разбор'}</span>
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
        <dialog ref={debriefDialog} className="shift-debrief-overlay" aria-labelledby="shift-debrief-title" onCancel={(event) => { event.preventDefault(); if (completed) onExit(); else setDebriefReason(null); }}>
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
                : 'Проверенные ответы, текущее задание и оставшиеся заряды сохранены на сервере. Можно продолжить сейчас или вернуться к этой смене позже.'}
            </p>
            <div className="shift-term-strip">
              <span>Текущий цикл: {rhythm.previousTermUtc} → {rhythm.nextTermUtc}</span>
              <span>Ответов: {serverProgress?.answered ?? 0} · верно с первой попытки: {serverProgress?.correct ?? 0}</span>
              <span>Заданий с помощью: {assistedTasks}</span>
            </div>
            {completed && reward && <section className="shift-earned" aria-labelledby="shift-earned-title"><h2 id="shift-earned-title">{reward.newBadges.length > 0 ? 'Новые знаки в вашей коллекции' : 'Учебный журнал обновлён'}</h2>{reward.newBadges.length > 0 && <div className="shift-earned__badges">{reward.newBadges.map((badge) => <article key={badge.id}><AwardBadgeAnimation badgeId={badge.id} image={badge.image} size={88} /><div><strong>{badge.name}</strong><span>{badge.effectDescription}</span></div></article>)}</div>}<p>Завершено смен: {reward.completedShifts} · верно самостоятельно: {reward.unassistedCorrect} · учебных дней: {reward.practiceDays}.</p><p>Выберите учебный знак перед новой сменой. Снаряжение не влияет на рейтинговые результаты.</p></section>}
            <div className="shift-lore-actions">
              <button type="button" className="shift-primary" onClick={onExit}>Вернуться в центр</button>
              {completed && onEquipment && <button type="button" className="secondary-button" onClick={onEquipment}>{reward?.newBadges.length ? 'Выбрать полученный знак' : 'Открыть снаряжение'}</button>}
              {!completed && (
                <button type="button" className="secondary-button" onClick={() => setDebriefReason(null)}>Продолжить эту смену</button>
              )}
            </div>
          </section>
        </dialog>
      )}
    </div>
  );
}
