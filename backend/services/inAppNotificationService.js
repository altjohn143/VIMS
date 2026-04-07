const Notification = require('../models/Notification');

async function createInAppNotification({ userId, type = 'general', title, body, metadata = {} }) {
  if (!userId || !title || !body) return null;
  return Notification.create({ userId, type, title, body, metadata });
}

module.exports = { createInAppNotification };
