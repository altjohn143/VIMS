const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const IdentityVerification = require('../models/IdentityVerification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { extractIdFieldsFromImagePaths } = require('../services/openaiIdOcrService');
const { verifyUserAgainstOcr } = require('../services/openaiIdVerifyService');
const { detectDuplicateIdentity } = require('../services/duplicateIdentityService');
const { getOpenAIHighModel, getOpenAILowModel } = require('../services/openaiClient');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads/ids');

const storage = multer.memoryStorage();

const createFileMeta = (file) => {
  if (!file || !file.buffer) return null;
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png'];
  if (!allowedExts.includes(ext)) return null;
  return {
    filename: `${crypto.randomBytes(16).toString('hex')}${ext}`,
    buffer: file.buffer,
    mimetype: file.mimetype || 'image/jpeg'
  };
};

// SECURITY: File filter with magic byte validation
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }

  // Additional security: check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png'];
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Invalid file extension'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 3 // Max 3 files
  }
});

router.get('/ping', (req, res) => {
  res.json({
    success: true,
    service: 'verifications',
    hasOcrRoute: true,
    time: new Date().toISOString()
  });
});

router.get('/openai-model', protect, authorize('admin'), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ success: false, error: 'OPENAI_API_KEY is not configured' });
    return res.json({
      success: true,
      models: {
        high: getOpenAIHighModel(),
        low: getOpenAILowModel()
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load model', details: error.message || 'Unknown error' });
  }
});

