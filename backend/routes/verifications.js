const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const IdentityVerification = require('../models/IdentityVerification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { queueIdentityVerification } = require('../services/aiVerificationService');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads/ids');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.post(
  '/upload-id',
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const frontImage = req.files?.frontImage?.[0]?.filename || null;
      const backImage = req.files?.backImage?.[0]?.filename || null;
      const selfieImage = req.files?.selfieImage?.[0]?.filename || null;
      if (!frontImage || !backImage) {
        return res.status(400).json({ success: false, error: 'Front and back ID images are required' });
      }

      let verification = await IdentityVerification.findOne({ userId: user._id });
      if (!verification) {
        verification = await IdentityVerification.create({
          userId: user._id,
          frontImage,
          backImage,
          selfieImage,
          status: 'queued_ai'
        });
      } else {
        verification.frontImage = frontImage;
        verification.backImage = backImage;
        verification.selfieImage = selfieImage;
        verification.status = 'queued_ai';
        verification.rejectReason = '';
        verification.reviewNotes = '';
        await verification.save();
      }

      await queueIdentityVerification(verification);
      verification.status = 'ai_processing';
      await verification.save();

      res.json({ success: true, message: 'ID uploaded and queued for AI verification', data: verification });
    } catch (error) {
      console.error('Upload ID error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload ID' });
    }
  }
);

router.get('/me', protect, async (req, res) => {
  try {
    const verification = await IdentityVerification.findOne({ userId: req.user._id });
    res.json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get verification status' });
  }
});

router.post('/webhooks/ai-result', async (req, res) => {
  try {
    const { verificationId, score = null, ocrName = '', ocrDob = '', flags = [], providerRaw = null } = req.body;
    const verification = await IdentityVerification.findById(verificationId);
    if (!verification) return res.status(404).json({ success: false, error: 'Verification not found' });

    verification.aiResult = { score, ocrName, ocrDob, flags, providerRaw };
    verification.status = Array.isArray(flags) && flags.length > 0 ? 'ai_flagged' : 'manual_review';
    await verification.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process AI result' });
  }
});

router.get('/admin/queue', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const rows = await IdentityVerification.find(filter)
      .populate('userId', 'firstName lastName email houseNumber')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ updatedAt: -1 });
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get verification queue' });
  }
});

router.put('/admin/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const verification = await IdentityVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ success: false, error: 'Verification not found' });
    verification.status = 'approved';
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    verification.reviewNotes = req.body.reviewNotes || '';
    await verification.save();
    res.json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to approve verification' });
  }
});

router.put('/admin/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const verification = await IdentityVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ success: false, error: 'Verification not found' });
    verification.status = 'rejected';
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    verification.rejectReason = req.body.rejectReason || 'Rejected by admin';
    await verification.save();
    res.json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reject verification' });
  }
});

router.get('/files/:filename', protect, authorize('admin'), (req, res) => {
  const target = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(target)) return res.status(404).json({ success: false, error: 'File not found' });
  return res.sendFile(target);
});

module.exports = router;
