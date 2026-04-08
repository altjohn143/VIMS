const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    location: { type: String, trim: true, default: '' },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'investigating', 'resolved'], default: 'open' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    occurredAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    resolutionNotes: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
