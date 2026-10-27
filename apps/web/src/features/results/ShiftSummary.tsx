import { useMemo } from 'react';
import type { SessionUser } from '../../api';
import { GAME_CALLSIGN, GAME_MARK } from '../../brand';
import { PixelCard, PixelIcon } from '../ui';

export interface ShiftStats {
  shiftId: string;
  isInterrupted?: boolean;
  totalTasks: number;
  completedTasks: number;
  correctTasks: number;
  durationSeconds: number;
  xpEarned: number;
  streakMax: number;
  errorCount: number;
  unlockedRewardId?: string;
}

interface ShiftSummaryProps {
  stats: ShiftStats;
  user: SessionUser;
  onContinue: () => void;
  onReviewErrors?: () => void;
  onExitToHub: () => void;
}

export function ShiftSummary({
  stats,
  user,
  onContinue,
  onReviewErrors,
  onExitToHub,
}: ShiftSummaryProps) {
  const accuracy = useMemo(() => {
    if (stats.completedTasks === 0) return 0;
    return Math.round((stats.correctTasks / stats.completedTasks) * 100);
  }, [stats.completedTasks, stats.correctTasks]);

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(stats.durationSeconds / 60);
    const secs = stats.durationSeconds % 60;
    return `${mins} мин ${secs < 10 ? '0' : ''}${secs} с`;
  }, [stats.durationSeconds]);

  return (
    <main className="app-shell shift-summary-screen" aria-labelledby="summary-title">
      <div style={{ maxWidth: 640, margin: '36px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '24px 28px' }}>
            {/* Шапка итогов */}
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
                  {GAME_MARK} · СТАНЦИЯ 26063
                </span>
                <h1 id="summary-title" style={{ margin: '4px 0 0', fontSize: 18, fontFamily: 'var(--font-pixel-display)' }}>
                  {stats.isInterrupted ? 'Сводка прерванной смены' : 'Итоговая сводка дежурства'}
                </h1>
              </div>

              {stats.isInterrupted ? (
                <span style={{
                  fontSize: 10,
                  color: 'var(--color-accent-amber, #f39c12)',
                  background: 'rgba(243, 156, 18, 0.15)',
                  border: '1px solid var(--color-accent-amber)',
                  padding: '3px 8px',
                  borderRadius: 2
                }}>
                  ПРЕРВАНО ДО СРОКА
                </span>
              ) : (
                <span style={{
                  fontSize: 10,
                  color: 'var(--color-success, #2ecc71)',
                  background: 'rgba(46, 204, 113, 0.15)',
                  border: '1px solid var(--color-success, #2ecc71)',
                  padding: '3px 8px',
                  borderRadius: 2
                }}>
                  СМЕНА ЗАКРЫТА
                </span>
              )}
            </div>

            {/* Наблюдатель */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 4,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--ui-text-muted)' }}>Дежурный наблюдатель:</div>
                <div style={{ fontSize: 13, fontWeight: 'bold' }}>{user.displayName} ({user.id})</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--ui-text-muted)' }}>Время на посту:</div>
                <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{formattedDuration}</div>
              </div>
            </div>

            {/* Метрики смены */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--ui-border-subtle)', borderRadius: 4, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--ui-text-muted)', marginBottom: 4 }}>ТОЧНОСТЬ</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace', color: accuracy >= 80 ? 'var(--color-success, #2ecc71)' : 'var(--color-accent-amber)' }}>
                  {accuracy}%
                </div>
                <div style={{ fontSize: 10, color: 'var(--ui-text-secondary)', marginTop: 2 }}>
                  {stats.correctTasks} из {stats.completedTasks} верно
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--ui-border-subtle)', borderRadius: 4, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--ui-text-muted)', marginBottom: 4 }}>ОПЫТ (XP)</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--color-primary-cyan)' }}>
                  +{stats.xpEarned}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ui-text-secondary)', marginTop: 2 }}>
                  Зачётные баллы
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--ui-border-subtle)', borderRadius: 4, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--ui-text-muted)', marginBottom: 4 }}>ЛУЧШИЙ СТРИК</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace', color: '#b084cc' }}>
                  {stats.streakMax}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ui-text-secondary)', marginTop: 2 }}>
                  Без единой ошибки
                </div>
              </div>
            </div>

            {/* Ошибки и рекомендации */}
            {stats.errorCount > 0 && (
              <div style={{
                background: 'rgba(231, 76, 60, 0.08)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                borderRadius: 4,
                padding: '10px 14px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#ff9999' }}>
                    Зафиксировано ошибок: {stats.errorCount}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ui-text-muted)' }}>
                    Рекомендуется закрепить сложные группы в журнале ошибок
                  </div>
                </div>
                {onReviewErrors && (
                  <button
                    type="button"
                    className="pixel-btn-secondary"
                    onClick={onReviewErrors}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    Повторить ошибки →
                  </button>
                )}
              </div>
            )}

            {/* Кнопки завершения */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onExitToHub}
              >
                ← Вернуться в хаб
              </button>

              <button
                type="button"
                className="pixel-btn-primary"
                onClick={onContinue}
                style={{ padding: '10px 24px', fontSize: 13 }}
              >
                {stats.unlockedRewardId ? 'Получить награду →' : 'Завершить дежурство →'}
              </button>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
