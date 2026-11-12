import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { WorldBridge } from '@synopsis/world-engine';
import type { SessionUser } from '../../api';
import { GAME_CALLSIGN, GAME_MARK, GAME_TITLE } from '../../brand';
import { isSavedAvatarPortrait, SavedAvatarPortrait } from '../avatar/SavedAvatarPortrait';
import { PixelIcon } from '../ui/PixelIcon';
import { StationNavDock, type StationDockModalId } from '../ui/StationNavDock';
import { StudyJournal } from './StudyJournal';
import { WorldLoadBoundary } from './WorldLoadBoundary';
import { HubDialog } from './HubDialog';
import { HubIcon } from './HubIcon';
import { usePresentationPreferences } from '../settings/settingsStore';

const WorldCanvas = lazy(() => import('../../game/WorldCanvas').then((module) => ({ default: module.WorldCanvas })));

interface HubScreenProps {
  user: SessionUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenSetCode: () => void;
  onStartShift: () => void;
  onStartBlitz: () => void;
  onOpenAvatar: () => void;
  onOpenAdmin: () => void;
  onOpenLibrary: () => void;
  onVisitArchive: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
  externalModalOpen?: boolean;
  sessionPending?: boolean;
  sessionNotice?: string;
}

const plannedLocations = [
  { title: 'Картографический класс', description: 'Самостоятельный режим анализа карт', icon: 'cartography' },
  { title: 'Дуэли и турниры', description: 'Соревновательные режимы', icon: 'trophy' },
  { title: 'Радар и аэрология', description: 'Следующие учебные модули', icon: 'radar' },
];

const facilities: Record<string, { title: string; icon: string; description: string; action?: 'shift' | 'archive' }> = {
  codepost: { title: 'Кодовый пост', icon: 'kn01', description: 'Рабочее место дежурного. Примите смену, выполните задания КН-01 и разберите ответы с наставником.', action: 'shift' },
  archive: { title: 'Архив наблюдений', icon: 'archive', description: 'Читальный зал, понятия и определения, проверенные источники и памятки. Посетите комнату или откройте библиотеку.', action: 'archive' },
  cartography: { title: 'Картографический класс', icon: 'cartography', description: 'Самостоятельный модуль анализа карт находится в разработке. Доступные учебные задания входят в смену КН-01.' },
  radar: { title: 'Радарный комплекс', icon: 'radar', description: 'Учебный модуль радиолокации находится в разработке.' },
  lab: { title: 'Аэрологический павильон', icon: 'weather', description: 'Учебный модуль аэрологии находится в разработке.' },
  hall: { title: 'Турнирный зал', icon: 'trophy', description: 'Дуэли, турниры и рейтинговые матчи пока не доступны в этой версии.' },
};

