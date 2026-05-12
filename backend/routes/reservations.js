const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Resource = require('../models/Resource');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { createInAppNotification } = require('../services/inAppNotificationService');
const { sendReservationStatusNotification } = require('../services/notificationService');

// Helper function to get reservation item summary
const getReservationItemSummary = (reservation) => {
  if (reservation.items && reservation.items.length > 0) {
    if (reservation.items.length === 1) {
      return reservation.items[0].resourceName;
    }
    return reservation.items.map(item => `${item.resourceName} (${item.quantity})`).join(', ');
  }
  return reservation.resourceName;
};

const notifyAdminsOnCancellation = async (reservation) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    const itemSummary = getReservationItemSummary(reservation);
    await Promise.all(admins.map(admin => createInAppNotification({
      userId: admin._id,
      type: 'reservation',
      title: 'Reservation cancelled by resident',
      body: `Reservation for ${itemSummary} was cancelled by a resident.`,
      metadata: {
        reservationId: reservation._id,
        status: reservation.status,
        cancelledBy: reservation.cancelledBy,
        cancelledReason: reservation.cancelledReason
      }
    })));
  } catch (error) {
    console.error('Failed to notify admins about reservation cancellation:', error.message);
  }
};

// Get available resources for dropdown
router.get('/resources', protect, async (req, res) => {
  try {
    const resources = await Resource.find({ isActive: true }).sort({ type: 1, name: 1 });
    const grouped = resources.reduce((acc, resource) => {
      if (!acc[resource.type]) {
        acc[resource.type] = [];
      }
      acc[resource.type].push(resource.name);
      return acc;
    }, {});
    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Get resources error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch resources' });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      query = {};
    } else if (req.user.role === 'security') {
      query = { status: { $in: ['borrowed', 'return_initiated'] } };
    } else {
      query = { reservedBy: req.user._id };
    }

    const reservations = await Reservation.find(query)
      .populate('reservedBy', 'firstName lastName email')
      .populate('cancelledBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reservations });
  } catch (error) {
    console.error('Get reservations error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch reservations' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const {
      resourceType,
      resourceName,
      description,
      startDate,
      endDate,
      quantity,
      status,
      notes,
      items, // New: array of items for multiple item reservations
    } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start and end times are required' });
    }

    // Support both single item (legacy) and multiple items (new format)
    let reservationItems = [];

    if (items && Array.isArray(items) && items.length > 0) {
      // New format: multiple items
      if (items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one item must be selected' });
      }

      // Validate each item
      for (const item of items) {
        if (!item.resourceName || !item.resourceType) {
          return res.status(400).json({ success: false, error: 'Each item must have resourceType and resourceName' });
        }

        const resource = await Resource.findOne({ name: item.resourceName, type: item.resourceType, isActive: true });
        if (!resource) {
          return res.status(400).json({ success: false, error: `Invalid resource: ${item.resourceName}` });
        }
      }

      reservationItems = items;
    } else if (resourceType && resourceName) {
      // Legacy format: single item
      if (!resourceType || !resourceName) {
        return res.status(400).json({ success: false, error: 'Resource type and name are required' });
      }

      const resource = await Resource.findOne({ name: resourceName, type: resourceType, isActive: true });
      if (!resource) {
        return res.status(400).json({ success: false, error: 'Invalid resource selected' });
      }

      reservationItems = [{ resourceType, resourceName, quantity: quantity || 1 }];
    } else {
      return res.status(400).json({ success: false, error: 'Resource type and name are required' });
    }

    const now = new Date();
    
    // Check for conflicting reservations
    for (const item of reservationItems) {
      const existingActive = await Reservation.findOne({
        reservedBy: req.user._id,
        $or: [
          { 'items.resourceName': item.resourceName },
          { resourceName: item.resourceName }
        ],
        status: { $in: ['pending', 'confirmed', 'borrowed'] },
        endDate: { $gte: now }
      });

      if (existingActive) {
        return res.status(409).json({
          success: false,
          error: `You already have an active or pending reservation for ${item.resourceName}. Please wait until that reservation is completed or expired before requesting it again.`
        });
      }
    }

    const reservation = await Reservation.create({
      resourceType: items ? undefined : resourceType,
      resourceName: items ? undefined : resourceName,
      items: reservationItems,
      description: description || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      quantity: items ? undefined : (quantity || 1),
      reservedBy: req.user._id,
      status: status || 'pending',
      notes: notes || '',
    });

    res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    console.error('Create reservation error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create reservation' });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    const previousStatus = reservation.status;
    const updatedReservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedReservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    if (req.body.status && req.body.status !== previousStatus) {
      let title;
      let body;

      if (req.body.status === 'confirmed') {
        title = 'Reservation approved';
        body = `Your reservation for ${updatedReservation.resourceName} has been approved by admin.`;
      } else if (req.body.status === 'cancelled') {
        title = 'Reservation denied';
        body = `Your reservation for ${updatedReservation.resourceName} has been denied by admin.`;
      }

      if (title && body) {
        await createInAppNotification({
          userId: updatedReservation.reservedBy,
          type: 'reservation',
          title,
          body,
          metadata: {
            reservationId: updatedReservation._id,
            status: updatedReservation.status,
          },
        });
      }
    }

    res.json({ success: true, data: updatedReservation });
  } catch (error) {
    console.error('Update reservation error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update reservation' });
  }
});

