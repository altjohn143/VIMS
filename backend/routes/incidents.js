const express = require('express');
const Incident = require('../models/Incident');
const { protect, authorize } = require('../middleware/auth');
const ActivityNotificationService = require('../services/activityNotificationService');

const router = express.Router();

router.get('/', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const { format = 'json', timezoneOffset = 0 } = req.query;
    const timezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;

    const incidents = await Incident.find()
      .populate('reportedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(200);

    if (format === 'pdf') {
      // Import PDF service
      const pdfReportService = require('../services/pdfReportService');

      const columns = [
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
        { key: 'severity', label: 'Severity' },
        { key: 'status', label: 'Status' },
        { key: 'location', label: 'Location' },
        { key: 'reportedBy.firstName', label: 'Reported By' },
        { key: 'createdAt', label: 'Created' }
      ];

      const pdfBuffer = await pdfReportService.generateDataReport(
        'VIMS Incidents Report',
        incidents,
        columns,
        { creator: { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }, timezoneOffsetMinutes }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Incidents_Report_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    res.json({ success: true, count: incidents.length, data: incidents });
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

    // Notify admins and security about new incident
    try {
      const reporter = await require('../models/User').findById(req.user._id).select('firstName lastName');
      await ActivityNotificationService.notifyAdminIncidentReported(row, reporter);

      // Also notify residents in the area if it's a high severity incident
      if (severity === 'high' || severity === 'critical') {
        // For now, notify all residents. In a real system, you'd filter by location/area
        const residents = await require('../models/User').find({ role: 'resident' }).select('_id');
        for (const resident of residents) {
          await ActivityNotificationService.notifyResidentIncidentAlert(row, resident._id);
        }
      }
    } catch (error) {
      console.error('Failed to send incident notifications:', error);
    }

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

// Get daily incident stats for a specific date
router.get('/stats/daily', protect, authorize('security', 'admin'), async (req, res) => {
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

    const totalIncidents = await Incident.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    const resolvedIncidents = await Incident.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'resolved'
    });
    const pendingIncidents = await Incident.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        totalIncidents,
        resolvedIncidents,
        pendingIncidents
      }
    });

  } catch (error) {
    console.error('Get daily incident stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily incident statistics'
    });
  }
});

module.exports = router;
