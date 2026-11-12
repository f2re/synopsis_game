import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, cancelPendingLogin, getSessionToken, setSessionToken, type SessionUser } from './api';
import { GAME_MARK, GAME_TITLE } from './brand';
import { AdminLoginScreen, AdminScreen, LoginScreen, SetCodeModal } from './features/identity/IdentityScreens';
import { PixelIcon, PixelCard, PixelProgressBar } from './features/ui';
import { HubModalLayer } from './features/hub/HubModalLayer';
import { HubDialog } from './features/hub/HubDialog';
import { TitleScreen } from './features/title/TitleScreen';
import { ExitScreen } from './features/title/ExitScreen';
import { HelpScreen } from './features/help/HelpScreen';
import { Settings } from './features/settings/Settings';
import { AtmosphereProvider } from './features/atmosphere/AtmosphereProvider';
import { SCREEN_TITLES, safeReturnPath, screenSurface } from './appNavigation';

const HubScreen = lazy(() => import('./features/hub/HubScreen').then((module) => ({ default: module.HubScreen })));
const AvatarEditor = lazy(() => import('./features/avatar/AvatarEditor').then((module) => ({ default: module.AvatarEditor })));
const LibraryScreen = lazy(() => import('./features/library/LibraryScreen').then((module) => ({ default: module.LibraryScreen })));
const Codebook = lazy(() => import('./features/codebook/Codebook').then((module) => ({ default: module.Codebook })));
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
  return <main className="app-shell" aria-live="polite"><section className="panel compact-panel" style={{ textAlign: 'center' }}><PixelIcon name="kn01" size="lg" alt="" /><p>{text}</p><PixelProgressBar value={65} max={100} size="sm" variant="teal" /></section></main>;
}

/** Commit alongside a resolved route, so a lazy screen receives focus after loading. */
function RouteHeadingFocus() {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return null;
}

function ArenaTvPlaceholder() {
  return <main className="station-page" aria-labelledby="arena-title"><PixelCard variant="dialog" style={{ maxWidth: 540, margin: '40px auto', textAlign: 'center' }}><span>{GAME_MARK} · режим большого экрана</span><h1 id="arena-title">Большой экран</h1><p>Автоматическая трансляция матчей появится в следующем этапе. Этот экран не получает список наблюдателей и данные профилей.</p><button type="button" className="station-back" onClick={() => navigate('/')}>← Главное меню</button></PixelCard></main>;
}

