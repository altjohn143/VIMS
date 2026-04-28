const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  phase: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true,
    index: true
  },
  block: {
    type: String,
    required: true
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
  }
}, {
  timestamps: true
});

const Lot = mongoose.model('Lot', lotSchema);
module.exports = Lot;