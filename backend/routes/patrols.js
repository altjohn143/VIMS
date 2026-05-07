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

// Export patrol logs data (CSV or PDF format)
router.get('/export', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const { format = 'pdf', phase, status, startDate, endDate } = req.query;

    // Build filter based on user role and query parameters
    let filter = {};
    if (req.user.role === 'security') {
      filter.officerId = req.user.id;
    }

    if (phase) filter.phase = Number(phase);
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.loggedAt = {};
      if (startDate) filter.loggedAt.$gte = new Date(startDate);
      if (endDate) filter.loggedAt.$lte = new Date(endDate);
    }

    const patrolLogs = await PatrolLog.find(filter)
      .populate('officerId', 'firstName lastName')
      .sort({ loggedAt: -1 });

    if (!patrolLogs.length) {
      return res.status(404).json({
        success: false,
        error: 'No patrol logs found matching the criteria'
      });
    }

    const data = patrolLogs.map(log => ({
      ID: log._id.toString(),
      'Officer Name': log.officerId ? `${log.officerId.firstName} ${log.officerId.lastName}` : 'Unknown',
      Phase: `Phase ${log.phase}`,
      Area: log.area,
      Checkpoint: log.checkpoint,
      Status: log.status,
      Notes: log.notes || 'N/A',
      'Findings Count': log.findings ? log.findings.length : 0,
      'Logged Date': log.loggedAt.toLocaleDateString(),
      'Logged Time': log.loggedAt.toLocaleTimeString()
    }));

    const columns = [
      { header: 'ID', key: 'ID', width: 25 },
      { header: 'Officer Name', key: 'Officer Name', width: 20 },
      { header: 'Phase', key: 'Phase', width: 8 },
      { header: 'Area', key: 'Area', width: 15 },
      { header: 'Checkpoint', key: 'Checkpoint', width: 15 },
      { header: 'Status', key: 'Status', width: 12 },
      { header: 'Notes', key: 'Notes', width: 25 },
      { header: 'Findings Count', key: 'Findings Count', width: 12 },
      { header: 'Logged Date', key: 'Logged Date', width: 12 },
      { header: 'Logged Time', key: 'Logged Time', width: 10 }
    ];

    const title = req.user.role === 'security' ? 'Security Patrol Report' : 'Admin Patrol Logs Report';

    if (format === 'pdf') {
      const pdfReportService = require('../services/pdfReportService');
      const pdfBuffer = await pdfReportService.generateDataReport(title, data, columns, { creator: req.user });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Patrol_Logs_Export_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    // CSV format
    const csvData = data.map(row => columns.map(col => `"${row[col.key] || ''}"`).join(','));
    const csvHeader = columns.map(col => `"${col.header}"`).join(',');
    const csvContent = [csvHeader, ...csvData].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="VIMS_Patrol_Logs_Export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export patrol logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export patrol logs'
    });
  }
});

module.exports = router;
