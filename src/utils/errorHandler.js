/**
 * Custom Error Handler
 * Provides structured error handling across the application
 */

const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/messages');

class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.SERVER_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Async route handler wrapper
 * Automatically catches errors in async routes
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Format error response
 */
const formatErrorResponse = (error, logger) => {
  let formattedError = {
    success: false,
    error: ERROR_MESSAGES.SERVER_ERROR,
    statusCode: HTTP_STATUS.SERVER_ERROR,
  };

  if (error instanceof AppError) {
    formattedError = {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  } else if (error.response?.data) {
    // External API error (e.g., Google API)
    logger?.error('External API Error', error.response.data);
    formattedError = {
      success: false,
      error: ERROR_MESSAGES.AI_REQUEST_FAILED,
      statusCode: HTTP_STATUS.SERVER_ERROR,
      details: error.response.data,
    };
  } else {
    logger?.error('Unexpected Error', { message: error.message, stack: error.stack });
  }

  return formattedError;
};

module.exports = {
  AppError,
  asyncHandler,
  formatErrorResponse,
};
