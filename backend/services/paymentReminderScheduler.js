const Payment = require('../models/Payment');
const { sendPaymentReminderEmail } = require('./notificationService');

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function hasSubmittedPaymentForReview(payment) {
  return Boolean(
    payment.receiptImage ||
    payment.referenceNumber ||
    payment.transactionId ||
    payment.paymongoSessionId ||
    payment.paymongoSourceId
  );
}

class PaymentReminderScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Payment reminder scheduler started');

    this.intervalId = setInterval(async () => {
      try {
        await this.sendDueTomorrowReminders();
      } catch (error) {
        console.error('Payment reminder scheduler error:', error);
      }
    }, 60 * 60 * 1000);

    this.sendDueTomorrowReminders().catch(error => {
      console.error('Payment reminder scheduler startup error:', error);
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Payment reminder scheduler stopped');
  }

  async sendDueTomorrowReminders() {
    const tomorrowStart = startOfDay(new Date());
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const payments = await Payment.find({
      status: 'pending',
      dueReminderSent: { $ne: true },
      dueDate: { $gte: tomorrowStart, $lt: tomorrowEnd }
    }).populate('residentId', 'email firstName lastName');

    const remindersByResident = new Map();

    for (const payment of payments) {
      if (hasSubmittedPaymentForReview(payment)) continue;
      if (!payment.residentId?.email) continue;

      const residentKey = String(payment.residentId.email).toLowerCase();
      if (!remindersByResident.has(residentKey)) {
        remindersByResident.set(residentKey, {
          resident: payment.residentId,
          payments: []
        });
      }
      remindersByResident.get(residentKey).payments.push(payment);
    }

    let sent = 0;
    for (const { resident, payments: residentPayments } of remindersByResident.values()) {
      try {
        const result = await sendPaymentReminderEmail(residentPayments, resident, {
          timing: 'due_tomorrow'
        });
        if (!result.sent) {
          console.warn(`Due tomorrow reminder skipped for ${resident.email}: ${result.reason}`);
          continue;
        }

        await Payment.updateMany(
          { _id: { $in: residentPayments.map(payment => payment._id) } },
          { $set: { dueReminderSent: true, dueReminderSentAt: new Date() } }
        );
        sent++;
      } catch (error) {
        console.error(`Failed to send due tomorrow reminder for ${resident.email}:`, error.message);
      }
    }

    if (sent > 0) {
      console.log(`Sent due tomorrow payment reminders to ${sent} resident${sent === 1 ? '' : 's'}`);
    }

    return { sent };
  }
}

module.exports = new PaymentReminderScheduler();
