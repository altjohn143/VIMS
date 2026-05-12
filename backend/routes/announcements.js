const express = require('express');
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');
const ActivityNotificationService = require('../services/activityNotificationService');

const router = express.Router();

// Public feed for logged-in users
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    const rows = await Announcement.find({
      isArchived: false,
      $or: [
        { status: 'published' },
        { status: 'scheduled', scheduledAt: { $lte: now } }
      ]
    })
      .populate('createdBy', 'firstName lastName role')
      .sort({ publishedAt: -1, createdAt: -1 });

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load announcements' });
  }
});

// Admin list (includes unpublished)
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const rows = await Announcement.find({ isArchived: false })
      .populate('createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load announcement admin list' });
  }
});

const ALLOWED_ANNOUNCEMENT_CATEGORIES = ['general', 'monthlyCollection'];

// Create announcement
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, body, status = 'published', scheduledAt, category = 'general' } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Title and body are required' });
    }
    if (!ALLOWED_ANNOUNCEMENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid announcement category' });
    }

    if (status === 'scheduled' && !scheduledAt) {
      return res.status(400).json({ success: false, error: 'Scheduled time is required for scheduled announcements' });
    }

    if (status === 'scheduled' && new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
    }

    const row = await Announcement.create({
      title: String(title).trim(),
      body: String(body).trim(),
      status,
      category,
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt) : null,
      publishedAt: status === 'published' ? new Date() : null,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, body, status, scheduledAt, category } = req.body;
    const row = await Announcement.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Announcement not found' });

    if (typeof title === 'string') row.title = title.trim();
    if (typeof body === 'string') row.body = body.trim();

    if (typeof category === 'string') {
      if (!ALLOWED_ANNOUNCEMENT_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: 'Invalid announcement category' });
      }
      row.category = category;
    }

    if (typeof status === 'string') {
      if (status === 'scheduled' && !scheduledAt) {
        return res.status(400).json({ success: false, error: 'Scheduled time is required for scheduled announcements' });
      }
      if (status === 'scheduled' && new Date(scheduledAt) <= new Date()) {
        return res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
      }

      row.status = status;
      if (status === 'published' && !row.publishedAt) {
        row.publishedAt = new Date();

        // Notify all residents about new announcement
        try {
          await ActivityNotificationService.broadcastAnnouncementToRole(row, 'resident');
        } catch (error) {
          console.error('Failed to broadcast announcement notification:', error);
        }
      } else if (status === 'scheduled') {
        row.scheduledAt = new Date(scheduledAt);
        row.publishedAt = null;
      } else if (status === 'draft') {
        row.publishedAt = null;
        row.scheduledAt = null;
      }
    }

    await row.save();
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update announcement' });
  }
});

// Archive announcement
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const row = await Announcement.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Announcement not found' });
    
    row.isArchived = true;
    row.archivedAt = new Date();
    row.archivedBy = req.user._id;
    row.archivedReason = req.body.reason || 'No reason provided';
    await row.save();
    
    res.json({ success: true, message: 'Announcement archived' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to archive announcement' });
  }
});

// Restore archived announcement
router.put('/:id/restore', protect, authorize('admin'), async (req, res) => {
  try {
    const row = await Announcement.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Announcement not found' });
    
    if (!row.isArchived) {
      return res.status(400).json({ success: false, error: 'Announcement is not archived' });
    }
    
    row.isArchived = false;
    row.archivedAt = null;
    row.archivedBy = null;
    row.archivedReason = '';
    await row.save();
    
    res.json({ success: true, message: 'Announcement restored', data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to restore announcement' });
  }
});

// Get archived announcements
router.get('/archived', protect, authorize('admin'), async (req, res) => {
  try {
    const announcements = await Announcement.find({ isArchived: true })
      .populate('createdBy', 'firstName lastName')
      .populate('archivedBy', 'firstName lastName email')
      .sort({ archivedAt: -1 });
    
    res.json({
      success: true,
      data: announcements
    });
    
  } catch (error) {
    console.error('Get archived announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get archived announcements'
    });
  }
});

module.exports = router;
