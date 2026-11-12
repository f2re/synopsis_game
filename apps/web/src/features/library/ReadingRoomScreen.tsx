import { GAME_MARK } from '../../brand';
import { StationRoomArt } from '../atmosphere/StationRoomArt';
import { useAmbientWeather } from '../atmosphere/AtmosphereProvider';
import { usePresentationPreferences, useSettings, updateSettings } from '../settings/settingsStore';
import { HubIcon } from '../hub/HubIcon';
import '../title/station-screens.css';
import './reading-room.css';

interface ReadingRoomScreenProps {
  onBack: () => void;
  onOpenLibrary: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
}

/** An accessible reading room replaces the old fixed-size canvas placeholder. */
export function ReadingRoomScreen({ onBack, onOpenLibrary, onOpenHelp, onOpenSettings }: ReadingRoomScreenProps) {
  const weather = useAmbientWeather();
  const preferences = usePresentationPreferences();
  const settings = useSettings();
  return <main className="station-page station-reading-room" aria-labelledby="reading-room-title">
    <header className="station-page__header">
      <span className="station-page__brand">{GAME_MARK} · Архив наблюдений</span>
      <button type="button" className="station-back" onClick={onBack}>← На площадь</button>
    </header>
    <h1 id="reading-room-title">Читальный зал архива</h1>
    <p className="station-page__lead">Тихое место, чтобы разобраться в понятиях и подготовиться к следующей смене.</p>
    <div className="station-reading-room__layout">
      <section className="station-home__room" aria-label="У окна читального зала">
        <div className="station-home__room-label"><i className="station-signal" aria-hidden="true" />Свет у окна<span>{weather === 'rain' ? 'Дождь за окном' : 'Вид на залив'}</span></div>
        <StationRoomArt rain={weather === 'rain'} reducedMotion={preferences.reducedMotion || preferences.lowPower} />
        <div className="station-home__room-footer"><div><span>МОЖНО НЕ СПЕШИТЬ</span><p>Лампа горит. Книга открыта.</p></div><button type="button" className="station-room-link" onClick={onOpenSettings}>Атмосфера <span aria-hidden="true">↗</span></button></div>
      </section>
      <section className="station-reading-room__desk" aria-labelledby="reading-room-shelf">
        <span className="station-eyebrow">ПОЛКА СИНОПТИКА</span>
        <h2 id="reading-room-shelf">Нужная книга — рядом</h2>
        <p>Найдите знакомое обозначение, прочитайте определение или сохраните полезную статью в закладки.</p>
        <ul><li>Наблюдения и код КН-01</li><li>Карты и атмосфера</li><li>Памятки и приёмы работы</li></ul>
        <button type="button" className="station-menu-button station-menu-button--primary" onClick={onOpenLibrary}><HubIcon name="guide" size={40} /><span><strong>Открыть библиотеку</strong><small>Поиск, определения и ваши закладки</small></span><b aria-hidden="true">›</b></button>
        <button type="button" className="station-menu-button" onClick={onOpenHelp}><HubIcon name="guide" size={32} /><span><strong>Помощь на станции</strong><small>Первое дежурство и ответы на вопросы</small></span></button>
      </section>
    </div>
    <footer className="station-home__footer">
      <span>Читальный зал открыт без входа в профиль</span>
      <button type="button" className="station-sound-button" aria-pressed={settings.soundEnabled} onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}>{settings.soundEnabled ? 'Выключить звук' : 'Включить звук'}</button>
    </footer>
  </main>;
}
