#!/usr/bin/env node

const DEFAULT_API_URL = 'https://vims-backend.onrender.com/api';
const DEFAULT_WEB_URL = 'https://vims-one.vercel.app';

const API_URL = (process.env.SMOKE_API_URL || process.env.REACT_APP_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
const WEB_URL = (process.env.SMOKE_WEB_URL || DEFAULT_WEB_URL).replace(/\/$/, '');

const checks = [];

async function check(name, fn) {
  const startedAt = Date.now();
  try {
    await fn();
    checks.push({ name, ok: true, ms: Date.now() - startedAt });
  } catch (error) {
    checks.push({ name, ok: false, ms: Date.now() - startedAt, error: error.message });
  }
}

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${typeof body === 'string' ? body.slice(0, 120) : JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  await check('backend health', async () => {
    const body = await getJson(`${API_URL}/health`);
    if (body.status !== 'OK') throw new Error(`Unexpected health response: ${JSON.stringify(body)}`);
  });

  await check('backend 404 shape', async () => {
    const response = await fetch(`${API_URL}/__smoke_missing_route__`);
    const body = await response.json().catch(() => null);
    if (response.status !== 404 || body?.success !== false) {
      throw new Error(`Unexpected 404 response: status=${response.status} body=${JSON.stringify(body)}`);
    }
  });

  await check('notifications auth enforced', async () => {
    const response = await fetch(`${API_URL}/notifications/unread-count`);
    if (response.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated notifications, got ${response.status}`);
    }
  });

  await check('payments auth enforced', async () => {
    const response = await fetch(`${API_URL}/payments/my`);
    if (response.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated payments, got ${response.status}`);
    }
  });

  await check('web app reachable', async () => {
    const response = await fetch(WEB_URL);
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    if (!/root|VIMS|Casimiro|Westville/i.test(text)) {
      throw new Error('Web response did not look like the VIMS app shell');
    }
  });

  const failed = checks.filter((item) => !item.ok);
  for (const item of checks) {
    const status = item.ok ? 'PASS' : 'FAIL';
    console.log(`${status} ${item.name} (${item.ms}ms)${item.error ? ` - ${item.error}` : ''}`);
  }

  if (failed.length > 0) {
    console.error(`\nSmoke test failed: ${failed.length}/${checks.length} checks failed.`);
    process.exit(1);
  }

  console.log(`\nSmoke test passed: ${checks.length}/${checks.length} checks passed.`);
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
