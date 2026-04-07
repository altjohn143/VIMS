const axios = require('axios');
const fs = require('fs');
const path = require('path');

const AUTO_APPROVE_SCORE_THRESHOLD = 0.92;
const CRITICAL_MISMATCH_FLAGS = new Set([
  'name_mismatch',
  'dob_mismatch',
  'face_mismatch',
  'document_tampered',
  'document_fraud',
  'selfie_mismatch'
]);
const uploadDir = path.join(__dirname, '../uploads/ids');

async function queueIdentityVerification(verification) {
  const webhookUrl = process.env.AI_VERIFICATION_WEBHOOK_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!webhookUrl) {
    if (geminiApiKey) {
      const result = await runGeminiVerification(verification, geminiApiKey);
      return { queued: false, mode: 'gemini_direct', result };
    }
    return { queued: true, mode: 'local_stub' };
  }

  await axios.post(
    webhookUrl,
    {
      verificationId: verification._id,
      userId: verification.userId,
      frontImage: verification.frontImage,
      backImage: verification.backImage,
      selfieImage: verification.selfieImage
    },
    { timeout: 15000 }
  );

  return { queued: true, mode: 'webhook' };
}

function getMimeTypeFromFilename(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function getImagePart(filename) {
  if (!filename) return null;
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) return null;

  return {
    inline_data: {
      mime_type: getMimeTypeFromFilename(filename),
      data: fs.readFileSync(filePath, { encoding: 'base64' })
    }
  };
}

function extractJsonFromText(rawText) {
  if (!rawText) return null;
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonCandidate = rawText.slice(start, end + 1);
  try {
    return JSON.parse(jsonCandidate);
  } catch (_) {
    return null;
  }
}

async function runGeminiVerification(verification, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = [
    'You are an ID verification assistant.',
    'Compare front ID image, back ID image, and selfie image.',
    'Return ONLY valid JSON with shape:',
    '{"score": number 0..1, "flags": string[], "ocrName": string, "ocrDob": string}',
    'Use flags from this controlled list when applicable:',
    '[name_mismatch, dob_mismatch, face_mismatch, document_tampered, document_fraud, selfie_mismatch, low_image_quality, unreadable_id]',
    'If uncertain, lower score and include flags.'
  ].join('\n');

  const parts = [{ text: prompt }];
  const frontPart = getImagePart(verification.frontImage);
  const backPart = getImagePart(verification.backImage);
  const selfiePart = getImagePart(verification.selfieImage);
  if (frontPart) parts.push(frontPart);
  if (backPart) parts.push(backPart);
  if (selfiePart) parts.push(selfiePart);

  const response = await axios.post(
    endpoint,
    {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    },
    { timeout: 30000 }
  );

  const modelText = response.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || '';
  const parsed = extractJsonFromText(modelText) || {};
  const score = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score);
  const flags = Array.isArray(parsed.flags) ? parsed.flags : [];
  const ocrName = typeof parsed.ocrName === 'string' ? parsed.ocrName : '';
  const ocrDob = typeof parsed.ocrDob === 'string' ? parsed.ocrDob : '';

  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : null,
    flags,
    ocrName,
    ocrDob,
    providerRaw: response.data
  };
}

function normalizeFlag(flag) {
  return String(flag || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function classifyVerificationResult({ score, flags = [] }) {
  const normalizedFlags = Array.isArray(flags) ? flags.map(normalizeFlag).filter(Boolean) : [];
  const hasCriticalMismatch = normalizedFlags.some((flag) => CRITICAL_MISMATCH_FLAGS.has(flag));
  const numericScore = typeof score === 'number' ? score : Number(score);
  const hasValidScore = Number.isFinite(numericScore);

  if (hasCriticalMismatch) {
    return {
      status: 'rejected',
      decision: 'auto_reject',
      reason: 'Critical mismatch flags detected by AI.'
    };
  }

  if (hasValidScore && numericScore >= AUTO_APPROVE_SCORE_THRESHOLD && normalizedFlags.length === 0) {
    return {
      status: 'approved',
      decision: 'auto_approve',
      reason: `AI score ${numericScore.toFixed(2)} met auto-approve threshold with no flags.`
    };
  }

  return {
    status: 'manual_review',
    decision: 'manual_review',
    reason: 'Borderline or non-critical AI result requires manual review.'
  };
}

module.exports = {
  queueIdentityVerification,
  classifyVerificationResult,
  AUTO_APPROVE_SCORE_THRESHOLD,
  CRITICAL_MISMATCH_FLAGS
};
