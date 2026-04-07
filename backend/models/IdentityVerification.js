const mongoose = require('mongoose');

const identityVerificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    documentType: { type: String, default: 'valid_id' },
    frontImage: { type: String, default: null },
    backImage: { type: String, default: null },
    selfieImage: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending_upload', 'queued_ai', 'ai_processing', 'ai_flagged', 'manual_review', 'approved', 'rejected'],
      default: 'pending_upload'
    },
    aiResult: {
      score: { type: Number, default: null },
      ocrName: { type: String, default: '' },
      ocrDob: { type: String, default: '' },
      flags: [{ type: String }],
      providerRaw: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: '' },
    rejectReason: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('IdentityVerification', identityVerificationSchema);
