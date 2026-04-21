const OpenAI = require('openai');

const DEFAULT_HIGH_MODEL = process.env.OPENAI_MODEL_HIGH || process.env.OPENAI_MODEL || 'gpt-4.1';
const DEFAULT_LOW_MODEL = process.env.OPENAI_MODEL_LOW || 'gpt-4.1-mini';
const REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 45000);

let cachedClient = null;

function getOpenAIClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  cachedClient = new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS
  });
  return cachedClient;
}

function getOpenAIHighModel() {
  return DEFAULT_HIGH_MODEL;
}

function getOpenAILowModel() {
  return DEFAULT_LOW_MODEL;
}

function getOpenAIModel(mode = 'high') {
  return mode === 'low' ? getOpenAILowModel() : getOpenAIHighModel();
}

module.exports = {
  getOpenAIClient,
  getOpenAIModel,
  getOpenAIHighModel,
  getOpenAILowModel
};
