const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendVisitorReminderNotification } = require('../services/notificationService');

const decodeScanValue = (rawValue = '') => {
  if (!rawValue || typeof rawValue !== 'string') return '';

  const value = decodeURIComponent(rawValue).trim();
  if (!value) return '';

  // If scanner returns an URL, take the last non-empty segment.
  if (value.includes('/')) {
    const segments = value.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment.length >= 8) return lastSegment;
  }

  // If scanner returns JSON/base64 payload, attempt to extract token-like fields.
  const candidates = [value];
  try {
    candidates.push(Buffer.from(value, 'base64').toString('utf8'));
  } catch (error) {
    // ignore invalid base64
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed.qrToken) return String(parsed.qrToken);
      if (parsed.qrCode) return String(parsed.qrCode);
      if (parsed.token) return String(parsed.token);
    } catch (error) {
      // ignore invalid json
    }
  }

  return value;
};

router.get('/test', (req, res) => {
  console.log('/api/visitors/test route hit!');
  res.json({ 
    success: true, 
    message: 'Visitors API is working!',
    timestamp: new Date().toISOString()
  });
});

router.get('/admin/test', (req, res) => {
  console.log('/api/visitors/admin/test route hit!');
  res.json({ 
    success: true, 
    message: 'Admin visitors API is working!',
    timestamp: new Date().toISOString()
  });
});

// Get visitor history (all visitors for a resident)
router.get('/history', protect, authorize('resident'), async (req, res) => {
  try {
    const visitors = await Visitor.find({ residentId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    console.error('Get visitor history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visitor history'
    });
  }
});

router.get('/resident/dashboard', protect, authorize('resident'), async (req, res) => {
  try {
    // Get all data in parallel
    const [currentVisitors, allVisitors, stats] = await Promise.all([
      Visitor.find({ residentId: req.user.id }).sort({ createdAt: -1 }),
      Visitor.find({ residentId: req.user.id }).sort({ createdAt: -1 }),
      // Calculate stats
      (async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalVisitors = await Visitor.countDocuments({ residentId: req.user.id });
        const todayVisitors = await Visitor.countDocuments({
          residentId: req.user.id,
          expectedArrival: { $gte: today }
        });
        const activeVisitors = await Visitor.countDocuments({ 
          residentId: req.user.id,
          status: 'active' 
        });
        const pendingVisitors = await Visitor.countDocuments({ 
          residentId: req.user.id,
          status: 'pending' 
        });
        
        return { totalVisitors, todayVisitors, activeVisitors, pendingVisitors };
      })()
    ]);
    
    res.json({
      success: true,
      data: {
        currentVisitors,
        allVisitors,
        stats
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

router.post('/', protect, authorize('resident'), async (req, res) => {
  try {
    const {
      visitorName,
      visitorPhone,
      vehicleNumber,
      purpose,
      expectedArrival,
      expectedDeparture
    } = req.body;

    if (!visitorName || !visitorPhone || !purpose || !expectedArrival || !expectedDeparture) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      });
    }

    const qrToken = uuidv4();
    const qrCode = await QRCode.toDataURL(qrToken);
    
     const visitor = await Visitor.create({
      residentId: req.user.id,
      visitorName,
      visitorPhone,
      vehicleNumber: vehicleNumber || '',
      purpose,
      qrCode,
      qrToken,
      expectedArrival: new Date(expectedArrival),
      expectedDeparture: new Date(expectedDeparture),
      status: 'pending', 
      qrCodeVisible: false
    });

console.log('Visitor created with status:', visitor.status);
console.log('Full visitor object:', visitor);

    const resident = await User.findById(req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Visitor pass created successfully',
      data: {
        visitor,
        residentName: resident.fullName,
        residentHouse: resident.houseNumber,
        qrCodeUrl: qrCode
      }
    });
    
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create visitor pass'
    });
  }
});