router.post(
  '/upload-id',
  protect, // SECURITY: Require authentication
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // SECURITY: Use authenticated user's email instead of request body
      const email = req.user.email;
      const user = req.user;

      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const snapEmail = user.email || '';
      const snapName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

      const frontFile = req.files?.frontImage?.[0] || null;
      const backFile = req.files?.backImage?.[0] || null;
      const selfieFile = req.files?.selfieImage?.[0] || null;

      const frontMeta = createFileMeta(frontFile);
      const backMeta = createFileMeta(backFile);
      const selfieMeta = createFileMeta(selfieFile);

      if (!frontMeta || !backMeta) {
        return res.status(400).json({ success: false, error: 'Front and back ID images are required' });
      }

      const frontImage = frontMeta.filename;
      const backImage = backMeta.filename;
      const selfieImage = selfieMeta?.filename || null;

      const front = frontMeta;
      const back = backMeta;
      let ocr = null;
      try {
        ocr = await extractIdFieldsFromImagePaths(front, back);
      } catch (ocrError) {
        console.error('OCR extraction failed, saving verification for manual review:', ocrError?.response?.data || ocrError.message || ocrError);

        let verification = await IdentityVerification.findOne({ userId: user._id });
        if (!verification) {
          verification = await IdentityVerification.create({
            userId: user._id,
            residentEmail: snapEmail,
            residentDisplayName: snapName,
            frontImage,
            frontImageData: frontMeta.buffer,
            frontImageMimeType: frontMeta.mimetype,
            backImage,
            backImageData: backMeta.buffer,
            backImageMimeType: backMeta.mimetype,
            selfieImage,
            selfieImageData: selfieMeta?.buffer || null,
            selfieImageMimeType: selfieMeta?.mimetype || null,
            status: 'manual_review',
            reviewNotes: 'OCR failed while extracting ID details. Routed to manual review.',
            rejectReason: ''
          });
        } else {
          verification.frontImage = frontImage;
          verification.frontImageData = frontMeta.buffer;
          verification.frontImageMimeType = frontMeta.mimetype;
          verification.backImage = backImage;
          verification.backImageData = backMeta.buffer;
          verification.backImageMimeType = backMeta.mimetype;
          verification.selfieImage = selfieImage;
          verification.selfieImageData = selfieMeta?.buffer || null;
          verification.selfieImageMimeType = selfieMeta?.mimetype || null;
          verification.residentEmail = snapEmail;
          verification.residentDisplayName = snapName;
          verification.status = 'manual_review';
          verification.reviewNotes = 'OCR failed while extracting ID details. Routed to manual review.';
          verification.rejectReason = '';
          await verification.save();
        }

        if (selfieMeta) {
          const profilePhotoDir = path.join(__dirname, '../uploads/profile-photos');
          if (!fs.existsSync(profilePhotoDir)) {
            fs.mkdirSync(profilePhotoDir, { recursive: true });
          }
          const destPath = path.join(profilePhotoDir, selfieMeta.filename);
          try {
            fs.writeFileSync(destPath, selfieMeta.buffer);
            await User.findByIdAndUpdate(user._id, { profilePhoto: selfieMeta.filename });
          } catch (copyError) {
            console.error('Failed to write selfie to profile photos:', copyError);
            await User.findByIdAndUpdate(user._id, { profilePhoto: selfieMeta.filename });
          }
        }

        return res.json({
          success: true,
          message: 'ID uploaded but OCR failed. The ID has been routed to manual review.',
          data: verification
        });
      }

      const duplicate = await detectDuplicateIdentity({ ocr, excludeUserId: user._id });
      if (duplicate.found) {
        // SECURITY: Clean up uploaded files on duplicate detection
        return res.status(409).json({
          success: false,
          error: duplicate.reason || 'Duplicate identity detected. This ID is already linked to another resident account.'
        });
      }

      const ocrFullName = `${ocr.firstName || ''} ${ocr.middleName || ''} ${ocr.lastName || ''}`.trim();
      let verification = await IdentityVerification.findOne({ userId: user._id });
      if (!verification) {
        verification = await IdentityVerification.create({
          userId: user._id,
          residentEmail: snapEmail,
          residentDisplayName: snapName,
          frontImage,
          frontImageData: frontMeta.buffer,
          frontImageMimeType: frontMeta.mimetype,
          backImage,
          backImageData: backMeta.buffer,
          backImageMimeType: backMeta.mimetype,
          selfieImage,
          selfieImageData: selfieMeta?.buffer || null,
          selfieImageMimeType: selfieMeta?.mimetype || null,
          status: 'queued_ai'
        });
      } else {
        verification.frontImage = frontImage;
        verification.frontImageData = frontMeta.buffer;
        verification.frontImageMimeType = frontMeta.mimetype;
        verification.backImage = backImage;
        verification.backImageData = backMeta.buffer;
        verification.backImageMimeType = backMeta.mimetype;
        verification.selfieImage = selfieImage;
        verification.selfieImageData = selfieMeta?.buffer || null;
        verification.selfieImageMimeType = selfieMeta?.mimetype || null;
        verification.residentEmail = snapEmail;
        verification.residentDisplayName = snapName;
        verification.status = 'queued_ai';
        verification.rejectReason = '';
        verification.reviewNotes = '';
        await verification.save();
      }

      const localDecision = verifyUserAgainstOcr({ user, ocr });
      verification.aiResult = {
        score: localDecision.score ?? null,
        ocrName: ocrFullName,
        ocrDob: ocr.dob || '',
        flags: localDecision.flags,
        providerRaw: { engine: ocr.engine, confidence: ocr.confidence, idNumber: ocr.idNumber || '', ocrAddress: ocr.address || '' }
      };

      if (localDecision.decision === 'documents_verified') {
        verification.documentsVerified = true;
        verification.status = 'documents_verified';
        verification.reviewNotes = localDecision.reason;
        verification.rejectReason = '';
        verification.reviewedBy = null;
        verification.reviewedAt = null;

        await verification.save();

        // Update user's profile photo if selfie was provided
        if (selfieMeta) {
          const profilePhotoDir = path.join(__dirname, '../uploads/profile-photos');
          if (!fs.existsSync(profilePhotoDir)) {
            fs.mkdirSync(profilePhotoDir, { recursive: true });
          }
          const destPath = path.join(profilePhotoDir, selfieMeta.filename);
          try {
            fs.writeFileSync(destPath, selfieMeta.buffer);
            await User.findByIdAndUpdate(user._id, { profilePhoto: selfieMeta.filename });
          } catch (copyError) {
            console.error('Failed to write selfie to profile photos:', copyError);
            await User.findByIdAndUpdate(user._id, { profilePhoto: selfieMeta.filename });
          }
        }

        return res.json({
          success: true,
          message: 'ID uploaded and documents verified. Your resident account still requires an administrator to approve it before you can log in.',
          data: verification
        });
      }

      verification.status = localDecision.decision === 'rejected' ? 'rejected' : 'manual_review';
      verification.reviewNotes = localDecision.reason;
      verification.rejectReason = localDecision.decision === 'rejected' ? localDecision.reason : '';
      await verification.save();

      if (selfieMeta) {
        const profilePhotoDir = path.join(__dirname, '../uploads/profile-photos');
        if (!fs.existsSync(profilePhotoDir)) {
          fs.mkdirSync(profilePhotoDir, { recursive: true });
        }
        const destPath = path.join(profilePhotoDir, selfieMeta.filename);
        try {
          fs.writeFileSync(destPath, selfieMeta.buffer);
          await User.findByIdAndUpdate(user._id, { profilePhoto: selfieMeta.filename });
        } catch (copyError) {
          console.error('Failed to write selfie to profile photos:', copyError);
          await User.findByIdAndUpdate(user._id, { profilePhoto: selfieMeta.filename });
        }
      }

      return res.json({
        success: true,
        message: 'ID uploaded and routed to manual review',
        data: verification
      });
    } catch (error) {
      console.error('Upload ID error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload ID' });
    }
  }
);

