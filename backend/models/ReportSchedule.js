const mongoose = require('mongoose');

const reportScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    reportType: { type: String, enum: ['service_requests', 'visitors', 'payments'], required: true },
    recipients: [{ type: String }],
    cron: { type: String, default: '0 8 * * 1' },
    enabled: { type: Boolean, default: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastRunAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReportSchedule', reportScheduleSchema);
