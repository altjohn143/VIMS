const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendVisitorReminderNotification } = require('../services/notificationService');
const { createInAppNotification } = require('../services/inAppNotificationService');

const MAX_VISITOR_STAY_MS = 3 * 24 * 60 * 60 * 1000;

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

const findVisitorByScanValue = async (scanValue) => {
  const normalized = decodeScanValue(scanValue);
  if (!normalized) return null;

  let visitor = await Visitor.findOne({ qrToken: normalized }).populate(
    'residentId',
    'firstName lastName houseNumber houseBlock houseLot phone email'
  );

  if (!visitor) {
    visitor = await Visitor.findOne({ qrCode: normalized }).populate(
      'residentId',
      'firstName lastName houseNumber houseBlock houseLot phone email'
    );
  }

  return visitor;
};

const getVisitorGroupSize = (visitor) => Math.max(1, Number(visitor?.numberOfCompanions) || 0);

const getVisitorProgress = (visitor) => {
  const groupSize = getVisitorGroupSize(visitor);
  const entryScanCount = Number(visitor?.entryScanCount || 0);
  const residentArrivalConfirmCount = Number(visitor?.residentArrivalConfirmCount || 0);
  const residentDepartureConfirmCount = Number(visitor?.residentDepartureConfirmCount || 0);
  const exitScanCount = Number(visitor?.exitScanCount || 0);

  return {
    groupSize,
    entryScanCount,
    residentArrivalConfirmCount,
    residentDepartureConfirmCount,
    exitScanCount,
    remainingEntryScans: Math.max(0, groupSize - entryScanCount),
    remainingArrivalConfirmations: Math.max(0, groupSize - residentArrivalConfirmCount),
    remainingDepartureConfirmations: Math.max(0, groupSize - residentDepartureConfirmCount),
    remainingExitScans: Math.max(0, groupSize - exitScanCount)
  };
};

const getVisitorQrStatus = (visitor) => {
  if (!visitor) return 'Unknown';
  const progress = getVisitorProgress(visitor);
  if (visitor.status === 'pending') return 'Pending';
  if (visitor.status === 'approved') return 'Approved';
  if (visitor.status === 'active') {
    if (progress.exitScanCount > 0) return 'Exited';
    if (progress.residentDepartureConfirmCount > 0) return 'Departed';
    if (progress.residentArrivalConfirmCount > 0) return 'Arrived';
    if (progress.entryScanCount > 0) return 'Entered';
    return 'Active';
  }
  if (visitor.status === 'completed') return 'Exited';
  if (visitor.status === 'rejected') return 'Rejected';
  if (visitor.status === 'cancelled') return 'Cancelled';
  return typeof visitor.status === 'string'
    ? visitor.status.charAt(0).toUpperCase() + visitor.status.slice(1)
    : 'Unknown';
};

const attachQrStatus = (visitor) => {
  if (!visitor) return visitor;
  normalizeVisitorScanCounters(visitor);
  const qrStatus = getVisitorQrStatus(visitor);
  const scanProgress = getVisitorProgress(visitor);

  if (typeof visitor.set === 'function') {
    visitor.set('qrStatus', qrStatus, { strict: false });
    visitor.set('scanProgress', scanProgress, { strict: false });
  }
  visitor.qrStatus = qrStatus;
  visitor.scanProgress = scanProgress;
  return visitor;
};

const normalizeVisitorScanCounters = (visitor) => {
  if (!visitor) return visitor;
  const groupSize = getVisitorGroupSize(visitor);
  if (visitor.actualEntry && Number(visitor.entryScanCount || 0) <= 0) {
    visitor.entryScanCount = groupSize;
  }
  if (visitor.residentEntryConfirmedAt && Number(visitor.residentArrivalConfirmCount || 0) <= 0) {
    visitor.residentArrivalConfirmCount = groupSize;
  }
  if (visitor.residentDepartureConfirmedAt && Number(visitor.residentDepartureConfirmCount || 0) <= 0) {
    visitor.residentDepartureConfirmCount = groupSize;
  }
  if (visitor.actualExit && Number(visitor.exitScanCount || 0) <= 0) {
    visitor.exitScanCount = groupSize;
  }
  return visitor;
};

const getExitPrerequisiteMessage = (visitor) => {
  const progress = getVisitorProgress(visitor);
  if (progress.entryScanCount <= 0) {
    return 'Scan visitor entry at the gate first before exiting.';
  }
  if (progress.residentArrivalConfirmCount <= 0) {
    return 'Resident must scan to confirm the visitor arrived at the house before exit.';
  }
  if (progress.residentDepartureConfirmCount <= 0) {
    return 'Resident must scan for departure first before exiting.';
  }
  return '';
};

