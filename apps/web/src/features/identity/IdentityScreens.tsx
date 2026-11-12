import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, cancelPendingLogin, getSessionToken, type AdminUser, type RosterUser, type SessionUser, type UserRole } from '../../api';
import { PixelSwitch } from '../ui/PixelSwitch';
import { HubModalLayer } from '../hub/HubModalLayer';
import { PixelScrollArea } from '../ui/PixelScrollArea';

function highlightMatch(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="search-highlight">{text.slice(index, index + trimmed.length)}</mark>
      {text.slice(index + trimmed.length)}
    </>
  );
}

export function LoginScreen({
  onLogin,
  onClose,
  isModal = false,
}: {
  onLogin: (user: SessionUser) => void;
  onClose?: () => void;
  isModal?: boolean;
}) {
  const fieldId = useId();
  const [groups, setGroups] = useState<string[]>([]);
  const [groupId, setGroupId] = useState('');
  const [users, setUsers] = useState<RosterUser[]>([]);
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (submittingRef.current) cancelPendingLogin();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 8_000);
    setLoading(true); setLoadError(false); setError('');
    setGroups([]); setGroupId(''); setUsers([]); setUserId(''); setCode('');
    api.groups(abort.signal)
      .then((items) => {
        if (disposed) return;
        setGroups(items);
        if (items[0]) setGroupId(items[0]);
      })
      .catch(() => {
        if (disposed) return;
        setLoadError(true);
        setError('Не удалось загрузить учебные группы. Проверьте соединение и повторите загрузку.');
      })
      .finally(() => { window.clearTimeout(timeout); if (!disposed) setLoading(false); });
    return () => { disposed = true; window.clearTimeout(timeout); abort.abort(); };
  }, [reload]);

  useEffect(() => {
    setUsers([]); setUserId(''); setCode('');
    if (!groupId) {
      setRosterLoading(false);
      return;
    }
    let disposed = false;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 8_000);
    setRosterLoading(true); setLoadError(false); setError('');
    api.roster(groupId, abort.signal)
      .then((items) => {
        if (disposed) return;
        setUsers(items);
        setUserId(items[0]?.id ?? '');
      })
      .catch(() => {
        if (disposed) return;
        setLoadError(true);
        setError('Не удалось загрузить список группы. Проверьте соединение и повторите загрузку.');
      })
      .finally(() => { window.clearTimeout(timeout); if (!disposed) setRosterLoading(false); });
    return () => { disposed = true; window.clearTimeout(timeout); abort.abort(); };
  }, [groupId]);

  const selectedUser = users.find((u) => u.id === userId);
  const isFirstTime = selectedUser ? selectedUser.hasCode === false : false;
  const canSubmit = !loading && !rosterLoading && Boolean(selectedUser && selectedUser.groupId === groupId) && (isFirstTime || Boolean(code));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current || !canSubmit) return;
    submittingRef.current = true;
    setSubmitting(true); setError('');
    try {
      const profile = await api.login(userId, code);
      if (!mounted.current) return;
      submittingRef.current = false;
      onLogin(profile);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Не удалось войти');
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }

  const content = (
    <section className="panel login-panel" aria-labelledby="login-title">
      <div className="login-header-row">
        <div className="brand-mark" aria-hidden="true">
          <img src="/ui/ui_station_crest_badge_v2.png" alt="" width={56} height={64} className="brand-mark-img" onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.parentElement) e.currentTarget.parentElement.dataset.imageFailed = 'true'; }} />
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
      <p className="muted">Выберите свою учебную группу и имя, затем введите код входа.</p>

      <form className="form-stack" onSubmit={submit} aria-busy={loading || rosterLoading || submitting}>
        <div className="login-field">
          <label htmlFor={`${fieldId}-group`}>Группа</label>
          <select id={`${fieldId}-group`} value={groupId} onChange={(e) => { setUsers([]); setUserId(''); setCode(''); setRosterLoading(true); setGroupId(e.target.value); }} disabled={loading || submitting || groups.length === 0}>
            {groups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </div>
        <div className="login-field">
          <label htmlFor={`${fieldId}-user`}>Пользователь</label>
          <select id={`${fieldId}-user`} value={userId} onChange={(e) => { setUserId(e.target.value); setCode(''); setError(''); }} disabled={loading || rosterLoading || submitting || users.length === 0}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}
          </select>
        </div>

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
                disabled={loading || rosterLoading || submitting}
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
              disabled={loading || rosterLoading || submitting}
              placeholder="Введите код, который задали ранее"
            />
          </label>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}
        {loadError && <button type="button" className="secondary-button" onClick={() => setReload(value => value + 1)} disabled={loading || rosterLoading}>Повторить загрузку списка</button>}
        {(loading || rosterLoading) && <p className="form-note" role="status">{loading ? 'Открываем учебные группы…' : 'Открываем список группы…'}</p>}
        {!loading && !rosterLoading && groupId && users.length === 0 && !loadError && <p className="form-note" role="status">В этой группе пока нет доступных пользователей. Выберите другую группу или обратитесь к преподавателю.</p>}
        {groups.length === 0 && !loading && !error && (
          <div className="form-note">
            Список учебных групп пока пуст. Ожидайте добавления преподавателем.
          </div>
        )}

        <div className="login-actions-row">
          <button
            className="primary-button"
            type="submit"
            disabled={!canSubmit || submitting}
          >
            {submitting ? 'Входим…' : 'Войти'}
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
  const submittingRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (submittingRef.current) cancelPendingLogin();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current || !code) return;
    submittingRef.current = true;
    setError('');
    setLoading(true);
    try {
      const user = await api.adminLogin(code);
      if (!mounted.current) return;
      submittingRef.current = false;
      onLogin(user);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Неверный код администратора');
    } finally {
      submittingRef.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <main className="app-shell identity-shell">
      <section className="panel login-panel" aria-labelledby="admin-login-title">
        <div className="login-header-row">
          <div className="brand-mark" aria-hidden="true">
            <img src="/ui/ui_station_crest_badge_v2.png" alt="" width={56} height={64} className="brand-mark-img" onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.parentElement) e.currentTarget.parentElement.dataset.imageFailed = 'true'; }} />
            <span className="brand-mark-fallback">26063</span>
          </div>
          <button type="button" className="ghost-button login-close-button" onClick={onBack} aria-label="Назад" title="Вернуться на главную">
            ✕
          </button>
        </div>
        <span className="prototype-kicker">26063 · Служебный раздел</span>
        <h1 id="admin-login-title">Вход администратора</h1>
        <p className="muted">Управление учебными группами, пользователями и кодами доступа.</p>

        {currentUser && !currentUser.roles.includes('admin') && (
          <div className="form-note" style={{ marginBottom: 16 }}>
            Вы вошли как <strong>{currentUser.displayName}</strong> ({currentUser.groupId}).
            Для доступа к панели управления войдите под учётной записью администратора.
          </div>
        )}

        <form className="form-stack" onSubmit={submit} aria-busy={loading}>
          <label>
            Код администратора
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="current-password"
              type="password"
              maxLength={24}
              disabled={loading}
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
  const submittingRef = useRef(false);
  const mounted = useRef(true);
  const ownerId = useRef(user.id);
  ownerId.current = user.id;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const hasCode = Boolean(user.codeSet);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current || !newCode || !confirmCode || (hasCode && !currentCode)) return;
    setError('');
    if (newCode !== confirmCode) {
      setError('Новые коды не совпадают');
      return;
    }
    const requestOwner = user.id;
    const requestSession = getSessionToken();
    submittingRef.current = true;
    setLoading(true);
    try {
      const updated = await api.setCode(newCode, hasCode ? currentCode : undefined);
      if (!requestSession || getSessionToken() !== requestSession || ownerId.current !== requestOwner || updated.id !== requestOwner) return;
      // Closing the form does not undo a confirmed server update. Keep the
      // owning profile current, without letting an old form close a new one.
      onSuccess(updated);
      if (mounted.current) onClose();
    } catch (reason) {
      if (mounted.current && ownerId.current === requestOwner) setError(reason instanceof Error ? reason.message : 'Не удалось установить код');
    } finally {
      submittingRef.current = false;
      if (mounted.current && ownerId.current === requestOwner) setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="panel compact-panel" aria-labelledby="set-code-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <img
            src="/ui/ui_station_crest_badge_v2.png"
            alt="26063"
            className="overlay-crest"
            style={{ width: 32, height: 32, flexShrink: 0 }}
          />
          <h2 id="set-code-title" style={{ margin: 0 }}>{hasCode ? 'Смена персонального кода' : 'Установка персонального кода'}</h2>
        </div>
        <p className="muted tiny">
          {hasCode
            ? 'Введите текущий код и задайте новый код для входа в систему.'
            : 'Задайте персональный код для защиты вашего профиля при последующих входах.'}
        </p>
        <form className="form-stack" onSubmit={submit} style={{ marginTop: 14 }} aria-busy={loading}>
          {hasCode && (
            <label>
              Текущий код
              <input
                type="password"
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
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
              autoComplete="new-password"
              disabled={loading}
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
              autoComplete="new-password"
              disabled={loading}
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
            <button className="ghost-button" type="button" onClick={onClose}>
              {loading ? 'Закрыть окно' : 'Отмена'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function AdminScreen({ currentUser, onBack }: { currentUser: SessionUser; onBack: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
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
  const rosterSearch = useRef<HTMLInputElement>(null);
  const importFileInput = useRef<HTMLInputElement>(null);

  // Модальное окно смены кода администратора
  const [adminCodeModalOpen, setAdminCodeModalOpen] = useState(false);

  // Сброс кода пользователя
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const resetFlight = useRef(false);
  const resetTargetId = useRef<string | null>(null);
  resetTargetId.current = resetTarget?.id ?? null;
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const statusFlights = useRef(new Set<string>());
  const mounted = useRef(true);
  const refreshGeneration = useRef(0);
  const singleFlight = useRef(false);
  const batchFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; refreshGeneration.current += 1; };
  }, []);

  const isAdmin = currentUser.roles.includes('admin');

  async function refresh() {
    const generation = ++refreshGeneration.current;
    setUsersLoading(true);
    try {
      const result = await api.adminUsers();
      if (!mounted.current || generation !== refreshGeneration.current) return;
      setUsers(result);
      setError('');
    } catch (reason) {
      if (!mounted.current || generation !== refreshGeneration.current) return;
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить пользователей');
    } finally {
      if (mounted.current && generation === refreshGeneration.current) setUsersLoading(false);
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

  // Сводка по текущей группе
  const activeCount = useMemo(() => {
    return currentGroupUsers.filter((u) => u.status === 'active').length;
  }, [currentGroupUsers]);

  const codeSetCount = useMemo(() => {
    return currentGroupUsers.filter((u) => u.codeSet).length;
  }, [currentGroupUsers]);

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
    if (!name || !selectedGroup || singleFlight.current) return;
    singleFlight.current = true;
    setError('');
    setSuccess('');
    setSingleLoading(true);
    try {
      await api.createUser({ displayName: name, groupId: selectedGroup });
      if (!mounted.current) return;
      setSingleName('');
      setSuccess(`«${name}» успешно добавлен в группу ${selectedGroup}`);
      await refresh();
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Не удалось добавить пользователя');
    } finally {
      singleFlight.current = false;
      if (mounted.current) setSingleLoading(false);
    }
  }

  // Загрузка текстового файла для импорта
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (mounted.current && typeof text === 'string') {
        setBatchText((prev) => (prev ? `${prev}\n${text}` : text));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // Пакетный импорт (только ФИО!)
  async function handleBatchImport(event: FormEvent) {
    event.preventDefault();
    if (!selectedGroup || batchFlight.current) return;
    if (parsedBatchNames.length === 0) {
      setError('Список пуст. Введите хотя бы одно ФИО.');
      return;
    }
    batchFlight.current = true;
    setError('');
    setSuccess('');
    setBatchLoading(true);
    try {
      const result = await api.batchCreateUsers({
        groupId: selectedGroup,
        users: parsedBatchNames.map((displayName) => ({ displayName })),
      });
      if (!mounted.current) return;
      setBatchText('');
      setSuccess(`Успешно добавлено ${result.count} чел. в группу «${selectedGroup}»`);
      await refresh();
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Ошибка при импорте');
    } finally {
      batchFlight.current = false;
      if (mounted.current) setBatchLoading(false);
    }
  }

  // Переключение активности
  async function toggleStatus(user: AdminUser) {
    if (statusFlights.current.has(user.id)) return;
    statusFlights.current.add(user.id);
    setPendingUserIds([...statusFlights.current]);
    try {
      await api.setUserStatus(user.id, user.status === 'active' ? 'disabled' : 'active');
      if (mounted.current) await refresh();
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Не удалось изменить статус');
    } finally {
      statusFlights.current.delete(user.id);
      if (mounted.current) setPendingUserIds([...statusFlights.current]);
    }
  }

  // Сброс кода на вход без кода
  async function handleResetCode(user: AdminUser) {
    if (resetFlight.current) return;
    resetFlight.current = true;
    setResetting(true); setResetError('');
    try {
      await api.resetCode(user.id);
      if (!mounted.current) return;
      if (resetTargetId.current === user.id) setResetTarget(null);
      setSuccess(`Код для «${user.displayName}» сброшен. При следующем входе код не потребуется.`);
      await refresh();
    } catch (reason) {
      if (!mounted.current) return;
      const message = reason instanceof Error ? reason.message : 'Не удалось сбросить код';
      if (resetTargetId.current === user.id) setResetError(message);
      else setError(message);
    } finally {
      resetFlight.current = false;
      if (mounted.current) setResetting(false);
    }
  }

  return (
    <main className="app-shell admin-shell">
      <section className="panel admin-panel" aria-labelledby="admin-title">
        <header className="screen-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/ui/ui_station_crest_badge_v2.png"
              alt="26063"
              className="overlay-crest"
              style={{ width: 40, height: 40, flexShrink: 0 }}
            />
            <div>
              <span className="prototype-kicker">26063 · Панель управления</span>
              <h1 id="admin-title">Учебные группы и доступ</h1>
              <p className="muted tiny" style={{ margin: '3px 0 0' }}>
                Создавайте группы, добавляйте учащихся по ФИО и управляйте доступом.
              </p>
            </div>
          </div>
          <div className="row-actions">
            <button className="ghost-button" onClick={() => setAdminCodeModalOpen(true)}>
              Сменить код администратора
            </button>
            <button className="secondary-button" onClick={onBack}>
              ← На станцию
            </button>
          </div>
        </header>

        {error && <div className="form-error" role="alert" style={{ marginBottom: 14 }}>{error}<button type="button" className="secondary-button" onClick={() => void refresh()}>Обновить список</button></div>}
        {success && <div className="form-success" role="status" style={{ marginBottom: 14 }}>{success}</div>}
        {usersLoading && <p className="form-note" role="status">Обновляем список учащихся…</p>}

        <div className="admin-groups-layout">
          {/* Левая панель: Список групп */}
          <aside className="admin-groups-sidebar">
            <div className="sidebar-header">
              <h2>Группы ({groups.length})</h2>
              {!isCreatingGroup && (
                <button
                  className="primary-button"
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
                    Продолжить
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

            <PixelScrollArea className="admin-group-scroll" label="Учебные группы"><div className="group-list" role="group" aria-label="Список учебных групп">
              {groups.length === 0 && !usersLoading && (
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
                    aria-pressed={isActive}
                    className={`group-nav-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => { setSelectedGroup(group); setSearchQuery(''); }}
                  >
                    <span>{group}</span>
                    <span className="group-pill-count">{count} чел.</span>
                  </button>
                );
              })}
            </div></PixelScrollArea>
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
                      aria-pressed={addMode === 'single'}
                      onClick={() => setAddMode('single')}
                    >
                      + Добавить одного
                    </button>
                    <button
                      type="button"
                      className={`admin-tab ${addMode === 'batch' ? 'is-active' : ''}`}
                      aria-pressed={addMode === 'batch'}
                      onClick={() => setAddMode('batch')}
                    >
                      Импорт списком
                    </button>
                  </div>
                </div>

                {!currentGroupUsers.length && customGroups.includes(selectedGroup) && <p className="form-note" role="status">Группа сохранится после добавления первого учащегося. Введите ФИО или загрузите список.</p>}

                {/* Форма добавления (только ФИО!) */}
                <div className="group-add-box">
                  {addMode === 'single' ? (
                    <form onSubmit={handleCreateSingle}>
                      <div className="quick-add-row">
                        <input
                          value={singleName}
                          aria-label="ФИО нового учащегося"
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
                      <div className="admin-import-toolbar">
                        <span className="tiny muted">
                          Вставьте список ФИО — по одной записи на строку:
                        </span>
                        <button type="button" className="ghost-button" disabled={batchLoading} onClick={() => importFileInput.current?.click()}>
                          Загрузить файл (.txt / .csv)
                        </button>
                        <input ref={importFileInput} type="file" accept=".txt,.csv" onChange={handleFileUpload} hidden tabIndex={-1} aria-label="Файл со списком учащихся" />
                      </div>
                      <textarea
                        className="import-textarea"
                        aria-label="Список учащихся для добавления"
                        disabled={batchLoading}
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

                {/* Журнал группы (Roster Ledger Table) */}
                <div>
                  <div className="roster-toolbar">
                    <div className="roster-search-box">
                      <input
                        ref={rosterSearch}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по ФИО в группе…"
                        maxLength={60}
                        aria-label="Поиск по ФИО в текущей группе"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="search-clear-btn"
                          onClick={() => { setSearchQuery(''); rosterSearch.current?.focus(); }}
                          aria-label="Очистить поиск"
                          title="Очистить поиск"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="roster-stats">
                      <span>Всего: <strong>{currentGroupUsers.length}</strong></span>
                      <span className="roster-stats-sep">•</span>
                      <span>Активных: <strong style={{ color: 'var(--ui-success)' }}>{activeCount}</strong></span>
                      <span className="roster-stats-sep">•</span>
                      <span>С кодом: <strong>{codeSetCount}</strong></span>
                    </div>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="empty-state">
                      {currentGroupUsers.length === 0 ? (
                        <>
                          <strong>В группе «{selectedGroup}» пока никого нет</strong>
                          <p>Введите ФИО выше или переключитесь на «Импорт списком».</p>
                        </>
                      ) : (
                        <>
                          <strong>По запросу «{searchQuery}» никто не найден</strong>
                          <p>Проверьте правильность написания ФИО или сбросьте строку поиска.</p>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ marginTop: 10 }}
                            onClick={() => { setSearchQuery(''); rosterSearch.current?.focus(); }}
                          >
                            Сбросить поиск
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <PixelScrollArea className="roster-table-container" orientation="both" label={`Журнал группы ${selectedGroup}`}>
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th className="col-num">№</th>
                            <th className="col-name">ФИО учащегося</th>
                            <th className="col-status">Статус</th>
                            <th className="col-code">Код доступа</th>
                            <th className="col-actions">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user, index) => (
                            <tr
                              key={user.id}
                              className={`roster-row ${user.status === 'disabled' ? 'is-disabled' : ''}`}
                            >
                              <td className="col-num">{String(index + 1).padStart(2, '0')}</td>
                              <td className="col-name">
                                <span className="user-name-text">
                                  {highlightMatch(user.displayName, searchQuery)}
                                </span>
                              </td>
                              <td className="col-status">
                                <span className={`roster-badge ${user.status}`}>
                                  {user.status === 'active' ? 'Активен' : 'Отключён'}
                                </span>
                              </td>
                              <td className="col-code">
                                <span className={`roster-badge ${user.codeSet ? 'code-set' : 'code-unset'}`}>
                                  {user.codeSet ? 'Задан' : 'Не задан'}
                                </span>
                              </td>
                              <td className="col-actions">
                                <div className="roster-actions-wrap">
                                  <button
                                    type="button"
                                    className="table-btn-reset"
                                    onClick={() => { setResetError(''); setResetTarget(user); }}
                                    disabled={resetting}
                                    title="Сбросить код, чтобы учащийся снова мог войти без кода"
                                  >
                                    ↺ Сброс
                                  </button>
                                  <div title={user.status === 'active' ? 'Отключить доступ' : 'Включить доступ'}>
                                    <PixelSwitch
                                      checked={user.status === 'active'}
                                      disabled={pendingUserIds.includes(user.id)}
                                      onChange={() => void toggleStatus(user)}
                                      ariaLabel={user.status === 'active' ? `Отключить ${user.displayName}` : `Включить ${user.displayName}`}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </PixelScrollArea>
                  )}
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
        <HubModalLayer label="Сброс кода доступа" onClose={() => setResetTarget(null)}>
        <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setResetTarget(null); }}>
          <section className="panel reset-modal form-stack" aria-labelledby="reset-modal-title">
            <h2 id="reset-modal-title">Сброс кода доступа</h2>
            <p className="tiny muted">
              Пользователь: <strong>{resetTarget.displayName}</strong> (группа {resetTarget.groupId})
            </p>
            <div className="form-note">
              После сброса учащийся сможет войти в систему <strong>без ввода кода</strong> и заново установить персональный код при входе или в профиле.
            </div>
            {resetError && <p className="form-error" role="alert">{resetError}</p>}
            <div className="row-actions" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="primary-button"
                disabled={resetting}
                onClick={() => void handleResetCode(resetTarget)}
              >
                {resetting ? 'Сбрасываем код…' : 'Подтвердить сброс'}
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
        </HubModalLayer>
      )}

      {/* Модальное окно смены кода администратора */}
      {adminCodeModalOpen && (
        <HubModalLayer label="Код администратора" onClose={() => setAdminCodeModalOpen(false)}>
        <SetCodeModal
          user={currentUser}
          onSuccess={() => {
            if (mounted.current) setSuccess('Код администратора успешно обновлён');
          }}
          onClose={() => setAdminCodeModalOpen(false)}
        />
        </HubModalLayer>
      )}
    </main>
  );
}
