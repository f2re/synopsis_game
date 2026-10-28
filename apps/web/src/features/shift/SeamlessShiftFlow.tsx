import { useMemo, useState } from 'react';
import { GAME_MARK } from '../../brand';
import { PixelIcon } from '../ui';
import { ShiftWorkspace } from './ShiftWorkspace';
import {
  getSynopticRhythm,
  MENTOR_TOPICS,
  SHIFT_DEBRIEF,
  SHIFT_HANDOVER_NOTE,
} from './shiftLore';
import './SeamlessShiftFlow.css';

type ShiftFlowPhase = 'handover' | 'work' | 'debrief';

export function SeamlessShiftFlow({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<ShiftFlowPhase>('handover');
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorTopicId, setMentorTopicId] = useState(MENTOR_TOPICS[0].id);
  const rhythm = useMemo(() => getSynopticRhythm(), []);
  const mentorTopic = MENTOR_TOPICS.find((topic) => topic.id === mentorTopicId) ?? MENTOR_TOPICS[0];

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

  if (phase === 'debrief') {
    return (
      <main className="shift-lore-shell" aria-labelledby="shift-debrief-title">
        <section className="shift-lore-card shift-debrief-card">
          <div className="shift-lore-eyebrow">
            <PixelIcon name="guide" size="sm" />
            <span>{GAME_MARK} · сдача смены</span>
          </div>
          <h1 id="shift-debrief-title">{SHIFT_DEBRIEF.title}</h1>
          <p className="shift-debrief-quote"><strong>{SHIFT_DEBRIEF.author}:</strong> «{SHIFT_DEBRIEF.text}»</p>
          <p className="shift-debrief-next">{SHIFT_DEBRIEF.next}</p>
          <div className="shift-term-strip">
            <span>Текущий цикл: {rhythm.previousTermUtc} → {rhythm.nextTermUtc}</span>
            <span>Вахтенный журнал закрыт</span>
          </div>
          <div className="shift-lore-actions">
            <button type="button" className="shift-primary" onClick={onExit}>Вернуться в центр</button>
            <button type="button" className="secondary-button" onClick={() => setPhase('work')}>Вернуться к рабочему месту</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="seamless-shift-host">
      <ShiftWorkspace onExit={() => setPhase('debrief')} />
      <button
        type="button"
        className="shift-mentor-trigger"
        aria-expanded={mentorOpen}
        aria-controls="shift-mentor-panel"
        onClick={() => setMentorOpen((open) => !open)}
      >
        <PixelIcon name="guide" size="sm" />
        <span>Спросить Ольхина</span>
      </button>

      {mentorOpen && (
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
                aria-selected={topic.id === mentorTopic.id}
                className={topic.id === mentorTopic.id ? 'is-active' : ''}
                onClick={() => setMentorTopicId(topic.id)}
              >
                {topic.label}
              </button>
            ))}
          </div>
          <section className="shift-mentor-page">
            <h2>{mentorTopic.title}</h2>
            <p>{mentorTopic.body}</p>
            <div><strong>Правило:</strong> {mentorTopic.rule}</div>
          </section>
          <footer>
            <span>Срок {rhythm.previousTermUtc}</span>
            <span>Подсказка объясняет принцип, но не раскрывает ответ.</span>
          </footer>
        </aside>
      )}
    </div>
  );
}
