const axios = require('axios');

const AUTO_APPROVE_SCORE_THRESHOLD = 0.92;
const CRITICAL_MISMATCH_FLAGS = new Set([
  'name_mismatch',
  'dob_mismatch',
  'face_mismatch',
  'document_tampered',
  'document_fraud',
  'selfie_mismatch'
]);

async function queueIdentityVerification(verification) {
  const webhookUrl = process.env.AI_VERIFICATION_WEBHOOK_URL;

  if (!webhookUrl) {
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
