import { lazy, Suspense, useEffect, useState } from 'react';
import { api, getSessionToken, setSessionToken, type SessionUser } from './api';
import { GAME_MARK } from './brand';
import { AdminLoginScreen, AdminScreen, LoginScreen, SetCodeModal } from './features/identity/IdentityScreens';
import { PixelIcon, PixelCard, PixelProgressBar } from './features/ui';
import { HubScreen } from './features/hub/HubScreen';
import { HubModalLayer } from './features/hub/HubModalLayer';

const SeamlessShiftFlow = lazy(() => import('./features/shift/SeamlessShiftFlow').then((module) => ({ default: module.SeamlessShiftFlow })));
const BlitzWorkspace = lazy(() => import('./features/shift/BlitzWorkspace').then((module) => ({ default: module.BlitzWorkspace })));
const AvatarEditor = lazy(() => import('./features/avatar/AvatarEditor').then((module) => ({ default: module.AvatarEditor })));

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function LoadingScreen({ text = 'Загрузка…' }: { text?: string }) {
  return (
    <main className="app-shell">
      <section className="panel compact-panel" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <PixelIcon name="kn01" size="lg" />
        <p style={{ margin: 0, fontFamily: 'var(--font-pixel-ui)' }}>{text}</p>
        <div style={{ width: '100%', maxWidth: 220, marginTop: 4 }}>
          <PixelProgressBar value={65} max={100} size="sm" variant="teal" />
        </div>
      </section>
    </main>
  );
}

function ArenaTvPlaceholder() {
  return (
    <main className="arena-tv-placeholder" aria-labelledby="arena-title">
      <PixelCard variant="dialog" cornerBrackets style={{ maxWidth: 540, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <PixelIcon name="chart" size="lg" />
          <span style={{ fontSize: 13, color: '#9bb7bb' }}>{GAME_MARK} · режим большого экрана</span>
          <h1 id="arena-title" style={{ margin: '4px 0 0', fontFamily: 'var(--font-pixel-display)' }}>Arena TV</h1>
          <p style={{ margin: '8px 0 16px', color: 'var(--ui-text-secondary)', fontSize: 14, lineHeight: 1.45 }}>
            Публичный экран не получает список пользователей, коды входа или административные данные.
          </p>
          <button type="button" className="pixel-btn-secondary" onClick={() => navigate('/')}>
            ← На главную
          </button>
        </div>
      </PixelCard>
    </main>
  );
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [setCodeModalOpen, setSetCodeModalOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<'/shift' | '/blitz' | null>(null);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (path === '/arena-tv') {
      setBooting(false);
      return;
    }
    if (!getSessionToken()) {
      setBooting(false);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => setSessionToken(null))
      .finally(() => setBooting(false));
  }, []);

  if (path === '/arena-tv') return <ArenaTvPlaceholder />;

  if (booting) return <LoadingScreen text="Проверяем сессию…" />;

  async function logout() {
    try {
      await api.logout();
    } catch {
      // api.logout always removes the local token, including network failures.
    }
    setUser(null);
    navigate('/');
  }

  if (path === '/admin') {
    if (user?.roles.includes('admin')) {
      return <AdminScreen currentUser={user} onBack={() => navigate('/')} />;
    }
    return (
      <AdminLoginScreen
        currentUser={user}
        onLogin={(adminUser) => {
          setUser(adminUser);
          navigate('/admin');
        }}
        onBack={() => navigate('/')}
      />
    );
  }

  if (path === '/profile/avatar') {
    if (user) {
      return <Suspense fallback={<LoadingScreen text="Открываем гардероб…" />}><AvatarEditor key={user.id} user={user} onSaved={(updated) => setUser((current) => current?.id === updated.id ? updated : current)} onBack={() => navigate('/')} initialSection={new URLSearchParams(window.location.search).get('section') === 'badges' ? 'badges' : 'inventory'} /></Suspense>;
    }
    navigate('/');
    return null;
  }

  if (path === '/shift') {
    return <Suspense fallback={<LoadingScreen text="Открываем рабочее место…" />}><SeamlessShiftFlow key={user?.id ?? 'guest'} onExit={() => navigate('/')} onEquipment={() => navigate('/profile/avatar?section=badges')} /></Suspense>;
  }

  if (path === '/blitz') {
    if (!user) return <LoginScreen onLogin={(loggedIn) => setUser(loggedIn)} onClose={() => navigate('/')} />;
    return <Suspense fallback={<LoadingScreen text="Открываем блиц-практику…" />}><BlitzWorkspace key={user.id} user={user} onExit={() => navigate('/')} onStartPractice={() => navigate('/shift')} /></Suspense>;
  }

  function startShift() {
    if (user) navigate('/shift');
    else {
      setPendingDestination('/shift');
      setLoginModalOpen(true);
    }
  }

  function startBlitz() {
    if (user) navigate('/blitz');
    else {
      setPendingDestination('/blitz');
      setLoginModalOpen(true);
    }
  }

  return (
    <>
      <HubScreen
        user={user}
        onLoginClick={() => setLoginModalOpen(true)}
        onLogout={() => void logout()}
        onOpenSetCode={() => setSetCodeModalOpen(true)}
        onStartShift={startShift}
        onStartBlitz={startBlitz}
        onOpenAvatar={() => navigate('/profile/avatar')}
        onOpenAdmin={() => navigate('/admin')}
        externalModalOpen={loginModalOpen || setCodeModalOpen}
      />
      {loginModalOpen && (
        <HubModalLayer label="Вход в учебную группу" onClose={() => { setLoginModalOpen(false); setPendingDestination(null); }}>
        <LoginScreen
          onLogin={(loggedIn) => {
            setUser(loggedIn);
            setLoginModalOpen(false);
            if (pendingDestination) navigate(pendingDestination);
            setPendingDestination(null);
          }}
          onClose={() => { setLoginModalOpen(false); setPendingDestination(null); }}
          isModal
        />
        </HubModalLayer>
      )}
      {setCodeModalOpen && user && (
        <HubModalLayer label="Персональный код входа" onClose={() => setSetCodeModalOpen(false)}>
        <SetCodeModal
          user={user}
          onSuccess={setUser}
          onClose={() => setSetCodeModalOpen(false)}
        />
        </HubModalLayer>
      )}
    </>
  );
}
