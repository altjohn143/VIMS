const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const Lot = require('../models/Lot');
const OccupancyHistory = require('../models/OccupancyHistory');
const IdentityVerification = require('../models/IdentityVerification');
const Payment = require('../models/Payment');
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/auth');
const { sendOnboardingNotification } = require('../services/notificationService');
const { createInAppNotification } = require('../services/inAppNotificationService');
const { uploadImageBuffer, deleteImage } = require('../services/cloudinaryService');
const { paginateQuery } = require('../utils/pagination');
const debugLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
};

const PROTECTED_MAIN_ACCOUNT_EMAILS = new Set(['admin@vims.com', 'security@vims.com']);
const PRIMARY_SECURITY_HEAD_EMAIL = 'security@vims.com';
const isProtectedMainAccount = (user) => PROTECTED_MAIN_ACCOUNT_EMAILS.has(String(user?.email || '').toLowerCase());
const STAFF_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_PASSWORD_REGEX = /^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])/;
const normalizePhilippineStaffPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('63') ? digits.slice(2) : digits;
};
const formatPhilippineStaffPhone = (value) => `+63${normalizePhilippineStaffPhone(value)}`;

const getPrimarySecurityHeadOfficer = async () => User.findOne({
  email: PRIMARY_SECURITY_HEAD_EMAIL,
  role: 'security',
  isActive: true
}).select('_id firstName lastName email securityLevel');

const buildProfilePhotoUrl = (req, photo) => {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo)) return photo;
  return `${req.protocol}://${req.get('host')}/uploads/profile-photos/${photo}`;
};

async function getMonthlyDuesAmount() {
  const setting = await Setting.findOne({ key: 'monthly_dues_amount' });
  return typeof setting?.value === 'number' ? setting.value : 500;
}

function getOutstandingAmount(payment) {
  const baseAmount = Number(payment.originalAmount ?? payment.amount ?? 0);
  const paidAmount = Number(payment.paidAmount || 0);
  const penaltyAmount = Number(payment.penaltyAmount || 0);
  return Math.max(0, baseAmount + penaltyAmount - paidAmount);
}

function syncPaymentAmounts(payment) {
  if (payment.originalAmount == null) payment.originalAmount = Number(payment.amount || 0);
  payment.amount = getOutstandingAmount(payment);
}

