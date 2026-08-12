const axios = require('axios');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ||
  'VIMS System <noreply@casimiro-westville-homes-vims.online>';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

async function sendPaymentReminderEmail(payment, resident) {
  if (!resident?.email) {
    return { sent: false, reason: 'missing_email' };
  }
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: 'resend_not_configured' };
  }

  const amountText = Number(payment.amount || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP'
  });
  const dueDateText = payment.dueDate
    ? new Date(payment.dueDate).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'the due date';
  const firstName = resident.firstName || 'Resident';
  const invoiceNumber = payment.invoiceNumber || 'your invoice';
  const safeFirstName = escapeHtml(firstName);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);

  const result = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: resident.email,
    subject: `VIMS Payment Reminder: ${invoiceNumber}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
      <h2 style="color:#2e6b2e">Payment Reminder</h2>
      <p>Hello ${safeFirstName},</p>
      <p>This is a reminder that <strong>${safeInvoiceNumber}</strong> is overdue.</p>
      <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:16px 0">
        <p style="margin:0 0 8px"><strong>Amount:</strong> ${amountText}</p>
        <p style="margin:0"><strong>Due date:</strong> ${dueDateText}</p>
      </div>
      <p>Please settle this payment through the VIMS resident portal or coordinate with the admin office.</p>
      <p>If you have already paid, you may disregard this reminder.</p>
    </div>`,
    text: `Hello ${firstName},\n\nThis is a reminder that ${invoiceNumber} is overdue.\nAmount: ${amountText}\nDue date: ${dueDateText}\n\nPlease settle this payment through the VIMS resident portal or coordinate with the admin office.\n\nIf you have already paid, you may disregard this reminder.`
  });

  if (result?.error) {
    throw new Error(result.error.message || 'Resend rejected the email');
  }

  return { sent: true, id: result?.data?.id };
}

module.exports = {
  sendOnboardingNotification,
  sendVisitorReminderNotification,
  sendServiceRequestStatusNotification,
  sendReservationStatusNotification,
  sendPaymentReminderEmail
};
