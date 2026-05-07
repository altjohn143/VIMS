const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Resource = require('../models/Resource');
const { protect, authorize } = require('../middleware/auth');
const { createInAppNotification } = require('../services/inAppNotificationService');

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
    const query = req.user.role === 'admin' ? {} : { reservedBy: req.user._id };
    const reservations = await Reservation.find(query)
      .populate('reservedBy', 'firstName lastName email')
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
    } = req.body;

    if (!resourceType || !resourceName || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Resource type, name, start, and end times are required' });
    }

    // Validate that the resource exists
    const resource = await Resource.findOne({ name: resourceName, type: resourceType, isActive: true });
    if (!resource) {
      return res.status(400).json({ success: false, error: 'Invalid resource selected' });
    }

    const now = new Date();
    const existingActive = await Reservation.findOne({
      reservedBy: req.user._id,
      resourceName,
      status: { $in: ['pending', 'confirmed', 'borrowed'] },
      endDate: { $gte: now }
    });

    if (existingActive) {
      return res.status(409).json({
        success: false,
        error: `You already have an active or pending reservation for ${resourceName}. Please wait until that reservation is completed or expired before requesting it again.`
      });
    }

    const reservation = await Reservation.create({
      resourceType,
      resourceName,
      description: description || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      quantity: quantity || 1,
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

module.exports = router;
