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
          <img src="/ui/ui_station_crest_badge_v2.png" alt="" className="brand-mark-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
      <div className="ui-compass-divider" aria-hidden="true" />
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
        <div className="brand-mark" aria-hidden="true">
          <img src="/ui/icons/instrument_radar.png" alt="" className="brand-mark-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <span className="brand-mark-fallback">⚙</span>
        </div>
        <span className="prototype-kicker">26063 · Служебный раздел</span>
        <h1 id="admin-login-title">Вход администратора</h1>
        <div className="ui-compass-divider" aria-hidden="true" />
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

export function AdminScreen({ currentUser, onBack }: { currentUser: SessionUser; onBack: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [customGroups, setCustomGroups] = useState<string[]>([]);

  // Создание новой группы
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Режим добавления: 'single' (по одному) или 'batch' (списком)
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single');

  // Добавление одного: только ФИО!
  const [singleName, setSingleName] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);

  // Импорт списком: только текст с ФИО
  const [batchText, setBatchText] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  // Поиск по ФИО
  const [searchQuery, setSearchQuery] = useState('');

  // Модальное окно смены кода администратора
  const [adminCodeModalOpen, setAdminCodeModalOpen] = useState(false);

  // Сброс кода пользователя
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);

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

  // Все пользователи кроме администратора
  const studentUsers = useMemo(() => users.filter((u) => !u.roles.includes('admin')), [users]);

  // Список всех учебных групп
  const groups = useMemo(() => {
    const list = [...new Set([...customGroups, ...studentUsers.map((u) => u.groupId)])];
    return list.sort((a, b) => a.localeCompare(b, 'ru'));
  }, [customGroups, studentUsers]);

  // Автоматический выбор первой группы
  useEffect(() => {
    if (!selectedGroup && groups.length > 0) {
      setSelectedGroup(groups[0]);
    } else if (selectedGroup && !groups.includes(selectedGroup) && groups.length > 0) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, selectedGroup]);

  // Пользователи текущей выбранной группы
  const currentGroupUsers = useMemo(() => {
    return studentUsers.filter((u) => u.groupId === selectedGroup);
  }, [studentUsers, selectedGroup]);

  // Фильтрация по поиску
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return currentGroupUsers;
    const q = searchQuery.toLowerCase().trim();
    return currentGroupUsers.filter((u) => u.displayName.toLowerCase().includes(q));
  }, [currentGroupUsers, searchQuery]);

  // Распознанные строки для пакетного импорта
  const parsedBatchNames = useMemo(() => {
    return batchText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [batchText]);

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

  // Создать группу
  function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    if (!groups.includes(name)) {
      setCustomGroups((prev) => [...prev, name]);
    }
    setSelectedGroup(name);
    setNewGroupName('');
    setIsCreatingGroup(false);
  }

  // Добавить одного (только ФИО!)
  async function handleCreateSingle(event: FormEvent) {
    event.preventDefault();
    const name = singleName.trim();
    if (!name || !selectedGroup) return;
    setError('');
    setSuccess('');
    setSingleLoading(true);
    try {
      await api.createUser({ displayName: name, groupId: selectedGroup });
      setSingleName('');
      setSuccess(`«${name}» успешно добавлен в группу ${selectedGroup}`);
      setTimeout(() => setSuccess(''), 3000);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось добавить пользователя');
    } finally {
      setSingleLoading(false);
    }
  }

  // Загрузка текстового файла для импорта
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setBatchText((prev) => (prev ? `${prev}\n${text}` : text));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // Пакетный импорт (только ФИО!)
  async function handleBatchImport(event: FormEvent) {
    event.preventDefault();
    if (!selectedGroup) return;
    if (parsedBatchNames.length === 0) {
      setError('Список пуст. Введите хотя бы одно ФИО.');
      return;
    }
    setError('');
    setSuccess('');
    setBatchLoading(true);
    try {
      const result = await api.batchCreateUsers({
        groupId: selectedGroup,
        users: parsedBatchNames.map((displayName) => ({ displayName })),
      });
      setBatchText('');
      setSuccess(`Успешно добавлено ${result.count} чел. в группу «${selectedGroup}»`);
      setTimeout(() => setSuccess(''), 4000);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ошибка при импорте');
    } finally {
      setBatchLoading(false);
    }
  }

  // Переключение активности
  async function toggleStatus(user: AdminUser) {
    try {
      await api.setUserStatus(user.id, user.status === 'active' ? 'disabled' : 'active');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось изменить статус');
    }
  }

  // Сброс кода на вход без кода
  async function handleResetCode(user: AdminUser) {
    try {
      await api.resetCode(user.id);
      setResetTarget(null);
      setSuccess(`Код для «${user.displayName}» сброшен. При следующем входе код не потребуется.`);
      setTimeout(() => setSuccess(''), 3500);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сбросить код');
    }
  }

  return (
    <main className="app-shell admin-shell">
      <section className="panel admin-panel" aria-labelledby="admin-title">
        <header className="screen-header">
          <div>
            <span className="prototype-kicker">26063 · Панель управления</span>
            <h1 id="admin-title">Учебные группы и доступ</h1>
            <p className="muted tiny">Создавайте группы, добавляйте учащихся по ФИО и управляйте доступом.</p>
          </div>
          <div className="row-actions">
            <button className="ghost-button" onClick={() => setAdminCodeModalOpen(true)}>
              ⚙ Сменить код администратора
            </button>
            <button className="secondary-button" onClick={onBack}>
              ← В кампус
            </button>
          </div>
        </header>

        {error && <div className="form-error" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
        {success && <div className="form-success" role="status" style={{ marginBottom: 14 }}>{success}</div>}

        <div className="admin-groups-layout">
          {/* Левая панель: Список групп */}
          <aside className="admin-groups-sidebar">
            <div className="sidebar-header">
              <h2>Группы ({groups.length})</h2>
              {!isCreatingGroup && (
                <button
                  className="primary-button"
                  style={{ minHeight: 32, padding: '4px 10px', fontSize: '0.84rem' }}
                  onClick={() => setIsCreatingGroup(true)}
                >
                  + Группа
                </button>
              )}
            </div>

            {isCreatingGroup && (
              <form className="new-group-inline" onSubmit={handleCreateGroup}>
                <label className="tiny" style={{ color: 'var(--ui-text-primary)' }}>
                  Название группы
                  <input
                    autoFocus
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Например: С-21"
                    maxLength={32}
                  />
                </label>
                <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
                  <button className="primary-button" type="submit" disabled={!newGroupName.trim()}>
                    Создать
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => { setIsCreatingGroup(false); setNewGroupName(''); }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            <div className="group-list" role="tablist" aria-label="Список учебных групп">
              {groups.length === 0 && (
                <div className="muted tiny" style={{ padding: '12px 6px', textAlign: 'center' }}>
                  Групп пока нет. Нажмите «+ Группа», чтобы создать первую.
                </div>
              )}
              {groups.map((group) => {
                const count = studentUsers.filter((u) => u.groupId === group).length;
                const isActive = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`group-nav-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <span>{group}</span>
                    <span className="group-pill-count">{count} чел.</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Правая панель: Содержимое выбранной группы */}
          <section className="admin-group-content">
            {selectedGroup ? (
              <>
                {/* Шапка группы */}
                <div className="group-content-banner">
                  <div>
                    <h2>Группа «{selectedGroup}»</h2>
                    <span className="muted tiny">
                      Всего в группе: {currentGroupUsers.length} чел.
                    </span>
                  </div>
                  <div className="admin-tabs" style={{ margin: 0 }}>
                    <button
                      type="button"
                      className={`admin-tab ${addMode === 'single' ? 'is-active' : ''}`}
                      onClick={() => setAddMode('single')}
                    >
                      + Добавить одного
                    </button>
                    <button
                      type="button"
                      className={`admin-tab ${addMode === 'batch' ? 'is-active' : ''}`}
                      onClick={() => setAddMode('batch')}
                    >
                      📋 Импорт списком
                    </button>
                  </div>
                </div>

                {/* Форма добавления (только ФИО!) */}
                <div className="group-add-box">
                  {addMode === 'single' ? (
                    <form onSubmit={handleCreateSingle}>
                      <div className="quick-add-row">
                        <input
                          value={singleName}
                          onChange={(e) => setSingleName(e.target.value)}
                          placeholder="Введите ФИО (например: Иванов Иван Иванович)"
                          maxLength={80}
                          disabled={singleLoading}
                        />
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={!singleName.trim() || singleLoading}
                        >
                          {singleLoading ? 'Добавление…' : '+ Добавить'}
                        </button>
                      </div>
                      <div className="muted tiny" style={{ marginTop: 8 }}>
                        При первом входе учащийся сможет войти без кода и задать свой.
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleBatchImport} style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="tiny muted">
                          Вставьте список ФИО — по одной записи на строку:
                        </span>
                        <label className="ghost-button" style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.8rem' }}>
                          📎 Загрузить файл (.txt / .csv)
                          <input type="file" accept=".txt,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                      <textarea
                        className="import-textarea"
                        value={batchText}
                        onChange={(e) => setBatchText(e.target.value)}
                        placeholder={`Иванов Иван Иванович\nПетрова Анна Сергеевна\nСидоров Алексей Дмитриевич`}
                        rows={5}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <span className="tiny" style={{ color: 'var(--ui-text-secondary)' }}>
                          Распознано записей: <strong>{parsedBatchNames.length}</strong>
                        </span>
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={parsedBatchNames.length === 0 || batchLoading}
                        >
                          {batchLoading ? 'Импорт…' : `Добавить ${parsedBatchNames.length > 0 ? `(${parsedBatchNames.length} чел.)` : ''} в группу «${selectedGroup}»`}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Поиск и список пользователей */}
                <div>
                  {currentGroupUsers.length >= 3 && (
                    <div className="search-input-box" style={{ marginBottom: 12 }}>
                      <span className="search-icon" aria-hidden="true">🔍</span>
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по ФИО в этой группе…"
                        maxLength={60}
                      />
                    </div>
                  )}

                  <div className="student-list" aria-label={`Список группы ${selectedGroup}`}>
                    {filteredUsers.length === 0 && (
                      <div className="empty-state">
                        {currentGroupUsers.length === 0 ? (
                          <>
                            <strong>В группе «{selectedGroup}» пока никого нет</strong>
                            <p>Введите ФИО выше или переключитесь на «Импорт списком».</p>
                          </>
                        ) : (
                          <>
                            <strong>По запросу «{searchQuery}» никто не найден</strong>
                            <p>Проверьте правильность написания ФИО.</p>
                          </>
                        )}
                      </div>
                    )}

                    {filteredUsers.map((user, index) => (
                      <article
                        key={user.id}
                        className={`student-card ${user.status === 'disabled' ? 'is-disabled' : ''}`}
                      >
                        <div className="student-info">
                          <span className="student-index">#{index + 1}</span>
                          <span className="student-name">{user.displayName}</span>
                          <span className={`status-chip ${user.status}`}>
                            {user.status === 'active' ? 'Активен' : 'Отключён'}
                          </span>
                          <span className={`code-chip ${user.codeSet ? 'code-set' : 'code-not-set'}`}>
                            {user.codeSet ? 'Код задан' : 'Первый вход без кода'}
                          </span>
                        </div>
                        <div className="row-actions">
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() => setResetTarget(user)}
                            title="Сбросить код, чтобы учащийся снова мог войти без кода"
                          >
                            Сбросить код
                          </button>
                          <button
                            className={user.status === 'active' ? 'danger-button' : 'secondary-button'}
                            type="button"
                            onClick={() => void toggleStatus(user)}
                          >
                            {user.status === 'active' ? 'Отключить' : 'Включить'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <h2>Выберите или создайте группу</h2>
                <p>Используйте меню слева для выбора существующей группы или нажмите «+ Группа».</p>
              </div>
            )}
          </section>
        </div>
      </section>

      {/* Модальное окно подтверждения сброса кода */}
      {resetTarget && (
        <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setResetTarget(null); }}>
          <section className="panel reset-modal form-stack" role="dialog" aria-labelledby="reset-modal-title">
            <h2 id="reset-modal-title">Сброс кода доступа</h2>
            <p className="tiny muted">
              Пользователь: <strong>{resetTarget.displayName}</strong> (группа {resetTarget.groupId})
            </p>
            <div className="form-note">
              После сброса учащийся сможет войти в систему <strong>без ввода кода</strong> и заново установить персональный код при входе или в профиле.
            </div>
            <div className="row-actions" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleResetCode(resetTarget)}
              >
                Подтвердить сброс
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setResetTarget(null)}
              >
                Отмена
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Модальное окно смены кода администратора */}
      {adminCodeModalOpen && (
        <SetCodeModal
          user={currentUser}
          onSuccess={() => {
            setSuccess('Код администратора успешно обновлён');
            setTimeout(() => setSuccess(''), 3000);
          }}
          onClose={() => setAdminCodeModalOpen(false)}
        />
      )}
    </main>
  );
}
