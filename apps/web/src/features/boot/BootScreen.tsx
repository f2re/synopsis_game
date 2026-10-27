import { useState, useEffect } from 'react';
import { GAME_CALLSIGN, GAME_MARK, GAME_TITLE } from '../../brand';
import { PixelProgressBar, PixelCard } from '../ui';

interface BootScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export function BootScreen({ onComplete, minDurationMs = 1200 }: BootScreenProps) {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Инициализация рабочего контура…');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(45);
      setStatusText('Загрузка атласов и шрифтов…');
    }, minDurationMs * 0.3);

    const t2 = setTimeout(() => {
      setProgress(80);
      setStatusText('Синхронизация профилей КН-01…');
    }, minDurationMs * 0.65);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Система готова к дежурству');
      setIsReady(true);
      if (onComplete) {
        setTimeout(onComplete, 300);
      }
    }, minDurationMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [minDurationMs, onComplete]);

  return (
    <main className="app-shell boot-screen" aria-labelledby="boot-title">
      <div className="boot-container" style={{ maxWidth: 440, margin: '80px auto', textAlign: 'center' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 16px' }}>
            <div className="brand-crest" style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src="/ui/ui_station_crest_badge_v2.png"
                alt="26063 Эмблема"
                style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <div>
              <span style={{ fontSize: 13, color: 'var(--color-primary-cyan)', fontFamily: 'var(--font-pixel-ui)' }}>
                {GAME_MARK}
              </span>
              <h1 id="boot-title" style={{ margin: '4px 0 0', fontSize: 18, fontFamily: 'var(--font-pixel-display)' }}>
                {GAME_CALLSIGN}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ui-text-muted)' }}>
                Учебный симулятор синоптической метеорологии
              </p>
            </div>

            <div style={{ width: '100%', maxWidth: 280, marginTop: 8 }}>
              <PixelProgressBar value={progress} max={100} size="md" variant="teal" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ui-text-secondary)', fontFamily: 'var(--font-pixel-ui)' }}>
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
            </div>

            {isReady && !onComplete && (
              <button
                type="button"
                className="pixel-btn-primary"
                onClick={onComplete}
                style={{ marginTop: 12 }}
              >
                Войти в систему →
              </button>
            )}

            <div style={{ fontSize: 10, color: 'var(--ui-text-muted)', marginTop: 8 }}>
              Станция Северо-Западного УГМС · 26063 КН-01 v1.0
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
