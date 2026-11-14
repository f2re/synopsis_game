import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, cancelPendingLogin, getSessionToken, setSessionToken, type SessionUser } from './api';
import { GAME_MARK, GAME_TITLE } from './brand';
import { AdminLoginScreen, AdminScreen, LoginScreen, SetCodeModal } from './features/identity/IdentityScreens';
import { PixelIcon, PixelCard } from './features/ui';
import { PixelScrollArea } from './features/ui/PixelScrollArea';
import { HubModalLayer } from './features/hub/HubModalLayer';
import { HubDialog } from './features/hub/HubDialog';
import { useStationPresence } from './features/hub/useStationPresence';
import { WorldLoadBoundary } from './features/hub/WorldLoadBoundary';
import { ExitScreen } from './features/title/ExitScreen';
import { HelpScreen } from './features/help/HelpScreen';
import { ReadingRoomScreen } from './features/library/ReadingRoomScreen';
import { Settings } from './features/settings/Settings';
import { AtmosphereProvider } from './features/atmosphere/AtmosphereProvider';
import { SCREEN_TITLES, safeReturnPath, screenSurface } from './appNavigation';

const HubScreen = lazy(() => import('./features/hub/HubScreen').then((module) => ({ default: module.HubScreen })));
const AvatarEditor = lazy(() => import('./features/avatar/AvatarEditor').then((module) => ({ default: module.AvatarEditor })));
const LibraryScreen = lazy(() => import('./features/library/LibraryScreen').then((module) => ({ default: module.LibraryScreen })));
const Codebook = lazy(() => import('./features/codebook/Codebook').then((module) => ({ default: module.Codebook })));
const BlitzWorkspace = lazy(() => import('./features/shift/BlitzWorkspace').then((module) => ({ default: module.BlitzWorkspace })));
const SeamlessShiftFlow = lazy(() => import('./features/shift/SeamlessShiftFlow').then((module) => ({ default: module.SeamlessShiftFlow })));

