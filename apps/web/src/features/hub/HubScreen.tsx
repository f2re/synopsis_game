import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { WorldBridge } from '@synopsis/world-engine';
import type { SessionUser } from '../../api';
import { GAME_CALLSIGN, GAME_MARK, GAME_TITLE } from '../../brand';
import { AvatarPreview } from '../avatar/AvatarPreview';
import { PixelIcon } from '../ui/PixelIcon';
import { PixelSwitch } from '../ui/PixelSwitch';
import { StationNavDock, type StationDockModalId } from '../ui/StationNavDock';
import { SynopticDutyTicker } from '../ui/SynopticDutyTicker';
import { HubDialog } from './HubDialog';
import { HubIcon } from './HubIcon';
import { readHubPreferences, saveHubPreferences, type HubPreferences } from './hubPreferences';

const WorldCanvas = lazy(() => import('../../game/WorldCanvas').then((module) => ({ default: module.WorldCanvas })));

interface HubScreenProps {
  user: SessionUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenSetCode: () => void;
  onStartShift: () => void;
  onOpenAvatar: () => void;
  onOpenAdmin: () => void;
  externalModalOpen?: boolean;
}

const plannedLocations = [
  { title: 'Картографический класс', description: 'Самостоятельный режим анализа карт', icon: 'cartography' },
  { title: 'Дуэли и турниры', description: 'Соревновательные режимы', icon: 'trophy' },
  { title: 'Радар и аэрология', description: 'Следующие учебные модули', icon: 'radar' },
];

const facilities: Record<string, { title: string; icon: string; description: string; action?: 'shift' | 'archive' }> = {
  codepost: { title: 'Кодовый пост', icon: 'kn01', description: 'Рабочее место дежурного. Примите смену, выполните задания КН-01 и разберите ответы с наставником.', action: 'shift' },
  archive: { title: 'Архив наблюдений', icon: 'archive', description: 'Читальный зал открыт для посещения. Войдите, чтобы познакомиться с помещением архива.', action: 'archive' },
  cartography: { title: 'Картографический класс', icon: 'cartography', description: 'Самостоятельный модуль анализа карт находится в разработке. Доступные учебные задания входят в смену КН-01.' },
  radar: { title: 'Радарный комплекс', icon: 'radar', description: 'Учебный модуль радиолокации находится в разработке.' },
  lab: { title: 'Аэрологический павильон', icon: 'weather', description: 'Учебный модуль аэрологии находится в разработке.' },
  hall: { title: 'Турнирный зал', icon: 'trophy', description: 'Дуэли, турниры и рейтинговые матчи пока не доступны в этой версии.' },
};

