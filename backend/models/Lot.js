const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  phase: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true,
    index: true
  },
  block: {
    type: Number,
    enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    required: true,
    index: true
  },
  lotId: {
    type: String,
    required: true,
    unique: true
  },
  lotNumber: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['vacant', 'occupied', 'reserved'],
    default: 'vacant'
  },
  type: {
    type: String,
    default: 'Single Family'
  },
  sqm: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    default: null
  },
  address: {
    type: String,
    required: true
  },
  features: [{
    type: String
  }],
  occupiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  occupiedAt: {
    type: Date,
    default: null
  },
  photoSeed: {
    type: Number,
    default: 0
  },
  mapPosition: {
    isPositioned: {
      type: Boolean,
      default: false
    },
    left: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    top: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    width: {
      type: Number,
      min: 0.1,
      max: 20,
      default: null
    },
    height: {
      type: Number,
      min: 0.1,
      max: 20,
      default: null
    },
    rotate: {
      type: Number,
      min: -180,
      max: 180,
      default: 0
    },
    shape: {
      type: String,
      enum: ['rectangle'],
      default: 'rectangle'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

const Lot = mongoose.model('Lot', lotSchema);
module.exports = Lot;
