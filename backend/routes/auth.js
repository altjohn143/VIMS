// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (user) => {
  return Buffer.from(JSON.stringify({
    id: user._id,
    email: user.email,
    role: user.role,
    timestamp: Date.now()
  })).toString('base64');
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
        query = { houseNumber: value };
        break;
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

// Register route - Residents require approval
router.post('/register', async (req, res) => {
  try {
    console.log('\n===== REGISTRATION ATTEMPT =====');
    console.log('📝 Email:', req.body.email);
    console.log('📝 Role from request:', req.body.role);
    
    const { firstName, lastName, email, phone, password, role, houseNumber } = req.body;

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
    // CRITICAL: This determines approval status
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
      isApproved: isApproved, // This should be false for residents
    };

    // Add houseNumber only for residents
    if (userRole === 'resident') {
      if (!houseNumber) {
        return res.status(400).json({
          success: false,
          error: 'House number is required for residents'
        });
      }
      userData.houseNumber = houseNumber;
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
      fromDatabase: await User.findById(user._id).select('isApproved role email')
    });

    // Remove password from output
    user.password = undefined;

    // Generate token (only useful if approved, but we'll send it anyway)
    const token = generateToken(user);
    
    // Different message based on approval status
    const message = user.isApproved 
      ? 'Registration successful! You can now login.'
      : 'Registration successful! Your account is pending admin approval. You will be able to login once approved.';

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
        isApproved: user.isApproved
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

// Login route - Check if user is approved
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

    // Find user and include password field
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

    // Check if account is active
    if (!user.isActive) {
      console.log('Account is deactivated:', email);
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact admin.'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // CRITICAL: Check if user is approved
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

    // Remove password from output
    user.password = undefined;

    // Generate token
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
        isApproved: user.isApproved,
        isActive: user.isActive
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
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Update password
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
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    try {
      // Decode token (simple base64 decode)
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Check if user is approved
      if (!user.isApproved) {
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
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          houseNumber: user.houseNumber,
          isApproved: user.isApproved,
          isActive: user.isActive
        }
      });
      
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
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
      // Don't reveal that user doesn't exist
      return res.json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link.'
      });
    }
    
    // In a real app, you would send an email here
    // For now, just log it
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
    const users = await User.find({}).select('email role isApproved createdAt');
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