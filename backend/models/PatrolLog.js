const mongoose = require('mongoose');

const patrolLogSchema = new mongoose.Schema(
  {
    officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    phase: { type: Number, min: 1, max: 5, required: true },
    area: { type: String, required: true, trim: true, maxlength: 120 },
    checkpoint: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, default: '' },
    status: { 
      type: String, 
      enum: ['completed', 'issue_found', 'nothing_found'], 
      default: 'completed' 
    },
    findings: [{
      type: { type: String, enum: ['security', 'maintenance', 'safety', 'other'], default: 'other' },
      description: { type: String, trim: true },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' }
    }],
    loggedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PatrolLog', patrolLogSchema);