router.get('/pending', protect, authorize('security'), async (req, res) => {
  try {
    console.log('Fetching pending visitors for security user:', req.user.id);
    
    const visitors = await Visitor.find({ 
      status: 'pending'  
    })
      .populate('residentId', 'firstName lastName houseNumber phone email')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${visitors.length} pending visitors`);
    
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
    
  } catch (error) {
    console.error('Get pending visitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending visitors: ' + error.message
    });
  }
});

router.put('/:id/approve', protect, authorize('security'), async (req, res) => {
  try {
    const { securityNotes } = req.body;
    
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }
    
    if (visitor.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending visitors can be approved'
      });
    }
    
    visitor.status = 'approved';
    visitor.approvedBy = req.user.id;
    visitor.approvedAt = new Date();
    visitor.qrCodeVisible = true;
    
    if (securityNotes) {
      visitor.securityNotes = securityNotes;
    }
    
    await visitor.save();

    const resident = await User.findById(visitor.residentId);
    
    res.json({
      success: true,
      message: 'Visitor request approved successfully',
      data: {
        visitor,
        residentName: resident.fullName,
        residentHouse: resident.houseNumber,
        qrCodeUrl: visitor.qrCode
      }
    });
    
  } catch (error) {
    console.error('Approve visitor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve visitor request'
    });
  }
});

router.put('/:id/reject', protect, authorize('security'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }
    
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }
    
    if (visitor.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending visitors can be rejected'
      });
    }
    
    visitor.status = 'rejected';
    visitor.rejectionReason = rejectionReason;
    visitor.qrCodeVisible = false;
    
    await visitor.save();
    
    res.json({
      success: true,
      message: 'Visitor request rejected',
      data: visitor
    });
    
  } catch (error) {
    console.error('Reject visitor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject visitor request'
    });
  }
});

router.get('/qr/:qrCode', protect, authorize('security'), async (req, res) => {
  try {
    const qrCode = decodeScanValue(req.params.qrCode);
    
    let visitor = await Visitor.findOne({ qrToken: qrCode })
      .populate('residentId', 'firstName lastName houseNumber phone');

    if (!visitor) {
      visitor = await Visitor.findOne({ qrCode })
      .populate('residentId', 'firstName lastName houseNumber phone');
    }
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Invalid QR code'
      });
    }
    
    res.json({
      success: true,
      data: visitor
    });
    
  } catch (error) {
    console.error('Verify QR error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify QR code'
    });
  }
});

router.post('/scan', protect, authorize('security'), async (req, res) => {
  try {
    const scanValue = decodeScanValue(req.body?.scanValue || req.body?.qrCode || '');
    if (!scanValue) {
      return res.status(400).json({ success: false, error: 'Scan value is required' });
    }

    let visitor = await Visitor.findOne({ qrToken: scanValue })
      .populate('residentId', 'firstName lastName houseNumber phone');
    if (!visitor) {
      visitor = await Visitor.findOne({ qrCode: scanValue })
        .populate('residentId', 'firstName lastName houseNumber phone');
    }
    if (!visitor) {
      return res.status(404).json({ success: false, error: 'Invalid QR code' });
    }

    res.json({ success: true, data: visitor });
  } catch (error) {
    console.error('QR scan parse error:', error);
    res.status(500).json({ success: false, error: 'Failed to process QR scan' });
  }
});

router.get('/:id/qr', protect, authorize('resident'), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }

    if (visitor.residentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this QR code'
      });
    }

    if (!visitor.qrCodeVisible) {
      return res.status(403).json({
        success: false,
        error: 'QR code is not available. Visitor request is not approved yet.'
      });
    }

    const resident = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        visitor,
        residentName: resident.fullName,
        residentHouse: resident.houseNumber,
        qrCodeUrl: visitor.qrCode,
        qrToken: visitor.qrToken,
        qrCodeVisible: visitor.qrCodeVisible
      }
    });
    
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code'
    });
  }
});

router.post('/admin/send-reminders', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingVisitors = await Visitor.find({
      status: { $in: ['approved', 'pending'] },
      expectedArrival: { $gte: now, $lte: in24h }
    }).populate('residentId', 'email phone firstName lastName');

    let sent = 0;
    const failures = [];

    for (const visitor of upcomingVisitors) {
      const resident = visitor.residentId;
      if (!resident) continue;

      const result = await sendVisitorReminderNotification(visitor, resident);
      if (result.emailResult.sent || result.smsResult.sent) {
        sent++;
      } else {
        failures.push({
          visitorId: visitor._id,
          reason: `${result.emailResult.reason || 'email_failed'}|${result.smsResult.reason || 'sms_failed'}`
        });
      }
    }

    res.json({
      success: true,
      totalCandidates: upcomingVisitors.length,
      remindersSent: sent,
      failures
    });
  } catch (error) {
    console.error('Send visitor reminders error:', error);
    res.status(500).json({ success: false, error: 'Failed to send visitor reminders' });
  }
});

router.put('/:id/entry', protect, authorize('security'), async (req, res) => {
  try {
    const { securityNotes } = req.body;
    
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }
    
    if (visitor.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Visitor pass has been cancelled'
      });
    }
    
    visitor.actualEntry = new Date();
    visitor.status = 'active';
    if (securityNotes) visitor.securityNotes = securityNotes;
    
    await visitor.save();
    
    res.json({
      success: true,
      message: 'Visitor entry logged successfully',
      data: visitor
    });
    
  } catch (error) {
    console.error('Log entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log entry'
    });
  }
});

router.put('/fix-status', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await Visitor.updateMany(
      { 
        $or: [
          { status: { $exists: false } },
          { status: { $nin: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'] } }
        ]
      },
      { $set: { status: 'pending', qrCodeVisible: false } }
    );
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} visitors to 'pending' status`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Fix status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/exit', protect, authorize('security'), async (req, res) => {
  try {
    const { securityNotes } = req.body;
    
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }
    
    if (visitor.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Visitor is not active'
      });
    }
    
    visitor.actualExit = new Date();
    visitor.status = 'completed';
    if (securityNotes) visitor.securityNotes += (visitor.securityNotes ? '\n' : '') + securityNotes;
    
    await visitor.save();
    
    res.json({
      success: true,
      message: 'Visitor exit logged successfully',
      data: visitor
    });
    
  } catch (error) {
    console.error('Log exit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log exit'
    });
  }
});

