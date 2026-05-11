const fs = require('fs');
const path = require('path');
const { getOpenAIClient, getOpenAIHighModel } = require('./openaiClient');

// SECURITY: Encrypted file storage directory
const uploadDir = path.join(__dirname, '../uploads/ids');

function toDataUrl(input) {
  if (input && input.buffer && input.mimetype) {
    const base64 = input.buffer.toString('base64');
    return `data:${input.mimetype};base64,${base64}`;
  }

  const ext = path.extname(input || '').toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const base64 = fs.readFileSync(input, { encoding: 'base64' });
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

async function extractIdFieldsFromImagePaths(frontInput, backInput, expectedDocumentType = null) {
  const client = getOpenAIClient();
  const model = getOpenAIHighModel();
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
              expectedDocumentType ? `IMPORTANT: Verify this is a ${expectedDocumentType}. If it's not a ${expectedDocumentType}, set documentTypeMatch to false and provide the actual document type in detectedDocumentType.` : 'Detect the document type from the ID.',
              'Return JSON with keys: firstName,lastName,middleName,dob,idNumber,address,confidence,notes,detectedDocumentType,documentTypeMatch',
              'confidence must be a number between 0 and 1.'
            ].join('\n')
          },
          { type: 'input_image', image_url: toDataUrl(frontInput) },
          { type: 'input_image', image_url: toDataUrl(backInput) }
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
            notes: { type: 'string' },
            detectedDocumentType: { type: 'string' },
            documentTypeMatch: { type: 'boolean' }
          },
          required: ['firstName', 'lastName', 'middleName', 'dob', 'idNumber', 'address', 'confidence', 'notes', 'detectedDocumentType', 'documentTypeMatch']
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
    engine: `openai:${model}`,
    detectedDocumentType: normalizeString(parsed.detectedDocumentType),
    documentTypeMatch: parsed.documentTypeMatch === true
  };
}

function resolveUploadedPaths(filenameFront, filenameBack) {
  return {
    front: path.join(uploadDir, filenameFront),
    back: path.join(uploadDir, filenameBack)
  };
}

module.exports = {
  extractIdFieldsFromImagePaths,
  resolveUploadedPaths
};
