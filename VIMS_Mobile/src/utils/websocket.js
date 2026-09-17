import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { getAuthToken } from './secureSession';

const notificationListeners = new Set();
const countListeners = new Set();
const dataListeners = new Set();
let socket = null;

const connect = async () => {
  const token = await getAuthToken();
  if (!token) return null;
  if (socket?.connected) return socket;

  if (socket) socket.disconnect();
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    upgrade: true
  });

  socket.on('notification:new', (notification) => {
    notificationListeners.forEach((callback) => callback(notification));
  });

  socket.on('notification:unread-count-delta', ({ delta = 1 } = {}) => {
    countListeners.forEach((callback) => callback(delta));
  });

  socket.on('data:changed', (change) => {
    dataListeners.forEach((callback) => callback(change));
  });

  return socket;
};

const websocketService = {
  onNotification: (callback) => {
    notificationListeners.add(callback);
    connect().catch(() => {});
    return () => notificationListeners.delete(callback);
  },

  onUnreadCountDelta: (callback) => {
    countListeners.add(callback);
    connect().catch(() => {});
    return () => countListeners.delete(callback);
  },

  onDataChanged: (callback) => {
    dataListeners.add(callback);
    connect().catch(() => {});
    return () => dataListeners.delete(callback);
  },

  markNotificationRead: () => {
    if (socket?.connected) return;
    countListeners.forEach((callback) => callback(-1));
  },

  markAllNotificationsRead: () => {
    // The API has already persisted the change. Reset this device immediately
    // as well; a delayed socket event must not leave a stale badge visible.
    countListeners.forEach((callback) => callback('reset'));
  },

  disconnect: () => {
    if (socket) socket.disconnect();
    socket = null;
  }
};

export default websocketService;