router.get('/my', protect, authorize('resident'), async (req, res) => {
  try {
    const visitors = await Visitor.find({ residentId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
    
  } catch (error) {
    console.error('Get my visitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visitors'
    });
  }
});

router.get('/debug/all', async (req, res) => {
  try {
    const visitors = await Visitor.find({})
      .populate('residentId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: visitors.length,
      data: visitors.map(v => ({
        id: v._id,
        visitorName: v.visitorName,
        residentName: v.residentId?.firstName + ' ' + v.residentId?.lastName,
        status: v.status,
        qrCodeVisible: v.qrCodeVisible,
        createdAt: v.createdAt,
        approvedBy: v.approvedBy?.firstName,
        rejectionReason: v.rejectionReason
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    const { status, date } = req.query;
    
    let filter = {};
    
    if (status) filter.status = status;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.expectedArrival = { $gte: startDate, $lte: endDate };
    }
    
    const visitors = await Visitor.find(filter)
      .populate('residentId', 'firstName lastName houseNumber')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
    
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visitors'
    });
  }
});

router.get('/stats/summary', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalVisitors = await Visitor.countDocuments();
    const todayVisitors = await Visitor.countDocuments({
      expectedArrival: { $gte: today }
    });
    const activeVisitors = await Visitor.countDocuments({ status: 'active' });
    const pendingVisitors = await Visitor.countDocuments({ status: 'pending' });
    const approvedVisitors = await Visitor.countDocuments({ status: 'approved' });
    const rejectedVisitors = await Visitor.countDocuments({ status: 'rejected' });
    
    res.json({
      success: true,
      data: {
        totalVisitors,
        todayVisitors,
        activeVisitors,
        pendingVisitors,
        approvedVisitors,
        rejectedVisitors
      }
    });
    
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visitor statistics'
    });
  }
});

