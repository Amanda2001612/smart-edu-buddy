/**
 * Request Middleware
 * Handles request logging, validation, and transformation
 */

const Logger = require('../utils/logger');

const logger = new Logger('RequestMiddleware');

/**
 * Request logging middleware
 */
const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  logger.debug(`Incoming ${req.method} request`, {
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Capture response finish to log duration
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.debug(`${req.method} ${req.path} completed`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

/**
 * Request validation middleware
 * Validates incoming JSON and handles parsing errors
 */
const requestValidationMiddleware = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('Invalid JSON in request', { path: req.path, error: err.message });
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
    });
  }
  next();
};

module.exports = {
  requestLoggingMiddleware,
  requestValidationMiddleware,
};
