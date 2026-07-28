const mongoose = require('mongoose');

const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  purpose: {
    type: String,
    required: true,
    enum: ['registration', 'password_reset', 'password_change'],
    index: true
  },
  codeHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model('EmailOtp', emailOtpSchema);
