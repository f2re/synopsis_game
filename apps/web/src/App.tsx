import { lazy, Suspense, useEffect, useState } from 'react';
import { api, getSessionToken, setSessionToken, type SessionUser } from './api';
import { GAME_CALLSIGN, GAME_MARK, GAME_TITLE } from './brand';
import { AvatarEditor } from './features/avatar/AvatarEditor';
import { AvatarPreview } from './features/avatar/AvatarPreview';
import { AdminLoginScreen, AdminScreen, LoginScreen, SetCodeModal } from './features/identity/IdentityScreens';

const WorldCanvas = lazy(() => import('./game/WorldCanvas').then((module) => ({ default: module.WorldCanvas })));
const ShiftWorkspace = lazy(() => import('./features/shift/ShiftWorkspace').then((module) => ({ default: module.ShiftWorkspace })));

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function LoadingScreen({ text = 'Загрузка…' }: { text?: string }) {
  return (
    <main className="app-shell">
      <section className="panel compact-panel" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <img src="/ui/ui_station_crest_badge_v2.png" alt="26063" className="overlay-crest" style={{ width: 48, height: 48 }} />
        <p>{text}</p>
      </section>
    </main>
  );
}

function ArenaTvPlaceholder() {
  return (
    <main className="arena-tv-placeholder" aria-labelledby="arena-title">
      <section>
        <img src="/ui/ui_station_crest_badge_v2.png" alt="26063" className="overlay-crest" style={{ width: 64, height: 64, marginBottom: 12 }} />
        <span>{GAME_MARK} · режим большого экрана</span>
        <h1 id="arena-title">Arena TV</h1>
        <p style={{ marginTop: 12 }}>Публичный экран не получает список пользователей, коды входа или административные данные.</p>
        <button className="secondary-button" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          ← На главную
        </button>
      </section>
    </main>
  );
}

function Home({
  user,
  onLoginClick,
  onLogout,
  onOpenSetCode,
}: {
  user: SessionUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenSetCode: () => void;
}) {
  const [sessionMenuOpen, setSessionMenuOpen] = useState(true);

  useEffect(() => {
    const toggleSessionMenu = () => setSessionMenuOpen((open) => !open);
    const startShift = () => navigate('/shift');
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSessionMenuOpen(false);
    };

    window.addEventListener('hub:session-menu', toggleSessionMenu);
    window.addEventListener('hub:start-shift', startShift);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('hub:session-menu', toggleSessionMenu);
      window.removeEventListener('hub:start-shift', startShift);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <main className="game-viewport" aria-label={GAME_TITLE}>
      <Suspense fallback={null}><WorldCanvas /></Suspense>
      {sessionMenuOpen && (
        user ? (
          <aside className="game-user-overlay game-session-menu" aria-label="Профиль пользователя">
            <div className="user-toolbar">
              <AvatarPreview avatar={user.avatar} size={32} />
              <div className="user-toolbar-name">
                <strong>{user.displayName}</strong>
                <span>{user.groupId}</span>
              </div>
              <button className="ghost-button" onClick={() => navigate('/profile/avatar')}>Персонаж</button>
              <button className="ghost-button" onClick={onOpenSetCode}>
                {user.codeSet ? 'Сменить код' : 'Задать код'}
              </button>
              {user.roles.includes('admin') && (
                <button className="ghost-button" onClick={() => navigate('/admin')}>Администратор</button>
              )}
              <button className="ghost-button" onClick={onLogout}>Выйти</button>
            </div>
          </aside>
        ) : (
          <aside className="game-user-overlay" aria-label="Статус наблюдателя">
            <img src="/ui/ui_station_crest_badge_v2.png" alt="26063" className="overlay-crest" />
            <div className="game-user-brand">
              <span className="prototype-kicker">{GAME_MARK} · {GAME_CALLSIGN}</span>
              <span className="observer-chip">👁 Режим наблюдателя</span>
            </div>
            <button className="primary-button" onClick={onLoginClick}>Войти</button>
          </aside>
        )
      )}
    </main>
  );
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [setCodeModalOpen, setSetCodeModalOpen] = useState(false);

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
    await api.logout();
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
      return <AvatarEditor user={user} onSaved={setUser} onBack={() => navigate('/')} />;
    }
    navigate('/');
    return null;
  }

  if (path === '/shift') {
    return <Suspense fallback={<LoadingScreen text="Открываем рабочее место…" />}><ShiftWorkspace onExit={() => navigate('/')} /></Suspense>;
  }

  return (
    <>
      <Home
        user={user}
        onLoginClick={() => setLoginModalOpen(true)}
        onLogout={() => void logout()}
        onOpenSetCode={() => setSetCodeModalOpen(true)}
      />
      {loginModalOpen && (
        <LoginScreen
          onLogin={(loggedIn) => {
            setUser(loggedIn);
            setLoginModalOpen(false);
          }}
          onClose={() => setLoginModalOpen(false)}
          isModal
        />
      )}
      {setCodeModalOpen && user && (
        <SetCodeModal
          user={user}
          onSuccess={setUser}
          onClose={() => setSetCodeModalOpen(false)}
        />
      )}
    </>
  );
}
