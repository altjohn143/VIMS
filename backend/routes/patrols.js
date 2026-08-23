const express = require('express');
const PatrolLog = require('../models/PatrolLog');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { paginateQuery } = require('../utils/pagination');

const router = express.Router();

const PRIMARY_SECURITY_HEAD_EMAIL = 'security@vims.com';

const isHeadOfficer = (user) =>
  user?.role === 'security' && (
    user.securityLevel === 'head-officer' ||
    String(user.email || '').toLowerCase() === 'security@vims.com'
  );

const isSystemHeadOfficer = (user) => String(user?.email || '').toLowerCase() === 'security@vims.com';

const getPrimarySecurityHeadOfficer = async () => User.findOne({
  email: PRIMARY_SECURITY_HEAD_EMAIL,
  role: 'security',
  isActive: true
}).select('_id firstName lastName email securityLevel');

const getHeadOfficerScope = async (headOfficer) => {
  const headOfficerId = headOfficer?._id || headOfficer;
  const filter = {
    role: 'security',
    securityLevel: 'personnel',
    isArchived: false
  };

  if (!isSystemHeadOfficer(headOfficer)) {
    filter.$or = [
      { headOfficerId },
      { secondaryHeadOfficerId: headOfficerId },
      { headOfficerId: null },
      { headOfficerId: { $exists: false } }
    ];
  }

  const team = await User.find(filter)
    .select('_id firstName lastName email phone securityLevel assignedPhases assignedAreas patrolSchedule headOfficerId secondaryHeadOfficerId isActive')
    .sort({ firstName: 1, lastName: 1 });

  return {
    team,
    officerIds: [headOfficerId, ...team.map((officer) => officer._id)]
  };
};

router.get('/head-officer/stats', protect, authorize('security'), async (req, res) => {
  try {
    if (!isHeadOfficer(req.user)) {
      return res.status(403).json({ success: false, error: 'Only head officers can view team stats' });
    }

    const { team, officerIds } = await getHeadOfficerScope(req.user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activePatrols, pendingReports, completedToday] = await Promise.all([
      PatrolLog.countDocuments({
        officerId: { $in: officerIds },
        status: { $in: ['completed', 'nothing_found'] },
        loggedAt: { $gte: today }
      }),
      PatrolLog.countDocuments({
        officerId: { $in: officerIds },
        status: 'issue_found'
      }),
      PatrolLog.countDocuments({
        officerId: { $in: officerIds },
        loggedAt: { $gte: today }
      })
    ]);

    res.json({
      success: true,
      data: {
        personnelCount: team.length,
        activePatrols,
        pendingReports,
        completedToday
      }
    });
  } catch (error) {
    console.error('Error loading head officer stats:', error);
    res.status(500).json({ success: false, error: 'Failed to load head officer stats' });
  }
});

router.get('/head-officer/team', protect, authorize('security'), async (req, res) => {
  try {
    if (!isHeadOfficer(req.user)) {
      return res.status(403).json({ success: false, error: 'Only head officers can view team members' });
    }

    const { team } = await getHeadOfficerScope(req.user);
    res.json({ success: true, data: team });
  } catch (error) {
    console.error('Error loading head officer team:', error);
    res.status(500).json({ success: false, error: 'Failed to load head officer team' });
  }
});

