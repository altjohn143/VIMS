const express = require('express');
const router = express.Router();
const ReportSchedule = require('../models/ReportSchedule');
const { protect, authorize } = require('../middleware/auth');
const { runSchedule } = require('../services/reportScheduler');

router.get('/', protect, authorize('admin'), async (req, res) => {
  const rows = await ReportSchedule.find({}).sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  const row = await ReportSchedule.create(req.body);
  res.status(201).json({ success: true, data: row });
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const row = await ReportSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: row });
});

router.post('/:id/run-now', protect, authorize('admin'), async (req, res) => {
  const row = await ReportSchedule.findById(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Schedule not found' });
  await runSchedule(row);
  res.json({ success: true, message: 'Report sent' });
});

module.exports = router;
