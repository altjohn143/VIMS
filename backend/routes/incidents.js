const express = require('express');
const Incident = require('../models/Incident');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const ActivityNotificationService = require('../services/activityNotificationService');

const router = express.Router();

const isHeadOfficer = (user) =>
  user?.role === 'security' && (
    user.securityLevel === 'head-officer' ||
    String(user.email || '').toLowerCase() === 'security@vims.com'
  );

const buildAssignedRouteIncidentFilter = async (user) => {
  if (user.role !== 'security' || isHeadOfficer(user)) return {};

  const securityUser = await User.findById(user._id).select('assignedPhases');
  const assignedPhases = Array.isArray(securityUser?.assignedPhases)
    ? securityUser.assignedPhases.filter((phase) => Number.isInteger(Number(phase)))
    : [];

  if (!assignedPhases.length) {
    return { reportedBy: user._id };
  }

  return {
    $or: [
      { reportedBy: user._id },
      ...assignedPhases.map((phase) => ({
        location: { $regex: new RegExp(`\\b(?:phase|p)\\s*-?\\s*${phase}\\b`, 'i') }
      }))
    ]
  };
};

router.get('/', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const { format = 'json', timezoneOffset = 0 } = req.query;
    const timezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;
    const filter = await buildAssignedRouteIncidentFilter(req.user);

    const incidents = await Incident.find(filter)
      .populate('reportedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(200);

    const reportData = incidents.map((incident) => ({
      Title: incident.title,
      Description: incident.description,
      Severity: incident.severity,
      Status: incident.status,
      Location: incident.location || 'N/A',
      'Reported By': incident.reportedBy ? `${incident.reportedBy.firstName || ''} ${incident.reportedBy.lastName || ''}`.trim() : 'Unknown',
      Created: incident.createdAt ? incident.createdAt.toLocaleDateString() : 'N/A'
    }));

    const reportColumns = [
      { key: 'Title', label: 'Title', width: 18 },
      { key: 'Description', label: 'Description', width: 28 },
      { key: 'Severity', label: 'Severity', width: 10 },
      { key: 'Status', label: 'Status', width: 10 },
      { key: 'Location', label: 'Location', width: 16 },
      { key: 'Reported By', label: 'Reported By', width: 16 },
      { key: 'Created', label: 'Created', width: 12 }
    ];

    if (format === 'pdf') {
      // Import PDF service
      const pdfReportService = require('../services/pdfReportService');

      const pdfBuffer = await pdfReportService.generateDataReport(
        'VIMS Incidents Report',
        reportData,
        reportColumns,
        { creator: { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }, timezoneOffsetMinutes }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Incidents_Report_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    if (format === 'csv') {
      const pdfReportService = require('../services/pdfReportService');
      const csvContent = pdfReportService.generateCsvReport(
        'VIMS Incidents Report',
        reportData,
        reportColumns,
        { creator: { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }, timezoneOffsetMinutes }
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Incidents_Report_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
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
      const reporter = await User.findById(req.user._id).select('firstName lastName');
      await ActivityNotificationService.notifyAdminIncidentReported(row, reporter);

      // Also notify residents in the area if it's a high severity incident
      if (severity === 'high' || severity === 'critical') {
        // For now, notify all residents. In a real system, you'd filter by location/area
        const residents = await User.find({ role: 'resident' }).select('_id');
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
    const allowedStatuses = ['open', 'investigating', 'resolved'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid incident status' });
    }
    const filter = await buildAssignedRouteIncidentFilter(req.user);
    const row = await Incident.findOne({ _id: req.params.id, ...filter });
    if (!row) return res.status(404).json({ success: false, error: 'Incident not found' });
    if (row.status === status) {
      return res.json({ success: true, data: row, message: 'Incident status is already up to date' });
    }
    if (row.status === 'open' && status === 'resolved') {
      return res.status(400).json({ success: false, error: 'Move the incident to investigating before resolving it' });
    }
    if (row.status === 'resolved' && status === 'investigating') {
      return res.status(400).json({ success: false, error: 'Resolved incidents cannot be moved back to investigating' });
    }
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
