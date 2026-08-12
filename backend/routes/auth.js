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
const EmailOtp = require('../models/EmailOtp');
const Lot = require('../models/Lot');
const IdentityVerification = require('../models/IdentityVerification');
const { protect } = require('../middleware/auth');
const { sendOnboardingNotification } = require('../services/notificationService');
const { detectDuplicateIdentity } = require('../services/duplicateIdentityService');
const { createInAppNotification } = require('../services/inAppNotificationService');
const { uploadImageBuffer } = require('../services/cloudinaryService');

const resend = new Resend(process.env.RESEND_API_KEY);

// SECURITY: Input validation schemas
const emailSchema = Joi.string().email().lowercase().trim().max(254);
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])/)
  .message('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character');
const phoneSchema = Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20);

const LOGIN_LIMIT_WINDOW_MINUTES = Number(process.env.LOGIN_LIMIT_WINDOW_MINUTES || 15);
const LOGIN_LIMIT_MAX_ATTEMPTS = Number(process.env.LOGIN_LIMIT_MAX_ATTEMPTS || 10);
const FORGOT_PASSWORD_LIMIT_WINDOW_MINUTES = Number(process.env.FORGOT_PASSWORD_LIMIT_WINDOW_MINUTES || 15);
const FORGOT_PASSWORD_LIMIT_MAX_ATTEMPTS = Number(process.env.FORGOT_PASSWORD_LIMIT_MAX_ATTEMPTS || 5);

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

const forgotPasswordLimiter = rateLimit({
  windowMs: FORGOT_PASSWORD_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: FORGOT_PASSWORD_LIMIT_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Too many password reset requests. Please try again in ${FORGOT_PASSWORD_LIMIT_WINDOW_MINUTES} minutes.`
  }
});

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ||
  'VIMS System <noreply@casimiro-westville-homes-vims.online>';
const hashOtp = (email, purpose, code) =>
  crypto.createHmac('sha256', process.env.OTP_HASH_SECRET || process.env.JWT_SECRET)
    .update(`${email}:${purpose}:${code}`)
    .digest('hex');
const createOtpGrant = (email, purpose, userId = null) => jwt.sign(
  { email, purpose, userId, type: 'email_otp_grant' },
  process.env.JWT_SECRET,
  { expiresIn: '10m', issuer: 'vims-backend', audience: 'vims-frontend' }
);
const verifyOtpGrant = (token, email, purpose, userId = null) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'vims-backend',
      audience: 'vims-frontend'
    });
    return payload.type === 'email_otp_grant' && payload.purpose === purpose &&
      payload.email === email && (!userId || String(payload.userId) === String(userId));
  } catch (_) {
    return false;
  }
};

const sendOtp = async ({ email, purpose, firstName = 'Resident' }) => {
  const code = crypto.randomInt(100000, 1000000).toString();
  await EmailOtp.findOneAndUpdate(
    { email, purpose },
    {
      codeHash: hashOtp(email, purpose, code),
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const purposeText = {
    registration: 'verify your email address',
    password_reset: 'reset your password',
    password_change: 'change your password'
  }[purpose];
  try {
    const result = await resend.emails.send({
      from: OTP_FROM_EMAIL,
      to: email,
      subject: `Your VIMS verification code: ${code}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
        <h2 style="color:#2e6b2e">VIMS Email Verification</h2>
        <p>Hello ${firstName},</p><p>Use this code to ${purposeText}:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px;background:#f1f5f9;border-radius:10px;text-align:center">${code}</div>
        <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes and can only be used once.</p>
        <p>If you did not request this code, you can safely ignore this email.</p></div>`
    });
    if (result?.error) throw new Error(result.error.message || 'Resend rejected the email');
  } catch (error) {
    await EmailOtp.deleteOne({ email, purpose });
    throw error;
  }
};

const verifyOtp = async ({ email, purpose, code }) => {
  const record = await EmailOtp.findOne({ email, purpose }).select('+codeHash');
  if (!record || record.expiresAt <= new Date()) return { valid: false, error: 'Invalid or expired code' };
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await EmailOtp.deleteOne({ _id: record._id });
    return { valid: false, error: 'Too many incorrect attempts. Request a new code.' };
  }
  const suppliedHash = hashOtp(email, purpose, String(code));
  const matches = suppliedHash.length === record.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(record.codeHash));
  if (!matches) {
    record.attempts += 1;
    await record.save();
    return { valid: false, error: 'Invalid or expired code' };
  }
  await EmailOtp.deleteOne({ _id: record._id });
  return { valid: true };
};

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP requests. Please try again in 15 minutes.' }
});

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

const vehicleImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/vehicle-photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `vehicle_${uniqueSuffix}_${file.originalname}`);
  }
});

const vehicleImageUpload = multer({
  storage: vehicleImageStorage,
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

const registerUpload = multer({
  storage: multer.memoryStorage(),
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
  if (/^https?:\/\//i.test(filename)) return filename;
  return `${req.protocol}://${req.get('host')}/uploads/profile-photos/${filename}`;
};

const parseJsonArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      return [];
    }
  }
  return [];
};