router.post(
  '/ocr-id',
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const frontFile = req.files?.frontImage?.[0] || null;
      const backFile = req.files?.backImage?.[0] || null;
      if (!frontFile || !backFile) {
        return res.status(400).json({ success: false, error: 'Front and back ID images are required' });
      }

      const frontMeta = createFileMeta(frontFile);
      const backMeta = createFileMeta(backFile);
      if (!frontMeta || !backMeta) {
        return res.status(400).json({ success: false, error: 'Invalid front or back image upload' });
      }

      const result = await extractIdFieldsFromImagePaths(frontMeta, backMeta);

      // Check for duplicate identity against approved users
      const duplicate = await detectDuplicateIdentity({ ocr: result, excludeUserId: null });
      if (duplicate.found && duplicate.duplicateUser && duplicate.duplicateUser.isApproved) {
        return res.status(409).json({
          success: false,
          error: 'This ID is already registered to an approved resident account. Please contact administration if you believe this is an error.'
        });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      const upstreamStatus = error?.response?.status;
      const upstreamData = error?.response?.data;
      const upstreamMessage =
        upstreamData?.error?.message ||
        upstreamData?.error ||
        upstreamData?.message ||
        null;

      console.error('OCR ID error:', upstreamData || error.message || error);

      return res.status(upstreamStatus || 500).json({
        success: false,
        error: 'Failed to OCR ID',
        details: upstreamMessage || error.message || 'Unknown error'
      });
    }
  }
);

router.get('/ocr-id', (req, res) => {
  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
    details: 'Use POST /api/verifications/ocr-id with multipart form-data (frontImage, backImage).'
  });
});

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
    const numericScore = Number(score);
    const decision = Number.isFinite(numericScore) && numericScore >= 0.9 && (!flags || flags.length === 0)
      ? 'documents_verified'
      : 'manual_review';
    verification.status = decision;
    if (decision === 'documents_verified') verification.documentsVerified = true;
    verification.reviewedBy = null;
    verification.reviewedAt = null;
    verification.reviewNotes = decision === 'documents_verified' ? 'AI verified documents.' : 'AI flagged for manual review.';
    verification.rejectReason = '';
    await verification.save();

    res.json({ success: true, data: { verificationId: verification._id, status: verification.status, decision } });
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
      .sort({ updatedAt: -1 })
      .lean();

    const data = await Promise.all(
      rows.map(async (row) => {
        let u = row.userId;
        if (!u || typeof u !== 'object' || !u.email) {
          const rawId = u && typeof u === 'object' && u._id ? u._id : u;
          u = rawId ? await User.findById(rawId).select('firstName lastName email houseNumber').lean() : null;
        }
        const nameFromUser = u
          ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
          : '';
        const emailFromUser = u?.email || '';
        const ocrName = row.aiResult?.ocrName ? String(row.aiResult.ocrName).trim() : '';
        const displayResidentName =
          nameFromUser ||
          (row.residentDisplayName || '').trim() ||
          ocrName ||
          'Unknown resident';
        const snapshotEmail = (row.residentEmail || '').trim();
        const displayEmail = emailFromUser || snapshotEmail || '—';
        const userRef = u?._id || (row.userId && typeof row.userId === 'object' ? row.userId._id : row.userId);
        const hasUserInDb = !!(u && u.email);
        /** No User doc (e.g. deleted) and no email captured at upload → queue row is a leftover IdentityVerification doc */
        const isOrphanVerification = !hasUserInDb && !snapshotEmail;
        return {
          ...row,
          displayResidentName,
          displayEmail,
          queueMeta: {
            hasUserInDb,
            isOrphanVerification,
            userIdRef: userRef ? String(userRef) : '',
            nameSource: nameFromUser
              ? 'user'
              : (row.residentDisplayName || '').trim()
                ? 'snapshot'
                : ocrName
                  ? 'ocr'
                  : 'none'
          }
        };
      })
    );

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get verification queue' });
  }
});