router.get('/head-officer/analytics', protect, authorize('security'), async (req, res) => {
  try {
    if (!isHeadOfficer(req.user)) {
      return res.status(403).json({ success: false, error: 'Only head officers can view patrol analytics' });
    }

    const { team, officerIds } = await getHeadOfficerScope(req.user);
    const logs = await PatrolLog.find({ officerId: { $in: officerIds } })
      .populate('officerId', 'firstName lastName email securityLevel assignedPhases assignedAreas patrolSchedule')
      .sort({ loggedAt: -1, createdAt: -1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedLogs = logs.filter((log) => ['completed', 'nothing_found'].includes(log.status));
    const issueLogs = logs.filter((log) => log.status === 'issue_found');
    const todayLogs = logs.filter((log) => new Date(log.loggedAt || log.createdAt) >= today);

    const byPhase = logs.reduce((acc, log) => {
      const key = log.phase ? `Phase ${log.phase}` : 'No phase';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byOfficer = logs.reduce((acc, log) => {
      const id = String(log.officerId?._id || log.officerId || 'unknown');
      const name = log.officerId
        ? `${log.officerId.firstName || ''} ${log.officerId.lastName || ''}`.trim() || log.officerId.email || 'Unknown officer'
        : 'Unknown officer';
      if (!acc[id]) acc[id] = { officerId: id, name, total: 0, completed: 0, issues: 0 };
      acc[id].total += 1;
      if (['completed', 'nothing_found'].includes(log.status)) acc[id].completed += 1;
      if (log.status === 'issue_found') acc[id].issues += 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        personnelCount: team.length,
        activePersonnel: team.filter((member) => member.isActive).length,
        scheduledPersonnel: team.filter((member) => member.patrolSchedule).length,
        totalLogs: logs.length,
        todayLogs: todayLogs.length,
        completedLogs: completedLogs.length,
        issueLogs: issueLogs.length,
        completionRate: logs.length ? Math.round((completedLogs.length / logs.length) * 100) : 0,
        byPhase: Object.entries(byPhase).map(([phase, total]) => ({ phase, total })),
        byOfficer: Object.values(byOfficer),
        recentLogs: logs.slice(0, 25),
        pendingReports: issueLogs
      }
    });
  } catch (error) {
    console.error('Error loading head officer analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to load patrol analytics' });
  }
});

router.get('/my-assignment', protect, authorize('security'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('firstName lastName email securityLevel assignedPhases assignedAreas patrolSchedule headOfficerId')
      .populate('headOfficerId', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({ success: false, error: 'Security officer not found' });
    }

    res.json({
      success: true,
      data: {
        securityLevel: user.securityLevel || 'personnel',
        assignedPhases: user.assignedPhases || [],
        assignedAreas: user.assignedAreas || [],
        patrolSchedule: user.patrolSchedule || '',
        headOfficer: user.headOfficerId || null
      }
    });
  } catch (error) {
    console.error('Error loading patrol assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to load patrol assignment' });
  }
});

router.get('/', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    let query = {};
    
    // Filter based on security level and role
    if (req.user.role === 'security') {
      // Head officers see all patrol logs from their subordinate security personnel (excluding archived)
      if (isHeadOfficer(req.user)) {
        const { officerIds } = await getHeadOfficerScope(req.user);
        query.officerId = { $in: officerIds };
      } else {
        // Regular security personnel see only their own logs
        query.officerId = req.user._id;
      }
    }
    // Admins see all logs (no query filter)
    
    // Filter by phase if specified
    if (req.query.phase) {
      query.phase = Number(req.query.phase);
    }
    
    const { data: rows, pagination } = await paginateQuery(
      PatrolLog.find(query)
      .populate('officerId', 'firstName lastName role securityLevel assignedPhases assignedAreas')
        .sort({ loggedAt: -1, createdAt: -1 }),
      PatrolLog.countDocuments(query),
      req.query
    );
    res.json({ success: true, count: rows.length, total: pagination.total, pagination, data: rows });
  } catch (error) {
    console.error('Error loading patrol logs:', error);
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
    // Skip validation for head officers - they can log patrols anywhere
    if (req.user.role === 'security' && !isHeadOfficer(req.user)) {
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
    console.error('Error creating patrol log:', error);
    res.status(500).json({ success: false, error: 'Failed to create patrol log' });
  }
});

