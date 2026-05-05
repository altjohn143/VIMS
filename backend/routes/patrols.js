const express = require('express');
const PatrolLog = require('../models/PatrolLog');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    let query = {};
    
    // Security officers can only see their own logs
    if (req.user.role === 'security') {
      query.officerId = req.user._id;
    }
    
    // Filter by phase if specified
    if (req.query.phase) {
      query.phase = Number(req.query.phase);
    }
    
    const rows = await PatrolLog.find(query)
      .populate('officerId', 'firstName lastName role assignedPhases')
      .sort({ loggedAt: -1, createdAt: -1 })
      .limit(200);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load patrol logs' });
  }
});

router.post('/log', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const { phase, area, checkpoint, notes = '', status = 'completed', findings = [], loggedAt = null } = req.body;
    
    if (!phase || !area || !checkpoint) {
      return res.status(400).json({ success: false, error: 'Phase, area and checkpoint are required' });
    }
    
    // Validate that the security officer is assigned to this phase
    if (req.user.role === 'security') {
      const user = await require('../models/User').findById(req.user._id);
      if (!user.assignedPhases.includes(phase)) {
        return res.status(403).json({ success: false, error: 'You are not assigned to patrol this phase' });
      }
    }
    
    const row = await PatrolLog.create({
      officerId: req.user._id,
      phase: Number(phase),
      area: String(area).trim(),
      checkpoint: String(checkpoint).trim(),
      notes: String(notes || '').trim(),
      status,
      findings: findings.map(f => ({
        type: f.type || 'other',
        description: String(f.description || '').trim(),
        severity: f.severity || 'low'
      })),
      loggedAt: loggedAt ? new Date(loggedAt) : new Date()
    });
    
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create patrol log' });
  }
});

// Admin routes for managing security assignments
router.put('/assign/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { assignedPhases, assignedAreas, patrolSchedule } = req.body;
    
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'security') {
      return res.status(404).json({ success: false, error: 'Security officer not found' });
    }
    
    user.assignedPhases = assignedPhases || [];
    user.assignedAreas = assignedAreas || [];
    user.patrolSchedule = patrolSchedule || '';
    
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update security assignment' });
  }
});

router.get('/assignments', protect, authorize('admin'), async (req, res) => {
  try {
    const securityOfficers = await User.find({ role: 'security' })
      .select('firstName lastName email assignedPhases assignedAreas patrolSchedule')
      .sort({ firstName: 1 });
    
    res.json({ success: true, data: securityOfficers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load security assignments' });
  }
});

module.exports = router;
