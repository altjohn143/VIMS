const mongoose = require('mongoose');

const identityVerificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    /** Snapshot at upload time so the admin queue still shows identity if the User doc is removed later */
    residentEmail: { type: String, default: '' },
    residentDisplayName: { type: String, default: '' },
    documentType: { type: String, default: 'valid_id' },
    frontImage: { type: String, default: null },
    backImage: { type: String, default: null },
    selfieImage: { type: String, default: null },
    /** True once front/back ID passed automated checks (OCR/AI). Does NOT grant login — User.isApproved does. */
    documentsVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        'pending_upload',
        'queued_ai',
        'ai_processing',
        'ai_flagged',
        'manual_review',
        'documents_verified',
        'approved',
        'rejected'
      ],
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