export function App() {
  const [location, setLocation] = useState(currentLocation);
  const path = location.split('?')[0];
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [sessionNotice, setSessionNotice] = useState('');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [setCodeModalOpen, setSetCodeModalOpen] = useState(false);
  const [pendingShift, setPendingShift] = useState(false);
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
      setPendingShift(false);
      if (!exitInFlight.current) setExitDialogOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = `${SCREEN_TITLES[path] ?? 'Страница не найдена'} · ${GAME_TITLE}`;
    window.scrollTo(0, 0);
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
    if (user) navigate('/shift');
    else { setPendingShift(true); setLoginModalOpen(true); }
  }
  function closeLogin() { cancelPendingLogin(); setLoginModalOpen(false); setPendingShift(false); }
  function finishLogin(profile: SessionUser) {
    setUser(profile); setSessionNotice(''); setLoginModalOpen(false);
    if (pendingShift) navigate('/shift');
    setPendingShift(false);
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
      setLoginModalOpen(false); setSetCodeModalOpen(false); setPendingShift(false); setExitDialogOpen(false);
      setExiting(false); exitInFlight.current = false;
      navigate('/exit', true);
    }
  }

  const activeSessionToken = getSessionToken();
  function acceptUpdatedProfile(profile: SessionUser) {
    if (activeSessionToken && getSessionToken() === activeSessionToken) {
      setUser((current) => current?.id === profile.id ? profile : current);
    }
  }

  let screen: ReactNode;
  if (path === '/arena-tv') screen = <ArenaTvPlaceholder />;
  else if (path === '/') screen = <TitleScreen user={user} onOpenCampus={() => navigate('/campus')} onStartShift={startShift} onOpenLogin={() => setLoginModalOpen(true)} onOpenLibrary={() => navigate('/library')} onOpenHelp={() => navigate('/help')} onOpenSettings={() => navigate('/settings')} onExit={requestExit} sessionPending={booting} sessionNotice={sessionNotice} />;
  else if (path === '/library') screen = <LibraryScreen onBack={returnFromPage} initialQuery={new URLSearchParams(location.split('?')[1] ?? '').get('q') ?? ''} onOpenCodebook={() => navigate('/codebook')} />;
  else if (path === '/codebook') screen = <Codebook isOpen onClose={returnFromPage} />;
  else if (path === '/help') screen = <HelpScreen onBack={returnFromPage} onOpenLibrary={() => navigate('/library')} onOpenSettings={() => navigate('/settings')} onOpenCampus={() => navigate('/campus')} onStartShift={startShift} />;
  else if (path === '/settings') screen = <Settings onClose={returnFromPage} />;
  else if (path === '/exit') {
    screen = getSessionToken()
      ? <main className="station-page station-exit"><section className="station-exit__card"><h1>Завершить сеанс?</h1><p>После выхода профиль будет закрыт на этом устройстве.</p><button type="button" className="station-menu-button station-menu-button--primary" onClick={requestExit}>Выйти из игры</button><button type="button" className="station-text-button" onClick={() => navigate('/')}>Главное меню</button></section></main>
      : <ExitScreen onReturn={() => navigate('/')} notice={exitNotice} />;
  } else if (path === '/admin') {
    screen = booting ? <LoadingScreen text="Проверяем сессию…" /> : user?.roles.includes('admin')
      ? <AdminScreen currentUser={user} onBack={() => navigate('/campus')} />
      : <AdminLoginScreen currentUser={user} onLogin={(adminUser) => { setUser(adminUser); navigate('/admin', true); }} onBack={() => navigate('/')} />;
  } else if (path === '/profile/avatar' || path === '/shift') {
    screen = booting ? <LoadingScreen text="Проверяем сессию…" /> : !user
      ? <LoginScreen onLogin={(profile) => { setUser(profile); setSessionNotice(''); }} onClose={() => navigate('/')} />
      : path === '/profile/avatar'
        ? <AvatarEditor user={user} onSaved={acceptUpdatedProfile} onBack={() => navigate('/campus')} initialSection={new URLSearchParams(window.location.search).get('section') === 'badges' ? 'badges' : 'inventory'} />
        : <SeamlessShiftFlow avatar={user.avatar} onExit={() => navigate('/campus')} onEquipment={() => navigate('/profile/avatar?section=badges')} />;
  } else if (path === '/campus') screen = <HubScreen
    user={user} onLoginClick={() => setLoginModalOpen(true)} onLogout={requestExit}
    onOpenSetCode={() => setSetCodeModalOpen(true)} onStartShift={startShift}
    onOpenAvatar={() => navigate('/profile/avatar')} onOpenAdmin={() => navigate('/admin')}
    onOpenHome={() => navigate('/')} onOpenLibrary={() => navigate('/library')}
    onOpenHelp={() => navigate('/help')} onOpenSettings={() => navigate('/settings')} onExit={requestExit}
    externalModalOpen={loginModalOpen || setCodeModalOpen || exitDialogOpen}
  />;
  else screen = <main className="station-page station-exit"><section className="station-exit__card"><h1>Такой страницы пока нет</h1><p>Вернитесь в главное меню: оттуда доступны кампус, библиотека и помощь.</p><button type="button" className="station-back" onClick={() => navigate('/', true)}>Главное меню</button></section></main>;

  const focusKey = ['/shift', '/profile/avatar', '/admin'].includes(path) ? `${path}:${booting}:${user?.id ?? 'guest'}` : path;
  return <AtmosphereProvider surface={exiting ? 'silent' : screenSurface(path)}>
    <Suspense fallback={<LoadingScreen text="Открываем комнату…" />}><RouteHeadingFocus key={focusKey} />{screen}</Suspense>
    {loginModalOpen && <HubModalLayer label="Вход в учебную группу" onClose={closeLogin}><LoginScreen onLogin={finishLogin} onClose={closeLogin} isModal /></HubModalLayer>}
    {setCodeModalOpen && user && <HubModalLayer label="Персональный код входа" onClose={() => setSetCodeModalOpen(false)}><SetCodeModal user={user} onSuccess={acceptUpdatedProfile} onClose={() => setSetCodeModalOpen(false)} /></HubModalLayer>}
    {exitDialogOpen && <HubDialog title="Завершить сеанс?" subtitle={user ? `Наблюдатель: ${user.displayName}` : 'Выход со станции'} icon="exit" onClose={() => { if (!exiting) setExitDialogOpen(false); }} footer={<div className="station-confirm-actions"><button type="button" className="hub-action" onClick={() => setExitDialogOpen(false)} disabled={exiting}>Остаться</button><button type="button" className="hub-action hub-action--primary" onClick={() => void finishExit()} disabled={exiting}>{exiting ? 'Завершаем сеанс…' : 'Выйти из игры'}</button></div>}>
      <p className="station-confirm-copy">{user ? 'Вы выйдете из профиля. Принятые сервером результаты и сохранённый внешний вид останутся в вашей учётной записи.' : 'Музыка, фоновые звуки и игровая сцена остановятся.'}</p><p className="station-confirm-copy">Вернуться можно в любое время. Настройки этого браузера и закладки библиотеки сохранятся.</p>
    </HubDialog>}
  </AtmosphereProvider>;
}
