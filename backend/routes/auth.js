// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Lot = require('../models/Lot');
const { protect } = require('../middleware/auth');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

// Check availability route
router.post('/check-availability', async (req, res) => {
  try {
    const { type, value } = req.body;
    
    if (!type || !value) {
      return res.status(400).json({
        success: false,
        error: 'Type and value are required'
      });
    }
    
    let query = {};
    
    switch(type) {
      case 'email':
        query = { email: value.toLowerCase() };
        break;
      case 'phone':
        query = { phone: value };
        break;
      case 'house':
        // For house, value format is "BLOCK-LOT"
        const parts = value.split('-');
        if (parts.length === 2) {
          const block = parts[0];
          const lot = parts[1];
          query = { houseBlock: block, houseLot: lot };
        } else {
          return res.json({ success: true, available: true });
        }
        break;
      case 'lot':
        // Check if lot is available in the Lots collection
        const foundLot = await Lot.findOne({ lotId: value });
        if (!foundLot) {
          return res.json({ success: true, available: false, error: 'Invalid lot number' });
        }
        return res.json({ success: true, available: foundLot.status === 'vacant', lotDetails: foundLot });
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid check type'
        });
    }
    
    const existingUser = await User.findOne(query);
    
    res.json({
      success: true,
      available: !existingUser,
      exists: !!existingUser
    });
    
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    console.log('\n===== REGISTRATION ATTEMPT =====');
    console.log('📝 Email:', req.body.email);
    console.log('📝 Role from request:', req.body.role);
    
    const { firstName, lastName, email, phone, password, role, selectedLot } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      console.log('Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Set isApproved based on role
    const userRole = role || 'resident';
    const isApproved = userRole === 'admin' || userRole === 'security';
    
    console.log('⚙️ Registration settings:', {
      role: userRole,
      isApproved: isApproved,
      needsApproval: userRole === 'resident',
      isResident: userRole === 'resident'
    });

    // Prepare user data
    const userData = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password,
      role: userRole,
      isApproved: isApproved,
    };

    // Add house information for residents using selected lot
    if (userRole === 'resident') {
      if (!selectedLot) {
        return res.status(400).json({
          success: false,
          error: 'Please select a lot from the available lots'
        });
      }
      
      // Verify the lot is still available
      const lot = await Lot.findOne({ lotId: selectedLot });
      if (!lot) {
        return res.status(400).json({
          success: false,
          error: 'Invalid lot selected'
        });
      }
      
      if (lot.status !== 'vacant') {
        return res.status(400).json({
          success: false,
          error: 'This lot is no longer available. Please select another lot.'
        });
      }
      
      // Extract block and lot number from lotId (format: "A-1")
      const lotParts = selectedLot.split('-');
      if (lotParts.length === 2) {
        const houseBlock = lotParts[0];
        const houseLot = lotParts[1];
        
        userData.houseBlock = houseBlock;
        userData.houseLot = houseLot;
        userData.houseNumber = selectedLot;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid lot format'
        });
      }
    }

    console.log('User data being saved:', {
      ...userData,
      password: '[HIDDEN]'
    });

    // Create user
    const user = await User.create(userData);
    
    console.log('User created in database:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      houseBlock: user.houseBlock,
      houseLot: user.houseLot,
      fromDatabase: await User.findById(user._id).select('isApproved role email')
    });

    // Remove password from output
    user.password = undefined;

    // Generate token
    const token = generateToken(user);
    
    const message = user.isApproved 
      ? 'Registration successful! You can now login.'
      : 'Registration successful! Your account is pending admin approval. Once approved, your selected lot will be reserved for you.';

    console.log('Response message:', message);
    console.log('===== REGISTRATION COMPLETE =====\n');

    res.status(201).json({
      success: true,
      message,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        houseNumber: user.houseNumber,
        houseBlock: user.houseBlock,
        houseLot: user.houseLot,
        isApproved: user.isApproved,
        profileComplete: user.profileComplete
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('\n ===== LOGIN ATTEMPT =====');
    console.log('Email:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    console.log('User found in database:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      isActive: user.isActive
    });

    if (!user.isActive) {
      console.log('Account is deactivated:', email);
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact admin.'
      });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    console.log('Checking approval status:', {
      isApproved: user.isApproved,
      willAllow: user.isApproved ? 'YES - Login allowed' : 'NO - Login blocked'
    });
    
    if (!user.isApproved) {
      console.log('⏳ User not approved yet - BLOCKING LOGIN:', email);
      return res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval. Please wait for approval before logging in.',
        requiresApproval: true,
        isApproved: false
      });
    }
    
    console.log('Login successful for:', email);

    user.password = undefined;

    const token = generateToken(user);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        houseNumber: user.houseNumber,
        houseBlock: user.houseBlock,
        houseLot: user.houseLot,
        isApproved: user.isApproved,
        isActive: user.isActive,
        profileComplete: user.profileComplete
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  } finally {
    console.log('===== LOGIN COMPLETE =====\n');
  }
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }
    
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    console.log('Password changed for user:', user.email);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    if (!req.user.isApproved) {
      return res.status(403).json({
        success: false,
        error: 'Account pending approval',
        requiresApproval: true,
        isApproved: false
      });
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role,
        houseNumber: req.user.houseNumber,
        houseBlock: req.user.houseBlock,
        houseLot: req.user.houseLot,
        isApproved: req.user.isApproved,
        isActive: req.user.isActive,
        profileComplete: req.user.profileComplete
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user'
    });
  }
});

// Forgot password request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link.'
      });
    }
    
    console.log('Password reset requested for:', email);
    
    res.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link.'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
});

// Test route to check approval status
router.get('/check-status/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status'
    });
  }
});

// Debug route to check all users
router.get('/debug/all-users', async (req, res) => {
  try {
    const users = await User.find({}).select('email role isApproved createdAt houseBlock houseLot');
    res.json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;