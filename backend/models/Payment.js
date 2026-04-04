// backend/models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceNumber: { type: String, unique: true, sparse: true },
  amount: { type: Number, required: true, min: 0 },
  paymentType: { type: String, enum: ['monthly_dues', 'special_assessment', 'service_fee', 'penalty', 'other'], default: 'monthly_dues' },
  paymentMethod: { type: String, enum: ['gcash', 'paymaya', 'qrph', 'cash', 'bank_transfer', 'check'], default: null },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  referenceNumber: { type: String, unique: true, sparse: true },
  transactionId: { type: String, sparse: true },
  paymentDate: { type: Date },
  dueDate: { type: Date, required: true },
  billingPeriod: { month: Number, year: Number },
  receiptNumber: { type: String, sparse: true },
  receiptImage: { type: String, default: null }, // Added: stores the filename of uploaded receipt
  description: { type: String },
  notes: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  overdueReminderSent: { type: Boolean, default: false },
  // PayMongo integration fields
  paymongoSessionId: { type: String, sparse: true },
  paymongoSourceId: { type: String, sparse: true }
}, { timestamps: true });

paymentSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Payment').countDocuments();
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;