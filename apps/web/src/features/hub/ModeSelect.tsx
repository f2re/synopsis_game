import { useState } from 'react';
import { PixelCard } from '../ui';

export type ShiftModeId = 'study' | 'exam' | 'blitz' | 'duel';

interface ModeInfo {
  id: ShiftModeId;
  title: string;
  badge: string;
  icon: string;
  desc: string;
  rules: string[];
  recommended?: boolean;
}

const SHIFT_MODES: ModeInfo[] = [
  {
    id: 'study',
    title: 'Обучающая смена',
    badge: 'Для новичков',
    icon: '📖',
    desc: 'Спокойное пошаговое изучение синоптического кода КН-01 без ограничения по времени.',
    rules: [
      'Неограниченное время на телеграмму',
      'Доступен справочник наблюдателя S11',
      'Детальный разбор ошибок с методическими сносками',
    ],
    recommended: true,
  },
  {
    id: 'exam',
    title: 'Зачётная смена',
    badge: 'Аттестация',
    icon: '⏱️',
    desc: 'Официальный зачёт дежурного синоптика по регламенту Северо-Западного УГМС.',
    rules: [
      'Строгий лимит времени (3 минуты на срок)',
      'Справочник наблюдателя заблокирован',
      'Результат заносится в официальное свидетельство',
    ],
  },
  {
    id: 'blitz',
    title: 'Блиц-разминка',
    badge: 'Скорость',
    icon: '⚡',
    desc: 'Быстрый темп: 60 секунд на максимальное число безошибочно раскодированных групп.',
    rules: [
      '60 секунд таймер на серию',
      'Множитель очков за непрерывную серию (стрик)',
      'Мгновенная обратная связь',
    ],
  },
  {
    id: 'duel',
    title: 'Дуэль наблюдателей',
    badge: 'Соревнование',
    icon: '⚔️',
    desc: 'Синхронное дежурство двух наблюдателей на одинаковом синоптическом сроке.',
    rules: [
      'Одинаковые сводки для обоих участников',
      'Баллы за скорость и точность',
      'Вывод на большой экран Arena TV',
    ],
  },
];

interface ModeSelectProps {
  currentMode?: ShiftModeId;
  onSelectMode: (mode: ShiftModeId) => void;
  onClose: () => void;
}

export function ModeSelect({ currentMode = 'study', onSelectMode, onClose }: ModeSelectProps) {
  const [selected, setSelected] = useState<ShiftModeId>(currentMode);

  return (
    <main className="app-shell mode-select-screen" aria-labelledby="mode-select-title">
      <div style={{ maxWidth: 700, margin: '36px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '24px 28px' }}>
            {/* Шапка выбора режима */}
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
                  РЕГЛАМЕНТ ДЕЖУРСТВА · СТАНЦИЯ 26063
                </span>
                <h1 id="mode-select-title" style={{ margin: '4px 0 0', fontSize: 18, fontFamily: 'var(--font-pixel-display)' }}>
                  Выбор режима синоптической смены
                </h1>
              </div>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onClose}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                ✕ Отмена
              </button>
            </div>

            {/* Сетка режимов */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              {SHIFT_MODES.map((mode) => {
                const isSelected = selected === mode.id;

                return (
                  <div
                    key={mode.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(mode.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(mode.id); }}
                    style={{
                      background: isSelected ? 'rgba(78, 205, 196, 0.12)' : 'rgba(0, 0, 0, 0.25)',
                      border: isSelected ? '2px solid var(--color-primary-cyan)' : '1px solid var(--ui-border-subtle)',
                      borderRadius: 4,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 24 }}>{mode.icon}</span>
                        <span style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 2,
                          background: isSelected ? 'var(--color-primary-cyan)' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#070D1E' : 'var(--ui-text-muted)',
                          fontWeight: 'bold'
                        }}>
                          {mode.badge}
                        </span>
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--ui-text-primary)', marginBottom: 6 }}>
                        {mode.title}
                      </div>

                      <p style={{ fontSize: 12, color: 'var(--ui-text-secondary)', lineHeight: 1.4, margin: '0 0 10px' }}>
                        {mode.desc}
                      </p>

                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'var(--ui-text-muted)', lineHeight: 1.5 }}>
                        {mode.rules.map((rule, idx) => (
                          <li key={idx}>{rule}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ marginTop: 14, textAlign: 'right' }}>
                      <span style={{
                        fontSize: 11,
                        color: isSelected ? 'var(--color-primary-cyan)' : 'var(--ui-text-muted)',
                        fontWeight: isSelected ? 'bold' : 'normal'
                      }}>
                        {isSelected ? '● Выбрано' : '○ Выбрать'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Подтверждение выбора */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onClose}
                style={{ padding: '10px 16px' }}
              >
                Назад в хаб
              </button>
              <button
                type="button"
                className="pixel-btn-primary"
                onClick={() => {
                  onSelectMode(selected);
                  onClose();
                }}
                style={{ padding: '10px 24px', fontSize: 13 }}
              >
                Утвердить режим дежурства →
              </button>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
