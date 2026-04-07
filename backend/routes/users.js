const express = require('express');
const router = express.Router();
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
    const users = await User.find()
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
      isApproved: false 
    })
    .select('-password')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers
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

    const verification = await IdentityVerification.findOne({ userId: user._id });
    if (!verification || verification.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Resident cannot be approved until ID verification status is approved.'
      });
    }
    
    // Update the lot status to occupied
    if (user.houseBlock && user.houseLot) {
      const lotId = `${user.houseBlock}-${user.houseLot}`;
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

// Reject/Delete user (for admin) - UPDATED to free up lot
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
          reason: 'Resident removed/rejected',
          performedBy: req.user._id
        });
        console.log(`✅ Lot ${lotId} freed up (was occupied by ${user.email})`);
      }
    }
    
    // Log this rejection
    console.log(`User rejected: ${user.email}, Reason: ${req.body.reason || 'No reason provided'}`);
    
    await user.deleteOne();
    
    res.json({
      success: true,
      message: 'User rejected and removed successfully'
    });
    
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject user'
    });
  }
});

// Get user stats summary
router.get('/stats/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const residents = await User.countDocuments({ role: 'resident' });
    const approvedResidents = await User.countDocuments({ 
      role: 'resident', 
      isApproved: true 
    });
    const pendingResidents = await User.countDocuments({
      role: 'resident',
      isApproved: false
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
    
    res.json({
      success: true,
      data: user
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
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
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
      'GET /api/users/pending-approvals',
      'PUT /api/users/:id/approve',
      'DELETE /api/users/:id',
      'GET /api/users/stats/summary',
      'PUT /api/users/:id/status'
    ]
  });
});

module.exports = router;