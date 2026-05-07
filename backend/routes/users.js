const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const Lot = require('../models/Lot');
const OccupancyHistory = require('../models/OccupancyHistory');
const IdentityVerification = require('../models/IdentityVerification');
const { protect, authorize } = require('../middleware/auth');
const { sendOnboardingNotification } = require('../services/notificationService');
const { createInAppNotification } = require('../services/inAppNotificationService');

// ===== TEST ROUTE - REMOVE AFTER DEBUGGING =====
router.get('/test', (req, res) => {
  console.log('/api/users/test route hit!');
  res.json({ 
    success: true, 
    message: 'Users API is working!',
    path: '/api/users/test',
    timestamp: new Date().toISOString()
  });
});

// ===== TEST ROUTE 2 - Without protection =====
router.get('/public-test', (req, res) => {
  console.log('/api/users/public-test route hit!');
  res.json({ 
    success: true, 
    message: 'Public test route is working!',
    path: '/api/users/public-test',
    timestamp: new Date().toISOString()
  });
});

// ===== TEST ROUTE 3 - Profile test without protection =====
router.get('/profile-test', (req, res) => {
  console.log('/api/users/profile-test route hit!');
  res.json({ 
    success: true, 
    message: 'Profile test route is working!',
    path: '/api/users/profile-test',
    timestamp: new Date().toISOString()
  });
});

// Get all users (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ isArchived: false })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      data: users
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
    const pendingUsers = await User.find({ 
      role: 'resident', 
      isApproved: false,
      isArchived: false
    })
    .select('-password')
    .sort({ createdAt: -1 });

    const verificationRecords = await IdentityVerification.find({
      userId: { $in: pendingUsers.map((user) => user._id) }
    }).select('userId status updatedAt frontImage backImage selfieImage');

    const verificationMap = new Map(
      verificationRecords.map((record) => [String(record.userId), record])
    );

    const data = pendingUsers.map((user) => {
      const verification = verificationMap.get(String(user._id));
      const hasUploadedId = !!(verification?.frontImage && verification?.backImage);
      return {
        ...user.toObject(),
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
        console.log(`✅ Lot ${lotId} marked as occupied by ${user.email}`);
      } else if (lot && lot.status !== 'vacant') {
        console.log(`⚠️ Lot ${lotId} is already ${lot.status}, cannot approve user`);
        return res.status(400).json({
          success: false,
          error: `This lot (${lotId}) is no longer available. Please contact admin.`
        });
      } else {
        console.log(`⚠️ Lot ${lotId} not found in database`);
        return res.status(400).json({
          success: false,
          error: `Lot ${lotId} not found. Please contact admin.`
        });
      }
    }
    
    user.isApproved = true;
    await user.save();
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

// Archive user (instead of delete) - UPDATED to free up lot
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
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
        console.log(`✅ Lot ${lotId} freed up (was occupied by ${user.email})`);
      }
    }
    
    // Archive the user instead of deleting
    user.isArchived = true;
    user.archivedAt = new Date();
    user.archivedBy = req.user._id;
    user.archivedReason = req.body.reason || 'No reason provided';
    await user.save();
    
    console.log(`📦 User archived: ${user.email}, Reason: ${user.archivedReason}`);
    
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
    user.archivedAt = null;
    user.archivedBy = null;
    user.archivedReason = '';
    await user.save();
    
    console.log(`♻️ User restored: ${user.email}`);
    
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
    const users = await User.find({ isArchived: true })
      .populate('archivedBy', 'firstName lastName email')
      .sort({ archivedAt: -1 });
    
    res.json({
      success: true,
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

console.log('🔧 Loading users route file');
const profilePhotoDir = path.join(__dirname, '../uploads/profile-photos');
if (!fs.existsSync(profilePhotoDir)) {
  fs.mkdirSync(profilePhotoDir, { recursive: true });
}

const photoStorage = multer.diskStorage({
  destination: profilePhotoDir,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9\.\-]/g, '_');
    cb(null, `${req.user.id}_${timestamp}_${safeName}`);
  }
});

