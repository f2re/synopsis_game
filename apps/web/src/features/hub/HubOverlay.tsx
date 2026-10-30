import { useState, useEffect } from 'react';
import type { SessionUser } from '../../api';
import { GAME_CALLSIGN, GAME_MARK } from '../../brand';
import { PixelCard, PixelIcon } from '../ui';

interface HubOverlayProps {
  user: SessionUser;
  nextGoalTitle?: string;
  nextGoalSubtitle?: string;
  isFirstVisit?: boolean;
  activeFindingsCount?: number;
  onStartNextTask: () => void;
  onOpenLevelMap: () => void;
  onOpenModeSelect: () => void;
  onOpenWardrobe: () => void;
  onOpenCodebook: () => void;
  onOpenSettings: () => void;
}

export function HubOverlay({
  user,
  nextGoalTitle = 'Смена: Раздел 0 (Опознавательные группы)',
  nextGoalSubtitle = 'Изучение групп AAXX, YYGGiw, IIiii станции 26063',
  isFirstVisit = false,
  activeFindingsCount = 0,
  onStartNextTask,
  onOpenLevelMap,
  onOpenModeSelect,
  onOpenWardrobe,
  onOpenCodebook,
  onOpenSettings,
}: HubOverlayProps) {
  const [highlightActive, setHighlightActive] = useState(isFirstVisit);

  useEffect(() => {
    if (isFirstVisit) {
      const timer = setTimeout(() => setHighlightActive(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit]);

  return (
    <div className="hub-overlay" style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 16,
      boxSizing: 'border-box',
      zIndex: 10
    }}>
      {/* Верхняя панель станции */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'auto',
        background: 'rgba(7, 13, 30, 0.85)',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--ui-border-subtle)',
        borderRadius: 4,
        padding: '8px 14px'
      }}>
        {/* Бренд и статус станции */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/ui/ui_station_crest_badge_v2.png"
            alt="26063"
            style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-primary-cyan)', fontFamily: 'var(--font-pixel-ui)' }}>
              СТАНЦИЯ {GAME_MARK}
            </div>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--ui-text-primary)' }}>
              {GAME_CALLSIGN}
            </div>
          </div>
        </div>

        {/* Досье дежурного и статус-бар */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Индикатор надежности прогнозов (Метрика Image 2) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(20, 50, 40, 0.85)',
            border: '1px solid #2ecc71',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 10,
            fontFamily: 'var(--font-pixel-ui)',
            color: '#a8f5c4',
            boxShadow: '0 0 8px rgba(46, 204, 113, 0.25)'
          }}>
            <span>🎯</span>
            <span>87% НАДЁЖНОСТЬ</span>
          </div>

          {/* Индикатор сменной энергии */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(15, 30, 55, 0.85)',
            border: '1px solid #3498db',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 10,
            fontFamily: 'var(--font-pixel-ui)',
            color: '#85c1e9'
          }}>
            <span>⚡</span>
            <span>100/100</span>
          </div>

          <button
            type="button"
            className="pixel-btn-secondary"
            onClick={onOpenWardrobe}
            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>👤</span>
            <span>{user.displayName}</span>
            <span style={{ fontSize: 9, color: 'var(--color-primary-cyan)', marginLeft: 4 }}>Ур. 3</span>
          </button>

          {activeFindingsCount > 0 && (
            <div style={{
              fontSize: 11,
              color: 'var(--color-accent-amber)',
              background: 'rgba(243, 156, 18, 0.15)',
              border: '1px solid var(--color-accent-amber)',
              padding: '3px 8px',
              borderRadius: 3
            }}>
              🔍 Находки: {activeFindingsCount}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="pixel-btn-secondary"
              onClick={() => alert('Оперативные метеограммы и дежурные предписания: 3 новых')}
              title="Оперативная почта"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              ✉ 3
            </button>
            <button
              type="button"
              className="pixel-btn-secondary"
              onClick={onOpenCodebook}
              title="Справочник КН-01"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              📖 Справочник
            </button>
            <button
              type="button"
              className="pixel-btn-secondary"
              onClick={onOpenSettings}
              title="Настройки"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              ⚙
            </button>
          </div>
        </div>
      </header>

      {/* Нижняя зона: Единственная главная кнопка и навигация */}
      <footer style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        pointerEvents: 'auto'
      }}>
        {/* Кнопки переключения режимов и карты */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="pixel-btn-secondary"
            onClick={onOpenLevelMap}
            style={{ padding: '8px 14px', fontSize: 12 }}
          >
            🗺 Карта уровня
          </button>
          <button
            type="button"
            className="pixel-btn-secondary"
            onClick={onOpenModeSelect}
            style={{ padding: '8px 14px', fontSize: 12 }}
          >
            ⚖ Режимы смены
          </button>
        </div>

        {/* Главная кнопка с подписью следующей цели (Тест трёх секунд) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6
        }}>
          {highlightActive && (
            <div style={{
              background: 'var(--color-accent-amber, #e67e22)',
              color: '#070D1E',
              fontSize: 10,
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: 2,
              animation: 'pulse 1.5s infinite',
              fontFamily: 'var(--font-pixel-ui)'
            }}>
              ▼ СЛЕДУЮЩАЯ ЦЕЛЬ ДЕЖУРСТВА
            </div>
          )}

          <div style={{
            background: 'rgba(7, 13, 30, 0.92)',
            border: highlightActive ? '2px solid var(--color-accent-amber)' : '1px solid var(--ui-border-subtle)',
            borderRadius: 6,
            padding: '10px 14px',
            textAlign: 'right',
            maxWidth: 320,
            boxShadow: highlightActive ? '0 0 12px rgba(243, 156, 18, 0.4)' : 'none'
          }}>
            <div style={{ fontSize: 10, color: 'var(--ui-text-muted)' }}>
              {nextGoalSubtitle}
            </div>
            <button
              type="button"
              className="pixel-btn-primary"
              onClick={onStartNextTask}
              style={{
                marginTop: 6,
                fontSize: 14,
                padding: '10px 20px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              ▶ {nextGoalTitle}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
