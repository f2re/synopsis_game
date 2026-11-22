import { useCallback, useEffect, useState } from 'react';
import { api, type RewardsResponse } from '../../api';

/** A collection always belongs to the current account; old responses cannot unlock a new one. */
export function useRewards(owner: string | undefined, enabled = true) {
  const [snapshot, setSnapshot] = useState<{ owner: string; data: RewardsResponse } | null>(null);
  const [request, setRequest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(() => setRequest(value => value + 1), []);
  useEffect(() => {
    if (!owner || !enabled) { setSnapshot(null); setLoading(false); setError(''); return; }
    let active = true;
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 8_000);
    setLoading(true); setError('');
    api.rewards(abort.signal).then(data => {
      if (active) setSnapshot({ owner, data });
    }).catch(reason => {
      if (active) setError(abort.signal.aborted
        ? 'Сервер не ответил вовремя. Повторите загрузку коллекции.'
        : reason instanceof Error ? reason.message : 'Не удалось открыть награды. Проверьте соединение.');
    }).finally(() => { window.clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; abort.abort(); window.clearTimeout(timer); };
  }, [owner, enabled, request]);
  return { data: snapshot && snapshot.owner === owner && enabled ? snapshot.data : null, loading, error, reload };
}
