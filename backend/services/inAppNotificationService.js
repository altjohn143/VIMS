const Notification = require('../models/Notification');
const { sendPushToUser } = require('./pushNotificationService');

async function createInAppNotification({ userId, type = 'general', title, body, metadata = {} }) {
  if (!userId || !title || !body) return null;
  const notification = await Notification.create({ userId, type, title, body, metadata });
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

module.exports = { createInAppNotification };
                                                                                                                              
