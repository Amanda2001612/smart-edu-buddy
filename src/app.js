/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

const express = require('express');
const cors = require('cors');
const { config } = require('./config/config');
const chatRoutes = require('./routes/chatRoutes');
const { requestLoggingMiddleware, requestValidationMiddleware } = require('./middleware/requestMiddleware');
const { errorHandlerMiddleware, notFoundMiddleware } = require('./middleware/errorMiddleware');
const Logger = require('./utils/logger');

const logger = new Logger('App');

const app = express();

// ========================
// MIDDLEWARE SETUP
// ========================

// CORS Configuration
app.use(cors(config.cors));

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logging
app.use(requestLoggingMiddleware);

// Request Validation (Error handling for JSON parsing)
app.use(requestValidationMiddleware);

// ========================
// ROUTES SETUP
// ========================

app.use('/api', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SmartEduBuddy Brain API',
    version: config.app.version,
    status: 'online',
  });
});

// ========================
// ERROR HANDLING
// ========================

// 404 Not Found
app.use(notFoundMiddleware);

// Global Error Handler (must be last)
app.use(errorHandlerMiddleware);

module.exports = app;
