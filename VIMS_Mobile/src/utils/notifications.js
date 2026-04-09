import { AppState } from 'react-native';
import api from './api';

export async function fetchUnreadNotificationCount() {
  const res = await api.get('/notifications/unread-count');
  if (!res.data?.success) {
    throw new Error(res.data?.error || 'Failed to fetch unread count');
  }
  return typeof res.data.count === 'number' ? res.data.count : 0;
}

/**
 * Lightweight in-app polling to keep an unread badge fresh.
 * Push notifications are intentionally out of scope; this is a bridge.
 */
export function startUnreadCountPolling({ intervalMs = 45000, onCount, onError }) {
  let stopped = false;
  let timer = null;
  let appState = AppState.currentState;

  const tick = async () => {
    if (stopped) return;
    if (appState !== 'active') return;
    try {
      const count = await fetchUnreadNotificationCount();
      onCount?.(count);
    } catch (e) {
      onError?.(e);
    }
  };

  const setUpTimer = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(tick, intervalMs);
  };

  const sub = AppState.addEventListener('change', (nextState) => {
    appState = nextState;
    if (appState === 'active') {
      tick();
      setUpTimer();
    }
  });

  // initial
  tick();
  setUpTimer();

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    sub?.remove?.();
  };
}

