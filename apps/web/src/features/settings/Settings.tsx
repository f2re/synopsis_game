import { useState } from 'react';
import { worldAudio } from '@synopsis/world-engine/audio';
import { DEFAULT_SETTINGS, saveSettings, updateSettings, useSettings, useSystemReducedMotion, type UserSettings } from './settingsStore';
import './settings.css';

export { loadSettings, saveSettings, type UserSettings } from './settingsStore';

interface SettingsProps {
  onClose: () => void;
  isPaused?: boolean;
  onResume?: () => void;
  connectionLost?: boolean;
  onRetryConnection?: () => void;
}

const volumes = [
  ['masterVolume', 'Общая громкость'],
  ['musicVolume', 'Музыка'],
  ['ambientVolume', 'Дождь и звуки окружения'],
  ['sfxVolume', 'Кнопки и игровые сигналы'],
] as const;

export function Settings({ onClose, isPaused = false, onResume, connectionLost = false, onRetryConnection }: SettingsProps) {
  const settings = useSettings();
  const systemReducedMotion = useSystemReducedMotion();
  const [saved, setSaved] = useState<boolean | null>(null);
  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => setSaved(updateSettings({ [key]: value }));
  const leave = isPaused && onResume ? onResume : onClose;

  return (
    <main className="station-settings" aria-labelledby="settings-title">
      <div className="station-settings__sheet">
        <header className="station-settings__header">
          <div><p className="station-settings__eyebrow">26063 · РАБОЧЕЕ МЕСТО</p><h1 id="settings-title">Настройки</h1><p>Устройтесь поудобнее. Всё сохраняется на этом устройстве.</p></div>
          <button type="button" className="pixel-btn-secondary" onClick={leave}>← {isPaused ? 'Продолжить' : 'Назад'}</button>
        </header>

        {connectionLost && <section className="station-settings__notice" role="status"><strong>Нет связи с сервером станции</strong><p>Настройки доступны без подключения. Результат отправки учебного ответа проверяйте после восстановления связи.</p>{onRetryConnection && <button type="button" className="pixel-btn-secondary" onClick={onRetryConnection}>Проверить соединение</button>}</section>}

        <div className="station-settings__columns">
          <section className="station-settings__section" aria-labelledby="settings-audio-title">
            <div className="station-settings__section-mark" aria-hidden="true">01</div>
            <h2 id="settings-audio-title">Звук станции</h2>
            <p className="station-settings__hint">Тихая мелодия, шелест бумаги и погода за окном.</p>
            <label className="station-settings__toggle station-settings__toggle--main"><span><strong>Звуковое сопровождение</strong><small>{settings.soundEnabled ? 'Включено. Можно настроить каждый слой.' : 'Сейчас тихо. Включите, когда будете готовы.'}</small></span><input type="checkbox" checked={settings.soundEnabled} onChange={(e) => update('soundEnabled', e.target.checked)} /></label>
            <label className="station-settings__toggle"><span><strong>Спокойная музыка</strong><small>Авторская мелодия без слов; на смене она затихает.</small></span><input type="checkbox" checked={settings.musicEnabled} onChange={(e) => update('musicEnabled', e.target.checked)} /></label>
            <div className="station-settings__sliders">
              {volumes.map(([key, label]) => <label className="station-settings__range" key={key} htmlFor={`settings-${key}`}><span>{label}<output htmlFor={`settings-${key}`}>{settings[key]}%</output></span><input id={`settings-${key}`} type="range" min="0" max="100" step="1" value={settings[key]} onChange={(e) => update(key, Number(e.target.value))} /></label>)}
            </div>
            <button type="button" className="pixel-btn-secondary" disabled={!settings.soundEnabled || settings.masterVolume === 0 || settings.sfxVolume === 0} onClick={() => worldAudio.play('audio.ui.click-soft', { allowVariance: false })}>Послушать сигнал</button>
            <p className="station-settings__footnote">При скрытии вкладки и выходе из игры звук останавливается. Учебные задания полностью доступны без звука.</p>
          </section>

          <div className="station-settings__stack">
            <section className="station-settings__section" aria-labelledby="settings-weather-title">
              <div className="station-settings__section-mark" aria-hidden="true">02</div>
              <h2 id="settings-weather-title">За окном</h2>
              <fieldset className="station-settings__weather"><legend className="sr-only">Декоративная погода</legend>{([['auto', 'Иногда дождь'], ['clear', 'Без дождя'], ['rain', 'Дождь']] as const).map(([value, label]) => <label key={value} className={settings.weather === value ? 'is-selected' : ''}><input type="radio" name="station-weather" value={value} checked={settings.weather === value} onChange={() => update('weather', value)} /><span>{label}</span></label>)}</fieldset>
              <p className="station-settings__hint">Это атмосфера станции. Погода в учебных наблюдениях и правильные ответы от неё не меняются.</p>
            </section>

            <section className="station-settings__section" aria-labelledby="settings-display-title">
              <div className="station-settings__section-mark" aria-hidden="true">03</div>
              <h2 id="settings-display-title">Чтение и движение</h2>
              <label className="station-settings__toggle"><span><strong>Уменьшить движение</strong><small>{systemReducedMotion ? 'Включено в настройках вашей системы.' : 'Спокойные сцены без постоянной анимации.'}</small></span><input type="checkbox" checked={settings.reducedMotion || systemReducedMotion} disabled={systemReducedMotion} onChange={(e) => update('reducedMotion', e.target.checked)} /></label>
              <label className="station-settings__toggle"><span><strong>Экономия ресурсов</strong><small>Упрощённые эффекты; в кампусе до 30 кадров/с.</small></span><input type="checkbox" checked={settings.lowPower} onChange={(e) => update('lowPower', e.target.checked)} /></label>
              <label className="station-settings__toggle"><span><strong>Повышенный контраст</strong><small>Более заметные границы и подписи.</small></span><input type="checkbox" checked={settings.highContrast} onChange={(e) => update('highContrast', e.target.checked)} /></label>
              <label className="station-settings__toggle"><span><strong>Плотный шрифт для чтения</strong><small>Тонкие пиксельные штрихи; обе гарнитуры поддерживают кириллицу.</small></span><input type="checkbox" checked={!settings.pixelFont} onChange={(e) => update('pixelFont', !e.target.checked)} /></label>
            </section>
          </div>
        </div>

        <footer className="station-settings__footer"><div role="status" aria-live="polite">{saved === null ? 'Настройки применяются сразу.' : saved ? 'Сохранено на этом устройстве.' : 'Применено на время сеанса. Браузер не разрешил сохранить настройки.'}</div><button type="button" className="pixel-btn-secondary" onClick={() => setSaved(saveSettings({ ...DEFAULT_SETTINGS }))}>По умолчанию</button><button type="button" className="pixel-btn-primary" onClick={leave}>Готово</button></footer>
      </div>
    </main>
  );
}