router.get('/admin/by-user/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const verification = await IdentityVerification.findOne({ userId: req.params.userId })
      .populate('userId', 'firstName lastName email houseNumber')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ updatedAt: -1 });
    if (!verification) return res.status(404).json({ success: false, error: 'Verification not found' });
    return res.json({ success: true, data: verification });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to get verification by user' });
  }
});

router.get('/admin/:id/images', protect, authorize('admin'), async (req, res) => {
  try {
    const verification = await IdentityVerification.findById(req.params.id).select('frontImage frontImageData frontImageMimeType backImage backImageData backImageMimeType selfieImage selfieImageData selfieImageMimeType');
    if (!verification) return res.status(404).json({ success: false, error: 'Verification not found' });

    const toDataUrl = (filename, data, mime) => {
      if (!filename) return null;
      if (data) {
        const safeMime = mime || (filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
        return `data:${safeMime};base64,${data.toString('base64')}`;
      }
      const abs = path.join(uploadDir, filename);
      if (!fs.existsSync(abs)) return null;
      const buf = fs.readFileSync(abs);
      const lower = String(filename).toLowerCase();
      const safeMime = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return `data:${safeMime};base64,${buf.toString('base64')}`;
    };

    return res.json({
      success: true,
      data: {
        front: toDataUrl(verification.frontImage, verification.frontImageData, verification.frontImageMimeType),
        back: toDataUrl(verification.backImage, verification.backImageData, verification.backImageMimeType),
        selfie: toDataUrl(verification.selfieImage, verification.selfieImageData, verification.selfieImageMimeType),
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load verification images' });
  }
});

router.put('/admin/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const verification = await IdentityVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ success: false, error: 'Verification not found' });
    verification.status = 'approved';
    verification.documentsVerified = true;
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

router.get('/files/:filename', protect, authorize('admin'), async (req, res) => {
  try {
    const filename = req.params.filename;
    const verification = await IdentityVerification.findOne({
      $or: [
        { frontImage: filename },
        { backImage: filename },
        { selfieImage: filename }
      ]
    });

    if (verification) {
      let data = null;
      let mime = null;
      if (verification.frontImage === filename) {
        data = verification.frontImageData;
        mime = verification.frontImageMimeType;
      } else if (verification.backImage === filename) {
        data = verification.backImageData;
        mime = verification.backImageMimeType;
      } else if (verification.selfieImage === filename) {
        data = verification.selfieImageData;
        mime = verification.selfieImageMimeType;
      }

      if (data) {
        res.set('Content-Type', mime || 'application/octet-stream');
        return res.send(data);
      }
    }

    const target = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(target)) return res.status(404).json({ success: false, error: 'File not found' });
    return res.sendFile(target);
  } catch (error) {
    console.error('Admin file serve error:', error);
    return res.status(500).json({ success: false, error: 'Failed to serve file' });
  }
});

// Allow users to view their own uploaded ID images
router.get('/my-files/:filename', protect, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Verify the file belongs to the current user
    const verification = await IdentityVerification.findOne({ 
      userId: req.user._id,
      $or: [
        { frontImage: filename },
        { backImage: filename },
        { selfieImage: filename }
      ]
    });
    
    if (!verification) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    let data = null;
    let mime = null;
    if (verification.frontImage === filename) {
      data = verification.frontImageData;
      mime = verification.frontImageMimeType;
    } else if (verification.backImage === filename) {
      data = verification.backImageData;
      mime = verification.backImageMimeType;
    } else if (verification.selfieImage === filename) {
      data = verification.selfieImageData;
      mime = verification.selfieImageMimeType;
    }

    if (data) {
      res.set('Content-Type', mime || 'application/octet-stream');
      return res.send(data);
    }

    const target = path.join(uploadDir, filename);
    if (!fs.existsSync(target)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    return res.sendFile(target);
  } catch (error) {
    console.error('Error serving user file:', error);
    res.status(500).json({ success: false, error: 'Failed to serve file' });
  }
});

module.exports = router;