async function applyResidentCreditToPayment(resident, payment) {
  const creditBalance = Number(resident.paymentCreditBalance || 0);
  if (creditBalance <= 0) return payment;

  syncPaymentAmounts(payment);
  const outstanding = getOutstandingAmount(payment);
  if (outstanding <= 0) return payment;

  const creditApplied = Math.min(creditBalance, outstanding);
  payment.paidAmount = Number(payment.paidAmount || 0) + creditApplied;
  payment.paymentHistory.push({
    amount: creditApplied,
    paymentMethod: 'credit',
    referenceNumber: '',
    receiptNumber: `CR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    notes: 'Applied resident overpayment credit to this invoice'
  });
  syncPaymentAmounts(payment);
  payment.status = getOutstandingAmount(payment) <= 0 ? 'paid' : 'pending';
  resident.paymentCreditBalance = creditBalance - creditApplied;
  await Promise.all([payment.save(), resident.save()]);
  return payment;
}

async function createMonthlyDuesForResident(resident) {
  const dueDay = 10;
  const defaultInclusions = ['Maintenance', 'Security', 'Garbage', 'Common Area Upkeep', 'Administrative fees'];
  const now = new Date();
  let targetMonth = now.getMonth() + 1;
  let targetYear = now.getFullYear();
  const createdAt = resident.createdAt ? new Date(resident.createdAt) : null;

  if (
    createdAt &&
    createdAt.getFullYear() === targetYear &&
    createdAt.getMonth() === targetMonth - 1 &&
    createdAt.getDate() > dueDay
  ) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const existing = await Payment.findOne({
    residentId: resident._id,
    paymentType: 'monthly_dues',
    'billingPeriod.month': targetMonth,
    'billingPeriod.year': targetYear
  });

  if (existing) {
    return existing;
  }

  const monthlyDuesAmount = await getMonthlyDuesAmount();
  const payment = await Payment.create({
    residentId: resident._id,
    amount: monthlyDuesAmount,
    originalAmount: monthlyDuesAmount,
    paymentType: 'monthly_dues',
    status: 'pending',
    dueDate: new Date(targetYear, targetMonth - 1, dueDay),
    billingPeriod: { month: targetMonth, year: targetYear },
    description: `Monthly Association Dues - ${new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })} ${targetYear}`,
    notes: 'Includes Maintenance, Security, Garbage, Common Area Upkeep, and Administrative fees.',
    inclusions: defaultInclusions
  });
  return await applyResidentCreditToPayment(resident, payment);
}

// Get all users (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = { isArchived: false };
    const { data: users, pagination } = await paginateQuery(
      User.find(filter)
      .select('-password')
      .populate('headOfficerId', 'firstName lastName email securityLevel')
      .populate('secondaryHeadOfficerId', 'firstName lastName email securityLevel')
      .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(filter),
      req.query
    );

    const verificationRecords = await IdentityVerification.find({
      userId: { $in: users.map((user) => user._id) }
    }).select('userId status updatedAt frontImage backImage selfieImage documentsVerified').lean();

    const verificationMap = new Map(
      verificationRecords.map((record) => [String(record.userId), record])
    );

    const data = users.map((user) => {
      const verification = verificationMap.get(String(user._id));
      const userObj = { ...user };
      if (user.profilePhoto) {
        userObj.profilePhotoUrl = buildProfilePhotoUrl(req, user.profilePhoto);
      }
      userObj.verificationStatus = verification?.status || 'pending_upload';
      userObj.verificationUpdatedAt = verification?.updatedAt || null;
      userObj.verificationId = verification?._id || null;
      userObj.hasUploadedId = !!(verification?.frontImage && verification?.backImage);
      userObj.hasUploadedSelfie = !!verification?.selfieImage;
      userObj.documentsVerified = !!verification?.documentsVerified;
      return userObj;
    });
    
    res.json({
      success: true,
      count: data.length,
      total: pagination.total,
      pagination,
      data
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

// Get pending approvals (for admin)
router.get('/pending-approvals', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = { 
      role: 'resident', 
      isApproved: false,
      approvalStatus: { $ne: 'rejected' },
      isArchived: false
    };
    const { data: pendingUsers, pagination } = await paginateQuery(
      User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(filter),
      req.query
    );

    const verificationRecords = await IdentityVerification.find({
      userId: { $in: pendingUsers.map((user) => user._id) }
    }).select('userId status updatedAt frontImage backImage selfieImage').lean();

    const verificationMap = new Map(
      verificationRecords.map((record) => [String(record.userId), record])
    );

    const data = pendingUsers.map((user) => {
      const verification = verificationMap.get(String(user._id));
      const hasUploadedId = !!(verification?.frontImage && verification?.backImage);
      const userObj = { ...user };
      if (user.profilePhoto) {
        userObj.profilePhotoUrl = buildProfilePhotoUrl(req, user.profilePhoto);
      }
      return {
        ...userObj,
        verificationStatus: verification?.status || 'pending_upload',
        verificationUpdatedAt: verification?.updatedAt || null,
        verificationId: verification?._id || null,
        hasUploadedId,
        canApprove: hasUploadedId
      };
    });
    
    res.json({
      success: true,
      count: data.length,
      total: pagination.total,
      pagination,
      data
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending approvals'
    });
  }
});

// Approve user - UPDATED to update lot status
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (user.role !== 'resident') {
      return res.status(400).json({
        success: false,
        error: 'Only residents can be approved'
      });
    }
    
    if (user.isApproved) {
      return res.status(400).json({
        success: false,
        error: 'User is already approved'
      });
    }

    // Updated rule: Admin can approve once resident has uploaded front/back ID images.
    // (Verification status may still be queued/manual/approved/rejected; that is a separate workflow.)
    const verification = await IdentityVerification.findOne({ userId: user._id })
      .select('status frontImage backImage updatedAt');
    const hasUploadedId = !!(verification?.frontImage && verification?.backImage);
    if (!hasUploadedId) {
      return res.status(400).json({
        success: false,
        error: 'Resident cannot be approved until front/back ID images are uploaded.'
      });
    }
    
    // Update the lot status to occupied
    if (user.houseNumber) {
      const lotId = user.houseNumber; // Use houseNumber directly as it matches the lotId format (P1-B1-L1)
      const lot = await Lot.findOne({ lotId });
      
      if (lot && lot.status === 'vacant') {
        const previousStatus = lot.status;
        lot.status = 'occupied';
        lot.occupiedBy = user._id;
        lot.occupiedAt = new Date();
        await lot.save();
        await OccupancyHistory.create({
          lotId,
          residentId: user._id,
          action: 'move_in',
          previousStatus,
          newStatus: 'occupied',
          reason: 'Resident approved by admin',
          performedBy: req.user._id
        });
        debugLog(`✅ Lot ${lotId} marked as occupied by ${user.email}`);
      } else if (lot && lot.status !== 'vacant') {
        debugLog(`⚠️ Lot ${lotId} is already ${lot.status}, cannot approve user`);
        return res.status(400).json({
          success: false,
          error: `This lot (${lotId}) is no longer available. Please contact admin.`
        });
      } else {
        debugLog(`⚠️ Lot ${lotId} not found in database`);
        return res.status(400).json({
          success: false,
          error: `Lot ${lotId} not found. Please contact admin.`
        });
      }
    }
    
    user.approvalDate = new Date();
    user.isApproved = true;
    user.approvalStatus = 'approved';
    user.rejectedAt = null;
    user.rejectedBy = null;
    user.rejectionReason = '';
    await user.save();

    try {
      await createMonthlyDuesForResident(user);
      debugLog(`Monthly dues created automatically for resident ${user._id}`);
    } catch (duesError) {
      console.error('Error creating monthly dues on approval:', duesError);
    }

    await sendOnboardingNotification(user, {
      includeCredentials: false,
      message: 'Your account has been approved by admin. Please log in using your registered credentials.'
    });
    await createInAppNotification({
      userId: user._id,
      type: 'account',
      title: 'Account approved',
      body: 'Your resident account has been approved by admin.'
    });
    
    res.json({
      success: true,
      message: 'User approved successfully. Lot has been marked as occupied.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        houseBlock: user.houseBlock,
        houseLot: user.houseLot
      }
    });
    
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve user'
    });
  }
});

router.put('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (user.role !== 'resident') {
      return res.status(400).json({ success: false, error: 'Only resident registrations can be rejected' });
    }
    if (user.isApproved) {
      return res.status(400).json({ success: false, error: 'Approved residents cannot be rejected from the pending queue' });
    }

    user.isApproved = false;
    user.isActive = false;
    user.approvalStatus = 'rejected';
    user.rejectedAt = new Date();
    user.rejectedBy = req.user._id;
    user.rejectionReason = reason;
    await user.save();

    await createInAppNotification({
      userId: user._id,
      type: 'account',
      title: 'Registration rejected',
      body: `Your resident registration was rejected. Reason: ${reason}`,
      metadata: { action: 'resident_registration_rejected', rejectionReason: reason }
    });

    res.json({
      success: true,
      message: 'Resident rejected successfully',
      data: {
        _id: user._id,
        email: user.email,
        approvalStatus: user.approvalStatus,
        rejectionReason: user.rejectionReason
      }
    });
  } catch (error) {
    console.error('Reject resident error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject resident' });
  }
});

// Archive user (instead of delete) - UPDATED to free up lot
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const archiveReason = String(req.body?.reason || '').trim();
    if (!archiveReason) {
      return res.status(400).json({
        success: false,
        error: 'Archive reason is required'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (isProtectedMainAccount(user)) {
      return res.status(403).json({
        success: false,
        error: 'Main system accounts cannot be archived or deactivated'
      });
    }
    
    // Free up the lot if it was occupied by this user
    if (user.houseBlock && user.houseLot && user.isApproved) {
      const lotId = `${user.houseBlock}-${user.houseLot}`;
      const lot = await Lot.findOne({ lotId });
      
      if (lot && lot.occupiedBy && lot.occupiedBy.toString() === user._id.toString()) {
        const previousStatus = lot.status;
        lot.status = 'vacant';
        lot.occupiedBy = null;
        lot.occupiedAt = null;
        await lot.save();
        await OccupancyHistory.create({
          lotId,
          residentId: user._id,
          action: 'move_out',
          previousStatus,
          newStatus: 'vacant',
          reason: 'Resident archived',
          performedBy: req.user._id
        });
        debugLog(`✅ Lot ${lotId} freed up (was occupied by ${user.email})`);
      }
    }
    
    // Archive the user instead of deleting
    user.wasActiveBeforeArchive = user.isActive;
    user.isArchived = true;
    user.isActive = false;
    if (user.role === 'resident' && !user.isApproved && user.approvalStatus !== 'rejected') {
      user.approvalStatus = 'pending';
    }
    user.archivedAt = new Date();
    user.archivedBy = req.user._id;
    user.archivedReason = archiveReason;
    await user.save();
    
    debugLog(`📦 User archived: ${user.email}, Reason: ${user.archivedReason}`);
    await createInAppNotification({
      userId: user._id,
      type: 'account',
      title: 'Account archived',
      body: `Your account was archived by admin. Reason: ${archiveReason}`,
      metadata: { action: 'account_archived', archiveReason }
    });
    
    res.json({
      success: true,
      message: 'User archived successfully'
    });
    
  } catch (error) {
    console.error('Archive user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive user'
    });
  }
});

// Restore archived user
router.put('/:id/restore', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (!user.isArchived) {
      return res.status(400).json({
        success: false,
        error: 'User is not archived'
      });
    }
    
    user.isArchived = false;
    user.isActive = user.wasActiveBeforeArchive !== null && user.wasActiveBeforeArchive !== undefined
      ? user.wasActiveBeforeArchive
      : user.isActive;
    user.archivedAt = null;
    user.archivedBy = null;
    user.archivedReason = '';
    user.wasActiveBeforeArchive = null;
    await user.save();
    
    debugLog(`♻️ User restored: ${user.email}`);
    await createInAppNotification({
      userId: user._id,
      type: 'account',
      title: 'Account restored',
      body: 'Your account has been restored by admin.',
      metadata: { action: 'account_restored' }
    });
    
    res.json({
      success: true,
      message: 'User restored successfully',
      data: user
    });
    
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore user'
    });
  }
});


// Get archived users
router.get('/archived', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = { isArchived: true };
    const { data: users, pagination } = await paginateQuery(
      User.find(filter)
      .populate('archivedBy', 'firstName lastName email')
        .sort({ archivedAt: -1 }),
      User.countDocuments(filter),
      req.query
    );
    
    res.json({
      success: true,
      count: users.length,
      total: pagination.total,
      pagination,
      data: users
    });
    
  } catch (error) {
    console.error('Get archived users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get archived users'
    });
  }
});


// Get user stats summary
router.get('/stats/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isArchived: false });
    const residents = await User.countDocuments({ role: 'resident', isArchived: false });
    const approvedResidents = await User.countDocuments({ 
      role: 'resident', 
      isApproved: true,
      isArchived: false
    });
    const pendingResidents = await User.countDocuments({
      role: 'resident',
      isApproved: false,
      isArchived: false
    });
    
    res.json({
      success: true,
      data: {
        totalUsers,
        residents,
        approvedResidents,
        pendingApproval: pendingResidents
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// Get user registration stats for admin dashboards
router.get('/stats/registrations', protect, authorize('admin'), async (req, res) => {
  try {
    const { year, month } = req.query;
    let startDate;
    let endDate;

    if (year && month) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else if (year) {
      startDate = new Date(parseInt(year), 0, 1);
      endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const registrationCount = await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      isArchived: false
    });

    res.json({ success: true, data: { count: registrationCount } });
  } catch (error) {
    console.error('Get registration stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get registration stats' });
  }
});

debugLog('🔧 Loading users route file');
const photoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/profile-photo', protect, photoUpload.single('photo'), async (req, res) => {
  debugLog('🔧 Received POST /api/users/profile-photo');
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No photo file uploaded' });
    }

    const user = await User.findById(req.user.id).select('+profilePhotoPublicId');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const uploadedPhoto = await uploadImageBuffer(req.file.buffer, {
      folder: 'vims/profiles',
      publicId: String(user._id)
    });
    const previousPublicId = user.profilePhotoPublicId;
    user.profilePhoto = uploadedPhoto.secure_url;
    user.profilePhotoPublicId = uploadedPhoto.public_id;
    await user.save();

    if (user.role === 'resident') {
      await IdentityVerification.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            residentEmail: user.email || '',
            residentDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            selfieImage: `profile-${user._id}.jpg`,
            selfieImageUrl: uploadedPhoto.secure_url,
            selfieImagePublicId: uploadedPhoto.public_id,
            selfieImageData: null,
            selfieImageMimeType: req.file.mimetype
          },
          $setOnInsert: { status: 'pending_upload' }
        },
        { upsert: true }
      );
    }

    if (previousPublicId && previousPublicId !== uploadedPhoto.public_id) {
      deleteImage(previousPublicId).catch(error =>
        console.warn('Unable to delete previous profile photo:', error.message)
      );
    }

    await createInAppNotification({
      userId: user._id,
      type: 'profile',
      title: 'Profile photo updated',
      body: 'Your profile photo was updated successfully.',
      metadata: { action: 'profile_photo_updated' }
    });

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: uploadedPhoto.secure_url,
        profilePhotoUrl: uploadedPhoto.secure_url
      }
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload profile photo' });
  }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['emergencyContact', 'vehicles', 'familyMembers'];

    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (filteredUpdates.emergencyContact?.phone) {
      const emergencyPhoneDigits = String(filteredUpdates.emergencyContact.phone || '').replace(/\D/g, '');
      if (emergencyPhoneDigits.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid emergency contact phone number'
        });
      }
      filteredUpdates.emergencyContact = {
        ...filteredUpdates.emergencyContact,
        phone: emergencyPhoneDigits
      };
    }

    Object.assign(user, filteredUpdates);
    user.profileComplete = true;

    await user.save();
    user.password = undefined;

    await createInAppNotification({
      userId: user._id,
      type: 'profile',
      title: 'Profile updated',
      body: 'Your profile information was updated successfully.',
      metadata: { action: 'profile_updated', fields: Object.keys(filteredUpdates) }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Get user profile by ID
router.get('/:id/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userObj = user.toObject();
    if (user.profilePhoto) {
      userObj.profilePhotoUrl = buildProfilePhotoUrl(req, user.profilePhoto);
    }

    res.json({
      success: true,
      data: userObj
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// Get current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userObj = user.toObject();
    if (user.profilePhoto) {
      userObj.profilePhotoUrl = buildProfilePhotoUrl(req, user.profilePhoto);
    }
    
    res.json({
      success: true,
      data: userObj
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// Resident: request move-out (does NOT delete account; admin must approve)
router.post('/move-out/request', protect, authorize('resident'), async (req, res) => {
  try {
    const { reason = '' } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (!user.isActive) {
      return res.status(400).json({ success: false, error: 'Account is inactive. Please contact admin.' });
    }
    if (!user.isApproved) {
      return res.status(400).json({ success: false, error: 'Account must be approved before requesting move-out.' });
    }
    if (user.moveOutStatus === 'pending') {
      return res.status(400).json({ success: false, error: 'Move-out request is already pending admin review.' });
    }
    if (!user.houseBlock || !user.houseLot) {
      return res.status(400).json({ success: false, error: 'No lot is associated with this account.' });
    }

    user.moveOutStatus = 'pending';
    user.moveOutRequestedAt = new Date();
    user.moveOutReason = String(reason || '').trim();
    user.moveOutReviewedAt = null;
    user.moveOutReviewedBy = null;
    user.moveOutReviewNotes = '';
    await user.save();

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    await Promise.allSettled(admins.map((admin) => createInAppNotification({
      userId: admin._id,
      type: 'account',
      title: 'Move-out request submitted',
      body: `${user.firstName || 'Resident'} ${user.lastName || ''} requested move-out review.`.trim(),
      metadata: { action: 'move_out_requested', residentId: user._id }
    })));

    await createInAppNotification({
      userId: user._id,
      type: 'account',
      title: 'Move-out request submitted',
      body: 'Your move-out request was submitted and is pending admin review.',
      metadata: { action: 'move_out_requested' }
    });

    return res.json({
      success: true,
      message: 'Move-out request submitted. An admin will review and confirm your move-out.',
      data: {
        moveOutStatus: user.moveOutStatus,
        moveOutRequestedAt: user.moveOutRequestedAt,
      }
    });
  } catch (error) {
    console.error('Move-out request error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit move-out request' });
  }
});

// Admin: list move-out requests
router.get('/move-out/requests', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = { role: 'resident', moveOutStatus: 'pending', isArchived: false };
    const { data: rows, pagination } = await paginateQuery(
      User.find(filter)
      .select('-password')
        .sort({ moveOutRequestedAt: -1 }),
      User.countDocuments(filter),
      req.query
    );
    return res.json({ success: true, count: rows.length, total: pagination.total, pagination, data: rows });
  } catch (error) {
    console.error('List move-out requests error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load move-out requests' });
  }
});

// Admin: approve move-out (vacate lot + deactivate resident; keep user record)
router.put('/:id/move-out/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { notes = '' } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'resident') return res.status(400).json({ success: false, error: 'Only residents can move out' });
    if (user.moveOutStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'No pending move-out request for this user' });
    }

    const lotId = user.houseBlock && user.houseLot ? `${user.houseBlock}-${user.houseLot}` : null;
    if (lotId) {
      const lot = await Lot.findOne({ lotId });
      if (lot) {
        const previousStatus = lot.status;
        const previousOccupiedBy = lot.occupiedBy;
        // Vacate only if this user is the occupant (or lot is occupied with no occupant set)
        if (!lot.occupiedBy || String(lot.occupiedBy) === String(user._id)) {
          lot.status = 'vacant';
          lot.occupiedBy = null;
          lot.occupiedAt = null;
          await lot.save();
          await OccupancyHistory.create({
            lotId,
            residentId: user._id,
            action: 'move_out',
            previousStatus,
            newStatus: 'vacant',
            reason: 'Move-out approved by admin',
            performedBy: req.user._id
          });
          debugLog(`✅ Lot ${lotId} vacated (move-out) for ${user.email}`);
        } else {
          debugLog(`⚠️ Lot ${lotId} occupied by different user; skipping vacate`);
          await OccupancyHistory.create({
            lotId,
            residentId: previousOccupiedBy || user._id,
            action: 'status_update',
            previousStatus,
            newStatus: lot.status,
            reason: 'Move-out approved but lot occupied by different resident',
            performedBy: req.user._id
          });
        }
      }
    }

    user.moveOutStatus = 'approved';
    user.moveOutReviewedAt = new Date();
    user.moveOutReviewedBy = req.user._id;
    user.moveOutReviewNotes = String(notes || '').trim();
    user.movedOutAt = new Date();
    user.isActive = false;
    await user.save();

    await createInAppNotification({
      userId: user._id,
      type: 'account',
      title: 'Move-out approved',
      body: 'Your move-out request was approved. Your resident account has been deactivated.',
      metadata: { action: 'move_out_approved', lotId }
    });

    return res.json({
      success: true,
      message: 'Move-out approved. Lot has been vacated and resident account is deactivated.',
      data: { id: user._id, moveOutStatus: user.moveOutStatus, movedOutAt: user.movedOutAt, isActive: user.isActive, lotId }
    });
  } catch (error) {
    console.error('Approve move-out error:', error);
    return res.status(500).json({ success: false, error: 'Failed to approve move-out' });
  }
});

// Admin: deny move-out request
router.put('/:id/move-out/deny', protect, authorize('admin'), async (req, res) => {
  try {
    const { notes = '' } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'resident') return res.status(400).json({ success: false, error: 'Only residents can move out' });
    if (user.moveOutStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'No pending move-out request for this user' });
    }

    user.moveOutStatus = 'denied';
    user.moveOutReviewedAt = new Date();
    user.moveOutReviewedBy = req.user._id;
    user.moveOutReviewNotes = String(notes || '').trim();
    await user.save();

    await createInAppNotification({
      userId: user._id,
      type: 'account',
      title: 'Move-out request denied',
      body: `Your move-out request was denied.${notes ? ` Notes: ${notes}` : ''}`,
      metadata: { action: 'move_out_denied', notes: String(notes || '').trim() }
    });

    return res.json({
      success: true,
      message: 'Move-out request denied.',
      data: { id: user._id, moveOutStatus: user.moveOutStatus }
    });
  } catch (error) {
    console.error('Deny move-out error:', error);
    return res.status(500).json({ success: false, error: 'Failed to deny move-out request' });
  }
});

// Update user status (activate/deactivate)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!isActive && isProtectedMainAccount(user)) {
      return res.status(403).json({
        success: false,
        error: 'Main system accounts cannot be archived or deactivated'
      });
    }

    user.isActive = isActive;
    await user.save();

    user.password = undefined;
    await createInAppNotification({
      userId: user._id,
      type: 'account',
      title: isActive ? 'Account activated' : 'Account deactivated',
      body: `Your account has been ${isActive ? 'activated' : 'deactivated'} by admin.`,
      metadata: { action: isActive ? 'account_activated' : 'account_deactivated' }
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
});

// Create admin and security users. Head officers may create supervised security personnel.
router.post('/', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      securityLevel = 'personnel',
      headOfficerId = null,
      assignedPhases = [],
      assignedAreas = [],
      patrolSchedule = ''
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !role) {
      return res.status(400).json({ success: false, error: 'All required fields must be provided' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const localPhone = normalizePhilippineStaffPhone(phone);

    if (!STAFF_EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }

    if (!/^9\d{9}$/.test(localPhone)) {
      return res.status(400).json({ success: false, error: 'Contact number must be +63 followed by 10 digits starting with 9' });
    }

    if (!STAFF_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be 8-128 characters and contain uppercase, lowercase, number, and special character'
      });
    }

    const requesterIsHeadOfficer =
      req.user.role === 'security' && (
        req.user.securityLevel === 'head-officer' ||
        String(req.user.email || '').toLowerCase() === 'security@vims.com'
      );

    if (req.user.role === 'security') {
      if (!requesterIsHeadOfficer) {
        return res.status(403).json({ success: false, error: 'Only head officers can create security personnel' });
      }
      if (role !== 'security' || securityLevel === 'head-officer') {
        return res.status(403).json({ success: false, error: 'Head officers can only create security personnel accounts' });
      }
    }

    if (!['admin', 'security'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Only admin or security accounts can be created here' });
    }

    if (role === 'security' && !['head-officer', 'personnel'].includes(securityLevel)) {
      return res.status(400).json({ success: false, error: 'securityLevel must be head-officer or personnel' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    const validAssignedPhases = role === 'security'
      ? Array.isArray(assignedPhases)
        ? assignedPhases.map((phase) => Number(phase)).filter((phase) => Number.isInteger(phase) && phase >= 1 && phase <= 10)
        : []
      : [];

    const validAssignedAreas = role === 'security'
      ? Array.isArray(assignedAreas)
        ? assignedAreas.map((area) => String(area).trim()).filter(Boolean)
        : []
      : [];

    const validPatrolSchedule = role === 'security'
      ? String(patrolSchedule).trim()
      : '';

    const userData = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      phone: formatPhilippineStaffPhone(phone),
      password,
      role,
      securityLevel: role === 'security' ? securityLevel : null,
      isApproved: true,
      approvalStatus: 'approved',
      isActive: true,
      profileComplete: true,
      assignedPhases: validAssignedPhases,
      assignedAreas: validAssignedAreas,
      patrolSchedule: validPatrolSchedule
    };

    // If security personnel, link to head officer
    if (role === 'security' && securityLevel === 'personnel') {
      const primaryHeadOfficer = await getPrimarySecurityHeadOfficer();
      const selectedSupervisorId = req.user.role === 'security'
        ? req.user._id
        : headOfficerId || null;

      userData.headOfficerId = primaryHeadOfficer?._id || selectedSupervisorId || null;
      userData.secondaryHeadOfficerId =
        selectedSupervisorId &&
        userData.headOfficerId &&
        String(selectedSupervisorId) !== String(userData.headOfficerId)
          ? selectedSupervisorId
          : null;
    }

    const newUser = await User.create(userData);
    await createInAppNotification({
      userId: newUser._id,
      type: 'account',
      title: 'Account created',
      body: `Your ${role} account has been created.`,
      metadata: { action: 'account_created', role, createdBy: req.user._id }
    });
    newUser.password = undefined;

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Export users data (CSV or PDF format)
router.get('/export', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      format = 'pdf',
      role,
      status,
      approval,
      view,
      search,
      startDate,
      endDate,
      timezoneOffset = 0
    } = req.query;
    const timezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;

    // Build filter based on query parameters
    let filter = { isArchived: { $ne: true } };
    if (role && role !== 'all') filter.role = role;
    if (status && status !== 'all') {
      if (status === 'active') filter.isActive = true;
      else if (status === 'inactive') filter.isActive = false;
      else if (status === 'moveout') {
        filter.role = 'resident';
        filter.moveOutStatus = 'pending';
      }
    }
    if (approval && approval !== 'all') {
      filter.role = 'resident';
      filter.isApproved = approval === 'approved';
    }
    if (view && view !== 'all') {
      if (view === 'residents') filter.role = 'resident';
      if (view === 'pending') {
        filter.role = 'resident';
        filter.isApproved = false;
      }
      if (view === 'moveout') {
        filter.role = 'resident';
        filter.moveOutStatus = 'pending';
      }
      if (view === 'staff') filter.role = { $in: ['admin', 'security'] };
    }
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { email: rx },
        { phone: rx },
        { houseNumber: rx }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    if (!users.length) {
      return res.status(404).json({
        success: false,
        error: 'No users found matching the criteria'
      });
    }

    const data = users.map(user => ({
      ID: user._id.toString(),
      'First Name': user.firstName,
      'Last Name': user.lastName,
      Email: user.email,
      Role: user.role,
      Status: user.isApproved ? (user.isActive ? 'Active' : 'Inactive') : 'Pending Approval',
      'Phone Number': user.phone || 'N/A',
      'Lot ID': user.houseNumber || 'N/A',
      'Approval Date': user.approvalDate ? user.approvalDate.toLocaleDateString() : 'N/A',
      'Created Date': user.createdAt.toLocaleDateString(),
      'Last Login': user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'
    }));

    const columns = [
      { header: 'ID', key: 'ID', width: 25 },
      { header: 'First Name', key: 'First Name', width: 15 },
      { header: 'Last Name', key: 'Last Name', width: 15 },
      { header: 'Email', key: 'Email', width: 25 },
      { header: 'Role', key: 'Role', width: 10 },
      { header: 'Status', key: 'Status', width: 15 },
      { header: 'Phone Number', key: 'Phone Number', width: 15 },
      { header: 'Lot ID', key: 'Lot ID', width: 10 },
      { header: 'Approval Date', key: 'Approval Date', width: 12 },
      { header: 'Created Date', key: 'Created Date', width: 12 },
      { header: 'Last Login', key: 'Last Login', width: 12 }
    ];

    const pdfColumns = [
      { header: 'ID', key: 'ID', width: 30 },
      { header: 'First Name', key: 'First Name', width: 18 },
      { header: 'Last Name', key: 'Last Name', width: 18 },
      { header: 'Email', key: 'Email', width: 38 },
      { header: 'Role', key: 'Role', width: 12 },
      { header: 'Status', key: 'Status', width: 20 },
      { header: 'Phone', key: 'Phone Number', width: 17 },
      { header: 'Lot', key: 'Lot ID', width: 12 },
      { header: 'Approved', key: 'Approval Date', width: 16 },
      { header: 'Created', key: 'Created Date', width: 16 },
      { header: 'Last Login', key: 'Last Login', width: 14 }
    ];

    const title = 'User Management Report';

    if (format === 'pdf') {
      const pdfReportService = require('../services/pdfReportService');
      const pdfBuffer = await pdfReportService.generateDataReport(title, data, pdfColumns, {
        creator: req.user,
        timezoneOffsetMinutes,
        layout: 'landscape',
        margin: 36,
        table: {
          headerFontSize: 8,
          bodyFontSize: 7.5,
          cellPadding: 3
        }
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Users_Export_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    const pdfReportService = require('../services/pdfReportService');
    const csvContent = pdfReportService.generateCsvReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="VIMS_Users_Export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export users'
    });
  }
});

module.exports = router;
