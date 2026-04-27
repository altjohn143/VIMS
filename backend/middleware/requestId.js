/**
 * Request ID Middleware
 * Adds a unique correlation ID to each request for tracing across services
 * Include in response headers for debugging
 */

const crypto = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  // Check if request ID already exists in headers (from load balancer/proxy)
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  
  // Set response header so client can track requests
  res.setHeader('X-Request-ID', req.id);
  
  next();
};

module.exports = requestIdMiddleware;
