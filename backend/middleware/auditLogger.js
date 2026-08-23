const jwt = require('jsonwebtoken');
const AuditLog = require('../models/AuditLog');

const GET_SAMPLE_RATE = Number(process.env.AUDIT_GET_SAMPLE_RATE || 0);
const WRITE_QUEUE_FLUSH_SIZE = Number(process.env.AUDIT_FLUSH_SIZE || 25);
const WRITE_QUEUE_FLUSH_MS = Number(process.env.AUDIT_FLUSH_MS || 5000);
const queue = [];
let flushTimer = null;

const shouldSkipPath = (path) => {
  return path.startsWith('/api/health') || path.startsWith('/api/test-connection');
};

const shouldAuditRequest = (req, statusCode) => {
  if (shouldSkipPath(req.originalUrl || req.path)) return false;
  if (req.method !== 'GET') return true;
  if (statusCode >= 400) return true;
  return GET_SAMPLE_RATE > 0 && Math.random() < GET_SAMPLE_RATE;
};

const flushQueue = async () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try {
    await AuditLog.insertMany(batch, { ordered: false });
  } catch (error) {
    console.error('Audit logger batch error:', error.message);
  }
};

const enqueueAuditLog = (entry) => {
  queue.push(entry);
  if (queue.length >= WRITE_QUEUE_FLUSH_SIZE) {
    flushQueue();
    return;
  }
  if (!flushTimer) {
    flushTimer = setTimeout(flushQueue, WRITE_QUEUE_FLUSH_MS);
    flushTimer.unref?.();
  }
};

const auditLogger = (req, res, next) => {
  const startTime = Date.now();
  const authHeader = req.headers.authorization || '';
  let authPayload = {};

  if (authHeader.startsWith('Bearer ') && process.env.JWT_SECRET) {
    const token = authHeader.split(' ')[1];
    try {
      authPayload = jwt.verify(token, process.env.JWT_SECRET) || {};
    } catch (error) {
      authPayload = {};
    }
  }

  res.on('finish', () => {
    if (!shouldAuditRequest(req, res.statusCode)) return;
    enqueueAuditLog({
      userId: authPayload.id || null,
      email: authPayload.email || null,
      role: authPayload.role || null,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || null,
      durationMs: Date.now() - startTime
    });
  });

  next();
};

module.exports = auditLogger;
