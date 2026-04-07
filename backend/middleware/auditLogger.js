const jwt = require('jsonwebtoken');
const AuditLog = require('../models/AuditLog');

const shouldSkipPath = (path) => {
  return path.startsWith('/api/health') || path.startsWith('/api/test-connection');
};

const auditLogger = (req, res, next) => {
  if (shouldSkipPath(req.originalUrl || req.path)) {
    return next();
  }

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

  res.on('finish', async () => {
    try {
      await AuditLog.create({
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
    } catch (error) {
      console.error('Audit logger error:', error.message);
    }
  });

  next();
};

module.exports = auditLogger;
