import { useState } from 'react';
import { PixelCard } from '../ui';

export interface RecordedError {
  id: string;
  groupCode: string;
  groupType: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  timestamp: string;
}

const SAMPLE_ERRORS: RecordedError[] = [
  {
    id: 'err_1',
    groupCode: '11028',
    groupType: '1snTTT',
    userAnswer: '+2.8 °C',
    correctAnswer: '-2.8 °C',
    explanation: 'Цифра sn=1 указывает на отрицательную температуру воздуха (ниже 0 °C).',
    timestamp: '27.10.2026, 00:45',
  },
  {
    id: 'err_2',
    groupCode: '82714',
    groupType: 'Nddff',
    userAnswer: 'ветер 27 м/с',
    correctAnswer: 'ветер 270°, 14 м/с',
    explanation: 'Цифры dd=27 обозначают направление в десятках градусов (270°), а ff=14 — скорость в м/с.',
    timestamp: '27.10.2026, 01:05',
  },
  {
    id: 'err_3',
    groupCode: '40142',
    groupType: '4PPPP',
    userAnswer: '14.2 гПа',
    correctAnswer: '1014.2 гПа',
    explanation: 'В группе 4PPPP первая цифра 0 восстанавливает базовое давление 1000 гПа (1014.2 гПа).',
    timestamp: '27.10.2026, 01:18',
  },
];

interface ErrorJournalProps {
  errors?: RecordedError[];
  onRepeatSimilar: (groupType: string) => void;
  onClose: () => void;
}

export function ErrorJournal({ errors = SAMPLE_ERRORS, onRepeatSimilar, onClose }: ErrorJournalProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? errors : errors.filter((e) => e.groupType === filter);

  return (
    <main className="app-shell error-journal-screen" aria-labelledby="journal-title">
      <div style={{ maxWidth: 720, margin: '32px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '24px 28px' }}>
            {/* Шапка журнала */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--ui-border-subtle)',
              paddingBottom: 14,
              marginBottom: 20
            }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-primary-cyan)', fontFamily: 'var(--font-pixel-ui)' }}>
                  ЖУРНАЛ ДЕЖУРНОГО · СТАНЦИЯ 26063
                </span>
                <h1 id="journal-title" style={{ margin: '4px 0 0', fontSize: 18, fontFamily: 'var(--font-pixel-display)' }}>
                  Журнал ошибок и сложных групп
                </h1>
              </div>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onClose}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                ✕ Закрыть
              </button>
            </div>

            {/* Фильтры */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--ui-text-muted)' }}>Фильтр группы:</span>
              {['all', '1snTTT', 'Nddff', '4PPPP'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={filter === f ? 'pixel-btn-primary' : 'pixel-btn-secondary'}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'Все ошибки' : f}
                </button>
              ))}
            </div>

            {/* Список ошибок */}
            {filtered.length === 0 ? (
              <div style={{
                padding: 32,
                textAlign: 'center',
                color: 'var(--ui-text-muted)',
                fontSize: 13,
                border: '1px dashed var(--ui-border-subtle)',
                borderRadius: 4
              }}>
                Ошибок по выбранному критерию не зафиксировано! Отличная наблюдательская дисциплина.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--ui-border-subtle)',
                      borderRadius: 4,
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 14,
                          fontWeight: 'bold',
                          color: 'var(--color-primary-cyan)',
                          background: 'rgba(78, 205, 196, 0.1)',
                          padding: '2px 8px',
                          borderRadius: 2
                        }}>
                          {item.groupCode}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ui-text-muted)' }}>
                          [{item.groupType}] · {item.timestamp}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="pixel-btn-primary"
                        onClick={() => onRepeatSimilar(item.groupType)}
                        style={{ fontSize: 11, padding: '4px 10px' }}
                      >
                        ⚡ Повторить похожее
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 4 }}>
                      <span style={{ color: '#ff9999' }}>
                        Ваш ответ: <strong>{item.userAnswer}</strong>
                      </span>
                      <span style={{ color: 'var(--color-success, #2ecc71)' }}>
                        Эталон: <strong>{item.correctAnswer}</strong>
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--ui-text-secondary)', lineHeight: 1.45, marginTop: 2 }}>
                      💡 {item.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Подвал */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
              borderTop: '1px solid var(--ui-border-subtle)',
              fontSize: 11,
              color: 'var(--ui-text-muted)'
            }}>
              <span>Всего зафиксировано: {errors.length}</span>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={() => onRepeatSimilar('all')}
                style={{ fontSize: 12 }}
              >
                Создать мини-смену по всем ошибкам →
              </button>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