router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, cancelledReason } = req.body;
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    if (req.user.role === 'resident') {
      if (reservation.reservedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, error: 'Not authorized to update this reservation' });
      }

      if (status !== 'cancelled') {
        return res.status(400).json({ success: false, error: 'Residents can only cancel reservations' });
      }

      if (!['pending', 'confirmed'].includes(reservation.status)) {
        return res.status(400).json({ success: false, error: 'Only pending or confirmed reservations can be cancelled' });
      }

      reservation.status = 'cancelled';
      reservation.cancelledAt = new Date();
      reservation.cancelledBy = req.user._id;
      reservation.cancelledReason = cancelledReason || 'Cancelled by resident';
    } else if (req.user.role === 'admin') {
      if (!['pending', 'confirmed', 'cancelled', 'borrowed', 'return_initiated', 'returned'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid reservation status' });
      }
      reservation.status = status;
      if (status === 'cancelled') {
        reservation.cancelledAt = new Date();
        reservation.cancelledBy = req.user._id;
        reservation.cancelledReason = cancelledReason || reservation.cancelledReason || 'Cancelled by admin';
      }
    } else {
      return res.status(403).json({ success: false, error: 'Not authorized to update this reservation' });
    }

    await reservation.save();

    if (status === 'cancelled') {
      await createInAppNotification({
        userId: reservation.reservedBy,
        type: 'reservation',
        title: 'Reservation cancelled',
        body: `Your reservation for ${reservation.resourceName} has been cancelled.`,
        metadata: {
          reservationId: reservation._id,
          status: reservation.status,
          cancelledReason: reservation.cancelledReason
        },
      });

      await notifyAdminsOnCancellation(reservation);

      const resident = await User.findById(reservation.reservedBy).select('email phone');
      if (resident) {
        await sendReservationStatusNotification(reservation, resident, {
          actorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.role
        });
      }
    }

    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('Update reservation status error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update reservation status' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }
    res.json({ success: true, message: 'Reservation deleted' });
  } catch (error) {
    console.error('Delete reservation error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete reservation' });
  }
});

// Export reservations data (CSV or PDF format)
router.get('/export', protect, async (req, res) => {
  try {
    const { format = 'pdf', resourceType, status, startDate, endDate } = req.query;

    // Build filter based on query parameters
    let filter = {};
    if (resourceType) filter.resourceType = resourceType;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const reservations = await require('../models/Reservation').find(filter)
      .populate('reservedBy', 'firstName lastName email')
      .sort({ startDate: -1 });

    if (!reservations.length) {
      return res.status(404).json({
        success: false,
        error: 'No reservations found matching the criteria'
      });
    }

    const data = reservations.map(reservation => ({
      ID: reservation._id.toString(),
      'Resource Type': reservation.resourceType,
      'Resource Name': reservation.resourceName,
      Description: reservation.description || 'N/A',
      'Reserved By': reservation.reservedBy ? `${reservation.reservedBy.firstName} ${reservation.reservedBy.lastName}` : 'Unknown',
      'Start Date': reservation.startDate.toLocaleDateString(),
      'End Date': reservation.endDate.toLocaleDateString(),
      Quantity: reservation.quantity,
      Status: reservation.status,
      'Actual Checkout': reservation.actualCheckout ? reservation.actualCheckout.toLocaleDateString() : 'N/A',
      'Actual Return': reservation.actualReturn ? reservation.actualReturn.toLocaleDateString() : 'N/A',
      'Return Condition': reservation.returnCondition || 'N/A'
    }));

    const columns = [
      { header: 'ID', key: 'ID', width: 25 },
      { header: 'Resource Type', key: 'Resource Type', width: 12 },
      { header: 'Resource Name', key: 'Resource Name', width: 20 },
      { header: 'Description', key: 'Description', width: 25 },
      { header: 'Reserved By', key: 'Reserved By', width: 20 },
      { header: 'Start Date', key: 'Start Date', width: 12 },
      { header: 'End Date', key: 'End Date', width: 12 },
      { header: 'Quantity', key: 'Quantity', width: 8 },
      { header: 'Status', key: 'Status', width: 10 },
      { header: 'Actual Checkout', key: 'Actual Checkout', width: 12 },
      { header: 'Actual Return', key: 'Actual Return', width: 12 },
      { header: 'Return Condition', key: 'Return Condition', width: 15 }
    ];

    const title = 'Resource Reservations Report';

    if (format === 'pdf') {
      const pdfReportService = require('../services/pdfReportService');
      const pdfBuffer = await pdfReportService.generateDataReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Reservations_Export_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    // CSV format
    const csvData = data.map(row => columns.map(col => `"${row[col.key] || ''}"`).join(','));
    const csvHeader = columns.map(col => `"${col.header}"`).join(',');
    const csvContent = [csvHeader, ...csvData].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="VIMS_Reservations_Export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export reservations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export reservations'
    });
  }
});

