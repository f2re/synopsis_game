import { lazy, Suspense, useEffect, useState } from 'react';
import { api, getSessionToken, setSessionToken, type SessionUser } from './api';
import { GAME_CALLSIGN, GAME_MARK, GAME_TITLE } from './brand';
import { AvatarEditor } from './features/avatar/AvatarEditor';
import { AvatarPreview } from './features/avatar/AvatarPreview';
import { AdminLoginScreen, AdminScreen, LoginScreen, SetCodeModal } from './features/identity/IdentityScreens';
import { PixelIcon, PixelCard, PixelProgressBar, StationNavDock } from './features/ui';

const WorldCanvas = lazy(() => import('./game/WorldCanvas').then((module) => ({ default: module.WorldCanvas })));
const ShiftWorkspace = lazy(() => import('./features/shift/ShiftWorkspace').then((module) => ({ default: module.ShiftWorkspace })));

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
            <PixelCard variant="default" className="user-profile-badge-card">
              <div className="user-toolbar">
                <div className="user-avatar-frame">
                  <AvatarPreview avatar={user.avatar} size={32} />
                </div>
                <div className="user-toolbar-name">
                  <strong>{user.displayName}</strong>
                  <span>{user.groupId}</span>
                </div>
                <button
                  type="button"
                  className="ghost-button pixel-hud-btn"
                  onClick={() => navigate('/profile/avatar')}
                  title="Настроить форму и внешность персонажа"
                >
                  <PixelIcon name="student" size="sm" />
                  <span>Персонаж</span>
                </button>
                <button
                  type="button"
                  className="ghost-button pixel-hud-btn"
                  onClick={onOpenSetCode}
                  title="Изменить персональный код доступа"
                >
                  <PixelIcon name="gear" size="sm" />
                  <span>{user.codeSet ? 'Сменить код' : 'Задать код'}</span>
                </button>
                {user.roles.includes('admin') && (
                  <button
                    type="button"
                    className="ghost-button pixel-hud-btn"
                    onClick={() => navigate('/admin')}
                    title="Открыть панель администратора"
                  >
                    <PixelIcon name="trophy-gold" size="sm" />
                    <span>Администратор</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ghost-button pixel-hud-btn pixel-hud-btn-logout"
                  onClick={onLogout}
                  title="Завершить сеанс и выйти со станции"
                >
                  <PixelIcon name="logout" size="sm" />
                  <span>Выйти</span>
                </button>
              </div>
            </PixelCard>
          </aside>
        ) : (
          <aside className="game-user-overlay" aria-label="Статус наблюдателя">
            <PixelCard variant="default" className="user-observer-badge-card">
              <div className="observer-badge-inner">
                <PixelIcon name="observer" size="md" className="observer-icon" />
                <div className="game-user-brand">
                  <span className="prototype-kicker">{GAME_MARK} · {GAME_CALLSIGN}</span>
                  <span className="observer-chip">👁 Режим наблюдателя</span>
                </div>
                <button type="button" className="primary-button pixel-hud-login-btn" onClick={onLoginClick}>
                  <PixelIcon name="student" size="sm" />
                  <span>Войти</span>
                </button>
              </div>
            </PixelCard>
          </aside>
        )
      )}

      {/* Навигационная консоль станции внизу экрана */}
      <StationNavDock onStartShift={() => navigate('/shift')} activeRoute="/" />
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