// Admin/head officer routes for managing security assignments
router.put('/assign/:userId', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    const { securityLevel = 'personnel', assignedPhases = [], assignedAreas = [], patrolSchedule = '', headOfficerId = null } = req.body;

    if (req.user.role === 'security' && !isHeadOfficer(req.user)) {
      return res.status(403).json({ success: false, error: 'Only head officers can edit patrol routes' });
    }
    
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'security') {
      return res.status(404).json({ success: false, error: 'Security officer not found' });
    }

    if (req.user.role === 'security') {
      if (user.securityLevel === 'head-officer') {
        return res.status(403).json({ success: false, error: 'Head officers cannot edit other head officers' });
      }
      const canManage =
        !user.headOfficerId ||
        String(user.headOfficerId) === String(req.user._id) ||
        (user.secondaryHeadOfficerId && String(user.secondaryHeadOfficerId) === String(req.user._id)) ||
        isSystemHeadOfficer(req.user);
      if (!canManage) {
        return res.status(403).json({ success: false, error: 'This officer is assigned to another head officer' });
      }
    }
    
    // Update security level
    user.securityLevel = req.user.role === 'security' ? 'personnel' : securityLevel;
    
    // For head officers, don't require assignedPhases/assignedAreas/patrolSchedule
    if (user.securityLevel === 'head-officer') {
      user.assignedPhases = [];
      user.assignedAreas = [];
      user.patrolSchedule = '';
      user.headOfficerId = null;
      user.secondaryHeadOfficerId = null;
    } else {
      // For regular personnel, set their assignments and link to head officer if provided
      const primaryHeadOfficer = await getPrimarySecurityHeadOfficer();
      const selectedSupervisorId = req.user.role === 'security'
        ? req.user._id
        : headOfficerId || null;
      user.assignedPhases = assignedPhases || [];
      user.assignedAreas = assignedAreas || [];
      user.patrolSchedule = patrolSchedule || '';
      user.headOfficerId = primaryHeadOfficer?._id || selectedSupervisorId || null;
      user.secondaryHeadOfficerId =
        selectedSupervisorId &&
        user.headOfficerId &&
        String(selectedSupervisorId) !== String(user.headOfficerId)
          ? selectedSupervisorId
          : null;
    }
    
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating security assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to update security assignment' });
  }
});

router.get('/assignments', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    if (req.user.role === 'security' && !isHeadOfficer(req.user)) {
      return res.status(403).json({ success: false, error: 'Only head officers can view patrol assignments' });
    }

    const filter = { role: 'security', isArchived: false };
    if (req.user.role === 'security') {
      filter.securityLevel = 'personnel';
      filter.$or = [
        { headOfficerId: req.user._id },
        { secondaryHeadOfficerId: req.user._id },
        { headOfficerId: null },
        { headOfficerId: { $exists: false } }
      ];
    }

    const { data: securityOfficers, pagination } = await paginateQuery(
      User.find(filter)
      .select('firstName lastName email securityLevel assignedPhases assignedAreas patrolSchedule headOfficerId secondaryHeadOfficerId')
      .populate('headOfficerId', 'firstName lastName')
        .sort({ firstName: 1 }),
      User.countDocuments(filter),
      req.query
    );
    
    res.json({ success: true, count: securityOfficers.length, total: pagination.total, pagination, data: securityOfficers });
  } catch (error) {
    console.error('Error loading security assignments:', error);
    res.status(500).json({ success: false, error: 'Failed to load security assignments' });
  }
});

// Export patrol logs data (CSV or PDF format)
router.get('/export', protect, authorize('security', 'admin'), async (req, res) => {
  try {
    const { format = 'pdf', phase, status, startDate, endDate, timezoneOffset = 0 } = req.query;
    const timezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;

    // Build filter based on user role and query parameters
    let filter = {};
    if (req.user.role === 'security') {
      if (isHeadOfficer(req.user)) {
        const { officerIds } = await getHeadOfficerScope(req.user);
        filter.officerId = { $in: officerIds };
      } else {
        filter.officerId = req.user.id;
      }
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
      const pdfBuffer = await pdfReportService.generateDataReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Patrol_Logs_Export_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    const pdfReportService = require('../services/pdfReportService');
    const csvContent = pdfReportService.generateCsvReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes });

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
