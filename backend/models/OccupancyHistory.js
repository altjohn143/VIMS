const mongoose = require('mongoose');

const occupancyHistorySchema = new mongoose.Schema(
  {
    lotId: { type: String, required: true },
    residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: {
      type: String,
      enum: ['move_in', 'move_out', 'status_update'],
      required: true
    },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, default: null },
    reason: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('OccupancyHistory', occupancyHistorySchema);
