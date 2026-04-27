/**
 * Centralized Error Handler Middleware
 * Standardizes all error responses across the API
 * Should be registered LAST, after all other middleware and routes
 */

const errorHandler = (err, req, res, next) => {
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Log error with request ID for debugging
  const requestId = req.id || 'NO-ID';
  console.error(`[${requestId}] Error:`, {
    message: err.message,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Build response
  const response = {
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  };
  
  // Include request ID for debugging (helpful for tracing)
  if (isDevelopment) {
    response.requestId = requestId;
  }
  
  // Send response
  res.status(statusCode).json(response);
};

module.exports = errorHandler;