// Get all visitors (admin only - includes security approvals)
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, startDate, endDate, residentId } = req.query;
    
    let filter = {};
    
    // Filter by status
    if (status) filter.status = status;
    
    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    // Filter by resident
    if (residentId) filter.residentId = residentId;
    
    const visitors = await Visitor.find(filter)
      .populate('residentId', 'firstName lastName houseNumber email phone')
      .populate('approvedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
    
  } catch (error) {
    console.error('Admin get all visitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visitors'
    });
  }
});

// Get visitor logs with filters (admin only)
router.get('/admin/logs', protect, authorize('admin'), async (req, res) => {
  try {
    const { 
      status, 
      date, 
      residentName, 
      visitorName, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    let filter = {};
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Date filter
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.expectedArrival = { $gte: startDate, $lte: endDate };
    }
    
    // Resident name filter (using regex)
    if (residentName) {
      const residents = await User.find({
        $or: [
          { firstName: { $regex: residentName, $options: 'i' } },
          { lastName: { $regex: residentName, $options: 'i' } }
        ]
      }).select('_id');
      
      const residentIds = residents.map(r => r._id);
      filter.residentId = { $in: residentIds };
    }
    
    // Visitor name filter
    if (visitorName) {
      filter.visitorName = { $regex: visitorName, $options: 'i' };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const visitors = await Visitor.find(filter)
      .populate('residentId', 'firstName lastName houseNumber')
      .populate('approvedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Visitor.countDocuments(filter);
    
    res.json({
      success: true,
      data: visitors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get visitor logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visitor logs'
    });
  }
});

// Admin override approval/rejection
router.put('/admin/:id/override', protect, authorize('admin'), async (req, res) => {
  try {
    const { action, reason, notes } = req.body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "approve" or "reject"'
      });
    }
    
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }
    
    // Store previous status for audit trail
    const previousStatus = visitor.status;
    const previousApprovedBy = visitor.approvedBy;
    
    if (action === 'approve') {
      visitor.status = 'approved';
      visitor.approvedBy = req.user.id;
      visitor.approvedAt = new Date();
      visitor.qrCodeVisible = true;
      
      if (reason) {
        visitor.overrideReason = `Admin override: ${reason}`;
      }
    } else if (action === 'reject') {
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Reason is required for rejection'
        });
      }
      
      visitor.status = 'rejected';
      visitor.rejectionReason = reason;
      visitor.qrCodeVisible = false;
      visitor.overrideReason = `Admin override: ${reason}`;
    }
    
    if (notes) {
      visitor.adminNotes = notes;
    }
    
    // Add to audit trail
    visitor.auditTrail = visitor.auditTrail || [];
    visitor.auditTrail.push({
      action: `admin_${action}`,
      performedBy: req.user.id,
      previousStatus,
      newStatus: visitor.status,
      reason: reason || notes,
      timestamp: new Date()
    });
    
    await visitor.save();
    
    // Get resident info for notification
    const resident = await User.findById(visitor.residentId);
    
    res.json({
      success: true,
      message: `Visitor ${action}d successfully`,
      data: {
        visitor,
        residentName: resident.fullName,
        residentHouse: resident.houseNumber,
        previousStatus,
        performedBy: {
          id: req.user.id,
          name: req.user.fullName,
          role: req.user.role
        }
      }
    });
    
  } catch (error) {
    console.error('Admin override error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process override'
    });
  }
});

