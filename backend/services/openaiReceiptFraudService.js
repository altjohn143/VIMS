const fs = require('fs');
const path = require('path');
const { getOpenAIClient, getOpenAIModel } = require('./openaiClient');

function toDataUrl(absPath) {
  const ext = path.extname(absPath || '').toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.pdf'
        ? 'application/pdf'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';
  const base64 = fs.readFileSync(absPath, { encoding: 'base64' });
  return `data:${mime};base64,${base64}`;
}

async function analyzeReceiptFraud({ receiptAbsPath, paymentContext }) {
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
            text: 'You are a payment receipt fraud detector. Return strict JSON only.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              'Analyze this resident payment receipt and compare with expected transaction context.',
              `Expected context: ${JSON.stringify(paymentContext)}`,
              'Return JSON with keys: fraudScore,flags,recommendation,explanation,extracted',
              'fraudScore is 0..1 where 1 means highly suspicious.',
              'flags is a short string list (e.g. amount_mismatch, duplicate_reference, tampered_receipt, unreadable_receipt).',
              "recommendation is one of: likely_legit, needs_review, likely_fraud.",
              'extracted object should include amount, refNo, date, merchant.'
            ].join('\n')
          },
          { type: 'input_image', image_url: toDataUrl(receiptAbsPath) }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'receipt_fraud',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            fraudScore: { type: 'number' },
            flags: { type: 'array', items: { type: 'string' } },
            recommendation: { type: 'string' },
            explanation: { type: 'string' },
            extracted: {
              type: 'object',
              additionalProperties: false,
              properties: {
                amount: { type: 'string' },
                refNo: { type: 'string' },
                date: { type: 'string' },
                merchant: { type: 'string' }
              },
              required: ['amount', 'refNo', 'date', 'merchant']
            }
          },
          required: ['fraudScore', 'flags', 'recommendation', 'explanation', 'extracted']
        }
      }
    }
  });

  const parsed = JSON.parse(response.output_text || '{}');
  const fraudScore = Number(parsed.fraudScore);
  return {
    fraudScore: Number.isFinite(fraudScore) ? Math.max(0, Math.min(1, fraudScore)) : 0.5,
    flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 10) : [],
    recommendation: ['likely_legit', 'needs_review', 'likely_fraud'].includes(parsed.recommendation)
      ? parsed.recommendation
      : 'needs_review',
    explanation: String(parsed.explanation || '').slice(0, 1000),
    extracted: {
      amount: String(parsed.extracted?.amount || ''),
      refNo: String(parsed.extracted?.refNo || ''),
      date: String(parsed.extracted?.date || ''),
      merchant: String(parsed.extracted?.merchant || '')
    },
    model
  };
}

module.exports = {
  analyzeReceiptFraud
};
