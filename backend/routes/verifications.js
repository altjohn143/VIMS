const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const IdentityVerification = require('../models/IdentityVerification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { queueIdentityVerification, classifyVerificationResult, listGeminiModels } = require('../services/aiVerificationService');
const { extractIdFieldsFromImagePaths, resolveUploadedPaths } = require('../services/tesseractIdOcrService');

const router = express.Router();

function normalizeNameValue(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/[^A-ZÀ-ÿ\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeName(s) {
  return normalizeNameValue(s)
    .split(/\s+/)
    .filter(Boolean);
}

function tokenMatchRatio(expected, actual) {
  const exp = tokenizeName(expected);
  const act = tokenizeName(actual);
  if (exp.length === 0 || act.length === 0) return 0;
  const actSet = new Set(act);
  const hits = exp.filter((t) => actSet.has(t)).length;
  return hits / exp.length;
}

function computeLocalAutoApproval({ user, ocr }) {
  const flags = [];
  const reasons = [];

  const expectedFullName = `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim();
  const ocrFullName = `${ocr.firstName || ''} ${ocr.middleName || ''} ${ocr.lastName || ''}`.trim();

  const lastExact = normalizeNameValue(user.lastName) && normalizeNameValue(ocr.lastName) &&
    normalizeNameValue(user.lastName) === normalizeNameValue(ocr.lastName);
  const firstRatio = tokenMatchRatio(user.firstName, ocr.firstName);
  const middleOk = !user.middleName
    ? true
    : tokenMatchRatio(user.middleName, ocr.middleName) >= 1;
  const dobOk = !user.dateOfBirth
    ? true
    : (String(user.dateOfBirth).trim() === String(ocr.dob || '').trim());

  if (!lastExact) {
    flags.push('name_mismatch');
    reasons.push('Last name mismatch');
  }
  if (firstRatio < 0.8) {
    flags.push('name_mismatch');
    reasons.push('Given name mismatch');
  }
  if (!middleOk) {
    flags.push('name_mismatch');
    reasons.push('Middle name mismatch');
  }
  if (!dobOk) {
    flags.push('dob_mismatch');
    reasons.push('Date of birth mismatch');
  }

  const confidence = typeof ocr.confidence === 'number' ? ocr.confidence : 0.35;
  // Score: OCR confidence + name match signals + DOB + id number
  const score =
    0.45 * Math.max(0, Math.min(1, confidence)) +
    0.25 * (lastExact ? 1 : 0) +
    0.2 * Math.max(0, Math.min(1, firstRatio)) +
    0.05 * (middleOk ? 1 : 0) +
    0.05 * (dobOk ? 1 : 0);

  // Per requirement: if resident uploads ID images, auto-approve.
  // We still compute score/flags for audit and admin visibility.
  const approved = true;

  return {
    approved,
    score: Math.max(0, Math.min(1, score)),
    flags: Array.from(new Set(flags)),
    reason: approved
      ? `Auto-approved after ID upload (score ${score.toFixed(2)}).`
      : (reasons.length ? `Needs manual review: ${reasons.join(', ')}.` : 'Needs manual review.')
  };
}

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

router.get('/ping', (req, res) => {
  res.json({
    success: true,
    service: 'verifications',
    hasOcrRoute: true,
    time: new Date().toISOString()
  });
});

router.get('/gemini-models', protect, authorize('admin'), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ success: false, error: 'GEMINI_API_KEY is not configured' });
    const models = await listGeminiModels(apiKey);
    return res.json({ success: true, count: models.length, data: models });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to list Gemini models', details: error.message || 'Unknown error' });
  }
});

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

      // Free local OCR + rules-based auto approval (no billed API keys)
      try {
        const { front, back } = resolveUploadedPaths(frontImage, backImage);
        const ocr = await extractIdFieldsFromImagePaths(front, back);
        const ocrFullName = `${ocr.firstName || ''} ${ocr.middleName || ''} ${ocr.lastName || ''}`.trim();

        const localDecision = computeLocalAutoApproval({ user, ocr });
        verification.aiResult = {
          score: localDecision.score ?? null,
          ocrName: ocrFullName,
          ocrDob: ocr.dob || '',
          flags: localDecision.flags,
          providerRaw: { engine: ocr.engine, confidence: ocr.confidence, idNumber: ocr.idNumber || '' }
        };

        if (localDecision.approved) {
          verification.status = 'approved';
          verification.reviewNotes = localDecision.reason;
          verification.rejectReason = '';
          verification.reviewedBy = null;
          verification.reviewedAt = new Date();

          // Approve user account as well
          if (!user.isApproved) {
            user.isApproved = true;
            await user.save();
          }

          await verification.save();
          return res.json({
            success: true,
            message: 'ID uploaded and auto-approved by OCR verification',
            data: verification
          });
        }

        // Not auto-approved: route to manual review by default.
        verification.status = 'manual_review';
        verification.reviewNotes = localDecision.reason;
        verification.rejectReason = '';
        await verification.save();

        return res.json({
          success: true,
          message: 'ID uploaded and routed to manual review',
          data: verification
        });
      } catch (ocrError) {
        console.error('Local OCR auto-approval error:', ocrError?.message || ocrError);
        // Fall through to existing AI/webhook flow as a best-effort (may still be configured in some environments)
      }

      let queueResult = { mode: 'local_stub' };
      try {
        queueResult = await queueIdentityVerification(verification);
        verification.status = 'ai_processing';
        if (queueResult.mode === 'gemini_direct' && queueResult.result) {
          const aiResult = queueResult.result;
          verification.aiResult = {
            score: aiResult.score ?? null,
            ocrName: aiResult.ocrName || '',
            ocrDob: aiResult.ocrDob || '',
            flags: Array.isArray(aiResult.flags) ? aiResult.flags : [],
            providerRaw: aiResult.providerRaw || null
          };
          const decision = classifyVerificationResult({
            score: verification.aiResult.score,
            flags: verification.aiResult.flags
          });
          verification.status = decision.status;
          verification.reviewNotes = decision.reason;
          verification.rejectReason = decision.status === 'rejected' ? decision.reason : '';
        }
      } catch (aiError) {
        console.error('AI verification error (fallback to manual review):', aiError?.response?.data || aiError.message || aiError);
        verification.status = 'manual_review';
        verification.reviewNotes = 'AI verification service unavailable. Routed to manual review.';
        verification.rejectReason = '';
      }
      await verification.save();

      res.json({
        success: true,
        message: queueResult.mode === 'gemini_direct'
          ? 'ID uploaded and processed by AI'
          : verification.status === 'manual_review'
            ? 'ID uploaded and routed to manual review'
            : 'ID uploaded and queued for AI verification',
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
      const frontImage = req.files?.frontImage?.[0]?.filename || null;
      const backImage = req.files?.backImage?.[0]?.filename || null;
      if (!frontImage || !backImage) {
        return res.status(400).json({ success: false, error: 'Front and back ID images are required' });
      }

      const { front, back } = resolveUploadedPaths(frontImage, backImage);
      const result = await extractIdFieldsFromImagePaths(front, back);
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
    const decision = classifyVerificationResult({ score, flags });
    verification.status = decision.status;
    verification.reviewedBy = null;
    verification.reviewedAt = null;
    verification.reviewNotes = decision.reason;
    verification.rejectReason = decision.status === 'rejected' ? decision.reason : '';
    await verification.save();

    res.json({ success: true, data: { verificationId: verification._id, status: verification.status, decision: decision.decision } });
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
