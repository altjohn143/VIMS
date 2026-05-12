const listeners = new Set();

const websocketService = {
  onNotification: (callback) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  markNotificationRead: () => {
    // No-op fallback for environments without a real websocket connection.
  },

  emitNotification: (notification) => {
    listeners.forEach((callback) => callback(notification));
  }
};

export default websocketService;