// Get visitor statistics for admin
router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Basic counts
    const totalVisitors = await Visitor.countDocuments();
    const todayVisitors = await Visitor.countDocuments({
      createdAt: { $gte: today }
    });
    const pendingVisitors = await Visitor.countDocuments({ status: 'pending' });
    const activeVisitors = await Visitor.countDocuments({ status: 'active' });
    const approvedVisitors = await Visitor.countDocuments({ status: 'approved' });
    const rejectedVisitors = await Visitor.countDocuments({ status: 'rejected' });
    
    // Daily stats for last 30 days
    const dailyStats = await Visitor.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      },
      {
        $limit: 30
      }
    ]);
    
    // Status distribution
    const statusDistribution = await Visitor.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Security personnel approval stats
    const securityApprovals = await Visitor.aggregate([
      {
        $match: { approvedBy: { $exists: true } }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approver'
        }
      },
      {
        $unwind: '$approver'
      },
      {
        $match: { 'approver.role': 'security' }
      },
      {
        $group: {
          _id: '$approvedBy',
          name: { $first: '$approver.firstName' },
          count: { $sum: 1 },
          lastApproval: { $max: '$approvedAt' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totals: {
          totalVisitors,
          todayVisitors,
          pendingVisitors,
          activeVisitors,
          approvedVisitors,
          rejectedVisitors
        },
        dailyStats,
        statusDistribution,
        securityApprovals,
        timeRange: {
          start: thirtyDaysAgo,
          end: new Date()
        }
      }
    });
    
  } catch (error) {
    console.error('Get admin visitor stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visitor statistics'
    });
  }
});

// Export visitors data (CSV format)
router.get('/admin/export', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let filter = {};
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }
    
    const visitors = await Visitor.find(filter)
      .populate('residentId', 'firstName lastName houseNumber email')
      .populate('approvedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    
    // Convert to CSV format
    const csvData = visitors.map(v => ({
      'Visitor ID': v._id,
      'Visitor Name': v.visitorName,
      'Visitor Phone': v.visitorPhone,
      'Purpose': v.purpose,
      'Vehicle Number': v.vehicleNumber || 'N/A',
      'Resident Name': `${v.residentId?.firstName || ''} ${v.residentId?.lastName || ''}`,
      'Resident House': v.residentId?.houseNumber || 'N/A',
      'Expected Arrival': v.expectedArrival,
      'Expected Departure': v.expectedDeparture,
      'Actual Entry': v.actualEntry || 'N/A',
      'Actual Exit': v.actualExit || 'N/A',
      'Status': v.status,
      'Approved By': v.approvedBy ? `${v.approvedBy.firstName} ${v.approvedBy.lastName} (${v.approvedBy.role})` : 'N/A',
      'Approval Time': v.approvedAt || 'N/A',
      'Rejection Reason': v.rejectionReason || 'N/A',
      'Created At': v.createdAt,
      'Security Notes': v.securityNotes || 'N/A'
    }));
    
    res.json({
      success: true,
      data: csvData,
      filename: `visitors_export_${new Date().toISOString().split('T')[0]}.json`,
      count: csvData.length
    });
    
  } catch (error) {
    console.error('Export visitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export visitors data'
    });
  }
});

// Resident dashboard - get all data in one call
router.get('/resident/dashboard', protect, authorize('resident'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all data in parallel for better performance
    const [currentVisitors, allVisitors, stats] = await Promise.all([
      // Current visitors (for main view)
      Visitor.find({ residentId: req.user.id }).sort({ createdAt: -1 }),
      
      // All visitors (for history view)
      Visitor.find({ residentId: req.user.id }).sort({ createdAt: -1 }),
      
      // Calculate stats
      (async () => {
        const totalVisitors = await Visitor.countDocuments({ residentId: req.user.id });
        const todayVisitors = await Visitor.countDocuments({
          residentId: req.user.id,
          expectedArrival: { $gte: today }
        });
        const activeVisitors = await Visitor.countDocuments({ 
          residentId: req.user.id,
          status: 'active' 
        });
        const pendingVisitors = await Visitor.countDocuments({ 
          residentId: req.user.id,
          status: 'pending' 
        });
        
        return { totalVisitors, todayVisitors, activeVisitors, pendingVisitors };
      })()
    ]);
    
    res.json({
      success: true,
      data: {
        currentVisitors,
        allVisitors,
        stats
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard data'
    });
  }
});

module.exports = router;