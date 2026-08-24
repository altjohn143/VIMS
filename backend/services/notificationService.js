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

async function sendPaymentReminderEmail(payments, resident, options = {}) {
  if (!resident?.email) {
    return { sent: false, reason: 'missing_email' };
  }
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: 'resend_not_configured' };
  }

  const paymentList = Array.isArray(payments) ? payments : [payments];
  if (paymentList.length === 0) {
    return { sent: false, reason: 'no_unpaid_payments' };
  }

  const formatAmount = (amount) => Number(amount || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP'
  });
  const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    : 'the due date';

  const firstName = resident.firstName || 'Resident';
  const safeFirstName = escapeHtml(firstName);
  const isDueTomorrow = options.timing === 'due_tomorrow';
  const invoiceCount = paymentList.length;
  const introText = isDueTomorrow
    ? `This is a reminder that you have ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} due tomorrow.`
    : `This is a reminder that you have ${invoiceCount} unpaid invoice${invoiceCount === 1 ? '' : 's'}.`;
  const invoiceRows = paymentList.map((payment) => {
    const invoiceNumber = payment.invoiceNumber || 'Invoice';
    return `<tr>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(invoiceNumber)}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(formatAmount(payment.amount))}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(formatDate(payment.dueDate))}</td>
    </tr>`;
  }).join('');
  const textInvoiceRows = paymentList.map((payment) => {
    const invoiceNumber = payment.invoiceNumber || 'Invoice';
    return `- ${invoiceNumber}: ${formatAmount(payment.amount)} due ${formatDate(payment.dueDate)}`;
  }).join('\n');

  const result = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: resident.email,
    subject: isDueTomorrow
      ? `VIMS Payment Reminder: Invoice${invoiceCount === 1 ? '' : 's'} due tomorrow`
      : `VIMS Payment Reminder: ${invoiceCount} unpaid invoice${invoiceCount === 1 ? '' : 's'}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
      <h2 style="color:#2e6b2e">Payment Reminder</h2>
      <p>Hello ${safeFirstName},</p>
      <p>${escapeHtml(introText)}</p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:16px 0">
        <thead>
          <tr>
            <th align="left" style="padding:10px;border-bottom:1px solid #cbd5e1">Invoice</th>
            <th align="left" style="padding:10px;border-bottom:1px solid #cbd5e1">Amount</th>
            <th align="left" style="padding:10px;border-bottom:1px solid #cbd5e1">Due date</th>
          </tr>
        </thead>
        <tbody>${invoiceRows}</tbody>
      </table>
      <p>Please settle this payment through the VIMS resident portal or coordinate with the admin office.</p>
      <p>If you have already paid, you may disregard this reminder.</p>
    </div>`,
    text: `Hello ${firstName},\n\n${introText}:\n${textInvoiceRows}\n\nPlease settle this payment through the VIMS resident portal or coordinate with the admin office.\n\nIf you have already paid, you may disregard this reminder.`
  });

  if (result?.error) {
    throw new Error(result.error.message || 'Resend rejected the email');
  }

  return { sent: true, id: result?.data?.id };
}

async function sendPaymentConfirmationEmail(payment, resident) {
  if (!resident?.email) {
    return { sent: false, reason: 'missing_email' };
  }
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: 'resend_not_configured' };
  }

  const formatAmount = (amount) => Number(amount || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP'
  });
  const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    : 'N/A';

  const firstName = resident.firstName || 'Resident';
  const safeFirstName = escapeHtml(firstName);
  const latestReceipt = Array.isArray(payment.paymentHistory) && payment.paymentHistory.length > 0
    ? payment.paymentHistory[payment.paymentHistory.length - 1]
    : null;
  const amount = formatAmount(latestReceipt?.amount ?? payment.paidAmount ?? payment.amount);
  const creditedAmount = Number(latestReceipt?.creditedAmount || 0);
  const creditText = creditedAmount > 0 ? formatAmount(creditedAmount) : '';
  const remainingBalance = formatAmount(payment.amount);
  const isPartial = payment.status === 'pending' && Number(payment.amount || 0) > 0;
  const paymentDate = formatDate(payment.paymentDate || new Date());
  const dueDate = formatDate(payment.dueDate);
  const invoiceNumber = payment.invoiceNumber || 'Invoice';
  const receiptNumber = latestReceipt?.receiptNumber || payment.receiptNumber || 'N/A';
  const paymentMethod = latestReceipt?.paymentMethod
    ? String(latestReceipt.paymentMethod).toUpperCase()
    : payment.paymentMethod
      ? String(payment.paymentMethod).toUpperCase()
      : 'N/A';

  const result = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: resident.email,
    subject: isPartial ? 'VIMS Partial Payment Receipt - Monthly Dues' : 'VIMS Payment Confirmed - Monthly Dues',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
      <h2 style="color:#2e6b2e">${isPartial ? 'Partial Payment Receipt' : 'Payment Confirmed'}</h2>
      <p>Hello ${safeFirstName},</p>
      <p>Your ${isPartial ? 'partial payment' : 'payment'} to <strong>WESTVILLE CASIMIRO Bacoor City, Cavite, Philippines</strong> for your <strong>Monthly Dues</strong> has been approved by the admin.</p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:16px 0">
        <tbody>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Invoice</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(invoiceNumber)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Amount paid</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(amount)}</td></tr>
          ${creditedAmount > 0 ? `<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Credit added</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(creditText)}</td></tr>` : ''}
          ${isPartial ? `<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Remaining balance</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(remainingBalance)}</td></tr>` : ''}
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Due date</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(dueDate)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Paid date</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(paymentDate)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Method</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(paymentMethod)}</td></tr>
          <tr><td style="padding:10px;font-weight:bold">Receipt</td><td style="padding:10px">${escapeHtml(receiptNumber)}</td></tr>
        </tbody>
      </table>
      <p>${creditedAmount > 0 ? `Your excess payment of ${escapeHtml(creditText)} was saved as credit for future dues.` : isPartial ? 'Your invoice remains open until the remaining balance is fully paid.' : 'Thank you for keeping your dues updated.'}</p>
    </div>`,
    text: `Hello ${firstName},\n\nYour ${isPartial ? 'partial payment' : 'payment'} to WESTVILLE CASIMIRO Bacoor City, Cavite, Philippines for your Monthly Dues has been approved by the admin.\n\nInvoice: ${invoiceNumber}\nAmount paid: ${amount}${creditedAmount > 0 ? `\nCredit added: ${creditText}` : ''}${isPartial ? `\nRemaining balance: ${remainingBalance}` : ''}\nDue date: ${dueDate}\nPaid date: ${paymentDate}\nMethod: ${paymentMethod}\nReceipt: ${receiptNumber}\n\n${creditedAmount > 0 ? `Your excess payment of ${creditText} was saved as credit for future dues.` : isPartial ? 'Your invoice remains open until the remaining balance is fully paid.' : 'Thank you for keeping your dues updated.'}`
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
  sendPaymentReminderEmail,
  sendPaymentConfirmationEmail
};
