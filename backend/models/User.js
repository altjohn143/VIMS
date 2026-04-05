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
  
  houseBlock: {
    type: String,
    required: function() { return this.role === 'resident'; }
  },
  
  houseLot: {
    type: String,
    required: function() { return this.role === 'resident'; }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isApproved: {
    type: Boolean,
    default: false
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

// 🔧 FIXED: Only hash plain text passwords, skip if already hashed
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  // Check if password is already a bcrypt hash (starts with $2a$ or $2b$)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    console.log('✅ Password already hashed, skipping...');
    return next();
  }
  
  try {
    console.log('🔐 Hashing plain text password...');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔍 Comparing password for user:', this.email);
    
    // Make sure we have the password
    if (!this.password) {
      console.error('❌ No password found in user object');
      return false;
    }
    
    console.log('📊 Stored hash length:', this.password.length);
    console.log('📊 Candidate password length:', candidatePassword.length);
    
    // Use bcrypt to compare
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('✅ Password comparison result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');
    return isMatch;
  } catch (error) {
    console.error('❌ Error comparing passwords:', error);
    return false;
  }
};

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);
module.exports = User;