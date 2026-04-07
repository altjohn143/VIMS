const mongoose = require('mongoose');

const patrolLogSchema = new mongoose.Schema(
  {
    officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    area: { type: String, required: true, trim: true, maxlength: 120 },
    checkpoint: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['completed', 'issue_found'], default: 'completed' },
    loggedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PatrolLog', patrolLogSchema);
