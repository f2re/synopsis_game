import { GAME_CALLSIGN, GAME_MARK } from '../../brand';
import type { SessionUser } from '../../api';
import { SavedAvatarPortrait } from '../avatar/SavedAvatarPortrait';
import { HubIcon } from '../hub/HubIcon';
import { PixelIcon } from '../ui/PixelIcon';
import { StationRoomArt } from '../atmosphere/StationRoomArt';
import { useAmbientWeather } from '../atmosphere/AtmosphereProvider';
import { useSettings, usePresentationPreferences, updateSettings } from '../settings/settingsStore';
import './station-screens.css';

interface TitleScreenProps {
  user: SessionUser | null;
  onOpenCampus: () => void;
  onStartShift: () => void;
  onOpenLogin: () => void;
  onOpenLibrary: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
  sessionPending?: boolean;
  sessionNotice?: string;
}

export function TitleScreen({ user, onOpenCampus, onStartShift, onOpenLogin, onOpenLibrary, onOpenHelp, onOpenSettings, onExit, sessionPending, sessionNotice }: TitleScreenProps) {
  const settings = useSettings();
  const preferences = usePresentationPreferences();
  const weather = useAmbientWeather();
  return (
    <main className="station-home" aria-labelledby="title-main-heading">
      <header className="station-home__masthead">
        <span className="station-wordmark"><span aria-hidden="true" className="station-signal" />УЧЕБНАЯ СТАНЦИЯ</span>
        <span>Северо-Запад · вымышленный кампус</span>
      </header>
      <div className="station-home__layout">
        <section className="station-home__menu">
          <p className="station-home__number" aria-hidden="true">{GAME_MARK}</p>
          <h1 id="title-main-heading" tabIndex={-1}><span className="visually-hidden">{GAME_MARK}: </span>{GAME_CALLSIGN}</h1>
          <p className="station-home__intro">Наблюдать. Разбираться. Возвращаться к главному.</p>
          <div className="station-home__identity" role="status">
            {user ? <SavedAvatarPortrait portrait={user.avatarPortrait} size={40} label={`Сохранённый портрет: ${user.displayName}`} /> : <HubIcon name="observer" size={32} />}
            <span>{sessionPending ? 'Проверяем профиль…' : user ? <><strong>{user.displayName}</strong><small>Группа {user.groupId}</small></> : <>Кампус и библиотека открыты<small>Для смены нужен профиль учебной группы</small></>}</span>
            {!user && !sessionPending && <button type="button" className="station-text-button" onClick={onOpenLogin}>Войти</button>}
          </div>
          {sessionNotice && <p className="station-notice" role="status">{sessionNotice}</p>}
          <nav className="station-main-menu" aria-label="Главное меню">
            <button className="station-menu-button station-menu-button--primary" type="button" onClick={onOpenCampus}>
              <HubIcon name="map" size={40} /><span><strong>{user ? 'Продолжить в кампусе' : 'Войти в кампус'}</strong><small>Площадь, архив и кодовый пост</small></span><b aria-hidden="true">→</b>
            </button>
            <button className="station-menu-button" type="button" onClick={onStartShift} disabled={sessionPending}>
              <PixelIcon name="kn01" size={32} alt="" /><span><strong>Учебная смена</strong><small>Перейти к рабочему месту</small></span><b aria-hidden="true">›</b>
            </button>
            <button className="station-menu-button" type="button" onClick={onOpenLibrary}>
              <HubIcon name="guide" size={36} /><span><strong>Библиотека</strong><small>Понятия, определения и памятки</small></span><b aria-hidden="true">›</b>
            </button>
            <div className="station-main-menu__pair">
              <button className="station-menu-button station-menu-button--compact" type="button" onClick={onOpenHelp}><PixelIcon name="help" size={28} alt="" /><span>Помощь</span></button>
              <button className="station-menu-button station-menu-button--compact" type="button" onClick={onOpenSettings}><HubIcon name="settings" size={28} /><span>Настройки</span></button>
            </div>
            <button className="station-text-button station-menu-exit" type="button" onClick={onExit}><PixelIcon name="exit" size={24} alt="" />Выйти из игры</button>
          </nav>
        </section>
        <section className="station-home__room" aria-label="Читальный уголок станции">
          <div className="station-home__room-label"><span className="station-signal" aria-hidden="true" />Читальный зал<span>{weather === 'rain' ? 'Дождь за окном' : 'Тихий вечер'}</span></div>
          <StationRoomArt rain={weather === 'rain'} reducedMotion={preferences.reducedMotion || preferences.lowPower} />
          <div className="station-home__room-footer"><div><span>КНИГА ОТКРЫТА</span><p>Можно никуда не спешить.<br />Начните с того, что хочется понять.</p></div><button type="button" className="station-room-link" onClick={onOpenLibrary}>К полкам <span aria-hidden="true">↗</span></button></div>
        </section>
      </div>
      <footer className="station-home__footer">
        <span>Учебная игра о работе синоптика</span>
        <button type="button" className="station-sound-button" aria-pressed={settings.soundEnabled} onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}>
          <span aria-hidden="true" className={settings.soundEnabled ? 'station-sound-bars is-on' : 'station-sound-bars'}><i /><i /><i /></span>
          {settings.soundEnabled ? 'Звук включён' : 'Включить звук'}
        </button>
        <span>Музыка и атмосфера — в настройках</span>
      </footer>
    </main>
  );
}