export function HubScreen({ user, onLoginClick, onLogout, onOpenSetCode, onStartShift, onOpenAvatar, onOpenAdmin, externalModalOpen = false }: HubScreenProps) {
  const [activeModal, setActiveModal] = useState<StationDockModalId>(null);
  const [preferences, setPreferences] = useState<HubPreferences>(readHubPreferences);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
  const [preferencesSaved, setPreferencesSaved] = useState<boolean | null>(null);
  const [currentScene, setCurrentScene] = useState('hub');
  const [environmentLabel, setEnvironmentLabel] = useState('');
  const [sceneReady, setSceneReady] = useState(false);
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
      unsubscribers.push(worldBridge.on<{lightingMode: string; label: string}>('world:environment_mode', (environment) => {
        setEnvironmentLabel(environment.lightingMode === 'authored-demo' ? environment.label : '');
      }));
      unsubscribers.push(worldBridge.on('world:scene_ready', (scene: string) => {
        setCurrentScene(scene);
        setSceneReady(true);
        applyPreferences();
        worldBridge.emit('ui:modal_open', Boolean(modalRef.current));
      }));
      unsubscribers.push(worldBridge.on('world:building_click', (buildingId: string) => {
        if (!facilities[buildingId]) return;
        setActiveModal(null);
        setSelectedFacility(buildingId);
      }));
      applyPreferences();
    });
    return () => {
      disposed = true;
      bridge.current?.emit('ui:modal_open', false);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      bridge.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setSystemReducedMotion(media.matches);
      setPreferences(readHubPreferences());
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
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
  }, [preferences]);

  useEffect(() => {
    bridge.current?.emit('ui:modal_open', Boolean(activeModal || selectedFacility || externalModalOpen));
  }, [activeModal, selectedFacility, externalModalOpen]);

  function closeThen(action: () => void) {
    setActiveModal(null);
    setSelectedFacility(null);
    action();
  }

  function changePreference(key: keyof HubPreferences, value: boolean) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setPreferencesSaved(saveHubPreferences(next));
  }

  function openScene(scene: 'hub' | 'archive') {
    setActiveModal(null);
    setSelectedFacility(null);
    bridge.current?.emit('ui:open_scene', { scene });
  }

  const utcTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  const utcDate = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <main className="game-viewport hub-screen" aria-label={GAME_TITLE}>
      <Suspense fallback={<div className="hub-world-loading" role="status">Открываем кампус…</div>}><WorldCanvas avatar={user?.avatar} /></Suspense>

      <header className="hub-topbar" aria-label="Состояние станции">
        <button type="button" className="hub-profile-button" onClick={() => setActiveModal('profile')} aria-haspopup="dialog" aria-label={user ? `Профиль: ${user.displayName}` : 'Профиль наблюдателя и вход'}>
          <span className="hub-profile-button__portrait">
            {user ? <AvatarPreview avatar={user.avatar} context="campus" size={40} /> : <HubIcon name="observer" size={40} />}
          </span>
          <span className="hub-profile-button__copy"><strong>{user?.displayName ?? 'Наблюдатель'}</strong><small>{user ? user.groupId : 'Войти в учебную группу'}</small></span>
          <span className="hub-profile-button__chevron" aria-hidden="true">⌄</span>
        </button>

        <div className="hub-station-title"><strong>{GAME_MARK}</strong><span>{GAME_CALLSIGN}</span></div>
        <div className="hub-learning-status"><PixelIcon name="kn01" size={32} alt="" /><span><strong>Учебная смена</strong><small>Практика КН-01</small></span></div>
        <button type="button" className="hub-clock" onClick={() => setActiveModal('journal')} aria-label={`Учебный журнал, ${utcTime} UTC`} aria-haspopup="dialog"><strong>{utcTime} <span>UTC</span></strong><small>{utcDate}</small></button>
        <div className="hub-topbar__actions">
          <button type="button" className="hub-icon-button" aria-label="Учебный журнал" aria-haspopup="dialog" title="Учебный журнал" onClick={() => setActiveModal('journal')}><PixelIcon name="telegram" size={32} alt="" /></button>
          <button type="button" className="hub-icon-button" aria-label="Настройки" aria-haspopup="dialog" title="Настройки" onClick={() => setActiveModal('settings')}><HubIcon name="settings" size={36} /></button>
        </div>
      </header>

      <div className="hub-scene-caption" aria-live="polite">
        <span className="hub-scene-caption__pip" aria-hidden="true" />
        <span>{!sceneReady ? 'Подготовка кампуса' : currentScene === 'archive' ? 'Читальный зал архива' : environmentLabel ? `26063 · ${environmentLabel}` : 'Учебный кампус · 26063'}</span>
      </div>

      <StationNavDock
        onStartShift={onStartShift}
        onOpenModal={setActiveModal}
        onOpenArchive={() => openScene(currentScene === 'archive' ? 'hub' : 'archive')}
        onOpenProfile={() => user ? onOpenAvatar() : setActiveModal('profile')}
        currentScene={currentScene}
        sceneReady={sceneReady}
      />

      {selectedFacility && facilities[selectedFacility] && (
        <HubDialog
          title={facilities[selectedFacility].title}
          subtitle={facilities[selectedFacility].action ? 'Открыто для посещения' : 'Следующий этап разработки'}
          icon={facilities[selectedFacility].icon}
          onClose={() => setSelectedFacility(null)}
          footer={facilities[selectedFacility].action === 'shift'
            ? <button type="button" className="hub-action hub-action--primary" onClick={() => closeThen(onStartShift)}>Начать смену</button>
            : facilities[selectedFacility].action === 'archive'
              ? <button type="button" className="hub-action hub-action--primary" onClick={() => openScene('archive')}>Войти в архив</button>
              : <button type="button" className="hub-action" onClick={() => setSelectedFacility(null)}>Вернуться на площадь</button>}
        >
          <p className="hub-dialog__lead">{facilities[selectedFacility].description}</p>
        </HubDialog>
      )}

      {activeModal === 'guide' && (
        <HubDialog title="Управление кампусом" subtitle="Всё необходимое для первого дежурства" icon="guide" onClose={() => setActiveModal(null)} footer={<button type="button" className="hub-action hub-action--primary" onClick={() => closeThen(onStartShift)}>Начать смену</button>}>
          <p className="hub-dialog__lead">Выберите «Начать смену», войдите в учебную группу и примите дежурство. В заданиях ответ проверяет сервер, после ответа появляется разбор.</p>
          <dl className="hub-keys">
            <div><dt><kbd>Tab</kbd><span> / </span><kbd>Shift</kbd> + <kbd>Tab</kbd></dt><dd>Перейти к следующему или предыдущему элементу управления.</dd></div>
            <div><dt><kbd>Enter</kbd><span> / </span><kbd>Пробел</kbd></dt><dd>Нажать выбранную кнопку или открыть выбранную локацию.</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Закрыть окно и вернуться к элементу, который его открыл.</dd></div>
          </dl>
          <p>Архив можно посетить из нижней панели. Кнопка «На площадь» вернёт вас в кампус. В настройках доступны звук, уменьшенное движение и экономия ресурсов.</p>
        </HubDialog>
      )}

      {activeModal === 'route' && (
        <HubDialog title="Маршрут по кампусу" subtitle="Доступные занятия и следующие этапы" icon="cartography" onClose={() => setActiveModal(null)}>
          <div className="hub-route-list">
            <button type="button" className="hub-route-card" onClick={() => closeThen(onStartShift)}><PixelIcon name="kn01" size={40} alt="" /><span><strong>Дежурная смена КН-01</strong><small>Учебные задания с проверкой и разбором</small></span><b>Начать ›</b></button>
            <button type="button" className="hub-route-card" disabled={!sceneReady} onClick={() => openScene('archive')}><PixelIcon name="archive" size={40} alt="" /><span><strong>Архив наблюдений</strong><small>Посетить открытый читальный зал</small></span><b>Войти ›</b></button>
            {plannedLocations.map((location) => <div className="hub-route-card hub-route-card--planned" key={location.title}><PixelIcon name={location.icon} size={40} alt="" /><span><strong>{location.title}</strong><small>{location.description}</small></span><b>В разработке</b></div>)}
          </div>
          <p className="hub-note">Этот список показывает доступность текущей версии. Рейтинг, дуэли и автоматическое открытие следующих модулей ещё не подключены.</p>
        </HubDialog>
      )}

      {activeModal === 'journal' && (
        <HubDialog title="Учебный журнал" subtitle="Ритм дежурства и памятка перед работой" icon="telegram" onClose={() => setActiveModal(null)} footer={<button type="button" className="hub-action hub-action--primary" onClick={() => closeThen(onStartShift)}>К приёму смены</button>}>
          <SynopticDutyTicker />
          <p>Ответы и объяснения текущего дежурства доступны в тетради наставника на рабочем месте: «Спросить Ольхина» → «Разбор смены».</p>
          <p className="hub-note">Постоянный журнал завершённых дежурств пока не подключён. Здесь нет фактической метеосводки или оперативного предупреждения.</p>
        </HubDialog>
      )}

      {activeModal === 'settings' && (
        <HubDialog title="Настройки рабочего места" subtitle="Изменения применяются сразу" icon="settings" onClose={() => setActiveModal(null)} footer={<><span className="hub-settings-save" role="status">{preferencesSaved === null ? 'Параметры сохраняются автоматически' : preferencesSaved ? 'Сохранено на этом устройстве' : 'Применено. Браузер не разрешил сохранение.'}</span><button type="button" className="hub-action hub-action--primary" onClick={() => setActiveModal(null)}>Готово</button></>}>
          <div className="hub-settings-list">
            <div><PixelSwitch checked={preferences.soundEnabled} onChange={(value) => changePreference('soundEnabled', value)} label="Звук" /><p>Звуковое сопровождение и сигналы интерфейса. По умолчанию выключены.</p></div>
            <div><PixelSwitch checked={preferences.reducedMotion} disabled={systemReducedMotion} onChange={(value) => changePreference('reducedMotion', value)} label="Уменьшенное движение" /><p>{systemReducedMotion ? 'Включено в настройках системы. Кампус учитывает этот режим автоматически.' : 'Спокойная сцена без необязательной анимации. Системная настройка также учитывается.'}</p></div>
            <div><PixelSwitch checked={preferences.lowPower} onChange={(value) => changePreference('lowPower', value)} label="Экономия ресурсов" /><p>Упрощённые фоновые эффекты для слабого ноутбука. Задания и кнопки остаются доступными.</p></div>
          </div>
        </HubDialog>
      )}

      {activeModal === 'profile' && (
        <HubDialog title={user ? user.displayName : 'Режим наблюдателя'} subtitle={user ? `Учебная группа: ${user.groupId}` : 'Кампус открыт для знакомства'} icon={user ? 'student' : 'observer'} onClose={() => setActiveModal(null)}>
          {user ? <div className="hub-profile-actions">
            <button type="button" className="hub-action hub-action--primary" onClick={() => closeThen(onOpenAvatar)}>Персонаж и инвентарь</button>
            <button type="button" className="hub-action" onClick={() => closeThen(onOpenSetCode)}>{user.codeSet ? 'Сменить код входа' : 'Задать код входа'}</button>
            {user.roles.includes('admin') && <button type="button" className="hub-action" onClick={() => closeThen(onOpenAdmin)}>Управление группами</button>}
            <button type="button" className="hub-action" onClick={() => closeThen(onLogout)}>Выйти из профиля</button>
          </div> : <>
            <p className="hub-dialog__lead">Для учебных заданий и сохранения персонажа войдите в профиль, который выдал преподаватель.</p>
            <button type="button" className="hub-action hub-action--primary" onClick={() => closeThen(onLoginClick)}>Войти в учебную группу</button>
            <p className="hub-note">Доступ выдаётся через список учебной группы. Самостоятельная регистрация не требуется.</p>
          </>}
        </HubDialog>
      )}
    </main>
  );
}
