const express = require('express');
const Incident = require('../models/Incident');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const rows = await Incident.find()
      .populate('reportedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load incidents' });
  }
});

router.post('/', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const { title, description, location = '', severity = 'medium', occurredAt = null } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }
    const row = await Incident.create({
      title: String(title).trim(),
      description: String(description).trim(),
      location: String(location || '').trim(),
      severity,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      reportedBy: req.user._id
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create incident' });
  }
});

router.put('/:id/status', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const { status, resolutionNotes = '' } = req.body;
    const row = await Incident.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Incident not found' });
    if (status) row.status = status;
    row.resolutionNotes = resolutionNotes;
    row.resolvedAt = row.status === 'resolved' ? new Date() : null;
    await row.save();
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update incident status' });
  }
});

module.exports = router;