// Notify admins that security received the returned item
const notifyAdminsOnItemReceipt = async (reservation, securityOfficer) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    const resident = await Reservation.findById(reservation._id).populate('reservedBy', 'firstName lastName');
    const itemSummary = getReservationItemSummary(reservation);
    
    await Promise.all(admins.map(admin => createInAppNotification({
      userId: admin._id,
      type: 'reservation',
      title: 'Item received from resident',
      body: `${securityOfficer.firstName} ${securityOfficer.lastName} confirmed receipt of ${itemSummary} from ${resident.reservedBy.firstName} ${resident.reservedBy.lastName}.`,
      metadata: {
        reservationId: reservation._id,
        status: reservation.status,
        receivedBy: securityOfficer._id,
        receivedAt: new Date()
      }
    })));
  } catch (error) {
    console.error('Failed to notify admins about item receipt:', error.message);
  }
};

// Resident initiates return - marks item as ready for return
router.put('/:id/initiate-return', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    // Only the resident who made the reservation can initiate return
    if (req.user.role !== 'resident') {
      return res.status(403).json({ success: false, error: 'Only residents can initiate returns' });
    }

    if (reservation.reservedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to initiate return for this reservation' });
    }

    // Can only initiate return if status is 'borrowed'
    if (reservation.status !== 'borrowed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only borrowed items can be returned. Current status: ' + reservation.status 
      });
    }

    // Mark return as initiated
    reservation.status = 'return_initiated';
    reservation.returnInitiatedAt = new Date();
    await reservation.save();

    // Notify admins that resident is ready to return the item
    const admins = await User.find({ role: 'admin' }).select('_id');
    const resident = await User.findById(reservation.reservedBy).select('firstName lastName');
    const itemSummary = getReservationItemSummary(reservation);
    
    await Promise.all(admins.map(admin => createInAppNotification({
      userId: admin._id,
      type: 'reservation',
      title: 'Return initiated by resident - Security Action Required',
      body: `${resident.firstName} ${resident.lastName} is ready to return ${itemSummary}. Please confirm receipt at security desk.`,
      metadata: {
        reservationId: reservation._id,
        status: reservation.status,
        returnInitiatedAt: reservation.returnInitiatedAt
      }
    })));

    res.json({ 
      success: true, 
      message: 'Return initiated. Please bring the item to security for verification.',
      data: reservation 
    });
  } catch (error) {
    console.error('Initiate return error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to initiate return' });
  }
});

// Security confirms receipt of returned item
router.put('/:id/confirm-receipt', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    // Only security staff can confirm receipt
    if (req.user.role !== 'security') {
      return res.status(403).json({ success: false, error: 'Only security staff can confirm item receipt' });
    }

    // Can only confirm receipt if return was initiated or status is borrowed
    if (!['borrowed', 'return_initiated'].includes(reservation.status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Item must be in borrowed or return_initiated status for receipt confirmation' 
      });
    }

    // Mark item as received
    reservation.status = 'returned';
    reservation.itemReceivedBy = req.user._id;
    reservation.itemReceivedAt = new Date();
    reservation.actualReturn = new Date();
    await reservation.save();

    // Notify admins that security received the item
    await notifyAdminsOnItemReceipt(reservation, req.user);

    // Notify resident that their item was successfully received
    const itemSummary = getReservationItemSummary(reservation);
    await createInAppNotification({
      userId: reservation.reservedBy,
      type: 'reservation',
      title: 'Item received confirmation',
      body: `Your ${itemSummary} has been received and confirmed by security.`,
      metadata: {
        reservationId: reservation._id,
        status: reservation.status,
        receivedAt: reservation.itemReceivedAt
      }
    });

    res.json({ 
      success: true, 
      message: 'Item receipt confirmed successfully.',
      data: reservation 
    });
  } catch (error) {
    console.error('Confirm receipt error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to confirm item receipt' });
  }
});

module.exports = router;
