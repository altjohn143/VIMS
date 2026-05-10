const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'carpentry', 'cleaning', 'gardening', 'security', 'other'],
    required: true
  },
  
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'urgent'],
    default: 'medium'
  },
  
  location: {
    type: String,
    default: ''
  },
  
  status: {
    type: String,
    enum: ['pending', 'under-review', 'assigned', 'in-progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  assignedAt: {
    type: Date
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  reviewedAt: {
    type: Date
  },
  
  adminNotes: {
    type: String,
    default: ''
  },
  
  estimatedCost: {
    type: Number,
    default: 0
  },
  
  estimatedCompletion: {
    type: Date
  },

  completedAt: {
    type: Date
  },
  
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  cancelledAt: {
    type: Date
  },

  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  cancelledReason: {
    type: String,
    default: ''
  },

  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  feedback: {
    type: String
  },
  
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date
  }],
  
  // Archive fields
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  archivedReason: {
    type: String,
    default: ''
  }
  
}, {
  timestamps: true
});

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
module.exports = ServiceRequest;