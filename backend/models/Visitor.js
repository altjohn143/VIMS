const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  visitorName: {
    type: String,
    required: [true, 'Visitor name is required'],
    trim: true
  },
  
  visitorPhone: {
    type: String,
    required: [true, 'Visitor phone is required'],
    trim: true
  },
  
  vehicleNumber: {
    type: String,
    default: ''
  },
  
  purpose: {
    type: String,
    required: [true, 'Purpose of visit is required'],
    trim: true
  },

  qrCode: {
    type: String,
    required: true,
    unique: true
  },

  qrToken: {
    type: String,
    required: true,
    unique: true
  },

  expectedArrival: {
    type: Date,
    required: true
  },
  
  expectedDeparture: {
    type: Date,
    required: true
  },
  
  actualEntry: {
    type: Date
  },
  
  actualExit: {
    type: Date
  },

  residentEntryConfirmedAt: {
    type: Date
  },

  residentDepartureConfirmedAt: {
    type: Date
  },

  overstayNotifiedAt: {
    type: Date
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  rejectionReason: {
    type: String,
    default: ''
  },

  qrCodeVisible: {
    type: Boolean,
    default: false
  },

    overrideReason: {
    type: String,
    default: ''
  },
  
  adminNotes: {
    type: String,
    default: ''
  },
  
  auditTrail: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    previousStatus: String,
    newStatus: String,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  exportFlag: {
    type: Boolean,
    default: false
  },

  securityNotes: {
    type: String,
    default: ''
  }
  
}, {
  timestamps: true
});

const Visitor = mongoose.model('Visitor', visitorSchema);
module.exports = Visitor;