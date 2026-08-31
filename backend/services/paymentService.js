const Payment = require('../models/Payment');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { createInAppNotification } = require('./inAppNotificationService');

const MONTHLY_DUES_AMOUNT_KEY = 'monthly_dues_amount';
const DAILY_OVERDUE_PENALTY = 10;

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function parsePesoAmount(value) {
  const normalized = String(value || '').replace(/[^\d.]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function getOutstandingAmount(payment) {
  const baseAmount = Number(payment.originalAmount ?? payment.amount ?? 0);
  const paidAmount = Number(payment.paidAmount || 0);
  const penaltyAmount = Number(payment.penaltyAmount || 0);
  return Math.max(0, baseAmount + penaltyAmount - paidAmount);
}

function syncPaymentAmounts(payment) {
  if (payment.originalAmount == null && typeof payment.isModified === 'function') {
    payment.originalAmount = Number(payment.amount || 0);
  }
  payment.amount = getOutstandingAmount(payment);
}

async function applyDailyPenalty(payment) {
  if (!payment || payment.status !== 'pending' || !payment.dueDate || payment.paymentType !== 'monthly_dues') {
    return payment;
  }

  const today = startOfDay(new Date());
  const dueDate = startOfDay(payment.dueDate);
  if (today <= dueDate) {
    syncPaymentAmounts(payment);
    return payment;
  }

  const lastCalculated = payment.lastPenaltyCalculatedAt
    ? startOfDay(payment.lastPenaltyCalculatedAt)
    : dueDate;
  const daysToCharge = Math.floor((today - lastCalculated) / (24 * 60 * 60 * 1000));
  if (daysToCharge > 0) {
    payment.penaltyAmount = Number(payment.penaltyAmount || 0) + (daysToCharge * DAILY_OVERDUE_PENALTY);
    payment.lastPenaltyCalculatedAt = today;
  }
  syncPaymentAmounts(payment);
  if (payment.isModified()) await payment.save();
  return payment;
}

async function applyDailyPenalties(payments) {
  await Promise.all(payments.map(payment => applyDailyPenalty(payment)));
  return payments;
}

async function getMonthlyDuesAmount() {
  const setting = await Setting.findOne({ key: MONTHLY_DUES_AMOUNT_KEY });
  return typeof setting?.value === 'number' ? setting.value : 500;
}

async function setMonthlyDuesAmount(amount) {
  return await Setting.findOneAndUpdate(
    { key: MONTHLY_DUES_AMOUNT_KEY },
    { value: amount, description: 'Default monthly dues amount for association dues.' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function applyResidentCreditToPayment(resident, payment) {
  const creditBalance = Number(resident.paymentCreditBalance || 0);
  if (creditBalance <= 0) return payment;

  syncPaymentAmounts(payment);
  const outstanding = getOutstandingAmount(payment);
  if (outstanding <= 0) return payment;

  const creditApplied = Math.min(creditBalance, outstanding);
  payment.paidAmount = Number(payment.paidAmount || 0) + creditApplied;
  payment.paymentHistory.push({
    amount: creditApplied,
    paymentMethod: 'credit',
    referenceNumber: '',
    receiptNumber: `CR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    notes: 'Applied resident overpayment credit to this invoice'
  });
  syncPaymentAmounts(payment);
  payment.status = getOutstandingAmount(payment) <= 0 ? 'paid' : 'pending';
  resident.paymentCreditBalance = creditBalance - creditApplied;
  await Promise.all([payment.save(), resident.save()]);
  return payment;
}

async function createMonthlyDuesForResident(resident, targetMonth, targetYear) {
  const dueDay = 10;
  const defaultInclusions = ['Maintenance', 'Security', 'Garbage', 'Common Area Upkeep', 'Administrative fees'];

  const existingDues = await Payment.findOne({
    residentId: resident._id,
    paymentType: 'monthly_dues',
    'billingPeriod.month': targetMonth,
    'billingPeriod.year': targetYear
  });

  if (existingDues) {
    return existingDues;
  }

  const monthlyDuesAmount = await getMonthlyDuesAmount();

  const payment = await Payment.create({
    residentId: resident._id,
    amount: monthlyDuesAmount,
    originalAmount: monthlyDuesAmount,
    paymentType: 'monthly_dues',
    status: 'pending',
    dueDate: new Date(targetYear, targetMonth - 1, dueDay),
    billingPeriod: { month: targetMonth, year: targetYear },
    description: `Monthly Association Dues - ${new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })} ${targetYear}`,
    notes: 'Includes Maintenance, Security, Garbage, Common Area Upkeep, and Administrative fees.',
    inclusions: defaultInclusions
  });
  return payment;
}

function hasSubmittedPaymentForReview(payment) {
  return Boolean(
    payment.referenceNumber ||
    payment.transactionId ||
    payment.paymongoSessionId ||
    payment.paymongoSourceId
  );
}

async function notifyAdminsOfPaymentTransaction({ title, body, metadata = {} }) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await Promise.allSettled(admins.map((admin) => createInAppNotification({
    userId: admin._id,
    type: 'payment',
    title,
    body,
    metadata
  })));
}

async function notifyResidentOfPaymentTransaction(payment, { title, body, metadata = {} }) {
  await createInAppNotification({
    userId: payment.residentId,
    type: 'payment',
    title,
    body,
    metadata: { paymentId: payment._id, ...metadata }
  });
}

module.exports = {
  applyDailyPenalty,
  applyDailyPenalties,
  applyResidentCreditToPayment,
  createMonthlyDuesForResident,
  getMonthlyDuesAmount,
  getOutstandingAmount,
  hasSubmittedPaymentForReview,
  notifyAdminsOfPaymentTransaction,
  notifyResidentOfPaymentTransaction,
  parsePesoAmount,
  setMonthlyDuesAmount,
  syncPaymentAmounts
};
