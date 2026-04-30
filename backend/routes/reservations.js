const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const { protect, authorize } = require('../middleware/auth');

const VENUES = [
  'Covered Court',
  'Swimming Pool',
  'Multi-Purpose Hall',
  'Function Room',
  'Conference Room',
];

const EQUIPMENT = [
  'Tables',
  'Chairs',
  'Speakers',
  'Microphones',
  'Projector',
  'Podium',
];

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const reservations = await Reservation.find({})
      .populate('reservedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reservations });
  } catch (error) {
    console.error('Get reservations error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch reservations' });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
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
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }
    res.json({ success: true, data: reservation });
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