const notifyJurisdictionSecurityOfDeparture = async (visitor) => {
  const resident = visitor?.residentId;
  if (!resident) return;

  const phaseMatch = String(resident.houseNumber || '').match(/P(\d+)/i);
  const phase = phaseMatch ? Number(phaseMatch[1]) : NaN;
  const block = String(resident.houseBlock || '').trim();
  const lot = String(resident.houseLot || '').trim();
  const areaText = [
    Number.isFinite(phase) ? `Phase ${phase}` : '',
    block ? `Block ${block}` : '',
    lot ? `Lot ${lot}` : ''
  ].filter(Boolean).join(' - ');

  const areaRegex = areaText
    ? new RegExp(areaText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    : null;

  const jurisdictionFilters = [];
  if (Number.isFinite(phase)) jurisdictionFilters.push({ assignedPhases: phase });
  if (areaRegex) jurisdictionFilters.push({ assignedAreas: areaRegex });

  const officers = await User.find({
    role: 'security',
    isActive: true,
    $or: [
      { securityLevel: 'head-officer' },
      ...(jurisdictionFilters.length ? jurisdictionFilters : [{ _id: null }])
    ]
  }).select('_id');

  await Promise.all(officers.map((officer) => createInAppNotification({
    userId: officer._id,
    type: 'visitor',
    title: 'Visitor departure confirmed',
    body: `${visitor.visitorName} has left the resident's house${areaText ? ` at ${areaText}` : ''}. Prepare for gate exit scan.`,
    metadata: {
      visitorId: visitor._id,
      residentId: resident._id || resident,
      event: 'resident_departure_confirmed',
      phase: Number.isFinite(phase) ? phase : undefined,
      block,
      lot
    }
  })));
};

const notifyResidentOverstays = async (filter = {}) => {
  const now = new Date();
  const overdueVisitors = await Visitor.find({
    ...filter,
    status: { $in: ['approved', 'active'] },
    expectedDeparture: { $lt: now },
    overstayNotifiedAt: { $exists: false }
  });

  if (overdueVisitors.length === 0) return;

  for (const visitor of overdueVisitors) {
    await createInAppNotification({
      userId: visitor.residentId,
      type: 'visitor_overstay',
      title: 'Visitor overstaying alert',
      body: `${visitor.visitorName} has exceeded departure time. Security personnel will proceed to your address.`,
      metadata: { visitorId: visitor._id, status: visitor.status, expectedDeparture: visitor.expectedDeparture }
    });
    visitor.overstayNotifiedAt = now;
    await visitor.save();
  }
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

    visitors.forEach(attachQrStatus);
    
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
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const totalVisitors = await Visitor.countDocuments({ residentId: req.user.id });
        const todayVisitors = await Visitor.countDocuments({
          residentId: req.user.id,
          expectedArrival: { $gte: today, $lt: tomorrow }
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

// Security dashboard stats
router.get('/security/dashboard', protect, authorize('security'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [visitorsToday, pendingApproval, activeNow, completed] = await Promise.all([
      Visitor.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      Visitor.countDocuments({ status: 'pending' }),
      Visitor.countDocuments({ status: 'active' }),
      Visitor.countDocuments({ status: 'completed', updatedAt: { $gte: today, $lt: tomorrow } }),
    ]);

    return res.json({
      success: true,
      data: { visitorsToday, pendingApproval, activeNow, completed },
    });
  } catch (error) {
    console.error('Security dashboard error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load security dashboard' });
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
      expectedDeparture,
      numberOfCompanions = 0
    } = req.body;

    if (!visitorName || !visitorPhone || !purpose || !expectedArrival || !expectedDeparture) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      });
    }

    const companionsCount = parseInt(numberOfCompanions, 10) || 0;
    if (companionsCount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Number of companions must be zero or positive'
      });
    }

    const arrivalDate = new Date(expectedArrival);
    const departureDate = new Date(expectedDeparture);

    if (Number.isNaN(arrivalDate.getTime()) || Number.isNaN(departureDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Arrival and departure dates must be valid'
      });
    }

    if (departureDate <= arrivalDate) {
      return res.status(400).json({
        success: false,
        error: 'Expected departure must be after expected arrival'
      });
    }

    if (departureDate.getTime() - arrivalDate.getTime() > MAX_VISITOR_STAY_MS) {
      return res.status(400).json({
        success: false,
        error: 'Visitors cannot stay more than 3 days in the village'
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
      numberOfCompanions: companionsCount,
      qrCode,
      qrToken,
      expectedArrival: arrivalDate,
      expectedDeparture: departureDate,
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

router.put('/:id/approve', protect, authorize('admin', 'security'), async (req, res) => {
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
    await createInAppNotification({
      userId: visitor.residentId,
      type: 'visitor',
      title: 'Visitor approved',
      body: `${visitor.visitorName} has been approved for gate entry.`,
      metadata: { visitorId: visitor._id }
    });

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

router.put('/:id/reject', protect, authorize('admin', 'security'), async (req, res) => {
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
    await createInAppNotification({
      userId: visitor.residentId,
      type: 'visitor',
      title: 'Visitor rejected',
      body: `${visitor.visitorName} was rejected: ${rejectionReason}`,
      metadata: { visitorId: visitor._id }
    });
    
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

    attachQrStatus(visitor);
    
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

    attachQrStatus(visitor);
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

    attachQrStatus(visitor);
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

const cancelResidentVisitorRequest = async (req, res) => {
  try {
    const { status = 'cancelled' } = req.body;

    if (status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Residents can only cancel visitor requests'
      });
    }

    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
    }

    if (String(visitor.residentId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this visitor request'
      });
    }

    if (visitor.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending visitor requests can be cancelled'
      });
    }

    visitor.status = 'cancelled';
    visitor.qrCodeVisible = false;
    visitor.cancelledAt = new Date();
    visitor.cancelledBy = req.user._id;
    await visitor.save();
    attachQrStatus(visitor);

    return res.json({
      success: true,
      message: 'Visitor request cancelled',
      data: visitor
    });
  } catch (error) {
    console.error('Cancel visitor request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel visitor request'
    });
  }
};