const parseBooleanField = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

const getFallbackLots = async () => {
  const lots = await Lot.find({
    status: 'vacant',
    lotId: { $nin: Object.keys(AMENITY_LOTS) },
    'mapPosition.isPositioned': true
  })
    .select('lotId block lotNumber type sqm price status')
    .sort({ block: 1, lotNumber: 1 })
    .limit(10);
  return lots;
};

const AMENITY_LOTS = {
  'P4-B18-L6': 'Covered Court',
  'P2-B10-L13': 'Covered Court',
  'P4-B17-L7': 'Swimming Pool'
};

const isAmenityLot = (lotId) => Boolean(AMENITY_LOTS[String(lotId || '').toUpperCase()]);

router.post('/registration-otp/request', otpLimiter, async (req, res) => {
  try {
    const { error, value: email } = emailSchema.validate(req.body?.email);
    if (error) return res.status(400).json({ success: false, error: 'Invalid email address' });
    if (await User.exists({ email })) {
      return res.status(409).json({ success: false, error: 'An account already uses this email' });
    }
    await sendOtp({ email, purpose: 'registration', firstName: req.body?.firstName || 'Resident' });
    return res.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('Registration OTP send error:', error);
    return res.status(502).json({ success: false, error: 'Unable to send verification email' });
  }
});

