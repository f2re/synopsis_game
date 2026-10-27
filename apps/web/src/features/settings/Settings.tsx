import { useState, useEffect } from 'react';
import { PixelCard } from '../ui';
import { worldAudio } from '@synopsis/world-engine';

export interface UserSettings {
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  reducedMotion: boolean;
  highContrast: boolean;
  integerScale: boolean;
  pixelFont: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  masterVolume: 80,
  sfxVolume: 85,
  ambientVolume: 70,
  reducedMotion: false,
  highContrast: false,
  integerScale: true,
  pixelFont: true,
};

const STORAGE_KEY = 'synopsis_26063_settings';

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

interface SettingsProps {
  onClose: () => void;
  isPaused?: boolean;
  onResume?: () => void;
  connectionLost?: boolean;
  onRetryConnection?: () => void;
}

export function Settings({
  onClose,
  isPaused = false,
  onResume,
  connectionLost = false,
  onRetryConnection,
}: SettingsProps) {
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [savedStatus, setSavedStatus] = useState('');

  useEffect(() => {
    saveSettings(settings);
    try {
      worldAudio.setVolume('master', settings.masterVolume / 100);
      worldAudio.setVolume('effects', settings.sfxVolume / 100);
      worldAudio.setVolume('ambient', settings.ambientVolume / 100);
    } catch {}
  }, [settings]);

  function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSavedStatus('Настройки сохранены в профиле');
    setTimeout(() => setSavedStatus(''), 2000);
  }

  return (
    <main className="app-shell settings-screen" aria-labelledby="settings-title">
      <div style={{ maxWidth: 620, margin: '36px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '24px 28px' }}>
            {/* Ошибка связи S20 */}
            {connectionLost && (
              <div style={{
                background: 'rgba(231, 76, 60, 0.15)',
                border: '2px solid var(--color-danger, #e74c3c)',
                borderRadius: 4,
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: '#ff9999' }}>
                    ⚠ Потеря связи с сервером станции
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ui-text-muted)' }}>
                    Ваш введённый ответ сохранён локально и не потерян.
                  </div>
                </div>
                {onRetryConnection && (
                  <button
                    type="button"
                    className="pixel-btn-primary"
                    onClick={onRetryConnection}
                    style={{ fontSize: 11, padding: '6px 12px' }}
                  >
                    Повторить запрос ⟳
                  </button>
                )}
              </div>
            )}

            {/* Шапка настроек */}
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
                  СТАНЦИЯ 26063 · ПАРАМЕТРЫ ТЕРМИНАЛА
                </span>
                <h1 id="settings-title" style={{ margin: '4px 0 0', fontSize: 18, fontFamily: 'var(--font-pixel-display)' }}>
                  {isPaused ? 'Дежурство на паузе' : 'Настройки рабочего места'}
                </h1>
              </div>
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={isPaused && onResume ? onResume : onClose}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                ✕ {isPaused ? 'Продолжить' : 'Закрыть'}
              </button>
            </div>

            {/* Звуковые параметры */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--ui-text-primary)', marginBottom: 10, fontFamily: 'var(--font-pixel-ui)' }}>
                ГРОМКОСТЬ ЗВУКОВОГО КОМПЛЕКСА:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span>Общая громкость:</span>
                    <span style={{ fontFamily: 'monospace' }}>{settings.masterVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.masterVolume}
                    onChange={(e) => updateSetting('masterVolume', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span>Звуковые сигналы и штамп (SFX):</span>
                    <span style={{ fontFamily: 'monospace' }}>{settings.sfxVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.sfxVolume}
                    onChange={(e) => updateSetting('sfxVolume', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span>Шум ветра и фауна хаба (Ambience):</span>
                    <span style={{ fontFamily: 'monospace' }}>{settings.ambientVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.ambientVolume}
                    onChange={(e) => updateSetting('ambientVolume', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Доступность и отображение */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--ui-text-primary)', marginBottom: 10, fontFamily: 'var(--font-pixel-ui)' }}>
                ДОСТУПНОСТЬ И РЕЖИМЫ ЭКРАНА:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, cursor: 'pointer' }}>
                  <span>Уменьшенное движение (Reduced Motion)</span>
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, cursor: 'pointer' }}>
                  <span>Целочисленное масштабирование пикселей (Integer Scale)</span>
                  <input
                    type="checkbox"
                    checked={settings.integerScale}
                    onChange={(e) => updateSetting('integerScale', e.target.checked)}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, cursor: 'pointer' }}>
                  <span>Пиксельный ведомственный шрифт (PixCyrillic)</span>
                  <input
                    type="checkbox"
                    checked={settings.pixelFont}
                    onChange={(e) => updateSetting('pixelFont', e.target.checked)}
                  />
                </label>
              </div>
            </div>

            {savedStatus && (
              <div style={{ fontSize: 11, color: 'var(--color-primary-cyan)', textAlign: 'right', marginBottom: 10 }}>
                ✔ {savedStatus}
              </div>
            )}

            {/* Кнопки выхода */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid var(--ui-border-subtle)' }}>
              {isPaused && onResume && (
                <button
                  type="button"
                  className="pixel-btn-primary"
                  onClick={onResume}
                  style={{ padding: '8px 20px' }}
                >
                  ▶ Продолжить дежурство
                </button>
              )}
              <button
                type="button"
                className="pixel-btn-secondary"
                onClick={onClose}
              >
                Вернуться
              </button>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
