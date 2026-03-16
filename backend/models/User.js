const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters']
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  role: {
    type: String,
    enum: ['resident', 'admin', 'security'],
    default: 'resident'
  },
  
  houseNumber: {
    type: String,
    required: function() { return this.role === 'resident'; }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // FIXED: Change default to false for residents
  isApproved: {
    type: Boolean,
    default: false  // Changed from true to false
  },

  profileComplete: {
    type: Boolean,
    default: false
  },

  emergencyContact: {
    name: String,
    phone: String
  },

  vehicles: [{
    plateNumber: String,
    make: String,
    model: String,
    color: String
  }],

  familyMembers: [{
    name: String,
    relationship: String,
    age: Number,
    phone: String
  }]

}, {
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);
module.exports = User;