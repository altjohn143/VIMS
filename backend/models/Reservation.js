const mongoose = require('mongoose');

const reservationItemSchema = new mongoose.Schema({
  resourceType: {
    type: String,
    enum: ['venue', 'equipment'],
    required: true,
  },
  resourceName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  }
}, { _id: false });

const reservationSchema = new mongoose.Schema(
  {
    // Support both single item (legacy) and multiple items (new)
    resourceType: {
      type: String,
      enum: ['venue', 'equipment'],
    },
    resourceName: {
      type: String,
    },
    
    // New: array of items for multiple item reservations
    items: [reservationItemSchema],
    
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
      enum: ['pending', 'confirmed', 'cancelled', 'borrowed', 'return_initiated', 'returned'],
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
    returnInitiatedAt: {
      type: Date,
    },
    itemReceivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    itemReceivedAt: {
      type: Date,
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
