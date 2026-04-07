const express = require('express');
const PatrolLog = require('../models/PatrolLog');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const rows = await PatrolLog.find()
      .populate('officerId', 'firstName lastName role')
      .sort({ loggedAt: -1, createdAt: -1 })
      .limit(200);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load patrol logs' });
  }
});

router.post('/log', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const { area, checkpoint, notes = '', status = 'completed', loggedAt = null } = req.body;
    if (!area || !checkpoint) {
      return res.status(400).json({ success: false, error: 'Area and checkpoint are required' });
    }
    const row = await PatrolLog.create({
      officerId: req.user._id,
      area: String(area).trim(),
      checkpoint: String(checkpoint).trim(),
      notes: String(notes || '').trim(),
      status,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date()
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create patrol log' });
  }
});

module.exports = router;
