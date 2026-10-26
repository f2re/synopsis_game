import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, type AdminUser, type RosterUser, type SessionUser, type UserRole } from '../../api';

export function LoginScreen({
  onLogin,
  onClose,
  isModal = false,
}: {
  onLogin: (user: SessionUser) => void;
  onClose?: () => void;
  isModal?: boolean;
}) {
  const [groups, setGroups] = useState<string[]>([]);
  const [groupId, setGroupId] = useState('');
  const [users, setUsers] = useState<RosterUser[]>([]);
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.groups()
      .then((items) => {
        setGroups(items);
        if (items[0]) setGroupId(items[0]);
      })
      .catch(() => setError('Сервер недоступен. Запустите apps/server.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!groupId) {
      setUsers([]);
      setUserId('');
      return;
    }
    api.roster(groupId)
      .then((items) => {
        setUsers(items);
        setUserId(items[0]?.id ?? '');
        setCode('');
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось получить список'));
  }, [groupId]);

  const selectedUser = users.find((u) => u.id === userId);
  const isFirstTime = selectedUser ? selectedUser.hasCode === false : false;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      onLogin(await api.login(userId, code));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось войти');
    }
  }

  const content = (
    <section className="panel login-panel" aria-labelledby="login-title">
      <div className="login-header-row">
        <div className="brand-mark" aria-hidden="true">
          <img src="/ui/ui_station_crest_badge_v1.png" alt="" className="brand-mark-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <span className="brand-mark-fallback">☁</span>
        </div>
        {onClose && (
          <button type="button" className="ghost-button login-close-button" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        )}
      </div>
      <span className="prototype-kicker">26063 · Вход пользователя</span>
      <h1 id="login-title">Вход в систему</h1>
      <p className="muted">Выберите свою учебную группу и свой профиль для входа в кампус.</p>

      <form className="form-stack" onSubmit={submit}>
        <label>
          Группа
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={loading || groups.length === 0}>
            {groups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </label>
        <label>
          Пользователь
          <select value={userId} onChange={(e) => { setUserId(e.target.value); setCode(''); }} disabled={users.length === 0}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}
          </select>
        </label>

        {isFirstTime ? (
          <div className="login-first-time-box">
            <div className="form-note">
              <strong>Первый вход:</strong> код не требуется. Вы можете войти сразу или задать свой персональный код сейчас.
            </div>
            <label>
              Задать персональный код (необязательно)
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="new-password"
                type="password"
                inputMode="numeric"
                maxLength={12}
                placeholder="Придумайте код или оставьте пустым"
              />
            </label>
          </div>
        ) : (
          <label>
            Персональный код
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="current-password"
              type="password"
              inputMode="numeric"
              maxLength={12}
              placeholder="Введите код, который задали ранее"
            />
          </label>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}
        {groups.length === 0 && !loading && !error && (
          <div className="form-note">
            Список учебных групп пока пуст. Ожидайте добавления преподавателем.
          </div>
        )}

        <div className="login-actions-row">
          <button
            className="primary-button"
            type="submit"
            disabled={!userId || (!isFirstTime && !code)}
          >
            Войти
          </button>
          {onClose && (
            <button className="ghost-button" type="button" onClick={onClose}>
              Продолжить как наблюдатель
            </button>
          )}
        </div>
      </form>
    </section>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop login-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
        {content}
      </div>
    );
  }

  return <main className="app-shell identity-shell">{content}</main>;
}

