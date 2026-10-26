import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, type AdminUser, type RosterUser, type SessionUser, type UserRole } from '../../api';

export function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => void }) {
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
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось получить список'));
  }, [groupId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      onLogin(await api.login(userId, code));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось войти');
    }
  }

  return (
    <main className="app-shell identity-shell">
      <section className="panel login-panel" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">☁</div>
        <span className="prototype-kicker">Закрытый список пользователей</span>
        <h1 id="login-title">Вход в центр</h1>
        <p className="muted">Выберите группу и свой профиль. Публичной регистрации в системе нет.</p>

        <form className="form-stack" onSubmit={submit}>
          <label>
            Группа
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={loading || groups.length === 0}>
              {groups.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
          <label>
            Пользователь
            <select value={userId} onChange={(e) => setUserId(e.target.value)} disabled={users.length === 0}>
              {users.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}
            </select>
          </label>
          <label>
            Персональный код
            <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="current-password" type="password" inputMode="numeric" maxLength={12} />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          {groups.length === 0 && !loading && !error && (
            <div className="form-note">Список пуст. Первого администратора создайте через bootstrap-переменную сервера.</div>
          )}
          <button className="primary-button" type="submit" disabled={!userId || !code}>Войти</button>
        </form>
      </section>
    </main>
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
            <label>Начальный код<input type="password" value={initialCode} onChange={(e) => setInitialCode(e.target.value)} maxLength={12} /></label>
            <button className="primary-button" disabled={!displayName || !groupId || !initialCode}>Создать</button>
            <p className="muted tiny">Код используется только при создании и не хранится в открытом виде.</p>
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
            <h2>Новый код</h2>
            <p>Пользователь: <strong>{resetTarget.displayName}</strong></p>
            <input autoFocus type="password" value={resetCode} onChange={(e) => setResetCode(e.target.value)} maxLength={12} />
            <div className="row-actions">
              <button type="button" className="ghost-button" onClick={() => setResetTarget(null)}>Отмена</button>
              <button className="primary-button" disabled={!resetCode}>Сохранить</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
