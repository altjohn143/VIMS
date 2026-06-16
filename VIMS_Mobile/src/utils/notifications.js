import { AppState } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    return { success: false, error: 'Push notifications require a physical device.' };
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== 'granted') {
    return { success: false, error: 'Notification permission was not granted.' };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.projectId;

  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const token = tokenResponse.data;
  const response = await api.post('/notifications/push-token', {
    token,
    platform: Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'unknown',
    deviceName: Device.deviceName || `${Device.manufacturer || ''} ${Device.modelName || ''}`.trim()
  });

  if (!response.data?.success) {
    return { success: false, error: response.data?.error || 'Failed to register push token.' };
  }

  return { success: true, token };
}

export async function unregisterPushToken(token) {
  if (!token) return { success: true };
  const response = await api.delete('/notifications/push-token', { data: { token } });
  return { success: response.data?.success !== false };
}