router.post('/registration-otp/verify', async (req, res) => {
  const { error, value: email } = emailSchema.validate(req.body?.email);
  const code = String(req.body?.code || '');
  if (error || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Enter a valid six-digit code' });
  }
  const result = await verifyOtp({ email, purpose: 'registration', code });
  if (!result.valid) return res.status(400).json({ success: false, error: result.error });
  return res.json({ success: true, verificationToken: createOtpGrant(email, 'registration') });
});

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
        if (isAmenityLot(foundLot.lotId)) {
          return res.json({
            success: true,
            available: false,
            error: `${foundLot.lotId} is a Community Amenity (${AMENITY_LOTS[foundLot.lotId]}) and cannot be selected as a residence`
          });
        }
        return res.json({
          success: true,
          available: foundLot.status === 'vacant' && foundLot.mapPosition?.isPositioned === true,
          lotDetails: foundLot
        });
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
router.post('/register', registerUpload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'vehicleImage_0', maxCount: 1 },
  { name: 'vehicleImage_1', maxCount: 1 },
  { name: 'vehicleImage_2', maxCount: 1 },
  { name: 'vehicleImage_3', maxCount: 1 },
  { name: 'vehicleImage_4', maxCount: 1 }
]), async (req, res) => {
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
      vehicles: vehiclesRaw = [],
      familyMembers: familyMembersRaw = [],
      noVehicles: noVehiclesRaw = false
    } = req.body;

    const vehicles = parseJsonArrayField(vehiclesRaw);
    const familyMembers = parseJsonArrayField(familyMembersRaw);
    const noVehicles = parseBooleanField(noVehiclesRaw);

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      console.log('Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const normalizedRegistrationEmail = String(email).trim().toLowerCase();
    if (!verifyOtpGrant(
      req.body.emailVerificationToken,
      normalizedRegistrationEmail,
      'registration'
    )) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before registering'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedRegistrationEmail });
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
      email: normalizedRegistrationEmail,
      phone,
      password,
      role: userRole,
      isApproved: isApproved,
    };

    // Debug: show received profile photo upload details
    const profilePhotoFile = req.files?.profilePhoto?.[0] || null;
    console.log('📸 Register request file payload:', {
      profilePhoto: profilePhotoFile
        ? {
            originalname: profilePhotoFile.originalname,
            mimetype: profilePhotoFile.mimetype,
            size: profilePhotoFile.size
          }
        : null
    });

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

      if (isAmenityLot(lot.lotId)) {
        const fallbackLots = await getFallbackLots();
        return res.status(400).json({
          success: false,
          error: `${lot.lotId} is a Community Amenity (${AMENITY_LOTS[lot.lotId]}) and cannot be selected as a residence.`,
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

      if (lot.mapPosition?.isPositioned !== true) {
        const fallbackLots = await getFallbackLots();
        return res.status(400).json({
          success: false,
          error: 'This lot is not currently available on the map. Please select another lot.',
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
          ? await Promise.all(vehicles.map(async (v, index) => {
              const vehicleData = { ...v };
              // Check for uploaded vehicle image
              const vehicleImageKey = `vehicleImage_${index}`;
              if (req.files && req.files[vehicleImageKey] && req.files[vehicleImageKey][0]) {
                const imageFile = req.files[vehicleImageKey][0];
                const uploadedVehicleImage = await uploadImageBuffer(imageFile.buffer, {
                  folder: 'vims/vehicles'
                });
                vehicleData.carImage = uploadedVehicleImage.secure_url;
                vehicleData.carImagePublicId = uploadedVehicleImage.public_id;
              }
              return vehicleData;
            })).then((rows) => rows.filter(v => v && (v.plateNumber || v.make || v.model || v.color)))
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

    // Replace the temporary local filename with a permanent Cloudinary URL.
    let uploadedProfilePhoto = null;
    if (profilePhotoFile) {
      uploadedProfilePhoto = await uploadImageBuffer(profilePhotoFile.buffer, {
        folder: 'vims/profiles'
      });
      userData.profilePhoto = uploadedProfilePhoto.secure_url;
      userData.profilePhotoPublicId = uploadedProfilePhoto.public_id;
    }

    // Create user
    const user = await User.create(userData);
    if (user.role === 'resident' && uploadedProfilePhoto) {
      await IdentityVerification.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            residentEmail: user.email,
            residentDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            selfieImage: `profile-${user._id}.jpg`,
            selfieImageUrl: uploadedProfilePhoto.secure_url,
            selfieImagePublicId: uploadedProfilePhoto.public_id,
            selfieImageData: null,
            selfieImageMimeType: profilePhotoFile.mimetype
          },
          $setOnInsert: { status: 'pending_upload' }
        },
        { upsert: true }
      );
    }
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
        securityLevel: user.securityLevel,
        assignedPhases: user.assignedPhases || [],
        assignedAreas: user.assignedAreas || [],
        patrolSchedule: user.patrolSchedule || '',
        headOfficerId: user.headOfficerId || null,
        houseNumber: user.houseNumber,
        houseBlock: user.houseBlock,
        houseLot: user.houseLot,
        isApproved: user.isApproved,
        isActive: user.isActive,
        profileComplete: user.profileComplete,
        profilePhoto: user.profilePhoto,
        profilePhotoUrl: buildProfilePhotoUrl(req, user.profilePhoto),
        vehicles: user.vehicles || [],
        familyMembers: user.familyMembers || []
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

    if (user.isArchived) {
      console.log('Account is archived:', email);
      return res.status(403).json({
        success: false,
        error: 'Your account has been archived. Please contact admin.'
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
        securityLevel: user.securityLevel,
        assignedPhases: user.assignedPhases || [],
        assignedAreas: user.assignedAreas || [],
        patrolSchedule: user.patrolSchedule || '',
        headOfficerId: user.headOfficerId || null,
        houseNumber: user.houseNumber,
        houseBlock: user.houseBlock,
        houseLot: user.houseLot,
        isApproved: user.isApproved,
        isActive: user.isActive,
        profileComplete: user.profileComplete,
        profilePhoto: user.profilePhoto,
        profilePhotoUrl: buildProfilePhotoUrl(req, user.profilePhoto),
        vehicles: user.vehicles || [],
        familyMembers: user.familyMembers || []
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
    const { currentPassword, newPassword, otpVerificationToken } = req.body;

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

    if (!verifyOtpGrant(otpVerificationToken, user.email, 'password_change', user._id)) {
      return res.status(403).json({
        success: false,
        error: 'Email OTP verification is required'
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

router.post('/change-password-otp/request', protect, otpLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user || !req.body?.currentPassword ||
        !(await user.comparePassword(req.body.currentPassword))) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }
    await sendOtp({ email: user.email, purpose: 'password_change', firstName: user.firstName });
    return res.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('Change password OTP send error:', error);
    return res.status(502).json({ success: false, error: 'Unable to send verification email' });
  }
});

router.post('/change-password-otp/verify', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  const code = String(req.body?.code || '');
  if (!user || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Enter a valid six-digit code' });
  }
  const result = await verifyOtp({ email: user.email, purpose: 'password_change', code });
  if (!result.valid) return res.status(400).json({ success: false, error: result.error });
  return res.json({
    success: true,
    verificationToken: createOtpGrant(user.email, 'password_change', user._id)
  });
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
        securityLevel: req.user.securityLevel,
        assignedPhases: req.user.assignedPhases || [],
        assignedAreas: req.user.assignedAreas || [],
        patrolSchedule: req.user.patrolSchedule || '',
        headOfficerId: req.user.headOfficerId || null,
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
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('Forgot password request received');
    
    if (!email) {
      console.log('No email provided');
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const { error: emailError, value: normalizedEmail } = emailSchema.validate(email);
    if (emailError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      console.log('Password reset requested for unregistered email');
      return res.json({
        success: true,
        message: 'If your email is registered, you will receive a verification code.'
      });
    }
    
    console.log('Password reset requested for registered user');

    try {
      await sendOtp({
        email: user.email,
        purpose: 'password_reset',
        firstName: user.firstName
      });
    } catch (emailError) {
      console.error('Failed to send password reset OTP:', emailError);
    }

    return res.json({
      success: true,
      message: 'If your email is registered, you will receive a verification code.'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
});

router.post('/forgot-password/verify-otp', async (req, res) => {
  const { error, value: email } = emailSchema.validate(req.body?.email);
  const code = String(req.body?.code || '');
  if (error || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Enter a valid six-digit code' });
  }
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired code' });
  const result = await verifyOtp({ email, purpose: 'password_reset', code });
  if (!result.valid) return res.status(400).json({ success: false, error: result.error });
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = hashResetToken(resetToken);
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  return res.json({ success: true, resetToken });
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

    const resetTokenHash = hashResetToken(token);

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+password +previousPasswords');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    const matchesCurrentPassword = await bcrypt.compare(newPassword, user.password);
    if (matchesCurrentPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password cannot be the same as your current password'
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
