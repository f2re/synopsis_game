import { useEffect, useState } from 'react';
import { api, ApiError, getSessionToken } from '../../api';

const HEARTBEAT_INTERVAL_MS = 15_000;
const REQUEST_TIMEOUT_MS = 5_000;

export function useStationPresence(token: string | null): number {
  const [snapshot, setSnapshot] = useState<{ token: string; online: number } | null>(null);

  useEffect(() => {
    setSnapshot(null);
    if (!token) return;
    const sessionToken = token;

    let stopped = false;
    let refreshTimer: number | undefined;
    let retryTimer: number | undefined;
    let inFlight: AbortController | undefined;

    const canReport = () => !stopped && !document.hidden && navigator.onLine && getSessionToken() === sessionToken;

    async function report() {
      if (!canReport() || inFlight) return;

      const request = new AbortController();
      inFlight = request;
      const timeout = window.setTimeout(() => request.abort(), REQUEST_TIMEOUT_MS);
      try {
        const online = await api.renewStationPresence(request.signal);
        if (inFlight === request && canReport()) {
          setSnapshot((current) => current?.token === sessionToken && current.online === online ? current : { token: sessionToken, online });
        }
      } catch (error: unknown) {
        if (inFlight === request && canReport()) {
          // Another tab using this session may have sent a heartbeat first.
          if (error instanceof ApiError && error.status === 429) {
            window.clearTimeout(retryTimer);
            retryTimer = window.setTimeout(() => void report(), 1_200 + Math.random() * 800);
            return;
          }
          setSnapshot(null);
          // A rejected session stays disconnected until the account changes.
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            stopped = true;
            window.clearInterval(refreshTimer);
          }
        }
      } finally {
        window.clearTimeout(timeout);
        if (inFlight === request) inFlight = undefined;
      }
    }

    function syncConnectivity() {
      window.clearInterval(refreshTimer);
      window.clearTimeout(retryTimer);
      refreshTimer = undefined;
      if (!canReport()) {
        inFlight?.abort();
        inFlight = undefined;
        setSnapshot(null);
        return;
      }
      void report();
      refreshTimer = window.setInterval(() => void report(), HEARTBEAT_INTERVAL_MS);
    }

    syncConnectivity();
    document.addEventListener('visibilitychange', syncConnectivity);
    window.addEventListener('online', syncConnectivity);
    window.addEventListener('offline', syncConnectivity);
    return () => {
      stopped = true;
      inFlight?.abort();
      window.clearInterval(refreshTimer);
      window.clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', syncConnectivity);
      window.removeEventListener('online', syncConnectivity);
      window.removeEventListener('offline', syncConnectivity);
    };
  }, [token]);

  return snapshot?.token === token ? snapshot.online : 0;
}
