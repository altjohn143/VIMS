const axios = require('axios');

async function postWebhook(url, payload) {
  if (!url) return { sent: false, reason: 'webhook_not_configured' };
  try {
    await axios.post(url, payload, { timeout: 10000 });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

async function sendOnboardingNotification(user, options = {}) {
  const { includeCredentials = false, plainPassword = null, message = '' } = options;

  const smsText = includeCredentials && plainPassword
    ? `Welcome to VIMS. Email: ${user.email} Password: ${plainPassword}. ${message}`
    : `Welcome to VIMS. ${message}`;

  const emailBody = includeCredentials && plainPassword
    ? `Welcome to VIMS.\n\nEmail: ${user.email}\nPassword: ${plainPassword}\n\n${message}`
    : `Welcome to VIMS.\n\n${message}`;

  const [emailResult, smsResult] = await Promise.all([
    postWebhook(process.env.EMAIL_WEBHOOK_URL, {
      to: user.email,
      subject: 'VIMS Account Notification',
      body: emailBody
    }),
    postWebhook(process.env.SMS_WEBHOOK_URL, {
      to: user.phone,
      message: smsText
    })
  ]);

  return { emailResult, smsResult };
}

module.exports = { sendOnboardingNotification };
