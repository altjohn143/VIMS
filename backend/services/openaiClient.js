const OpenAI = require('openai');

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';
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

function getOpenAIModel() {
  return DEFAULT_MODEL;
}

module.exports = {
  getOpenAIClient,
  getOpenAIModel
};
