// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Lot = require('../models/Lot');
const IdentityVerification = require('../models/IdentityVerification');
const { protect } = require('../middleware/auth');
const { sendOnboardingNotification } = require('../services/notificationService');
const { detectDuplicateIdentity } = require('../services/duplicateIdentityService');
const { createInAppNotification } = require('../services/inAppNotificationService');

const resend = new Resend(process.env.RESEND_API_KEY);

// SECURITY: Input validation schemas
const emailSchema = Joi.string().email().lowercase().trim().max(254);
const passwordSchema = Joi.string()
  .min(12)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .message('Password must be at least 12 characters and contain uppercase, lowercase, number, and special character');
const phoneSchema = Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20);

const LOGIN_LIMIT_WINDOW_MINUTES = Number(process.env.LOGIN_LIMIT_WINDOW_MINUTES || 15);
const LOGIN_LIMIT_MAX_ATTEMPTS = Number(process.env.LOGIN_LIMIT_MAX_ATTEMPTS || 10);

const loginLimiter = rateLimit({
  windowMs: LOGIN_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: LOGIN_LIMIT_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Too many login attempts. Please try again in ${LOGIN_LIMIT_WINDOW_MINUTES} minutes.`
  }
});

// Configure multer for profile photo uploads
const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profile-photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `registration_${uniqueSuffix}_${file.originalname}`);
  }
});

const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    {
      expiresIn: process.env.NODE_ENV === 'production' ? '1h' : '8h', // 1 hour in production
      issuer: 'vims-backend',
      audience: 'vims-frontend'
    }
  );
};

const buildProfilePhotoUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/uploads/profile-photos/${filename}`;
};

const getFallbackLots = async () => {
  const lots = await Lot.find({ status: 'vacant' })
    .select('lotId block lotNumber type sqm price status')
    .sort({ block: 1, lotNumber: 1 })
    .limit(10);
  return lots;
};

// Check availability route - SECURITY: Fixed NoSQL injection
router.post('/check-availability', async (req, res) => {
  try {
    const { type, value } = req.body;

    if (!type || !value) {
      return res.status(400).json({
        success: false,
        error: 'Type and value are required'
      });
    }

    // SECURITY: Validate input to prevent NoSQL injection
    let query = {};
    switch(type) {
      case 'email':
        const { error: emailError, value: emailValue } = emailSchema.validate(value);
        if (emailError) {
          return res.status(400).json({
            success: false,
            error: 'Invalid email format'
          });
        }
        query = { email: emailValue };
        break;
      case 'phone':
        const { error: phoneError, value: phoneValue } = phoneSchema.validate(value);
        if (phoneError) {
          return res.status(400).json({
            success: false,
            error: 'Invalid phone format'
          });
        }
        query = { phone: phoneValue };
        break;
      case 'house':
        // For house, value format is "BLOCK-LOT"
        const parts = value.split('-');
        if (parts.length === 2) {
          const block = parts[0].toUpperCase();
          const lot = parseInt(parts[1]);
          if (!/^[A-Z]$/.test(block) || isNaN(lot) || lot < 1 || lot > 99) {
            return res.json({ success: true, available: true });
          }
          query = { houseBlock: block, houseLot: lot };
        } else {
          return res.json({ success: true, available: true });
        }
        break;
      case 'lot':
        // Check if lot is available in the Lots collection
        if (!/^[A-Z]-\d+$/.test(value)) {
          return res.json({ success: true, available: false, error: 'Invalid lot format' });
        }
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
router.post('/register', profilePhotoUpload.single('profilePhoto'), async (req, res) => {
  try {
    console.log('\n===== REGISTRATION ATTEMPT =====');
    console.log('📝 Email:', req.body.email);
    console.log('📝 Role from request:', req.body.role);
    
    const {
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      email,
      phone,
      password,
      role,
      selectedLot,
      vehicles = [],
      familyMembers = [],
      noVehicles = false
    } = req.body;

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

    if (req.body.idNumber) {
      const duplicate = await detectDuplicateIdentity({ idNumber: req.body.idNumber, excludeUserId: null });
      if (duplicate.found) {
        console.log('Duplicate ID detected during registration:', req.body.idNumber);
        return res.status(409).json({
          success: false,
          error: duplicate.reason || 'This identity document is already linked to an existing resident account.'
        });
      }
    }

    // Security hardening: self-registration is resident-only.
    const userRole = 'resident';
    const isApproved = false;
    
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
      ...(typeof middleName === 'string' && middleName.trim() ? { middleName: middleName.trim() } : {}),
      ...(typeof dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())
        ? { dateOfBirth: dateOfBirth.trim() }
        : {}),
      email: email.toLowerCase(),
      phone,
      password,
      role: userRole,
      isApproved: isApproved,
    };

    // Debug: show received profile photo upload details
    console.log('📸 Register request file payload:', {
      file: req.file
        ? {
            originalname: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            destination: req.file.destination,
            path: req.file.path
          }
        : null
    });

    // Handle profile photo upload
    if (req.file) {
      console.log('📸 Profile photo uploaded and stored at:', path.join(__dirname, '../uploads/profile-photos', req.file.filename));
      userData.profilePhoto = req.file.filename;
    }

    // Add house information for residents using selected lot
    if (userRole === 'resident') {
      if (!selectedLot) {
        const fallbackLots = await getFallbackLots();
        return res.status(400).json({
          success: false,
          error: 'Please select a lot from the available lots',
          fallbackLots
        });
      }
      
      // Verify the lot is still available
      const lot = await Lot.findOne({ lotId: selectedLot });
      if (!lot) {
        const fallbackLots = await getFallbackLots();
        return res.status(400).json({
          success: false,
          error: 'Invalid lot selected',
          fallbackLots
        });
      }
      
      if (lot.status !== 'vacant') {
        const fallbackLots = await getFallbackLots();
        return res.status(400).json({
          success: false,
          error: 'This lot is no longer available. Please select another lot.',
          fallbackLots
        });
      }
      
      // Extract phase, block and lot number from lotId (format: "P{phase}-B{block}-L{lotNumber}", e.g., "P1-B2-L23")
      const lotIdPattern = /^P(\d+)-B(\d+)-L(\d+)$/;
      const match = selectedLot.match(lotIdPattern);
      
      if (match) {
        const phase = match[1];
        const block = match[2];
        const lotNum = match[3];
        
        userData.houseBlock = block;
        userData.houseLot = lotNum;
        userData.houseNumber = selectedLot;
        userData.address = `Phase ${phase} - Block ${block} - Lot ${lotNum}`;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid lot format'
        });
      }

      const validVehicles = noVehicles
        ? []
        : Array.isArray(vehicles)
          ? vehicles.filter(v => v && (v.plateNumber || v.make || v.model || v.color))
          : [];

      const validFamilyMembers = Array.isArray(familyMembers)
        ? familyMembers.filter(m => m && (m.name || m.relationship || m.age || m.phone))
        : [];

      userData.vehicles = validVehicles;
      userData.familyMembers = validFamilyMembers;
      userData.profileComplete = true;
    }

    console.log('User data being saved:', {
      ...userData,
      password: '[HIDDEN]'
    });

    // Create user
    const user = await User.create(userData);
    if (userData.isApproved) {
      await sendOnboardingNotification(user, {
        includeCredentials: true,
        plainPassword: password,
        message: 'Your account is active. You can now log in.'
      });
    }
    
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
        isActive: user.isActive,
        profileComplete: user.profileComplete,
        profilePhoto: user.profilePhoto,
        profilePhotoUrl: buildProfilePhotoUrl(req, user.profilePhoto)
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
router.post('/login', loginLimiter, async (req, res) => {
  try {
    console.log('\n ===== LOGIN ATTEMPT =====');
    console.log('Email:', req.body.email);
    
    const { email, password, expectedRole } = req.body;
    
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

    // Check if expected role matches user's role
    if (expectedRole && user.role !== expectedRole) {
      console.log('Role mismatch - expected:', expectedRole, 'but user has:', user.role);
      return res.status(403).json({
        success: false,
        error: `This login page is for ${expectedRole} accounts only. Please use the correct login page for your role.`
      });
    }

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
        profileComplete: user.profileComplete,
        profilePhoto: user.profilePhoto,
        profilePhotoUrl: buildProfilePhotoUrl(req, user.profilePhoto)
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

// Change password - SECURITY: Enforce strong password policy
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // SECURITY: Validate new password strength
    const { error: passwordError } = passwordSchema.validate(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: passwordError.details[0].message
      });
    }

    // SECURITY: Prevent password reuse - check last 5 passwords
    const user = await User.findById(req.user.id).select('+password +previousPasswords');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if new password matches any of the last 5 passwords
    if (user.previousPasswords && user.previousPasswords.length > 0) {
      for (const oldHash of user.previousPasswords.slice(-5)) {
        const isOldPassword = await bcrypt.compare(newPassword, oldHash);
        if (isOldPassword) {
          return res.status(400).json({
            success: false,
            error: 'New password cannot be the same as any of your last 5 passwords'
          });
        }
      }
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Store current password in history before changing
    if (!user.previousPasswords) user.previousPasswords = [];
    user.previousPasswords.push(user.password);
    // Keep only last 5 passwords
    user.previousPasswords = user.previousPasswords.slice(-5);

    user.password = newPassword;
    await user.save();

    console.log('Password changed for user:', user.email);

    // SECURITY: Create security notification
    await createInAppNotification({
      userId: user._id,
      type: 'security',
      title: 'Password Changed',
      body: 'Your password has been successfully changed.',
      metadata: {
        action: 'password_change',
        timestamp: new Date().toISOString()
      }
    });

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
        profileComplete: req.user.profileComplete,
        profilePhoto: req.user.profilePhoto,
        profilePhotoUrl: buildProfilePhotoUrl(req, req.user.profilePhoto)
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
    
    console.log('🔐 Forgot password request received for:', email);
    
    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('ℹ️ User not found for email:', email);
      return res.json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link.'
      });
    }
    
    console.log('✅ User found:', user.firstName, user.lastName);
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    
    console.log('🔑 Reset token generated and saved');
    
    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log('📧 Reset URL:', resetUrl);
    
    try {
      console.log('📤 Attempting to send email via Resend...');
      await resend.emails.send({
        //from: 'VIMS System <noreply@vims-system.com>',
        from: 'VIMS System <noreply@casimiro-westville-homes-vims.online>',
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello ${user.firstName},</p>
            <p>You requested a password reset for your VIMS account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>VIMS Team</p>
          </div>
        `
      });
      
      console.log('✅ Password reset email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send reset email:', emailError);
      // Don't fail the request, just log it
    }
    
    res.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link.'
    });
    
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
});

// Reset password - SECURITY: Enforce strong password policy and improve token security
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    // SECURITY: Validate new password strength
    const { error: passwordError } = passwordSchema.validate(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: passwordError.details[0].message
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+previousPasswords');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // SECURITY: Prevent password reuse - check last 5 passwords
    if (user.previousPasswords && user.previousPasswords.length > 0) {
      for (const oldHash of user.previousPasswords.slice(-5)) {
        const isOldPassword = await bcrypt.compare(newPassword, oldHash);
        if (isOldPassword) {
          return res.status(400).json({
            success: false,
            error: 'New password cannot be the same as any of your last 5 passwords'
          });
        }
      }
    }

    // Store current password in history before changing
    if (!user.previousPasswords) user.previousPasswords = [];
    user.previousPasswords.push(user.password);
    user.previousPasswords = user.previousPasswords.slice(-5);

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.resetTokenUsedAt = new Date(); // Track when token was used
    await user.save();

    // Create in-app notification
    await createInAppNotification({
      userId: user._id,
      type: 'security',
      title: 'Password Changed',
      body: 'Your password has been successfully changed via password reset.',
      metadata: {
        action: 'password_reset',
        timestamp: new Date().toISOString()
      }
    });

    console.log('Password reset successful for:', user.email);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
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

// Lightweight status endpoint for pending approval UI
router.post('/pending-status', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await User.findOne({ email: String(email).toLowerCase() }).select(
      'email role isApproved isActive firstName lastName phone houseNumber houseBlock houseLot'
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const verification = await IdentityVerification.findOne({ userId: user._id }).select(
      'status updatedAt reviewNotes documentsVerified'
    );

    const docStatus = verification?.status || 'pending_upload';
    const documentsVerifiedFlag =
      !!verification?.documentsVerified ||
      ['documents_verified', 'approved'].includes(docStatus);

    return res.json({
      success: true,
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        houseNumber: user.houseNumber || '',
        houseBlock: user.houseBlock || '',
        houseLot: user.houseLot || '',
        role: user.role,
        isApproved: !!user.isApproved,
        isActive: !!user.isActive,
        /** Resident account still needs admin approval in User Approvals (separate from ID verification). */
        accountPendingAdmin: user.role === 'resident' && !user.isApproved,
        documents: {
          verified: documentsVerifiedFlag,
          status: docStatus,
          updatedAt: verification?.updatedAt || null,
          reviewNotes: verification?.reviewNotes || ''
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to get pending status' });
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