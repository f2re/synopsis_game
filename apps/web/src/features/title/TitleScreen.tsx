import { GAME_CALLSIGN, GAME_MARK, GAME_TITLE } from '../../brand';
import type { SessionUser } from '../../api';
import { PixelCard, PixelIcon } from '../ui';

interface TitleScreenProps {
  user: SessionUser | null;
  onStartShift: () => void;
  onOpenLogin: () => void;
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
  onOpenArenaTv?: () => void;
  onLogout?: () => void;
}

export function TitleScreen({
  user,
  onStartShift,
  onOpenLogin,
  onOpenSettings,
  onOpenAdmin,
  onOpenArenaTv,
  onLogout,
}: TitleScreenProps) {
  return (
    <main className="app-shell title-screen" aria-labelledby="title-main-heading">
      <div style={{ maxWidth: 520, margin: '48px auto', textAlign: 'center' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Герб / Эмблема станции */}
            <div style={{ width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src="/ui/ui_station_crest_badge_v2.png"
                alt="Эмблема 26063"
                style={{ width: 72, height: 72, imageRendering: 'pixelated' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Иерархия бренда */}
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-primary-cyan)', fontFamily: 'var(--font-pixel-ui)', letterSpacing: 2 }}>
                {GAME_MARK}
              </div>
              <h1 id="title-main-heading" style={{ margin: '6px 0 2px', fontSize: 22, fontFamily: 'var(--font-pixel-display)' }}>
                {GAME_CALLSIGN}
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ui-text-secondary)', lineHeight: 1.4 }}>
                Учебный тренажёр наблюдателей гидрометеорологических станций
              </p>
            </div>

            {/* Статус пользователя */}
            {user ? (
              <div style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--ui-border-subtle)',
                borderRadius: 4,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '8px 0'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: 'var(--ui-text-muted)' }}>Текущий наблюдатель:</div>
                  <div style={{ fontSize: 13, fontWeight: 'bold', fontFamily: 'var(--font-pixel-ui)' }}>
                    {user.displayName} ({user.roles.includes('admin') || user.roles.includes('instructor') ? 'Инструктор' : 'Наблюдатель'})
                  </div>
                </div>
                {onLogout && (
                  <button type="button" className="pixel-btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={onLogout}>
                    Сменить
                  </button>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--ui-text-muted)', margin: '4px 0' }}>
                Допуск осуществляется по журналу наблюдателей станции
              </div>
            )}

            {/* Главные кнопки действий */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300, marginTop: 8 }}>
              {user ? (
                <button
                  type="button"
                  className="pixel-btn-primary"
                  style={{ width: '100%', fontSize: 14, padding: '12px 16px' }}
                  onClick={onStartShift}
                >
                  ▶ Заступить на смену
                </button>
              ) : (
                <button
                  type="button"
                  className="pixel-btn-primary"
                  style={{ width: '100%', fontSize: 14, padding: '12px 16px' }}
                  onClick={onOpenLogin}
                >
                  ▶ Журнал допуска (Вход)
                </button>
              )}

              {user && (
                <button
                  type="button"
                  className="pixel-btn-secondary"
                  style={{ width: '100%' }}
                  onClick={onOpenLogin}
                >
                  Выбрать другого наблюдателя
                </button>
              )}

              {onOpenArenaTv && (
                <button
                  type="button"
                  className="pixel-btn-secondary"
                  style={{ width: '100%' }}
                  onClick={onOpenArenaTv}
                >
                  📺 Трансляция Arena TV
                </button>
              )}

              {onOpenSettings && (
                <button
                  type="button"
                  className="pixel-btn-secondary"
                  style={{ width: '100%' }}
                  onClick={onOpenSettings}
                >
                  ⚙ Настройки
                </button>
              )}

              {onOpenAdmin && (
                <button
                  type="button"
                  className="pixel-btn-secondary"
                  style={{ width: '100%', opacity: 0.75, fontSize: 11 }}
                  onClick={onOpenAdmin}
                >
                  Управление ростером (Инструктор)
                </button>
              )}
            </div>

            {/* Подвал с версией и правовой информацией */}
            <div style={{ marginTop: 12, fontSize: 10, color: 'var(--ui-text-muted)' }}>
              Северо-Западное УГМС · Станция 26063 · Код КН-01 (SYNOP)
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
