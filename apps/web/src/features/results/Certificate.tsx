import type { SessionUser } from '../../api';
import { GAME_CALLSIGN, GAME_MARK } from '../../brand';
import { PixelCard } from '../ui';

interface CertificateProps {
  user: SessionUser;
  score: number;
  maxScore?: number;
  dateStr?: string;
  onClose: () => void;
  onPrint?: () => void;
}

export function Certificate({
  user,
  score,
  maxScore = 100,
  dateStr = '27 октября 2026 г.',
  onClose,
  onPrint,
}: CertificateProps) {
  return (
    <main className="app-shell certificate-screen" aria-labelledby="cert-title">
      <div style={{ maxWidth: 680, margin: '32px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{
            padding: '36px 40px',
            background: 'linear-gradient(180deg, rgba(20, 32, 48, 0.95) 0%, rgba(10, 18, 30, 0.98) 100%)',
            border: '2px solid var(--color-primary-cyan)',
            borderRadius: 6,
            textAlign: 'center',
            position: 'relative',
            color: 'var(--ui-text-primary)'
          }}>
            {/* Декоративная рамка ведомства */}
            <div style={{
              border: '1px dashed rgba(78, 205, 196, 0.35)',
              padding: '24px 20px',
              borderRadius: 4
            }}>
              {/* Шапка ведомства */}
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--ui-text-muted)', marginBottom: 6 }}>
                СЕВЕРО-ЗАПАДНОЕ УГМС РОССИИ · ОПОРНАЯ СТАНЦИЯ {GAME_MARK}
              </div>

              <div style={{ width: 64, height: 64, margin: '0 auto 12px' }}>
                <img
                  src="/ui/ui_station_crest_badge_v2.png"
                  alt="Герб 26063"
                  style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>

              <h1 id="cert-title" style={{
                margin: '0 0 6px',
                fontSize: 22,
                fontFamily: 'var(--font-pixel-display)',
                color: 'var(--color-primary-cyan)'
              }}>
                СВИДЕТЕЛЬСТВО НАБЛЮДАТЕЛЯ
              </h1>

              <div style={{ fontSize: 11, color: 'var(--color-accent-amber)', marginBottom: 20 }}>
                КВАЛИФИКАЦИОННЫЙ УРОВЕНЬ 1 · КОД КН-01 (SYNOP)
              </div>

              <p style={{ fontSize: 12, color: 'var(--ui-text-secondary)', margin: '0 auto 16px', maxWidth: 460 }}>
                Настоящим подтверждается, что наблюдатель гидрометеорологической службы
              </p>

              <div style={{
                fontSize: 18,
                fontWeight: 'bold',
                fontFamily: 'var(--font-pixel-ui)',
                color: '#FFFFFF',
                borderBottom: '2px solid var(--color-primary-cyan)',
                display: 'inline-block',
                padding: '4px 24px',
                marginBottom: 16
              }}>
                {user.displayName}
              </div>

              <p style={{ fontSize: 12, color: 'var(--ui-text-secondary)', margin: '0 auto 20px', maxWidth: 480, lineHeight: 1.5 }}>
                успешно сдал теоретический и практический зачёт по раскодированию приземных синоптических телеграмм Раздела 0 и Раздела 1 с итоговым результатом:
              </p>

              {/* Баллы и печать */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
                <div style={{
                  background: 'rgba(78, 205, 196, 0.1)',
                  border: '1px solid var(--color-primary-cyan)',
                  borderRadius: 4,
                  padding: '8px 16px',
                  fontFamily: 'monospace'
                }}>
                  <div style={{ fontSize: 10, color: 'var(--ui-text-muted)' }}>РЕЗУЛЬТАТ АТТЕСТАЦИИ</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--color-primary-cyan)' }}>
                    {score} / {maxScore} БАЛЛОВ
                  </div>
                </div>

                <div style={{
                  border: '2px solid var(--color-accent-amber)',
                  borderRadius: '50%',
                  width: 72,
                  height: 72,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: 'var(--color-accent-amber)',
                  transform: 'rotate(-8deg)',
                  fontSize: 8,
                  fontWeight: 'bold',
                  letterSpacing: 1
                }}>
                  <span>ОТТИСК</span>
                  <span>СТАНЦИЯ</span>
                  <span>26063</span>
                </div>
              </div>

              {/* Подписи и дата */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--ui-text-muted)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: 12
              }}>
                <span>Дата выдачи: {dateStr}</span>
                <span>Методический профиль: RUS_SURFACE_STATION_V1</span>
              </div>
            </div>

            {/* Действия */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onClose}
              >
                ← В хаб станции
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                {onPrint && (
                  <button
                    type="button"
                    className="pixel-btn-secondary"
                    onClick={onPrint}
                  >
                    Печать / Экспорт 🖨
                  </button>
                )}
                <button
                  type="button"
                  className="pixel-btn-primary"
                  onClick={onClose}
                  style={{ padding: '8px 20px' }}
                >
                  Продолжить службу →
                </button>
              </div>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
