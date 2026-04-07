const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    email: { type: String, default: null },
    role: { type: String, default: null },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    durationMs: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