router.put('/:id/status', protect, authorize('resident'), cancelResidentVisitorRequest);
router.put('/:id/cancel', protect, authorize('resident'), cancelResidentVisitorRequest);

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
    
    if (!['approved', 'active'].includes(visitor.status)) {
      return res.status(400).json({
        success: false,
        error: `Visitor must be approved before entry can be logged (current: ${visitor.status})`
      });
    }
    const progress = getVisitorProgress(visitor);
    if (progress.entryScanCount >= progress.groupSize) {
      return res.status(400).json({ success: false, error: 'All visitors on this pass have already been scanned for gate entry.' });
    }
    
    visitor.entryScanCount = progress.entryScanCount + 1;
    if (!visitor.actualEntry) visitor.actualEntry = new Date();
    visitor.status = 'active';
    if (securityNotes) visitor.securityNotes = securityNotes;
    
    await visitor.save();
    attachQrStatus(visitor);
    await createInAppNotification({
      userId: visitor.residentId,
      type: 'visitor',
      title: 'Visitor at the gate',
      body: `Your visitor ${visitor.visitorName} is approved and heading to your place. Entry ${visitor.scanProgress.entryScanCount}/${visitor.scanProgress.groupSize}.`,
      metadata: { visitorId: visitor._id, event: 'entry_logged' }
    });
    
    res.json({
      success: true,
      message: `Visitor entry logged (${visitor.scanProgress.entryScanCount}/${visitor.scanProgress.groupSize}).`,
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
    
    const exitPrerequisiteMessage = getExitPrerequisiteMessage(visitor);
    if (exitPrerequisiteMessage) {
      return res.status(400).json({
        success: false,
        error: exitPrerequisiteMessage
      });
    }

    const progress = getVisitorProgress(visitor);
    if (progress.exitScanCount >= progress.groupSize) {
      return res.status(400).json({ success: false, error: 'All visitors on this pass have already been scanned for gate exit.' });
    }
    if (progress.exitScanCount >= progress.residentDepartureConfirmCount) {
      return res.status(400).json({
        success: false,
        error: 'Resident must confirm another visitor departure before this gate exit scan.'
      });
    }

    visitor.exitScanCount = progress.exitScanCount + 1;
    if (visitor.exitScanCount >= progress.groupSize) {
      visitor.actualExit = new Date();
      visitor.status = 'completed';
    }
    if (securityNotes) visitor.securityNotes += (visitor.securityNotes ? '\n' : '') + securityNotes;
    
    await visitor.save();
    attachQrStatus(visitor);
    await createInAppNotification({
      userId: visitor.residentId,
      type: 'visitor',
      title: visitor.status === 'completed' ? 'Visitor pass completed' : 'Visitor gate exit logged',
      body: visitor.status === 'completed'
        ? `${visitor.visitorName} and all companions have exited. Visitor pass is now completed and no longer valid.`
        : `${visitor.visitorName} gate exit logged (${visitor.scanProgress.exitScanCount}/${visitor.scanProgress.groupSize}).`,
      metadata: { visitorId: visitor._id, event: 'exit_logged' }
    });
    
    res.json({
      success: true,
      message: `Visitor exit logged (${visitor.scanProgress.exitScanCount}/${visitor.scanProgress.groupSize}).`,
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
    await notifyResidentOverstays({ residentId: req.user.id });
    const visitors = await Visitor.find({ residentId: req.user.id })
      .sort({ createdAt: -1 });

    visitors.forEach(attachQrStatus);
    
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
    await notifyResidentOverstays();
    const { status, date, search = '', format = 'json', timezoneOffset = '0' } = req.query;
    const timezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;
    
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
      .populate('residentId', 'firstName lastName houseNumber email')
      .populate('approvedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    visitors.forEach(attachQrStatus);

    if (format === 'pdf' || format === 'csv') {
      const pdfReportService = require('../services/pdfReportService');
      const formatExportDate = (value) => (
        value ? new Date(value).toLocaleString('en-US') : 'N/A'
      );
      const formatPersonName = (person) => (
        person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'N/A' : 'N/A'
      );
      const rows = visitors.map((visitor) => ({
        'Visitor Name': visitor.visitorName || 'N/A',
        'Phone': visitor.visitorPhone || 'N/A',
        'Resident': formatPersonName(visitor.residentId),
        'House': visitor.residentId?.houseNumber || 'N/A',
        'Purpose': visitor.purpose || 'N/A',
        'Status': visitor.status || 'N/A',
        'Expected Arrival': formatExportDate(visitor.expectedArrival),
        'Expected Departure': formatExportDate(visitor.expectedDeparture),
        'Entry Time': formatExportDate(visitor.actualEntry),
        'Exit Time': formatExportDate(visitor.actualExit),
        'Approved By': visitor.approvedBy
          ? `${formatPersonName(visitor.approvedBy)}${visitor.approvedBy.role ? ` (${visitor.approvedBy.role})` : ''}`
          : 'N/A',
        'Created At': formatExportDate(visitor.createdAt)
      }));
      const columns = [
        { header: 'Visitor Name', key: 'Visitor Name', width: 18 },
        { header: 'Phone', key: 'Phone', width: 14 },
        { header: 'Resident', key: 'Resident', width: 18 },
        { header: 'House', key: 'House', width: 10 },
        { header: 'Purpose', key: 'Purpose', width: 22 },
        { header: 'Status', key: 'Status', width: 12 },
        { header: 'Expected Arrival', key: 'Expected Arrival', width: 18 },
        { header: 'Entry Time', key: 'Entry Time', width: 18 },
        { header: 'Exit Time', key: 'Exit Time', width: 18 },
        { header: 'Approved By', key: 'Approved By', width: 18 }
      ];
      const title = 'Visitor Logs Report';
      const todayStamp = new Date().toISOString().split('T')[0];

      if (format === 'pdf') {
        const pdfBuffer = await pdfReportService.generateDataReport(title, rows, columns, {
          creator: req.user,
          timezoneOffsetMinutes,
          layout: 'landscape',
          margin: 36,
          table: { headerFontSize: 8, bodyFontSize: 7.5, cellPadding: 3, maxRows: 120 }
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="VIMS_Visitor_Logs_${todayStamp}.pdf"`);
        return res.send(pdfBuffer);
      }

      const csvColumns = Object.keys(rows[0] || {
        'Visitor Name': '',
        Phone: '',
        Resident: '',
        House: '',
        Purpose: '',
        Status: '',
        'Expected Arrival': '',
        'Expected Departure': '',
        'Entry Time': '',
        'Exit Time': '',
        'Approved By': '',
        'Created At': ''
      }).map((key) => ({ header: key, key }));
      const csvContent = pdfReportService.generateCsvReport(title, rows, csvColumns, { creator: req.user, timezoneOffsetMinutes });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Visitor_Logs_${todayStamp}.csv"`);
      return res.send(csvContent);
    }
    
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

router.post('/scan-action', protect, authorize('security'), async (req, res) => {
  try {
    const scanValue = req.body?.scanValue || req.body?.qrCode || '';
    const requestedAction = String(req.body?.action || '').toLowerCase();
    const securityNotes = req.body?.securityNotes || '';
    const visitor = await findVisitorByScanValue(scanValue);

    if (!visitor) {
      return res.status(404).json({ success: false, error: 'Invalid QR code' });
    }

    const progress = getVisitorProgress(visitor);
    const action = requestedAction || (visitor.status === 'approved' || progress.entryScanCount < progress.groupSize ? 'entry' : 'exit');

    if (!['entry', 'exit'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Scan action must be entry or exit.' });
    }

    if (action === 'entry') {
      if (!['approved', 'active'].includes(visitor.status)) {
        return res.status(400).json({
          success: false,
          error: `Visitor pass is currently ${visitor.status} and cannot be scanned for gate entry.`
        });
      }
      if (progress.entryScanCount >= progress.groupSize) {
        return res.status(400).json({
          success: false,
          error: 'All visitors on this pass have already been scanned for gate entry.'
        });
      }

      visitor.entryScanCount = progress.entryScanCount + 1;
      if (!visitor.actualEntry) visitor.actualEntry = new Date();
      visitor.status = 'active';
      if (securityNotes) visitor.securityNotes = securityNotes;
      await visitor.save();
      attachQrStatus(visitor);
      const updatedProgress = getVisitorProgress(visitor);
      await createInAppNotification({
        userId: visitor.residentId,
        type: 'visitor',
        title: 'Visitor at the gate',
        body: `Your visitor ${visitor.visitorName} is approved and heading to your place. Entry ${updatedProgress.entryScanCount}/${updatedProgress.groupSize}.`,
        metadata: { visitorId: visitor._id, event: 'entry_scan' }
      });

      return res.json({
        success: true,
        message: `Visitor entry logged (${updatedProgress.entryScanCount}/${updatedProgress.groupSize}).`,
        data: { visitor, action: 'entry_logged', nextAction: 'resident_confirmation', progress: updatedProgress }
      });
    }

    if (action === 'exit') {
      if (visitor.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: `Visitor pass is currently ${visitor.status} and cannot be scanned for gate exit.`
        });
      }
      const exitPrerequisiteMessage = getExitPrerequisiteMessage(visitor);
      if (exitPrerequisiteMessage) {
        return res.status(400).json({
          success: false,
          error: exitPrerequisiteMessage
        });
      }
      if (progress.exitScanCount >= progress.groupSize) {
        return res.status(400).json({
          success: false,
          error: 'All visitors on this pass have already been scanned for gate exit.'
        });
      }
      if (progress.exitScanCount >= progress.residentDepartureConfirmCount) {
        return res.status(400).json({
          success: false,
          error: 'Resident must confirm another visitor departure before this gate exit scan.'
        });
      }

      visitor.exitScanCount = progress.exitScanCount + 1;
      if (visitor.exitScanCount >= progress.groupSize) {
        visitor.actualExit = new Date();
        visitor.status = 'completed';
      }
      if (securityNotes) {
        visitor.securityNotes += (visitor.securityNotes ? '\n' : '') + securityNotes;
      }
      await visitor.save();
      attachQrStatus(visitor);
      const updatedProgress = getVisitorProgress(visitor);
      await createInAppNotification({
        userId: visitor.residentId,
        type: 'visitor',
        title: visitor.status === 'completed' ? 'Visitor pass completed' : 'Visitor gate exit logged',
        body: visitor.status === 'completed'
          ? `${visitor.visitorName} and all companions have exited. Visitor pass is now completed and no longer valid.`
          : `${visitor.visitorName} gate exit logged (${updatedProgress.exitScanCount}/${updatedProgress.groupSize}).`,
        metadata: { visitorId: visitor._id, event: 'exit_scan' }
      });

      return res.json({
        success: true,
        message: `Visitor exit logged (${updatedProgress.exitScanCount}/${updatedProgress.groupSize}).`,
        data: {
          visitor,
          action: 'exit_logged',
          nextAction: visitor.status === 'completed' ? 'completed' : 'next_exit_scan',
          progress: updatedProgress
        }
      });
    }

    if (visitor.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Visitor pass is already completed and no longer valid.'
      });
    }

    return res.status(400).json({
      success: false,
      error: `Visitor pass is currently ${visitor.status} and cannot be scanned for gate action.`
    });
  } catch (error) {
    console.error('Security scan action error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process QR scan action' });
  }
});

router.post('/confirm-arrival', protect, authorize('resident'), async (req, res) => {
  try {
    const scanValue = req.body?.scanValue || req.body?.qrCode || '';
    const requestedAction = String(req.body?.action || '').toLowerCase();
    const visitor = await findVisitorByScanValue(scanValue);

    if (!visitor) {
      return res.status(404).json({ success: false, error: 'Invalid QR code' });
    }

    if (String(visitor.residentId?._id || visitor.residentId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'This pass does not belong to your account.' });
    }

    if (visitor.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Security must scan the visitor for gate entry before resident confirmation (current: ${visitor.status}).`
      });
    }

    const progress = getVisitorProgress(visitor);
    const action = requestedAction || (progress.residentArrivalConfirmCount < progress.groupSize ? 'arrival' : 'departure');
    if (!['arrival', 'departure'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Confirmation action must be arrival or departure.' });
    }

    let message = '';
    let confirmedType = action;

    if (action === 'arrival') {
      if (progress.entryScanCount <= progress.residentArrivalConfirmCount) {
        return res.status(400).json({
          success: false,
          error: 'Security must scan another visitor for gate entry before resident arrival confirmation.'
        });
      }
      if (progress.residentArrivalConfirmCount >= progress.groupSize) {
        return res.status(400).json({
          success: false,
          error: 'All visitors on this pass have already been confirmed at the residence.'
        });
      }
      visitor.residentArrivalConfirmCount = progress.residentArrivalConfirmCount + 1;
      if (!visitor.residentEntryConfirmedAt) visitor.residentEntryConfirmedAt = new Date();
      confirmedType = 'arrival';
      message = `Visitor arrival confirmed (${visitor.residentArrivalConfirmCount}/${progress.groupSize}).`;
    } else if (action === 'departure') {
      if (progress.residentArrivalConfirmCount <= progress.residentDepartureConfirmCount) {
        return res.status(400).json({
          success: false,
          error: 'Confirm another visitor arrival before confirming departure.'
        });
      }
      if (progress.residentDepartureConfirmCount >= progress.groupSize) {
        return res.status(400).json({
          success: false,
          error: 'All visitors on this pass have already been confirmed for departure.'
        });
      }
      visitor.residentDepartureConfirmCount = progress.residentDepartureConfirmCount + 1;
      if (!visitor.residentDepartureConfirmedAt) visitor.residentDepartureConfirmedAt = new Date();
      confirmedType = 'departure';
      message = `Visitor departure confirmed (${visitor.residentDepartureConfirmCount}/${progress.groupSize}).`;
    }

    await visitor.save();
    attachQrStatus(visitor);
    const updatedProgress = getVisitorProgress(visitor);

    await createInAppNotification({
      userId: visitor.residentId,
      type: 'visitor',
      title: confirmedType === 'arrival' ? 'Visitor confirmed' : 'Visitor departure confirmed',
      body:
        confirmedType === 'arrival'
          ? `${visitor.visitorName} has been confirmed at your residence (${updatedProgress.residentArrivalConfirmCount}/${updatedProgress.groupSize}).`
          : `${visitor.visitorName} is leaving and has been confirmed for departure (${updatedProgress.residentDepartureConfirmCount}/${updatedProgress.groupSize}).`,
      metadata: { visitorId: visitor._id, event: confirmedType === 'arrival' ? 'resident_confirmed' : 'resident_departure_confirmed' }
    });

    if (confirmedType === 'departure') {
      await notifyJurisdictionSecurityOfDeparture(visitor);
    }

    return res.json({
      success: true,
      message,
      data: { visitor, confirmedType, progress: updatedProgress }
    });
  } catch (error) {
    console.error('Resident confirm arrival error:', error);
    return res.status(500).json({ success: false, error: 'Failed to confirm visitor arrival' });
  }
});

router.get('/stats/summary', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const totalVisitors = await Visitor.countDocuments();
    const todayVisitors = await Visitor.countDocuments({
      expectedArrival: { $gte: today, $lt: tomorrow }
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

// Get daily visitor stats for a specific date
router.get('/stats/daily', protect, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date parameter is required' });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const totalVisitors = await Visitor.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    const approvedVisitors = await Visitor.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'approved'
    });
    const pendingVisitors = await Visitor.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        totalVisitors,
        approvedVisitors,
        pendingVisitors
      }
    });

  } catch (error) {
    console.error('Get daily visitor stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily visitor statistics'
    });
  }
});

// Get all visitors (admin only - includes security approvals)
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, startDate, endDate, date, residentId, visitorName } = req.query;
    
    let filter = {};
    
    // Filter by status
    if (status && status !== 'all') filter.status = status;

    if (visitorName) {
      filter.visitorName = { $regex: visitorName.trim(), $options: 'i' };
    }

    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(date);
      selectedDateEnd.setHours(23, 59, 59, 999);
      filter.expectedArrival = { $gte: selectedDate, $lte: selectedDateEnd };
    }
    
    // Filter by date range
    if (!date && (startDate || endDate)) {
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

    visitors.forEach(attachQrStatus);
    
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
    if (String(search).trim()) {
      const searchRegex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const residents = await User.find({
        role: 'resident',
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { houseNumber: searchRegex }
        ]
      }).select('_id');
      filter.$or = [
        { visitorName: searchRegex },
        { visitorPhone: searchRegex },
        { purpose: searchRegex },
        { residentId: { $in: residents.map((resident) => resident._id) } }
      ];
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

    visitors.forEach(attachQrStatus);
    
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

// Admin approval/rejection decision
router.put('/admin/:id/override', protect, authorize('admin'), async (req, res) => {
  try {
    const { action, reason, notes } = req.body;
    const decisionReason = typeof reason === 'string' ? reason.trim() : '';
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "approve" or "reject"'
      });
    }

    if (!decisionReason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required'
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
        error: 'This visitor status can no longer be changed'
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
      visitor.overrideReason = decisionReason;
    } else if (action === 'reject') {
      visitor.status = 'rejected';
      visitor.rejectionReason = decisionReason;
      visitor.qrCodeVisible = false;
      visitor.overrideReason = decisionReason;
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
      reason: decisionReason || notes,
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
    console.error('Admin visitor decision error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process visitor decision'
    });
  }
});

// Get visitor statistics for admin
router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before or equal to end date'
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (startDate || endDate) {
      filter.expectedArrival = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.expectedArrival.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.expectedArrival.$lte = end;
      }
    }
    
    // Basic counts
    const totalVisitors = await Visitor.countDocuments(filter);
    const todayVisitors = await Visitor.countDocuments({
      ...filter,
      createdAt: { $gte: today }
    });
    const statusCount = async (targetStatus) => {
      if (status && status !== 'all' && status !== targetStatus) return 0;
      return Visitor.countDocuments({ ...filter, status: targetStatus });
    };
    const [pendingVisitors, activeVisitors, approvedVisitors, rejectedVisitors] = await Promise.all([
      statusCount('pending'),
      statusCount('active'),
      statusCount('approved'),
      statusCount('rejected')
    ]);
    
    // Daily stats for last 30 days
    const dailyStats = await Visitor.aggregate([
      {
        $match: {
          ...filter,
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
        $match: filter
      },
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
        $match: { ...filter, approvedBy: { $exists: true } }
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

// Export visitors data (CSV or PDF format)
router.get('/admin/export', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, status, search = '', format = 'json', timezoneOffset = '0' } = req.query;
    const timezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before or equal to end date'
      });
    }

    let filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.expectedArrival = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.expectedArrival.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.expectedArrival.$lte = end;
      }
    }

    let visitors = await Visitor.find(filter)
      .populate('residentId', 'firstName lastName houseNumber email')
      .populate('approvedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    const searchText = String(search || '').trim().toLowerCase();
    if (searchText) {
      visitors = visitors.filter((visitor) => {
        const residentName = visitor.residentId
          ? `${visitor.residentId.firstName || ''} ${visitor.residentId.lastName || ''}`.toLowerCase()
          : '';
        return (
          String(visitor.visitorName || '').toLowerCase().includes(searchText) ||
          String(visitor.visitorPhone || '').toLowerCase().includes(searchText) ||
          String(visitor.purpose || '').toLowerCase().includes(searchText) ||
          residentName.includes(searchText) ||
          String(visitor.residentId?.houseNumber || '').toLowerCase().includes(searchText)
        );
      });
    }

    const pdfReportService = require('../services/pdfReportService');
    const formatExportDate = (value) => (
      value ? new Date(value).toLocaleString('en-US') : 'N/A'
    );
    const formatPersonName = (person) => (
      person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'N/A' : 'N/A'
    );
    const exportRows = visitors.map((visitor) => ({
      'Visitor ID': visitor._id.toString(),
      'Visitor Name': visitor.visitorName || 'N/A',
      'Phone': visitor.visitorPhone || 'N/A',
      'Vehicle': visitor.vehicleNumber || 'N/A',
      'Companions': visitor.numberOfCompanions ?? 0,
      'Purpose': visitor.purpose || 'N/A',
      'Resident': formatPersonName(visitor.residentId),
      'Resident Email': visitor.residentId?.email || 'N/A',
      'House': visitor.residentId?.houseNumber || 'N/A',
      'Status': visitor.status || 'N/A',
      'Expected Arrival': formatExportDate(visitor.expectedArrival),
      'Expected Departure': formatExportDate(visitor.expectedDeparture),
      'Entry Time': formatExportDate(visitor.actualEntry),
      'Exit Time': formatExportDate(visitor.actualExit),
      'Approved By': visitor.approvedBy
        ? `${formatPersonName(visitor.approvedBy)}${visitor.approvedBy.role ? ` (${visitor.approvedBy.role})` : ''}`
        : 'N/A',
      'Approval Time': formatExportDate(visitor.approvedAt),
      'Rejection Reason': visitor.rejectionReason || 'N/A',
      'Created At': formatExportDate(visitor.createdAt),
      'Security Notes': visitor.securityNotes || 'N/A'
    }));

    const pdfColumns = [
      { header: 'Visitor Name', key: 'Visitor Name', width: 18 },
      { header: 'Phone', key: 'Phone', width: 15 },
      { header: 'Vehicle', key: 'Vehicle', width: 12 },
      { header: 'Resident', key: 'Resident', width: 18 },
      { header: 'House', key: 'House', width: 10 },
      { header: 'Purpose', key: 'Purpose', width: 22 },
      { header: 'Status', key: 'Status', width: 12 },
      { header: 'Expected Arrival', key: 'Expected Arrival', width: 18 },
      { header: 'Expected Departure', key: 'Expected Departure', width: 18 },
      { header: 'Approved By', key: 'Approved By', width: 18 },
      { header: 'Created At', key: 'Created At', width: 18 }
    ];

    const csvColumns = [
      { header: 'Visitor ID', key: 'Visitor ID' },
      { header: 'Visitor Name', key: 'Visitor Name' },
      { header: 'Phone', key: 'Phone' },
      { header: 'Vehicle', key: 'Vehicle' },
      { header: 'Companions', key: 'Companions' },
      { header: 'Purpose', key: 'Purpose' },
      { header: 'Resident', key: 'Resident' },
      { header: 'Resident Email', key: 'Resident Email' },
      { header: 'House', key: 'House' },
      { header: 'Status', key: 'Status' },
      { header: 'Expected Arrival', key: 'Expected Arrival' },
      { header: 'Expected Departure', key: 'Expected Departure' },
      { header: 'Entry Time', key: 'Entry Time' },
      { header: 'Exit Time', key: 'Exit Time' },
      { header: 'Approved By', key: 'Approved By' },
      { header: 'Approval Time', key: 'Approval Time' },
      { header: 'Rejection Reason', key: 'Rejection Reason' },
      { header: 'Created At', key: 'Created At' },
      { header: 'Security Notes', key: 'Security Notes' }
    ];

    const reportTitle = 'Visitor Management Report';
    const todayStamp = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      const filename = `VIMS_Visitors_Export_${todayStamp}.pdf`;
      const pdfBuffer = await pdfReportService.generateDataReport(
        reportTitle,
        exportRows,
        pdfColumns,
        {
          creator: { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role },
          timezoneOffsetMinutes,
          layout: 'landscape',
          margin: 36,
          table: { headerFontSize: 8, bodyFontSize: 7.5, cellPadding: 3, maxRows: 120 },
          persistFilename: filename,
          persistSubdir: 'pdf-exports'
        }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-PDF-Report-Url', `/uploads/pdf-exports/${filename}`);
      return res.send(pdfBuffer);
    }

    if (format === 'csv') {
      const csvContent = pdfReportService.generateCsvReport(reportTitle, exportRows, csvColumns, { creator: req.user, timezoneOffsetMinutes });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Visitors_Export_${todayStamp}.csv"`);
      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: exportRows,
      filename: `VIMS_Visitors_Export_${todayStamp}.json`,
      count: exportRows.length
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
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
          expectedArrival: { $gte: today, $lt: tomorrow }
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

// Get visitor trend data for charts
router.get('/admin/trend', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();
    
    // Default to last 30 days
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const trendData = await Visitor.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          visitors: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          visitors: 1,
          approved: 1,
          pending: 1,
          rejected: 1,
          _id: 0
        }
      }
    ]);
    
    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('Get visitor trend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get visitor trend data'
    });
  }
});

// Get recent visitors for reports
router.get('/admin/recent', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, status, limit = 20 } = req.query;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before or equal to end date'
      });
    }
    
    let filter = {};
    
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
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    const visitors = await Visitor.find(filter)
      .populate('residentId', 'firstName lastName houseNumber email phone')
      .populate('approvedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    visitors.forEach(attachQrStatus);
    
    res.json({
      success: true,
      data: visitors
    });
  } catch (error) {
    console.error('Get recent visitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent visitors'
    });
  }
});

module.exports = router;
