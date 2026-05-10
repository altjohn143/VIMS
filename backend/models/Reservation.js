const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      enum: ['venue', 'equipment'],
      required: true,
    },
    resourceName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'borrowed', 'returned'],
      default: 'pending',
    },
    actualCheckout: {
      type: Date,
    },
    actualReturn: {
      type: Date,
    },
    returnCondition: {
      type: String,
      default: '',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledReason: {
      type: String,
      default: ''
    },
    issueNotes: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);
