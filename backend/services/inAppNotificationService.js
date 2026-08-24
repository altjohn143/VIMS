const Notification = require('../models/Notification');
const { sendPushToUser } = require('./pushNotificationService');

let io = null;

function setNotificationSocket(serverIo) {
  io = serverIo;
}

function emitUnreadCountDelta(userId, delta) {
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit('notification:unread-count-delta', { delta });
}

async function createInAppNotification({ userId, type = 'general', title, body, metadata = {} }) {
  if (!userId || !title || !body) return null;
  const notification = await Notification.create({ userId, type, title, body, metadata });
  const notificationPayload = notification.toObject ? notification.toObject() : notification;
  if (io) {
    io.to(`user:${userId.toString()}`).emit('notification:new', notificationPayload);
    io.to(`user:${userId.toString()}`).emit('notification:unread-count-delta', { delta: 1 });
  }
  sendPushToUser(userId, {
    title,
    body,
    metadata: {
      ...metadata,
      type,
      notificationId: notification._id.toString()
    }
  }).catch((error) => {
    console.error('Failed to send push notification:', error.message);
  });
  return notification;
}

module.exports = { createInAppNotification, setNotificationSocket, emitUnreadCountDelta };
                                                                                                                              
