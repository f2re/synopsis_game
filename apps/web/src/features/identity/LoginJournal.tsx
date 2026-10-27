import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { api, type RosterUser, type SessionUser } from '../../api';
import { GAME_CALLSIGN, GAME_MARK } from '../../brand';
import { PixelCard, PixelIcon } from '../ui';

interface LoginJournalProps {
  onLogin: (user: SessionUser) => void;
  onClose?: () => void;
  onOpenAdmin?: () => void;
}

export function LoginJournal({ onLogin, onClose, onOpenAdmin }: LoginJournalProps) {
  const [groups, setGroups] = useState<string[]>([]);
  const [groupId, setGroupId] = useState('');
  const [users, setUsers] = useState<RosterUser[]>([]);
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.groups()
      .then((items) => {
        setGroups(items);
        if (items.length > 0) {
          setGroupId(items[0]);
        }
      })
      .catch(() => setError('Сервер недоступен. Проверьте запуск apps/server.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!groupId) {
      setUsers([]);
      setUserId('');
      return;
    }
    setLoading(true);
    setError('');
    api.roster(groupId)
      .then((items) => {
        setUsers(items);
        setUserId(items[0]?.id ?? '');
        setCode('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить ростер'))
      .finally(() => setLoading(false));
  }, [groupId]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter((u) => u.displayName.toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
  }, [users, searchQuery]);

  const selectedUser = users.find((u) => u.id === userId);
  const isFirstTime = selectedUser ? selectedUser.hasCode === false : false;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError('');
    setSubmitting(true);
    try {
      const sessionUser = await api.login(userId, code);
      onLogin(sessionUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка авторизации';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell login-journal-screen" aria-labelledby="journal-title">
      <div style={{ maxWidth: 580, margin: '36px auto' }}>
        <PixelCard variant="dialog" cornerBrackets>
          <div style={{ padding: '20px 24px' }}>
            {/* Заголовок журнала */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ui-border-subtle)', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-primary-cyan)', fontFamily: 'var(--font-pixel-ui)' }}>
                  {GAME_MARK} · ЖУРНАЛ ДОПУСКА К ДЕЖУРСТВУ
                </span>
                <h1 id="journal-title" style={{ margin: '2px 0 0', fontSize: 18, fontFamily: 'var(--font-pixel-display)' }}>
                  Регистрация наблюдателя
                </h1>
              </div>
              {onClose && (
                <button type="button" className="pixel-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={onClose}>
                  ✕ Закрыть
                </button>
              )}
            </div>

            {error && (
              <div style={{
                background: 'rgba(231, 76, 60, 0.15)',
                border: '1px solid var(--color-danger, #e74c3c)',
                color: '#ff9999',
                padding: '8px 12px',
                borderRadius: 4,
                marginBottom: 16,
                fontSize: 12,
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Выбор группы (без нативного select) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--ui-text-secondary)', marginBottom: 6, fontFamily: 'var(--font-pixel-ui)' }}>
                Учебная группа / Смена:
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {groups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={g === groupId ? 'pixel-btn-primary' : 'pixel-btn-secondary'}
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => setGroupId(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Поиск наблюдателя */}
            {users.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Поиск по фамилии или позывному…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--ui-border-subtle)',
                    color: 'var(--ui-text-primary)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    borderRadius: 4,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* Список наблюдателей (без нативного select) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--ui-text-secondary)', marginBottom: 6, fontFamily: 'var(--font-pixel-ui)' }}>
                Наблюдатель:
              </label>
              {loading ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--ui-text-muted)', fontSize: 12 }}>
                  Загрузка списка наблюдателей…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{
                  padding: 16,
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--ui-border-subtle)',
                  borderRadius: 4,
                  color: 'var(--ui-text-muted)',
                  fontSize: 12,
                  lineHeight: 1.5
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>В выбранной группе нет зарегистрированных наблюдателей.</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11 }}>
                    Обратитесь к преподавателю-инструктору станции для внесения в ростер.
                  </p>
                  {onOpenAdmin && (
                    <button
                      type="button"
                      className="pixel-btn-secondary"
                      style={{ marginTop: 10, fontSize: 11 }}
                      onClick={onOpenAdmin}
                    >
                      Панель инструктора
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid var(--ui-border-subtle)',
                  borderRadius: 4,
                  background: 'rgba(0, 0, 0, 0.15)'
                }}>
                  {filteredUsers.map((u) => {
                    const isSelected = u.id === userId;
                    return (
                      <div
                        key={u.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setUserId(u.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setUserId(u.id); }}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(78, 205, 196, 0.15)' : 'transparent',
                          borderLeft: isSelected ? '3px solid var(--color-primary-cyan)' : '3px solid transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? 'var(--color-primary-cyan)' : 'var(--ui-text-primary)' }}>
                            {u.displayName}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ui-text-muted)' }}>
                            Идентификатор: {u.id}
                          </div>
                        </div>
                        {u.hasCode === false && (
                          <span style={{ fontSize: 10, color: 'var(--color-accent-amber)', padding: '2px 6px', background: 'rgba(243, 156, 18, 0.1)', borderRadius: 2 }}>
                            Первый вход
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ввод кода доступа */}
            {selectedUser && (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="access-code-input" style={{ display: 'block', fontSize: 11, color: 'var(--ui-text-secondary)', marginBottom: 6, fontFamily: 'var(--font-pixel-ui)' }}>
                    {isFirstTime ? 'Установите персональный 4-значный код:' : 'Персональный код доступа:'}
                  </label>
                  <input
                    id="access-code-input"
                    type="password"
                    maxLength={8}
                    autoComplete="off"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="••••"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: 18,
                      letterSpacing: 4,
                      textAlign: 'center',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--ui-border-subtle)',
                      borderRadius: 4,
                      color: 'var(--ui-text-primary)',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  {isFirstTime && (
                    <div style={{ fontSize: 11, color: 'var(--ui-text-muted)', marginTop: 4 }}>
                      Код задаётся один раз при первом заступлении на смену.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    className="pixel-btn-primary"
                    disabled={submitting || !code}
                    style={{ flex: 1, padding: '10px 16px', fontSize: 13 }}
                  >
                    {submitting ? 'Проверка…' : isFirstTime ? 'Установить код и войти' : 'Подтвердить допуск'}
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      className="pixel-btn-secondary"
                      onClick={onClose}
                      style={{ padding: '10px 16px' }}
                    >
                      Отмена
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </PixelCard>
      </div>
    </main>
  );
}
