import { useState } from 'react';
import { PixelCard } from '../ui';

interface Milestone {
  id: string;
  code: string;
  title: string;
  desc: string;
  status: 'completed' | 'active' | 'locked';
  score?: number;
  maxScore?: number;
}

const LEVEL1_MILESTONES: Milestone[] = [
  {
    id: 'm1_sec0',
    code: 'Раздел 0',
    title: 'Опознавательные группы',
    desc: 'AAXX (наземная станция), YYGGiw (срок наблюдения и ветер), IIiii (индекс 26063).',
    status: 'completed',
    score: 100,
    maxScore: 100,
  },
  {
    id: 'm2_wind',
    code: 'Nddff',
    title: 'Облачность и ветер',
    desc: 'Баллы облачности (0–8), направление ветра в десятках градусов и скорость в м/с.',
    status: 'completed',
    score: 95,
    maxScore: 100,
  },
  {
    id: 'm3_temp',
    code: '1snTTT',
    title: 'Температура воздуха',
    desc: 'Знак температуры sn (0 — плюс, 1 — минус) и десятые доли градуса Цельсия.',
    status: 'active',
    score: 0,
    maxScore: 100,
  },
  {
    id: 'm4_dew',
    code: '2snTdTdTd',
    title: 'Точка росы',
    desc: 'Знак и температура точки росы, оценка дефицита насыщения водяного пара.',
    status: 'locked',
  },
  {
    id: 'm5_press_st',
    code: '3PoPoPoPo',
    title: 'Давление на станции',
    desc: 'Атмосферное давление на уровне барометрической чаши в десятых долях гПа.',
    status: 'locked',
  },
  {
    id: 'm6_press_sea',
    code: '4PPPP',
    title: 'Давление на уровне моря',
    desc: 'Барометрическое давление, приведенное к уровню моря по гипсометрической формуле.',
    status: 'locked',
  },
  {
    id: 'm7_tendency',
    code: '5appp',
    title: 'Барическая тенденция',
    desc: 'Характеристика барической кривой за 3 часа (a) и величина изменения (ppp).',
    status: 'locked',
  },
  {
    id: 'm8_exam',
    code: 'ЗАЧЁТ',
    title: 'Итоговая контрольная смена',
    desc: 'Комплексный приём и полный разбор телеграммы КН-01 в строгом режиме времени.',
    status: 'locked',
  },
];

interface LevelMapProps {
  onClose: () => void;
  onSelectMilestone?: (id: string) => void;
}

export function LevelMap({ onClose, onSelectMilestone }: LevelMapProps) {
  const [selectedId, setSelectedId] = useState<string>('m3_temp');

  const activeMilestone = LEVEL1_MILESTONES.find((m) => m.status === 'active') || LEVEL1_MILESTONES[0];

  return (
    <main className="app-shell level-map-screen" aria-labelledby="map-title">
      <div style={{ maxWidth: 740, margin: '32px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '24px 28px' }}>
            {/* Шапка карты */}
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
                  КАРТА УРОВНЯ 1 · СТАНЦИЯ 26063
                </span>
                <h1 id="map-title" style={{ margin: '4px 0 0', fontSize: 18, fontFamily: 'var(--font-pixel-display)' }}>
                  Курс приземных синоптических наблюдений (КН-01)
                </h1>
              </div>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onClose}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                ✕ В хаб
              </button>
            </div>

            {/* Сетка этапов */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {LEVEL1_MILESTONES.map((m) => {
                const isActive = m.status === 'active';
                const isCompleted = m.status === 'completed';
                const isLocked = m.status === 'locked';

                return (
                  <div
                    key={m.id}
                    role="button"
                    tabIndex={isLocked ? -1 : 0}
                    onClick={() => { if (!isLocked && onSelectMilestone) onSelectMilestone(m.id); }}
                    style={{
                      background: isActive ? 'rgba(78, 205, 196, 0.12)' : isCompleted ? 'rgba(46, 204, 113, 0.08)' : 'rgba(0, 0, 0, 0.25)',
                      border: isActive ? '2px solid var(--color-primary-cyan)' : isCompleted ? '1px solid var(--color-success, #2ecc71)' : '1px solid var(--ui-border-subtle)',
                      borderRadius: 4,
                      padding: '12px 14px',
                      opacity: isLocked ? 0.6 : 1,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{
                        fontSize: 12,
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        color: isActive ? 'var(--color-primary-cyan)' : isCompleted ? 'var(--color-success, #2ecc71)' : 'var(--ui-text-muted)'
                      }}>
                        {m.code}
                      </span>
                      <span style={{ fontSize: 11, color: isCompleted ? 'var(--color-success, #2ecc71)' : isActive ? 'var(--color-accent-amber)' : 'var(--ui-text-muted)' }}>
                        {isCompleted ? '✔ Сдано (100%)' : isActive ? '▶ Текущая цель' : '🔒 Закрыто'}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--ui-text-primary)', marginBottom: 4 }}>
                      {m.title}
                    </div>

                    {/* Полная табличка только у активной текущей цели */}
                    {isActive ? (
                      <div style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px dashed var(--color-primary-cyan)',
                        fontSize: 11,
                        color: 'var(--ui-text-secondary)',
                        lineHeight: 1.45
                      }}>
                        <p style={{ margin: '0 0 6px' }}>{m.desc}</p>
                        <div style={{
                          background: 'rgba(78, 205, 196, 0.15)',
                          color: 'var(--color-primary-cyan)',
                          padding: '4px 8px',
                          borderRadius: 2,
                          fontWeight: 'bold',
                          textAlign: 'center',
                          fontSize: 10
                        }}>
                          НАЖМИТЕ ДЛЯ ПЕРЕХОДА К ДЕЖУРСТВУ
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: 'var(--ui-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isLocked ? 'Требуется завершить предыдущий этап' : m.desc}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Подвал с текущей статистикой */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
              borderTop: '1px solid var(--ui-border-subtle)',
              fontSize: 12,
              color: 'var(--ui-text-muted)'
            }}>
              <span>Пройдено этапов: 2 из 8</span>
              <span>Текущий ранг: Младший наблюдатель станции</span>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
