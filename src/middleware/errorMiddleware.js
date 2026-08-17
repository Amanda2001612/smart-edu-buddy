/**
 * Error Middleware
 * Global error handling for the application
 */

const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/messages');
const Logger = require('../utils/logger');

const logger = new Logger('ErrorMiddleware');

/**
 * 404 Not Found Middleware
 */
const notFoundMiddleware = (req, res) => {
  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: ERROR_MESSAGES.NOT_FOUND,
    statusCode: HTTP_STATUS.NOT_FOUND,
    path: req.path,
    method: req.method,
  });
};

/**
 * Global Error Handler Middleware
 * Must be the last middleware in the app
 */
const errorHandlerMiddleware = (err, req, res, next) => {
  const error = {
    success: false,
    error: err.message || ERROR_MESSAGES.SERVER_ERROR,
    statusCode: err.statusCode || HTTP_STATUS.SERVER_ERROR,
  };

  if (err.details) {
    error.details = err.details;
  }

  // Log error
  logger.error(`${req.method} ${req.path}`, {
    error: err.message,
    statusCode: error.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // If development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  return res.status(error.statusCode).json(error);
};

module.exports = {
  notFoundMiddleware,
  errorHandlerMiddleware,
};
