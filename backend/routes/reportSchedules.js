const express = require('express');
const router = express.Router();
const ReportSchedule = require('../models/ReportSchedule');
const { protect, authorize } = require('../middleware/auth');
const { runSchedule } = require('../services/reportScheduler');
const { paginateQuery } = require('../utils/pagination');
const { createInAppNotification } = require('../services/inAppNotificationService');

router.get('/', protect, authorize('admin'), async (req, res) => {
  const filter = {};
  const { data: rows, pagination } = await paginateQuery(
    ReportSchedule.find(filter).sort({ createdAt: -1 }),
    ReportSchedule.countDocuments(filter),
    req.query,
    { defaultLimit: 100, maxLimit: 500 }
  );
  res.json({ success: true, count: rows.length, total: pagination.total, pagination, data: rows });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  const row = await ReportSchedule.create(req.body);
  await createInAppNotification({
    userId: req.user._id,
    type: 'report',
    title: 'Report schedule created',
    body: 'A new report schedule was created.',
    metadata: { reportScheduleId: row._id, action: 'report_schedule_created' }
  });
  res.status(201).json({ success: true, data: row });
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const row = await ReportSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (row) {
    await createInAppNotification({
      userId: req.user._id,
      type: 'report',
      title: 'Report schedule updated',
      body: 'A report schedule was updated.',
      metadata: { reportScheduleId: row._id, action: 'report_schedule_updated' }
    });
  }
  res.json({ success: true, data: row });
});

router.post('/:id/run-now', protect, authorize('admin'), async (req, res) => {
  const row = await ReportSchedule.findById(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Schedule not found' });
  await runSchedule(row);
  await createInAppNotification({
    userId: req.user._id,
    type: 'report',
    title: 'Report sent',
    body: 'The scheduled report was sent successfully.',
    metadata: { reportScheduleId: row._id, action: 'report_run_now' }
  });
  res.json({ success: true, message: 'Report sent' });
});

module.exports = router;
