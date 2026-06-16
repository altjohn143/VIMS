const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { isExpoPushToken } = require('../services/pushNotificationService');

router.get('/', protect, async (req, res) => {
  try {
    const rows = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load notifications' });
  }
});

router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, readAt: null });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load unread count' });
  }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { $set: { readAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark read' });
  }
});

router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark all read' });
  }
});

router.post('/push-token', protect, async (req, res) => {
  try {
    const { token, platform = 'unknown', deviceName = '' } = req.body;
    if (!isExpoPushToken(token)) {
      return res.status(400).json({ success: false, error: 'Invalid Expo push token' });
    }

    await User.updateOne(
      { _id: req.user._id, 'pushTokens.token': token },
      {
        $set: {
          'pushTokens.$.platform': platform,
          'pushTokens.$.deviceName': deviceName,
          'pushTokens.$.lastSeenAt': new Date()
        }
      }
    );

    await User.updateOne(
      { _id: req.user._id, 'pushTokens.token': { $ne: token } },
      {
        $push: {
          pushTokens: {
            token,
            platform,
            deviceName,
            lastSeenAt: new Date()
          }
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save push token' });
  }
});

router.delete('/push-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Push token is required' });

    await User.updateOne(
      { _id: req.user._id },
      { $pull: { pushTokens: { token } } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove push token' });
  }
});

module.exports = router;
