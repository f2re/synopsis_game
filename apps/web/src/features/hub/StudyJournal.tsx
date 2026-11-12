import { useEffect, useState } from 'react';
import { api, getSessionToken, type EquipmentResponse, type SessionUser } from '../../api';

interface StudyJournalProps {
  user: SessionUser | null;
  onLogin: () => void;
  onOpenEquipment: () => void;
}

/** Only completed, server-accepted practice contributes to this journal. */
export function StudyJournal({ user, onLogin, onOpenEquipment }: StudyJournalProps) {
  const [equipment, setEquipment] = useState<EquipmentResponse | null>(null);
  const [error, setError] = useState(false);
  const [request, setRequest] = useState(0);
  const token = getSessionToken();

  useEffect(() => {
    setEquipment(null);
    setError(false);
    if (!user || !token) return;
    let disposed = false;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 8_000);
    void api.equipment(abort.signal).then((result) => {
      if (!disposed && getSessionToken() === token) setEquipment(result);
    }).catch(() => {
      if (!disposed && getSessionToken() === token) setError(true);
    }).finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; window.clearTimeout(timeout); abort.abort(); };
  }, [user?.id, token, request]);

  if (!user) return <section className="hub-journal hub-journal__status">
    <p className="hub-dialog__lead">Войдите в профиль, чтобы открыть свои результаты.</p>
    <p>В журнале — количество завершённых смен, верных самостоятельных ответов и полученные знаки.</p>
    <button type="button" className="hub-action" onClick={onLogin}>Войти в учебную группу</button>
  </section>;

  if (error) return <section className="hub-journal hub-journal__status" role="status">
    <p className="hub-dialog__lead">Не удалось открыть журнал.</p>
    <p>Проверьте соединение и попробуйте ещё раз.</p>
    <button type="button" className="hub-action" onClick={() => setRequest((value) => value + 1)}>Повторить загрузку</button>
  </section>;

  if (!equipment) return <div className="hub-journal hub-journal__status" role="status" aria-busy="true">Открываем журнал…</div>;

  const earned = equipment.catalog.filter((badge) => badge.unlocked && badge.earnedAt);
  return <section className="hub-journal" aria-label="Результаты занятий">
    <dl className="hub-journal__summary">
      <div><dt>Завершено смен</dt><dd>{equipment.stats.completedShifts}</dd></div>
      <div><dt>Верно самостоятельно</dt><dd>{equipment.stats.unassistedCorrect}</dd></div>
      <div><dt>Дней занятий</dt><dd>{equipment.stats.practiceDays}</dd></div>
    </dl>
    <p className="hub-note">Самостоятельные ответы — верные с первой попытки, без справки и показа решения.</p>
    {equipment.stats.completedShifts === 0
      ? <p className="hub-dialog__lead">Начните первую смену. После её завершения здесь появятся ваши результаты.</p>
      : <p>Разбор ответов текущей смены можно открыть на рабочем месте: «Спросить Ольхина» → «Разбор смены».</p>}
    {earned.length > 0 && <>
      <h2>Знаки за занятия</h2>
      <ul className="hub-journal__badges">{earned.map((badge) => <li className="hub-journal__badge" key={badge.id}>
        <img src={badge.image} width={48} height={48} alt="" />
        <span><strong>{badge.name}</strong><small>Получен {new Date(badge.earnedAt!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</small></span>
      </li>)}</ul>
      <button type="button" className="hub-action" onClick={onOpenEquipment}>Открыть инвентарь</button>
    </>}
  </section>;
}
