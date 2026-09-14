const mongoose = require('mongoose');
require('dotenv').config();

const Payment = require('../models/Payment');

const DAILY_OVERDUE_PENALTY = 10;
const PAYMENT_TIME_ZONE = 'Asia/Manila';
const APPLY_CHANGES = process.argv.includes('--apply');

function startOfDay(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PAYMENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return new Date(Date.UTC(values.year, Number(values.month) - 1, values.day));
}

function expectedPenalty(payment, today) {
  const dueDate = startOfDay(payment.dueDate);
  const overdueDays = Math.max(0, Math.floor((today - dueDate) / (24 * 60 * 60 * 1000)));
  return overdueDays * DAILY_OVERDUE_PENALTY;
}

async function repairOverchargedPenalties() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGODB_URI or MONGO_URI must be set to repair production payment records');
  }

  await mongoose.connect(uri);
  const today = startOfDay(new Date());
  const payments = await Payment.find({
    status: 'pending',
    paymentType: 'monthly_dues',
    dueDate: { $lt: today }
  });

  const repairs = payments
    .map((payment) => {
      const currentPenalty = Number(payment.penaltyAmount || 0);
      const correctedPenalty = expectedPenalty(payment, today);
      if (currentPenalty <= correctedPenalty) return null;

      const paidAmount = Number(payment.paidAmount || 0);
      const baseAmount = payment.originalAmount == null
        ? Math.max(0, Number(payment.amount || 0) - currentPenalty + paidAmount)
        : Number(payment.originalAmount);

      return {
        id: payment._id,
        invoiceNumber: payment.invoiceNumber,
        currentPenalty,
        correctedPenalty,
        update: {
          penaltyAmount: correctedPenalty,
          amount: Math.max(0, baseAmount + correctedPenalty - paidAmount),
          lastPenaltyCalculatedAt: today
        }
      };
    })
    .filter(Boolean);

  if (!repairs.length) {
    console.log('No overcharged overdue monthly-dues payments found.');
    return;
  }

  console.table(repairs.map(({ invoiceNumber, currentPenalty, correctedPenalty }) => ({
    invoiceNumber,
    currentPenalty,
    correctedPenalty
  })));

  if (!APPLY_CHANGES) {
    console.log(`Dry run: ${repairs.length} payment(s) would be repaired. Re-run with --apply to save changes.`);
    return;
  }

  await Payment.bulkWrite(repairs.map(({ id, update }) => ({
    updateOne: { filter: { _id: id }, update: { $set: update } }
  })));
  console.log(`Repaired ${repairs.length} overcharged payment penalty record(s).`);
}

repairOverchargedPenalties()
  .catch((error) => {
    console.error('Payment penalty repair failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
