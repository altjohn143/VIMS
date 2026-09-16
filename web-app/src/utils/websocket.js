import { io } from 'socket.io-client';
import axios from '../config/axios';

const listeners = new Set();
const countListeners = new Set();
const dataListeners = new Set();
let socket = null;

const getToken = () => sessionStorage.getItem('token');

const connect = () => {
  const token = getToken();
  if (!token) return null;
  if (socket?.connected) return socket;

  if (socket) socket.disconnect();
  socket = io(axios.defaults.baseURL || window.location.origin, {
    auth: { token },
    transports: ['polling', 'websocket'],
    upgrade: true
  });

  socket.on('notification:new', (notification) => {
    listeners.forEach((callback) => callback(notification));
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
    connect();
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  onUnreadCountDelta: (callback) => {
    connect();
    countListeners.add(callback);
    return () => {
      countListeners.delete(callback);
    };
  },

  onDataChanged: (callback) => {
    connect();
    dataListeners.add(callback);
    return () => dataListeners.delete(callback);
  },

  markNotificationRead: () => {
    if (socket?.connected) return;
    countListeners.forEach((callback) => callback(-1));
  },

  markAllNotificationsRead: () => {
    if (socket?.connected) return;
    countListeners.forEach((callback) => callback('reset'));
  },

  emitNotification: (notification) => {
    listeners.forEach((callback) => callback(notification));
  },

  disconnect: () => {
    if (socket) socket.disconnect();
    socket = null;
  }
};

export default websocketService;
