
const express = require('express');
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');
const ActivityNotificationService = require('../services/activityNotificationService');
const multer = require('multer');
const { uploadImageBuffer } = require('../services/cloudinaryService');
const { paginateQuery } = require('../utils/pagination');
const {
  emitPublicAnnouncement,
  isPublicAnnouncement,
  serializePublicAnnouncement
} = require('../services/announcementRealtimeService');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();
const withImageUrl = (req, row) => serializePublicAnnouncement(req, row);

// Public feed for logged-in users
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      isArchived: false,
      $or: [
        { status: 'published' },
        { status: 'scheduled', scheduledAt: { $lte: now } }
      ]
    };
    const { data: rows, pagination } = await paginateQuery(
      Announcement.find(filter)
      .populate('createdBy', 'firstName lastName role')
        .sort({ publishedAt: -1, createdAt: -1 }),
      Announcement.countDocuments(filter),
      req.query
    );

    res.json({ success: true, count: rows.length, total: pagination.total, pagination, data: rows.map((row) => withImageUrl(req, row)) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load announcements' });
  }
});

// Admin list (includes unpublished)
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = { isArchived: false };
    const { data: rows, pagination } = await paginateQuery(
      Announcement.find(filter)
      .populate('createdBy', 'firstName lastName role')
        .sort({ createdAt: -1 }),
      Announcement.countDocuments(filter),
      req.query
    );
    res.json({ success: true, count: rows.length, total: pagination.total, pagination, data: rows.map((row) => withImageUrl(req, row)) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load announcement admin list' });
  }
});

// Admin archived list
router.get('/archived', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = { isArchived: true };
    const { data: rows, pagination } = await paginateQuery(
      Announcement.find(filter)
      .populate('createdBy', 'firstName lastName role')
      .populate('archivedBy', 'firstName lastName role')
        .sort({ archivedAt: -1, updatedAt: -1 }),
      Announcement.countDocuments(filter),
      req.query
    );
    res.json({ success: true, count: rows.length, total: pagination.total, pagination, data: rows.map((row) => withImageUrl(req, row)) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load archived announcements' });
  }
});

const ALLOWED_ANNOUNCEMENT_CATEGORIES = ['general', 'monthlyCollection'];

// Public homepage feed. Keep this limited to published, non-archived fields.
router.get('/public', async (req, res) => {
  try {
    const now = new Date();
    const rows = await Announcement.find({
      isArchived: false,
      $or: [
        { status: 'published' },
        { status: 'scheduled', scheduledAt: { $lte: now } }
      ]
    })
      .select('title body category image publishedAt scheduledAt createdAt')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(12);

    res.json({ success: true, count: rows.length, data: rows.map((row) => withImageUrl(req, row)) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load public announcements' });
  }
});

// Update announcement
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, body, status, scheduledAt, category } = req.body;
    const row = await Announcement.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Announcement not found' });
    const wasPublic = isPublicAnnouncement(row.toObject());

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
    const isPublic = isPublicAnnouncement(row);
    if (isPublic) {
      emitPublicAnnouncement(wasPublic ? 'updated' : 'created', row, req);
    } else if (wasPublic) {
      emitPublicAnnouncement('removed', row, req);
    }
    res.json({ success: true, data: withImageUrl(req, row) });
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
    emitPublicAnnouncement('removed', row, req);
    
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
    if (isPublicAnnouncement(row)) {
      emitPublicAnnouncement('created', row, req);
    }
    
    res.json({ success: true, message: 'Announcement restored', data: withImageUrl(req, row) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to restore announcement' });
  }
});

// Create announcement (with optional image upload)
router.post('/', protect, authorize('admin'), upload.single('image'), async (req, res) => {
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

    let image = '';
    let imagePublicId = '';
    if (req.file) {
      const uploadedImage = await uploadImageBuffer(req.file.buffer, {
        folder: 'vims/announcements'
      });
      image = uploadedImage.secure_url;
      imagePublicId = uploadedImage.public_id;
    }

    const row = await Announcement.create({
      title: String(title).trim(),
      body: String(body).trim(),
      status,
      category,
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt) : null,
      publishedAt: status === 'published' ? new Date() : null,
      createdBy: req.user._id,
      image,
      imagePublicId
    });

    if (isPublicAnnouncement(row)) {
      emitPublicAnnouncement('created', row, req);
    }

    res.status(201).json({ success: true, data: withImageUrl(req, row) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create announcement' });
  }
});

module.exports = router;
