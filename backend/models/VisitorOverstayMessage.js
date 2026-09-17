const mongoose = require('mongoose');

const visitorOverstayMessageSchema = new mongoose.Schema({
  visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', required: true, index: true },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  securityId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderRole: { type: String, enum: ['resident', 'security'], required: true },
  body: { type: String, required: true, trim: true, maxlength: 1500 },
  // Read by the recipient only; the sender never contributes to the badge.
  readAt: { type: Date, default: null }
}, { timestamps: true });

visitorOverstayMessageSchema.index({ visitorId: 1, createdAt: 1 });
module.exports = mongoose.model('VisitorOverstayMessage', visitorOverstayMessageSchema);