const photoUpload = multer({
  storage: photoStorage,
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
  console.log('🔧 Received POST /api/users/profile-photo');
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No photo file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.profilePhoto = req.file.filename;
    await user.save();

    const photoUrl = `${req.protocol}://${req.get('host')}/uploads/profile-photos/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: { profilePhoto: req.file.filename, profilePhotoUrl: photoUrl }
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
    const allowedUpdates = ['phone', 'emergencyContact', 'vehicles', 'familyMembers'];

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

    Object.assign(user, filteredUpdates);
    user.profileComplete = true;

    await user.save();
    user.password = undefined;

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
      userObj.profilePhotoUrl = `${req.protocol}://${req.get('host')}/uploads/profile-photos/${user.profilePhoto}`;
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
      userObj.profilePhotoUrl = `${req.protocol}://${req.get('host')}/uploads/profile-photos/${user.profilePhoto}`;
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
    const rows = await User.find({ role: 'resident', moveOutStatus: 'pending', isArchived: false })
      .select('-password')
      .sort({ moveOutRequestedAt: -1 });
    return res.json({ success: true, count: rows.length, data: rows });
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
          console.log(`✅ Lot ${lotId} vacated (move-out) for ${user.email}`);
        } else {
          console.log(`⚠️ Lot ${lotId} occupied by different user; skipping vacate`);
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

    user.isActive = isActive;
    await user.save();

    user.password = undefined;

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

// Create admin and security users (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      assignedPhases = [],
      assignedAreas = [],
      patrolSchedule = ''
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !role) {
      return res.status(400).json({ success: false, error: 'All required fields must be provided' });
    }

    if (!['admin', 'security'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Only admin or security accounts can be created here' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    const validAssignedPhases = Array.isArray(assignedPhases)
      ? assignedPhases.map((phase) => Number(phase)).filter((phase) => Number.isInteger(phase) && phase >= 1 && phase <= 10)
      : [];

    const validAssignedAreas = Array.isArray(assignedAreas)
      ? assignedAreas.map((area) => String(area).trim()).filter(Boolean)
      : [];

    const userData = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone).trim(),
      password,
      role,
      securityLevel: role === 'security' ? 'personnel' : null,
      isApproved: true,
      isActive: true,
      profileComplete: true,
      assignedPhases: role === 'security' ? validAssignedPhases : [],
      assignedAreas: role === 'security' ? validAssignedAreas : [],
      patrolSchedule: role === 'security' ? String(patrolSchedule).trim() : ''
    };

    const newUser = await User.create(userData);
    newUser.password = undefined;

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Wildcard route for debugging
router.get('*', (req, res) => {
  console.log('Wildcard route hit in users.js!');
  console.log('Original URL:', req.originalUrl);
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  
  res.json({
    success: false,
    error: 'Route not found in users.js',
    originalUrl: req.originalUrl,
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /api/users/test',
      'GET /api/users/public-test',
      'GET /api/users/profile-test',
      'GET /api/users/profile',
      'PUT /api/users/profile',
      'GET /api/users/:id/profile',
      'GET /api/users/',
      'POST /api/users/',
      'GET /api/users/pending-approvals',
      'PUT /api/users/:id/approve',
      'DELETE /api/users/:id',
      'GET /api/users/stats/summary',
      'PUT /api/users/:id/status'
    ]
  });
});

// Get user registration stats by month/year (admin only)
router.get('/stats/registrations', protect, authorize('admin'), async (req, res) => {
  try {
    const { year, month } = req.query;
    let startDate, endDate;

    if (year && month) {
      // Specific month
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    } else {
      // Current month by default
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      endDate = new Date();
    }

    const count = await User.countDocuments({
      role: 'resident',
      createdAt: { $gte: startDate, $lte: endDate },
      isArchived: false
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get registration stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get registration stats'
    });
  }
});

module.exports = router;
