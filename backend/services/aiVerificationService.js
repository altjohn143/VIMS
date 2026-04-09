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

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL_PREFERENCE = [
  // Prefer newest/fastest first; we’ll select the first available for this API key.
  'models/gemini-2.0-flash',
  'models/gemini-2.0-flash-lite',
  'models/gemini-1.5-flash-latest',
  'models/gemini-1.5-flash',
  'models/gemini-1.5-pro-latest',
  'models/gemini-1.5-pro'
];

let cachedGeminiModel = null;
let cachedGeminiModelAt = 0;
const GEMINI_MODEL_CACHE_MS = 10 * 60 * 1000;

async function listGeminiModels(apiKey) {
  const endpoint = `${GEMINI_API_BASE}/models?key=${apiKey}`;
  const response = await axios.get(endpoint, { timeout: 15000 });
  return Array.isArray(response.data?.models) ? response.data.models : [];
}

function modelSupportsGenerateContent(model) {
  const methods = model?.supportedGenerationMethods;
  return Array.isArray(methods) && methods.includes('generateContent');
}

async function resolveGeminiModel(apiKey) {
  if (cachedGeminiModel && Date.now() - cachedGeminiModelAt < GEMINI_MODEL_CACHE_MS) {
    return cachedGeminiModel;
  }

  const models = await listGeminiModels(apiKey);
  const usable = models.filter(modelSupportsGenerateContent);

  const byName = new Map(usable.map((m) => [m.name, m]));
  const preferred = GEMINI_MODEL_PREFERENCE.find((name) => byName.has(name));
  const chosen = preferred || usable[0]?.name || null;

  if (!chosen) {
    throw new Error('No Gemini models available for generateContent. Check API key permissions/billing.');
  }

  cachedGeminiModel = chosen;
  cachedGeminiModelAt = Date.now();
  return chosen;
}

async function geminiGenerateContent({ apiKey, parts }) {
  const modelName = await resolveGeminiModel(apiKey);
  const endpoint = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;

  return await axios.post(
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
}

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

  const response = await geminiGenerateContent({ apiKey, parts });

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

async function extractIdFieldsFromImages({ frontImage, backImage }, apiKey) {
  const prompt = [
    'You are an OCR assistant for government IDs.',
    'Extract the person details from the provided ID images.',
    'Return ONLY valid JSON with this shape:',
    '{"firstName": string, "lastName": string, "middleName": string, "dob": string, "idNumber": string, "confidence": number 0..1}',
    'Rules:',
    '- Use empty string for unknown fields.',
    "- dob should be in 'YYYY-MM-DD' if possible; otherwise return the raw DOB text you see.",
    '- confidence should reflect how sure you are the extracted fields match the ID.',
    '- Do not hallucinate. If unreadable, leave fields empty and lower confidence.'
  ].join('\n');

  const parts = [{ text: prompt }];
  const frontPart = getImagePart(frontImage);
  const backPart = getImagePart(backImage);
  if (frontPart) parts.push(frontPart);
  if (backPart) parts.push(backPart);

  const response = await geminiGenerateContent({ apiKey, parts });

  const modelText =
    response.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || '';
  const parsed = extractJsonFromText(modelText) || {};
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : Number(parsed.confidence);

  return {
    firstName: typeof parsed.firstName === 'string' ? parsed.firstName : '',
    lastName: typeof parsed.lastName === 'string' ? parsed.lastName : '',
    middleName: typeof parsed.middleName === 'string' ? parsed.middleName : '',
    dob: typeof parsed.dob === 'string' ? parsed.dob : '',
    idNumber: typeof parsed.idNumber === 'string' ? parsed.idNumber : '',
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    providerRaw: response.data
  };
}

module.exports = {
  queueIdentityVerification,
  extractIdFieldsFromImages,
  listGeminiModels,
  classifyVerificationResult,
  AUTO_APPROVE_SCORE_THRESHOLD,
  CRITICAL_MISMATCH_FLAGS
};