function currentLocation(): string { return window.location.pathname + window.location.search; }
function navigate(path: string, replace = false): void {
  const state = { inApp: !replace, returnTo: safeReturnPath(currentLocation()) };
  if (replace) window.history.replaceState(state, '', path);
  else window.history.pushState(state, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
function returnFromPage(): void {
  if (window.history.state?.inApp && safeReturnPath(window.history.state.returnTo) !== currentLocation()) window.history.back();
  else navigate('/');
}

function LoadingScreen({ text = 'Загрузка…' }: { text?: string }) {
  return <main className="app-shell app-loading" aria-live="polite" aria-busy="true"><section className="panel compact-panel"><PixelIcon name="kn01" size="lg" alt="" /><h1>{text}</h1><span className="app-loading__signal" aria-hidden="true"><i /><i /><i /></span></section></main>;
}

/** Commit alongside a resolved route, so a lazy screen receives focus after loading. */
function RouteHeadingFocus() {
  useLayoutEffect(() => {
    // Set route focus before the first paint; no delayed callback may steal a user's input.
    const heading = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, []);
  return null;
}

function ArenaTvPlaceholder() {
  return <main className="station-page" aria-labelledby="arena-title"><PixelCard variant="dialog" style={{ maxWidth: 540, margin: '40px auto', textAlign: 'center' }}><span>{GAME_MARK} · режим большого экрана</span><h1 id="arena-title">Большой экран</h1><p>Трансляция матчей готовится к запуску. Открытые занятия доступны на станции.</p><button type="button" className="station-back" onClick={() => navigate('/')}>← На станцию</button></PixelCard></main>;
}

export function App() {
  const [location, setLocation] = useState(currentLocation);
  const path = location.split('?')[0];
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [sessionNotice, setSessionNotice] = useState('');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [setCodeModalOpen, setSetCodeModalOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<'/shift' | '/blitz' | null>(null);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exitNotice, setExitNotice] = useState('');
  const exitInFlight = useRef(false);
  const bootAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const onPopState = () => {
      cancelPendingLogin();
      setLocation(currentLocation());
      setLoginModalOpen(false);
      setSetCodeModalOpen(false);
      setPendingDestination(null);
      if (!exitInFlight.current) setExitDialogOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = `${SCREEN_TITLES[path] ?? 'Страница не найдена'} · ${GAME_TITLE}`;
  }, [path]);

  useEffect(() => {
    if (window.location.pathname === '/arena-tv') { setBooting(false); return; }
    const token = getSessionToken();
    if (!token) { setBooting(false); return; }
    let disposed = false;
    const abort = new AbortController();
    bootAbort.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 8_000);
    api.me(abort.signal)
      .then((profile) => { if (!disposed && getSessionToken() === token) setUser(profile); })
      .catch((error: unknown) => {
        if (disposed || getSessionToken() !== token) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) setSessionToken(null);
        else setSessionNotice('Связь с сервером пока недоступна. Библиотека, помощь и настройки открыты.');
      })
      .finally(() => { window.clearTimeout(timer); if (!disposed) setBooting(false); });
    return () => { disposed = true; abort.abort(); window.clearTimeout(timer); bootAbort.current = null; };
  }, []);

  function startShift() {
    if (booting) return;
    if (user) navigate('/shift');
    else { setPendingDestination('/shift'); setLoginModalOpen(true); }
  }
  function startBlitz() {
    if (booting) return;
    if (user) navigate('/blitz');
    else { setPendingDestination('/blitz'); setLoginModalOpen(true); }
  }
  function closeLogin() { cancelPendingLogin(); setLoginModalOpen(false); setPendingDestination(null); }
  function finishLogin(profile: SessionUser) {
    setUser(profile); setSessionNotice(''); setLoginModalOpen(false);
    if (pendingDestination) navigate(pendingDestination);
    setPendingDestination(null);
  }
  function requestExit() { setExitDialogOpen(true); }
  async function finishExit() {
    if (exitInFlight.current) return;
    exitInFlight.current = true;
    cancelPendingLogin();
    setExiting(true); setExitNotice(''); bootAbort.current?.abort();
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 8_000);
    try {
      if (getSessionToken()) await api.logout(abort.signal);
    } catch {
      setExitNotice('Вход в этом браузере закрыт. Сервер не подтвердил завершение сеанса: связь была недоступна.');
    } finally {
      window.clearTimeout(timer);
      setUser(null); setSessionNotice(''); setBooting(false);
      setLoginModalOpen(false); setSetCodeModalOpen(false); setPendingDestination(null); setExitDialogOpen(false);
      setExiting(false); exitInFlight.current = false;
      navigate('/exit', true);
    }
  }

  const activeSessionToken = getSessionToken();
  const stationPresence = useStationPresence(user && !user.roles.includes('display') && path !== '/arena-tv' && path !== '/admin' && path !== '/exit' && !exiting ? activeSessionToken : null);
  function acceptUpdatedProfile(profile: SessionUser) {
    if (activeSessionToken && getSessionToken() === activeSessionToken) {
      setUser((current) => current?.id === profile.id ? profile : current);
    }
  }

  let screen: ReactNode;
  if (path === '/arena-tv') screen = <ArenaTvPlaceholder />;
  else if (path === '/library') screen = <LibraryScreen onBack={returnFromPage} initialQuery={new URLSearchParams(location.split('?')[1] ?? '').get('q') ?? ''} />;
  else if (path === '/archive') screen = <ReadingRoomScreen onBack={() => navigate('/')} onOpenLibrary={() => navigate('/library')} onOpenHelp={() => navigate('/help')} onOpenSettings={() => navigate('/settings')} />;
  else if (path === '/codebook') screen = <Codebook isOpen onClose={returnFromPage} />;
  else if (path === '/help') screen = <HelpScreen onBack={returnFromPage} onOpenLibrary={() => navigate('/library')} onOpenSettings={() => navigate('/settings')} onOpenCampus={() => navigate('/')} onStartShift={startShift} />;
  else if (path === '/settings') screen = <Settings onClose={returnFromPage} />;
  else if (path === '/exit') {
    screen = getSessionToken()
      ? <main className="station-page station-exit"><section className="station-exit__card"><h1>Завершить сеанс?</h1><p>После выхода профиль будет закрыт на этом устройстве.</p><button type="button" className="station-menu-button station-menu-button--primary" onClick={requestExit}>Выйти из игры</button><button type="button" className="station-text-button" onClick={() => navigate('/')}>На станцию</button></section></main>
      : <ExitScreen onReturn={() => navigate('/')} notice={exitNotice} />;
  } else if (path === '/admin') {
    screen = booting ? <LoadingScreen text="Проверяем сессию…" /> : user?.roles.includes('admin')
      ? <AdminScreen currentUser={user} onBack={() => navigate('/')} />
      : <AdminLoginScreen currentUser={user} onLogin={(adminUser) => { setUser(adminUser); navigate('/admin', true); }} onBack={() => navigate('/')} />;
  } else if (path === '/profile/avatar' || path === '/shift' || path === '/blitz') {
    screen = booting ? <LoadingScreen text="Проверяем сессию…" /> : !user
      ? <LoginScreen onLogin={(profile) => { setUser(profile); setSessionNotice(''); }} onClose={() => navigate('/')} />
      : path === '/profile/avatar'
        ? <AvatarEditor key={user.id} user={user} onSaved={acceptUpdatedProfile} onBack={() => navigate('/')} initialSection={new URLSearchParams(window.location.search).get('section') === 'badges' ? 'badges' : 'inventory'} />
        : path === '/blitz'
          ? <BlitzWorkspace key={user.id} user={user} onExit={() => navigate('/')} onStartPractice={() => navigate('/shift')} />
          : <SeamlessShiftFlow key={user.id} onExit={() => navigate('/')} onEquipment={() => navigate('/profile/avatar?section=badges')} />;
  } else if (path === '/' || path === '/campus') screen = <HubScreen
    user={user} onLoginClick={() => setLoginModalOpen(true)} onLogout={requestExit}
    onOpenSetCode={() => setSetCodeModalOpen(true)} onStartShift={startShift} onStartBlitz={startBlitz}
    onOpenAvatar={() => navigate('/profile/avatar')} onOpenAdmin={() => navigate('/admin')}
    onOpenLibrary={() => navigate('/library')} onVisitArchive={() => navigate('/archive')}
    onOpenHelp={() => navigate('/help')} onOpenSettings={() => navigate('/settings')} onExit={requestExit}
    externalModalOpen={loginModalOpen || setCodeModalOpen || exitDialogOpen}
    sessionPending={booting} sessionNotice={sessionNotice} stationPresence={stationPresence}
  />;
  else screen = <main className="station-page station-exit"><section className="station-exit__card"><h1>Такой страницы пока нет</h1><p>Вернитесь на станцию: там доступны занятия, библиотека и помощь.</p><button type="button" className="station-back" onClick={() => navigate('/', true)}>На станцию</button></section></main>;

  const focusKey = ['/shift', '/blitz', '/profile/avatar', '/admin'].includes(path) ? `${path}:${booting}:${user?.id ?? 'guest'}` : path;
  const stationWorld = path === '/' || path === '/campus';
  const routeContent = <><RouteHeadingFocus key={focusKey} />{screen}</>;
  return <AtmosphereProvider surface={exiting ? 'silent' : screenSurface(path)}>
    <WorldLoadBoundary key={path} fallback={<main className="app-shell app-loading"><section className="panel compact-panel" role="alert"><h1>Не удалось открыть экран</h1><p>Проверьте соединение и перезагрузите страницу.</p><div className="hub-profile-actions"><button type="button" className="hub-action hub-action--primary" onClick={() => window.location.reload()}>Перезагрузить страницу</button><button type="button" className="hub-action" onClick={() => navigate('/help')}>Открыть помощь</button></div></section></main>}>
      <Suspense fallback={<LoadingScreen text="Открываем станцию…" />}>{stationWorld || path === '/codebook' ? routeContent : <PixelScrollArea key={focusKey} label={SCREEN_TITLES[path] ?? 'Страница'} className="app-page-scroll" viewportClassName="app-page-viewport">{routeContent}</PixelScrollArea>}</Suspense>
    </WorldLoadBoundary>
    {loginModalOpen && <HubModalLayer label="Вход в учебную группу" onClose={closeLogin}><LoginScreen onLogin={finishLogin} onClose={closeLogin} isModal /></HubModalLayer>}
    {setCodeModalOpen && user && <HubModalLayer label="Персональный код входа" onClose={() => setSetCodeModalOpen(false)}><SetCodeModal user={user} onSuccess={acceptUpdatedProfile} onClose={() => setSetCodeModalOpen(false)} /></HubModalLayer>}
    {exitDialogOpen && <HubDialog title="Завершить сеанс?" subtitle={user ? `Наблюдатель: ${user.displayName}` : 'Выход со станции'} icon="exit" onClose={() => { if (!exiting) setExitDialogOpen(false); }} footer={<div className="station-confirm-actions"><button type="button" className="hub-action" onClick={() => setExitDialogOpen(false)} disabled={exiting}>Остаться</button><button type="button" className="hub-action hub-action--primary" onClick={() => void finishExit()} disabled={exiting}>{exiting ? 'Завершаем сеанс…' : 'Выйти из игры'}</button></div>}>
      <p className="station-confirm-copy">{user ? 'Вы выйдете из профиля. Результаты и сохранённый персонаж останутся в вашей учётной записи.' : 'Музыка, фоновые звуки и игровая сцена остановятся.'}</p><p className="station-confirm-copy">Вернуться можно в любое время. Настройки этого браузера и закладки библиотеки сохранятся.</p>
    </HubDialog>}
  </AtmosphereProvider>;
}
