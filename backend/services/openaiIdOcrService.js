const fs = require('fs');
const path = require('path');
const { getOpenAIClient, getOpenAIModel } = require('./openaiClient');

function toDataUrl(absPath) {
  const ext = path.extname(absPath || '').toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const base64 = fs.readFileSync(absPath, { encoding: 'base64' });
  return `data:${mime};base64,${base64}`;
}

function normalizeString(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeDate(v) {
  const raw = normalizeString(v);
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return raw;
}

async function extractIdFieldsFromImagePaths(frontAbsPath, backAbsPath) {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You extract identity details from Philippine government IDs. Return strict JSON only.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              'Extract fields from the ID front and back images.',
              'If a field is unreadable, return an empty string.',
              "Use date format YYYY-MM-DD when confidently parsed; otherwise return empty string.",
              'Return JSON with keys: firstName,lastName,middleName,dob,idNumber,address,confidence,notes',
              'confidence must be a number between 0 and 1.'
            ].join('\n')
          },
          { type: 'input_image', image_url: toDataUrl(frontAbsPath) },
          { type: 'input_image', image_url: toDataUrl(backAbsPath) }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'id_ocr',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            middleName: { type: 'string' },
            dob: { type: 'string' },
            idNumber: { type: 'string' },
            address: { type: 'string' },
            confidence: { type: 'number' },
            notes: { type: 'string' }
          },
          required: ['firstName', 'lastName', 'middleName', 'dob', 'idNumber', 'address', 'confidence', 'notes']
        }
      }
    }
  });

  const parsed = JSON.parse(response.output_text || '{}');
  const confidence = Number(parsed.confidence);

  return {
    firstName: normalizeString(parsed.firstName),
    lastName: normalizeString(parsed.lastName),
    middleName: normalizeString(parsed.middleName),
    dob: normalizeDate(parsed.dob),
    idNumber: normalizeString(parsed.idNumber),
    address: normalizeString(parsed.address),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    rawText: normalizeString(parsed.notes).slice(0, 2000),
    engine: `openai:${model}`
  };
}

module.exports = {
  extractIdFieldsFromImagePaths
};
