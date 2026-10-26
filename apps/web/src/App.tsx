import { useEffect, useState } from 'react';
import { api, getSessionToken, setSessionToken, type SessionUser } from './api';
import { GAME_MARK, GAME_TITLE } from './brand';
import { AvatarEditor } from './features/avatar/AvatarEditor';
import { AvatarPreview } from './features/avatar/AvatarPreview';
import { AdminScreen, LoginScreen } from './features/identity/IdentityScreens';
import { WorldCanvas } from './game/WorldCanvas';

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function ArenaTvPlaceholder() {
  return (
    <main className="arena-tv-placeholder" aria-labelledby="arena-title">
      <section>
        <span>{GAME_MARK} · режим большого экрана</span>
        <h1 id="arena-title">Arena TV</h1>
        <p>Публичный экран не получает список пользователей, коды входа или административные данные.</p>
      </section>
    </main>
  );
}

function Home({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);

  useEffect(() => {
    const toggleSessionMenu = () => setSessionMenuOpen((open) => !open);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSessionMenuOpen(false);
    };

    window.addEventListener('hub:session-menu', toggleSessionMenu);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('hub:session-menu', toggleSessionMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <main className="game-viewport" aria-label={GAME_TITLE}>
      <WorldCanvas />
      {sessionMenuOpen && (
        <aside className="game-user-overlay game-session-menu" aria-label="Профиль пользователя">
          <div className="user-toolbar">
            <AvatarPreview avatar={user.avatar} size={32} />
            <div className="user-toolbar-name">
              <strong>{user.displayName}</strong>
              <span>{user.groupId}</span>
            </div>
            <button className="ghost-button" onClick={() => navigate('/profile/avatar')}>Персонаж</button>
            {user.roles.includes('admin') && <button className="ghost-button" onClick={() => navigate('/admin')}>Администратор</button>}
            <button className="ghost-button" onClick={onLogout}>Выйти</button>
          </div>
        </aside>
      )}
    </main>
  );
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);

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

  if (booting) {
    return <main className="app-shell"><section className="panel compact-panel"><p>Проверяем сессию…</p></section></main>;
  }

  if (!user) {
    return <LoginScreen onLogin={(loggedIn) => { setUser(loggedIn); navigate('/'); }} />;
  }

  async function logout() {
    await api.logout();
    setUser(null);
    navigate('/');
  }

  if (path === '/admin') {
    return <AdminScreen currentUser={user} onBack={() => navigate('/')} />;
  }

  if (path === '/profile/avatar') {
    return <AvatarEditor user={user} onSaved={setUser} onBack={() => navigate('/')} />;
  }

  return <Home user={user} onLogout={() => void logout()} />;
}
