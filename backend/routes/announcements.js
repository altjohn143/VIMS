const express = require('express');
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public feed for logged-in users
router.get('/', protect, async (req, res) => {
  try {
    const rows = await Announcement.find({ isPublished: true })
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
    const rows = await Announcement.find()
      .populate('createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load announcement admin list' });
  }
});

// Create announcement
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, body, isPublished = true } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Title and body are required' });
    }

    const row = await Announcement.create({
      title: String(title).trim(),
      body: String(body).trim(),
      isPublished: Boolean(isPublished),
      publishedAt: isPublished ? new Date() : null,
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
    const { title, body, isPublished } = req.body;
    const row = await Announcement.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Announcement not found' });

    if (typeof title === 'string') row.title = title.trim();
    if (typeof body === 'string') row.body = body.trim();
    if (typeof isPublished === 'boolean') {
      row.isPublished = isPublished;
      if (isPublished && !row.publishedAt) row.publishedAt = new Date();
      if (!isPublished) row.publishedAt = null;
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const row = await Announcement.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Announcement not found' });
    await row.deleteOne();
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete announcement' });
  }
});

module.exports = router;
