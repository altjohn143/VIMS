const User = require('../models/User');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const isExpoPushToken = (token) => (
  typeof token === 'string' &&
  (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
);

async function sendExpoPush(tokens, { title, body, data = {} }) {
  const validTokens = [...new Set((tokens || []).filter(isExpoPushToken))];
  if (validTokens.length === 0) return { sent: 0, failed: 0 };

  const messages = validTokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data
  }));

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chunk)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        failed += chunk.length;
        console.error('Expo push failed:', payload);
        continue;
      }
      sent += chunk.length;
    } catch (error) {
      failed += chunk.length;
      console.error('Expo push error:', error.message);
    }
  }

  return { sent, failed };
}

async function sendPushToUser(userId, { title, body, metadata = {} }) {
  if (!userId || !title || !body) return { sent: 0, failed: 0 };

  const user = await User.findById(userId).select('pushTokens notificationPreferences');
  if (!user || user.notificationPreferences?.pushEnabled === false) {
    return { sent: 0, failed: 0 };
  }

  const tokens = (user.pushTokens || []).map((entry) => entry.token);
  return sendExpoPush(tokens, {
    title,
    body,
    data: {
      type: metadata.type || 'notification',
      ...metadata
    }
  });
}

module.exports = {
  sendPushToUser,
  sendExpoPush,
  isExpoPushToken
};
