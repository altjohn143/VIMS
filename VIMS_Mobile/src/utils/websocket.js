import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { getAuthToken } from './secureSession';

const notificationListeners = new Set();
const countListeners = new Set();
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

  markNotificationRead: () => {
    if (socket?.connected) return;
    countListeners.forEach((callback) => callback(-1));
  },

  markAllNotificationsRead: () => {
    if (socket?.connected) return;
    countListeners.forEach((callback) => callback('reset'));
  },

  disconnect: () => {
    if (socket) socket.disconnect();
    socket = null;
  }
};

export default websocketService;