export function HubScreen({ user, onLoginClick, onLogout, onOpenSetCode, onStartShift, onStartBlitz, onOpenAvatar, onOpenAdmin, onOpenLibrary, onVisitArchive, onOpenHelp, onOpenSettings, onExit, externalModalOpen = false, sessionPending = false, sessionNotice = '' }: HubScreenProps) {
  const [activeModal, setActiveModal] = useState<StationDockModalId>(null);
  const preferences = usePresentationPreferences();
  const [currentScene, setCurrentScene] = useState('hub');
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [slowScene, setSlowScene] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const bridge = useRef<WorldBridge | null>(null);
  const preferencesRef = useRef(preferences);
  const modalRef = useRef(Boolean(activeModal || selectedFacility || externalModalOpen));
  preferencesRef.current = preferences;
  modalRef.current = Boolean(activeModal || selectedFacility || externalModalOpen);

  useEffect(() => {
    let disposed = false;
    const unsubscribers: Array<() => void> = [];
    void import('@synopsis/world-engine').then(({ worldBridge }) => {
      if (disposed) return;
      bridge.current = worldBridge;
      const applyPreferences = () => worldBridge.emit('ui:preferences', preferencesRef.current);
      unsubscribers.push(worldBridge.on('world:scene_ready', (scene: string) => {
        setCurrentScene(scene);
        setSceneReady(true);
        setSceneError(false);
        applyPreferences();
        worldBridge.emit('ui:modal_open', Boolean(modalRef.current));
      }));
      unsubscribers.push(worldBridge.on('world:load_error', () => {
        setSceneReady(false);
        setSceneError(true);
      }));
      unsubscribers.push(worldBridge.on('world:building_click', (buildingId: string) => {
        if (!facilities[buildingId]) return;
        setActiveModal(null);
        setSelectedFacility(buildingId);
      }));
      applyPreferences();
    }).catch(() => { if (!disposed) setSceneError(true); });
    return () => {
      disposed = true;
      bridge.current?.emit('ui:modal_open', false);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      bridge.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneReady || sceneError) { setSlowScene(false); return; }
    const timeout = window.setTimeout(() => setSlowScene(true), 20_000);
    return () => window.clearTimeout(timeout);
  }, [sceneReady, sceneError]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const showProfile = () => setActiveModal('profile');
    window.addEventListener('hub:session-menu', showProfile);
    window.addEventListener('hub:start-shift', onStartShift);
    return () => {
      window.removeEventListener('hub:session-menu', showProfile);
      window.removeEventListener('hub:start-shift', onStartShift);
    };
  }, [onStartShift]);

  useEffect(() => {
    bridge.current?.emit('ui:preferences', preferences);
    document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
    document.documentElement.dataset.lowPower = String(preferences.lowPower);
  }, [preferences.soundEnabled, preferences.reducedMotion, preferences.lowPower]);

  useEffect(() => {
    bridge.current?.emit('ui:modal_open', Boolean(activeModal || selectedFacility || externalModalOpen));
  }, [activeModal, selectedFacility, externalModalOpen]);

  function closeThen(action: () => void) {
    setActiveModal(null);
    setSelectedFacility(null);
    action();
  }

  function openScene(scene: 'hub' | 'archive') {
    setActiveModal(null);
    setSelectedFacility(null);
    if (scene === 'archive') onVisitArchive();
    else bridge.current?.emit('ui:open_scene', { scene });
  }

  const utcTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  const utcDate = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <main className="game-viewport hub-screen" aria-label={GAME_TITLE} data-world-state={sceneError ? 'error' : sceneReady ? 'ready' : 'loading'}>
      <WorldLoadBoundary onError={() => { setSceneError(true); setSceneReady(false); }}><Suspense fallback={null}><WorldCanvas /></Suspense></WorldLoadBoundary>
      {!sceneReady && <section className={`hub-world-status${sceneError ? ' hub-world-status--error' : slowScene ? ' hub-world-status--slow' : ''}`} role="status" aria-live="polite" aria-busy={!sceneError}>
        <PixelIcon name="kn01" size={40} alt="" />
        <h2>{sceneError ? 'Не удалось открыть вид станции' : slowScene ? 'Загрузка занимает больше времени' : 'Открываем станцию…'}</h2>
        {(sceneError || slowScene) && <><p>Библиотека, помощь и занятия доступны на нижней панели.</p><button type="button" className="hub-action" onClick={() => window.location.reload()}>Перезагрузить страницу</button></>}
        {!sceneError && !slowScene && <span className="app-loading__signal" aria-hidden="true"><i /><i /><i /></span>}
      </section>}

      <header className="hub-topbar" aria-label="Состояние станции">
        <button type="button" className="hub-profile-button" onClick={() => setActiveModal('profile')} aria-haspopup="dialog" disabled={sessionPending} aria-label={user ? `Профиль: ${user.displayName}` : 'Профиль наблюдателя и вход'}>
          <span className="hub-profile-button__portrait">
            {user ? <SavedAvatarPortrait portrait={user.avatarPortrait} size={40} label={`Сохранённый портрет: ${user.displayName}`} /> : <HubIcon name="observer" size={40} />}
          </span>
          <span className="hub-profile-button__copy"><strong>{user?.displayName ?? 'Наблюдатель'}</strong><small>{sessionPending ? 'Открываем профиль…' : user ? isSavedAvatarPortrait(user.avatarPortrait) ? user.groupId : 'Сохраните портрет в гардеробе' : 'Войти в учебную группу'}</small></span>
          <span className="hub-profile-button__chevron" aria-hidden="true">⌄</span>
        </button>

        <h1 className="hub-station-title" aria-label={GAME_TITLE}><strong>{GAME_MARK}</strong><span>{GAME_CALLSIGN}</span></h1>
        <div className="hub-learning-status"><PixelIcon name="kn01" size={32} alt="" /><span><strong>Учебная смена</strong><small>Практика КН-01</small></span></div>
        <button type="button" className="hub-clock" disabled={sessionPending} onClick={() => setActiveModal('journal')} aria-label={`Журнал занятий, ${utcTime} UTC`} aria-haspopup="dialog"><strong>{utcTime} <span>UTC</span></strong><small>{utcDate}</small></button>
        <div className="hub-topbar__actions">
          <button type="button" className="hub-icon-button" aria-label="Журнал занятий" aria-haspopup="dialog" title="Журнал занятий" disabled={sessionPending} onClick={() => setActiveModal('journal')}><PixelIcon name="telegram" size={32} alt="" /></button>
          <button type="button" className="hub-icon-button" aria-label="Настройки" title="Настройки" onClick={onOpenSettings}><HubIcon name="settings" size={36} /></button>
        </div>
      </header>

      <div className="hub-scene-caption" aria-live="polite">
        <span className="hub-scene-caption__pip" aria-hidden="true" />
        <span>{sceneError ? 'Вид станции недоступен' : !sceneReady ? 'Открываем станцию…' : currentScene === 'archive' ? 'Читальный зал архива' : 'Станция · 26063'}</span>
      </div>

      {sessionNotice && <p className="hub-session-notice" role="status">{sessionNotice}</p>}

      <StationNavDock
        onStartShift={onStartShift}
        onOpenModal={(modal) => { if (modal === 'guide') onOpenHelp(); else if (modal === 'settings') onOpenSettings(); else setActiveModal(modal); }}
        onOpenLibrary={onOpenLibrary}
        onOpenArchive={() => openScene(currentScene === 'archive' ? 'hub' : 'archive')}
        onOpenProfile={() => user ? onOpenAvatar() : setActiveModal('profile')}
        currentScene={currentScene}
        sceneReady={sceneReady}
        sessionPending={sessionPending}
      />

      {selectedFacility && facilities[selectedFacility] && (
        <HubDialog
          title={facilities[selectedFacility].title}
          subtitle={facilities[selectedFacility].action ? 'Занятия и материалы' : 'Раздел закрыт'}
          icon={facilities[selectedFacility].icon}
          onClose={() => setSelectedFacility(null)}
          footer={facilities[selectedFacility].action === 'shift'
            ? <><button type="button" className="hub-action hub-action--primary" disabled={sessionPending} onClick={() => closeThen(onStartShift)}>Начать смену</button><button type="button" className="hub-action" disabled={sessionPending} onClick={() => closeThen(onStartBlitz)}>Блиц-практика · 90 с</button></>
            : facilities[selectedFacility].action === 'archive'
              ? <><button type="button" className="hub-action hub-action--primary" onClick={() => closeThen(onOpenLibrary)}>Открыть библиотеку</button><button type="button" className="hub-action" onClick={() => openScene('archive')}>Посетить читальный зал</button></>
              : <button type="button" className="hub-action" onClick={() => setSelectedFacility(null)}>Вернуться на площадь</button>}
        >
          <p className="hub-dialog__lead">{facilities[selectedFacility].description}</p>
        </HubDialog>
      )}

      {activeModal === 'route' && (
        <HubDialog title="На станции" subtitle="Занятия и помещения" icon="cartography" onClose={() => setActiveModal(null)}>
          <div className="hub-route-list">
            <button type="button" className="hub-route-card" onClick={() => closeThen(onOpenLibrary)}><PixelIcon name="library" size={40} alt="" /><span><strong>Библиотека понятий</strong><small>Поиск, определения, памятки и закладки</small></span><b>Читать ›</b></button>
            <button type="button" className="hub-route-card" disabled={sessionPending} onClick={() => closeThen(onStartShift)}><PixelIcon name="kn01" size={40} alt="" /><span><strong>Дежурная смена КН-01</strong><small>Учебные задания с проверкой и разбором</small></span><b>Начать ›</b></button>
            <button type="button" className="hub-route-card" disabled={sessionPending} onClick={() => closeThen(onStartBlitz)}><PixelIcon name="trend" size={40} alt="" /><span><strong>Блиц-практика · 90 с</strong><small>6 заданий · после первой завершённой смены</small></span><b>Открыть ›</b></button>
            <button type="button" className="hub-route-card" onClick={() => openScene('archive')}><PixelIcon name="archive" size={40} alt="" /><span><strong>Архив наблюдений</strong><small>Посетить открытый читальный зал</small></span><b>Войти ›</b></button>
            {plannedLocations.map((location) => <div className="hub-route-card hub-route-card--planned" key={location.title}><PixelIcon name={location.icon} size={40} alt="" /><span><strong>{location.title}</strong><small>{location.description}</small></span><b>Закрыто</b></div>)}
          </div>
        </HubDialog>
      )}

      {activeModal === 'journal' && (
        <HubDialog title="Журнал занятий" subtitle={user ? user.displayName : 'Ваши занятия и достижения'} icon="telegram" onClose={() => setActiveModal(null)} footer={<button type="button" className="hub-action hub-action--primary" disabled={sessionPending} onClick={() => closeThen(onStartShift)}>Начать смену</button>}>
          <StudyJournal key={user?.id ?? 'guest'} user={user} onLogin={() => closeThen(onLoginClick)} onOpenEquipment={() => closeThen(onOpenAvatar)} />
        </HubDialog>
      )}

      {activeModal === 'profile' && (
        <HubDialog title={user ? user.displayName : 'Наблюдатель'} subtitle={user ? `Учебная группа: ${user.groupId}` : 'Добро пожаловать на станцию'} icon={user ? 'student' : 'observer'} onClose={() => setActiveModal(null)}>
          <div className="hub-profile-actions hub-profile-navigation"><button type="button" className="hub-action" onClick={() => setActiveModal(null)}>На площадь</button><button type="button" className="hub-action" onClick={() => closeThen(onOpenLibrary)}>Библиотека</button><button type="button" className="hub-action" onClick={() => closeThen(onOpenHelp)}>Помощь и управление</button></div>
          {user ? <div className="hub-profile-actions">
            <div className="hub-profile-identity"><SavedAvatarPortrait portrait={user.avatarPortrait} size={80} label={`Сохранённый портрет: ${user.displayName}`} /><p>{isSavedAvatarPortrait(user.avatarPortrait) ? 'Ваш портрет для станции, смен и блица.' : 'Выберите внешность и одежду в гардеробе, затем сохраните персонажа.'}</p></div>
            <button type="button" className="hub-action hub-action--primary" onClick={() => closeThen(onOpenAvatar)}>Персонаж и инвентарь</button>
            <button type="button" className="hub-action" onClick={() => closeThen(onOpenSetCode)}>{user.codeSet ? 'Сменить код входа' : 'Задать код входа'}</button>
            {user.roles.includes('admin') && <button type="button" className="hub-action" onClick={() => closeThen(onOpenAdmin)}>Управление группами</button>}
            <button type="button" className="hub-action" onClick={() => closeThen(onLogout)}>Выйти из игры</button>
          </div> : <>
            <p className="hub-dialog__lead">Для учебных заданий и сохранения персонажа войдите в профиль, который выдал преподаватель.</p>
            <button type="button" className="hub-action hub-action--primary" onClick={() => closeThen(onLoginClick)}>Войти в учебную группу</button>
            <button type="button" className="hub-action" onClick={() => closeThen(onExit)}>Выйти из игры</button>
          </>}
        </HubDialog>
      )}
    </main>
  );
}
