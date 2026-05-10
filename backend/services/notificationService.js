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

async function sendVisitorReminderNotification(visitor, resident) {
  const scheduleText = new Date(visitor.expectedArrival).toLocaleString();
  const body = `Visitor reminder: ${visitor.visitorName} is expected on ${scheduleText}.`;

  const [emailResult, smsResult] = await Promise.all([
    postWebhook(process.env.EMAIL_WEBHOOK_URL, {
      to: resident.email,
      subject: 'VIMS Visitor Reminder',
      body
    }),
    postWebhook(process.env.SMS_WEBHOOK_URL, {
      to: resident.phone,
      message: body
    })
  ]);

  return { emailResult, smsResult };
}

async function sendServiceRequestStatusNotification(serviceRequest, resident, options = {}) {
  const { actorName = 'VIMS Team' } = options;
  const title = serviceRequest.title || 'Service request';
  const status = serviceRequest.status || 'updated';
  const body = `${title} is now ${status}. Updated by ${actorName}.`;

  const [emailResult, smsResult] = await Promise.all([
    postWebhook(process.env.EMAIL_WEBHOOK_URL, {
      to: resident.email,
      subject: 'VIMS Service Request Update',
      body
    }),
    postWebhook(process.env.SMS_WEBHOOK_URL, {
      to: resident.phone,
      message: body
    })
  ]);

  return { emailResult, smsResult };
}

async function sendReservationStatusNotification(reservation, resident, options = {}) {
  const { actorName = 'VIMS Team' } = options;
  const title = `Reservation for ${reservation.resourceName}`;
  const status = reservation.status || 'updated';
  const body = `${title} is now ${status}. Updated by ${actorName}.`;

  const [emailResult, smsResult] = await Promise.all([
    postWebhook(process.env.EMAIL_WEBHOOK_URL, {
      to: resident.email,
      subject: 'VIMS Reservation Update',
      body
    }),
    postWebhook(process.env.SMS_WEBHOOK_URL, {
      to: resident.phone,
      message: body
    })
  ]);

  return { emailResult, smsResult };
}

module.exports = {
  sendOnboardingNotification,
  sendVisitorReminderNotification,
  sendServiceRequestStatusNotification,
  sendReservationStatusNotification
};
