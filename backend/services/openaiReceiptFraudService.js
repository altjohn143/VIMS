const fs = require('fs');
const path = require('path');
const { getOpenAIClient, getOpenAIHighModel } = require('./openaiClient');

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

function parseAmount(value) {
  const match = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/);
  const amount = match ? Number(match[0]) : NaN;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractExplicitAmountFromExplanation(explanation) {
  const text = String(explanation || '');
  const patterns = [
    /extracted\s+total\s*\(?\s*(?:₱|PHP)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /receipt\s+shows\s+(?:a\s+)?total\s+(?:of\s+)?(?:₱|PHP)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /total\s+amount\s+(?:sent|paid)\s*(?:is|:)\s*(?:₱|PHP)?\s*([\d,]+(?:\.\d{1,2})?)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const amount = parseAmount(match?.[1]);
    if (amount) return amount;
  }
  return null;
}

async function analyzeReceiptFraud({ receiptAbsPath, paymentContext }) {
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
              'Read the receipt image first and extract the actual amount printed on the receipt. Do not replace the printed amount with the expected amount from the transaction context.',
              'The expected transaction context is only for comparison after extraction.',
              `Expected transaction context: ${JSON.stringify(paymentContext)}`,
              'Return JSON with keys: fraudScore,flags,recommendation,explanation,extracted',
              'fraudScore is 0..1 where 1 means highly suspicious.',
              'flags is a short string list (e.g. amount_mismatch, duplicate_reference, tampered_receipt, unreadable_receipt).',
              "recommendation is one of: likely_legit, needs_review, likely_fraud.",
              'extracted object should include amount, refNo, date, merchant. The extracted amount must be the total amount actually sent or paid shown on the receipt, including any amount above the expected dues. If the amount is unreadable, return an empty amount and include unreadable_receipt in flags.'
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
  const extractedAmount = parseAmount(parsed.extracted?.amount);
  const explanationAmount = extractExplicitAmountFromExplanation(parsed.explanation);
  const normalizedAmount = explanationAmount && explanationAmount !== extractedAmount
    ? explanationAmount
    : extractedAmount;

  return {
    fraudScore: Number.isFinite(fraudScore) ? Math.max(0, Math.min(1, fraudScore)) : 0.5,
    flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 10) : [],
    recommendation: ['likely_legit', 'needs_review', 'likely_fraud'].includes(parsed.recommendation)
      ? parsed.recommendation
      : 'needs_review',
    explanation: String(parsed.explanation || '').slice(0, 1000),
    extracted: {
      amount: normalizedAmount ? normalizedAmount.toFixed(2) : String(parsed.extracted?.amount || ''),
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