export function AdminLoginScreen({
  currentUser,
  onLogin,
  onBack,
}: {
  currentUser: SessionUser | null;
  onLogin: (user: SessionUser) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.adminLogin(code);
      onLogin(user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Неверный код администратора');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell identity-shell">
      <section className="panel login-panel" aria-labelledby="admin-login-title">
        <div className="brand-mark" aria-hidden="true">⚙</div>
        <span className="prototype-kicker">26063 · Служебный раздел</span>
        <h1 id="admin-login-title">Вход администратора</h1>
        <p className="muted">Управление учебными группами, пользователями и кодами доступа.</p>

        {currentUser && !currentUser.roles.includes('admin') && (
          <div className="form-note" style={{ marginBottom: 16 }}>
            Вы вошли как <strong>{currentUser.displayName}</strong> ({currentUser.groupId}).
            Для доступа к панели управления войдите под учётной записью администратора.
          </div>
        )}

        <form className="form-stack" onSubmit={submit}>
          <label>
            Код администратора
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="current-password"
              type="password"
              maxLength={24}
              placeholder="Введите код доступа"
              autoFocus
            />
          </label>

          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="login-actions-row">
            <button className="primary-button" type="submit" disabled={!code || loading}>
              {loading ? 'Проверка…' : 'Войти в панель'}
            </button>
            <button className="ghost-button" type="button" onClick={onBack}>
              ← На главную
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export function SetCodeModal({
  user,
  onSuccess,
  onClose,
}: {
  user: SessionUser;
  onSuccess: (updatedUser: SessionUser) => void;
  onClose: () => void;
}) {
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasCode = Boolean(user.codeSet);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (newCode !== confirmCode) {
      setError('Новые коды не совпадают');
      return;
    }
    setLoading(true);
    try {
      const updated = await api.setCode(newCode, hasCode ? currentCode : undefined);
      onSuccess(updated);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось установить код');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="panel compact-panel" aria-labelledby="set-code-title">
        <h2 id="set-code-title">{hasCode ? 'Смена персонального кода' : 'Установка персонального кода'}</h2>
        <p className="muted tiny">
          {hasCode
            ? 'Введите текущий код и задайте новый код для входа в систему.'
            : 'Задайте персональный код для защиты вашего профиля при последующих входах.'}
        </p>
        <form className="form-stack" onSubmit={submit} style={{ marginTop: 14 }}>
          {hasCode && (
            <label>
              Текущий код
              <input
                type="password"
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                required
              />
            </label>
          )}
          <label>
            Новый персональный код
            <input
              type="password"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              required
              minLength={2}
              maxLength={12}
              placeholder="От 2 до 12 символов"
            />
          </label>
          <label>
            Повторите новый код
            <input
              type="password"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              required
              minLength={2}
              maxLength={12}
            />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="row-actions" style={{ marginTop: 8 }}>
            <button className="primary-button" type="submit" disabled={loading || !newCode || !confirmCode}>
              {loading ? 'Сохранение…' : 'Сохранить код'}
            </button>
            <button className="ghost-button" type="button" onClick={onClose} disabled={loading}>
              Отмена
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Студент',
  instructor: 'Преподаватель',
  content_author: 'Автор содержания',
  method_reviewer: 'Методический проверяющий',
  display: 'Большой экран',
  admin: 'Администратор',
};

export function AdminScreen({ currentUser, onBack }: { currentUser: SessionUser; onBack: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [initialCode, setInitialCode] = useState('');
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetCode, setResetCode] = useState('');

  const isAdmin = currentUser.roles.includes('admin');

  async function refresh() {
    try {
      setUsers(await api.adminUsers());
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить пользователей');
    }
  }

  useEffect(() => {
    if (isAdmin) void refresh();
  }, [isAdmin]);

  const groups = useMemo(() => [...new Set(users.map((user) => user.groupId))].sort(), [users]);

  if (!isAdmin) {
    return (
      <main className="app-shell">
        <section className="panel compact-panel">
          <h1>Доступ запрещён</h1>
          <p>Эта страница доступна только администратору.</p>
          <button className="secondary-button" onClick={onBack}>Вернуться</button>
        </section>
      </main>
    );
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api.createUser({ displayName, groupId, roles: [role], initialCode });
      setDisplayName('');
      setInitialCode('');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось создать пользователя');
    }
  }

  async function toggle(user: AdminUser) {
    try {
      await api.setUserStatus(user.id, user.status === 'active' ? 'disabled' : 'active');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось изменить статус');
    }
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault();
    if (!resetTarget) return;
    try {
      await api.resetCode(resetTarget.id, resetCode);
      setResetTarget(null);
      setResetCode('');
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сбросить код');
    }
  }

  return (
    <main className="app-shell admin-shell">
      <section className="panel admin-panel" aria-labelledby="admin-title">
        <header className="screen-header">
          <div>
            <span className="prototype-kicker">Управление доступом</span>
            <h1 id="admin-title">Пользователи</h1>
          </div>
          <button className="secondary-button" onClick={onBack}>В центр</button>
        </header>

        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="admin-grid">
          <form className="admin-create form-stack" onSubmit={create}>
            <h2>Создать пользователя</h2>
            <label>Имя<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} /></label>
            <label>
              Группа
              <input value={groupId} onChange={(e) => setGroupId(e.target.value)} list="known-groups" maxLength={64} />
              <datalist id="known-groups">{groups.map((group) => <option key={group} value={group} />)}</datalist>
            </label>
            <label>
              Роль
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
              </select>
            </label>
            <label>Начальный код (необязательно)<input type="password" value={initialCode} onChange={(e) => setInitialCode(e.target.value)} maxLength={12} placeholder="Оставьте пустым для входа без кода" /></label>
            <button className="primary-button" disabled={!displayName || !groupId}>Создать</button>
            <p className="muted tiny">Если начальный код не задан, при первом входе пользователь сможет войти без кода и задать свой.</p>
          </form>

          <div className="user-list" aria-label="Список пользователей">
            {users.map((user) => (
              <article className={`user-row ${user.status === 'disabled' ? 'is-disabled' : ''}`} key={user.id}>
                <div>
                  <strong>{user.displayName}</strong>
                  <div className="user-meta">{user.groupId} · {user.roles.map((item) => ROLE_LABELS[item]).join(', ')}</div>
                  <span className={`status-chip ${user.status}`}>{user.status === 'active' ? 'Активен' : 'Отключён'}</span>
                </div>
                <div className="row-actions">
                  <button className="ghost-button" onClick={() => setResetTarget(user)}>Сбросить код</button>
                  <button className={user.status === 'active' ? 'danger-button' : 'secondary-button'} onClick={() => void toggle(user)}>
                    {user.status === 'active' ? 'Отключить' : 'Включить'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {resetTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setResetTarget(null)}>
          <form className="panel reset-modal form-stack" onSubmit={submitReset} onMouseDown={(e) => e.stopPropagation()}>
            <h2>Сброс персонального кода</h2>
            <p>Пользователь: <strong>{resetTarget.displayName}</strong></p>
            <label>
              Новый код (оставьте пустым для сброса на вход без кода)
              <input autoFocus type="password" value={resetCode} onChange={(e) => setResetCode(e.target.value)} maxLength={12} placeholder="Оставьте пустым для первого входа без кода" />
            </label>
            <div className="row-actions">
              <button type="button" className="ghost-button" onClick={() => setResetTarget(null)}>Отмена</button>
              <button className="primary-button">{resetCode ? 'Установить код' : 'Сбросить (вход без кода)'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
